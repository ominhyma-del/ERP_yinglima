import api from '../lib/api';

export interface SupplierDto {
  id?: string;
  name: string;
  supplier_type?: string;
  brand_name?: string;
  country?: string;
  province?: string;
  city?: string;
  town?: string;
  address?: string;
  contact_title?: string;
  contact_name?: string;
  designation?: string;
  calling_number?: string;
  whatsapp_number?: string;
  wechat_number?: string;
  email?: string;
  tax_id?: string;
  primary_website?: string;
  secondary_website?: string;
  product_categories?: string[];
  key_strength_subcategories?: string[];
  grade?: string;
  current_status?: string;
  potential?: string;
  potential_reason?: string;
  secondary_products?: string | string[];
  visited_factory?: string;
  visit_remarks?: string;
  overall_remarks?: string;
  contacts?: any[];
  attachments?: any[];
}

export const supplierApi = {
  // Fetch all suppliers from NestJS API (connected to Supabase DB)
  async getSuppliers(params?: any) {
    try {
      const response = await api.get('/suppliers', { params });
      return response.data;
    } catch (error) {
      console.warn('API error fetching suppliers, using fallback:', error);
      return null;
    }
  },

  // Create new Supplier in Supabase DB via NestJS API
  async createSupplier(data: SupplierDto) {
    try {
      const response = await api.post('/suppliers', data);
      return response.data;
    } catch (error) {
      console.warn('API error creating supplier:', error);
      return null;
    }
  },

  // Update Supplier in Supabase DB
  async updateStatus(id: string, currentStatus: string) {
    try {
      const response = await api.patch(`/suppliers/${id}/status`, { currentStatus });
      return response.data;
    } catch (error) {
      console.warn('API error updating status:', error);
      return null;
    }
  },

  // Delete Supplier in Supabase DB
  async deleteSupplier(id: string) {
    try {
      const response = await api.delete(`/suppliers/${id}`);
      return response.data;
    } catch (error) {
      console.warn('API error deleting supplier:', error);
      return null;
    }
  },
};
