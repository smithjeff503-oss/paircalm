import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Calendar, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { therapistService, TherapistProfile } from '../lib/analytics';
import { messagingService } from '../lib/messaging';

export default function Therapists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistProfile | null>(null);

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
      }
      const therapistsData = await therapistService.getTherapists();
      setTherapists(therapistsData);
    } catch (error) {
      console.error('Error initializing therapists page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (therapist: TherapistProfile) => {
    if (!coupleId) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const session = await therapistService.bookSession(
      therapist.id,
      coupleId,
      tomorrow.toISOString(),
      'couple'
    );

    if (session) {
      alert('Session booked successfully!');
      setSelectedTherapist(null);
    }
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
            <h1 className="text-lg font-semibold text-slate-900">Find a Therapist</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-2">Professional Support</h2>
          <p className="text-purple-50">
            Connect with licensed therapists specializing in couples therapy
          </p>
        </div>

        <div className="space-y-4">
          {therapists.map((therapist) => (
            <div
              key={therapist.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{therapist.full_name}</h3>
                  <p className="text-sm text-slate-600">{therapist.credentials}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium">{therapist.rating.toFixed(1)}</span>
                    <span className="text-sm text-slate-500">({therapist.total_sessions} sessions)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">${therapist.session_rate_usd}</div>
                  <div className="text-xs text-slate-500">per session</div>
                </div>
              </div>

              <p className="text-sm text-slate-700 mb-4">{therapist.bio}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {therapist.specializations.map((spec, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {therapist.years_experience} years experience
                </div>
                <button
                  onClick={() => setSelectedTherapist(therapist)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Session</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedTherapist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Book with {selectedTherapist.full_name}</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will book a 50-minute couples therapy session for tomorrow at 10:00 AM.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedTherapist(null)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBook(selectedTherapist)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
