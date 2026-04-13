import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from '@anthropic-ai/sdk';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// Lazy Firebase Admin initialization
let db: any = null;

function getDb() {
  if (db) return db;

  let appInstance;
  if (!admin.apps.length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "saatiai-e39a2";

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        // Fix for Vercel newline escaping in private keys
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        appInstance = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId
        });
        console.log("Firebase Admin initialized with service account.");
      } catch (parseErr: any) {
        console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid JSON string:", parseErr.message);
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format: " + parseErr.message);
      }
    } else {
      // If on Vercel, we MUST have a service account key
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw new Error("Firebase credentials missing. Please add FIREBASE_SERVICE_ACCOUNT_KEY to your Vercel Environment Variables.");
      }
      // Local fallback
      appInstance = admin.initializeApp({ projectId });
    }
  } else {
    appInstance = admin.apps[0];
  }

  const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-a3a12be1-faa4-48ca-9fa0-f8e181011aa7";
  try {
    db = (databaseId && databaseId !== '(default)') ? getFirestore(appInstance!, databaseId) : getFirestore(appInstance!);
    return db;
  } catch (err: any) {
    console.error("Firestore getFirestore failed:", err.message);
    throw err;
  }
}

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Lazy Gemini initialization
let genAIInstance: any = null;
function getGenAI() {
  const key = process.env.GEMINI_API_KEY || "";
  if (!genAIInstance || genAIInstance.apiKey !== key) {
    genAIInstance = new GoogleGenerativeAI(key);
  }
  return genAIInstance;
}

// Lazy Anthropic initialization
let anthropicInstance: any = null;
function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY || "";
  if (!anthropicInstance || anthropicInstance.apiKey !== key) {
    anthropicInstance = new Anthropic({ apiKey: key });
  }
  return anthropicInstance;
}

