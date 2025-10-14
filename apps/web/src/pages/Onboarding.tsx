import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const attachmentStyles = [
  {
    value: 'secure',
    label: 'Secure',
    description: 'Comfortable with intimacy and independence',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    description: 'Crave closeness, worry about abandonment',
  },
  {
    value: 'avoidant',
    label: 'Avoidant',
    description: 'Value independence, uncomfortable with too much closeness',
  },
  {
    value: 'fearful-avoidant',
    label: 'Fearful-Avoidant',
    description: 'Want closeness but fear getting hurt',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [attachmentStyle, setAttachmentStyle] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleComplete = async () => {
    if (!user || !attachmentStyle) return;

    setLoading(true);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        attachment_style: attachmentStyle,
        timezone,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      setLoading(false);
      return;
    }

    await refreshProfile();
    navigate('/invite-partner');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center items-center space-x-2 mb-6">
          <Heart className="w-10 h-10 text-rose-500" />
          <span className="text-3xl font-bold text-slate-900">PairCalm</span>
        </div>
        <h2 className="text-center text-3xl font-bold text-slate-900 mb-2">
          {step === 1 ? 'Tell us about yourself' : 'Almost done!'}
        </h2>
        <p className="text-center text-slate-600">
          {step === 1
            ? 'Understanding your attachment style helps us personalize your experience'
            : 'Review your profile and finish setup'}
        </p>

        <div className="flex justify-center mt-8 mb-8">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-rose-500' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
              2
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 shadow-lg rounded-2xl sm:px-10 border border-slate-200">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Which attachment style resonates most with you?
                </label>
                <div className="space-y-3">
                  {attachmentStyles.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setAttachmentStyle(style.value)}
                      className={`w-full text-left px-4 py-4 border-2 rounded-lg transition-all ${
                        attachmentStyle === style.value
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-medium text-slate-900">{style.label}</div>
                      <div className="text-sm text-slate-600 mt-1">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-700 mb-2">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value={timezone}>{timezone}</option>
                </select>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!attachmentStyle}
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Attachment Style</div>
                  <div className="text-lg text-slate-900 mt-1">
                    {attachmentStyles.find((s) => s.value === attachmentStyle)?.label}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Timezone</div>
                  <div className="text-lg text-slate-900 mt-1">{timezone}</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
