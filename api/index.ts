import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Razorpay from 'razorpay';
import crypto from 'crypto';
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
  } catch (e) {
    console.error("Firebase Admin init failed.", e);
  }
}

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// 1. Gemini Proxy
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post('/api/chat', async (req, res) => {
  try {
    const { contents, systemInstruction, model } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set on server" });
    }

    const aiModel = genAI.getGenerativeModel({ 
      model: model || "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const result = await aiModel.generateContent({ contents });
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error: any) {
    console.error("Gemini Error:", error);
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
    if (db) {
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
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const userId = payment.notes.userId;
      const tier = payment.notes.tier;

      if (db && userId && userId !== 'anonymous') {
        await db.collection('payments').doc(orderId).set({
          paymentId: paymentId,
          status: 'captured',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          timeline: admin.firestore.FieldValue.arrayUnion({
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

        await db.collection('users').doc(userId).set({
          isSubscribed: true,
          subscriptionTier: tier,
          freeMessagesUsed: 0,
          lastPaymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
        }, { merge: true });
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
      if (userId && db) {
        const tier = planName.toLowerCase();
        const now = new Date();
        let expiryDate = new Date();
        if (tier.includes('weekly')) expiryDate.setDate(now.getDate() + 7);
        else if (tier.includes('monthly')) expiryDate.setDate(now.getDate() + 30);
        else if (tier.includes('yearly')) expiryDate.setDate(now.getDate() + 365);
        else expiryDate.setDate(now.getDate() + 30);

        await db.collection('payments').doc(razorpay_order_id).set({
          paymentId: razorpay_payment_id,
          status: 'captured',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          timeline: admin.firestore.FieldValue.arrayUnion({
            status: 'captured',
            timestamp: new Date().toISOString(),
            message: "Payment verified via client."
          })
        }, { merge: true });

        await db.collection('users').doc(userId).set({
          isSubscribed: true,
          subscriptionTier: tier,
          freeMessagesUsed: 0,
          lastPaymentId: razorpay_payment_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
        }, { merge: true });
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

      if (db) {
        await db.collection('users').doc(userId).set({
          isSubscribed: true,
          subscriptionTier: tier,
          freeMessagesUsed: 0,
          lastPaymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
        }, { merge: true });
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
