import { supabase } from '@/integrations/supabase/client';

export interface UploadedVoice {
  url: string;
  path: string;
  duration: number;
  waveform: number[];
  mime: string;
}

// Reuse existing public `chat-attachments` bucket so no schema changes are needed.
export async function uploadVoiceMessage(
  blob: Blob,
  userId: string,
  duration: number,
  waveform: number[],
): Promise<UploadedVoice> {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${userId}/voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('chat-attachments').getPublicUrl(path);
  return { url: data.publicUrl, path, duration, waveform, mime: blob.type };
}

// ─── Inline voice payload encoded into chat_messages.content ───
const VOICE_TAG = '\u0001VOICE\u0001';

export interface VoicePayload {
  url?: string;
  duration: number;
  waveform: number[];
  transcript: string;
  pending?: boolean;
}

export function encodeVoiceContent(p: VoicePayload): string {
  // Keep transcript as plain leading text so memory/emotion pipelines still
  // treat it like a normal user message. Metadata is appended after a marker
  // and stripped from the visible string by parseVoiceContent.
  const meta = JSON.stringify({ url: p.url, duration: p.duration, waveform: p.waveform, pending: p.pending });
  return `${p.transcript || '[Voice message]'}${VOICE_TAG}${meta}`;
}

export function parseVoiceContent(content: string): { text: string; voice: Omit<VoicePayload, 'transcript'> | null } {
  const idx = content.indexOf(VOICE_TAG);
  if (idx < 0) return { text: content, voice: null };
  const text = content.slice(0, idx);
  try {
    const meta = JSON.parse(content.slice(idx + VOICE_TAG.length));
    return { text, voice: { url: meta.url, duration: meta.duration || 0, waveform: meta.waveform || [], pending: !!meta.pending } };
  } catch {
    return { text, voice: null };
  }
}

// ─── Reflection marker (used by assistant softer responses) ───
export const REFLECTION_TAG = '\u0001REFLECT\u0001';
export function encodeReflection(text: string) { return `${REFLECTION_TAG}${text}`; }
export function isReflection(content: string) { return content.startsWith(REFLECTION_TAG); }
export function reflectionText(content: string) { return content.slice(REFLECTION_TAG.length); }
