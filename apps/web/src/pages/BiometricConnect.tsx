import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Bluetooth, Activity, Battery, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { biometricService, BiometricDevice, BiometricReading } from '../lib/biometric';

export default function BiometricConnect() {
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BiometricDevice | null>(null);
  const [currentReading, setCurrentReading] = useState<BiometricReading | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkBluetoothAvailability();

    return () => {
      if (biometricService.isConnected()) {
        biometricService.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (connectedDevice) {
      biometricService.onReading(handleBiometricReading);
      loadBatteryLevel();
    }
  }, [connectedDevice]);

  const checkBluetoothAvailability = async () => {
    const available = await biometricService.isBluetoothAvailable();
    setIsBluetoothAvailable(available);
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const device = await biometricService.connectHeartRateMonitor();
      setConnectedDevice(device);

      if (user) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('id')
          .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
          .maybeSingle();

        await supabase.from('connected_devices').upsert({
          user_id: user.id,
          couple_id: coupleData?.id || null,
          device_type: 'bluetooth_heart_rate',
          device_name: device.name,
          device_id: device.id,
          is_active: true,
          last_sync: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to device');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await biometricService.disconnect();
    setConnectedDevice(null);
    setCurrentReading(null);
    setBattery(null);
  };

  const handleBiometricReading = async (reading: BiometricReading) => {
    setCurrentReading(reading);

    if (user && reading.heartRate) {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
        .maybeSingle();

      await supabase.from('biometric_readings').insert({
        user_id: user.id,
        couple_id: coupleData?.id || null,
        reading_type: 'heart_rate',
        heart_rate: reading.heartRate,
        hrv: reading.hrv || null,
        data_source: 'bluetooth_device',
      });
    }
  };

  const loadBatteryLevel = async () => {
    const level = await biometricService.getBatteryLevel();
    setBattery(level);
  };

  const getNervousSystemZone = (heartRate: number): { zone: string; color: string; label: string } => {
    if (heartRate < 70) {
      return { zone: 'green', color: 'text-emerald-600', label: 'Green Zone - Calm' };
    } else if (heartRate < 90) {
      return { zone: 'yellow', color: 'text-amber-600', label: 'Yellow Zone - Activated' };
    } else {
      return { zone: 'red', color: 'text-rose-600', label: 'Red Zone - Dysregulated' };
    }
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
              <Bluetooth className="w-6 h-6 text-blue-500" />
              <span className="font-semibold text-slate-900">Biometric Tracking</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Device</h1>
          <p className="text-slate-600">
            Track your heart rate and nervous system state in real-time
          </p>
        </div>

        {!isBluetoothAvailable && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>Web Bluetooth not available.</strong> Please use a supported browser (Chrome, Edge, or Opera) on desktop or Android.
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-rose-900">{error}</div>
          </div>
        )}

        {!connectedDevice ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bluetooth className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Connect a Heart Rate Monitor</h2>
              <p className="text-slate-600">
                Compatible with any Bluetooth heart rate monitor, chest strap, or smartwatch
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-3">
                <strong>Supported Devices:</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Polar H10, H9, OH1</li>
                <li>• Garmin HRM-Dual, HRM-Pro</li>
                <li>• Wahoo TICKR, TICKR X</li>
                <li>• Apple Watch (via third-party apps)</li>
                <li>• Any Bluetooth Low Energy heart rate monitor</li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              disabled={!isBluetoothAvailable || loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-5 h-5" />
                  <span>Connect Device</span>
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Make sure your device is powered on and in pairing mode
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{connectedDevice.name}</div>
                    <div className="text-sm text-slate-600">Connected</div>
                  </div>
                </div>
                {battery !== null && (
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Battery className="w-5 h-5" />
                    <span className="text-sm">{battery}%</span>
                  </div>
                )}
              </div>
            </div>

            {currentReading && currentReading.heartRate && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                <div className="text-center mb-6">
                  <Activity className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <div className="text-6xl font-bold text-slate-900 mb-2">
                    {currentReading.heartRate}
                  </div>
                  <div className="text-slate-600 mb-4">beats per minute</div>
                  <div className={`text-lg font-semibold ${getNervousSystemZone(currentReading.heartRate).color}`}>
                    {getNervousSystemZone(currentReading.heartRate).label}
                  </div>
                </div>

                {currentReading.hrv && (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="text-center">
                      <div className="text-sm text-slate-600 mb-1">Heart Rate Variability</div>
                      <div className="text-3xl font-bold text-slate-900">{currentReading.hrv}ms</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> Keep your device connected during check-ins and conflicts to automatically track your nervous system responses.
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
                onClick={() => navigate('/check-in')}
                className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
              >
                Do Check-In
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Why Track Biometrics?</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>• <strong>Objective Data:</strong> Your heart rate reveals nervous system state before you're consciously aware</p>
            <p>• <strong>Pattern Recognition:</strong> Identify triggers and track regulation progress over time</p>
            <p>• <strong>Early Warning:</strong> Notice dysregulation before it escalates into conflict</p>
            <p>• <strong>Accountability:</strong> Share real-time data with your partner to build trust</p>
          </div>
        </div>
      </main>
    </div>
  );
}
