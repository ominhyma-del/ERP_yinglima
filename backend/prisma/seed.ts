import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default Tenant Companies, Users, Categories & Products into Supabase DB...');

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

  // 2. Seed Default Admin User
  const user = await prisma.user.upsert({
    where: { id: defaultUserId },
    update: {},
    create: {
      id: defaultUserId,
      email: 'admin@yinglima.com',
      password_hash: '$2b$10$e.S.GfF6n4s9YnZ2W4kMue',
      full_name: 'Yinglima Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✔ Default Admin User seeded:', user.email);

  // 3. Seed Product Category & Subcategory
  const defaultCatId = '88888888-8888-8888-8888-888888888801';
  const defaultSubcatId = '88888888-8888-8888-8888-888888888802';

  const category = await prisma.productCategory.upsert({
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

  const subcategory = await prisma.productSubCategory.upsert({
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

  // 4. Seed Standard Master Products (Citric Acid, Band Sealer)
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

  // 5. Seed Inquiry Consignments (FB1, FB2)
  await prisma.inquiryConsignment.upsert({
    where: { id: '77777777-7777-7777-7777-777777777701' },
    update: {},
    create: {
      id: '77777777-7777-7777-7777-777777777701',
      company_id: defaultCompanyId,
      consignment_code: 'FB1',
      status: 'PROPOSED',
      total_cbm: 25.0,
      total_weight: 25000.0,
      created_by: defaultUserId,
    },
  });

  console.log('✔ Inquiry Consignments (FB1) seeded into Supabase DB!');
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
