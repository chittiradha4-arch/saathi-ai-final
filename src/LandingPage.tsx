import React, { useEffect } from 'react';

interface LandingPageProps {
  user: any;
  onStart: () => void;
  onLogin: () => void;
  onSync: () => void;
  onSubscribe: (amount: number, plan: string) => void;
  onShowLegal: (type: 'privacy' | 'terms' | 'disclaimer' | 'refund') => void;
}

export default function LandingPage({ user, onStart, onLogin, onSync, onSubscribe, onShowLegal }: LandingPageProps) {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el));
    
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <nav className="lp-nav">
        <a className="lp-nav-brand" href="#">Saathi <em>AI</em></a>
        <div style={{ display: 'flex', gap: '0.67rem' }}>
          {!user ? (
            <button className="lp-btn-hero lp-btn-ghost" style={{ padding: '0.67rem 1.08rem', fontSize: '0.9rem' }} onClick={onLogin}>Login</button>
          ) : (
            <span className="lp-hero-label" style={{ margin: 0, alignSelf: 'center', fontSize: '0.8rem' }}>Hi, {user.displayName?.split(' ')[0]}</span>
          )}
          <button className="lp-nav-cta" onClick={onStart}>{user ? 'Open App →' : 'Try Free →'}</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-label">Built for India · 12 Languages · ₹299/month</div>

          <div className="lp-hero-symbol">
            <svg viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="54" cy="54" r="53" stroke="rgba(56,178,172,0.07)" strokeWidth="1"/>
              <circle cx="72" cy="54" r="18" stroke="rgba(56,178,172,0.25)" strokeWidth="0.8" fill="none"/>
              <circle cx="63" cy="38.4" r="18" stroke="rgba(212,160,23,0.2)" strokeWidth="0.8" fill="none"/>
              <circle cx="45" cy="38.4" r="18" stroke="rgba(56,178,172,0.25)" strokeWidth="0.8" fill="none"/>
              <circle cx="36" cy="54" r="18" stroke="rgba(212,160,23,0.2)" strokeWidth="0.8" fill="none"/>
              <circle cx="45" cy="69.6" r="18" stroke="rgba(56,178,172,0.25)" strokeWidth="0.8" fill="none"/>
              <circle cx="63" cy="69.6" r="18" stroke="rgba(212,160,23,0.2)" strokeWidth="0.8" fill="none"/>
              <circle cx="54" cy="54" r="18" stroke="rgba(129,230,217,0.4)" strokeWidth="1" fill="rgba(56,178,172,0.05)"/>
              <circle cx="54" cy="54" r="10.8" stroke="rgba(212,160,23,0.22)" strokeWidth="0.6" fill="none" strokeDasharray="3 3"/>
              <circle cx="54" cy="54" r="2.7" fill="rgba(129,230,217,0.8)"/>
            </svg>
          </div>

          <h1>Not a chatbot.<br/><em>Your thinking partner.</em></h1>
          <p className="lp-hero-sub">
            ChatGPT knows everything about the world. Saathi knows about <strong style={{color:'var(--lp-text1)'}}>your world</strong> —
            your language, your family pressure, your debt, your government schemes, your culture's wisdom.
          </p>
          <div className="lp-hero-btns">
            <button className="lp-btn-hero lp-btn-primary" onClick={onStart}>
              {user ? 'Enter Chat ✦' : '🤝 Start Free — 3 Messages'}
            </button>
            {user ? (
              <button className="lp-btn-hero lp-btn-ghost" onClick={onSync}>Already paid? Sync Status</button>
            ) : (
              <button className="lp-btn-hero lp-btn-ghost" onClick={onLogin}>Already a member? Login</button>
            )}
          </div>
        </div>
      </section>

      {/* REAL PEOPLE */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-sec-label lp-reveal">Real People. Real Problems.</div>
          <h2 className="lp-sec-title lp-reveal">Who <em>actually</em> uses Saathi</h2>
          <p className="lp-sec-desc lp-reveal">Not technology people. Not English speakers. Ordinary Indians carrying real weight — and finally having somewhere to bring it.</p>

          <div className="lp-stories">
            <div className="lp-story lp-reveal">
              <div className="lp-story-person">
                <div className="lp-story-avatar" style={{background:'rgba(56,178,172,0.1)'}}>👩</div>
                <div>
                  <div className="lp-story-name">Radha, 36 — Srikakulam, Andhra Pradesh</div>
                  <div className="lp-story-detail">Housewife · PG graduate · APPSC aspirant · Loves maths</div>
                </div>
              </div>
              <div className="lp-story-q">I passed APPSC prelims but failed mains. My husband supports me but his family says stop wasting time. I don't know if I should keep trying or do something with my maths.</div>
              <div className="lp-story-a">
                <strong>Saathi said in Telugu:</strong>
                {" "}Prelims pass అవడం failure కాదు — అది proof. మీ maths strength మీ chart యొక్క wealth indicator. 3 realistic paths: maths tuition center (5 students from home), November 2025 APPSC target with serious preparation, or online maths courses for income now. మీ husband support rare — use it. కుటుంబానికి నిజంగా ఏం కావాలి — డబ్బు లేదా status?
              </div>
            </div>

            <div className="lp-story lp-reveal">
              <div className="lp-story-person">
                <div className="lp-story-avatar" style={{background:'rgba(212,160,23,0.1)'}}>👨</div>
                <div>
                  <div className="lp-story-name">Ravi, 42 — Warangal, Telangana</div>
                  <div className="lp-story-detail">Small farmer · ₹3 lakh debt · 2 children studying</div>
                </div>
              </div>
              <div className="lp-story-q">Last 3 years no good rain. I took loans for seeds. Moneylender is pressuring. I don't sleep properly. Don't know what to do.</div>
              <div className="lp-story-a">
                <strong>Saathi said:</strong>
                {" "}First — you are eligible for PM-Kisan (₹6,000/year), PM Fasal Bima crop insurance (claim immediately for last 3 years), and MGNREGA for guaranteed work income. Second — your moneylender loan can be restructured through Gram Panchayat. Third — your sleep problem is real, not weakness. It needs attention too. Here is what to do this week, one step at a time.
              </div>
            </div>

            <div className="lp-story lp-reveal">
              <div className="lp-story-person">
                <div className="lp-story-avatar" style={{background:'rgba(224,92,122,0.1)'}}>👩</div>
                <div>
                  <div className="lp-story-name">Meena, 28 — Chennai, Tamil Nadu</div>
                  <div className="lp-story-detail">Software professional · Marriage pressure · Feels lost</div>
                </div>
              </div>
              <div className="lp-story-q">My parents want me to get married urgently. I feel confused — I don't know what I actually want from life. Everyone seems to know their direction except me.</div>
              <div className="lp-story-a">
                <strong>Saathi said in Tamil:</strong>
                {" "}28 வயதில் குழப்பம் இருப்பது பிரச்சனை இல்லை — అది அறிவின் அறிகுறி. "மற்றவர்களுக்கு direction தெரியும்" என்பது ஒரு illusion. உங்கள் Kanya Rashi — ஆழமான analysis-க்கு built. இப்போது ஒரு கேள்வி: திருமணம் நாளை நடந்தால், career 3 years பிறகு — అది சரியாக இருக்குமா? உங்கள் answer என்னை விட அதிகமாக சொல்லும்.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE DIFFERENCE */}
      <section className="lp-section" id="difference">
        <div className="lp-container">
          <div className="lp-sec-label lp-reveal">Honest Comparison</div>
          <h2 className="lp-sec-title lp-reveal">ChatGPT · Gemini · Claude · Copilot · Grok<br/><em>vs Saathi</em></h2>
          <p className="lp-sec-desc lp-reveal">Those are <strong style={{color:'var(--lp-text1)'}}>brilliant tools</strong> — genuinely. But "everything about everything" is not "everything about <em>you</em>."</p>

          <div className="lp-compare-heads lp-reveal">
            <div className="lp-ch lp-ch-them">ChatGPT / Gemini / Claude / Copilot / Grok</div>
            <div className="lp-ch lp-ch-us">Saathi AI</div>
          </div>
          <div className="lp-compare-rows lp-reveal">
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">Language</span>English-first. Other languages work but cultural nuance is lost.</div>
              <div className="lp-cbox lp-cbox-us"><strong>Language</strong>Telugu, Hindi, Tamil and 9 more — as your primary language. Speaks your culture, not about it.</div>
            </div>
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">Knows You</span>Whatever you typed this session. Forgets you completely next time.</div>
              <div className="lp-cbox lp-cbox-us"><strong>Knows You</strong>Your name, situation, what you carry. Asks before it answers — like a good doctor, not a search engine.</div>
            </div>
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">India Knowledge</span>Knows about India. Does not know APPSC mains pattern, PM-Kisan eligibility for your village, your local court procedure.</div>
              <div className="lp-cbox lp-cbox-us"><strong>India Knowledge</strong>Exact government scheme eligibility. Indian legal rights in your language. APPSC, SSC, Railway exam strategy.</div>
            </div>
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">Emotional Approach</span>Helpful. Correct. Efficient. Answers what you asked.</div>
              <div className="lp-cbox lp-cbox-us"><strong>Emotional Approach</strong>Answers what you <em>need</em> — which is often different. Reads the pain beneath the question. Sits with you first, solutions second.</div>
            </div>
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">Cost</span>₹1,999/month (ChatGPT). ₹1,950/month (Gemini). Designed for US income levels.</div>
              <div className="lp-cbox lp-cbox-us"><strong>Cost</strong>₹149/week · ₹299/month · ₹999/year. First 3 messages free. One cup of chai per month.</div>
            </div>
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">Astrology & Wisdom</span>Knows about Jyotish. Gives generic information about Rashi and Nakshatra.</div>
              <div className="lp-cbox lp-cbox-us"><strong>Astrology & Wisdom</strong>Takes your exact birth date, time, place. Gives your specific Mahadasha and what it means for your actual life right now.</div>
            </div>
            <div className="lp-compare-row">
              <div className="lp-cbox lp-cbox-them"><span className="lp-lbl">Privacy</span>Conversations may train future AI models. Data on servers abroad.</div>
              <div className="lp-cbox lp-cbox-us"><strong>Privacy</strong>End-to-end encrypted. Not stored after session. Screenshot protected. Your secrets are yours.</div>
            </div>
          </div>

          <div className="lp-compare-summary lp-reveal">
            <strong style={{color:'var(--lp-teal-lt)'}}>One sentence:</strong>
            {" "}ChatGPT is a brilliant encyclopedia. Saathi is the wise elder who knows you, speaks your language, and tells you the truth with love.
          </div>
        </div>
      </section>

      {/* WHAT SAATHI KNOWS */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-sec-label lp-reveal">Complete Knowledge</div>
          <h2 className="lp-sec-title lp-reveal">Everything Saathi <em>knows</em></h2>
          <p className="lp-sec-desc lp-reveal">Not a narrow tool. A complete thinking partner for every area of life.</p>
          <div className="lp-knows">
            <div className="lp-know lp-reveal"><div className="lp-know-ico">⭐</div><div className="lp-know-title">Vedic Jyotish</div><div className="lp-know-desc">Your Rashi, Nakshatra, Mahadasha, Yogas — connected to your actual life, not generic predictions</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🔢</div><div className="lp-know-title">Numerology</div><div className="lp-know-desc">Life Path, Destiny, Soul Urge. Name vibration. Baby names aligned with Nakshatra</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🏛️</div><div className="lp-know-title">Government Schemes</div><div className="lp-know-desc">PM-Kisan, Ayushman Bharat, PM Mudra, scholarships — exact eligibility, how to apply</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">⚖️</div><div className="lp-know-title">Legal Rights</div><div className="lp-know-desc">Domestic violence law, tenant rights, RTI, consumer protection — in your language</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🏥</div><div className="lp-know-title">Health Guidance</div><div className="lp-know-desc">General health information, when to see a doctor urgently, mental health support</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">💼</div><div className="lp-know-title">Career & Exams</div><div className="lp-know-desc">UPSC, APPSC, SSC, Banking strategy. Private sector. Business registration.</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">💰</div><div className="lp-know-title">Money & Debt</div><div className="lp-know-desc">Debt management, savings, insurance — honest plans, not platitudes</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🧠</div><div className="lp-know-title">Psychology</div><div className="lp-know-desc">Why we feel what we feel. Anxiety, grief, family pressure — with compassion and science</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🏡</div><div className="lp-know-title">Vastu Shastra</div><div className="lp-know-desc">Practical home guidance without demolition. Directions, simple corrections</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🕐</div><div className="lp-know-title">Muhurta</div><div className="lp-know-desc">Auspicious timing for weddings, business, Griha Pravesh — 3 specific windows</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">❤️</div><div className="lp-know-title">Relationships</div><div className="lp-know-desc">Marriage, family conflict, parent pressure — honest and compassionate</div></div>
            <div className="lp-know lp-reveal"><div className="lp-know-ico">🌟</div><div className="lp-know-title">Life Direction</div><div className="lp-know-desc">When you feel lost — Saathi helps you find what is truly right for you</div></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-sec-label lp-reveal">Simple Pricing</div>
          <h2 className="lp-sec-title lp-reveal">Less than a cup of <em>chai</em> per day</h2>
          <div className="lp-divider"></div>
          <div className="lp-free-box lp-reveal">
            <span style={{fontSize:'1.08rem',flexShrink:0}}>🎁</span>
            <div><strong style={{color:'var(--lp-text1)'}}>Start completely free.</strong> Your first 3 messages cost nothing. Secure account. Sync across devices. No credit card. Experience the depth before you decide.</div>
          </div>
          <div className="lp-pricing-cards lp-reveal">
            <div className="lp-pcard" onClick={() => onSubscribe(108, 'Weekly')}>
              <div className="lp-pico">🌱</div>
              <div className="lp-pper">Weekly</div>
              <div className="lp-pamt">₹108</div>
              <div className="lp-psub">7 days · unlimited</div>
              <div className="lp-pnote">One difficult week. Guidance every day.</div>
            </div>
            <div className="lp-pcard featured" onClick={() => onSubscribe(299, 'Monthly')}>
              <div className="lp-pbadge">MOST CHOSEN</div>
              <div className="lp-pico">🌟</div>
              <div className="lp-pper">Monthly</div>
              <div className="lp-pamt">₹299</div>
              <div className="lp-psub">30 days · unlimited</div>
              <div className="lp-pnote">Less than ₹10 per day. All services.</div>
            </div>
            <div className="lp-pcard" onClick={() => onSubscribe(1008, 'Yearly')}>
              <div className="lp-pico">💫</div>
              <div className="lp-pper">Yearly</div>
              <div className="lp-pamt">₹1008</div>
              <div className="lp-psub">365 days · unlimited</div>
              <div className="lp-pnote">Save 72%. Less than ₹3 per day.</div>
            </div>
          </div>
          <div className="lp-free-box lp-reveal">
            <span style={{fontSize:'1.08rem',flexShrink:0}}>🔐</span>
            <div style={{fontSize:'0.8rem'}}>Secure payment via <strong style={{color:'var(--lp-text1)'}}>Razorpay</strong> — UPI, cards, net banking, wallets. Cancel anytime. Your data never shared.</div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-sec-label lp-reveal">Why Trust Saathi</div>
          <h2 className="lp-sec-title lp-reveal">Built with <em>ethics first</em></h2>
          <div className="lp-trust">
            <div className="lp-titem lp-reveal"><span className="lp-titem-ico">🔐</span><div className="lp-titem-text"><strong>End-to-End Encrypted</strong>Not stored after your session. Not us. Not anyone.</div></div>
            <div className="lp-titem lp-reveal"><span className="lp-titem-ico">✅</span><div className="lp-titem-text"><strong>Honest About Limits</strong>Always says "consult a doctor/lawyer" for important decisions. Never pretends.</div></div>
            <div className="lp-titem lp-reveal"><span className="lp-titem-ico">🚫</span><div className="lp-titem-text"><strong>No Fear. No Exploitation.</strong>Will never tell you that you are cursed. Will never create fear to take money.</div></div>
            <div className="lp-titem lp-reveal"><span className="lp-titem-ico">🌍</span><div className="lp-titem-text"><strong>Every Faith Welcome</strong>Hindu, Muslim, Christian, Sikh, Atheist — belongs to humanity, not any religion.</div></div>
            <div className="lp-titem lp-reveal"><span className="lp-titem-ico">💙</span><div className="lp-titem-text"><strong>Crisis Support Always</strong>iCall 9152987821 · Vandrevala 1860-2662-345 · Emergency 112 — always available.</div></div>
            <div className="lp-titem lp-reveal"><span className="lp-titem-ico">⚖️</span><div className="lp-titem-text"><strong>Legally Protected</strong>Privacy Policy + Terms. Compliant with India's Digital Personal Data Protection Act 2023.</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-mark">🤝</div>
          <h2>Begin your 3 free<br/><em>conversations today</em></h2>
          <p>Secure login. No credit card. No English required.<br/>Just open, choose your language, and talk.</p>
          <button className="lp-btn-hero lp-btn-primary" onClick={onStart} style={{fontSize:'1.08rem',padding:'1.08rem 2.16rem'}}>
            🤝 Open Saathi AI — Free
          </button>
          <div className="lp-langs">
            Available in · తెలుగు · हिंदी · தமிழ் · ಕನ್ನಡ · മലയാളం · বাংলা · मराठी · ગુજરાતી · పੰਜਾਬీ · اردو · ଓడ଼్ిଆ · English
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container">
          <div style={{marginBottom:'1.08rem',fontFamily:'Cormorant Garamond, serif',fontSize:'1.2rem',color:'var(--lp-teal-lt)'}}>Saathi AI</div>
          <div className="lp-footer-links">
            <button className="lp-f-link" onClick={onStart}>App</button>
            <span>·</span>
            <button className="lp-f-link" onClick={() => onShowLegal('privacy')}>Privacy Policy</button>
            <span>·</span>
            <button className="lp-f-link" onClick={() => onShowLegal('terms')}>Terms of Service</button>
            <span>·</span>
            <button className="lp-f-link" onClick={() => onShowLegal('refund')}>Refund Policy</button>
            <span>·</span>
            <button className="lp-f-link" onClick={() => onShowLegal('disclaimer')}>Disclaimer</button>
          </div>
          <div>© 2026 Saathi AI / Jyotish AI. All rights reserved. · Indian Copyright Act 1957.</div>
          <div style={{marginTop:'6px',fontSize:'0.65rem'}}>Guidance only — not medical, legal, or financial advice. Always consult qualified professionals for important decisions.</div>
        </div>
      </footer>
    </div>
  );
}
