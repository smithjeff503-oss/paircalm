import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, ArrowLeft, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const repairTypes = [
  {
    value: 'apology',
    label: 'Apology',
    icon: '🙏',
    scripts: [
      "I'm sorry for [specific behavior]. That wasn't fair to you.",
      "I take responsibility for [action]. I can see how that hurt you.",
      "I was wrong to [behavior]. I'm working on being more aware of that.",
    ],
  },
  {
    value: 'validation',
    label: 'Validation',
    icon: '💚',
    scripts: [
      "I hear that you felt [emotion]. That makes complete sense.",
      "Your feelings about [situation] are valid. I understand why you felt that way.",
      "I can see how [action] affected you. Your reaction makes sense to me.",
    ],
  },
  {
    value: 'accountability',
    label: 'Accountability',
    icon: '⚖️',
    scripts: [
      "Going forward, I will [specific action] instead of [old behavior].",
      "I'm committed to [change]. Please let me know if I slip back into [pattern].",
      "To repair this, I want to [concrete action]. What else would help?",
    ],
  },
  {
    value: 'reconnection',
    label: 'Reconnection',
    icon: '🤝',
    scripts: [
      "Can we start over? I miss feeling connected to you.",
      "I don't want this conflict to define us. Can we find our way back?",
      "I care about you and our relationship. Let's work through this together.",
    ],
  },
];

export default function RepairTools() {
  const [selectedType, setSelectedType] = useState('');
  const [selectedScript, setSelectedScript] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [partnerResponse, setPartnerResponse] = useState('');
  const [step, setStep] = useState<'select' | 'craft' | 'send' | 'complete'>('select');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const conflictId = location.state?.conflictId;

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setStep('craft');
  };

  const handleSendRepair = async () => {
    if (!user || (!selectedScript && !customMessage)) return;

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

    const { error } = await supabase.from('repair_attempts').insert({
      conflict_id: conflictId || null,
      user_id: user.id,
      couple_id: coupleData.id,
      repair_type: selectedType,
      repair_script_used: selectedScript || null,
      repair_message: customMessage || selectedScript,
      felt_complete: false,
    });

    if (error) {
      console.error('Error saving repair:', error);
      setLoading(false);
      return;
    }

    if (conflictId) {
      await supabase
        .from('conflicts')
        .update({ status: 'de_escalated' })
        .eq('id', conflictId);
    }

    setLoading(false);
    setStep('complete');
  };

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
              <Heart className="w-6 h-6 text-rose-500" />
              <span className="font-semibold text-slate-900">Repair Tools</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'select' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Repair Your Connection</h1>
              <p className="text-slate-600">
                Choose the type of repair that feels right for this moment
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {repairTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleSelectType(type.value)}
                  className="bg-white rounded-2xl p-6 shadow-sm border-2 border-slate-200 hover:border-rose-300 hover:shadow-md transition-all text-left"
                >
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{type.label}</h3>
                  <p className="text-sm text-slate-600">
                    {type.scripts[0].substring(0, 50)}...
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'craft' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <button
                onClick={() => setStep('select')}
                className="text-sm text-slate-600 hover:text-slate-900 mb-4"
              >
                ← Change repair type
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {repairTypes.find((t) => t.value === selectedType)?.label} Repair
              </h2>
              <p className="text-slate-600">Choose a script or write your own</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Suggested Scripts
              </label>
              <div className="space-y-2">
                {repairTypes
                  .find((t) => t.value === selectedType)
                  ?.scripts.map((script, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedScript(script);
                        setCustomMessage('');
                      }}
                      className={`w-full text-left px-4 py-3 border-2 rounded-lg transition-all ${
                        selectedScript === script
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className="text-slate-800">{script}</p>
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Or Write Your Own
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  setSelectedScript('');
                }}
                rows={4}
                placeholder="What do you want to say?"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={() => setStep('send')}
              disabled={!selectedScript && !customMessage}
              className="w-full py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'send' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Your Repair</h2>
              <p className="text-slate-600">Make sure this feels authentic to you</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <p className="text-slate-800 leading-relaxed">
                {customMessage || selectedScript}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Remember:</strong> Repair is most effective when it's genuine, specific, and followed by changed
                behavior. It's okay if it doesn't feel perfect.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('craft')}
                className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleSendRepair}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{loading ? 'Sending...' : 'Send Repair'}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Repair Sent</h2>
            <p className="text-slate-600 mb-6">
              You've taken an important step toward reconnection. Repair takes courage.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/check-in')}
                className="w-full py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Do a Check-In
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
