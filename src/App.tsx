import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LandingPage from './LandingPage';
import LegalModal from './components/LegalModals';
import { 
  auth, db, googleProvider, signInWithPopup, onAuthStateChanged, 
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, User,
  collection, query, where, orderBy, limit,
  OperationType, handleFirestoreError,
  remoteConfig, fetchAndActivate, getString, logEvent, analytics
} from './firebase';

// ── TRANSLATIONS ──
const TX: any = {
  en: {
    wS: 'Your Thinking Partner', wB1: 'Begin', wB2: 'Skip Talk', wT1: 'Private & Secure', wD1: 'Your conversations are end-to-end encrypted. No one can read them.', wT2: 'Honest Advice', wD2: 'Saathi tells you what you need to hear, not just what you want to hear.', wT3: 'Personalized', wD3: 'Guidance tailored to your personality and current life situation.',
    mH: 'Our Mission', mS: 'For a Clearer, Better Life', mC1: '<strong>Truth</strong>: We prioritize honesty above all else.', mC2: '<strong>Privacy</strong>: Your data is your own, always.', mC3: '<strong>Support</strong>: Here for you in every life challenge.', mP: 'Choose a Plan', p1N: 'Individual', p1D: 'For one person', p2N: 'Family', p2D: 'For 4 people', pB: 'Best Value',
    sH: 'About You', sS: 'Encrypted Setup', sN: 'Your Name', sNP: 'e.g. Aryan', sI: 'Your Nature / Situation', sIP: 'What kind of person are you? What is happening now?', sV: 'Saathi\'s Voice Style', v1: 'Calm & Deep', v2: 'Friendly', v3: 'Strict & Direct', v4: 'Spiritual', sB: 'Talk to Saathi',
    cH: 'Saathi', cO: 'Online', cE: 'Encrypted', cM: 'Type your message...', cQ: ['Not feeling well today', 'Want to learn something new', 'What is the purpose of life?', 'How to achieve success?'],
    subH: 'Limit Reached', subS: 'You have used your 3 free messages. Subscribe to continue your journey.', subB: 'Subscribe Now', subC: 'Maybe Later',
    sfH: 'Safety Alert', sfM: 'We sense you might be going through a hard time. Please remember you are not alone.', sfB: 'I Understand', hl: 'Helplines',
    tS: 'Settings Saved', tP: 'Payment Successful', tE: 'Something went wrong', tC: 'Copied',
    welcomeMsg: (name: string) => `Hello ${name}. I am Saathi. I am here to help you think clearly. How can we begin today?`
  },
  hi: {
    wS: 'आपका वैचारिक साथी', wB1: 'शुरू करें', wB2: 'सीधी बात', wT1: 'निजी और सुरक्षित', wD1: 'आपकी बातें पूरी तरह सुरक्षित हैं। कोई उन्हें पढ़ नहीं सकता।', wT2: 'ईमानदार सलाह', wD2: 'साथी वही कहता है जो आपके लिए सही है, न कि सिर्फ जो आप सुनना चाहते हैं।', wT3: 'व्यक्तिगत', wD3: 'आपके स्वभाव और स्थिति के अनुसार सही मार्गदर्शन।',
    mH: 'हमारा लक्ष्य', mS: 'एक स्पष्ट और बेहतर जीवन के लिए', mC1: '<strong>सत्य</strong>: हम सच्चाई को सबसे ऊपर रखते हैं।', mC2: '<strong>गोपनीयता</strong>: आपका डेटा सिर्फ आपका है।', mC3: '<strong>सहयोग</strong>: जीवन की हर चुनौती में आपके साथ।', mP: 'प्लान चुनें', p1N: 'व्यक्तिगत', p1D: 'एक व्यक्ति के लिए', p2N: 'परिवार', p2D: '4 लोगों के लिए', pB: 'सबसे अच्छा',
    sH: 'आपके बारे में', sS: 'सुरक्षित सेटअप', sN: 'आपका नाम', sNP: 'जैसे: आर्यन', sI: 'आपका स्वभाव / स्थिति', sIP: 'आप किस तरह के व्यक्ति हैं? अभी क्या चल रहा है?', sV: 'साथी की आवाज़ का अंदाज़', v1: 'शांत और गहरा', v2: 'दोस्ताना', v3: 'सख्त और सीधा', v4: 'आध्यात्मिक', sB: 'साथी से बात करें',
    cH: 'साथी', cO: 'ऑनलाइन', cE: 'सुरक्षित', cM: 'अपना संदेश लिखें...', cQ: ['आज मन ठीक नहीं है', 'कुछ नया सीखना है', 'जीवन का उद्देश्य क्या है?', 'सफलता कैसे पाएं?'],
    subH: 'सीमा समाप्त', subS: 'आपने अपने 3 मुफ्त संदेश उपयोग कर लिए हैं। आगे बढ़ने के लिए सब्सक्राइब करें।', subB: 'अभी सब्सक्राइब करें', subC: 'बाद में',
    sfH: 'सुरक्षा चेतावनी', sfM: 'हमें लगता है कि आप किसी मुश्किल दौर से गुजर रहे हैं। याद रखें, आप अकेले नहीं हैं।', sfB: 'मैं समझ गया', hl: 'हेल्पलाइन',
    tS: 'सेटिंग्स सुरक्षित', tP: 'भुगतान सफल', tE: 'कुछ गलत हुआ', tC: 'कॉपी किया गया',
    welcomeMsg: (name: string) => `नमस्ते ${name}। मैं साथी हूँ। मैं आपको स्पष्ट रूप से सोचने में मदद करने के लिए यहाँ हूँ। आज हम कैसे शुरुआत कर सकते हैं?`
  },
  te: {
    wS: 'మీ ఆలోచనా భాగస్వామి', wB1: 'ప్రారంభించండి', wB2: 'నేరుగా మాట్లాడండి', wT1: 'ప్రైవేట్ & సురక్షితం', wD1: 'మీ సంభాషణలు ఎండ్-టు-ఎండ్ ఎన్‌క్రిప్ట్ చేయబడ్డాయి. ఎవరూ వాటిని చదవలేరు.', wT2: 'నిజాయితీ గల సలహా', wD2: 'మీరు వినాలనుకునేది మాత్రమే కాకుండా, మీరు వినవలసినది సాథీ మీకు చెబుతుంది.', wT3: 'వ్యక్తిగతీకరించినది', wD3: 'మీ వ్యక్తిత్వం మరియు ప్రస్తుత జీవిత పరిస్థితికి అనుగుణంగా మార్గదర్శకత్వం.',
    mH: 'మా లక్ష్యం', mS: 'స్పష్టమైన, మెరుగైన జీవితం కోసం', mC1: '<strong>నిజం</strong>: మేము అన్నింటికంటే నిజాయితీకి ప్రాధాన్యత ఇస్తాము.', mC2: '<strong>గోప్యత</strong>: మీ డేటా ఎల్లప్పుడూ మీదే.', mC3: '<strong>మద్దతు</strong>: ప్రతి జీవిత సవాలులో మీ కోసం ఇక్కడ ఉన్నాము.', mP: 'ప్లాన్ ఎంచుకోండి', p1N: 'వ్యక్తిగత', p1D: 'ఒక వ్యక్తి కోసం', p2N: 'కుటుంబం', p2D: '4 వ్యక్తుల కోసం', pB: 'ఉత్తమ విలువ',
    sH: 'మీ గురించి', sS: 'ఎన్‌క్రిప్టెడ్ సెటప్', sN: 'మీ పేరు', sNP: 'ఉదా. ఆర్యన్', sI: 'మీ స్వభావం / పరిస్థితి', sIP: 'మీరు ఎలాంటి వ్యక్తి? ఇప్పుడు ఏమి జరుగుతోంది?', sV: 'సాథీ వాయిస్ స్టైల్', v1: 'ప్రశాంతంగా & లోతుగా', v2: 'స్నేహపూర్వకంగా', v3: 'కఠినంగా & నేరుగా', v4: 'ఆధ్యాత్మికం', sB: 'సాథీతో మాట్లాడండి',
    cH: 'సాథీ', cO: 'ఆన్‌లైన్', cE: 'ఎన్‌క్రిప్టెడ్', cM: 'మీ సందేశాన్ని టైప్ చేయండి...', cQ: ['ఈరోజు బాలేదు', 'కొత్తగా ఏదైనా నేర్చుకోవాలి', 'జీవిత ఉద్దేశ్యం ఏమిటి?', 'విజయం సాధించడం ఎలా?'],
    subH: 'పరిమితి ముగిసింది', subS: 'మీరు మీ 3 ఉచిత సందేశాలను ఉపయోగించారు. మీ ప్రయాణాన్ని కొనసాగించడానికి సభ్యత్వాన్ని పొందండి.', subB: 'ఇప్పుడే సభ్యత్వం తీసుకోండి', subC: 'తర్వాత చూద్దాం',
    sfH: 'భద్రతా హెచ్చరిక', sfM: 'మీరు కష్టకాలంలో ఉన్నారని మేము భావిస్తున్నాము. దయచేసి మీరు ఒంటరిగా లేరని గుర్తుంచుకోండి.', sfB: 'నాకు అర్థమైంది', hl: 'హెల్ప్‌లైన్లు',
    tS: 'సెట్టింగ్‌లు సేవ్ చేయబడ్డాయి', tP: 'చెల్లింపు విజయవంతమైంది', tE: 'ఏదో తప్పు జరిగింది', tC: 'కాపీ చేయబడింది',
    welcomeMsg: (name: string) => `నమస్కారం ${name}. నేను సాథీని. మీరు స్పష్టంగా ఆలోచించడంలో సహాయపడటానికి నేను ఇక్కడ ఉన్నాను. ఈరోజు మనం ఎలా ప్రారంభించవచ్చు?`
  },
  or: {
    wS: 'ସାର୍ବଜନୀନ ଚିନ୍ତା ସାଥୀ', wB1: 'ଆରମ୍ଭ', wB2: 'ସିଧା ବୋଲ', wT1: 'ଗୁପ୍ତ ଓ ସୁରକ୍ଷିତ', wD1: 'ଆପଣଙ୍କର ସମସ୍ତ କଥା ଏଣ୍ଡ-ଟୁ-ଏଣ୍ଡ ଏନକ୍ରିପ୍ଟେଡ୍ | କେହି ବି ପଢିପାରିବେ ନାହିଁ |', wT2: 'ସତ୍ୟବାଦୀ ପରାମର୍ଶ', wD2: 'ସାଥୀ କେବଳ ସେତିକି କୁହେ ଯାହା ଆପଣଙ୍କ ପାଇଁ ସତ, ମିଠା କଥା ନୁହେଁ |', wT3: 'ବ୍ୟକ୍ତିଗତ ଅନୁଭବ', wD3: 'ଆପଣଙ୍କ ସ୍ୱଭାବ ଓ ପରିସ୍ଥିତି ଅନୁସାରେ ସଠିକ୍ ମାର୍ଗଦର୍ଶନ |',
    mH: 'ଆମର ଲକ୍ଷ୍ୟ', mS: 'ଏକ ସୁନ୍ଦର ଓ ସ୍ପଷ୍ଟ ଜୀବନ ପାଇଁ', mC1: '<strong>ସତ୍ୟ</strong>: ଆମେ କେବଳ ସତ୍ୟ ଉପରେ ଗୁରୁତ୍ୱ ଦେଉ |', mC2: '<strong>ଗୋପନୀୟତା</strong>: ଆପଣଙ୍କ ତଥ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ ସୁରକ୍ଷିତ |', mC3: '<strong>ସାହାଯ୍ୟ</strong>: ପ୍ରତିଟି ସମସ୍ୟାର ସମାଧାନ ପାଇଁ ଆମେ ପ୍ରସ୍ତୁତ |', mP: 'ପ୍ଲାନ୍ ବାଛନ୍ତୁ', p1N: 'ବ୍ୟକ୍ତିଗତ', p1D: 'ଜଣଙ୍କ ପାଇଁ', p2N: 'ପରିବାର', p2D: '୪ ଜଣଙ୍କ ପାଇଁ', pB: 'ସର୍ବୋତ୍ତମ',
    sH: 'ଆପଣଙ୍କ ବିଷୟରେ', sS: 'ଏନକ୍ରିପ୍ଟେଡ୍ ସେଟଅପ୍', sN: 'ଆପଣଙ୍କ ନାମ', sNP: 'ଉଦାହରଣ: ଆର୍ୟନ', sI: 'ଆପଣଙ୍କ ସ୍ୱଭାବ / ପରିସ୍ଥିତି', sIP: 'ଆପଣ କିପରି ବ୍ୟକ୍ତି? ବର୍ତ୍ତମାନ କଣ ଚାଲିଛି?', sV: 'ସାଥୀର ସ୍ୱର କିପରି ହେବ?', v1: 'ଶାନ୍ତ ଓ ଗମ୍ଭୀର', v2: 'ବନ୍ଧୁତ୍ୱପୂର୍ଣ୍ଣ', v3: 'କଠୋର ଓ ସ୍ପଷ୍ଟ', v4: 'ଆଧ୍ୟାତ୍ମିକ', sB: 'ସାଥୀ ସହିତ କଥା ହୁଅନ୍ତୁ',
    cH: 'ସାଥୀ', cO: 'ଅନଲାଇନ୍', cE: 'ଏନକ୍ରିପ୍ଟେଡ୍', cM: 'ମେସେଜ୍ ଲେଖନ୍ତୁ...', cQ: ['ଆଜି ମନ ଭଲ ନାହିଁ', 'କିଛି ନୂଆ ଶିଖିବାକୁ ଚାହେଁ', 'ଜୀବନର ଲକ୍ଷ୍ୟ କଣ?', 'ସଫଳତା କିପରି ପାଇବି?'],
    subH: 'ସୀମା ସମାପ୍ତ', subS: 'ଆପଣଙ୍କର ୩ଟି ମାଗଣା ମେସେଜ୍ ଶେଷ ହୋଇଛି | ଆଗକୁ ବଢିବା ପାଇଁ ସବସ୍କ୍ରିପ୍ସନ୍ ନିଅନ୍ତୁ |', subB: 'ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ', subC: 'ପରେ ଦେଖିବା',
    sfH: 'ସୁରକ୍ଷା ଚେତାବନୀ', sfM: 'ଆମେ ଅନୁଭବ କରୁଛୁ ଯେ ଆପଣ କଷ୍ଟରେ ଅଛନ୍ତି | ଦୟାକରି ମନେରଖନ୍ତୁ ଯେ ଆପଣ ଏକା ନୁହଁନ୍ତି |', sfB: 'ମୁଁ ବୁଝିଲି', hl: 'ସହାୟତା ନମ୍ବର',
    tS: 'ସେଟିଂସେଭ୍ ହେଲା', tP: 'ପେମେଣ୍ଟ ସଫଳ', tE: 'କିଛି ଭୁଲ୍ ହେଲା', tC: 'କପି ହେଲା',
    welcomeMsg: (name: string) => `ନମସ୍କାର ${name}. ମୁଁ ସାଥୀ | ଆପଣଙ୍କୁ ସ୍ପଷ୍ଟ ଭାବରେ ଚିନ୍ତା କରିବାରେ ସାହାଯ୍ୟ କରିବାକୁ ମୁଁ ଏଠାରେ ଅଛି | ଆଜି ଆମେ କିପରି ଆରମ୍ଭ କରିପାରିବା?`
  }
};

