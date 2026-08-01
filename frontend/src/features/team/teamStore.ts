import { useState, useEffect, useCallback } from 'react';
import { teamApi } from '../../api/teamApi';

/**
 * ── Central Team / Access Store ──────────────────────────────────────────
 *
 * Single source of truth for every account in the system (Admin +
 * Employees), fetched live from the real backend (`/api/v1/users`, guarded
 * by JWT auth + the 'team' module permission). This used to be a
 * frontend-only mock persisted to localStorage — it is not anymore. All
 * reads/writes go through the NestJS API, which is also where every rule
 * (password hashing, "can't delete the last admin", "can't delete the
 * protected default admin", permission enforcement) is actually enforced.
 * The frontend mirrors those same rules for a snappy UI, but the backend is
 * the source of truth and re-validates everything server-side regardless of
 * what the UI allows.
 */

export type AccountType = 'ADMIN' | 'EMPLOYEE';
export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export const DEPARTMENTS = [
  'Management',
  'Purchase / Procurement',
  'Sales & Buyers',
  'Products & Stock',
  'Finance & Accounting',
  'Logistics',
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const BRANCHES = [
  'Yinglima Machinery & Trade (China HQ)',
  'F&B Uganda Ingredients Ltd',
  'One Stop General Trading Uganda',
  'Ingredi Trade Uganda Ltd',
  'Darsh Impex India LLP (India HQ)',
  'East Africa Chemical Supply',
] as const;

/** One row per module. Basic granularity per your call: View / Edit / Delete only (no per-field). */
export interface ModulePermission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export const PERMISSION_MODULES: { key: string; label: string }[] = [
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'inquiry', label: 'Local Purchase / Inquiry' },
  { key: 'import_purchase', label: 'Import Purchase' },
  { key: 'buyers', label: 'Buyers (Clients)' },
  { key: 'quotation', label: 'Quotation' },
  { key: 'products', label: 'Product Master (incl. Categories / Sub Categories / Brands)' },
  { key: 'stock', label: 'Stock Transactions & Re-Order Reports' },
  { key: 'team', label: 'Team Members' },
  { key: 'roles', label: 'Roles & Permissions' },
];

export type PermissionSet = Record<string, ModulePermission>;

export function emptyPermissionSet(): PermissionSet {
  return Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, { view: false, edit: false, delete: false }]));
}

export function fullPermissionSet(): PermissionSet {
  return Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, { view: true, edit: true, delete: true }]));
}

// Must match backend/src/modules/user/user.service.ts PROTECTED_ADMIN_EMAIL.
// The backend is the real enforcement point; this only drives the UI
// (disabling the delete/demote controls) so people don't hit an avoidable
// error — the server rejects the action either way.
const PROTECTED_ADMIN_EMAIL = 'admin@yinglima.com';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Write-only. The backend NEVER returns a member's password (plaintext or
   * hashed) — this is only populated locally while typing into a create/reset
   * password field, and sent up as a fresh value on create/update. */
  password?: string;
  accountType: AccountType;
  department: Department | string;
  branch: string;
  status: MemberStatus;
  permissions: PermissionSet; // ignored/irrelevant for ADMIN (they always have full access)
  createdDate: string;
  /** True only for the one seeded Super Admin account; the backend refuses to
   * delete, deactivate, or demote it no matter what the UI does. */
  isDefaultAdmin?: boolean;
}

type Listener = (members: TeamMember[]) => void;
const listeners = new Set<Listener>();
let cache: TeamMember[] = [];

function decorate(member: TeamMember): TeamMember {
  return { ...member, isDefaultAdmin: member.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL };
}

async function refreshMembers() {
  const data = await teamApi.getMembers();
  if (data) {
    cache = data.map(decorate);
    listeners.forEach((l) => l(cache));
  }
}

export function useTeamStore() {
  const [members, setMembers] = useState<TeamMember[]>(cache);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => {
      setMembers(next);
      setIsLoading(false);
    };
    listeners.add(listener);
    refreshMembers()
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load team members.'))
      .finally(() => setIsLoading(false));
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addMember = useCallback(async (member: Omit<TeamMember, 'id' | 'createdDate'>) => {
    const result = await teamApi.createMember({
      name: member.name.trim(),
      email: member.email.trim(),
      phone: member.phone,
      password: member.password,
      accountType: member.accountType,
      department: member.department,
      branch: member.branch,
      status: 'ACTIVE',
      permissions: member.permissions,
    });
    await refreshMembers();
    return result;
  }, []);

  const updateMember = useCallback(async (id: string, patch: Partial<TeamMember>) => {
    await teamApi.updateMember(id, {
      name: patch.name?.trim(),
      email: patch.email?.trim(),
      phone: patch.phone,
      password: patch.password,
      accountType: patch.accountType,
      department: patch.department,
      branch: patch.branch,
      status: patch.status,
      permissions: patch.permissions,
    });
    await refreshMembers();
  }, []);

  /** Throws with the backend's actual reason (protected admin / last active
   * admin / etc.) on failure — callers should try/catch and show err.message
   * or err.response.data.message rather than assuming success. */
  const removeMember = useCallback(async (id: string, targetUserId?: string) => {
    await teamApi.deleteMember(id, targetUserId);
    await refreshMembers();
    return true;
  }, []);

  /** Promote/demote between Admin and Employee. The backend blocks demoting
   * the protected default admin or the last remaining active admin — throws
   * on failure with the real reason. */
  const setAccountType = useCallback(async (id: string, type: AccountType) => {
    await teamApi.updateMember(id, {
      accountType: type,
      permissions: type === 'ADMIN' ? fullPermissionSet() : undefined,
    });
    await refreshMembers();
    return true;
  }, []);

  const setPermissions = useCallback(async (id: string, permissions: PermissionSet) => {
    await teamApi.updateMember(id, { permissions });
    await refreshMembers();
  }, []);

  const findByEmail = useCallback(
    (email: string) => cache.find((m) => m.email.toLowerCase() === email.trim().toLowerCase()),
    [],
  );

  return { members, isLoading, error, addMember, updateMember, removeMember, setAccountType, setPermissions, findByEmail };
}

export function findMemberByEmail(email: string): TeamMember | undefined {
  return cache.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
}

/** Effective permission check: Admins always pass; Employees checked against their stored permission set. */
export function can(member: TeamMember | null | undefined, moduleKey: string, action: 'view' | 'edit' | 'delete'): boolean {
  if (!member) return false;
  if (member.accountType === 'ADMIN') return true;
  return !!member.permissions?.[moduleKey]?.[action];
}
