import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, AlertTriangle, Play, Pause, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const conflictTopics = [
  'Money & Finances',
  'Household Chores',
  'Intimacy & Sex',
  'Family & In-Laws',
  'Work-Life Balance',
  'Parenting',
  'Communication',
  'Trust & Boundaries',
  'Other',
];

interface ActiveConflict {
  id: string;
  started_at: string;
  topic: string;
  intensity_level: number;
}

export default function ConflictTracker() {
  const [step, setStep] = useState<'check' | 'start' | 'active'>('check');
  const [activeConflict, setActiveConflict] = useState<ActiveConflict | null>(null);
  const [topic, setTopic] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkForActiveConflict();
  }, []);

  const checkForActiveConflict = async () => {
    if (!user) return;

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    if (!coupleData) {
      setLoading(false);
      return;
    }

    const { data: conflictData } = await supabase
      .from('conflicts')
      .select('*')
      .eq('couple_id', coupleData.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .maybeSingle();

    if (conflictData) {
      setActiveConflict(conflictData);
      setStep('active');
    }

    setLoading(false);
  };

  const startConflict = async () => {
    if (!user || !topic) return;

    setLoading(true);

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    if (!coupleData) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('conflicts')
      .insert({
        couple_id: coupleData.id,
        initiated_by: user.id,
        status: 'active',
        topic,
        intensity_level: intensity,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting conflict:', error);
      setLoading(false);
      return;
    }

    setActiveConflict(data);
    setStep('active');
    setLoading(false);
  };

  const pauseConflict = async () => {
    if (!activeConflict) return;

    setLoading(true);

    const { error } = await supabase
      .from('conflicts')
      .update({ status: 'paused' })
      .eq('id', activeConflict.id);

    if (error) {
      console.error('Error pausing conflict:', error);
      setLoading(false);
      return;
    }

    navigate('/de-escalate', { state: { conflictId: activeConflict.id } });
  };

  const endConflict = async (resolution: 'resolved' | 'unresolved') => {
    if (!activeConflict) return;

    setLoading(true);

    const endedAt = new Date();
    const startedAt = new Date(activeConflict.started_at);
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    const { error } = await supabase
      .from('conflicts')
      .update({
        status: resolution === 'resolved' ? 'resolved' : 'unresolved',
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', activeConflict.id);

    if (error) {
      console.error('Error ending conflict:', error);
      setLoading(false);
      return;
    }

    if (resolution === 'resolved') {
      navigate('/repair', { state: { conflictId: activeConflict.id } });
    } else {
      navigate('/dashboard');
    }
  };

  if (loading && step === 'check') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <span className="font-semibold text-slate-900">Conflict Tracker</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'check' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="text-center mb-6">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Track This Conflict?</h2>
              <p className="text-slate-600">
                Tracking helps identify patterns and provides de-escalation tools when you need them
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep('start')}
                className="w-full py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
              >
                Yes, Track This
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Not Right Now
              </button>
            </div>
          </div>
        )}

        {step === 'start' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">What's This About?</h2>
              <p className="text-slate-600">Help us understand the context</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              >
                <option value="">Select a topic...</option>
                {conflictTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Intensity Level: {intensity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Mild</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('check')}
                className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={startConflict}
                disabled={!topic || loading}
                className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting...' : 'Start Tracking'}
              </button>
            </div>
          </div>
        )}

        {step === 'active' && activeConflict && (
          <div className="space-y-4">
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                  <span className="font-semibold text-rose-900">Active Conflict</span>
                </div>
                <span className="text-sm text-rose-700">
                  {Math.round((new Date().getTime() - new Date(activeConflict.started_at).getTime()) / 60000)} min
                </span>
              </div>
              <div className="text-lg font-medium text-slate-900 mb-1">{activeConflict.topic}</div>
              <div className="text-sm text-slate-600">Intensity: {activeConflict.intensity_level}/10</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">Need Help?</h3>

              <button
                onClick={pauseConflict}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
              >
                <Pause className="w-5 h-5" />
                <span>Take a Pause</span>
              </button>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600 mb-3">Ready to end this conflict?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => endConflict('resolved')}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Resolved - Start Repair</span>
                  </button>
                  <button
                    onClick={() => endConflict('unresolved')}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    <span>End Without Resolution</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
