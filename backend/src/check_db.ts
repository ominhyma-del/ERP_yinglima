import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const [supplierCount, buyerCount, productCount, inquiryCount, companies, users] = await Promise.all([
    prisma.supplier.count(),
    prisma.buyer.count(),
    prisma.product.count(),
    prisma.inquiryConsignment.count(),
    prisma.company.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, role: true, user_companies: true } }),
  ]);

  console.log('--- DATABASE STATS ---');
  console.log('Supplier count:', supplierCount);
  console.log('Buyer count:', buyerCount);
  console.log('Product count:', productCount);
  console.log('Inquiry Consignment count:', inquiryCount);
  console.log('Companies:', companies);
  console.log('Users:', users);

  // Check tenant isolation filtering
  for (const c of companies) {
    const sCount = await prisma.supplier.count({ where: { company_id: c.id } });
    console.log(`Suppliers for company ${c.name} (${c.id}):`, sCount);
  }

  // Check duplicate suppliers by name
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true, company_id: true, tax_id: true, deleted_at: true }
  });

  const nameMap = new Map<string, number>();
  for (const s of suppliers) {
    const key = s.name.trim().toLowerCase();
    nameMap.set(key, (nameMap.get(key) || 0) + 1);
  }

  const dupes = Array.from(nameMap.entries()).filter(([_, count]) => count > 1);
  console.log('Duplicate Supplier Names count:', dupes.length);
  if (dupes.length > 0) {
    console.log('Duplicates:', dupes);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