// Add other languages as needed...
const LANGS = [
  { id: 'en', n: 'English' }, { id: 'hi', n: 'हिन्दी' }, { id: 'te', n: 'తెలుగు' },
  { id: 'ta', n: 'தமிழ்' }, { id: 'kn', n: 'ಕನ್ನಡ' }, { id: 'ml', n: 'മലയാളം' },
  { id: 'bn', n: 'বাংলা' }, { id: 'mr', n: 'मराठी' }, { id: 'gu', n: 'ગુજરાતી' },
  { id: 'pa', n: 'ਪੰਜਾਬੀ' }, { id: 'ur', n: 'اردو' }, { id: 'or', n: 'ଓଡ଼ିଆ' }
];

// ── CONFIG ──
const SYSTEM_PROMPT = `You are Saathi, a wise, honest, and deeply perceptive thinking partner. You are NOT a generic AI assistant. You are a mirror for the human soul.

Core Directives:
1. **Socratic Inquiry**: Never rush to give advice. First, ask 1-2 deep, probing questions to truly understand the user's heart and the "why" behind their situation.
2. **The Mirror of Truth**: Reflect the user's situation back to them with brutal but compassionate honesty. Tell them what they *need* to hear, not just what they *want* to hear.
3. **Cultural & Philosophical Depth**: Draw from ancient Indian wisdom (Dharma, Karma, detachment, inner peace) without being preachy. Use metaphors that resonate with the Indian experience.
4. **Anti-Generic**: Avoid standard AI phrases like "I understand," "Here are some tips," or "As an AI." Speak like a wise elder or a true friend who knows them deeply.
5. **Contextual Precision**: Use the user's Name and their specific "Situation" to tailor every single word. If they are in pain, be the balm. If they are confused, be the light.

Formatting Guidelines:
1. Use Markdown headers (###) for key sections.
2. Use bullet points for actionable steps ONLY after you have understood the user.
3. Use **bold** for emphasis on critical truths.
4. Use > blockquotes for "Truths to Face".
5. Structure:
   - Deep Acknowledgment & Observation.
   - Probing Question (to know them better).
   - The Mirror of Truth (when appropriate).
   - Sacred Geometry (balanced advice).`;

