import api from '../lib/api';

export interface InquiryItemDto {
  id?: string;
  company: string;
  consignment_code: string;
  product_name: string;
  product_code?: string;
  uom?: string;
  quantity: number;
  unit_cbm?: number;
  gross_weight?: number;
  brand_preference?: string;
  product_specs?: string;
  procurement_remarks?: string;
  item_status?: string;
  tally_post_status?: string;
  license_warning?: boolean;
  license_remark?: string;
}

export const inquiryApi = {
  // Fetch Layer 1 Consignments Summary from NestJS API
  async getConsignments() {
    try {
      const response = await api.get('/inquiries/consignments');
      return response.data;
    } catch (error) {
      console.warn('API error fetching consignments summary:', error);
      return null;
    }
  },

  // Fetch Layer 2 Line Items for a consignment code
  async getInquiryItems(consignmentCode?: string) {
    try {
      const response = await api.get('/inquiries/items', {
        params: { consignmentCode },
      });
      return response.data;
    } catch (error) {
      console.warn('API error fetching inquiry items:', error);
      return null;
    }
  },

  // Create new Inquiry Item in Supabase DB via NestJS API
  async createInquiryItem(data: InquiryItemDto) {
    try {
      const response = await api.post('/inquiries/items', data);
      return response.data;
    } catch (error) {
      console.warn('API error creating inquiry item:', error);
      return null;
    }
  },

  // Update Item Quantity or Shift Consignment Code
  async updateInquiryItem(id: string, updates: Partial<InquiryItemDto>) {
    try {
      const response = await api.put(`/inquiries/items/${id}`, updates);
      return response.data;
    } catch (error) {
      console.warn('API error updating inquiry item:', error);
      return null;
    }
  },
};
