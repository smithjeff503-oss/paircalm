# PairCalm - Deployment Guide

## 🚀 Quick Deploy to Vercel (Recommended)

### Prerequisites
1. GitHub account
2. Vercel account (sign up at vercel.com - it's free!)
3. Your Supabase project details

### Step 1: Push to GitHub
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - PairCalm v1.0"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/paircalm.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `dist` (or leave default)

5. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GA_MEASUREMENT_ID=your_google_analytics_id (optional)
   ```

6. Click "Deploy"
7. Wait 2-3 minutes ☕
8. **You're live!** 🎉

### Step 3: Custom Domain (Optional)
1. In Vercel project settings → Domains
2. Add your custom domain (e.g., paircalm.com)
3. Follow DNS configuration instructions
4. SSL certificate is automatic!

---

## 🔧 Environment Variables

### Required (Supabase)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**
- Go to your Supabase project
- Settings → API
- Copy "Project URL" and "anon public" key

### Optional
```env
# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags (for future use)
VITE_ENABLE_BIOMETRIC_INTEGRATION=true
VITE_ENABLE_STRIPE_PAYMENTS=true
```

---

## 📝 Pre-Deployment Checklist

### Database Setup ✅
- [x] All migrations applied
- [x] Row Level Security enabled on all tables
- [x] Sample data loaded (wellness content, rituals, etc.)
- [x] Edge functions deployed:
  - `ai-coach`
  - `message-tone-analysis`
  - `oura-oauth-callback`
  - `oura-sync`
  - `daily-crisis-scoring`
  - `daily-metrics-aggregation`
  - `daily-ritual-reminders`

### External Services
- [ ] **OpenAI API Key** - Add to Supabase Edge Function secrets
  ```bash
  supabase secrets set OPENAI_API_KEY=your_key_here
  ```

- [ ] **Google Analytics** - Create GA4 property at analytics.google.com

- [ ] **Stripe** (if enabling payments)
  - Create Stripe account
  - Add publishable and secret keys to environment

- [ ] **Oura Ring** (if enabling biometric integration)
  - Register for developer access
  - Add client ID and secret to environment

### Scheduled Functions
Set up cron jobs in Supabase:
```sql
-- Run daily at midnight UTC
SELECT cron.schedule(
  'daily-crisis-scoring',
  '0 0 * * *',
  $$ SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/daily-crisis-scoring',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);

-- Run daily at 1am UTC
SELECT cron.schedule(
  'daily-metrics-aggregation',
  '0 1 * * *',
  $$ SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/daily-metrics-aggregation',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);

-- Run daily at 7am UTC (morning reminders)
SELECT cron.schedule(
  'morning-ritual-reminders',
  '0 7 * * *',
  $$ SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/daily-ritual-reminders?time=morning',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);

-- Run daily at 9pm UTC (evening reminders)
SELECT cron.schedule(
  'evening-ritual-reminders',
  '0 21 * * *',
  $$ SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/daily-ritual-reminders?time=evening',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);
```

---

## 🎨 Branding Assets Needed

Before launch, create these assets:

### App Icons
- `icon-192.png` (192x192px) - For PWA and Android
- `icon-512.png` (512x512px) - For PWA and Android
- `favicon.ico` - Browser favicon

**Recommendation:** Use a heart icon in your brand color (rose-500 #f43f5e)

### Social Media
- Open Graph image (1200x630px) for link sharing
- Twitter Card image (1200x600px)

**Tools:**
- Figma (free)
- Canva (free)
- Or hire on Fiverr ($5-20)

---

## 🧪 Testing Before Launch

### Manual Testing
1. **Sign up flow**
   - Create account
   - Verify email works (check Supabase auth settings)
   - Complete onboarding

2. **Core features**
   - Check-in
   - Send partner invitation
   - Accept invitation (use separate browser/incognito)
   - Send message
   - Use AI coach
   - Browse wellness library

3. **Subscription tiers**
   - Verify free tier limitations
   - Test premium content gating

4. **Mobile**
   - Test on actual phone
   - Verify PWA install prompt
   - Check responsive layouts

### Automated Testing
```bash
# Run build to check for errors
npm run build

# Check for TypeScript errors
npm run typecheck
```

---

## 📊 Post-Launch Monitoring

### Analytics to Watch
1. **User Acquisition**
   - Sign-ups per day
   - Conversion rate (visitor → sign-up)
   - Onboarding completion rate

2. **Engagement**
   - Daily active users (DAU)
   - Check-ins per user
   - AI coaching sessions
   - Crisis interventions triggered

3. **Technical**
   - Error rates (check Vercel logs)
   - API response times
   - Database performance (Supabase dashboard)

### Tools
- **Vercel Analytics** - Built-in performance monitoring
- **Google Analytics** - User behavior
- **Supabase Logs** - Database and edge function errors
- **Sentry** (optional) - Advanced error tracking

---

## 🚨 Launch Day Checklist

### Final Steps
- [ ] Test all critical user flows
- [ ] Verify environment variables in Vercel
- [ ] Confirm Supabase database is accessible
- [ ] Test email sending (for invitations, notifications)
- [ ] Add Google Analytics tracking code
- [ ] Set up custom domain (if applicable)
- [ ] Test PWA installation on mobile
- [ ] Verify legal pages load correctly
- [ ] Create first test user account
- [ ] Test partner invitation + acceptance flow

### Marketing Prep
- [ ] Draft launch announcement
- [ ] Prepare social media posts
- [ ] Email beta testers (if applicable)
- [ ] Submit to Product Hunt (optional)
- [ ] Post in relevant communities (r/relationships, therapy forums)

---

## 💰 Cost Estimate

### Free Tier (Perfect for Launch)
- **Vercel:** Free (100GB bandwidth, unlimited requests)
- **Supabase:** Free (500MB database, 50,000 monthly active users)
- **Google Analytics:** Free
- **Domain:** ~$12/year (Google Domains, Namecheap)

**Total: ~$1/month** 🎉

### When You Scale (1000+ users)
- **Vercel Pro:** $20/month
- **Supabase Pro:** $25/month
- **OpenAI API:** ~$50-200/month (depending on usage)
- **Stripe fees:** 2.9% + 30¢ per transaction

**Total: ~$100-250/month** at 1000+ users

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules
rm -rf .turbo
npm install
npm run build
```

### Environment Variables Not Working
- Make sure they start with `VITE_`
- Redeploy after changing environment variables in Vercel
- Check for typos in variable names

### Database Errors
- Verify Supabase URL and anon key are correct
- Check RLS policies aren't blocking legitimate access
- Review Supabase logs for detailed errors

### PWA Not Installing
- Must be served over HTTPS (Vercel does this automatically)
- Check manifest.json is accessible
- Verify service worker is registered

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Router](https://reactrouter.com)

---

## 🎉 You're Ready to Launch!

Your PairCalm platform is **production-ready**. Follow the steps above and you'll be live in under an hour.

**Questions?** Check the Contact page or file an issue on GitHub.

Good luck! 🚀💕
