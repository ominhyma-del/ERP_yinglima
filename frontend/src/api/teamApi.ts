import api from '../lib/api';

export interface TeamMemberDto {
  id?: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  accountType: 'ADMIN' | 'EMPLOYEE';
  department: string;
  branch: string;
  status: 'ACTIVE' | 'INACTIVE';
  permissions: any;
}

export const teamApi = {
  // Fetch all team members from database via NestJS
  async getMembers() {
    try {
      const response = await api.get('/users');
      const rawList = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      if (Array.isArray(rawList)) {
        return rawList.map((u: any) => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          phone: u.phone || '',
          password: u.password || u.password_hash || '',
          accountType: u.role || 'EMPLOYEE',
          department: u.department || '',
          branch: u.branch || '',
          status: u.status || 'ACTIVE',
          permissions: u.permissions || {},
          createdDate: u.created_at ? u.created_at.split('T')[0] : '',
        }));
      }
      return [];
    } catch (error) {
      console.warn('API error fetching team members:', error);
      return [];
    }
  },

  // Create new team member in DB
  async createMember(data: TeamMemberDto) {
    try {
      const response = await api.post('/users', data);
      return response.data;
    } catch (error) {
      console.warn('API error creating team member:', error);
      return null;
    }
  },

  // Update existing team member
  async updateMember(id: string, data: Partial<TeamMemberDto>) {
    try {
      const response = await api.patch(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      console.warn('API error updating team member:', error);
      return null;
    }
  },

  // Delete team member with mandatory data ownership transfer
  async deleteMember(id: string, targetUserId?: string) {
    try {
      const response = await api.delete(`/users/${id}`, {
        params: { targetUserId },
      });
      return response.data;
    } catch (error: any) {
      console.warn('API error deleting team member:', error);
      throw error;
    }
  },
};