const SAFETY_KEYWORDS = ['suicide', 'kill myself', 'end my life', 'आत्महत्या', 'ମରିବା', 'ଜୀବନ ହାରିବା'];

export default function App() {
  console.log("App component rendering...");
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState('en');
  const [screen, setScreen] = useState('landing');
  const [profile, setProfile] = useState({ name: '', sit: '', voice: 'v1' });
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [freeCount, setFreeCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [subTier, setSubTier] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showSubWall, setShowSubWall] = useState(false);
  const [wallPlan, setWallPlan] = useState({ amt: 108, name: 'Weekly' });
  const [showSafety, setShowSafety] = useState(false);
  const [toast, setToast] = useState('');
  const [planType, setPlanType] = useState('individual');
  const [legalType, setLegalType] = useState<'privacy' | 'terms' | 'disclaimer' | 'refund' | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  const getStorageKey = (uid?: string) => uid ? `saathi_chat_${uid}` : 'saathi_chat_guest';

  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── AUTH & FIRESTORE SYNC ──
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let unsubscribePayments: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      console.log("Auth state changed:", u?.uid || "null");
      // CRITICAL: Clear current state immediately on any auth change to prevent leakage
      setMessages([]);
      setProfile({ name: '', sit: '', voice: 'v1' });
      setFreeCount(0);
      setSubscribed(false);
      setRecentPayments([]);

      setUser(u);
      setIsAuthLoading(false);

      if (u) {
        // Real-time listener for user document
        const userRef = doc(db, 'users', u.uid);
        unsubscribeDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setFreeCount(data.freeMessagesUsed || 0);
            
            const isSub = data.isSubscribed || false;
            const exp = data.expiryDate ? data.expiryDate.toDate() : null;
            const isExpired = exp ? exp.getTime() < new Date().getTime() : false;

            setSubscribed(isSub && !isExpired);
            setSubTier(data.subscriptionTier || '');
            setExpiryDate(exp);

            if (isSub && !isExpired) {
              setShowSubWall(false);
            }

            // Sync profile if it exists and we don't have one yet
            if (data.name || data.situation) {
              setProfile(prev => ({
                name: prev.name || data.name || '',
                sit: prev.sit || data.situation || '',
                voice: prev.voice || data.voiceStyle || 'v1'
              }));
            }
          } else {
            // New user initialization
            const initialData = {
              email: u.email,
              name: u.displayName || 'User',
              freeMessagesUsed: 0,
              isSubscribed: false,
              createdAt: serverTimestamp()
            };
            setDoc(userRef, initialData).catch(err => {
              handleFirestoreError(err, OperationType.CREATE, `users/${u.uid}`);
            });
          }
        }, (err) => {
          console.error("Snapshot error:", err);
          showToast("Connection to your profile lost. Please refresh.");
        });

        // Real-time listener for payments
        try {
          const paymentsQuery = query(
            collection(db, 'payments'),
            where('userId', '==', u.uid),
            orderBy('updatedAt', 'desc'),
            limit(3)
          );
          unsubscribePayments = onSnapshot(paymentsQuery, (snap) => {
            const p = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRecentPayments(p);
          }, (err) => {
            console.error("Payments listener error:", err);
          });
        } catch (e) {
          console.error("Failed to setup payments listener:", e);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        if (unsubscribePayments) {
          unsubscribePayments();
          unsubscribePayments = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, []);

  // Removed syncUserData as it's replaced by onSnapshot

  const forceSync = async () => {
    if (!user) {
      showToast("Please login first.");
      return;
    }
    setIsSyncing(true);
    try {
      console.log("Force syncing for user:", user.uid);
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        console.log("Firestore data found:", data);
        setFreeCount(data.freeMessagesUsed || 0);
        const isSub = data.isSubscribed || false;
        const exp = data.expiryDate ? data.expiryDate.toDate() : null;
        const isExpired = exp ? exp.getTime() < new Date().getTime() : false;

        setSubscribed(isSub && !isExpired);
        setSubTier(data.subscriptionTier || '');
        setExpiryDate(exp);
        
        if (isSub && !isExpired) {
          setShowSubWall(false);
          showToast("Subscription active! Enjoy Saathi.");
          // If we are on landing/welcome/setup, jump to chat
          if (screen !== 'chat') {
            setScreen('chat');
          }
        } else if (isSub && isExpired) {
          showToast(`Your ${subTier} plan expired on ${exp?.toLocaleDateString()}. Please renew.`);
        } else {
          showToast("No active subscription found in our records. Please pay to continue.");
        }
      } else {
        showToast("No profile found. Please start the journey first.");
      }
    } catch (err) {
      console.error("Force sync failed:", err);
      showToast("Sync failed. Check connection.");
    } finally {
      setIsSyncing(false);
    }
  };
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (analytics) logEvent(analytics, 'login_success', { method: 'google' });
      return result.user;
    } catch (err: any) {
      console.error("Login failed details:", err);
      if (err.code === 'auth/popup-blocked') {
        showToast("Login popup was blocked. Please allow popups for this site.");
      } else if (err.code === 'auth/unauthorized-domain') {
        showToast("This domain is not authorized in Firebase. Please add it to Authorized Domains.");
      } else {
        showToast(`Login failed: ${err.message || 'Please try again.'}`);
      }
      return null;
    }
  };

  // Sync Local Chat History (ONLY)
  useEffect(() => {
    if (isAuthLoading) return;
    try {
      const key = getStorageKey(user?.uid);
      const saved = localStorage.getItem(key);

      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.profile) setProfile(parsed.profile);
      } else {
        // Reset to default if no history for this user
        setMessages([]);
        setProfile({ name: '', sit: '', voice: 'v1' });
      }
    } catch (err) {
      console.error("Failed to load local chat:", err);
    }
  }, [user, isAuthLoading]);

  const saveChatLocally = (msgs: any[], prof?: any) => {
    const key = getStorageKey(user?.uid);
    const data = { messages: msgs, profile: prof || profile };
    localStorage.setItem(key, JSON.stringify(data));
  };

  useEffect(() => {
    if (screen === 'welcome') drawSG();
  }, [screen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  const [isReconciling, setIsReconciling] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (remoteConfig) {
      fetchAndActivate(remoteConfig).then(() => {
        const prompt = getString(remoteConfig, 'system_instruction');
        setSystemPrompt(prompt);
        console.log("Remote Config: System prompt loaded.");
      }).catch(err => {
        console.error("Remote Config Error:", err);
      });
    }
  }, []);

  const handleReconcile = async () => {
    if (!user || user.email !== "chitti.radha4@gmail.com") return;
    setIsReconciling(true);
    try {
      const res = await fetch('/api/admin/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user.email })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Reconciliation complete. Processed: ${data.processed}, Fixed: ${data.fixed}`);
      } else {
        showToast(data.error || "Reconciliation failed.");
      }
    } catch (e) {
      showToast("Network error during reconciliation.");
    } finally {
      setIsReconciling(false);
    }
  };
  const [manualPaymentId, setManualPaymentId] = useState('');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);

  const handleManualVerify = async () => {
    if (!user) return showToast("Please login first.");
    if (!manualPaymentId.trim()) return showToast("Please enter a Payment ID.");
    
    setIsVerifyingManual(true);
    try {
      const res = await fetch('/api/verify-manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: manualPaymentId.trim(),
          userId: user.uid,
          planName: subTier || 'Monthly'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubscribed(true);
        if (data.expiryDate) setExpiryDate(new Date(data.expiryDate));
        setShowSubWall(false);
        showToast("Payment verified! Subscription activated.");
      } else {
        const err = await res.json();
        showToast(err.error || "Verification failed.");
      }
    } catch (e) {
      showToast("Network error during verification.");
    } finally {
      setIsVerifyingManual(false);
    }
  };
  const handlePayment = async (amount: number, planName: string) => {
    if (analytics) logEvent(analytics, 'payment_started', { amount, plan: planName });
    let currentUser = user;
    if (!currentUser) {
      currentUser = await handleLogin();
    }
    if (!currentUser) return;

    if (!(window as any).Razorpay) {
      showToast("Payment system loading... try again in a second.");
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      showToast("Payment configuration missing (Razorpay Key ID).");
      return;
    }

    let currentOrderId = "";

    const rzpOptions: any = {
      key: razorpayKey,
      amount: amount * 100, // Amount in paise
      currency: "INR",
      name: "Saathi AI",
      description: `${planName} Subscription`,
      image: "https://picsum.photos/seed/saathi/200/200",
      handler: async function (response: any) {
        console.log("Razorpay success response:", response);
        const orderIdToVerify = response.razorpay_order_id || currentOrderId;
        
        if (response.razorpay_payment_id) {
          try {
            console.log(`Verifying payment with server. Order: ${orderIdToVerify}, Payment: ${response.razorpay_payment_id}`);
            // VERIFY PAYMENT ON SERVER
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: orderIdToVerify,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: currentUser!.uid,
                planName: planName
              })
            });

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              setSubscribed(true);
              setSubTier(planName.toLowerCase());
              if (verifyData.expiryDate) {
                setExpiryDate(new Date(verifyData.expiryDate));
              }
              setFreeCount(0);
              setShowSubWall(false);
              showToast(TX[lang].tP);
              if (screen === 'landing') setScreen('welcome');
            } else {
              const errData = await verifyRes.json();
              console.error("Verification failed:", errData);
              showToast(`Payment verification failed: ${errData.error}`);
            }
          } catch (err) {
            console.error("Verification error:", err);
            showToast("Something went wrong during verification.");
          }
        }
      },
      prefill: {
        name: profile.name || currentUser.displayName,
        email: currentUser.email,
        contact: ""
      },
      theme: {
        color: "#38b2ac"
      }
    };

    try {
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount, 
          currency: "INR",
          userId: currentUser.uid,
          tier: planName.toLowerCase()
        })
      });
      const orderData = await orderRes.json();
      if (orderRes.ok && orderData.id) {
        currentOrderId = orderData.id;
        rzpOptions.order_id = orderData.id;
        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
      } else {
        console.error("Order creation failed:", orderData);
        const errorMsg = orderData.error || orderData.message || "Failed to create payment order.";
        showToast(errorMsg);
      }
    } catch (err) {
      console.error("Order creation error:", err);
      showToast("Payment system error. Please try again.");
    }
  };

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 10000); // Increased to 10 seconds
  };

  const drawSG = () => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = '';
    const w = window.innerWidth, h = window.innerHeight;
    const cx = w / 2, cy = h / 2;
    
    // Main Sacred Rings (Golden Ratio based)
    const sizes = [67, 108, 175, 283, 458]; // 108 / phi, 108, 108 * phi, etc.
    sizes.forEach((s, i) => {
      const r = document.createElement('div');
      r.className = 'sg-ring';
      r.style.width = s + 'px';
      r.style.height = s + 'px';
      r.style.left = cx + 'px';
      r.style.top = cy + 'px';
      r.style.animationDelay = (i * 0.8) + 's';
      canvasRef.current!.appendChild(r);
    });

    // Flower of Life Petals (6 petals at 60 degree intervals)
    const r_petal = 54; // 108 / 2
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180);
      const px = cx + r_petal * Math.cos(angle);
      const py = cy + r_petal * Math.sin(angle);
      
      const p = document.createElement('div');
      p.className = 'fol-petal';
      p.style.width = '108px';
      p.style.height = '108px';
      p.style.left = px + 'px';
      p.style.top = py + 'px';
      p.style.animationDelay = (i * 0.3) + 's';
      canvasRef.current!.appendChild(p);
    }
  };

  const handleBegin = () => {
    setScreen('mission');
  };

  const handleMissionNext = () => setScreen('setup');
  
  const handleSetupFinish = async () => {
    console.log("handleSetupFinish called. Profile:", profile);
    if (!profile.name) {
      console.warn("Name missing");
      return showToast('Please enter your name');
    }
    
    setIsBusy(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        console.log("User null, attempting login...");
        currentUser = await handleLogin();
      }
      
      if (!currentUser) {
        console.error("Login failed or cancelled");
        setIsBusy(false);
        return;
      }

      console.log("User identified:", currentUser.uid);

      // Update profile in Firestore - Don't await to prevent blocking UI transition
      const userRef = doc(db, 'users', currentUser.uid);
      updateDoc(userRef, {
        name: profile.name,
        situation: profile.sit,
        voiceStyle: profile.voice
      }).catch(err => {
        console.warn("Background profile update failed:", err);
      });

      const welcomeMsg = t.welcomeMsg ? t.welcomeMsg(profile.name) : `Hello ${profile.name}. I am Saathi. I am here to help you think clearly. How can we begin today?`;
      const initialMsg = {
        role: 'ai',
        text: welcomeMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([initialMsg]);
      setScreen('chat');
      saveChatLocally([initialMsg]);
    } catch (err) {
      console.error("Setup finish error:", err);
      showToast("Something went wrong. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const sendMessage = async (txt: string = input) => {
    const msg = txt.trim();
    if (!msg || isBusy) return;

    if (analytics) logEvent(analytics, 'chat_message_sent', { length: msg.length, lang });

    // Check expiry
    const isExpired = expiryDate ? expiryDate.getTime() < new Date().getTime() : false;

    if ((!subscribed || isExpired) && freeCount >= 3) {
      setShowSubWall(true);
      if (isExpired) showToast("Your subscription has expired. Please renew.");
      return;
    }

    if (SAFETY_KEYWORDS.some(k => msg.toLowerCase().includes(k))) {
      setShowSafety(true);
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user', text: msg, time };
    const updatedMsgs = [...messages, userMsg];
    
    setMessages(updatedMsgs);
    setIsBusy(true);
    setInput('');

    try {
      const targetLangName = LANGS.find(l => l.id === lang)?.n || 'English';
      
      const history = messages.map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      // Gemini requires history to start with 'user'. 
      while (history.length > 0 && history[0].role === 'model') {
        history.shift();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            ...history.map(h => ({ role: h.role, parts: h.parts })),
            { role: 'user', parts: [{ text: msg }] }
          ],
          systemInstruction: `You are talking to ${profile.name}. 
          Their current life situation/nature: "${profile.sit}". 
          Your voice style: ${profile.voice}.
          
          ${systemPrompt || SYSTEM_PROMPT}
          
          CRITICAL: You MUST respond ONLY in ${targetLangName}. Stay in character as Saathi at all times.`
        })
      });

      clearTimeout(timeoutId);

      if (!chatRes.ok) {
        let errMsg = "Server error";
        try {
          const errData = await chatRes.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await chatRes.json();
      const aiText = data.text;
      if (!aiText) throw new Error("AI returned an empty response");
      const aiMsg = { role: 'ai', text: aiText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      
      const newCount = subscribed ? freeCount : freeCount + 1;
      setFreeCount(newCount);

      // Update Firestore usage
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            freeMessagesUsed: newCount
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }

      saveChatLocally(finalMsgs);

    } catch (error: any) {
      console.error("Chat Error:", error);
      const errMsg = error.message || "Something went wrong";
      if (errMsg.includes("abort")) {
        showToast("AI is taking too long. Please try again.");
      } else {
        showToast(`Saathi Error: ${errMsg}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleStart = async () => {
    let currentUser = user;
    if (!currentUser) {
      currentUser = await handleLogin();
      if (!currentUser) return;
    }
    
    // Check if they have a profile and are subscribed
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const isSub = data.isSubscribed || false;
        const exp = data.expiryDate ? data.expiryDate.toDate() : null;
        const isExpired = exp ? exp.getTime() < new Date().getTime() : false;

        if (isSub && !isExpired && data.name) {
          setScreen('chat');
          return;
        }
      }
    } catch (e) {
      console.error("Error checking profile on start:", e);
    }
    
    setScreen('welcome');
  };

  const handleSignOut = () => {
    auth.signOut();
    setMessages([]);
    setProfile({ name: '', sit: '', voice: 'v1' });
    setFreeCount(0);
    setSubscribed(false);
    setScreen('landing');
    showToast("Signed out successfully");
  };

  const t = TX[lang] || TX.en;

  if (isAuthLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--lp-bg)' }}>
        <div className="saathi-mark" style={{ animation: 'pulse 2s infinite' }}>✦</div>
      </div>
    );
  }

  return (
    <div className="app-container">
        <AnimatePresence mode="wait">
          {/* LANDING PAGE */}
          {screen === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <LandingPage 
                user={user}
                onStart={handleStart} 
                onLogin={handleLogin}
                onSync={forceSync}
                onSubscribe={(amt, plan) => handlePayment(amt, plan)}
                onShowLegal={(t) => setLegalType(t)}
              />
            </motion.div>
          )}

        {/* WELCOME SCREEN */}
        {screen !== 'landing' && (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="app-inner"
          >
            {/* LANGUAGE BAR */}
            <div className="lbar">
              {LANGS.map(l => (
                <button key={l.id} className={`lb ${lang === l.id ? 'on' : ''}`} onClick={() => setLang(l.id)}>
                  {l.n}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* WELCOME SCREEN */}
              {screen === 'welcome' && (
          <motion.div 
            key="welcome"
            id="sw" className="screen on"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="sg-canvas" ref={canvasRef}></div>
            <div className="wbody">
              <div className="saathi-mark">✦</div>
              <h1 className="wordmark">Saathi <em>AI</em></h1>
              <p className="w-sub">{t.wS}</p>
              <p className="w-tag">{t.wD2}</p>
              
              <div className="truth-box">
                <p className="truth-title">✦ {t.wT1}</p>
                <div className="truth-item">
                  <span className="ti-ico">🛡️</span>
                  <p className="ti-text">{t.wD1}</p>
                </div>
                <div className="truth-item">
                  <span className="ti-ico">⚖️</span>
                  <p className="ti-text">{t.wD2}</p>
                </div>
              </div>

              <button className="btn-primary" onClick={handleBegin}>{t.wB1}</button>
              <button className="btn-ghost" onClick={() => setScreen('chat')}>{t.wB2}</button>
            </div>
          </motion.div>
        )}

        {/* MISSION SCREEN */}
        {screen === 'mission' && (
          <motion.div 
            key="mission"
            id="smission" className="screen on"
            initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
          >
            <div className="mbody">
              <h2 className="m-title">{t.mH}</h2>
              <p className="m-sub">{t.mS}</p>
              
              <div className="m-cards">
                <div className="mcard">
                  <span className="mc-ico">✨</span>
                  <p className="mc-text" dangerouslySetInnerHTML={{ __html: t.mC1 }}></p>
                </div>
                <div className="mcard">
                  <span className="mc-ico">🔒</span>
                  <p className="mc-text" dangerouslySetInnerHTML={{ __html: t.mC2 }}></p>
                </div>
                <div className="mcard">
                  <span className="mc-ico">🤝</span>
                  <p className="mc-text" dangerouslySetInnerHTML={{ __html: t.mC3 }}></p>
                </div>
              </div>

              <p className="m-sub">{t.mP}</p>
              <div className="plan-grid">
                <div className={`ptcard ${planType === 'individual' ? 'on' : ''}`} onClick={() => setPlanType('individual')}>
                  <div className="pt-ico">👤</div>
                  <div className="pt-name">{t.p1N}</div>
                  <div className="pt-desc">{t.p1D}</div>
                </div>
                <div className={`ptcard ${planType === 'family' ? 'on' : ''}`} onClick={() => setPlanType('family')}>
                  <div className="pt-ico">👨‍👩‍👧‍👦</div>
                  <div className="pt-name">{t.p2N}</div>
                  <div className="pt-desc">{t.p2D}</div>
                  <div className="pt-badge">{t.pB}</div>
                </div>
              </div>

              <button className="btn-primary" onClick={handleMissionNext}>{t.wB1}</button>
            </div>
          </motion.div>
        )}

        {/* SETUP SCREEN */}
        {screen === 'setup' && (
          <motion.div 
            key="setup"
            id="ss" className="screen on"
            initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
          >
            <div className="topbar">
              <button className="back-btn" onClick={() => setScreen('mission')}>←</button>
              <h3 className="top-title">{t.sH}</h3>
              <div className="top-badge">🛡️ {t.sS}</div>
            </div>
            <div className="sbody">
              <div className="enc-note">
                <span>🔒</span>
                <p>{t.wD1}</p>
              </div>

              <div className="scard">
                <p className="c-lbl">{t.sN}</p>
                <input 
                  className="inp" placeholder={t.sNP} 
                  value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})}
                />
              </div>

              <div className="scard">
                <p className="c-lbl">{t.sI}</p>
                <textarea 
                  className="textarea" placeholder={t.sIP}
                  value={profile.sit} onChange={e => setProfile({...profile, sit: e.target.value})}
                ></textarea>
              </div>

              <div className="scard">
                <p className="c-lbl">{t.sV}</p>
                <div className="svcg">
                  <div className={`svc ${profile.voice === 'v1' ? 'on' : ''}`} onClick={() => setProfile({...profile, voice: 'v1'})}>
                    <span className="svc-i">🌊</span><span className="svc-n">{t.v1}</span>
                  </div>
                  <div className={`svc ${profile.voice === 'v2' ? 'on' : ''}`} onClick={() => setProfile({...profile, voice: 'v2'})}>
                    <span className="svc-i">☀️</span><span className="svc-n">{t.v2}</span>
                  </div>
                  <div className={`svc ${profile.voice === 'v3' ? 'on' : ''}`} onClick={() => setProfile({...profile, voice: 'v3'})}>
                    <span className="svc-i">⛰️</span><span className="svc-n">{t.v3}</span>
                  </div>
                  <div className={`svc ${profile.voice === 'v4' ? 'on' : ''}`} onClick={() => setProfile({...profile, voice: 'v4'})}>
                    <span className="svc-i">🕉️</span><span className="svc-n">{t.v4}</span>
                  </div>
                </div>
              </div>

              <button 
                className="btn-begin" 
                onClick={handleSetupFinish}
                disabled={isBusy}
              >
                {isBusy ? '...' : `${t.sB} ✦`}
              </button>

              {subscribed && expiryDate && (
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(56,178,172,0.1)', borderRadius: '8px', border: '1px solid var(--lp-teal)' }}>
                  <p style={{ color: 'var(--lp-teal)', fontWeight: 'bold', fontSize: '0.9rem' }}>✦ {subTier.toUpperCase()} Plan Active</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Expires on: {expiryDate.toLocaleDateString()}</p>
                  <p style={{ fontSize: '0.7rem', marginTop: '5px' }}>
                    {Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                  </p>
                </div>
              )}
              
              {!user && (
                <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '12px', textAlign: 'center' }}>
                  Note: You will be asked to login to save your profile.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* CHAT SCREEN */}
        {screen === 'chat' && (
          <motion.div 
            key="chat"
            id="sc" className="screen on"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="chat-hdr">
              <div className="av">✦</div>
              <div>
                <div className="h-nm">{t.cH}</div>
                <div className="h-st">{t.cO}</div>
              </div>
              <div style={{ flex: 1 }}></div>
              <button className="h-enc" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }} onClick={handleSignOut}>Logout</button>
              <button className="h-enc" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowClearConfirm(true)}>🗑️ Clear</button>
              <div className="h-enc">🔒 Local</div>
              <div className="h-enc" style={{ color: isBusy ? 'var(--lp-gold)' : 'var(--lp-teal)' }}>
                {isBusy ? '● Thinking' : '● Online'}
              </div>
            </div>

            <div className="mc-bar">
              {subscribed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <div className="mc-txt" style={{ color: 'var(--lp-teal)' }}>
                    ✦ {subTier.toUpperCase()} Plan Active
                  </div>
                  <div style={{ flex: 1 }}></div>
                  {expiryDate && (
                    <div className="mc-txt" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                      Expires: {expiryDate.toLocaleDateString()}
                      {Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3 && (
                        <span style={{ color: 'var(--lp-rose)', marginLeft: '5px' }}> (Renew Soon!)</span>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => setShowSubWall(true)}
                    style={{ background: 'var(--lp-teal)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer' }}
                  >
                    Extend
                  </button>
                </div>
              ) : (
                <>
                  <div className="mc-txt">Free Messages: {freeCount}/3</div>
                  <div className="mc-progress-bg">
                    <div className="mc-progress-fill" style={{ width: `${(freeCount / 3) * 100}%` }}></div>
                  </div>
                  <button 
                    onClick={() => setShowSubWall(true)}
                    style={{ marginLeft: '10px', background: 'var(--lp-gold)', color: 'black', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Upgrade
                  </button>
                </>
              )}
            </div>

            <div className="chat-body">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role === 'ai' ? 'msg-ai' : 'msg-me'}`}>
                  <div className={`bub ${m.role === 'ai' ? 'bub-ai' : 'bub-me'}`}>
                    {m.role === 'ai' ? (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                  <div className="meta">{m.time}</div>
                </div>
              ))}
              {isBusy && (
                <div className="typ-row">
                  <div className="typ-bub">
                    <div className="td"></div>
                    <div className="td"></div>
                    <div className="td"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef}></div>
            </div>

            <div className="chat-ftr">
              <div className="qrow">
                {t.cQ.map((q: string, i: number) => (
                  <button key={i} className="qp" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
              <div className="irow">
                <textarea 
                  className="ci" placeholder={t.cM} rows={1}
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                ></textarea>
                <button className="sbtn" onClick={() => sendMessage()} disabled={isBusy || !input.trim()}>✦</button>
              </div>
              <div className="fenc">
                <span>🛡️</span> {t.wD1}
              </div>
            </div>
          </motion.div>
        )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBSCRIPTION WALL */}
      {showSubWall && (
        <div id="subwall" className="on">
          <div className="sw-card">
            <h2 className="sw-t">{subscribed ? "Renew Subscription" : t.subH}</h2>
            <p className="sw-s">
              {subscribed 
                ? `Your ${subTier} plan is active until ${expiryDate?.toLocaleDateString()}. Renew now to ensure uninterrupted access.`
                : "You have used your 3 free messages. Subscribe to continue your journey."
              }
            </p>
            <div className="plans">
              <div 
                className={`plan ${wallPlan.amt === 108 ? 'on' : ''}`} 
                onClick={() => setWallPlan({ amt: 108, name: 'Weekly' })}
              >
                <div className="plan-ico">🌱</div>
                <div className="plan-nm">Weekly</div>
                <div className="plan-price">₹108</div>
                <div className="plan-period">/wk</div>
              </div>
              <div 
                className={`plan ${wallPlan.amt === 299 ? 'on' : ''}`} 
                onClick={() => setWallPlan({ amt: 299, name: 'Monthly' })}
              >
                <div className="plan-badge">Popular</div>
                <div className="plan-ico">🌟</div>
                <div className="plan-nm">Monthly</div>
                <div className="plan-price">₹299</div>
                <div className="plan-period">/mo</div>
              </div>
              <div 
                className={`plan ${wallPlan.amt === 1008 ? 'on' : ''}`} 
                onClick={() => setWallPlan({ amt: 1008, name: 'Yearly' })}
              >
                <div className="plan-ico">💫</div>
                <div className="plan-nm">Yearly</div>
                <div className="plan-price">₹1008</div>
                <div className="plan-period">/yr</div>
              </div>
            </div>
            <div className="feats">
              <div className="feat">Unlimited Messages</div>
              <div className="feat">Priority AI Access</div>
              <div className="feat">Advanced Life Insights</div>
            </div>
            <button className="btn-sub" onClick={() => handlePayment(wallPlan.amt, wallPlan.name)}>
              {subscribed ? "Renew Now" : "Continue to Payment"}
            </button>
            {subscribed ? (
              <button className="btn-cancel" onClick={() => setShowSubWall(false)}>Back to Chat</button>
            ) : (
              <button className="btn-cancel" onClick={() => setShowSubWall(false)}>{t.subC}</button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button 
                className="btn-ghost" 
                style={{ fontSize: '0.7rem', border: 'none', opacity: 0.7 }}
                onClick={forceSync}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Already paid? Click to Sync Status'}
              </button>

              {recentPayments.length > 0 && (
                <div className="payment-history" style={{ marginTop: '1.2rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--lp-teal)', marginBottom: '0.6rem', fontWeight: 'bold' }}>✦ Recent Payment Status</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {recentPayments.map((p: any) => (
                      <div key={p.id} style={{ fontSize: '0.65rem', borderLeft: `2px solid ${p.status === 'captured' ? 'var(--lp-teal)' : 'var(--gold)'}`, paddingLeft: '0.6rem', marginBottom: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ opacity: 0.6 }}>{p.tier?.toUpperCase()} Plan</span>
                          <span style={{ color: p.status === 'captured' ? 'var(--lp-teal)' : 'var(--gold)', fontWeight: 'bold' }}>{p.status?.toUpperCase()}</span>
                        </div>
                        <p style={{ opacity: 0.8, fontSize: '0.6rem', marginBottom: '0.3rem' }}>{p.notesForCustomer}</p>
                        
                        {/* Timeline */}
                        {p.timeline && p.timeline.length > 0 && (
                          <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                            {p.timeline.map((t: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem', opacity: 0.5 }}>
                                <span style={{ fontSize: '0.5rem', whiteSpace: 'nowrap' }}>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span style={{ fontSize: '0.55rem' }}>{t.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {p.paymentId && <p style={{ opacity: 0.3, fontSize: '0.5rem', marginTop: '0.4rem' }}>Payment ID: {p.paymentId}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sub-help" style={{ marginTop: '1.2rem', padding: '0.8rem', background: 'rgba(212,160,23,0.05)', borderRadius: '12px', border: '1px dashed rgba(212,160,23,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '0.4rem', fontWeight: 'bold' }}>✦ Payment Stuck? (పేమెంట్ ఆగిపోయిందా?)</p>
                <p style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '0.6rem', lineHeight: '1.4' }}>
                  If you were charged but the app didn't update, enter your <strong>Razorpay Payment ID</strong> from your SMS/Email below.
                </p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input 
                    type="text" 
                    placeholder="pay_..." 
                    value={manualPaymentId}
                    onChange={(e) => setManualPaymentId(e.target.value)}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: 'white', outline: 'none' }}
                  />
                  <button 
                    onClick={handleManualVerify}
                    disabled={isVerifyingManual}
                    style={{ background: 'var(--gold)', color: 'black', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {isVerifyingManual ? '...' : 'Verify'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.6rem', opacity: 0.5, textAlign: 'center', marginTop: '1rem' }}>
                Still facing issues? Contact support: <a href="mailto:chitti.radha4@gmail.com" style={{ color: 'var(--lp-teal)' }}>chitti.radha4@gmail.com</a>
              </p>

              {user?.email === "chitti.radha4@gmail.com" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    onClick={handleReconcile}
                    disabled={isReconciling}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.6rem', color: 'var(--lp-teal)', cursor: 'pointer' }}
                  >
                    {isReconciling ? 'Reconciling...' : 'Admin: Run Global Reconciliation'}
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/test-razorpay');
                        const data = await res.json();
                        showToast(data.message);
                      } catch (e) {
                        showToast("Failed to test Razorpay keys.");
                      }
                    }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.6rem', color: 'var(--gold)', cursor: 'pointer' }}
                  >
                    Admin: Test Razorpay Keys
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SAFETY OVERLAY */}
      {showSafety && (
        <div id="safety-overlay" className="on">
          <div className="safety-card">
            <div className="safety-icon">❤️</div>
            <h2 className="safety-title">{t.sfH}</h2>
            <p className="safety-msg">{t.sfM}</p>
            <div className="safety-helplines">
              <div className="hl-item">Kiran (24/7): <strong>1800-599-0019</strong></div>
              <div className="hl-item">Vandrevala Foundation: <strong>9999 666 555</strong></div>
            </div>
            <button className="btn-understand" onClick={() => setShowSafety(false)}>{t.sfB}</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast">{toast}</div>}

      {/* LEGAL MODALS */}
      <LegalModal type={legalType} onClose={() => setLegalType(null)} />

      {/* CLEAR DATA CONFIRMATION */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            className="legal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div 
              className="legal-card"
              style={{ maxWidth: '340px' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="legal-hdr">
                <h2>Clear All Data?</h2>
                <button className="legal-close" onClick={() => setShowClearConfirm(false)}>✕</button>
              </div>
              <div className="legal-body" style={{ textAlign: 'center' }}>
                <p>This will permanently delete your profile, chat history, and settings from this device. This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: '1.08rem', marginTop: '1.618rem' }}>
                  <button 
                    className="btn-primary" 
                    style={{ background: 'var(--rose)', flex: 1 }}
                    onClick={() => {
                      const key = getStorageKey(user?.uid);
                      localStorage.removeItem(key);
                      localStorage.removeItem('saathi_chat_guest');
                      localStorage.removeItem('saathi_chat_history');
                      window.location.reload();
                    }}
                  >
                    Yes, Delete Everything
                  </button>
                  <button 
                    className="btn-ghost" 
                    style={{ flex: 1 }}
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
