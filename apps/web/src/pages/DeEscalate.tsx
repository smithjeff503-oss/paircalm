import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, ArrowLeft, Wind, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const breathingExercises = [
  {
    name: 'Box Breathing',
    description: '4 seconds in, 4 hold, 4 out, 4 hold',
    duration: 4,
    pattern: ['Breathe In', 'Hold', 'Breathe Out', 'Hold'],
  },
  {
    name: '4-7-8 Technique',
    description: 'Deep calming breath',
    duration: 4,
    pattern: ['Breathe In (4s)', 'Hold (7s)', 'Breathe Out (8s)', 'Rest'],
  },
];

const repairScripts = [
  {
    category: 'Pause Request',
    script: "I'm feeling overwhelmed and need a break. Can we pause for [X] minutes and come back to this?",
  },
  {
    category: 'Taking Responsibility',
    script: "I realize I was [behavior]. That wasn't fair to you. I'm working on regulating myself.",
  },
  {
    category: 'Validation',
    script: "I hear that you're feeling [emotion]. That makes sense given [situation].",
  },
];

export default function DeEscalate() {
  const [activeTab, setActiveTab] = useState<'breathing' | 'timeout' | 'scripts'>('breathing');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState(0);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const [selectedScript, setSelectedScript] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const conflictId = location.state?.conflictId;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (breathingActive) {
      interval = setInterval(() => {
        setBreathingPhase((prev) => (prev + 1) % 4);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [breathingActive]);

  const logDeEscalation = async (type: 'breathing' | 'timeout' | 'script', message?: string) => {
    if (!user || !conflictId) return;

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    if (!coupleData) return;

    await supabase.from('de_escalation_attempts').insert({
      conflict_id: conflictId,
      user_id: user.id,
      couple_id: coupleData.id,
      intervention_type: type,
      request_message: message || null,
      duration_minutes: type === 'timeout' ? timeoutMinutes : null,
    });
  };

  const handleBreathingComplete = async () => {
    setBreathingActive(false);
    await logDeEscalation('breathing');
  };

  const handleRequestTimeout = async () => {
    setLoading(true);
    await logDeEscalation('timeout', `Requesting ${timeoutMinutes} minute timeout`);
    setLoading(false);
    navigate('/conflict-tracker');
  };

  const handleUseScript = async () => {
    if (!selectedScript) return;
    setLoading(true);
    await logDeEscalation('script', selectedScript);
    setLoading(false);
    navigate('/conflict-tracker');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/conflict-tracker')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <Wind className="w-6 h-6 text-blue-500" />
              <span className="font-semibold text-slate-900">De-Escalate</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Let's Regulate Together</h1>
          <p className="text-slate-600">Choose a tool to help bring your nervous system back to green</p>
        </div>

        <div className="flex space-x-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('breathing')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'breathing'
                ? 'border-b-2 border-rose-500 text-rose-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Breathing
          </button>
          <button
            onClick={() => setActiveTab('timeout')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'timeout'
                ? 'border-b-2 border-rose-500 text-rose-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timeout
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'scripts'
                ? 'border-b-2 border-rose-500 text-rose-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scripts
          </button>
        </div>

        {activeTab === 'breathing' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            {!breathingActive ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Breathing Exercises</h3>
                  <p className="text-slate-600">Activate your parasympathetic nervous system</p>
                </div>

                {breathingExercises.map((exercise) => (
                  <button
                    key={exercise.name}
                    onClick={() => setBreathingActive(true)}
                    className="w-full text-left px-6 py-5 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="font-semibold text-slate-900 mb-1">{exercise.name}</div>
                    <div className="text-sm text-slate-600">{exercise.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-8">
                <div className="relative w-48 h-48 mx-auto">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wind className="w-16 h-16 text-blue-500" />
                  </div>
                </div>

                <div>
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    {breathingExercises[0].pattern[breathingPhase]}
                  </div>
                  <div className="text-slate-600">Follow the rhythm</div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setBreathingActive(false)}
                    className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Stop
                  </button>
                  <button
                    onClick={handleBreathingComplete}
                    className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                  >
                    I Feel Better
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeout' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Request a Timeout</h3>
              <p className="text-slate-600">
                Take a break to regulate before continuing the conversation
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  Research shows it takes 20+ minutes for the nervous system to fully regulate after conflict
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                How long do you need?
              </label>
              <div className="flex space-x-2">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setTimeoutMinutes(mins)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                      timeoutMinutes === mins
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRequestTimeout}
              disabled={loading}
              className="w-full py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Timeout Request'}
            </button>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Repair Scripts</h3>
              <p className="text-slate-600">Pre-written messages to communicate safely</p>
            </div>

            <div className="space-y-3">
              {repairScripts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedScript(item.script)}
                  className={`w-full text-left px-5 py-4 border-2 rounded-xl transition-all ${
                    selectedScript === item.script
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-medium text-slate-900 mb-1">{item.category}</div>
                  <div className="text-sm text-slate-600">{item.script}</div>
                </button>
              ))}
            </div>

            <button
              onClick={handleUseScript}
              disabled={!selectedScript || loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-5 h-5" />
              <span>{loading ? 'Sending...' : 'Use This Script'}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
