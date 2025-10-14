import { Link } from 'react-router-dom';
import { Heart, Zap, Shield, TrendingUp } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-rose-500" />
              <span className="text-2xl font-bold text-slate-900">PairCalm</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-full font-medium transition-all shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Repair Faster,
            <br />
            <span className="text-rose-500">Regulate Together</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            The first nervous system regulation app for couples. De-escalate conflict,
            track patterns, and build connection through science-backed tools.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Start Your Journey
          </Link>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-amber-500" />}
              title="Live De-escalation"
              description="Pause buttons, breathing guides, and AI-assisted message rewrites when tensions rise."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8 text-emerald-500" />}
              title="Pattern Tracking"
              description="Understand your conflict cycles, triggers, and nervous system patterns over time."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-500" />}
              title="Safe Repair Tools"
              description="Guided scripts, accountability prompts, and shared calendar for emotional safety."
            />
          </div>
        </section>

        <section className="bg-white border-t border-slate-200 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Not Another Date Night App
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              This is relationship regulation meets real psychology. Built on polyvagal theory,
              Gottman research, and attachment science.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-600">
              <span className="px-4 py-2 bg-slate-100 rounded-full">Biometric Tracking</span>
              <span className="px-4 py-2 bg-slate-100 rounded-full">AI Conflict Analysis</span>
              <span className="px-4 py-2 bg-slate-100 rounded-full">Somatic Tools</span>
              <span className="px-4 py-2 bg-slate-100 rounded-full">Repair Scripts</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-6 h-6 text-rose-500" />
                <span className="text-lg font-bold text-slate-900">PairCalm</span>
              </div>
              <p className="text-sm text-slate-600">
                Real-time relationship support with crisis detection and nervous system regulation.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button onClick={() => navigate('/signup')} className="hover:text-slate-900">Sign Up</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-slate-900">Log In</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button onClick={() => navigate('/contact')} className="hover:text-slate-900">About & Contact</button></li>
                <li><button onClick={() => navigate('/contact')} className="hover:text-slate-900">Partner With Us</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button onClick={() => navigate('/privacy')} className="hover:text-slate-900">Privacy Policy</button></li>
                <li><button onClick={() => navigate('/terms')} className="hover:text-slate-900">Terms of Service</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 text-center text-slate-500 text-sm">
            <p>© 2025 PairCalm. Helping couples regulate together.</p>
            <p className="mt-2 text-xs">Not a substitute for professional therapy or emergency services.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-slate-200">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
