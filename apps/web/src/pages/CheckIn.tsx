import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, CheckCircle2, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { biometricService, BiometricReading } from '../lib/biometric';

const nervousSystemZones = [
  {
    value: 'green',
    label: 'Green Zone',
    description: 'Calm, connected, able to think clearly',
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    bgLight: 'bg-emerald-50',
  },
  {
    value: 'yellow',
    label: 'Yellow Zone',
    description: 'Activated, tense, starting to feel triggered',
    color: 'bg-amber-500',
    borderColor: 'border-amber-500',
    bgLight: 'bg-amber-50',
  },
  {
    value: 'red',
    label: 'Red Zone',
    description: 'Dysregulated, overwhelmed, fight/flight/freeze',
    color: 'bg-rose-500',
    borderColor: 'border-rose-500',
    bgLight: 'bg-rose-50',
  },
];

const emotionalStates = [
  'Calm', 'Anxious', 'Angry', 'Sad', 'Happy', 'Frustrated',
  'Peaceful', 'Overwhelmed', 'Content', 'Irritated', 'Loved', 'Disconnected'
];

const physicalSensations = [
  'Relaxed', 'Tight chest', 'Shallow breathing', 'Racing heart',
  'Tense shoulders', 'Nauseous', 'Grounded', 'Shaky', 'Heavy', 'Light'
];

export default function CheckIn() {
  const [step, setStep] = useState(1);
  const [zone, setZone] = useState<string>('');
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [biometricConnected, setBiometricConnected] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (biometricService.isConnected()) {
      setBiometricConnected(true);
      biometricService.onReading((reading: BiometricReading) => {
        if (reading.heartRate) {
          setCurrentHeartRate(reading.heartRate);
        }
      });
    }
  }, []);

  const toggleSelection = (item: string, list: string[], setter: (items: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    const { error } = await supabase.from('check_ins').insert({
      user_id: user.id,
      couple_id: coupleData?.id || null,
      check_in_type: 'daily',
      nervous_system_zone: zone,
      stress_level: stressLevel,
      emotional_state: selectedEmotions,
      physical_sensations: selectedSensations,
      notes: notes || null,
      heart_rate: currentHeartRate,
      biometric_source: biometricConnected ? 'bluetooth_device' : null,
    });

    if (currentHeartRate && !error) {
      await supabase.from('biometric_readings').insert({
        user_id: user.id,
        couple_id: coupleData?.id || null,
        reading_type: 'heart_rate',
        heart_rate: currentHeartRate,
        data_source: 'bluetooth_device',
      });
    }

    if (error) {
      console.error('Error saving check-in:', error);
      setLoading(false);
      return;
    }

    setComplete(true);
    setLoading(false);
  };

  if (complete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check-In Complete</h2>
            <p className="text-slate-600 mb-6">
              Your nervous system state has been logged. Keep tracking to identify patterns.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-6 py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-rose-500" />
              <span className="font-semibold text-slate-900">Check-In</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {biometricConnected && currentHeartRate && (
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm text-slate-600">Live Heart Rate</div>
                  <div className="text-2xl font-bold text-slate-900">{currentHeartRate} bpm</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/biometric')}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Manage Device
              </button>
            </div>
          </div>
        )}

        {!biometricConnected && (
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <Activity className="w-4 h-4 inline mr-1" />
                Connect a heart rate monitor for automatic tracking
              </div>
              <button
                onClick={() => navigate('/biometric')}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-rose-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600">Step {step} of 4</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">How's your nervous system?</h2>
                <p className="text-slate-600">Choose the zone that best describes your current state</p>
              </div>

              <div className="space-y-3">
                {nervousSystemZones.map((z) => (
                  <button
                    key={z.value}
                    onClick={() => setZone(z.value)}
                    className={`w-full text-left px-6 py-5 border-2 rounded-xl transition-all ${
                      zone === z.value
                        ? `${z.borderColor} ${z.bgLight}`
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${z.color}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{z.label}</div>
                        <div className="text-sm text-slate-600 mt-1">{z.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!zone}
                className="w-full py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Stress Level</h2>
                <p className="text-slate-600">Rate your current stress from 1 (calm) to 10 (overwhelmed)</p>
              </div>

              <div className="space-y-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900">{stressLevel}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {stressLevel <= 3 && 'Calm and regulated'}
                    {stressLevel > 3 && stressLevel <= 7 && 'Moderate stress'}
                    {stressLevel > 7 && 'High stress'}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Emotional State</h2>
                <p className="text-slate-600">Select all emotions you're experiencing</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {emotionalStates.map((emotion) => (
                  <button
                    key={emotion}
                    onClick={() => toggleSelection(emotion, selectedEmotions, setSelectedEmotions)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedEmotions.includes(emotion)
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {emotion}
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Physical Sensations</h2>
                <p className="text-slate-600">Select what you're feeling in your body</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {physicalSensations.map((sensation) => (
                  <button
                    key={sensation}
                    onClick={() => toggleSelection(sensation, selectedSensations, setSelectedSensations)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedSensations.includes(sensation)
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sensation}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional thoughts or context..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Complete Check-In'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
