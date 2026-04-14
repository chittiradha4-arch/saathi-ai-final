import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from '@anthropic-ai/sdk';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

dotenv.config();

// Load config for fallback
let config: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json", e);
}

// Initialize Firebase Admin
let db: any;
try {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || config.projectId;
  const databaseId = config.firestoreDatabaseId || "(default)";
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!admin.apps.length) {
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized with service account.");
    } else if (projectId) {
      admin.initializeApp({
        projectId: projectId
      });
      console.log("Firebase Admin initialized. Project:", projectId);
    } else {
      console.warn("No Firebase Project ID found.");
    }
  }
  
  if (admin.apps.length) {
    // Try to initialize firestore. If it fails, fallback to default.
    try {
      if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
        db = getFirestore(config.firestoreDatabaseId);
        console.log("Firestore initialized. Database:", config.firestoreDatabaseId);
      } else {
        db = getFirestore();
        console.log("Firestore initialized. Database: (default)");
      }
    } catch (fErr) {
      console.error("Failed to init named Firestore, falling back to default:", fErr);
      db = getFirestore();
    }
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. AI chat will not work.");
  }

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      firebase: !!db, 
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || config.projectId,
      databaseId: config.firestoreDatabaseId || "(default)"
    });
  });

  // 1. Gemini Proxy
  let genAIInstance: GoogleGenerativeAI | null = null;
  const getGenAI = () => {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!genAIInstance) {
      genAIInstance = new GoogleGenerativeAI(key);
    }
    return genAIInstance;
  };
  
  let anthropicInstance: Anthropic | null = null;
  const getAnthropic = () => {
    const key = (process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicInstance) {
      anthropicInstance = new Anthropic({ apiKey: key });
    }
    return anthropicInstance;
  };
  
  app.post('/api/chat', async (req, res) => {
    try {
      const { contents, systemInstruction } = req.body;
      const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
      
      let lastError: any = null;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      if (geminiKey && geminiKey.length >= 30) {
        const genAI = getGenAI();
        const modelsToTry = [
          "gemini-flash-latest",
          "gemini-3.1-pro-preview"
        ];
        
        for (const modelName of modelsToTry) {
          try {
            console.log(`[Server Chat] Attempting Gemini: ${modelName}`);
            const aiModel = genAI.getGenerativeModel({ 
              model: modelName,
              systemInstruction: systemInstruction
            });
            
            const generationConfig = {
              maxOutputTokens: 1024,
              temperature: 0.4,
              topP: 0.8,
              topK: 40,
            };

            // Add a 90s timeout per model attempt in backend
            const modelTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout for ${modelName}`)), 90000)
            );

            const resultPromise = aiModel.generateContent({ 
              contents,
              generationConfig
            });

            const result: any = await Promise.race([resultPromise, modelTimeout]);
            const response = await result.response;
            const text = response.text();
            
            if (text) {
              console.log(`[Server Chat] Success with Gemini: ${modelName}`);
              return res.json({ text, modelUsed: modelName });
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`[Server Chat] Gemini ${modelName} failed:`, err.message);
            if (err.message?.includes("API key not valid") || err.message?.includes("400")) break;
            if (err.message?.includes("404")) continue;
          }
        }
      }

      // Fallback to Claude
      if (process.env.ANTHROPIC_API_KEY) {
        const claudeModels = [
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-haiku-20240307"
        ];

        for (const modelName of claudeModels) {
          try {
            console.log(`[Server Chat] Attempting Claude fallback: ${modelName}`);
            const anthropic = getAnthropic();
            const messages = contents.map((c: any) => ({
              role: c.role === 'model' ? 'assistant' : 'user',
              content: c.parts[0].text
            }));

            const response = await anthropic.messages.create({
              model: modelName,
              max_tokens: 4096,
              system: systemInstruction,
              messages: messages,
            });

            const text = response.content[0].type === 'text' ? response.content[0].text : "";
            if (text) {
              console.log(`[Server Chat] Success with Claude: ${modelName}`);
              return res.json({ text, modelUsed: `claude:${modelName}` });
            }
          } catch (err: any) {
            console.warn(`[Server Chat] Claude ${modelName} failed:`, err.message);
            lastError = err;
          }
        }
      }

      const errorHint = lastError?.message ? ` (Error: ${lastError.message.substring(0, 100)}...)` : "";
      res.status(503).setHeader('Content-Type', 'application/json').send(JSON.stringify({ error: `All AI models failed.${errorHint}` }));
    } catch (error: any) {
      console.error("Global Server Chat Error:", error);
      res.status(500).setHeader('Content-Type', 'application/json').send(JSON.stringify({ error: error.message || "Failed to get AI response" }));
    }
  });

  // 2. Razorpay Integration
  const rzpKeyId = process.env.VITE_RAZORPAY_KEY_ID || "";
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

  if (!rzpKeyId || !rzpKeySecret) {
    console.warn("Razorpay keys are missing. Payment system will not work.");
  }

  const RazorpayConstructor = (Razorpay as any).default || Razorpay;
  const razorpay = new RazorpayConstructor({
    key_id: rzpKeyId,
    key_secret: rzpKeySecret,
  });

  app.post('/api/create-order', async (req, res) => {
    try {
      const { amount, currency, userId, tier } = req.body;
      
      if (!rzpKeyId || !rzpKeySecret) {
        return res.status(500).json({ error: "Razorpay API keys are not configured on the server." });
      }

      if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ error: "Invalid amount provided." });
      }

      const options = {
        amount: Math.round(Number(amount) * 100), // in paise, ensure integer
        currency: currency || "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: userId || "anonymous",
          tier: tier || "monthly"
        }
      };
      
      console.log("Creating Razorpay order with options:", options);
      const order = await razorpay.orders.create(options);
      console.log("Razorpay order created:", order.id);

      // PERSIST ORDER TO CLOUD
      if (db) {
        try {
          await db.collection('payments').doc(order.id).set({
            orderId: order.id,
            userId: userId || "anonymous",
            amount: Number(amount),
            currency: currency || "INR",
            status: 'created',
            tier: tier || "monthly",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notesForCustomer: "Order created; awaiting payment.",
            timeline: [
              { status: 'created', timestamp: new Date().toISOString(), message: "Order created in system." }
            ]
          });
        } catch (dbErr) {
          console.error("Failed to persist order to Firestore:", dbErr);
        }
      }

      res.json(order);
    } catch (error: any) {
      console.error("Razorpay Order Error:", error);
      const message = error.message || error.description || (typeof error === 'string' ? error : "Failed to create Razorpay order");
      res.status(500).json({ error: message });
    }
  });

  // RAZORPAY WEBHOOK
  app.post('/api/razorpay-webhook', async (req: any, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const signature = req.headers['x-razorpay-signature'];

    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error("Webhook signature mismatch!");
        return res.status(400).send('Invalid signature');
      }
    }

    const event = req.body;
    console.log("Razorpay Webhook Event:", event.event);

    try {
      if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const userId = payment.notes.userId;
        const tier = payment.notes.tier;

        console.log(`Webhook: Payment captured for user ${userId}, payment ${paymentId}`);

        if (db && userId && userId !== 'anonymous') {
          // Update Payment Record
          await db.collection('payments').doc(orderId).set({
            paymentId: paymentId,
            status: 'captured',
            gatewayStatus: payment.status,
            method: payment.method,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notesForCustomer: "Payment captured successfully.",
            timeline: admin.firestore.FieldValue.arrayUnion({
              status: 'captured',
              timestamp: new Date().toISOString(),
              message: "Payment captured via Razorpay Webhook."
            })
          }, { merge: true });

          // Update User Subscription
          const now = new Date();
          let expiryDate = new Date();
          if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
          else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
          else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
          else expiryDate.setDate(now.getDate() + 30);

          await db.collection('users').doc(userId).set({
            isSubscribed: true,
            subscriptionTier: tier,
            freeMessagesUsed: 0,
            lastPaymentId: paymentId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
          }, { merge: true });
          
          console.log(`Webhook: User ${userId} subscription activated.`);
        }
      }
      res.json({ status: 'ok' });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).send('Webhook Error');
    }
  });

  app.post('/api/admin/reconcile', async (req, res) => {
    try {
      // Basic admin check (could be more robust)
      const { adminEmail } = req.body;
      if (adminEmail !== "chitti.radha4@gmail.com") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      console.log("Starting payment reconciliation...");
      
      // Fetch recent payments from Razorpay (last 24 hours)
      const from = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const rzpPayments = await razorpay.payments.all({ from });
      
      let fixedCount = 0;
      for (const payment of rzpPayments.items) {
        if (payment.status === 'captured' && payment.order_id) {
          const orderId = payment.order_id;
          const userId = payment.notes.userId;
          const tier = payment.notes.tier;

          if (db && userId && userId !== 'anonymous') {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();

            // If user is not subscribed but payment is captured, fix it
            if (!userData?.isSubscribed) {
              console.log(`Reconciliation: Fixing subscription for user ${userId}`);
              
              const now = new Date();
              let expiryDate = new Date();
              if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
              else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
              else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
              else expiryDate.setDate(now.getDate() + 30);

              await db.collection('users').doc(userId).set({
                isSubscribed: true,
                subscriptionTier: tier,
                freeMessagesUsed: 0,
                lastPaymentId: payment.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
              }, { merge: true });

              await db.collection('payments').doc(orderId).set({
                paymentId: payment.id,
                status: 'captured',
                reconciliation: {
                  lastCheckedAt: new Date().toISOString(),
                  lastGatewayStatus: payment.status,
                  autoFixed: true
                },
                timeline: admin.firestore.FieldValue.arrayUnion({
                  status: 'reconciled',
                  timestamp: new Date().toISOString(),
                  message: "Subscription fixed via auto-reconciliation."
                })
              }, { merge: true });

              fixedCount++;
            }
          }
        }
      }

      res.json({ status: 'ok', processed: rzpPayments.items.length, fixed: fixedCount });
    } catch (error: any) {
      console.error("Reconciliation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/verify-manual-payment', async (req, res) => {
    try {
      const { paymentId, userId, planName } = req.body;
      if (!paymentId || !userId || !planName) {
        return res.status(400).json({ error: "Missing paymentId, userId, or planName" });
      }

      console.log(`Manual verification requested for Payment ID: ${paymentId}, User: ${userId}`);

      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);
      
      if (payment.status === 'captured') {
        // Payment is valid and captured
        const now = new Date();
        let expiryDate = new Date();
        const tier = planName.toLowerCase();
        
        if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
        else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
        else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
        else expiryDate.setDate(now.getDate() + 30);

        if (db) {
          // Update Payment Record
          await db.collection('payments').doc(payment.order_id || `manual_${paymentId}`).set({
            paymentId: paymentId,
            orderId: payment.order_id,
            userId: userId,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: 'captured',
            gatewayStatus: payment.status,
            method: payment.method,
            tier: tier,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notesForCustomer: "Manual verification successful.",
            timeline: admin.firestore.FieldValue.arrayUnion({
              status: 'captured',
              timestamp: new Date().toISOString(),
              message: "Payment verified manually via ID."
            })
          }, { merge: true });

          // Update User
          await db.collection('users').doc(userId).set({
            isSubscribed: true,
            subscriptionTier: tier,
            freeMessagesUsed: 0,
            lastPaymentId: paymentId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
          }, { merge: true });
        }

        console.log(`Manual verification successful for ${userId}`);
        res.json({ status: 'ok', expiryDate: expiryDate.toISOString() });
      } else {
        res.status(400).json({ error: `Payment status is ${payment.status}. It must be 'captured' to activate subscription.` });
      }
    } catch (error: any) {
      console.error("Manual Verification Error:", error);
      res.status(500).json({ error: error.message || "Failed to verify payment ID" });
    }
  });

  app.get('/api/test-razorpay', async (req, res) => {
    try {
      const rzp = new RazorpayConstructor({
        key_id: process.env.VITE_RAZORPAY_KEY_ID || "",
        key_secret: process.env.RAZORPAY_KEY_SECRET || ""
      });
      const orders = await rzp.orders.all({ count: 1 });
      res.json({ status: 'ok', message: "Razorpay keys are valid.", ordersCount: orders.items.length });
    } catch (error: any) {
      console.error("Razorpay Test Error:", error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  app.post('/api/verify-payment', async (req, res) => {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        userId,
        planName
      } = req.body;

      if (!planName) {
        console.error("planName is missing in request body");
        return res.status(400).json({ error: "Plan name is required" });
      }

      console.log(`Verifying payment for user ${userId}, plan ${planName}`);
      console.log(`Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}, Signature: ${razorpay_signature}`);

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        console.error("Missing Razorpay fields in request body");
        return res.status(400).json({ error: "Missing required payment fields" });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || "";
      if (!secret) {
        console.error("RAZORPAY_KEY_SECRET is missing on server!");
        return res.status(500).json({ error: "Server configuration error (Secret missing)" });
      } else {
        console.log("Razorpay secret is present (starts with: " + secret.substring(0, 3) + "...)");
      }

      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      if (generated_signature.toLowerCase() === razorpay_signature.toLowerCase()) {
        console.log("Signature verified successfully.");
        // PAYMENT VALIDATED
        if (!userId) {
          console.error("Payment verified but userId is missing in request body.");
          return res.status(400).json({ error: "User ID is required for verification" });
        }

        if (!db) {
          console.error("Payment verified but Firestore DB is not initialized.");
          return res.status(500).json({ error: "Server database error. Please contact support." });
        }

        // Update Payment Record
        try {
          await db.collection('payments').doc(razorpay_order_id).set({
            paymentId: razorpay_payment_id,
            status: 'captured',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notesForCustomer: "Payment verified via client callback.",
            timeline: admin.firestore.FieldValue.arrayUnion({
              status: 'captured',
              timestamp: new Date().toISOString(),
              message: "Payment verified via app handshake."
            })
          }, { merge: true });
        } catch (pErr) {
          console.error("Failed to update payment record:", pErr);
        }

        // Calculate Expiry Date
        const now = new Date();
        let expiryDate = new Date();
        const tier = planName.toLowerCase();
        
        if (tier.includes('weekly')) {
          expiryDate.setDate(now.getDate() + 7);
        } else if (tier.includes('monthly')) {
          expiryDate.setDate(now.getDate() + 30);
        } else if (tier.includes('yearly')) {
          expiryDate.setDate(now.getDate() + 365);
        } else {
          expiryDate.setDate(now.getDate() + 30); // Default to monthly
        }

        try {
          // Update Firestore securely from server
          await db.collection('users').doc(userId).set({
            isSubscribed: true,
            subscriptionTier: tier,
            freeMessagesUsed: 0,
            lastPaymentId: razorpay_payment_id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
          }, { merge: true });
          console.log(`Firestore updated successfully for user ${userId}`);
          res.json({ status: 'ok', expiryDate: expiryDate.toISOString() });
        } catch (dbError: any) {
          console.error("Firestore Update Error:", dbError);
          res.status(500).json({ error: "Payment verified but failed to update user profile. Please contact support." });
        }
      } else {
        console.error("Signature mismatch!");
        console.error("Generated:", generated_signature);
        console.error("Received:", razorpay_signature);
        res.status(400).json({ 
          error: "Payment verification signature mismatch. This usually happens if the RAZORPAY_KEY_SECRET is incorrect in your environment variables. Please double-check your Razorpay Secret Key in Settings -> Secrets. You can also use the 'Manual Verify' option in the app with your Payment ID to activate your subscription." 
        });
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
