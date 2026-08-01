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
  // Fetch Layer 1 Consignments Summary from NestJS API (connected to Supabase DB)
  async getConsignments() {
    try {
      const response = await api.get('/inquiries/layer1-summary');
      const rawList = response.data?.data || response.data;
      const authUserStr = typeof window !== 'undefined' ? localStorage.getItem('yinglima_auth_user') : null;
      const activeUserName = authUserStr ? JSON.parse(authUserStr)?.name : 'rupesh';

      if (Array.isArray(rawList)) {
        return rawList.map((c: any) => ({
          id: c.id,
          company: c.company?.name || '',
          code: c.consignment_code,
          status: c.status || 'PROPOSED',
          total_cbm: Number(c.total_cbm) || 0,
          total_weight: Number(c.total_weight) || 0,
          proposed_date: c.created_at ? c.created_at.split('T')[0] : '',
          proposed_by: c.proposed_by_name || c.created_by_name || activeUserName || 'rupesh',
        }));
      }
      return null;
    } catch (error) {
      console.warn('API error fetching consignments summary:', error);
      return null;
    }
  },

  // Fetch Layer 2 Line Items for a consignment code from NestJS API
  async getInquiryItems(consignmentCode: string) {
    try {
      const response = await api.get(`/inquiries/layer2-grid/${consignmentCode}`);
      const consignmentData = response.data;
      if (consignmentData && consignmentData.items && Array.isArray(consignmentData.items)) {
        return consignmentData.items.map((i: any) => ({
          id: i.id,
          company: consignmentData.company?.name || '',
          consignment_code: consignmentData.consignment_code,
          product_name: i.product?.name_tally || '',
          product_code: i.product?.product_code || '',
          uom: i.uom || i.product?.uom || 'PCS',
          quantity: Number(i.quantity) || 1,
          unit_cbm: Number(i.product?.unit_cbm) || 0,
          gross_weight: Number(i.product?.gross_weight) || 0,
          brand_preference: i.brand_preference || '',
          product_specs: i.product_specs || '',
          procurement_remarks: i.procurement_remarks || '',
          item_status: i.item_status || 'PROPOSED',
          tally_post_status: i.tally_post_status || 'PENDING',
          license_warning: !!i.license_warning_flag,
          license_remark: i.product?.license_required_info || '',
          proposed_date: i.created_at ? i.created_at.split('T')[0] : '',
          proposed_by: 'User',
        }));
      }
      return null;
    } catch (error) {
      console.warn('API error fetching inquiry items:', error);
      return null;
    }
  },

  // Create new Inquiry Item in Supabase DB via NestJS API
  async createInquiryItem(data: InquiryItemDto) {
    try {
      const payload = {
        consignment_code: data.consignment_code || 'FB1',
        product_name: data.product_name,
        product_code: data.product_code,
        product_id: data.id && !data.id.startsWith('item-') ? data.id : undefined,
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

  // Update Item Quantity
  async updateInquiryItemQuantity(id: string, quantity: number) {
    try {
      const response = await api.patch(`/inquiries/items/${id}/quantity`, { quantity });
      return response.data;
    } catch (error) {
      console.warn('API error updating inquiry item quantity:', error);
      return null;
    }
  },

  // Delete Line Item.
  // BUG FIX: previously caught the error and returned null, hiding the
  // backend's block message (e.g. item is Approved / already Tally-posted).
  // Re-throw so the caller's try/catch can react to the real reason.
  // Pass force:true to override the block after explicit user confirmation.
  async deleteInquiryItem(id: string, force?: boolean) {
    const response = await api.delete(`/inquiries/items/${id}`, { params: { force: force ? 'true' : undefined } });
    return response.data;
  },

  // Delete Consignment. Same fix + force override as deleteInquiryItem.
  async deleteConsignment(id: string, force?: boolean) {
    const response = await api.delete(`/inquiries/consignments/${id}`, { params: { force: force ? 'true' : undefined } });
    return response.data;
  },

  // Bulk delete selected consignments.
  // Returns { deleted: [{id,name}], blocked: [{id,name,reasons}], notFound: [id] }.
  // Pass forceIds (a subset of ids) + force:true to override specific
  // blocked records after the user confirms via the "Skip / Force Delete" popup.
  async bulkDeleteConsignments(ids: string[], options?: { force?: boolean; forceIds?: string[] }) {
    const response = await api.post('/inquiries/consignments/bulk-delete', {
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
