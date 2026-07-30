import { useState, useEffect, useCallback } from 'react';

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

const SEED_MEMBERS: TeamMember[] = [
  DEFAULT_ADMIN,
  {
    id: 'user-default',
    name: 'Yinglima User',
    email: 'user@yinglima.com',
    phone: '+256 700000000',
    password: 'user123',
    accountType: 'EMPLOYEE',
    department: 'Purchase / Procurement',
    branch: 'F&B Uganda Ingredients Ltd',
    status: 'ACTIVE',
    permissions: fullPermissionSet(),
    createdDate: '2025-01-02',
  },
  {
    id: 't2',
    name: 'David Musoke',
    email: 'david@fb-uganda.com',
    phone: '+256 700123456',
    password: 'David@123',
    accountType: 'EMPLOYEE',
    department: 'Purchase / Procurement',
    branch: 'F&B Uganda Ingredients Ltd',
    status: 'ACTIVE',
    permissions: {
      ...emptyPermissionSet(),
      suppliers: { view: true, edit: true, delete: false },
      inquiry: { view: true, edit: true, delete: false },
      import_purchase: { view: true, edit: true, delete: false },
      buyers: { view: true, edit: false, delete: false },
      products: { view: true, edit: false, delete: false },
      stock: { view: true, edit: true, delete: false },
    },
    createdDate: '2025-02-11',
  },
  {
    id: 't3',
    name: 'John Zhang',
    email: 'zhang@yinglima.cn',
    phone: '+86 13900112233',
    password: 'Zhang@123',
    accountType: 'EMPLOYEE',
    department: 'Products & Stock',
    branch: 'Yinglima Machinery & Trade (China HQ)',
    status: 'ACTIVE',
    permissions: {
      ...emptyPermissionSet(),
      suppliers: { view: true, edit: true, delete: false },
      products: { view: true, edit: true, delete: false },
      stock: { view: true, edit: false, delete: false },
    },
    createdDate: '2025-03-02',
  },
];

function loadStore(): TeamMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_MEMBERS;
    const parsed: TeamMember[] = JSON.parse(raw);
    // Always guarantee the hardcoded default admin exists and is intact,
    // even if someone's local storage predates this account or was edited.
    const hasDefaultAdmin = parsed.some((m) => m.id === DEFAULT_ADMIN.id);
    return hasDefaultAdmin ? parsed : [DEFAULT_ADMIN, ...parsed];
  } catch {
    return SEED_MEMBERS;
  }
}

function persistStore(members: TeamMember[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // localStorage unavailable — changes won't persist this session
  }
}

// Simple pub/sub so multiple components using useTeamStore stay in sync
// within the same tab. The browser's 'storage' event only fires in OTHER
// tabs/windows when localStorage changes (never the tab that made the
// change) — without listening for it, a login screen already open in one
// tab would never see an employee an admin just created in another tab,
// and every login attempt for that employee would fail with "Invalid email
// or password" even though the credentials were entered correctly.
type Listener = (members: TeamMember[]) => void;
const listeners = new Set<Listener>();
let cache: TeamMember[] = loadStore();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cache = loadStore();
      listeners.forEach((l) => l(cache));
    }
  });
}

function setCache(next: TeamMember[]) {
  cache = next;
  persistStore(next);
  listeners.forEach((l) => l(next));
}

export function useTeamStore() {
  const [members, setMembers] = useState<TeamMember[]>(cache);

  useEffect(() => {
    const listener: Listener = (next) => setMembers(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addMember = useCallback((member: Omit<TeamMember, 'id' | 'createdDate'>) => {
    const newMember: TeamMember = {
      ...member,
      name: member.name.trim(),
      email: member.email.trim(),
      id: `t${Date.now()}`,
      createdDate: new Date().toISOString().split('T')[0],
    };
    setCache([...cache, newMember]);
    return newMember;
  }, []);

  const updateMember = useCallback((id: string, patch: Partial<TeamMember>) => {
    const normalizedPatch = {
      ...patch,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
    };
    setCache(cache.map((m) => (m.id === id ? { ...m, ...normalizedPatch } : m)));
  }, []);

  const removeMember = useCallback((id: string) => {
    const target = cache.find((m) => m.id === id);
    if (target?.isDefaultAdmin) return false; // never allow deleting the hardcoded admin
    setCache(cache.filter((m) => m.id !== id));
    return true;
  }, []);

  /** Promote/demote between Admin and Employee. The hardcoded default admin can't be demoted. */
  const setAccountType = useCallback((id: string, type: AccountType) => {
    const target = cache.find((m) => m.id === id);
    if (target?.isDefaultAdmin && type === 'EMPLOYEE') return false;
    setCache(
      cache.map((m) =>
        m.id === id
          ? { ...m, accountType: type, permissions: type === 'ADMIN' ? fullPermissionSet() : m.permissions }
          : m,
      ),
    );
    return true;
  }, []);

  const setPermissions = useCallback((id: string, permissions: PermissionSet) => {
    setCache(cache.map((m) => (m.id === id ? { ...m, permissions } : m)));
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
