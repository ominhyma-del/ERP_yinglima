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
      const response = await api.get('/buyers', { params });
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList)) {
        return rawList.map((b: any) => ({
          id: b.id,
          name: b.name,
          buyer_type: (b.buyer_type || 'MANUFACTURER') === 'TRADER' ? 'Trader' : 'Manufacturer',
          country: b.country || 'Uganda',
          city: b.city || 'Kampala',
          address: b.address || '',
          contact_salutation: (b.contacts && b.contacts[0]?.salutation) || 'Mr.',
          contact_name: (b.contacts && b.contacts[0]?.full_name) || 'Primary Contact',
          designation: (b.contacts && b.contacts[0]?.designation) || 'Procurement Manager',
          calling_number: (b.contacts && b.contacts[0]?.calling_number) || '+256 700000000',
          whatsapp_number: (b.contacts && b.contacts[0]?.whatsapp_number) || '+256 700000000',
          emails: b.contacts && b.contacts[0]?.email ? [b.contacts[0].email] : ['info@client.co.ug'],
          tax_id: b.tax_id || '',
          primary_website: b.primary_website || '',
          client_grade: b.client_grade || 'A',
          current_status: b.current_status || 'NEW',
          potential: b.potential || 'YES',
          potential_reason: b.potential_reason || '',
          product_range: b.product_range_supplied || 'Food & Beverage Processing',
          currently_buying_from: b.currently_buying_from || '',
          overall_remarks: b.overall_remarks || '',
          product_categories: b.product_categories || ['Food Ingredients'],
          potential_subcategories: b.potential_subcategories || ['Citric Acid'],
          created_at: b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          contacts: b.contacts || [],
        }));
      }
      return null;
    } catch (error) {
      console.warn('API error fetching buyers:', error);
      return null;
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
        primary_website: data.primary_website || '',
        client_grade: (data.client_grade || 'A').toUpperCase() === 'B' ? 'B' : (data.client_grade || 'A').toUpperCase() === 'C' ? 'C' : 'A',
        current_status: (data.current_status || 'NEW').toUpperCase() === 'EXISTING' ? 'EXISTING' : 'NEW',
        potential: (data.potential || 'YES').toUpperCase() === 'NO' ? 'NO' : 'YES',
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

  // Delete Buyer
  async deleteBuyer(id: string) {
    try {
      const response = await api.delete(`/buyers/${id}`);
      return response.data;
    } catch (error) {
      console.warn('API error deleting buyer:', error);
      return null;
    }
  },
};
