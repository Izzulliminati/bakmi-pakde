import express from "express";
import midtransClient from "midtrans-client";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 4000;


// ==========================================================
// KONFIGURASI MIDTRANS
// ==========================================================
const MIDTRANS_CONFIG = {
  isProduction: false, // ✅ SET TRUE karena credential Anda adalah PRODUCTION
  serverKey: process.env.MIDTRANS_SERVER_KEY || "Mid-server-XXXX",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "Mid-client-XXXX",
};

// Validasi konfigurasi
if (
  !MIDTRANS_CONFIG.serverKey || 
  !MIDTRANS_CONFIG.clientKey ||
  MIDTRANS_CONFIG.serverKey.includes("XXXX") ||
  MIDTRANS_CONFIG.clientKey.includes("XXXX")
) {
  console.error("\n❌ ============================================");
  console.error("   ERROR: Midtrans credentials belum diisi!");
  console.error("   ============================================");
  console.error("   1. Buka https://dashboard.midtrans.com");
  console.error("   2. Login dan pilih SANDBOX environment");
  console.error("   3. Copy Server Key & Client Key");
  console.error("   4. Paste ke file .env");
  console.error("   ============================================\n");
}

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: MIDTRANS_CONFIG.isProduction,
  serverKey: MIDTRANS_CONFIG.serverKey,
  clientKey: MIDTRANS_CONFIG.clientKey,
});

console.log("\n🔧 Konfigurasi Midtrans:");
console.log(
  "   Server Key:",
  MIDTRANS_CONFIG.serverKey.substring(0, 20) + "..."
);
console.log(
  "   Client Key:",
  MIDTRANS_CONFIG.clientKey.substring(0, 20) + "..."
);
console.log(
  "   Mode:",
  MIDTRANS_CONFIG.isProduction ? "🚀 PRODUCTION" : "🧪 SANDBOX"
);

