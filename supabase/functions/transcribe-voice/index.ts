import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { decode as base64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

const ISO3_BY_LANG: Record<string, string> = {
  en: 'eng', ar: 'ara', es: 'spa', fr: 'fra', it: 'ita',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!ELEVENLABS_API_KEY) {
      return json({ error: 'ELEVENLABS_API_KEY missing' }, 500);
    }

    const body = await req.json();
    const audioBase64 = (body?.audioBase64 ?? '').toString();
    const mime = (body?.mime ?? 'audio/webm').toString();
    const baseLang = (body?.lang ?? '').toString().toLowerCase().split('-')[0];
    if (!audioBase64) return json({ error: 'audioBase64 required' }, 400);

    const bytes = base64Decode(audioBase64);
    const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData();
    form.append('file', new File([bytes], `voice.${ext}`, { type: mime }));
    form.append('model_id', 'scribe_v2');
    form.append('tag_audio_events', 'false');
    form.append('diarize', 'false');
    const languageCode = ISO3_BY_LANG[baseLang];
    if (languageCode) form.append('language_code', languageCode);

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('transcribe-voice failed', res.status, detail);
      return json({ error: detail || `STT failed: ${res.status}` }, 500);
    }
    const data = await res.json();
    return json({ text: (data?.text ?? '').toString() });
  } catch (e) {
    console.error('transcribe-voice', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}