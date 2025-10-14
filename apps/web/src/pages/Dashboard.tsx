import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, Activity, MessageCircle, Calendar, TrendingUp, AlertCircle, Zap, Sparkles, Bluetooth, Bot, Shield, Award, Users, BookOpen, User, Wind } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Couple {
  id: string;
  partner_1_id: string;
  partner_2_id: string | null;
  status: string;
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [ouraReadiness, setOuraReadiness] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (profile && !profile.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    loadCouple();
  }, [user, profile, navigate]);

  const loadCouple = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    if (!error && data) {
      setCouple(data);
    }

    await loadOuraReadiness();

    setLoading(false);
  };

  const loadOuraReadiness = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('biometric_readings')
      .select('readiness_score')
      .eq('user_id', user.id)
      .eq('data_source', 'oura_ring')
      .eq('reading_type', 'readiness')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.readiness_score) {
      setOuraReadiness(data.readiness_score);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const hasPartner = couple && couple.partner_2_id && couple.status === 'active';

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
              <span className="text-sm text-slate-600">{profile?.full_name}</span>
              <button
                onClick={handleSignOut}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasPartner && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Partner Not Connected</h3>
              <p className="text-sm text-amber-800 mb-3">
                PairCalm works best when you're both connected. Invite your partner to unlock all features.
              </p>
              <button
                onClick={() => navigate('/invite-partner')}
                className="text-sm font-medium text-amber-900 underline hover:no-underline"
              >
                Send Invitation
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {profile?.full_name}</h1>
          <div className="flex items-center space-x-4">
            <p className="text-slate-600">How are you feeling today?</p>
            {ouraReadiness !== null && (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-2 rounded-full">
                <Zap className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-medium text-slate-700">
                  Readiness: <span className="font-bold text-violet-600">{ouraReadiness}%</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            icon={<Activity className="w-6 h-6 text-emerald-500" />}
            title="Check-In"
            description="Log your current nervous system state"
            onClick={() => navigate('/check-in')}
          />
          <DashboardCard
            icon={<Bluetooth className="w-6 h-6 text-blue-500" />}
            title="Heart Rate Monitor"
            description="Connect live Bluetooth HR tracking"
            onClick={() => navigate('/biometric')}
          />
          <DashboardCard
            icon={<div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />}
            title="Oura Ring"
            description="Track sleep, HRV, and readiness"
            onClick={() => navigate('/oura')}
          />
          <DashboardCard
            icon={<Zap className="w-6 h-6 text-amber-500" />}
            title="Conflict Tracker"
            description="Track and de-escalate active conflicts"
            onClick={() => navigate('/conflict-tracker')}
          />
          <DashboardCard
            icon={<Bot className="w-6 h-6 text-blue-500" />}
            title="AI Coach"
            description="Real-time conflict coaching and support"
            onClick={() => navigate('/ai-coach')}
          />
          <DashboardCard
            icon={<Sparkles className="w-6 h-6 text-violet-500" />}
            title="Message Rewrite"
            description="AI-assisted communication tools"
            onClick={() => navigate('/message-rewrite')}
          />
          <DashboardCard
            icon={<Heart className="w-6 h-6 text-rose-500" />}
            title="Repair Tools"
            description="Guided scripts and accountability prompts"
            onClick={() => navigate('/repair')}
          />
          <DashboardCard
            icon={<MessageCircle className="w-6 h-6 text-sky-500" />}
            title="Messages"
            description="Communicate safely with your partner"
            onClick={() => navigate('/messages')}
            disabled={!hasPartner}
          />
          <DashboardCard
            icon={<TrendingUp className="w-6 h-6 text-teal-500" />}
            title="Insights"
            description="View your relationship patterns and progress"
            onClick={() => navigate('/insights')}
          />
          <DashboardCard
            icon={<Shield className="w-6 h-6 text-rose-600" />}
            title="Crisis Support"
            description="Emergency intervention and crisis hotlines"
            onClick={() => navigate('/crisis')}
          />
          <DashboardCard
            icon={<Award className="w-6 h-6 text-amber-500" />}
            title="Daily Rituals"
            description="Build connection through daily practices"
            onClick={() => navigate('/rituals')}
            disabled={!hasPartner}
          />
          <DashboardCard
            icon={<Users className="w-6 h-6 text-purple-500" />}
            title="Find a Therapist"
            description="Connect with licensed couples therapists"
            onClick={() => navigate('/therapists')}
          />
          <DashboardCard
            icon={<BookOpen className="w-6 h-6 text-indigo-500" />}
            title="Relationship Workbook"
            description="Gottman Method exercises for healing"
            onClick={() => navigate('/workbook')}
            disabled={!hasPartner}
          />
          <DashboardCard
            icon={<Users className="w-6 h-6 text-blue-500" />}
            title="Community"
            description="Share stories and get support"
            onClick={() => navigate('/community')}
          />
          <DashboardCard
            icon={<User className="w-6 h-6 text-slate-700" />}
            title="Profile & Achievements"
            description="View your progress and badges"
            onClick={() => navigate('/profile')}
          />
          <DashboardCard
            icon={<Wind className="w-6 h-6 text-cyan-500" />}
            title="Wellness Library"
            description="Breathwork, meditation, qigong, and more"
            onClick={() => navigate('/wellness')}
          />
        </div>

        {hasPartner && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <div className="text-slate-600 text-center py-8">
              No recent activity. Start by doing a check-in or sending a message to your partner.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

function DashboardCard({ icon, title, description, onClick, disabled }: DashboardCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-left transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </button>
  );
}
