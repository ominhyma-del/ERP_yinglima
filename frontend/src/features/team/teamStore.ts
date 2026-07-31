import { useState, useEffect, useCallback } from 'react';
import { teamApi } from '../../api/teamApi';

/**
 * ── Central Team / Access Store ──────────────────────────────────────────
 *
 * Single source of truth for every account in the system (Admin +
 * Employees), the department they belong to, and their per-module
 * View / Edit / Delete permissions. AuthContext (login), TeamMembersPage,
 * and RolesPermissionsPage all read and write through this file so that,
 * for example, promoting someone to Admin here is immediately reflected
 * the next time they log in.
 *
 * This is still a frontend-only mock (persisted to localStorage), matching
 * the rest of the app's mock-data approach — not wired to a real backend.
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

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  accountType: AccountType;
  department: Department;
  branch: string;
  status: MemberStatus;
  permissions: PermissionSet; // ignored/irrelevant for ADMIN (they always have full access)
  createdDate: string;
  isDefaultAdmin?: boolean; // protects the hardcoded admin from deletion/demotion
}

const STORAGE_KEY = 'yinglima_team_store_v1';

const DEFAULT_ADMIN: TeamMember = {
  id: 'admin-default',
  name: 'Yinglima Admin',
  email: 'admin@yinglima.com',
  phone: '+86 13800000000',
  password: 'admin123',
  accountType: 'ADMIN',
  department: 'Management',
  branch: BRANCHES[0],
  status: 'ACTIVE',
  permissions: fullPermissionSet(),
  createdDate: '2025-01-01',
  isDefaultAdmin: true,
};

export const SEED_MEMBERS: TeamMember[] = [];

type Listener = (members: TeamMember[]) => void;
const listeners = new Set<Listener>();
let cache: TeamMember[] = [];

async function refreshMembers() {
  const data = await teamApi.getMembers();
  if (data) {
    cache = data;
    listeners.forEach((l) => l(cache));
  }
}

// Initial pull on file load to make sure cached members are populated
if (typeof window !== 'undefined') {
  refreshMembers();
}

export function useTeamStore() {
  const [members, setMembers] = useState<TeamMember[]>(cache);

  useEffect(() => {
    const listener: Listener = (next) => setMembers(next);
    listeners.add(listener);
    refreshMembers();
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

  const removeMember = useCallback(async (id: string) => {
    const target = cache.find((m) => m.id === id);
    if (target?.isDefaultAdmin) return false;
    await teamApi.deleteMember(id);
    await refreshMembers();
    return true;
  }, []);

  /** Promote/demote between Admin and Employee. The hardcoded default admin can't be demoted. */
  const setAccountType = useCallback(async (id: string, type: AccountType) => {
    const target = cache.find((m) => m.id === id);
    if (target?.isDefaultAdmin && type === 'EMPLOYEE') return false;
    await teamApi.updateMember(id, {
      accountType: type,
      permissions: type === 'ADMIN' ? fullPermissionSet() : target?.permissions,
    });
    await refreshMembers();
    return true;
  }, []);

  const setPermissions = useCallback(async (id: string, permissions: PermissionSet) => {
    await teamApi.updateMember(id, { permissions });
    await refreshMembers();
  }, []);

  const findByEmail = useCallback((email: string) => cache.find((m) => m.email.toLowerCase() === email.trim().toLowerCase()), []);

  return { members, addMember, updateMember, removeMember, setAccountType, setPermissions, findByEmail };
}

export function findMemberByEmail(email: string): TeamMember | undefined {
  return cache.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
}

/** Effective permission check: Admins always pass; Employees checked against their stored permission set. */
export function can(member: TeamMember | null | undefined, moduleKey: string, action: 'view' | 'edit' | 'delete'): boolean {
  if (!member) return false;
  if (member.accountType === 'ADMIN') return true;
  return !!member.permissions[moduleKey]?.[action];
}
