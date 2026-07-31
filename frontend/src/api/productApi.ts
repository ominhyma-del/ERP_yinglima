import api from '../lib/api';

export const productApi = {
  async getProducts(params?: any) {
    try {
      const response = await api.get('/products', { params });
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList)) {
        return rawList.map((p: any) => ({
          id: p.id,
          name_tally: p.name_tally,
          name_invoice: p.name_invoice || p.name_tally,
          product_code: p.product_code,
          category: p.category?.name || 'General',
          subcategory: p.subcategory?.name || 'General',
          brand: p.brand?.name || 'Yinglima',
          hsn_code: p.hsn_code || '',
          vat_refund_pct: Number(p.vat_refund_pct) || 0,
          license_remarks: p.license_required_info || '',
          uom: p.uom || 'PCS',
          status: p.status || 'ACTIVE',
          pkg_quantity: Number(p.packaging_qty) || 1,
          pkg_net_weight: Number(p.net_weight) || 0,
          pkg_gross_weight: Number(p.gross_weight) || 0,
          length_cm: Number(p.length_cm) || 0,
          width_cm: Number(p.width_cm) || 0,
          height_cm: Number(p.height_cm) || 0,
          pkg_cbm: String(p.unit_cbm || '0.000000'),
          specifications: p.specifications || '',
          current_stock: Number(p.current_stock) || 0,
          created_by: 'User',
          created_date: p.created_at ? p.created_at.split('T')[0] : '',
          modified_by: 'User',
          modified_date: p.updated_at ? p.updated_at.split('T')[0] : '',
          audit: [],
        }));
      }
      return [];
    } catch (error) {
      console.warn('API error fetching products:', error);
      return [];
    }
  },

  async deleteProduct(id: string) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  async toggleStatus(id: string) {
    const response = await api.patch(`/products/${id}/status`);
    return response.data;
  },
};
