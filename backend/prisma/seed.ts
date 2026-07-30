import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default Tenant Companies, Users, Categories, Products & Suppliers into Supabase DB...');

  const defaultCompanyId = '11111111-1111-1111-1111-111111111111';
  const defaultUserId = '00000000-0000-0000-0000-000000000001';

  // 1. Seed Main Company: Yinglima Machinery & Trade (China HQ)
  const company = await prisma.company.upsert({
    where: { id: defaultCompanyId },
    update: {},
    create: {
      id: defaultCompanyId,
      code: 'YINGLIMA',
      name: 'Yinglima Machinery & Trade (China HQ)',
      currency: 'USD',
      status: 'ACTIVE',
    },
  });

  console.log('✔ Company seeded:', company.name);

  // 2. Seed Default Admin User & Default standard User
  const fullPermissions = {
    suppliers: { view: true, edit: true, delete: true },
    inquiry: { view: true, edit: true, delete: true },
    import_purchase: { view: true, edit: true, delete: true },
    buyers: { view: true, edit: true, delete: true },
    quotation: { view: true, edit: true, delete: true },
    products: { view: true, edit: true, delete: true },
    stock: { view: true, edit: true, delete: true },
    team: { view: true, edit: true, delete: true },
    roles: { view: true, edit: true, delete: true }
  };

  const adminUser = await prisma.user.upsert({
    where: { id: defaultUserId },
    update: {
      password_hash: 'admin123',
      phone: '+86 13800000000',
      department: 'Management',
      branch: 'Yinglima Machinery & Trade (China HQ)',
      permissions: fullPermissions,
    },
    create: {
      id: defaultUserId,
      email: 'admin@yinglima.com',
      password_hash: 'admin123',
      full_name: 'Yinglima Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+86 13800000000',
      department: 'Management',
      branch: 'Yinglima Machinery & Trade (China HQ)',
      permissions: fullPermissions,
    },
  });

  const defaultStandardUserId = '00000000-0000-0000-0000-000000000002';
  const standardUser = await prisma.user.upsert({
    where: { id: defaultStandardUserId },
    update: {
      password_hash: 'user123',
      phone: '+256 700000000',
      department: 'Purchase / Procurement',
      branch: 'F&B Uganda Ingredients Ltd',
      permissions: fullPermissions,
    },
    create: {
      id: defaultStandardUserId,
      email: 'user@yinglima.com',
      password_hash: 'user123',
      full_name: 'Yinglima User',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      phone: '+256 700000000',
      department: 'Purchase / Procurement',
      branch: 'F&B Uganda Ingredients Ltd',
      permissions: fullPermissions,
    },
  });

  console.log('✔ Default Admin User seeded:', adminUser.email);
  console.log('✔ Default Standard User seeded:', standardUser.email);

  // 3. Seed Product Category & Subcategory
  const defaultCatId = '88888888-8888-8888-8888-888888888801';
  const defaultSubcatId = '88888888-8888-8888-8888-888888888802';

  await prisma.productCategory.upsert({
    where: { id: defaultCatId },
    update: {},
    create: {
      id: defaultCatId,
      company_id: defaultCompanyId,
      name: 'Chemicals & Machinery',
      status: 'ACTIVE',
      created_by: defaultUserId,
    },
  });

  await prisma.productSubCategory.upsert({
    where: { id: defaultSubcatId },
    update: {},
    create: {
      id: defaultSubcatId,
      company_id: defaultCompanyId,
      category_id: defaultCatId,
      name: 'General Ingredients & Machines',
      status: 'ACTIVE',
      created_by: defaultUserId,
    },
  });

  console.log('✔ Product Category & Subcategory seeded!');

  // 4. Seed Standard Master Products
  const products = [
    {
      id: '99999999-9999-9999-9999-999999999901',
      product_code: 'PRD-CITRIC-MONO',
      name_tally: 'Citric Acid Monohydrate',
      uom: 'BAGS',
      unit_cbm: 0.025,
      gross_weight: 25.0,
      license_required_info: 'Special Import Permit Required from UNBS Uganda',
    },
    {
      id: '99999999-9999-9999-9999-999999999902',
      product_code: 'PRD-BAND-SEALER',
      name_tally: 'FR-900 Continuous Band Sealer',
      uom: 'SETS',
      unit_cbm: 0.15,
      gross_weight: 28.5,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        company_id: defaultCompanyId,
        category_id: defaultCatId,
        subcategory_id: defaultSubcatId,
        product_code: p.product_code,
        name_tally: p.name_tally,
        uom: p.uom,
        unit_cbm: p.unit_cbm,
        gross_weight: p.gross_weight,
        license_required_info: p.license_required_info || null,
        status: 'ACTIVE',
        created_by: defaultUserId,
      },
    });
  }

  console.log('✔ Master Products seeded into Supabase DB!');

  // 5. Seed Standard Suppliers (Zhejiang Packaging Machinery & Shandong Citric Acid)
  const zhejiangSupplier = await prisma.supplier.upsert({
    where: { id: '66666666-6666-6666-6666-666666666601' },
    update: {},
    create: {
      id: '66666666-6666-6666-6666-666666666601',
      company_id: defaultCompanyId,
      name: 'Zhejiang Packaging Machinery Ltd',
      supplier_type: 'MANUFACTURER',
      brand_description: 'Yinglima Machinery',
      country: 'China',
      province: 'Zhejiang',
      city: 'Wenzhou',
      town: 'Ruian Town',
      address: 'No. 888 Industrial Zone',
      tax_id: '91330300MA12345678',
      primary_website: 'www.zhejiangpack.com',
      grade: 'A',
      current_status: 'EXISTING',
      potential: 'YES',
      potential_reason: 'High manufacturing capacity & 4 automated production lines',
      secondary_products_desc: 'Teflon Belts, Heating Blocks, Silicone Strips',
      visited_factory: true,
      visit_remarks: 'Visited facility in March 2025.',
      overall_remarks: 'Primary supplier for band sealers.',
      product_categories: ['Machines', 'Spare Parts', 'Packaging Equipment'],
      key_strength_subcategories: ['Band Sealer', 'Vacuum Packers', 'Spares for Band Sealer'],
      created_by: defaultUserId,
      contacts: {
        create: [
          {
            salutation: 'Mr',
            full_name: 'John Zhang',
            designation: 'Export Director',
            handling_territory: 'Export Global',
            country: 'China',
            calling_number: '+86 13800138000',
            whatsapp_number: '+86 13800138000',
            wechat_number: '+86 13800138000',
            email: 'john@zhejiangpack.com',
          },
        ],
      },
    },
  });

  const shandongSupplier = await prisma.supplier.upsert({
    where: { id: '66666666-6666-6666-6666-666666666602' },
    update: {},
    create: {
      id: '66666666-6666-6666-6666-666666666602',
      company_id: defaultCompanyId,
      name: 'Shandong Citric Acid Chemical Co',
      supplier_type: 'MANUFACTURER',
      brand_description: 'TTCA Brand',
      country: 'China',
      province: 'Shandong',
      city: 'Weifang',
      town: 'Anqiu Town',
      address: 'Chemical Industry Park',
      tax_id: '91370700MA98765432',
      primary_website: 'www.citricacid-shandong.com',
      grade: 'B',
      current_status: 'NEW',
      potential: 'NO',
      secondary_products_desc: 'Citric Acid Monohydrate, Sodium Citrate',
      visited_factory: false,
      overall_remarks: 'Food grade Citric Acid Anhydrous 30-100 mesh supplier.',
      product_categories: ['Food Ingredients', 'Chemicals'],
      key_strength_subcategories: ['Citric Acid'],
      created_by: defaultUserId,
      contacts: {
        create: [
          {
            salutation: 'Mr',
            full_name: 'Li Wei',
            designation: 'Sales Manager',
            handling_territory: 'Export Global',
            country: 'China',
            calling_number: '+86 13900139000',
            whatsapp_number: '+86 13900139000',
            wechat_number: '+86 13900139000',
            email: 'liwei@citric.cn',
          },
        ],
      },
    },
  });

  // 6. Seed Inquiry Consignments (FB1, FB2, OS1, ING1) & Line Items
  const inquiryConsignments = [
    {
      id: '77777777-7777-7777-7777-777777777701',
      consignment_code: 'FB1',
      status: 'PROPOSED',
      total_cbm: 28.45,
      total_weight: 14250.0,
    },
    {
      id: '77777777-7777-7777-7777-777777777702',
      consignment_code: 'FB2',
      status: 'PARTIALLY_APPROVED',
      total_cbm: 32.1,
      total_weight: 16800.0,
    },
    {
      id: '77777777-7777-7777-7777-777777777703',
      consignment_code: 'OS1',
      status: 'FULLY_APPROVED',
      total_cbm: 45.0,
      total_weight: 22500.0,
    },
    {
      id: '77777777-7777-7777-7777-777777777704',
      consignment_code: 'ING1',
      status: 'PROPOSED',
      total_cbm: 18.2,
      total_weight: 8500.0,
    },
  ];

  for (const c of inquiryConsignments) {
    await prisma.inquiryConsignment.upsert({
      where: { id: c.id },
      update: {
        total_cbm: c.total_cbm,
        total_weight: c.total_weight,
      },
      create: {
        id: c.id,
        company_id: defaultCompanyId,
        consignment_code: c.consignment_code,
        status: c.status as any,
        total_cbm: c.total_cbm,
        total_weight: c.total_weight,
        created_by: defaultUserId,
        items: {
          create: [
            {
              product_id: '99999999-9999-9999-9999-999999999901',
              quantity: 100,
              uom: 'BAGS',
              brand_preference: 'TTCA Brand Preferred',
              product_specs: 'Standard Packaging',
              procurement_remarks: 'China Supplier Confirmed',
              license_warning_flag: true,
            },
          ],
        },
      },
    });
  }

  console.log('✔ Inquiry Consignments (FB1, FB2, OS1, ING1) seeded into Supabase DB!');

  // 7. Seed Initial Buyer Companies (Uganda Beverage & Mukwano)
  await prisma.buyer.upsert({
    where: { id: '55555555-5555-5555-5555-555555555501' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555501',
      company_id: defaultCompanyId,
      name: 'Uganda Beverage Industries Ltd',
      buyer_type: 'MANUFACTURER',
      country: 'Uganda',
      city: 'Kampala',
      address: 'Plot 45 Industrial Area',
      client_grade: 'A',
      current_status: 'EXISTING',
      potential: 'YES',
      product_range_supplied: 'Carbonated Soft Drinks, Juice Concentrates',
      product_categories: ['Food Ingredients'],
      potential_subcategories: ['Citric Acid'],
      created_by: defaultUserId,
      contacts: {
        create: [
          {
            salutation: 'Mr.',
            full_name: 'David Musoke',
            designation: 'Procurement Director',
            country: 'Uganda',
            calling_number: '+256 700123456',
            whatsapp_number: '+256 700123456',
            email: 'david@ugandabev.co.ug',
          },
        ],
      },
    },
  });

  await prisma.buyer.upsert({
    where: { id: '55555555-5555-5555-5555-555555555502' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555502',
      company_id: defaultCompanyId,
      name: 'Mukwano Industries Uganda',
      buyer_type: 'MANUFACTURER',
      country: 'Uganda',
      city: 'Kampala',
      address: 'Mukwano Complex Jinja Road',
      client_grade: 'A',
      current_status: 'NEW',
      potential: 'UNSELECTED',
      product_range_supplied: 'Soaps, Detergents, Cooking Oils',
      product_categories: ['Chemicals'],
      potential_subcategories: ['Caustic Soda'],
      created_by: defaultUserId,
      contacts: {
        create: [
          {
            salutation: 'Ms.',
            full_name: 'Grace Akello',
            designation: 'Supply Chain Manager',
            country: 'Uganda',
            calling_number: '+256 750987654',
            whatsapp_number: '+256 750987654',
            email: 'gakello@mukwano.com',
          },
        ],
      },
    },
  });

  console.log('✔ Initial Buyers (Uganda Beverage & Mukwano) seeded into Supabase DB!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
