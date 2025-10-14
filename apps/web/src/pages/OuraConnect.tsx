import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Activity, Moon, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface OuraDevice {
  id: string;
  device_name: string;
  is_active: boolean;
  last_sync: string;
}

interface OuraStats {
  latestReadiness: number | null;
  latestSleepScore: number | null;
  avgHrv: number | null;
  lastSyncDate: string | null;
}

export default function OuraConnect() {
  const [searchParams] = useSearchParams();
  const [connectedDevice, setConnectedDevice] = useState<OuraDevice | null>(null);
  const [ouraStats, setOuraStats] = useState<OuraStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const OURA_CLIENT_ID = import.meta.env.VITE_OURA_CLIENT_ID || '';
  const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oura-oauth-callback`;

  useEffect(() => {
    checkConnection();

    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      const { data: deviceData } = await supabase
        .from('connected_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_type', 'oura_ring')
        .eq('is_active', true)
        .maybeSingle();

      if (deviceData) {
        setConnectedDevice(deviceData as OuraDevice);
        await loadOuraStats();
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOuraStats = async () => {
    if (!user) return;

    const { data: readings } = await supabase
      .from('biometric_readings')
      .select('*')
      .eq('user_id', user.id)
      .eq('data_source', 'oura_ring')
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (readings && readings.length > 0) {
      const readinessReadings = readings.filter(r => r.reading_type === 'readiness');
      const sleepReadings = readings.filter(r => r.reading_type === 'sleep');

      const hrvValues = readings
        .filter(r => r.hrv !== null)
        .map(r => r.hrv as number);

      setOuraStats({
        latestReadiness: readinessReadings[0]?.readiness_score || null,
        latestSleepScore: sleepReadings[0]?.sleep_score || null,
        avgHrv: hrvValues.length > 0
          ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
          : null,
        lastSyncDate: readings[0]?.recorded_at || null,
      });
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oura-oauth-callback?code=${code}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to connect Oura Ring');
      }

      const result = await response.json();
      setSuccess('Oura Ring connected successfully! Syncing your data...');

      await checkConnection();
      await handleSync();

      navigate('/oura', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to connect Oura Ring');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const scopes = 'email personal daily heartrate workout session';
    const state = Math.random().toString(36).substring(7);

    const authUrl = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${OURA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

    window.location.href = authUrl;
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oura-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync Oura data');
      }

      const result = await response.json();
      setSuccess(`Synced ${result.synced_readings} readings from Oura Ring`);
      await loadOuraStats();
    } catch (err: any) {
      setError(err.message || 'Failed to sync Oura data');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedDevice || !confirm('Disconnect Oura Ring? Your historical data will be preserved.')) {
      return;
    }

    try {
      await supabase
        .from('connected_devices')
        .update({ is_active: false })
        .eq('id', connectedDevice.id);

      setConnectedDevice(null);
      setOuraStats(null);
      setSuccess('Oura Ring disconnected');
    } catch (err) {
      setError('Failed to disconnect Oura Ring');
    }
  };

  const getReadinessColor = (score: number): string => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getReadinessLabel = (score: number): string => {
    if (score >= 85) return 'Optimal';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    return 'Pay Attention';
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
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
              <span className="font-semibold text-slate-900">Oura Ring</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Oura Ring Integration</h1>
          <p className="text-slate-600">
            Track sleep, HRV, readiness, and recovery data automatically
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-rose-900">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">{success}</div>
          </div>
        )}

        {!connectedDevice ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Connect Your Oura Ring</h2>
              <p className="text-slate-600">
                Get automatic insights from your sleep, HRV, and readiness data
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-3">
                <strong>What You'll Get:</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <Zap className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Readiness Score:</strong> Know when you're regulated and ready for difficult conversations</span>
                </li>
                <li className="flex items-start">
                  <Moon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Sleep Quality:</strong> Track how sleep affects your conflict patterns</span>
                </li>
                <li className="flex items-start">
                  <Activity className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>HRV Trends:</strong> Monitor nervous system regulation over time</span>
                </li>
                <li className="flex items-start">
                  <TrendingUp className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Pattern Recognition:</strong> See correlations between recovery and relationship health</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              disabled={!OURA_CLIENT_ID}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Connect Oura Ring</span>
            </button>

            {!OURA_CLIENT_ID && (
              <p className="text-xs text-amber-600 text-center">
                Oura Ring integration requires API credentials to be configured
              </p>
            )}

            <p className="text-xs text-slate-500 text-center">
              You'll be redirected to Oura to authorize access. We only access health data you explicitly approve.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{connectedDevice.device_name}</div>
                    <div className="text-sm text-slate-600">Connected</div>
                  </div>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      <span>Sync Now</span>
                    </>
                  )}
                </button>
              </div>

              {connectedDevice.last_sync && (
                <div className="text-sm text-slate-600">
                  Last synced: {new Date(connectedDevice.last_sync).toLocaleString()}
                </div>
              )}
            </div>

            {ouraStats && (
              <div className="grid md:grid-cols-3 gap-4">
                {ouraStats.latestReadiness !== null && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <div className="text-sm text-slate-600">Readiness</div>
                    </div>
                    <div className={`text-3xl font-bold ${getReadinessColor(ouraStats.latestReadiness)}`}>
                      {ouraStats.latestReadiness}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {getReadinessLabel(ouraStats.latestReadiness)}
                    </div>
                  </div>
                )}

                {ouraStats.latestSleepScore !== null && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Moon className="w-5 h-5 text-blue-500" />
                      <div className="text-sm text-slate-600">Sleep Score</div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                      {ouraStats.latestSleepScore}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Last night
                    </div>
                  </div>
                )}

                {ouraStats.avgHrv !== null && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-5 h-5 text-emerald-500" />
                      <div className="text-sm text-slate-600">Avg HRV</div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                      {ouraStats.avgHrv}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Last 7 days
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Automatic Sync:</strong> Your Oura data syncs daily. Click "Sync Now" to get the latest readings.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDisconnect}
                className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Disconnect
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-3">How This Helps Your Relationship</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>• <strong>Timing Matters:</strong> Low readiness scores predict higher conflict likelihood</p>
            <p>• <strong>Self-Awareness:</strong> "I'm at 45% readiness, let's talk about this tomorrow"</p>
            <p>• <strong>Pattern Recognition:</strong> See how sleep quality correlates with your interactions</p>
            <p>• <strong>Shared Understanding:</strong> Both partners can see each other's capacity in real-time</p>
          </div>
        </div>
      </main>
    </div>
  );
}
