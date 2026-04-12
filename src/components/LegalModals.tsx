import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LegalModalProps {
  type: 'privacy' | 'terms' | 'disclaimer' | 'refund' | null;
  onClose: () => void;
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  const content = {
    privacy: {
      title: 'Privacy Policy',
      text: `
### 1. Data Sovereignty
Saathi AI is built on a "Privacy-First" architecture. Unlike traditional AI apps, **your chat history and personal profile are stored exclusively on your physical device.** We do not have servers that store your conversations.

### 2. Information We Collect
- **Local Storage**: Your name, situation, and chat history are saved in your browser's local storage. This data never leaves your device.
- **AI Processing**: When you send a message, it is sent to Google's Gemini API for processing. This data is transient and is not stored by Saathi AI.
- **Payments**: Payment details are handled entirely by Razorpay. We do not see or store your credit card or UPI details.

### 3. Data Deletion
You can wipe all data associated with this app at any time by clicking the "Clear Data" button in the chat header. Once deleted, this data cannot be recovered by us.

### 4. Encryption
All communication between your device and the AI is encrypted using industry-standard SSL/TLS protocols.
      `
    },
    terms: {
      title: 'Terms of Service',
      text: `
### 1. Acceptance of Terms
By using Saathi AI, you agree to these terms. If you do not agree, please do not use the service.

### 2. Nature of Service
Saathi AI provides an AI-powered thinking partner. It is a tool for reflection and guidance. It is not a substitute for professional human advice.

### 3. Subscriptions
- Subscriptions are billed in advance on a weekly, monthly, or yearly basis.
- You can cancel your subscription at any time, but we do not provide pro-rated refunds for the remaining period.

### 4. User Conduct
You agree not to use Saathi AI for any illegal activities or to generate harmful, hateful, or violent content.
      `
    },
    disclaimer: {
      title: 'Disclaimer',
      text: `
### 1. Not Professional Advice
Saathi AI is an Artificial Intelligence. The guidance provided is for informational and reflection purposes only. **It does not constitute medical, legal, financial, or psychological advice.**

### 2. Accuracy
AI can "hallucinate" or provide incorrect information. Always verify important facts (like government scheme details or legal procedures) with official sources.

### 3. Emergency Situations
If you are in a life-threatening situation or experiencing a mental health crisis, do not rely on Saathi AI. Please contact the emergency helplines provided in the app immediately.
      `
    },
    refund: {
      title: 'Refund Policy',
      text: `
### 1. Digital Goods
Since Saathi AI provides digital services that are consumed immediately, we generally do not offer refunds once a subscription period has started.

### 2. Technical Issues
If you experience a technical failure that prevents you from using the service after payment, please contact our support at **chitti.radha4@gmail.com** with your Razorpay Payment ID.

### 3. How to find your Payment ID
After a successful payment, you will receive an email from Razorpay with a Payment ID (e.g., pay_Nxyz...). You can also find this in your UPI app's transaction history.

### 4. Cancellations
You can cancel your subscription at any time to prevent future billing. Your access will continue until the end of the current paid period.
      `
    }
  };

  const active = content[type];

  return (
    <AnimatePresence>
      <motion.div 
        className="legal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="legal-card"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="legal-hdr">
            <h2>{active.title}</h2>
            <button className="legal-close" onClick={onClose}>✕</button>
          </div>
          <div className="legal-body">
            <div className="markdown-body">
              {active.text.split('\n').map((line, i) => {
                if (line.startsWith('###')) return <h3 key={i}>{line.replace('###', '')}</h3>;
                if (line.startsWith('-')) return <li key={i}>{line.replace('-', '')}</li>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
