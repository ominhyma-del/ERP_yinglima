/**
 * ── Customizable Product Form Fields ─────────────────────────────────────────
 *
 * This is the single source of truth for which fields appear on the
 * Add/Edit Product form, in which tab, whether they're required, and in
 * what order. A developer can add a new field by adding one entry here
 * (plus rendering it in ProductMasterPage's field-renderer switch).
 *
 * The "Manage Fields" panel in the UI lets a non-developer toggle a
 * field's visibility / required flag without touching code. Those
 * per-field overrides are merged on top of this base config and persisted
 * to localStorage, so nothing resets on refresh and no product data is
 * ever touched by a field being hidden (hidden fields simply aren't
 * rendered — their stored values are preserved).
 */

export type FieldTab = 'general' | 'packaging' | 'specs' | 'docs';

export interface FieldDef {
  key: string;
  label: string;
  tab: FieldTab;
  type: 'text' | 'select' | 'number' | 'textarea' | 'readonly' | 'richtext' | 'file';
  required: boolean;
  /** Core fields are fundamental to the record (e.g. Product Code) and can be
   * hidden from the form only, never deleted from the config entirely via UI. */
  core: boolean;
  removable: boolean;
  order: number;
}

export const DEFAULT_FIELD_CONFIG: FieldDef[] = [
  { key: 'name_tally', label: 'Product Name (As per Tally)', tab: 'general', type: 'text', required: true, core: true, removable: false, order: 10 },
  { key: 'name_invoice', label: 'Product Name (As per Invoice)', tab: 'general', type: 'text', required: false, core: false, removable: true, order: 20 },
  { key: 'product_code', label: 'Product Code', tab: 'general', type: 'text', required: true, core: true, removable: false, order: 30 },
  { key: 'category', label: 'Product Category', tab: 'general', type: 'select', required: true, core: true, removable: false, order: 40 },
  { key: 'subcategory', label: 'Product Sub Category', tab: 'general', type: 'select', required: true, core: true, removable: false, order: 50 },
  { key: 'brand', label: 'Brand', tab: 'general', type: 'select', required: true, core: true, removable: false, order: 60 },
  { key: 'hsn_code', label: 'HSN Code', tab: 'general', type: 'select', required: true, core: true, removable: false, order: 70 },
  { key: 'vat_refund_pct', label: 'Refund VAT % (Auto)', tab: 'general', type: 'readonly', required: false, core: true, removable: false, order: 80 },
  { key: 'uom', label: 'Unit of Measure (UOM)', tab: 'general', type: 'select', required: true, core: true, removable: false, order: 90 },
  { key: 'license_remarks', label: 'License / Certificate Remarks', tab: 'general', type: 'text', required: false, core: false, removable: true, order: 100 },
  { key: 'status', label: 'Status', tab: 'general', type: 'select', required: true, core: true, removable: false, order: 110 },

  { key: 'pkg_quantity', label: 'Packaging Quantity', tab: 'packaging', type: 'number', required: false, core: false, removable: true, order: 10 },
  { key: 'pkg_net_weight', label: 'Packaging Net Weight (kg)', tab: 'packaging', type: 'number', required: false, core: false, removable: true, order: 20 },
  { key: 'pkg_gross_weight', label: 'Packaging Gross Weight (kg)', tab: 'packaging', type: 'number', required: false, core: false, removable: true, order: 30 },
  { key: 'length_cm', label: 'Length (cm)', tab: 'packaging', type: 'number', required: false, core: false, removable: true, order: 40 },
  { key: 'width_cm', label: 'Width (cm)', tab: 'packaging', type: 'number', required: false, core: false, removable: true, order: 50 },
  { key: 'height_cm', label: 'Height (cm)', tab: 'packaging', type: 'number', required: false, core: false, removable: true, order: 60 },
  { key: 'pkg_cbm', label: 'Packaging CBM (Auto)', tab: 'packaging', type: 'readonly', required: false, core: true, removable: false, order: 70 },

  { key: 'specifications', label: 'Specifications', tab: 'specs', type: 'richtext', required: false, core: false, removable: true, order: 10 },

  { key: 'product_image', label: 'Product Image', tab: 'docs', type: 'file', required: false, core: false, removable: true, order: 10 },
  { key: 'certificates', label: 'Certificates', tab: 'docs', type: 'file', required: false, core: false, removable: true, order: 20 },
  { key: 'manuals', label: 'Manuals / PDFs', tab: 'docs', type: 'file', required: false, core: false, removable: true, order: 30 },
  { key: 'other_docs', label: 'Other Documents', tab: 'docs', type: 'file', required: false, core: false, removable: true, order: 40 },
];

export interface FieldOverride {
  visible: boolean;
  required?: boolean;
}

export type FieldOverrideMap = Record<string, FieldOverride>;

const STORAGE_KEY = 'yinglima_product_field_overrides_v1';

export function loadFieldOverrides(): FieldOverrideMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveFieldOverrides(overrides: FieldOverrideMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage unavailable — overrides simply won't persist this session
  }
}

/** Merge base config with any saved overrides, sorted for display. */
export function getEffectiveFields(overrides: FieldOverrideMap): (FieldDef & { visible: boolean })[] {
  return DEFAULT_FIELD_CONFIG
    .map((f) => {
      const o = overrides[f.key];
      return {
        ...f,
        visible: o ? o.visible : true,
        required: f.core ? f.required : (o?.required ?? f.required),
      };
    })
    .sort((a, b) => a.tab.localeCompare(b.tab) || a.order - b.order);
}
