import { supabase } from '@/integrations/supabase/client';

export async function transcribeVoice(blob: Blob, lang: string): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const { data, error } = await supabase.functions.invoke('transcribe-voice', {
    body: { audioBase64, mime: blob.type || 'audio/webm', lang },
  });
  if (error) throw error;
  return (data?.text ?? '').toString().trim();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio'));
    reader.onload = () => {
      const result = reader.result?.toString() ?? '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });
}