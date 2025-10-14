import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface ToneAnalysisRequest {
  message: string;
  senderZone?: string;
  receiverZone?: string;
  senderHeartRate?: number;
  recentConflicts?: number;
}

interface ToneAnalysisResponse {
  riskLevel: 'low' | 'medium' | 'high';
  escalationRisk: boolean;
  gottmanWarnings: string[];
  tone: string;
  suggestions: string[];
  shouldDelay: boolean;
  delayReason?: string;
  rewriteSuggestion?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const requestData: ToneAnalysisRequest = await req.json();

    const systemPrompt = `You are an expert relationship communication analyst specializing in the Gottman Method. Analyze the tone and content of messages between romantic partners.

Your task:
1. Identify any of the "Four Horsemen" (criticism, contempt, defensiveness, stonewalling)
2. Assess escalation risk
3. Evaluate overall tone
4. Provide specific suggestions for improvement
5. Determine if the message should be delayed based on context

Context:
${requestData.senderZone ? `- Sender nervous system zone: ${requestData.senderZone}` : ''}
${requestData.receiverZone ? `- Receiver nervous system zone: ${requestData.receiverZone}` : ''}
${requestData.senderHeartRate ? `- Sender heart rate: ${requestData.senderHeartRate} bpm` : ''}
${requestData.recentConflicts ? `- Recent conflicts this week: ${requestData.recentConflicts}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "riskLevel": "low" | "medium" | "high",
  "escalationRisk": boolean,
  "gottmanWarnings": ["criticism", "contempt", etc],
  "tone": "brief description",
  "suggestions": ["specific suggestion 1", "suggestion 2"],
  "shouldDelay": boolean,
  "delayReason": "reason if shouldDelay is true",
  "rewriteSuggestion": "alternative phrasing if needed"
}`;

    const userPrompt = `Analyze this message from one partner to another:

"${requestData.message}"

Provide your analysis in the specified JSON format.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis: ToneAnalysisResponse = JSON.parse(data.choices[0].message.content);

    // Add context-based overrides
    if (requestData.senderZone === 'red' || requestData.receiverZone === 'red') {
      analysis.shouldDelay = true;
      analysis.delayReason = analysis.delayReason || 'One or both partners are in red zone (fight/flight/freeze). Wait until both are regulated.';
      analysis.riskLevel = 'high';
    }

    if (requestData.senderHeartRate && requestData.senderHeartRate > 100) {
      if (!analysis.suggestions.some(s => s.includes('heart rate') || s.includes('calm'))) {
        analysis.suggestions.push('Your heart rate is elevated. Consider taking a few deep breaths before sending.');
      }
    }

    return new Response(
      JSON.stringify(analysis),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in message-tone-analysis function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
