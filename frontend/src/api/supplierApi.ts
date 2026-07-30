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
  emails?: string[];
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
  visited_factory?: string | boolean;
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
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList)) {
        return rawList.map((s: any) => ({
          id: s.id,
          name: s.name,
          product_categories: s.product_categories || ['Machines'],
          supplier_type: (s.supplier_type || 'MANUFACTURER') === 'TRADER' ? 'Trader' : 'Manufacturer',
          brand_name: s.brand_description || 'Yinglima Supplier',
          country: s.country || 'China',
          province: s.province || '',
          city: s.city || '',
          town: s.town || '',
          address: s.address || '',
          contact_title: (s.contacts && s.contacts[0]?.salutation) || 'Mr',
          contact_name: (s.contacts && s.contacts[0]?.full_name) || 'Primary Contact',
          designation: (s.contacts && s.contacts[0]?.designation) || 'Sales Manager',
          calling_number: (s.contacts && s.contacts[0]?.calling_number) || '+86 13800000000',
          whatsapp_number: (s.contacts && s.contacts[0]?.whatsapp_number) || '+86 13800000000',
          wechat_number: (s.contacts && s.contacts[0]?.wechat_number) || '+86 13800000000',
          emails: s.contacts && s.contacts[0]?.email ? [s.contacts[0].email] : ['info@supplier.com'],
          tax_id: s.tax_id || '',
          primary_website: s.primary_website || '',
          secondary_website: s.secondary_website || '',
          key_strength_subcategories: s.key_strength_subcategories || ['Band Sealer'],
          grade: s.grade || 'A',
          current_status: s.current_status || 'NEW',
          potential: s.potential || 'YES',
          potential_reason: s.potential_reason || '',
          secondary_products: s.secondary_products_desc ? s.secondary_products_desc.split(', ') : ['Spare Parts'],
          visited_factory: s.visited_factory ? 'Yes' : 'No',
          visit_remarks: s.visit_remarks || '',
          attachments: s.visit_attachments || [],
          overall_remarks: s.overall_remarks || '',
          contacts: s.contacts || [],
        }));
      }
      return null;
    } catch (error) {
      console.warn('API error fetching suppliers:', error);
      return null;
    }
  },

  // Create new Supplier in Supabase DB via NestJS API
  async createSupplier(data: SupplierDto) {
    try {
      // Map frontend model to NestJS CreateSupplierDto schema
      const payload = {
        name: data.name,
        supplier_type: (data.supplier_type || 'MANUFACTURER').toUpperCase() === 'TRADER' ? 'TRADER' : 'MANUFACTURER',
        brand_description: data.brand_name || 'Standard Supplier',
        country: data.country || 'China',
        province: data.province || '',
        city: data.city || '',
        town: data.town || '',
        address: data.address || '',
        tax_id: data.tax_id || '',
        primary_website: data.primary_website || '',
        secondary_website: data.secondary_website || '',
        grade: (data.grade || 'A').toUpperCase() === 'B' ? 'B' : (data.grade || 'A').toUpperCase() === 'C' ? 'C' : 'A',
        current_status: (data.current_status || 'NEW').toUpperCase() === 'EXISTING' ? 'EXISTING' : 'NEW',
        potential: (data.potential || 'YES').toUpperCase() === 'NO' ? 'NO' : 'YES',
        potential_reason: data.potential_reason || '',
        secondary_products_desc: Array.isArray(data.secondary_products) ? data.secondary_products.join(', ') : data.secondary_products || '',
        visited_factory: data.visited_factory === 'YES' || data.visited_factory === true,
        visit_remarks: data.visit_remarks || '',
        overall_remarks: data.overall_remarks || '',
        product_categories: data.product_categories || [],
        key_strength_subcategories: data.key_strength_subcategories || [],
        contacts: [
          {
            salutation: data.contact_title || 'Mr.',
            full_name: data.contact_name ? `${data.contact_title || ''} ${data.contact_name}`.trim() : 'Primary Contact',
            designation: data.designation || 'Sales Manager',
            handling_territory: 'Export Global',
            country: data.country || 'China',
            calling_number: data.calling_number || '',
            whatsapp_number: data.whatsapp_number || data.calling_number || '',
            wechat_number: data.wechat_number || '',
            email: data.email || (data.emails && data.emails[0]) || '',
          },
        ],
      };

      const response = await api.post('/suppliers', payload);
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
