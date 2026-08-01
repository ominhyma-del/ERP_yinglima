import api from '../lib/api';

export interface BuyerDto {
  id?: string;
  name: string;
  buyer_type?: string;
  country?: string;
  city?: string;
  address?: string;
  contact_salutation?: string;
  contact_name?: string;
  designation?: string;
  calling_number?: string;
  whatsapp_number?: string;
  email?: string;
  emails?: string[];
  tax_id?: string;
  primary_website?: string;
  current_status?: string;
  product_range_supplied?: string;
  potential?: string;
  potential_reason?: string;
  client_grade?: string;
  currently_buying_from?: string;
  overall_remarks?: string;
  product_categories?: string[];
  potential_subcategories?: string[];
  contacts?: any[];
}

export const buyerApi = {
  // Fetch all buyers from NestJS API (connected to Supabase DB)
  async getBuyers(params?: any) {
    try {
      const queryParams = { limit: 1000000, ...params };
      const response = await api.get('/buyers', { params: queryParams });
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList)) {
        return rawList.map((b: any) => ({
          id: b.id,
          name: b.name,
          buyer_type: (b.buyer_type || 'MANUFACTURER') === 'TRADER' ? 'Trader' : 'Manufacturer',
          country: b.country || '',
          city: b.city || '',
          address: b.address || '',
          contact_salutation: (b.contacts && b.contacts[0]?.salutation) || '',
          contact_name: (b.contacts && b.contacts[0]?.full_name) || '',
          designation: (b.contacts && b.contacts[0]?.designation) || '',
          calling_number: (b.contacts && b.contacts[0]?.calling_number) || '',
          whatsapp_number: (b.contacts && b.contacts[0]?.whatsapp_number) || '',
          // BUG FIX: see matching note in supplierApi.ts — reads the
          // company-level `emails` array instead of only ever capturing
          // the primary contact's single email.
          emails: Array.isArray(b.emails) && b.emails.length > 0
            ? b.emails
            : (b.contacts && b.contacts[0]?.email ? [b.contacts[0].email] : []),
          tax_id: b.tax_id || '',
          primary_website: b.website || '',
          client_grade: b.client_grade || 'Select',
          current_status: b.current_status || 'NEW',
          potential: b.potential || 'UNSELECTED',
          potential_reason: b.potential_reason || '',
          product_range: b.product_range_supplied || '',
          currently_buying_from: b.currently_buying_from || '',
          overall_remarks: b.overall_remarks || '',
          product_categories: b.product_categories || [],
          potential_subcategories: b.potential_subcategories || [],
          created_at: b.created_at ? b.created_at.split('T')[0] : '',
          contacts: b.contacts || [],
        }));
      }
      return null;
    } catch (error: any) {
      console.warn('API error fetching buyers:', error);
      // Same fix as supplierApi.getSuppliers — surface the real backend
      // message instead of silently returning null, which looked
      // identical to "zero buyers exist" to the user.
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to load buyers.');
    }
  },

  // Create new Buyer in Supabase DB via NestJS API
  async createBuyer(data: BuyerDto) {
    try {
      const payload = {
        name: data.name,
        buyer_type: (data.buyer_type || 'MANUFACTURER').toUpperCase() === 'TRADER' ? 'TRADER' : 'MANUFACTURER',
        country: data.country || 'Uganda',
        city: data.city || 'Kampala',
        address: data.address || '',
        tax_id: data.tax_id || '',
        website: data.primary_website || '',
        // Send the full multi-email array (see Buyer.emails in schema),
        // not just the first entry.
        emails: Array.isArray(data.emails) && data.emails.length > 0 ? data.emails : (data.email ? [data.email] : []),
        client_grade: data.client_grade === 'Select' || !data.client_grade ? null : data.client_grade,
        current_status: (data.current_status || 'NEW').toUpperCase() === 'EXISTING' ? 'EXISTING' : 'NEW',
        potential: data.potential === 'NO' ? 'NO' : data.potential === 'YES' ? 'YES' : 'UNSELECTED',
        potential_reason: data.potential_reason || '',
        product_range_supplied: data.product_range_supplied || 'Food & Beverage Processing',
        currently_buying_from: data.currently_buying_from || '',
        overall_remarks: data.overall_remarks || '',
        product_categories: data.product_categories || [],
        potential_subcategories: data.potential_subcategories || [],
        contacts: data.contacts && data.contacts.length > 0 ? data.contacts.map((c: any) => ({
          salutation: c.salutation || c.title || 'Mr.',
          full_name: c.full_name || c.name || 'Primary Contact',
          designation: c.designation || 'Procurement Manager',
          country: c.country || data.country || 'Uganda',
          calling_number: c.calling_number || c.calling || '+256 700000000',
          whatsapp_number: c.whatsapp_number || c.whatsapp || '+256 700000000',
          email: c.email || (data.emails && data.emails[0]) || 'info@client.co.ug',
        })) : [
          {
            salutation: data.contact_salutation || 'Mr.',
            full_name: data.contact_name || 'Primary Contact',
            designation: data.designation || 'Procurement Manager',
            country: data.country || 'Uganda',
            calling_number: data.calling_number || '+256 700000000',
            whatsapp_number: data.whatsapp_number || '+256 700000000',
            email: (data.emails && data.emails[0]) || 'info@client.co.ug',
          },
        ],
      };

      const response = await api.post('/buyers', payload);
      return response.data;
    } catch (error) {
      console.warn('API error creating buyer:', error);
      return null;
    }
  },

  // Update full Buyer Profile in Supabase DB via NestJS API
  async updateBuyer(id: string, data: BuyerDto) {
    try {
      const payload = {
        name: data.name,
        buyer_type: (data.buyer_type || 'MANUFACTURER').toUpperCase() === 'TRADER' ? 'TRADER' : 'MANUFACTURER',
        country: data.country || 'Uganda',
        city: data.city || 'Kampala',
        address: data.address || '',
        tax_id: data.tax_id || '',
        website: data.primary_website || '',
        emails: Array.isArray(data.emails) && data.emails.length > 0 ? data.emails : (data.email ? [data.email] : []),
        client_grade: data.client_grade === 'Select' || !data.client_grade ? null : data.client_grade,
        current_status: (data.current_status || 'NEW').toUpperCase() === 'EXISTING' ? 'EXISTING' : 'NEW',
        potential: data.potential === 'NO' ? 'NO' : data.potential === 'YES' ? 'YES' : 'UNSELECTED',
        potential_reason: data.potential_reason || '',
        product_range_supplied: data.product_range_supplied || '',
        currently_buying_from: data.currently_buying_from || '',
        overall_remarks: data.overall_remarks || '',
        product_categories: data.product_categories || [],
        potential_subcategories: data.potential_subcategories || [],
        contacts: data.contacts && data.contacts.length > 0 ? data.contacts.map((c: any) => ({
          salutation: c.salutation || 'Mr.',
          full_name: c.full_name || 'Contact Person',
          designation: c.designation || 'Staff',
          country: c.country || data.country || 'Uganda',
          calling_number: c.calling_number || '',
          whatsapp_number: c.whatsapp_number || '',
          email: c.email || '',
        })) : [],
      };

      const response = await api.patch(`/buyers/${id}`, payload);
      return response.data;
    } catch (error) {
      console.warn('API error updating buyer profile:', error);
      return null;
    }
  },

  // Update Buyer Status
  async updateStatus(id: string, currentStatus: string) {
    try {
      const response = await api.patch(`/buyers/${id}/status`, { currentStatus });
      return response.data;
    } catch (error) {
      console.warn('API error updating buyer status:', error);
      return null;
    }
  },

  // Delete Buyer.
  // BUG FIX: previously caught the error and returned null, which hid the
  // backend's delete-rule-violation message from the caller. Re-throw so
  // handleDeleteBuyer's try/catch can show the real blocking reason.
  async deleteBuyer(id: string) {
    const response = await api.delete(`/buyers/${id}`);
    return response.data;
  },

  // Bulk delete selected buyers.
  // Returns { deleted: [{id,name}], blocked: [{id,name,reasons}], notFound: [id] }.
  // Pass forceIds (a subset of ids) + force:true to override specific
  // blocked records after the user confirms via the "Skip / Force Delete" popup.
  async bulkDeleteBuyers(ids: string[], options?: { force?: boolean; forceIds?: string[] }) {
    const response = await api.post('/buyers/bulk-delete', {
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