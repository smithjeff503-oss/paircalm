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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const metricDate = yesterday.toISOString().split('T')[0];

    const { data: couples, error: couplesError } = await supabase
      .from('couples')
      .select('id, partner_1_id, partner_2_id')
      .eq('status', 'active');

    if (couplesError) throw couplesError;

    const results = [];
    for (const couple of couples || []) {
      const startOfDay = new Date(yesterday);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(yesterday);
      endOfDay.setHours(23, 59, 59, 999);

      const [checkIns, conflicts, messages] = await Promise.all([
        supabase
          .from('check_ins')
          .select('nervous_system_zone, readiness_score')
          .in('user_id', [couple.partner_1_id, couple.partner_2_id])
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        supabase
          .from('conflicts')
          .select('*')
          .eq('couple_id', couple.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        supabase
          .from('couple_messages')
          .select('tone_analysis')
          .eq('couple_id', couple.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
      ]);

      const checkInData = checkIns.data || [];
      const conflictData = conflicts.data || [];
      const messageData = messages.data || [];

      let greenCount = 0;
      let yellowCount = 0;
      let redCount = 0;
      let totalReadiness = 0;
      let readinessCount = 0;

      checkInData.forEach((ci: any) => {
        if (ci.nervous_system_zone === 'green') greenCount++;
        else if (ci.nervous_system_zone === 'yellow') yellowCount++;
        else if (ci.nervous_system_zone === 'red') redCount++;

        if (ci.readiness_score) {
          totalReadiness += ci.readiness_score;
          readinessCount++;
        }
      });

      const total = greenCount + yellowCount + redCount;
      const greenPct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
      const yellowPct = total > 0 ? Math.round((yellowCount / total) * 100) : 0;
      const redPct = total > 0 ? Math.round((redCount / total) * 100) : 0;
      const avgReadiness = readinessCount > 0 ? Math.round(totalReadiness / readinessCount) : 0;

      let highRiskMessageCount = 0;
      let gottmanViolationCount = 0;

      messageData.forEach((msg: any) => {
        if (msg.tone_analysis?.riskLevel === 'high' || msg.tone_analysis?.riskLevel === 'medium') {
          highRiskMessageCount++;
        }
        if (msg.tone_analysis?.gottmanWarnings?.length > 0) {
          gottmanViolationCount += msg.tone_analysis.gottmanWarnings.length;
        }
      });

      const repairAttempts = conflictData.filter((c: any) => c.repair_attempts > 0);
      const resolvedConflicts = conflictData.filter((c: any) => c.resolved);
      const repairSuccessRate = repairAttempts.length > 0 
        ? Math.round((resolvedConflicts.length / repairAttempts.length) * 100)
        : 0;

      let totalResolutionHours = 0;
      let resolutionCount = 0;
      conflictData.forEach((c: any) => {
        if (c.resolved && c.end_time) {
          const duration = (new Date(c.end_time).getTime() - new Date(c.start_time).getTime()) / (1000 * 60 * 60);
          totalResolutionHours += duration;
          resolutionCount++;
        }
      });
      const avgResolutionHours = resolutionCount > 0 
        ? Math.round((totalResolutionHours / resolutionCount) * 10) / 10
        : 0;

      const { error: insertError } = await supabase
        .from('relationship_metrics')
        .upsert({
          couple_id: couple.id,
          metric_date: metricDate,
          green_zone_percentage: greenPct,
          yellow_zone_percentage: yellowPct,
          red_zone_percentage: redPct,
          avg_readiness_score: avgReadiness,
          conflict_count: conflictData.length,
          high_risk_message_count: highRiskMessageCount,
          gottman_violation_count: gottmanViolationCount,
          repair_attempt_count: repairAttempts.length,
          repair_success_rate: repairSuccessRate,
          avg_conflict_resolution_hours: avgResolutionHours,
          connection_score: greenPct,
        }, {
          onConflict: 'couple_id,metric_date',
        });

      if (!insertError) {
        results.push({
          couple_id: couple.id,
          metric_date: metricDate,
          metrics_calculated: true,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: metricDate,
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
    console.error('Error in daily metrics aggregation:', error);
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