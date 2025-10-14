import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface CoachingContext {
  sessionId?: string;
  heartRate?: number;
  readinessScore?: number;
  nervousSystemZone?: string;
  recentConflicts?: any[];
  conflictPatterns?: any[];
  partnerReadiness?: number;
}

interface Message {
  role: string;
  content: string;
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

    const { messages, context }: { messages: Message[]; context: CoachingContext } = await req.json();

    const systemPrompt = buildSystemPrompt(context);

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    if (context.sessionId) {
      await supabaseClient.from("coaching_messages").insert([
        {
          session_id: context.sessionId,
          role: "assistant",
          content: assistantMessage,
          context_data: {
            model: "gpt-4o-mini",
            timestamp: new Date().toISOString(),
          },
        },
      ]);
    }

    const suggestedTechniques = await getSuggestedTechniques(
      supabaseClient,
      context.nervousSystemZone || "green"
    );

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        techniques: suggestedTechniques,
        context: {
          zone: context.nervousSystemZone,
          heartRate: context.heartRate,
          readiness: context.readinessScore,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in ai-coach function:", error);
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

function buildSystemPrompt(context: CoachingContext): string {
  let prompt = `You are an expert relationship coach specializing in the Gottman Method and nervous system regulation. You help couples navigate conflicts with empathy, evidence-based techniques, and real-time biometric awareness.

Your role:
- Provide compassionate, non-judgmental support
- Teach Gottman Method principles (Four Horsemen, repair attempts, soft startups)
- Help users regulate their nervous system during conflicts
- Suggest practical, actionable techniques
- Ask clarifying questions to understand context
- Be brief and conversational (2-3 sentences max per response)

Key principles:
- Prioritize safety and regulation first
- Avoid taking sides
- Focus on patterns, not blame
- Validate feelings while guiding behavior
- Recognize when professional help is needed
`;

  if (context.nervousSystemZone) {
    const zoneGuidance = {
      green: "The user is regulated and calm - they can think clearly and communicate effectively. Focus on productive conversation skills.",
      yellow: "The user is activated and tense - their capacity is reduced. Suggest grounding techniques and simpler communication tools.",
      red: "The user is dysregulated - fight/flight/freeze is active. Prioritize immediate de-escalation and safety. Do NOT push for productive conversation yet.",
    };
    prompt += `\n\nCURRENT STATE:\nNervous System Zone: ${context.nervousSystemZone.toUpperCase()}\n${zoneGuidance[context.nervousSystemZone as keyof typeof zoneGuidance] || ""}\n`;
  }

  if (context.heartRate) {
    prompt += `Heart Rate: ${context.heartRate} bpm`;
    if (context.heartRate > 100) {
      prompt += " (elevated - suggest calming)";
    }
    prompt += "\n";
  }

  if (context.readinessScore !== undefined) {
    prompt += `Readiness Score: ${context.readinessScore}%`;
    if (context.readinessScore < 60) {
      prompt += " (low capacity - be gentle, suggest rest)";
    }
    prompt += "\n";
  }

  if (context.partnerReadiness !== undefined) {
    prompt += `Partner Readiness: ${context.partnerReadiness}%`;
    if (context.partnerReadiness < 60) {
      prompt += " (partner also low capacity)";
    }
    prompt += "\n";
  }

  if (context.recentConflicts && context.recentConflicts.length > 0) {
    prompt += `\nRecent conflicts: ${context.recentConflicts.length} in the past week`;
    const topics = context.recentConflicts
      .map((c: any) => c.topic)
      .filter((t: string) => t)
      .slice(0, 3);
    if (topics.length > 0) {
      prompt += ` (topics: ${topics.join(", ")})`;
    }
    prompt += "\n";
  }

  if (context.conflictPatterns && context.conflictPatterns.length > 0) {
    prompt += "\nDETECTED PATTERNS:\n";
    context.conflictPatterns.slice(0, 3).forEach((pattern: any) => {
      prompt += `- ${pattern.pattern_type}: ${pattern.description} (${pattern.severity} severity, ${pattern.frequency}x)\n`;
    });
  }

  return prompt;
}

async function getSuggestedTechniques(supabaseClient: any, zone: string) {
  const { data } = await supabaseClient
    .from("coaching_techniques")
    .select("*")
    .eq("is_active", true)
    .contains("recommended_for_zones", [zone])
    .limit(3);

  return data || [];
}