app.get('/api/debug-env', async (req, res) => {
  let saProjectId = "unknown";
  let saClientEmail = "unknown";
  let firestoreStatus = "not_tested";
  let firestoreError = null;
  let geminiStatus = "not_tested";
  let geminiError = null;
  let availableModels: string[] = [];

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      saProjectId = sa.project_id;
      saClientEmail = sa.client_email;
    }
  } catch (e) {}

  try {
    const testDb = getDb();
    if (testDb) {
      firestoreStatus = "connected_to_client";
    }
  } catch (e: any) {
    firestoreStatus = "failed";
    firestoreError = e.message;
  }

  const geminiKey = process.env.GEMINI_API_KEY || "";
  try {
    if (geminiKey) {
      // Try to list models using raw fetch to bypass SDK limitations
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        if (listData.models) {
          availableModels = listData.models.map((m: any) => m.name.replace('models/', ''));
          geminiStatus = `models_found_${availableModels.length}`;
        } else if (listData.error) {
          geminiStatus = `list_failed_${listData.error.status}`;
          geminiError = listData.error.message;
        }
      } catch (e: any) {
        console.log("List models failed:", e.message);
      }

      const genAI = getGenAI();
      const modelsToTry = [
        "gemini-2.0-flash", 
        "gemini-1.5-flash", 
        "gemini-1.5-pro",
        "gemini-pro"
      ];
      
      // If we found models from the list, try those first
      const finalModelsToTry = availableModels.length > 0 
        ? [...new Set([...availableModels.filter(m => m.includes('flash') || m.includes('pro')), ...modelsToTry])]
        : modelsToTry;

      let lastErr = null;
      for (const m of finalModelsToTry) {
        try {
          const testModel = genAI.getGenerativeModel({ model: m });
          const result = await testModel.generateContent("hi");
          const response = await result.response;
          if (response.text()) {
            geminiStatus = `working_with_${m}`;
            geminiError = null;
            break;
          }
        } catch (e: any) {
          lastErr = e.message;
          geminiStatus = `failed_with_${m}`;
        }
      }
      
      if (geminiStatus.startsWith('failed')) {
        geminiError = lastErr;
      }
    } else {
      geminiStatus = "missing_key";
    }
  } catch (e: any) {
    geminiStatus = "failed";
    geminiError = e.message;
  }

  res.json({
    hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    saProjectId,
    saClientEmail,
    firestoreStatus,
    firestoreError,
    geminiStatus,
    geminiError,
    availableModels,
    geminiKeyPrefix: geminiKey ? geminiKey.substring(0, 8) + "..." : "missing",
    geminiKeyLength: geminiKey.length,
    isVercel: !!process.env.VERCEL,
    hasGeminiKey: !!geminiKey,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { contents, systemInstruction } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set on server" });
    }

    const genAI = getGenAI();
    
    // Prioritize models found in the user's specific debug scan
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-1.5-flash", 
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-pro"
    ];
    
    let lastError = null;
    let successfulModel = "";

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Chat] Attempting model: ${modelName}`);
        const aiModel = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemInstruction
        });
        const result = await aiModel.generateContent({ contents });
        const response = await result.response;
        const text = response.text();
        if (text) {
          successfulModel = modelName;
          console.log(`[Chat] Success with model: ${modelName}`);
          return res.json({ text, modelUsed: modelName });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Chat] Model ${modelName} failed:`, err.message);
        // If it's a 404, we definitely want to try the next one
        // If it's a 429 (Rate Limit), we might also want to try another one
      }
    }
    
    // FINAL BULLETPROOF FALLBACK: Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log(`[Chat] Gemini failed. Attempting Claude fallback...`);
        const anthropic = getAnthropic();
        
        // Convert Gemini contents to Anthropic messages
        const messages = contents.map((c: any) => ({
          role: c.role === 'model' ? 'assistant' : 'user',
          content: c.parts[0].text
        }));

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: systemInstruction,
          messages: messages,
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : "";
        if (text) {
          console.log(`[Chat] Success with Claude fallback!`);
          return res.json({ text, modelUsed: "claude-3-5-sonnet" });
        }
      } catch (err: any) {
        console.error(`[Chat] Claude fallback also failed:`, err.message);
        lastError = err;
      }
    }
    
    console.error("[Chat] All models failed. Last error:", lastError?.message);
    throw lastError || new Error("All Gemini models failed. Please check your API key permissions and quota.");
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Razorpay Integration
const RazorpayConstructor = (Razorpay as any).default || Razorpay;
const razorpay = new RazorpayConstructor({
  key_id: process.env.VITE_RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency, userId, tier } = req.body;
    const options = {
      amount: Math.round(Number(amount) * 100), // in paise
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: userId || "anonymous",
        tier: tier || "monthly"
      }
    };
    const order = await razorpay.orders.create(options);
    
    // Persist to cloud
    const firestore = getDb();
    if (firestore) {
      try {
        await firestore.collection('payments').doc(order.id).set({
          orderId: order.id,
          userId: userId || "anonymous",
          amount: Number(amount),
          currency: currency || "INR",
          status: 'created',
          tier: tier || "monthly",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          notesForCustomer: "Order created; awaiting payment.",
          timeline: [
            { status: 'created', timestamp: new Date().toISOString(), message: "Order created in system." }
          ]
        });
      } catch (dbErr: any) {
        console.error("Firestore Save Error (Order):", dbErr.message);
        // Don't fail the whole request if just logging fails, but on Vercel we need this
      }
    }
    
    res.json(order);
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/razorpay-webhook', async (req: any, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const signature = req.headers['x-razorpay-signature'];

  if (secret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }
  }

  const event = req.body;
  try {
    const firestore = getDb();
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const userId = payment.notes.userId;
      const tier = payment.notes.tier;

      if (firestore && userId && userId !== 'anonymous') {
        try {
          await firestore.collection('payments').doc(orderId).set({
            paymentId: paymentId,
            status: 'captured',
            updatedAt: FieldValue.serverTimestamp(),
            timeline: FieldValue.arrayUnion({
              status: 'captured',
              timestamp: new Date().toISOString(),
              message: "Payment captured via Webhook."
            })
          }, { merge: true });

          const now = new Date();
          let expiryDate = new Date();
          if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
          else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
          else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
          else expiryDate.setDate(now.getDate() + 30);

          await firestore.collection('users').doc(userId).set({
            isSubscribed: true,
            subscriptionTier: tier,
            freeMessagesUsed: 0,
            lastPaymentId: paymentId,
            updatedAt: FieldValue.serverTimestamp(),
            expiryDate: Timestamp.fromDate(expiryDate)
          }, { merge: true });
        } catch (dbErr: any) {
          console.error("Firestore Webhook Error:", dbErr.message);
        }
      }
    }
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).send('Webhook Error');
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

    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature.toLowerCase() === razorpay_signature.toLowerCase()) {
      const firestore = getDb();
      if (userId && firestore) {
        try {
          const tier = planName.toLowerCase();
          const now = new Date();
          let expiryDate = new Date();
          if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
          else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
          else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
          else expiryDate.setDate(now.getDate() + 30);

          await firestore.collection('payments').doc(razorpay_order_id).set({
            paymentId: razorpay_payment_id,
            status: 'captured',
            updatedAt: FieldValue.serverTimestamp(),
            timeline: FieldValue.arrayUnion({
              status: 'captured',
              timestamp: new Date().toISOString(),
              message: "Payment verified via client."
            })
          }, { merge: true });

          await firestore.collection('users').doc(userId).set({
            isSubscribed: true,
            subscriptionTier: tier,
            freeMessagesUsed: 0,
            lastPaymentId: razorpay_payment_id,
            updatedAt: FieldValue.serverTimestamp(),
            expiryDate: Timestamp.fromDate(expiryDate)
          }, { merge: true });
        } catch (dbErr: any) {
          console.error("Firestore Verification Error:", dbErr.message);
          throw new Error("Payment verified but database update failed. Please contact support.");
        }
      }
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify-manual-payment', async (req, res) => {
  try {
    const { paymentId, userId, planName } = req.body;
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (payment.status === 'captured') {
      const tier = planName.toLowerCase();
      const now = new Date();
      let expiryDate = new Date();
      if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
      else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
      else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
      else expiryDate.setDate(now.getDate() + 30);

      const firestore = getDb();
      if (firestore) {
        try {
          await firestore.collection('users').doc(userId).set({
            isSubscribed: true,
            subscriptionTier: tier,
            freeMessagesUsed: 0,
            lastPaymentId: paymentId,
            updatedAt: FieldValue.serverTimestamp(),
            expiryDate: Timestamp.fromDate(expiryDate)
          }, { merge: true });
        } catch (dbErr: any) {
          console.error("Firestore Manual Verify Error:", dbErr.message);
          throw new Error("Payment found but database update failed.");
        }
      }
      res.json({ status: 'ok', expiryDate: expiryDate.toISOString() });
    } else {
      res.status(400).json({ error: "Payment not captured" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-razorpay', async (req, res) => {
  try {
    const orders = await razorpay.orders.all({ count: 1 });
    res.json({ status: 'ok', message: "Razorpay keys are valid.", count: orders.items.length });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default app;
