import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Sparkles, Calendar, Award, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ritualsService, Ritual, RitualStreak } from '../lib/rituals';
import { messagingService } from '../lib/messaging';

export default function Rituals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [streaks, setStreaks] = useState<RitualStreak[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    initialize();
  }, [user]);

  const initialize = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const couple = await messagingService.getCouple(user.id);
      if (couple) {
        setCoupleId(couple.id);
        const [ritualsData, streaksData] = await Promise.all([
          ritualsService.getAllRituals(),
          ritualsService.getStreaks(couple.id),
        ]);
        setRituals(ritualsData);
        setStreaks(streaksData);
      }
    } catch (error) {
      console.error('Error initializing rituals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedRitual || !coupleId || !user || !response.trim() || submitting) return;

    setSubmitting(true);
    try {
      const success = await ritualsService.completeRitual(
        selectedRitual.id,
        coupleId,
        user.id,
        response
      );
      if (success) {
        setResponse('');
        setSelectedRitual(null);
        const streaksData = await ritualsService.getStreaks(coupleId);
        setStreaks(streaksData);
      }
    } catch (error) {
      console.error('Error completing ritual:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStreakForRitual = (ritualId: string) => {
    return streaks.find(s => s.ritual_id === ritualId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Daily Rituals</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Heart className="w-6 h-6" />
            <h2 className="text-xl font-bold">Build Connection Daily</h2>
          </div>
          <p className="text-rose-50">
            Small, consistent rituals strengthen your relationship during calm moments
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {rituals.map((ritual) => {
            const streak = getStreakForRitual(ritual.id);
            return (
              <div
                key={ritual.id}
                onClick={() => setSelectedRitual(ritual)}
                className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-blue-400 cursor-pointer transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{ritual.title}</h3>
                    <p className="text-sm text-slate-600 capitalize">{ritual.category}</p>
                  </div>
                  {streak && streak.current_streak > 0 && (
                    <div className="flex items-center space-x-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                      <Award className="w-3 h-3" />
                      <span>{streak.current_streak} day{streak.current_streak !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-700 mb-3">{ritual.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{ritual.frequency}</span>
                  </span>
                  <span>{ritual.duration_minutes} min</span>
                </div>
                {streak && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                    Best streak: {streak.longest_streak} days • Total: {streak.total_completions}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {selectedRitual && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedRitual.title}</h3>
                <p className="text-sm text-slate-600">{selectedRitual.description}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedRitual(null);
                  setResponse('');
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 font-medium mb-2">Today's Prompt:</p>
              <p className="text-blue-800">{selectedRitual.prompt}</p>
            </div>

            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Share your response..."
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={handleComplete}
              disabled={!response.trim() || submitting}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Completing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Complete Ritual</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
