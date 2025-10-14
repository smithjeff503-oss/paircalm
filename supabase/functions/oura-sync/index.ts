import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OuraDailyReadiness {
  id: string;
  day: string;
  score: number;
  temperature_deviation: number;
  temperature_trend_deviation: number;
  timestamp: string;
  contributors: {
    activity_balance: number;
    body_temperature: number;
    hrv_balance: number;
    previous_day_activity: number | null;
    previous_night: number;
    recovery_index: number;
    resting_heart_rate: number;
    sleep_balance: number;
  };
}

interface OuraDailySleep {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  average_breath: number;
  average_heart_rate: number;
  average_hrv: number;
  deep_sleep_duration: number;
  efficiency: number;
  latency: number;
  light_sleep_duration: number;
  rem_sleep_duration: number;
  total_sleep_duration: number;
  awake_time: number;
}

interface OuraHeartRate {
  bpm: number;
  source: string;
  timestamp: string;
}

async function refreshOuraToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Oura token:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing Oura token:', error);
    return null;
  }
}

async function fetchOuraData(
  endpoint: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const url = `https://api.ouraring.com/v2/usercollection/${endpoint}?start_date=${startDate}&end_date=${endDate}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: deviceData } = await supabaseClient
      .from('connected_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_type', 'oura_ring')
      .eq('is_active', true)
      .maybeSingle();

    if (!deviceData || !deviceData.access_token) {
      return new Response(
        JSON.stringify({ error: 'Oura Ring not connected' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let accessToken = deviceData.access_token;
    const tokenExpiresAt = new Date(deviceData.token_expires_at);
    const now = new Date();

    if (now >= tokenExpiresAt) {
      const ouraClientId = Deno.env.get('OURA_CLIENT_ID');
      const ouraClientSecret = Deno.env.get('OURA_CLIENT_SECRET');

      if (!ouraClientId || !ouraClientSecret) {
        return new Response(
          JSON.stringify({ error: 'Oura API credentials not configured' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const newTokens = await refreshOuraToken(
        deviceData.refresh_token,
        ouraClientId,
        ouraClientSecret
      );

      if (!newTokens) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Oura token' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      accessToken = newTokens.access_token;

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);

      await supabaseClient
        .from('connected_devices')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', deviceData.id);
    }

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    const [readinessData, sleepData] = await Promise.all([
      fetchOuraData('daily_readiness', accessToken, startDateStr, endDateStr),
      fetchOuraData('daily_sleep', accessToken, startDateStr, endDateStr),
    ]);

    const { data: coupleData } = await supabaseClient
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    const biometricInserts = [];

    if (readinessData?.data) {
      for (const item of readinessData.data as OuraDailyReadiness[]) {
        biometricInserts.push({
          user_id: user.id,
          couple_id: coupleData?.id || null,
          reading_type: 'readiness',
          readiness_score: item.score,
          temperature_deviation: item.temperature_deviation,
          hrv: item.contributors.hrv_balance,
          heart_rate: item.contributors.resting_heart_rate,
          data_source: 'oura_ring',
          recorded_at: item.timestamp,
        });
      }
    }

    if (sleepData?.data) {
      for (const item of sleepData.data as OuraDailySleep[]) {
        biometricInserts.push({
          user_id: user.id,
          couple_id: coupleData?.id || null,
          reading_type: 'sleep',
          sleep_score: item.score,
          sleep_duration: item.total_sleep_duration,
          deep_sleep_duration: item.deep_sleep_duration,
          rem_sleep_duration: item.rem_sleep_duration,
          sleep_efficiency: item.efficiency,
          hrv: item.average_hrv,
          heart_rate: item.average_heart_rate,
          respiratory_rate: item.average_breath,
          data_source: 'oura_ring',
          recorded_at: item.timestamp,
        });
      }
    }

    if (biometricInserts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('biometric_readings')
        .upsert(biometricInserts, {
          onConflict: 'user_id,recorded_at,reading_type',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Error inserting biometric data:', insertError);
      }
    }

    await supabaseClient
      .from('connected_devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', deviceData.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced_readings: biometricInserts.length,
        readiness_count: readinessData?.data?.length || 0,
        sleep_count: sleepData?.data?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Oura sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync Oura data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
