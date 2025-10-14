import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Heart,
  Zap,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService, CorrelationInsight } from '../lib/analytics';
import { supabase } from '../lib/supabase';

interface Couple {
  id: string;
  partner_1_id: string;
  partner_2_id: string;
}

export default function Insights() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [insights, setInsights] = useState<CorrelationInsight[]>([]);
  const [emotionMap, setEmotionMap] = useState<Map<string, number>>(new Map());
  const [stressStats, setStressStats] = useState<any>(null);
  const [zoneTrends, setZoneTrends] = useState<any[]>([]);
  const [biometricTrends, setBiometricTrends] = useState<any[]>([]);
  const [conflictPatterns, setConflictPatterns] = useState<any[]>([]);
  const [partnerComparison, setPartnerComparison] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, timeRange]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
        .maybeSingle();

      setCouple(coupleData);

      const [
        insightsData,
        emotions,
        stress,
        zones,
        biometrics,
        conflicts,
        partnerData,
      ] = await Promise.all([
        analyticsService.getCorrelationInsights(user.id, coupleData?.id || null),
        analyticsService.getEmotionalPatterns(user.id, timeRange),
        analyticsService.getStressLevelStats(user.id, timeRange),
        analyticsService.getCheckInTrends(user.id, timeRange),
        analyticsService.getBiometricTrends(user.id, timeRange),
        coupleData
          ? analyticsService.getConflictPatterns(coupleData.id, timeRange)
          : Promise.resolve([]),
        coupleData && coupleData.partner_2_id
          ? analyticsService.getPartnerReadinessComparison(
              coupleData.id,
              coupleData.partner_1_id,
              coupleData.partner_2_id
            )
          : Promise.resolve(null),
      ]);

      setInsights(insightsData);
      setEmotionMap(emotions);
      setStressStats(stress);
      setZoneTrends(zones);
      setBiometricTrends(biometrics);
      setConflictPatterns(conflicts);
      setPartnerComparison(partnerData);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'high_risk':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'low_risk':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'high_risk':
        return 'bg-amber-50 border-amber-200';
      case 'low_risk':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="w-5 h-5 text-emerald-600" />;
      case 'worsening':
        return <TrendingUp className="w-5 h-5 text-rose-600" />;
      default:
        return <Minus className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTopEmotions = () => {
    return Array.from(emotionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getZoneSummary = () => {
    if (zoneTrends.length === 0) return null;

    const totals = zoneTrends.reduce(
      (acc, day) => ({
        green: acc.green + day.green,
        yellow: acc.yellow + day.yellow,
        red: acc.red + day.red,
      }),
      { green: 0, yellow: 0, red: 0 }
    );

    const days = zoneTrends.length;
    return {
      green: Math.round(totals.green / days),
      yellow: Math.round(totals.yellow / days),
      red: Math.round(totals.red / days),
    };
  };

  const getAverageBiometrics = () => {
    if (biometricTrends.length === 0) return null;

    const validReadiness = biometricTrends.filter(d => d.readiness !== undefined);
    const validHrv = biometricTrends.filter(d => d.avgHrv !== undefined);
    const validSleep = biometricTrends.filter(d => d.sleepScore !== undefined);

    return {
      readiness: validReadiness.length > 0
        ? Math.round(
            validReadiness.reduce((sum, d) => sum + (d.readiness || 0), 0) / validReadiness.length
          )
        : null,
      hrv: validHrv.length > 0
        ? Math.round(validHrv.reduce((sum, d) => sum + (d.avgHrv || 0), 0) / validHrv.length)
        : null,
      sleep: validSleep.length > 0
        ? Math.round(
            validSleep.reduce((sum, d) => sum + (d.sleepScore || 0), 0) / validSleep.length
          )
        : null,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const zoneSummary = getZoneSummary();
  const avgBiometrics = getAverageBiometrics();
  const topEmotions = getTopEmotions();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-slate-900">Insights</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Insights</h1>
            <p className="text-slate-600">Patterns, trends, and actionable intelligence</p>
          </div>
          <div className="flex space-x-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as 7 | 30 | 90)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {insights.length > 0 && (
          <div className="mb-8 space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 flex items-start space-x-3 ${getInsightBgColor(
                  insight.type
                )}`}
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{insight.message}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Confidence: {Math.round(insight.confidence * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {zoneSummary && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-600" />
                <div className="text-sm font-medium text-slate-600">Avg. Zone Distribution</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Green</span>
                  <span className="font-bold text-emerald-600">{zoneSummary.green}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Yellow</span>
                  <span className="font-bold text-amber-600">{zoneSummary.yellow}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Red</span>
                  <span className="font-bold text-rose-600">{zoneSummary.red}%</span>
                </div>
              </div>
            </div>
          )}

          {stressStats && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-5 h-5 text-rose-500" />
                <div className="text-sm font-medium text-slate-600">Stress Level</div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {stressStats.average}/10
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                {getTrendIcon(stressStats.trend)}
                <span className="capitalize">{stressStats.trend}</span>
              </div>
            </div>
          )}

          {avgBiometrics?.readiness && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <div className="text-sm font-medium text-slate-600">Avg. Readiness</div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {avgBiometrics.readiness}
              </div>
              <div className="text-sm text-slate-600">Last {timeRange} days</div>
            </div>
          )}

          {avgBiometrics?.sleep && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Moon className="w-5 h-5 text-blue-500" />
                <div className="text-sm font-medium text-slate-600">Avg. Sleep Score</div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {avgBiometrics.sleep}
              </div>
              <div className="text-sm text-slate-600">Last {timeRange} days</div>
            </div>
          )}
        </div>

        {conflictPatterns.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Conflict Patterns</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total conflicts:</span>
                <span className="font-bold text-slate-900">
                  {conflictPatterns.reduce((sum, p) => sum + p.count, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Most active day:</span>
                <span className="font-bold text-slate-900">
                  {conflictPatterns.reduce((max, p) => (p.count > max.count ? p : max), conflictPatterns[0])
                    .date}
                </span>
              </div>
              {conflictPatterns.some(p => p.topics.length > 0) && (
                <div>
                  <div className="text-sm text-slate-600 mb-2">Common topics:</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      new Set(conflictPatterns.flatMap(p => p.topics))
                    ).slice(0, 5).map((topic) => (
                      <span
                        key={topic}
                        className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {topEmotions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Emotions</h2>
            <div className="space-y-3">
              {topEmotions.map(([emotion, count]) => (
                <div key={emotion} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{emotion}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (count / Math.max(...Array.from(emotionMap.values()))) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {partnerComparison && (couple?.partner_2_id) && (
          <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-xl border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Partner Readiness</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-600 mb-1">You</div>
                <div className="text-3xl font-bold text-blue-600">
                  {partnerComparison.partner1 || '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-600 mb-1">Partner</div>
                <div className="text-3xl font-bold text-violet-600">
                  {partnerComparison.partner2 || '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-600 mb-1">Combined</div>
                <div className="text-3xl font-bold text-slate-900">
                  {partnerComparison.combinedCapacity || '-'}
                </div>
              </div>
            </div>
            {partnerComparison.combinedCapacity && partnerComparison.combinedCapacity < 60 && (
              <div className="mt-4 text-sm text-amber-900 bg-amber-100 rounded-lg p-3">
                ⚠️ Combined capacity is low. Consider postponing difficult conversations.
              </div>
            )}
          </div>
        )}

        {!couple?.partner_2_id && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-900 mb-3">
              <strong>Limited Insights:</strong> Connect with your partner to unlock relationship
              patterns and couple insights.
            </p>
            <button
              onClick={() => navigate('/invite-partner')}
              className="text-sm font-medium text-amber-900 underline hover:no-underline"
            >
              Invite Partner
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
