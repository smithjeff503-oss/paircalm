import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';

export default function Privacy() {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-slate-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              PairCalm ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our relationship support platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Account Information:</strong> Name, email address, password</li>
              <li><strong>Profile Information:</strong> Relationship status, anniversary dates, preferences</li>
              <li><strong>Check-In Data:</strong> Nervous system zones, stress levels, emotional states</li>
              <li><strong>Communication Data:</strong> Messages with your partner, AI coaching conversations</li>
              <li><strong>Conflict Data:</strong> Conflict logs, patterns, resolution attempts</li>
              <li><strong>Journal Entries:</strong> Workbook exercises, reflections, insights</li>
              <li><strong>Payment Information:</strong> Billing details (processed securely via Stripe)</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Usage Data:</strong> Features used, pages visited, time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Analytics:</strong> Google Analytics for understanding user behavior</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">2.3 Biometric Data (Optional)</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Heart Rate:</strong> From connected devices (Bluetooth monitors, Oura Ring)</li>
              <li><strong>HRV:</strong> Heart rate variability</li>
              <li><strong>Sleep Data:</strong> Sleep scores and patterns</li>
              <li><strong>Readiness Scores:</strong> From wearable devices</li>
            </ul>
            <p className="text-slate-700 mt-2 italic">Note: Biometric integration is entirely optional and requires your explicit consent.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-slate-700 leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Provide and improve our relationship support services</li>
              <li>Detect crisis situations and provide timely interventions</li>
              <li>Generate personalized insights and recommendations</li>
              <li>Power AI coaching conversations</li>
              <li>Facilitate communication between partners</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important notifications and updates</li>
              <li>Analyze usage patterns to improve features</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Data Sharing and Disclosure</h2>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-3">
              <p className="text-emerald-900 font-medium">Your Privacy is Our Priority:</p>
              <p className="text-emerald-800">
                We do NOT sell your personal information to third parties. Your relationship data is highly sensitive and we treat it with the utmost confidentiality.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">We May Share Data With:</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Your Partner:</strong> Information you explicitly share within the couple relationship</li>
              <li><strong>Service Providers:</strong> Supabase (database), OpenAI (AI coaching), Stripe (payments)</li>
              <li><strong>Analytics Providers:</strong> Google Analytics (anonymized usage data)</li>
              <li><strong>Therapists:</strong> Only if you book and consent to share data</li>
              <li><strong>Law Enforcement:</strong> When required by law or to prevent harm</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Data Security</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Encryption:</strong> All data transmitted over HTTPS/TLS</li>
              <li><strong>Database Security:</strong> Row Level Security (RLS) in Supabase</li>
              <li><strong>Authentication:</strong> Secure password hashing and session management</li>
              <li><strong>Access Controls:</strong> Strict permissions - you can only access your own data</li>
              <li><strong>Regular Audits:</strong> Security reviews and vulnerability assessments</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3 italic">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Your Rights and Choices</h2>
            <p className="text-slate-700 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Access:</strong> View all data we have about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your data in portable format</li>
              <li><strong>Opt-Out:</strong> Disable notifications, analytics, or biometric tracking</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for data processing at any time</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              To exercise these rights, visit your Profile Settings or contact us at privacy@paircalm.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Data Retention</h2>
            <p className="text-slate-700 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal data within 30 days, except where we must retain it for legal compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Children's Privacy</h2>
            <p className="text-slate-700 leading-relaxed">
              PairCalm is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe a child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">9. International Users</h2>
            <p className="text-slate-700 leading-relaxed">
              PairCalm is based in the United States. By using our service, you consent to the transfer and processing of your data in the U.S., which may have different data protection laws than your country.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">10. Cookies and Tracking</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze site traffic and usage</li>
              <li>Personalize content</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              You can control cookies through your browser settings, but some features may not work properly if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">11. Third-Party Services</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              PairCalm integrates with third-party services. Each has its own privacy policy:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>OpenAI:</strong> AI-powered coaching (conversations are not used for training)</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google Analytics:</strong> Usage analytics</li>
              <li><strong>Oura Ring:</strong> Optional biometric integration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">12. Changes to Privacy Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Your continued use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">13. Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <p className="text-slate-700 mt-2">
              <strong>Email:</strong> privacy@paircalm.com<br />
              <strong>General Support:</strong> support@paircalm.com<br />
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
