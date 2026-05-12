const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

interface MemoryItem {
  topic: string;
  emotion_pattern?: string;
  context?: string;
}

interface StreamChatParams {
  messages: ChatMsg[];
  interviewContext?: Record<string, string>;
  emotionState?: { primary: string; intensity: number; sentiment: number; distortions: string[] };
  memories?: MemoryItem[];
  systemAddenda?: string[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

export async function streamChat({ messages, interviewContext, emotionState, memories, systemAddenda, onDelta, onDone, onError }: StreamChatParams) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, interviewContext, emotionState, memories, systemAddenda }),
  });

  if (!resp.ok) {
    if (resp.status === 429) { onError('Rate limit exceeded. Please wait a moment.'); return; }
    if (resp.status === 402) { onError('AI credits depleted. Please add credits.'); return; }
    onError('AI service temporarily unavailable'); return;
  }
  if (!resp.body) { onError('No response stream'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: rdone, value } = await reader.read();
    if (rdone) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }

  // Flush remaining
  if (buf.trim()) {
    for (let raw of buf.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const json = raw.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
