import { supabase } from '@/integrations/supabase/client';

export interface UploadedAttachment {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

const ACCEPTED = [
  'image/', 'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function isAccepted(file: File): boolean {
  return ACCEPTED.some((t) => file.type.startsWith(t));
}

export async function uploadChatAttachment(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<UploadedAttachment> {
  const ext = file.name.split('.').pop() || 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  // Supabase JS doesn't expose progress; emit synthetic progress
  onProgress?.(10);
  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  onProgress?.(90);

  const { data } = supabase.storage.from('chat-attachments').getPublicUrl(path);
  onProgress?.(100);

  return {
    url: data.publicUrl,
    path,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}
