import api from '../lib/api';

export interface TeamMemberDto {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  /** Only ever sent, never received back — see user.service.ts sanitizeUser(). */
  password?: string;
  accountType?: 'ADMIN' | 'EMPLOYEE';
  department?: string;
  branch?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  permissions?: any;
}

export interface OwnedDataSummary {
  user: { id: string; name: string; email: string; role: string };
  ownedRecords: {
    suppliers: number;
    buyers: number;
    products: number;
    inquiries: number;
    total: number;
  };
  eligibleTransferTargets: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    department?: string | null;
  }>;
}

export const teamApi = {
  // Fetch all team members from the database via NestJS. Requires
  // authentication + 'team' view permission — the backend rejects this with
  // 401/403 rather than serving it publicly.
  async getMembers() {
    const response = await api.get('/users');
    const rawList = Array.isArray(response.data) ? response.data : response.data?.data || [];
    if (!Array.isArray(rawList)) return [];
    return rawList.map((u: any) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      accountType: u.role || 'EMPLOYEE',
      department: u.department || '',
      branch: u.branch || '',
      status: u.status || 'ACTIVE',
      permissions: u.permissions || {},
      createdDate: u.created_at ? u.created_at.split('T')[0] : '',
    }));
  },

  // Create new team member in DB. A fresh password is required by the
  // backend (min. 6 characters) and is hashed with bcrypt before storage.
  async createMember(data: TeamMemberDto) {
    const response = await api.post('/users', data);
    return response.data;
  },

  // Update existing team member. `password`, if present and non-empty, is
  // treated as a password RESET and re-hashed server-side — it is never a
  // way to read the current password, because the current password is never
  // returned to the client in the first place.
  async updateMember(id: string, data: Partial<TeamMemberDto>) {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  // Preview what data a user owns (Suppliers/Buyers/Products/Inquiries) and
  // who is eligible to receive it, BEFORE committing to a delete. This is
  // what lets the delete modal show real counts instead of a blind dropdown.
  async getOwnedDataSummary(id: string): Promise<OwnedDataSummary> {
    const response = await api.get(`/users/${id}/owned-data-summary`);
    return response.data?.data || response.data;
  },

  // Delete team member with mandatory data ownership transfer. Throws with
  // the backend's real reason (protected default admin / last active admin /
  // missing transfer target) so the UI can surface it instead of pretending
  // the deletion happened.
  async deleteMember(id: string, targetUserId?: string) {
    const response = await api.delete(`/users/${id}`, {
      params: { targetUserId },
    });
    return response.data;
  },
};