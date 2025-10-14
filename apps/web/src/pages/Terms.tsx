import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-rose-500" />
              <span className="text-lg font-bold text-slate-900">PairCalm</span>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <p className="text-sm text-slate-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing and using PairCalm, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              PairCalm provides relationship support tools including:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Crisis detection and intervention resources</li>
              <li>AI-powered coaching and communication analysis</li>
              <li>Biometric tracking integration</li>
              <li>Wellness content library (breathwork, meditation, etc.)</li>
              <li>Relationship rituals and exercises</li>
              <li>Therapist marketplace and booking</li>
              <li>Progress tracking and insights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Not a Substitute for Professional Help</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
              <p className="text-amber-900 font-medium">IMPORTANT:</p>
              <p className="text-amber-800">
                PairCalm is NOT a substitute for professional mental health care, therapy, or emergency services. If you or your partner are experiencing a mental health emergency, domestic violence, or thoughts of self-harm, please contact emergency services immediately.
              </p>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Crisis hotlines are provided in our app for immediate support. Our AI coaching and content are supplementary tools only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. User Accounts</h2>
            <p className="text-slate-700 leading-relaxed mb-3">You are responsible for:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Providing accurate and truthful information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Subscription and Billing</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              PairCalm offers free and paid subscription tiers:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Free tier with limited features</li>
              <li>Premium tier ($14.99/month or $149.99/year)</li>
              <li>Couples+ tier ($24.99/month or $249.99/year)</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Subscriptions automatically renew unless cancelled. You may cancel anytime from your profile settings. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Acceptable Use</h2>
            <p className="text-slate-700 leading-relaxed mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Use the service for any illegal purpose</li>
              <li>Harass, abuse, or harm another person</li>
              <li>Impersonate any person or entity</li>
              <li>Upload malicious code or attempt to breach security</li>
              <li>Share your account with others</li>
              <li>Scrape, copy, or redistribute our content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Privacy and Data</h2>
            <p className="text-slate-700 leading-relaxed">
              Your privacy is important to us. Please review our <button onClick={() => navigate('/privacy')} className="text-rose-500 hover:underline font-medium">Privacy Policy</button> to understand how we collect, use, and protect your data. By using PairCalm, you consent to our data practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Intellectual Property</h2>
            <p className="text-slate-700 leading-relaxed">
              All content, features, and functionality of PairCalm are owned by us and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our explicit permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-slate-700 leading-relaxed">
              PairCalm is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or secure. Use at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">10. Limitation of Liability</h2>
            <p className="text-slate-700 leading-relaxed">
              To the fullest extent permitted by law, PairCalm shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid us in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">11. Termination</h2>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violations of these Terms, illegal activity, or any reason at our discretion. You may also delete your account at any time from your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">12. Changes to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update these Terms of Service at any time. We will notify you of significant changes via email or in-app notification. Continued use of PairCalm after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">13. Governing Law</h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">14. Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-slate-700 mt-2">
              <strong>Email:</strong> support@paircalm.com<br />
              <strong>Website:</strong> paircalm.com
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-rose-500 hover:text-rose-600 font-medium"
          >
            Return to Home
          </button>
        </div>
      </main>
    </div>
  );
}