// ==========================================================
// MIDDLEWARE
// ==========================================================
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://127.0.0.1:5500",
      "https://bakmi-pakde.vercel.app"  // ← Frontend kamu
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path}`);
  console.log("   Time:", new Date().toLocaleString("id-ID"));
  if (Object.keys(req.body).length > 0) {
    console.log("   Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// ==========================================================
// ENDPOINT TEST
// ==========================================================
app.get("/", (req, res) => {
  res.json({
    message: "🍜 Bakmi Jogja - Midtrans Backend API",
    status: "running",
    timestamp: new Date().toISOString(),
    mode: MIDTRANS_CONFIG.isProduction ? "production" : "sandbox",
    endpoints: {
      test: "GET /test",
      createTransaction: "POST /create-transaction",
      notification: "POST /midtrans-notification",
    },
  });
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "✅ Backend Midtrans berjalan dengan baik!",
    timestamp: new Date().toISOString(),
    port: PORT,
    mode: MIDTRANS_CONFIG.isProduction ? "production" : "sandbox",
    configured: !MIDTRANS_CONFIG.serverKey.includes("XXXX"),
  });
});

// ✅ ENDPOINT BARU: Test Midtrans Connection
app.get("/test-midtrans", async (req, res) => {
  try {
    // Test dengan transaksi dummy
    const testOrderId = `TEST-${Date.now()}`;
    const parameter = {
      transaction_details: {
        order_id: testOrderId,
        gross_amount: 10000,
      },
      customer_details: {
        first_name: "Test Customer",
        email: "test@example.com",
        phone: "081234567890",
      },
      item_details: [
        {
          id: "test-item",
          price: 10000,
          quantity: 1,
          name: "Test Item",
        },
      ],
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({
      success: true,
      message: "✅ Koneksi ke Midtrans berhasil!",
      test_order_id: testOrderId,
      token_received: !!transaction.token,
      mode: MIDTRANS_CONFIG.isProduction ? "production" : "sandbox",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Gagal koneksi ke Midtrans",
      error: error.message,
      details: error.ApiResponse || null,
    });
  }
});

// ==========================================================
// ENDPOINT UNTUK MEMBUAT TRANSAKSI MIDTRANS
// ==========================================================
app.post("/create-transaction", async (req, res) => {
  try {
    const { orderId, amount, customerName, orderItems, paymentMethod } =
      req.body;

    // ✅ Buat Order ID yang unik dengan timestamp
    const uniqueOrderId = `${orderId}-${Date.now()}`;

    console.log("\n💰 Membuat transaksi baru:");
    console.log("   Order ID:", uniqueOrderId);
    console.log("   Amount:", amount);
    console.log("   Customer:", customerName);
    console.log("   Items:", orderItems?.length || 0);

    // Validasi input
    if (!orderId || !amount || !customerName || !orderItems) {
      console.error("❌ Data tidak lengkap");
      return res.status(400).json({
        success: false,
        message:
          "Data tidak lengkap. Pastikan orderId, amount, customerName, dan orderItems terisi.",
      });
    }

    // Validasi amount
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount harus berupa angka positif",
      });
    }

    // Cek apakah credentials sudah diisi
    if (MIDTRANS_CONFIG.serverKey.includes("XXXX")) {
      return res.status(500).json({
        success: false,
        message:
          "Midtrans credentials belum dikonfigurasi. Cek console server untuk instruksi.",
      });
    }

    // Siapkan Payload untuk Midtrans Snap
    const parameter = {
      transaction_details: {
        order_id: uniqueOrderId, // ✅ Gunakan uniqueOrderId
        gross_amount: amount,
      },
      customer_details: {
        first_name: customerName,
        email: "customer@bakmijogja.com",
        phone: "081234567890",
      },
      item_details: orderItems.map((item) => ({
        id: item.name.replace(/\s+/g, "-").toLowerCase(),
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
      enabled_payments: paymentMethod ? [paymentMethod] : undefined,
      callbacks: {
        finish: process.env.FRONTEND_URL || "http://localhost:8080",
      },
    };

    console.log("📤 Mengirim request ke Midtrans Snap API...");

    // Buat transaksi dengan Midtrans Snap
    const transaction = await snap.createTransaction(parameter);

    console.log("✅ Transaksi berhasil dibuat!");
    console.log("   Token:", transaction.token);
    console.log("   Redirect URL:", transaction.redirect_url);

    res.json({
      success: true,
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        order_id: uniqueOrderId, // ✅ Kirim order_id ke frontend
      },
    });
  } catch (error) {
    console.error("\n❌ Midtrans Integration Error:");
    console.error("   Message:", error.message);

    if (error.httpStatusCode) {
      console.error("   Status Code:", error.httpStatusCode);
      console.error(
        "   API Response:",
        JSON.stringify(error.ApiResponse, null, 2)
      );

      res.status(error.httpStatusCode).json({
        success: false,
        message:
          error.ApiResponse?.status_message || "Gagal menghubungi Midtrans API",
        details: error.ApiResponse,
      });
    } else {
      console.error("   Stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server backend: " + error.message,
      });
    }
  }
});

// ==========================================================
// ENDPOINT NOTIFICATION DARI MIDTRANS (Webhook)
// ==========================================================
app.post("/midtrans-notification", async (req, res) => {
  try {
    const notification = req.body;

    console.log("\n🔔 Notification diterima dari Midtrans");
    console.log("   Order ID:", notification.order_id);
    console.log("   Transaction Status:", notification.transaction_status);
    console.log("   Fraud Status:", notification.fraud_status);

    // Verifikasi notification dengan Midtrans
    const statusResponse = await snap.transaction.notification(notification);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log("✅ Notification verified");
    console.log(`   Transaction ${orderId} status: ${transactionStatus}`);

    // Tentukan status pembayaran
    let paymentStatus = "pending";

    if (transactionStatus == "capture") {
      if (fraudStatus == "accept") {
        paymentStatus = "paid";
        console.log("✅ Pembayaran BERHASIL (Capture)");
      }
    } else if (transactionStatus == "settlement") {
      paymentStatus = "paid";
      console.log("✅ Pembayaran BERHASIL (Settlement)");
    } else if (
      transactionStatus == "cancel" ||
      transactionStatus == "deny" ||
      transactionStatus == "expire"
    ) {
      paymentStatus = "failed";
      console.log("❌ Pembayaran GAGAL atau DIBATALKAN");
    } else if (transactionStatus == "pending") {
      paymentStatus = "pending";
      console.log("⏳ Pembayaran masih PENDING");
    }

    // TODO: Update Firestore dengan status pembayaran
    console.log("💾 Status untuk update Firestore:");
    console.log("   Order ID:", orderId);
    console.log("   Payment Status:", paymentStatus);

    res.json({ success: true, message: "Notification processed successfully" });
  } catch (error) {
    console.error("❌ Error processing notification:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// ERROR HANDLER
// ==========================================================
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// ==========================================================
// START SERVER
// ==========================================================
app.listen(PORT, () => {
  console.log("\n🚀 ============================================");
  console.log("   Midtrans Backend Server STARTED");
  console.log("   ============================================");
  console.log(`   🌐 URL: http://localhost:${PORT}`);
  console.log(`   📍 Test: GET http://localhost:${PORT}/test`);
  console.log(`   📍 Create Transaction: POST /create-transaction`);
  console.log(`   📍 Webhook: POST /midtrans-notification`);
  console.log(
    `   🔧 Mode: ${
      MIDTRANS_CONFIG.isProduction ? "🚀 PRODUCTION" : "🧪 SANDBOX"
    }`
  );
  console.log("   ============================================");

  if (MIDTRANS_CONFIG.serverKey.includes("XXXX")) {
    console.log("\n   ⚠️  WARNING: Midtrans credentials belum diisi!");
    console.log("   Silakan update file .env\n");
  } else {
    console.log("\n   ✅ Server siap menerima request!\n");
  }
});