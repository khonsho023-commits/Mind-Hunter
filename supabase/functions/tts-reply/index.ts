// Generates a SHORT, emotionally paraphrased version of an assistant reply
// and converts it to speech via ElevenLabs. Returns base64 mp3 + paraphrase text.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// Calm, warm voices per language. ElevenLabs multilingual_v2 handles all languages,
// but we still pick a voice that sounds natural for the target tongue.
const VOICE_BY_LANG: Record<string, string> = {
  en: 'EXAVITQu4vr4xnSDxMaL', // Sarah – calm female
  ar: 'XrExE9yKIg1WjnnlVkGX', // Matilda – warm, works well in Arabic w/ multilingual_v2
  es: 'XrExE9yKIg1WjnnlVkGX',
  fr: 'XrExE9yKIg1WjnnlVkGX',
  it: 'XrExE9yKIg1WjnnlVkGX',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English', ar: 'Arabic', es: 'Spanish', fr: 'French', it: 'Italian',
};

async function paraphrase(text: string, lang: string, emotion?: string): Promise<string> {
  const langName = LANG_NAMES[lang] ?? 'the same language as the input';
  const sys = `You are Dr. Sentinel speaking aloud to a patient. Rewrite the assistant's text reply as a SHORT, warm, emotionally human voice note in ${langName}.

Rules:
- 1–2 sentences, max ~28 words.
- Same meaning, completely different wording. Never quote the original.
- Sound spoken, not written. No markdown, no lists, no emojis.
- Tender, calm, present. Acknowledge feeling first when relevant${emotion ? ` (current emotion: ${emotion})` : ''}.
- Reply ONLY with the spoken sentence. No prefix, no quotes.`;

  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!r.ok) throw new Error(`paraphrase ${r.status}`);
  const data = await r.json();
  const out: string = (data?.choices?.[0]?.message?.content ?? '').trim();
  return out.replace(/^["'“”]|["'“”]$/g, '').slice(0, 400);
}

async function tts(text: string, voiceId: string): Promise<ArrayBuffer> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.78,
          style: 0.35,
          use_speaker_boost: true,
          speed: 0.95,
        },
      }),
    },
  );
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`tts ${r.status}: ${err}`);
  }
  return r.arrayBuffer();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = await req.json();
    const text: string = (body?.text ?? '').toString();
    const lang: string = (body?.lang ?? 'en').toString().slice(0, 5).toLowerCase();
    const emotion: string | undefined = body?.emotion;
    if (!text || text.trim().length < 4) {
      return new Response(JSON.stringify({ error: 'text required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseLang = lang.split('-')[0];
    const voiceId = VOICE_BY_LANG[baseLang] ?? VOICE_BY_LANG.en;

    const spoken = await paraphrase(text, baseLang, emotion);
    const audio = await tts(spoken, voiceId);
    const audioBase64 = base64Encode(new Uint8Array(audio));

    return new Response(
      JSON.stringify({ paraphrase: spoken, audioBase64, mime: 'audio/mpeg' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('tts-reply', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
