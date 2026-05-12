import { supabase } from '@/integrations/supabase/client';

export interface UploadedVoice {
  url: string;       // signed URL (long-lived) or public URL
  path: string;
  duration: number;
  waveform: number[];
  mime: string;
}

export async function uploadVoiceMessage(
  blob: Blob,
  userId: string,
  duration: number,
  waveform: number[],
): Promise<UploadedVoice> {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;

  // Private bucket → signed URL valid for 1 year
  const { data: signed } = await supabase.storage
    .from('voice-messages')
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  return {
    url: signed?.signedUrl ?? '',
    path,
    duration,
    waveform,
    mime: blob.type,
  };
}
