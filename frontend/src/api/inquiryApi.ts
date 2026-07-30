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
      const response = await api.get('/inquiries/layer1-summary');
      return response.data;
    } catch (error) {
      console.warn('API error fetching consignments summary:', error);
      return null;
    }
  },

  // Fetch Layer 2 Line Items for a consignment code
  async getInquiryItems(consignmentCode: string) {
    try {
      const response = await api.get(`/inquiries/layer2-grid/${consignmentCode}`);
      return response.data;
    } catch (error) {
      console.warn('API error fetching inquiry items:', error);
      return null;
    }
  },

  // Create new Inquiry Item in Supabase DB via NestJS API
  async createInquiryItem(data: InquiryItemDto) {
    try {
      // Default fallback product_id to seeded Citric Acid / Band Sealer UUID if custom product
      const productId =
        data.product_name?.toLowerCase().includes('sealer')
          ? '99999999-9999-9999-9999-999999999902'
          : '99999999-9999-9999-9999-999999999901';

      const payload = {
        consignment_code: data.consignment_code || 'FB1',
        product_id: productId,
        quantity: Number(data.quantity) || 1,
        brand_preference: data.brand_preference || 'Standard Preferred',
        product_specs: data.product_specs || 'Standard Specification',
        procurement_remarks: data.procurement_remarks || 'China Procurement requirement item.',
      };

      const response = await api.post('/inquiries/items', payload);
      return response.data;
    } catch (error) {
      console.warn('API error creating inquiry item:', error);
      return null;
    }
  },

  // Update Item Quantity or Shift Consignment Code
  async updateInquiryItemQuantity(id: string, quantity: number) {
    try {
      const response = await api.patch(`/inquiries/items/${id}/quantity`, { quantity });
      return response.data;
    } catch (error) {
      console.warn('API error updating inquiry item quantity:', error);
      return null;
    }
  },
};
