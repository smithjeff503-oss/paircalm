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

    const { data: couples, error: couplesError } = await supabase
      .from('couples')
      .select('id')
      .eq('status', 'active');

    if (couplesError) throw couplesError;

    const results = [];
    for (const couple of couples || []) {
      const { data: score, error: scoreError } = await supabase.rpc('calculate_crisis_score', {
        p_couple_id: couple.id,
      });

      if (!scoreError && score !== null) {
        const { data: latestScore } = await supabase
          .from('crisis_scores')
          .select('*')
          .eq('couple_id', couple.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single();

        if (latestScore && latestScore.severity !== 'low') {
          const interventions = [];

          if (latestScore.severity === 'critical') {
            if (latestScore.red_zone_days >= 3) {
              await supabase.from('crisis_interventions').insert({
                couple_id: couple.id,
                crisis_score_id: latestScore.id,
                intervention_type: 'cooling_off',
                severity: 'critical',
                title: 'Mandatory 24-Hour Break Recommended',
                message: 'Both partners have been in red zone for 3+ days. A 24-hour cooling-off period is strongly recommended to prevent further escalation.',
                action_required: true,
              });
              interventions.push('cooling_off');
            }

            await supabase.from('crisis_interventions').insert({
              couple_id: couple.id,
              crisis_score_id: latestScore.id,
              intervention_type: 'crisis_hotline',
              severity: 'critical',
              title: 'Critical Alert: Immediate Support Needed',
              message: 'Your relationship health indicators suggest you may be in crisis. Please consider reaching out to a crisis hotline or emergency therapist immediately.',
              action_required: true,
            });
            interventions.push('crisis_hotline');
          } else if (latestScore.severity === 'high') {
            if (latestScore.high_risk_messages >= 5) {
              await supabase.from('crisis_interventions').insert({
                couple_id: couple.id,
                crisis_score_id: latestScore.id,
                intervention_type: 'ai_session',
                severity: 'high',
                title: 'Communication Pattern Alert',
                message: 'We\'ve detected 5+ high-risk messages in the past week. Consider taking a break from messaging and scheduling an AI coaching session.',
                action_required: false,
              });
              interventions.push('ai_session');
            }

            if (latestScore.gottman_violations >= 5) {
              await supabase.from('crisis_interventions').insert({
                couple_id: couple.id,
                crisis_score_id: latestScore.id,
                intervention_type: 'emergency_therapy',
                severity: 'high',
                title: 'Four Horsemen Alert',
                message: 'Multiple instances of criticism, contempt, defensiveness, or stonewalling detected. Consider booking an emergency therapy session.',
                action_required: false,
              });
              interventions.push('emergency_therapy');
            }

            if (latestScore.disengagement_hours >= 48) {
              await supabase.from('crisis_interventions').insert({
                couple_id: couple.id,
                crisis_score_id: latestScore.id,
                intervention_type: 'safety_check',
                severity: 'high',
                title: 'Partner Disengagement Detected',
                message: 'Your partner hasn\'t checked in for over 48 hours. We\'re sending them a safety check.',
                action_required: false,
              });
              interventions.push('safety_check');
            }
          }

          results.push({
            couple_id: couple.id,
            score: latestScore.score,
            severity: latestScore.severity,
            interventions,
          });
        } else {
          results.push({
            couple_id: couple.id,
            score: latestScore?.score || 0,
            severity: latestScore?.severity || 'low',
            interventions: [],
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
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
    console.error('Error in daily crisis scoring:', error);
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