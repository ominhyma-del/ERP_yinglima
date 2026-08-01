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
      const queryParams = { limit: 1000000, ...params };
      const response = await api.get('/suppliers', { params: queryParams });
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList)) {
        return rawList.map((s: any) => ({
          id: s.id,
          name: s.name,
          product_categories: s.product_categories || [],
          supplier_type: (s.supplier_type || 'MANUFACTURER') === 'TRADER' ? 'Trader' : 'Manufacturer',
          brand_name: s.brand_description || '',
          country: s.country || '',
          province: s.province || '',
          city: s.city || '',
          town: s.town || '',
          address: s.address || '',
          contact_title: (s.contacts && s.contacts[0]?.salutation) || '',
          contact_name: (s.contacts && s.contacts[0]?.full_name) || '',
          designation: (s.contacts && s.contacts[0]?.designation) || '',
          calling_number: (s.contacts && s.contacts[0]?.calling_number) || '',
          whatsapp_number: (s.contacts && s.contacts[0]?.whatsapp_number) || '',
          wechat_number: (s.contacts && s.contacts[0]?.wechat_number) || '',
          // BUG FIX: this used to only ever read the primary contact's
          // single `email`, discarding any additional addresses even
          // though this field is labeled "(Multiple)" per spec. Now reads
          // the company-level `emails` array (see Supplier.emails in the
          // schema), falling back to the contact's email for older
          // records saved before this field existed.
          emails: Array.isArray(s.emails) && s.emails.length > 0
            ? s.emails
            : (s.contacts && s.contacts[0]?.email ? [s.contacts[0].email] : []),
          tax_id: s.tax_id || '',
          primary_website: s.primary_website || '',
          secondary_website: s.secondary_website || '',
          key_strength_subcategories: s.key_strength_subcategories || [],
          grade: s.grade || '',
          current_status: s.current_status || 'NEW',
          potential: s.potential || 'UNSELECTED',
          potential_reason: s.potential_reason || '',
          secondary_products: s.secondary_products_desc ? s.secondary_products_desc.split(', ') : [],
          visited_factory: s.visited_factory ? 'Yes' : 'No',
          visit_remarks: s.visit_remarks || '',
          attachments: s.visit_attachments || [],
          overall_remarks: s.overall_remarks || '',
          contacts: s.contacts || [],
        }));
      }
      return null;
    } catch (error: any) {
      console.warn('API error fetching suppliers:', error);
      // Surface the real backend message (e.g. a schema drift error) up
      // to the page instead of only logging to console — a silent null
      // here looks identical to "zero suppliers exist" to the user.
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to load suppliers.');
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
        // Send the full multi-email array (see Supplier.emails in schema),
        // not just the first entry.
        emails: Array.isArray(data.emails) && data.emails.length > 0 ? data.emails : (data.email ? [data.email] : []),
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
            email: (data.emails && data.emails[0]) || data.email || '',
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

  // Delete Supplier in Supabase DB.
  // BUG FIX: this used to catch the error and return null, which silently
  // swallowed the backend's delete-rule-violation message (e.g. "Status is
  // EXISTING, cannot delete"). Callers had no way to distinguish "deleted
  // successfully" from "blocked by rule" — both looked like a resolved
  // promise. Re-throwing lets the caller's try/catch show the real reason.
  async deleteSupplier(id: string) {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  },

  // Bulk delete selected suppliers.
  // Returns { deleted: [{id,name}], blocked: [{id,name,reasons}], notFound: [id] }.
  // Pass forceIds (a subset of ids) + force:true to override specific
  // blocked records after the user confirms via the "Skip / Force Delete" popup.
  async bulkDeleteSuppliers(ids: string[], options?: { force?: boolean; forceIds?: string[] }) {
    const response = await api.post('/suppliers/bulk-delete', {
      ids,
      force: options?.force,
      forceIds: options?.forceIds,
    });
    return response.data as {
      deleted: { id: string; name: string }[];
      blocked: { id: string; name: string; reasons: string[] }[];
      notFound: string[];
    };
  },
};