import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Phone,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Heart,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  crisisService,
  CrisisScore,
  CrisisIntervention,
  CrisisHotline,
  CoolingOffPeriod,
} from '../lib/crisis';
import { messagingService } from '../lib/messaging';

export default function Crisis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [crisisScore, setCrisisScore] = useState<CrisisScore | null>(null);
  const [interventions, setInterventions] = useState<CrisisIntervention[]>([]);
  const [hotlines, setHotlines] = useState<CrisisHotline[]>([]);
  const [coolingOff, setCoolingOff] = useState<CoolingOffPeriod | null>(null);
  const [calculating, setCalculating] = useState(false);

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

      if (!couple) {
        navigate('/dashboard');
        return;
      }

      setCoupleId(couple.id);

      const [scoreData, interventionsData, hotlinesData, coolingOffData] = await Promise.all([
        crisisService.getLatestCrisisScore(couple.id),
        crisisService.getActiveInterventions(couple.id),
        crisisService.getCrisisHotlines(),
        crisisService.getActiveCoolingOffPeriod(couple.id),
      ]);

      setCrisisScore(scoreData);
      setInterventions(interventionsData);
      setHotlines(hotlinesData);
      setCoolingOff(coolingOffData);
    } catch (error) {
      console.error('Error initializing crisis page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!coupleId || calculating) return;

    setCalculating(true);

    try {
      await crisisService.calculateCrisisScore(coupleId);
      const newScore = await crisisService.getLatestCrisisScore(coupleId);
      setCrisisScore(newScore);

      if (newScore) {
        const newInterventions = await crisisService.triggerInterventionsForScore(coupleId, newScore);
        if (newInterventions.length > 0) {
          setInterventions([...newInterventions, ...interventions]);
        }
      }
    } catch (error) {
      console.error('Error recalculating crisis score:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleAcknowledge = async (interventionId: string, action: 'acknowledged' | 'accepted' | 'declined') => {
    const success = await crisisService.acknowledgeIntervention(interventionId, action);
    if (success) {
      setInterventions(interventions.filter((i) => i.id !== interventionId));
    }
  };

  const handleStartCoolingOff = async () => {
    if (!coupleId || !user) return;

    const period = await crisisService.startCoolingOffPeriod(
      coupleId,
      user.id,
      'User initiated from crisis page',
      24
    );

    if (period) {
      setCoolingOff(period);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-rose-500 bg-rose-50 text-rose-900';
      case 'high':
        return 'border-orange-500 bg-orange-50 text-orange-900';
      case 'moderate':
        return 'border-amber-500 bg-amber-50 text-amber-900';
      default:
        return 'border-emerald-500 bg-emerald-50 text-emerald-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-6 h-6" />;
      case 'moderate':
        return <AlertTriangle className="w-6 h-6" />;
      default:
        return <Shield className="w-6 h-6" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-rose-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 25) return 'text-amber-600';
    return 'text-emerald-600';
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
            <h1 className="text-lg font-semibold text-slate-900">Crisis Support</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {coolingOff && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Cooling-Off Period Active</h3>
                <p className="text-sm text-blue-800 mb-2">
                  A 24-hour break is in effect to allow both partners to regulate and reflect.
                </p>
                <p className="text-xs text-blue-700">
                  Ends: {new Date(coolingOff.ends_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {crisisScore && (
          <div className={`border-2 rounded-xl p-6 ${getSeverityColor(crisisScore.severity)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                {getSeverityIcon(crisisScore.severity)}
                <div>
                  <h2 className="text-xl font-bold capitalize">{crisisScore.severity} Risk Level</h2>
                  <p className="text-sm opacity-75">
                    Last calculated: {new Date(crisisScore.calculated_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(crisisScore.score)}`}>
                {crisisScore.score}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl font-bold">{crisisScore.red_zone_days}</div>
                <div className="text-xs opacity-75">Red Zone Days</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl font-bold">{crisisScore.high_risk_messages}</div>
                <div className="text-xs opacity-75">Risky Messages</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl font-bold">{crisisScore.gottman_violations}</div>
                <div className="text-xs opacity-75">Four Horsemen</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl font-bold">{Math.round(crisisScore.disengagement_hours)}</div>
                <div className="text-xs opacity-75">Hours Disengaged</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="text-2xl font-bold">{crisisScore.conflict_frequency}</div>
                <div className="text-xs opacity-75">Conflicts (7d)</div>
              </div>
            </div>

            <button
              onClick={handleRecalculate}
              disabled={calculating}
              className="mt-4 w-full bg-white/80 hover:bg-white text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {calculating ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recalculating...</span>
                </span>
              ) : (
                'Recalculate Score'
              )}
            </button>
          </div>
        )}

        {interventions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Active Interventions</h3>
            {interventions.map((intervention) => (
              <div
                key={intervention.id}
                className={`border-2 rounded-xl p-6 ${getSeverityColor(intervention.severity)}`}
              >
                <h4 className="font-bold mb-2">{intervention.title}</h4>
                <p className="text-sm mb-4">{intervention.message}</p>
                {intervention.action_required && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAcknowledge(intervention.id, 'accepted')}
                      className="flex-1 bg-white/80 hover:bg-white text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleAcknowledge(intervention.id, 'declined')}
                      className="flex-1 bg-white/50 hover:bg-white/80 text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
                {!intervention.action_required && (
                  <button
                    onClick={() => handleAcknowledge(intervention.id, 'acknowledged')}
                    className="w-full bg-white/80 hover:bg-white text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Emergency Actions</h3>
          <div className="space-y-3">
            {!coolingOff && (
              <button
                onClick={handleStartCoolingOff}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Clock className="w-5 h-5" />
                <span>Start 24-Hour Cooling-Off Period</span>
              </button>
            )}
            <button
              onClick={() => navigate('/ai-coach')}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Emergency AI Coaching Session</span>
            </button>
            <button
              onClick={() => navigate('/repair')}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Heart className="w-5 h-5" />
              <span>Use Repair Tools</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>Crisis Hotlines</span>
          </h3>
          <div className="space-y-3">
            {hotlines.map((hotline) => (
              <div
                key={hotline.id}
                className="bg-slate-50 rounded-lg p-4 border border-slate-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">{hotline.name}</h4>
                    <p className="text-sm text-slate-600 capitalize">{hotline.type.replace('_', ' ')}</p>
                  </div>
                  {hotline.available_24_7 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      24/7
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 mb-3">{hotline.description}</p>
                <div className="flex items-center space-x-3">
                  <a
                    href={`tel:${hotline.phone}`}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{hotline.phone}</span>
                  </a>
                  {hotline.website && (
                    <a
                      href={hotline.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-200 hover:bg-slate-300 text-slate-900 p-2 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-600">
            If you or your partner are in immediate danger, please call 911 or go to your nearest emergency room.
          </p>
        </div>
      </main>
    </div>
  );
}
