import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use DIRECT_URL for seed script if available to avoid connection limits/timeouts
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
});

async function main() {
  console.log("🌱 Starting idempotent database seed against Neon PostgreSQL...");

  // Password for all demo accounts: Demo@123
  const hashedPassword = await bcrypt.hash("Demo@123", 10);

  // 1. Upsert Users
  console.log("👥 Upserting Demo Users...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {
      name: "Rajesh Singhania (Owner)",
      passwordHash: hashedPassword,
      role: "ADMIN",
      active: true,
    },
    create: {
      name: "Rajesh Singhania (Owner)",
      email: "admin@demo.com",
      passwordHash: hashedPassword,
      role: "ADMIN",
      active: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: {
      name: "Vikram Mehta (Operations Manager)",
      passwordHash: hashedPassword,
      role: "MANAGER",
      active: true,
    },
    create: {
      name: "Vikram Mehta (Operations Manager)",
      email: "manager@demo.com",
      passwordHash: hashedPassword,
      role: "MANAGER",
      active: true,
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@demo.com" },
    update: {
      name: "Ramesh Kumar (Field Sales)",
      passwordHash: hashedPassword,
      role: "STAFF",
      active: true,
    },
    create: {
      name: "Ramesh Kumar (Field Sales)",
      email: "staff1@demo.com",
      passwordHash: hashedPassword,
      role: "STAFF",
      active: true,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@demo.com" },
    update: {
      name: "Suresh Patel (Field Sales)",
      passwordHash: hashedPassword,
      role: "STAFF",
      active: true,
    },
    create: {
      name: "Suresh Patel (Field Sales)",
      email: "staff2@demo.com",
      passwordHash: hashedPassword,
      role: "STAFF",
      active: true,
    },
  });

  // 2. Upsert Companies
  console.log("🏢 Upserting Companies...");
  const companiesData = [
    {
      name: "Amul (GCMMF)",
      commissionPercent: 22.0,
      contact: "amul.dist@amul.coop | +91 98250 11223",
    },
    {
      name: "Kwality Wall's (HUL)",
      commissionPercent: 25.0,
      contact: "sales@kwalitywalls.in | +91 98111 44556",
    },
    {
      name: "Vadilal Ice Creams",
      commissionPercent: 20.0,
      contact: "care@vadilalgroup.com | +91 98980 33445",
    },
    {
      name: "Mother Dairy",
      commissionPercent: 18.5,
      contact: "orders@motherdairy.com | +91 99100 55667",
    },
    {
      name: "Havmor Ice Cream",
      commissionPercent: 24.0,
      contact: "contact@havmor.com | +91 97277 88990",
    },
  ];

  const companyMap = new Map<string, any>();
  for (const c of companiesData) {
    const company = await prisma.company.upsert({
      where: { name: c.name },
      update: {
        commissionPercent: c.commissionPercent,
        contact: c.contact,
        active: true,
      },
      create: {
        name: c.name,
        commissionPercent: c.commissionPercent,
        contact: c.contact,
        active: true,
      },
    });
    companyMap.set(c.name, company);
  }

  const amul = companyMap.get("Amul (GCMMF)");
  const kwality = companyMap.get("Kwality Wall's (HUL)");
  const vadilal = companyMap.get("Vadilal Ice Creams");
  const motherDairy = companyMap.get("Mother Dairy");
  const havmor = companyMap.get("Havmor Ice Cream");

  // 3. Upsert Products
  console.log("🍦 Upserting Products...");
  const productsData = [
    // Amul
    { companyId: amul.id, name: "Vanilla Magic", flavor: "Vanilla", unit: "100ml Cup", mrp: 20, salePrice: 17, purchasePrice: 14.5, gstPercent: 5, lowStockThreshold: 20 },
    { companyId: amul.id, name: "Butterscotch Bliss", flavor: "Butterscotch", unit: "100ml Cup", mrp: 25, salePrice: 21, purchasePrice: 18, gstPercent: 5, lowStockThreshold: 20 },
    { companyId: amul.id, name: "Choco Almond Cone", flavor: "Chocolate Almond", unit: "120ml Cone", mrp: 40, salePrice: 34, purchasePrice: 29, gstPercent: 5, lowStockThreshold: 15 },
    { companyId: amul.id, name: "Kesar Pista Matka Kulfi", flavor: "Kesar Pista", unit: "150ml Matka", mrp: 60, salePrice: 51, purchasePrice: 43.5, gstPercent: 5, lowStockThreshold: 10 },
    { companyId: amul.id, name: "Royal Rajbhog Tub", flavor: "Rajbhog", unit: "750ml Tub", mrp: 180, salePrice: 153, purchasePrice: 130, gstPercent: 5, lowStockThreshold: 8 },
    { companyId: amul.id, name: "Cassata Cut Slice", flavor: "Cassata Multi-layer", unit: "120ml Slice", mrp: 45, salePrice: 38, purchasePrice: 32.5, gstPercent: 5, lowStockThreshold: 12 },
    { companyId: amul.id, name: "Shahi Anjir Party Pack", flavor: "Anjir Fig", unit: "1L Family Pack", mrp: 240, salePrice: 204, purchasePrice: 175, gstPercent: 5, lowStockThreshold: 6 },

    // Kwality Wall's
    { companyId: kwality.id, name: "Cornetto Double Chocolate", flavor: "Double Chocolate", unit: "105ml Cone", mrp: 45, salePrice: 38, purchasePrice: 31.5, gstPercent: 5, lowStockThreshold: 20 },
    { companyId: kwality.id, name: "Cornetto Butterscotch", flavor: "Butterscotch", unit: "105ml Cone", mrp: 40, salePrice: 34, purchasePrice: 28, gstPercent: 5, lowStockThreshold: 20 },
    { companyId: kwality.id, name: "Feast Chocolate Bar", flavor: "Chocolate Crunch", unit: "70ml Stick", mrp: 35, salePrice: 30, purchasePrice: 24.5, gstPercent: 5, lowStockThreshold: 25 },
    { companyId: kwality.id, name: "Magnum Classic Bar", flavor: "Belgian Chocolate", unit: "80ml Stick", mrp: 90, salePrice: 78, purchasePrice: 63, gstPercent: 5, lowStockThreshold: 10 },
    { companyId: kwality.id, name: "Magnum Almond Bar", flavor: "Almond Chocolate", unit: "80ml Stick", mrp: 100, salePrice: 86, purchasePrice: 70, gstPercent: 5, lowStockThreshold: 10 },
    { companyId: kwality.id, name: "Creamy Vanilla Tub", flavor: "Vanilla", unit: "700ml Tub", mrp: 140, salePrice: 120, purchasePrice: 98, gstPercent: 5, lowStockThreshold: 8 },
    { companyId: kwality.id, name: "Fruit & Nut Party Tub", flavor: "Fruit & Nut", unit: "700ml Tub", mrp: 190, salePrice: 162, purchasePrice: 133, gstPercent: 5, lowStockThreshold: 8 },

    // Vadilal
    { companyId: vadilal.id, name: "Gourmet Belgian Chocolate", flavor: "Belgian Chocolate", unit: "500ml Tub", mrp: 210, salePrice: 180, purchasePrice: 150, gstPercent: 5, lowStockThreshold: 8 },
    { companyId: vadilal.id, name: "Funtastic Kulfi Stick", flavor: "Malai Kulfi", unit: "60ml Stick", mrp: 20, salePrice: 17, purchasePrice: 14, gstPercent: 5, lowStockThreshold: 25 },
    { companyId: vadilal.id, name: "Pista Malai Kesar Stick", flavor: "Pista Malai", unit: "60ml Stick", mrp: 25, salePrice: 21.5, purchasePrice: 17.5, gstPercent: 5, lowStockThreshold: 25 },
    { companyId: vadilal.id, name: "Sundae Choco Crunch", flavor: "Choco Sundae", unit: "120ml Cup", mrp: 50, salePrice: 43, purchasePrice: 35, gstPercent: 5, lowStockThreshold: 12 },
    { companyId: vadilal.id, name: "Black Forest Cone", flavor: "Black Forest", unit: "110ml Cone", mrp: 45, salePrice: 38.5, purchasePrice: 31.5, gstPercent: 5, lowStockThreshold: 15 },
    { companyId: vadilal.id, name: "Alphonso Mango Tub", flavor: "Alphonso Mango", unit: "1L Family Pack", mrp: 220, salePrice: 188, purchasePrice: 154, gstPercent: 5, lowStockThreshold: 6 },
    { companyId: vadilal.id, name: "American Nuts Party Tub", flavor: "American Nuts", unit: "1L Family Pack", mrp: 260, salePrice: 222, purchasePrice: 182, gstPercent: 5, lowStockThreshold: 6 },

    // Mother Dairy
    { companyId: motherDairy.id, name: "Classic Vanilla Cup", flavor: "Vanilla", unit: "90ml Cup", mrp: 15, salePrice: 13, purchasePrice: 11, gstPercent: 5, lowStockThreshold: 30 },
    { companyId: motherDairy.id, name: "Strawberry Delight Cup", flavor: "Strawberry", unit: "90ml Cup", mrp: 15, salePrice: 13, purchasePrice: 11, gstPercent: 5, lowStockThreshold: 30 },
    { companyId: motherDairy.id, name: "Kulfi Rabdi Stick", flavor: "Rabdi Kulfi", unit: "70ml Stick", mrp: 30, salePrice: 25.5, purchasePrice: 21.5, gstPercent: 5, lowStockThreshold: 20 },
    { companyId: motherDairy.id, name: "Rocket Chocobar", flavor: "Milk Chocolate", unit: "65ml Stick", mrp: 20, salePrice: 17, purchasePrice: 14.5, gstPercent: 5, lowStockThreshold: 30 },
    { companyId: motherDairy.id, name: "Kesar Treat Tub", flavor: "Kesar Elaichi", unit: "750ml Tub", mrp: 160, salePrice: 136, purchasePrice: 115, gstPercent: 5, lowStockThreshold: 10 },
    { companyId: motherDairy.id, name: "Chocolate Fudge Family Pack", flavor: "Chocolate Fudge", unit: "1L Family Pack", mrp: 230, salePrice: 196, purchasePrice: 165, gstPercent: 5, lowStockThreshold: 6 },

    // Havmor
    { companyId: havmor.id, name: "Zulubar Choco Stick", flavor: "Crunchy Chocolate", unit: "70ml Stick", mrp: 25, salePrice: 21.5, purchasePrice: 17.5, gstPercent: 5, lowStockThreshold: 25 },
    { companyId: havmor.id, name: "Cookie & Cream Tub", flavor: "Cookies & Cream", unit: "1L Family Pack", mrp: 250, salePrice: 215, purchasePrice: 175, gstPercent: 5, lowStockThreshold: 6 },
    { companyId: havmor.id, name: "Nutty Belgian Cone", flavor: "Belgian Nutty", unit: "120ml Cone", mrp: 50, salePrice: 42.5, purchasePrice: 35, gstPercent: 5, lowStockThreshold: 15 },
    { companyId: havmor.id, name: "Matka Malai Kulfi Pot", flavor: "Malai Rabdi", unit: "150ml Clay Pot", mrp: 55, salePrice: 47, purchasePrice: 38.5, gstPercent: 5, lowStockThreshold: 10 },
    { companyId: havmor.id, name: "Taj Mahal Gold Tub", flavor: "Almond Saffron", unit: "500ml Tub", mrp: 195, salePrice: 166, purchasePrice: 136, gstPercent: 5, lowStockThreshold: 8 },
    { companyId: havmor.id, name: "Mocha Brownie Tub", flavor: "Mocha Coffee Brownie", unit: "750ml Tub", mrp: 220, salePrice: 187, purchasePrice: 154, gstPercent: 5, lowStockThreshold: 8 },
  ];

  const products = [];
  for (const p of productsData) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name, companyId: p.companyId },
    });
    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: p,
      });
      products.push(updated);
    } else {
      const created = await prisma.product.create({ data: p });
      products.push(created);
    }
  }

  // 4. Upsert Customers
  console.log("🏪 Upserting Retailers / Customers...");
  const retailersData = [
    { shopName: "Sharma General Store", ownerName: "Rakesh Sharma", phone: "9810123456", address: "Main Market, Block A", area: "Laxmi Nagar, Delhi", gstin: "07AAAAA0000A1Z5", openingBalance: 4500 },
    { shopName: "Gupta Bakery & Daily Needs", ownerName: "Anil Gupta", phone: "9811234567", address: "Shop 14, Ajmal Khan Road", area: "Karol Bagh, Delhi", gstin: "07BBBBB1111B2Z6", openingBalance: 8200 },
    { shopName: "Krishna Dairy & Ice Cream Parlour", ownerName: "Murli Manohar", phone: "9871345678", address: "D-12, Sector 9", area: "Rohini, Delhi", gstin: "07CCCCC2222C3Z7", openingBalance: 1200 },
    { shopName: "Sai Supermarket", ownerName: "Vijay Verma", phone: "9899456789", address: "Plot 45, Rani Bagh", area: "Pitampura, Delhi", gstin: "07DDDDD3333D4Z8", openingBalance: 15600 },
    { shopName: "Agarwal Sweet Corner", ownerName: "Manoj Agarwal", phone: "9818567890", address: "Fatehpuri Chowk", area: "Chandni Chowk, Delhi", gstin: "07EEEEE4444E5Z9", openingBalance: 0 },
    { shopName: "Royal Cafe & Parlour", ownerName: "Kunal Mehra", phone: "9910678901", address: "Outer Circle, Block E", area: "Connaught Place, Delhi", gstin: "07FFFFF5555F6Z1", openingBalance: 6500 },
    { shopName: "Ganesh Provision Store", ownerName: "Ganesh Joshi", phone: "9873789012", address: "C-4B Market", area: "Janakpuri, Delhi", gstin: "", openingBalance: 2400 },
    { shopName: "Anand Bakery & Confectionery", ownerName: "Harish Anand", phone: "9812890123", address: "Main Ring Road Market", area: "South Ext-2, Delhi", gstin: "07GGGGG6666G7Z2", openingBalance: 0 },
    { shopName: "Mahadev Cold Drinks & Parlour", ownerName: "Santosh Yadav", phone: "9891901234", address: "Atta Market, Sector 18", area: "Noida, UP", gstin: "09HHHHH7777H8Z3", openingBalance: 9800 },
    { shopName: "City Mart Supermarket", ownerName: "Sanjay Singhal", phone: "9872012345", address: "Galleria Market", area: "Gurugram Sec-29, HR", gstin: "06IIIII8888I9Z4", openingBalance: 21000 },
    { shopName: "Balaji Kirana Store", ownerName: "Sunil Tiwari", phone: "9813123450", address: "Sector 10 Market", area: "Dwarka, Delhi", gstin: "", openingBalance: 3200 },
    { shopName: "Modern Departmental Store", ownerName: "Praveen Kapoor", phone: "9814234501", address: "J-Block Market", area: "Saket, Delhi", gstin: "07JJJJJ9999J1Z5", openingBalance: 11400 },
    { shopName: "Laxmi Sweets & Ice Creams", ownerName: "Dinesh Bansal", phone: "9875345012", address: "Central Market", area: "Lajpat Nagar, Delhi", gstin: "07KKKKK0000K2Z6", openingBalance: 0 },
    { shopName: "Apex Daily Needs", ownerName: "Nitin Mittal", phone: "9896450123", address: "Kala Patthar Road", area: "Indirapuram, Ghaziabad", gstin: "09LLLLL1111L3Z7", openingBalance: 5700 },
    { shopName: "Quality Ice Cream Hub", ownerName: "Jaspreet Singh", phone: "9817560124", address: "Main Market", area: "Rajouri Garden, Delhi", gstin: "07MMMMM2222M4Z8", openingBalance: 1800 },
  ];

  const customers = [];
  for (const r of retailersData) {
    const existing = await prisma.customer.findFirst({
      where: { phone: r.phone },
    });
    if (existing) {
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: r,
      });
      customers.push(updated);
    } else {
      const created = await prisma.customer.create({ data: r });
      customers.push(created);
    }
  }

  // 5. Purchases & Initial Stock via StockLedger (Idempotent by invoiceNo)
  console.log("📦 Creating Purchases & Stock Ledger entries...");
  const purchaseBatches = [
    { company: amul, invoiceNo: "PUR-AMUL-2026-081", daysAgo: 10 },
    { company: kwality, invoiceNo: "PUR-KW-2026-104", daysAgo: 8 },
    { company: vadilal, invoiceNo: "PUR-VAD-2026-055", daysAgo: 6 },
    { company: motherDairy, invoiceNo: "PUR-MD-2026-092", daysAgo: 4 },
    { company: havmor, invoiceNo: "PUR-HAV-2026-041", daysAgo: 2 },
  ];

  for (const batch of purchaseBatches) {
    const existingPurchase = await prisma.purchase.findFirst({
      where: { invoiceNo: batch.invoiceNo },
    });

    if (!existingPurchase) {
      const compProducts = products.filter((p) => p.companyId === batch.company.id);
      let subtotal = 0;
      const itemsData = [];

      for (const prod of compProducts) {
        const qty = 80;
        const amount = qty * prod.purchasePrice;
        subtotal += amount;
        itemsData.push({
          productId: prod.id,
          qty,
          rate: prod.purchasePrice,
          amount,
        });
      }

      const commissionPercent = batch.company.commissionPercent;
      const commissionAmount = Math.round((subtotal * commissionPercent) / 100);
      const netAmount = subtotal - commissionAmount;

      const purchaseDate = new Date();
      purchaseDate.setDate(purchaseDate.getDate() - batch.daysAgo);

      const purchase = await prisma.purchase.create({
        data: {
          companyId: batch.company.id,
          invoiceNo: batch.invoiceNo,
          date: purchaseDate,
          subtotal,
          commissionPercent,
          commissionAmount,
          netAmount,
          createdById: admin.id,
          items: {
            create: itemsData,
          },
        },
      });

      for (const item of itemsData) {
        await prisma.stockLedger.create({
          data: {
            productId: item.productId,
            type: "PURCHASE",
            qty: item.qty,
            refType: "PURCHASE",
            refId: purchase.id,
            notes: `Purchase from ${batch.company.name} (Inv #${batch.invoiceNo})`,
            date: purchaseDate,
            userId: admin.id,
          },
        });
      }
    }
  }

  // 6. Demo Orders
  console.log("📝 Creating Sample Orders...");
  const orderStatuses = [
    "PENDING",
    "PENDING",
    "CONFIRMED",
    "CONFIRMED",
    "BILLED",
    "BILLED",
    "DELIVERED",
    "DELIVERED",
    "CANCELLED",
    "PENDING",
  ];

  const staffUsers = [staff1, staff2, manager, admin];

  for (let i = 0; i < 10; i++) {
    const orderNo = `ORD-2026-000${i + 1}`;
    const existingOrder = await prisma.order.findUnique({
      where: { orderNo },
    });

    if (!existingOrder) {
      const customer = customers[i % customers.length];
      const user = staffUsers[i % staffUsers.length];
      const status = orderStatuses[i];

      const delDate = new Date();
      if (i % 3 === 0) {
        delDate.setDate(delDate.getDate());
      } else if (i % 3 === 1) {
        delDate.setDate(delDate.getDate() + 1);
      } else {
        delDate.setDate(delDate.getDate() - (i % 4));
      }

      const selectedProds = products.slice((i * 3) % products.length, ((i * 3) % products.length) + 3);
      const orderItems = selectedProds.map((p) => ({
        productId: p.id,
        qty: 6 + (i % 5) * 4,
        rate: p.salePrice,
      }));

      await prisma.order.create({
        data: {
          orderNo,
          customerId: customer.id,
          createdById: user.id,
          deliveryDate: delDate,
          status,
          notes: i % 2 === 0 ? "Deliver in deep freezer packs before 2 PM" : "Urgent for evening festival rush",
          items: {
            create: orderItems,
          },
        },
      });
    }
  }

  // 7. Demo Bills & Payments
  console.log("🧾 Creating Demo Bills & Payments...");
  const billCustomers = [
    customers[0],
    customers[1],
    customers[2],
    customers[3],
    customers[5],
    customers[8],
    customers[9],
    customers[11],
  ];

  for (let i = 0; i < billCustomers.length; i++) {
    const billNo = `INV-2026-000${i + 1}`;
    const existingBill = await prisma.bill.findUnique({
      where: { billNo },
    });

    if (!existingBill) {
      const cust = billCustomers[i];
      const billDate = new Date();
      billDate.setDate(billDate.getDate() - (7 - i));

      const bProducts = [
        products[i % 5],
        products[7 + (i % 5)],
        products[14 + (i % 5)],
      ];

      let subtotal = 0;
      const billItemsData = [];

      for (const prod of bProducts) {
        const qty = 5 + (i % 4) * 3;
        const amount = qty * prod.salePrice;
        subtotal += amount;
        billItemsData.push({
          productId: prod.id,
          qty,
          rate: prod.salePrice,
          amount,
        });
      }

      const discount = i % 2 === 0 ? 50 : 0;
      const gst = Math.round(((subtotal - discount) * 0.05) * 100) / 100;
      const exactTotal = subtotal - discount + gst;
      const grandTotal = Math.round(exactTotal);
      const roundOff = Math.round((grandTotal - exactTotal) * 100) / 100;

      const paymentModes = ["CASH", "UPI", "CREDIT", "UPI", "CASH", "CREDIT", "UPI", "CASH"];
      const mode = paymentModes[i];
      const paidAmount = mode === "CREDIT" ? 0 : mode === "UPI" ? grandTotal : (i % 3 === 0 ? grandTotal - 200 : grandTotal);

      const bill = await prisma.bill.create({
        data: {
          billNo,
          customerId: cust.id,
          date: billDate,
          subtotal,
          discount,
          gst,
          roundOff,
          total: grandTotal,
          paidAmount,
          paymentMode: mode,
          createdById: manager.id,
          items: {
            create: billItemsData,
          },
        },
      });

      for (const bItem of billItemsData) {
        await prisma.stockLedger.create({
          data: {
            productId: bItem.productId,
            type: "SALE",
            qty: -bItem.qty,
            refType: "BILL",
            refId: bill.id,
            notes: `Billed to ${cust.shopName} (Bill #${bill.billNo})`,
            date: billDate,
            userId: manager.id,
          },
        });
      }

      if (paidAmount > 0) {
        await prisma.payment.create({
          data: {
            customerId: cust.id,
            billId: bill.id,
            amount: paidAmount,
            mode,
            notes: `Payment for Bill #${bill.billNo}`,
            date: billDate,
          },
        });
      }
    }
  }

  console.log("✅ Seed finished successfully and is idempotent!");
  console.log("-----------------------------------------");
  console.log("Demo Credentials:");
  console.log("  Admin:   admin@demo.com   / Demo@123");
  console.log("  Manager: manager@demo.com / Demo@123");
  console.log("  Staff 1: staff1@demo.com  / Demo@123");
  console.log("  Staff 2: staff2@demo.com  / Demo@123");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
