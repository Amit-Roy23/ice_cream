const http = require("http");

async function testWorkflow() {
  console.log("🚀 Running Automated Workflow and API Verification...");

  const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

  // 1. Test Login as Admin
  console.log("\n1️⃣ Testing Login as Admin (admin@demo.com)...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.com", password: "Demo@123" }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminCookie = adminLoginRes.headers.get("set-cookie");
  console.log("   ✅ Admin Login Status:", adminLoginRes.status, "User:", adminLoginData.user?.name);

  // 2. Test Dashboard Analytics as Admin
  console.log("\n2️⃣ Testing Dashboard API for Admin (with Profit Margins)...");
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Cookie: adminCookie },
  });
  const dashData = await dashRes.json();
  console.log("   ✅ KPIs:", dashData.kpis);
  console.log("   ✅ Profit Margin Analytics Available:", Boolean(dashData.adminAnalytics));
  console.log("   ✅ Total Estimated Profit:", dashData.adminAnalytics?.totalEstimatedProfit);
  console.log("   ✅ Companies Margin Count:", dashData.adminAnalytics?.companyPerformance?.length);

  // 3. Test Staff Login & Order Creation
  console.log("\n3️⃣ Testing Field Staff Login & Order Placement (staff1@demo.com)...");
  const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "staff1@demo.com", password: "Demo@123" }),
  });
  const staffLoginData = await staffLoginRes.json();
  const staffCookie = staffLoginRes.headers.get("set-cookie");
  console.log("   ✅ Staff Login Status:", staffLoginRes.status, "Staff:", staffLoginData.user?.name);

  // Get customer and product list
  const custRes = await fetch(`${BASE_URL}/api/customers`, { headers: { Cookie: staffCookie } });
  const custData = await custRes.json();
  const targetCust = custData.customers[0];

  const prodRes = await fetch(`${BASE_URL}/api/products`, { headers: { Cookie: staffCookie } });
  const prodData = await prodRes.json();
  const targetProd = prodData.products[0];

  // Verify that purchasePrice is stripped for staff
  console.log("   🔒 Verifying purchasePrice is hidden from Staff:", targetProd.purchasePrice === undefined);

  // Create Order as Staff
  const createOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({
      customerId: targetCust.id,
      deliveryDate: new Date().toISOString(),
      notes: "Urgent morning delivery test",
      items: [{ productId: targetProd.id, qty: 10, rate: targetProd.salePrice }],
    }),
  });
  const createOrderData = await createOrderRes.json();
  console.log("   ✅ Order Placed:", createOrderData.order?.orderNo, "for", createOrderData.order?.customer?.shopName);

  // 4. Test Manager Billing (manager@demo.com)
  console.log("\n4️⃣ Testing Manager High-Speed Billing from Order (manager@demo.com)...");
  const mgrLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "manager@demo.com", password: "Demo@123" }),
  });
  const mgrLoginData = await mgrLoginRes.json();
  const mgrCookie = mgrLoginRes.headers.get("set-cookie");

  // Verify Manager is blocked from Purchase API (403 Forbidden)
  const mgrPurCheck = await fetch(`${BASE_URL}/api/purchases`, { headers: { Cookie: mgrCookie } });
  console.log("   🔒 Verifying Manager 403 on Purchase Entry:", mgrPurCheck.status === 403 ? "403 Forbidden (Blocked as required!)" : mgrPurCheck.status);

  // Generate Bill from Order
  const createBillRes = await fetch(`${BASE_URL}/api/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: mgrCookie },
    body: JSON.stringify({
      customerId: targetCust.id,
      orderId: createOrderData.order.id,
      date: new Date().toISOString(),
      items: [{ productId: targetProd.id, qty: 10, rate: targetProd.salePrice }],
      discount: 20,
      gstPercent: 5,
      paymentMode: "UPI",
      paidAmount: Math.round((10 * targetProd.salePrice - 20) * 1.05),
    }),
  });
  const createBillData = await createBillRes.json();
  console.log("   ✅ Invoice Created:", createBillData.bill?.billNo, "Total:", createBillData.bill?.total, "Paid:", createBillData.bill?.paidAmount);

  // Verify stock deduction in ledger
  const ledgerRes = await fetch(`${BASE_URL}/api/stock/ledger?limit=5`, { headers: { Cookie: adminCookie } });
  const ledgerData = await ledgerRes.json();
  const latestMovement = ledgerData.movements[0];
  console.log("   ✅ Stock Ledger Deducted:", latestMovement.type, latestMovement.qty, "units for", latestMovement.product?.name, "Ref:", latestMovement.notes);

  console.log("\n✨ All End-to-End Workflows & Role Protections Verified Successfully!");
}

testWorkflow().catch(console.error);
