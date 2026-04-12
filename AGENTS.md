# Saathi AI - Core Principles & Design System

This document serves as the "Source of Truth" for Saathi AI. These principles are LOCKED and must be followed for all future updates.

## 1. Core Philosophy: "Nothing is Decoration. Everything is Meaning."
Saathi is built for people in moments of pain, debt, fear, or hopelessness. The UI must speak to the part of a human being that exists before language.

## 2. Sacred Geometry (Measurements)
All measurements must divide or multiply by the Golden Ratio (**φ = 1.618**).
- **Sacred Number 108**: The primary unit of measure.
- **Icon Diameter**: 108px.
- **Outer Breathing Ring**: 175px (108 * φ).
- **Inner Ring**: 67px (108 / φ).
- **Flower of Life Petal Radius**: 54px (108 / 2).
- **Card Padding**: 1.618rem (φ).
- **Free Message Limit**: 3 (Strict limit for free users).
- **Breathe Animation Pulse**: 4 seconds (Human resting breath rate).

## 3. Colour System (The 60/30/10 Rule)
- **60% Dominant Dark**: 
  - Background: `#0a0d12` (Night sky at 3am - deep wisdom).
  - Surface: `#161b22` (Lifting the veil).
- **30% Teal Accents**: 
  - Teal: `#38b2ac` (Ayurveda blue-green - healing, trustworthy wisdom).
- **10% Meaningful Colours**:
  - **Gold**: `#d4a017` (Turmeric gold - ancient wisdom, Lakshmi). Used for ancient knowledge.
  - **Rose**: `#e05c7a` (Bindi rose - compassion/urgency). Used for safety alerts and limits.
  - **Green**: `#48bb78` (Tulsi green - trust/safety). Used for encryption/success.

## 4. Typography
- **Headings**: `Cormorant Garamond` (Ancient authority).
- **Body/UI**: `Noto Sans` (Universal support for 12+ Indian scripts including Telugu, Hindi, Tamil).

## 5. Language & AI Behavior
- **Telugu Priority**: Telugu responses are the gold standard for this app. The AI must maintain the "Wise & Honest" persona.
- **Wise & Honest Persona**: Saathi tells the user what they *need* to hear, not just what they *want* to hear.
- **Structure**: Responses must use Markdown headers (###), bullet points, and blockquotes (>) for "Truths to Face".

## 6. Security & Privacy
- **Server-Side Only**: All API keys (Gemini, Razorpay Secret) must stay on the server.
- **Payment Verification**: Subscriptions must ONLY be updated via server-side verification.
- **Data Isolation**: Chat history must be uniquely keyed to the user's UID to prevent leakage between accounts.
