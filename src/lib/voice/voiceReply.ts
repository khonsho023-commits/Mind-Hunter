import { supabase } from '@/integrations/supabase/client';

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-reply`;

export interface VoiceReply {
  paraphrase: string;
  audioBlob: Blob;
  duration: number;
  waveform: number[];
}

/** Calls the edge function to generate a paraphrased TTS reply. */
export async function generateVoiceReply(params: {
  text: string;
  lang: string;
  emotion?: string;
}): Promise<VoiceReply | null> {
  try {
    const r = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(params),
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.audioBase64 || !data?.paraphrase) return null;

    // Decode base64 -> Blob (binary-safe)
    const bin = atob(data.audioBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const audioBlob = new Blob([bytes], { type: data.mime || 'audio/mpeg' });

    // Probe duration + sampled waveform from the decoded audio
    const { duration, waveform } = await analyzeAudio(audioBlob);
    return { paraphrase: data.paraphrase as string, audioBlob, duration, waveform };
  } catch (e) {
    console.warn('generateVoiceReply', e);
    return null;
  }
}

export async function uploadAssistantVoice(
  blob: Blob, userId: string,
): Promise<string | null> {
  const path = `${userId}/assistant-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) { console.warn('assistant voice upload', error); return null; }
  return supabase.storage.from('chat-attachments').getPublicUrl(path).data.publicUrl;
}

async function analyzeAudio(blob: Blob): Promise<{ duration: number; waveform: number[] }> {
  try {
    const ab = await blob.arrayBuffer();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(ab.slice(0));
    const channel = decoded.getChannelData(0);
    const buckets = 56;
    const size = Math.floor(channel.length / buckets);
    const wf: number[] = [];
    for (let i = 0; i < buckets; i++) {
      let peak = 0;
      const start = i * size; const end = start + size;
      for (let j = start; j < end; j++) {
        const v = Math.abs(channel[j]);
        if (v > peak) peak = v;
      }
      wf.push(Math.min(1, Math.max(0.05, peak)));
    }
    const max = Math.max(...wf);
    const norm = max < 0.7 && max > 0 ? wf.map((v) => Math.min(1, v * (0.9 / max))) : wf;
    const duration = decoded.duration;
    ctx.close().catch(() => {});
    return { duration, waveform: norm };
  } catch {
    // Fallback: probe duration via <audio>
    return { duration: await probeDurationViaAudio(blob), waveform: new Array(40).fill(0.4) };
  }
}

function probeDurationViaAudio(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.src = URL2(blob);
    a.onloadedmetadata = () => resolve(isFinite(a.duration) ? a.duration : 4);
    a.onerror = () => resolve(4);
  });
}
function URL2(b: Blob) { return window.URL.createObjectURL(b); }
