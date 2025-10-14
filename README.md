# PairCalm 💕

**Real-time relationship support with crisis detection, AI coaching, and nervous system regulation.**

---

## 🌟 What is PairCalm?

PairCalm is a comprehensive relationship support platform that helps couples:
- **Detect and prevent crises** before they escalate
- **Regulate nervous systems** in real-time during conflicts
- **Build connection** through evidence-based daily rituals
- **Access AI coaching** powered by Gottman Method principles
- **Track biometrics** (heart rate, HRV, sleep) for deeper insights
- **Find therapists** and book sessions seamlessly
- **Learn & heal** with wellness content (breathwork, meditation, qigong, etc.)

---

## ✨ Key Features

### 🚨 Crisis Detection & Intervention
- Real-time crisis scoring based on 5 risk factors
- Automated interventions (cooling-off periods, emergency therapy suggestions)
- 5 US crisis hotlines built-in
- Safety checks for partner disengagement

### 🧘 Nervous System Regulation
- Check-in tracking (green/yellow/red zones)
- Biometric integration (Oura Ring, Bluetooth heart rate monitors)
- Readiness score tracking
- Zone-aware communication tools

### 🤖 AI-Powered Support
- GPT-4 coaching with Gottman Method expertise
- Message tone analysis (Four Horsemen detection)
- Communication improvement suggestions
- Crisis-appropriate responses

### 💪 Wellness Library (NEW!)
- **10 Categories:** Breathwork, Meditation, Qigong, Binaural Beats, ASMR, Yoga Nidra, Somatic Exercises, PMR, Visualization, Sound Baths
- **12+ Content Pieces** with more added regularly
- Subscription-gated premium content
- Favorites and playlists

### 🌱 Daily Relationship Rituals
- 7 pre-configured rituals (morning check-in, evening wind-down, weekly meetings)
- Streak tracking for motivation
- Emotional bank account system
- Appreciation deposits

### 📊 Progress Tracking & Insights
- Daily metrics aggregation
- Zone distribution trends
- Conflict patterns analysis
- Gottman violations tracking
- Biometric correlations

### 👥 Community & Support
- Anonymous community posts
- Success stories
- Peer support
- Achievement system

### 💰 Subscription Tiers
- **Free:** Basic features + limited wellness content
- **Premium ($14.99/mo):** Full access to wellness library, unlimited AI coaching
- **Couples+ ($24.99/mo):** Exclusive content, priority support, therapist matching

---

## 🏗️ Tech Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **AI:** OpenAI GPT-4 for coaching
- **Deployment:** Vercel (recommended)
- **Analytics:** Google Analytics
- **Payments:** Stripe (optional)
- **Biometrics:** Oura Ring API, Web Bluetooth API

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key (for AI coaching)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/paircalm.git
cd paircalm

# Install dependencies
npm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create `apps/web/.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GA_MEASUREMENT_ID=your_google_analytics_id (optional)
```

---

## 📦 Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to initialize

### 2. Apply Migrations
All migration files are in `supabase/migrations/`. Apply them in order:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually via SQL Editor in Supabase Dashboard
# Copy/paste each migration file in order
```

### 3. Deploy Edge Functions
```bash
# Deploy all edge functions
supabase functions deploy ai-coach
supabase functions deploy message-tone-analysis
supabase functions deploy oura-oauth-callback
supabase functions deploy oura-sync
supabase functions deploy daily-crisis-scoring
supabase functions deploy daily-metrics-aggregation
supabase functions deploy daily-ritual-reminders
```

### 4. Set Edge Function Secrets
```bash
supabase secrets set OPENAI_API_KEY=your_openai_key
```

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**Quick version:**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy! ✅

**Your app will be live at:** `https://your-project.vercel.app`

---

## 📊 Database Schema

### Core Tables
- `user_profiles` - User account data
- `couples` - Partner relationships
- `partner_invitations` - Invitation system
- `wellness_check_ins` - Nervous system check-ins
- `conflicts` - Conflict tracking
- `couple_messages` - Partner communication
- `crisis_scores` - Crisis detection scores
- `crisis_interventions` - Automated interventions

### Wellness
- `wellness_categories` - Content categories (10 types)
- `wellness_content` - Library content (breathwork, meditation, etc.)
- `content_progress` - User completion tracking
- `content_playlists` - Custom playlists

### Engagement
- `rituals` - Daily relationship rituals
- `ritual_completions` - Completion tracking
- `appreciation_deposits` - Positive interactions
- `community_posts` - Anonymous community support

### Professional
- `therapist_profiles` - Therapist marketplace
- `therapy_sessions` - Session bookings
- `workbook_exercises` - Gottman Method exercises

### Monetization
- `subscription_tiers` - Pricing tiers
- `subscriptions` - User subscriptions
- `payment_transactions` - Payment history
- `achievement_definitions` - Gamification
- `user_achievements` - Progress badges

**Total: 42 tables** | **All with Row Level Security (RLS)**

---

## 🔐 Security

- ✅ Bank-level encryption (HTTPS/TLS)
- ✅ Row Level Security on all tables
- ✅ Secure password hashing
- ✅ Session management
- ✅ No data selling - ever
- ✅ GDPR-compliant data export/deletion

---

## 📱 Progressive Web App (PWA)

PairCalm is a fully functional PWA:
- ✅ Install to home screen (iOS & Android)
- ✅ Offline support (service worker)
- ✅ Push notifications
- ✅ Full-screen mode
- ✅ Fast loading

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

Copyright © 2025 PairCalm. All rights reserved.

---

## 🆘 Support

- **Email:** support@paircalm.com
- **Privacy:** privacy@paircalm.com
- **Partnerships:** partners@paircalm.com

---

## ⚠️ Important Disclaimer

**PairCalm is NOT a substitute for:**
- Professional therapy or counseling
- Mental health treatment
- Emergency services
- Medical advice

**If you or your partner are experiencing:**
- Thoughts of self-harm
- Domestic violence
- A mental health emergency

**Please contact:**
- 988 Suicide & Crisis Lifeline (call/text 988)
- National Domestic Violence Hotline (1-800-799-7233)
- 911 for immediate emergencies

---

## 🎉 Acknowledgments

Built with:
- [Gottman Method](https://www.gottman.com/) relationship research
- [Polyvagal Theory](https://www.stephanwporges.com/) for nervous system regulation
- [Supabase](https://supabase.com) for backend infrastructure
- [OpenAI](https://openai.com) for AI coaching
- Love and care for couples everywhere 💕

---

**Ready to launch?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment instructions.

**Questions?** Open an issue or email support@paircalm.com

---

Made with ❤️ for couples who want to thrive, not just survive.
