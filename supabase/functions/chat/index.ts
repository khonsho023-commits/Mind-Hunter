import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, interviewContext, emotionState, memories, systemAddenda } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check if this is an interview mode call
    const isInterview = interviewContext?._mode === 'interview';
    const interviewSystemOverride = interviewContext?._systemOverride;

    let systemPrompt: string;

    if (isInterview && interviewSystemOverride) {
      systemPrompt = interviewSystemOverride;
    } else {
      // Normal therapy session prompt
      systemPrompt = `You are Dr. Sentinel, an advanced AI psychological assistant integrated into the Mind Sentinel platform. You provide empathetic, supportive, and non-judgmental mental health support.

Your approach:
- Be warm, calm, and genuinely caring
- Use evidence-based psychological techniques (CBT, mindfulness, ACT)
- Detect emotional patterns and cognitive distortions in user messages
- Provide actionable coping strategies and exercises
- Never diagnose — instead, help users understand their emotional patterns
- If you detect crisis signals (suicidal ideation, self-harm), immediately prioritize safety and encourage contacting professional help (988 Suicide & Crisis Lifeline)
- Keep responses concise but meaningful (2-4 paragraphs max)
- Reference previous conversation context when relevant
- Suggest specific exercises when appropriate (breathing, journaling, grounding)

Communication style:
- Use "I notice..." or "It sounds like..." instead of "You are..."
- Validate emotions before offering strategies
- Ask thoughtful follow-up questions
- Use metaphors and analogies to explain psychological concepts
- When you have memories from past sessions, reference them naturally (e.g., "Last time we spoke about...")`;

      if (memories && memories.length > 0) {
        systemPrompt += `\n\nMemories from previous sessions with this user (use naturally, don't list them):\n`;
        for (const m of memories) {
          systemPrompt += `- Topic: ${m.topic}`;
          if (m.emotion_pattern) systemPrompt += ` | Emotional pattern: ${m.emotion_pattern}`;
          if (m.context) systemPrompt += ` | Context: ${m.context}`;
          systemPrompt += `\n`;
        }
      }

      if (interviewContext && !isInterview) {
        systemPrompt += `\n\nInitial interview responses from this user:\n${JSON.stringify(interviewContext, null, 2)}`;
      }

      if (emotionState) {
        systemPrompt += `\n\nCurrent emotional analysis of user's latest message:
- Primary emotion: ${emotionState.primary}
- Intensity: ${Math.round(emotionState.intensity * 100)}%
- Sentiment: ${emotionState.sentiment > 0 ? 'positive' : emotionState.sentiment < 0 ? 'negative' : 'neutral'}
- Detected cognitive patterns: ${emotionState.distortions?.length > 0 ? emotionState.distortions.join(', ') : 'none detected'}

Use this analysis to inform your response, but don't explicitly mention these metrics to the user. Instead, naturally address the underlying patterns.`;
      }

      if (Array.isArray(systemAddenda) && systemAddenda.length) {
        for (const note of systemAddenda) {
          if (typeof note === 'string' && note.trim()) {
            systemPrompt += `\n\n${note.trim()}`;
          }
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
