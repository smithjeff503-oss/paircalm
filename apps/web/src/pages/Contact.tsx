import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Mail, MessageCircle, AlertCircle } from 'lucide-react';

export default function Contact() {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Contact Us</h1>
        <p className="text-lg text-slate-600 mb-8">We're here to help and answer any questions you might have</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 rounded-lg">
                <Mail className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">General Support</h3>
                <p className="text-sm text-slate-600">Questions, feedback, technical issues</p>
              </div>
            </div>
            <a href="mailto:support@paircalm.com" className="text-rose-500 hover:underline font-medium">
              support@paircalm.com
            </a>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Privacy & Data</h3>
                <p className="text-sm text-slate-600">Data requests, privacy concerns</p>
              </div>
            </div>
            <a href="mailto:privacy@paircalm.com" className="text-indigo-500 hover:underline font-medium">
              privacy@paircalm.com
            </a>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Partnerships</h3>
                <p className="text-sm text-slate-600">Therapists, integrations, business</p>
              </div>
            </div>
            <a href="mailto:partners@paircalm.com" className="text-emerald-500 hover:underline font-medium">
              partners@paircalm.com
            </a>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Crisis Resources</h3>
                <p className="text-sm text-slate-600">If you're in immediate danger</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-slate-700"><strong>988 Suicide & Crisis Lifeline:</strong> Call/Text 988</p>
              <p className="text-slate-700"><strong>Domestic Violence Hotline:</strong> 1-800-799-7233</p>
              <p className="text-slate-700"><strong>Emergency:</strong> 911</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">About PairCalm</h2>

          <div className="space-y-4 text-slate-700 leading-relaxed">
            <p>
              PairCalm is a comprehensive relationship support platform that combines modern technology with evidence-based approaches to help couples thrive.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Our Mission</h3>
            <p>
              To provide real-time, accessible relationship support that prevents crises before they happen and helps couples build lasting, healthy connections.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">What We Offer</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Crisis Detection:</strong> AI-powered early warning system for relationship distress</li>
              <li><strong>Nervous System Tracking:</strong> Monitor your regulation state in real-time</li>
              <li><strong>AI Coaching:</strong> Get immediate support based on Gottman Method principles</li>
              <li><strong>Biometric Integration:</strong> Connect Oura Ring, heart rate monitors for deeper insights</li>
              <li><strong>Wellness Library:</strong> Breathwork, meditation, qigong, binaural beats, and more</li>
              <li><strong>Daily Rituals:</strong> Build connection through consistent practices</li>
              <li><strong>Therapist Marketplace:</strong> Find and book qualified couples therapists</li>
              <li><strong>Relationship Workbook:</strong> Gottman Method exercises for growth</li>
              <li><strong>Community Support:</strong> Anonymous support from others on the same journey</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Evidence-Based Approach</h3>
            <p>
              Our platform is built on the Gottman Method, developed by Drs. John and Julie Gottman through 40+ years of research. We also integrate nervous system regulation principles from polyvagal theory and somatic therapy.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Privacy & Security</h3>
            <p>
              Your relationship data is highly sensitive. We use bank-level encryption, implement Row Level Security, and will never sell your data to third parties. You maintain full control over your information.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Not a Substitute for Therapy</h3>
            <p className="italic">
              PairCalm is a supplementary tool to support your relationship wellness. It is not a replacement for professional therapy, mental health treatment, or emergency services.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center space-x-4">
          <button
            onClick={() => navigate('/terms')}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Terms of Service
          </button>
          <span className="text-slate-400">•</span>
          <button
            onClick={() => navigate('/privacy')}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Privacy Policy
          </button>
          <span className="text-slate-400">•</span>
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
