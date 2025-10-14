import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const timeOfDay = url.searchParams.get('time') || 'morning';

    const { data: couples, error: couplesError } = await supabase
      .from('couples')
      .select('id, partner_1_id, partner_2_id')
      .eq('status', 'active');

    if (couplesError) throw couplesError;

    const ritualTypes = {
      morning: 'morning_checkin',
      evening: 'evening_winddown',
      weekly: 'weekly_meeting',
    };

    const ritualType = ritualTypes[timeOfDay as keyof typeof ritualTypes];

    const { data: ritual } = await supabase
      .from('rituals')
      .select('*')
      .eq('type', ritualType)
      .eq('is_active', true)
      .single();

    if (!ritual) {
      return new Response(
        JSON.stringify({ error: 'Ritual not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const results = [];
    for (const couple of couples || []) {
      const today = new Date().toISOString().split('T')[0];

      const { data: todayCompletion } = await supabase
        .from('ritual_completions')
        .select('id')
        .eq('couple_id', couple.id)
        .eq('ritual_id', ritual.id)
        .gte('completed_at', today)
        .limit(1)
        .maybeSingle();

      if (!todayCompletion) {
        results.push({
          couple_id: couple.id,
          ritual: ritual.title,
          prompt: ritual.prompt,
          reminder_sent: true,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        time: timeOfDay,
        ritual: ritual.title,
        reminders_sent: results.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in daily ritual reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});