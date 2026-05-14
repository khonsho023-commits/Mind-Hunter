import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FileText, Image as ImageIcon, Download, Copy, Check, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import { EmotionState } from '@/context/AppContext';
import Lightbox from './Lightbox';
import VoicePlayer from '@/components/voice/VoicePlayer';
import { parseVoiceContent, isReflection, reflectionText } from '@/lib/voice/upload';
import { toast } from 'sonner';

export interface MessageAttachment {
  url: string;
  name: string;
  type: string;
  size?: number;
}

interface Props {
  role: 'user' | 'assistant';
  content: string;
  emotion?: EmotionState;
  timestamp?: number;
  attachments?: MessageAttachment[];
  /** True while this assistant message is actively streaming. */
  streaming?: boolean;
  onRegenerate?: () => void;
  onDelete?: () => void;
  autoplayVoice?: boolean;
}

const emotionTone: Record<string, string> = {
  calm: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'mild stress': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  'moderate anxiety': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'severe depression': 'bg-red-500/15 text-red-300 border-red-500/30',
  burnout: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageBubble({
  role, content, emotion, timestamp, attachments,
  streaming, onRegenerate, onDelete, autoplayVoice,
}: Props) {
  const isUser = role === 'user';
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);
  const images = (attachments ?? []).filter((a) => a.type.startsWith('image/'));
  const files = (attachments ?? []).filter((a) => !a.type.startsWith('image/'));

  const reflection = !isUser && isReflection(content);
  const visibleContent = reflection ? reflectionText(content) : content;
  const { text: voiceText, voice } = parseVoiceContent(visibleContent);
  const isVoice = !!voice;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`group flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-3 max-w-[88%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <motion.div
            animate={streaming ? {
              boxShadow: [
                '0 0 16px hsl(var(--gold) / 0.35)',
                '0 0 28px hsl(var(--gold) / 0.65)',
                '0 0 16px hsl(var(--gold) / 0.35)',
              ],
            } : undefined}
            transition={streaming ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm shadow-[0_0_16px_hsl(var(--gold)/0.35)]"
          >
            🧠
          </motion.div>
        )}
        <div className={`min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
          {!isUser && (
            <span className="text-[10px] font-ui tracking-[0.2em] uppercase text-muted-foreground inline-flex items-center gap-1.5">
              {reflection && <Sparkles className="w-2.5 h-2.5 text-primary/80" />}
              {reflection ? 'Reflection' : 'Dr. Sentinel'}
            </span>
          )}

          {images.length > 0 && (
            <div className={`grid gap-1.5 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} max-w-sm`}>
              {images.map((img) => (
                <motion.button
                  key={img.url}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setLightbox(img.url)}
                  className="relative group/img rounded-xl overflow-hidden border border-border/40 bg-secondary/30"
                  title={img.name}
                >
                  <img src={img.url} alt={img.name} className="w-full h-auto max-h-64 object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-background/0 group-hover/img:bg-background/25 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                    <ImageIcon className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-col gap-1.5 max-w-sm w-full">
              {files.map((f) => (
                <a
                  key={f.url}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="glass border border-border/40 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-primary/40 transition-colors"
                  title={`${f.name} · ${formatBytes(f.size)}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-ui text-foreground truncate">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {f.type.split('/').pop()} · {formatBytes(f.size)}
                    </p>
                  </div>
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}

          {(visibleContent || (!images.length && !files.length)) && (
            <div
              className={`relative rounded-2xl transition-shadow ${isVoice ? 'px-3 py-2.5' : 'px-5 py-3.5'} ${
                reflection
                  ? 'border border-primary/25 bg-primary/[0.04] backdrop-blur-md shadow-[0_0_30px_-6px_hsl(var(--gold)/0.35)]'
                  : isUser
                  ? 'bg-secondary/60 border border-border/60 text-foreground'
                  : 'glass border border-primary/20 text-foreground'
              } ${
                streaming ? 'shadow-[0_0_28px_-6px_hsl(var(--gold)/0.5)]' : reflection ? '' : 'shadow-[0_0_20px_hsl(var(--gold)/0.06)]'
              }`}
            >
              {isVoice && voice ? (
                <div className="flex flex-col gap-1.5">
                  <VoicePlayer
                    url={voice.url}
                    duration={voice.duration}
                    waveform={voice.waveform}
                    pending={voice.pending}
                    autoplay={autoplayVoice && !isUser}
                  />
                  {voiceText && voiceText !== '[Voice message]' && (
                    <p className="text-[11px] font-ui italic text-muted-foreground/80 px-1 line-clamp-3">
                      “{voiceText}”
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className={`text-sm font-body leading-relaxed prose prose-sm prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-li:my-0.5 prose-strong:text-primary prose-code:text-primary prose-code:bg-secondary/60 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:before:hidden prose-code:after:hidden ${
                    reflection ? 'italic text-foreground/85' : ''
                  }`}
                >
                  {visibleContent ? (
                    <>
                      <ReactMarkdown>{visibleContent}</ReactMarkdown>
                      {streaming && (
                        <motion.span
                          aria-hidden
                          className="inline-block w-[2px] h-[1em] bg-primary align-text-bottom ml-0.5 rounded-sm"
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                    </>
                  ) : (
                    <span className="opacity-50">…</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hover actions */}
          {content && (
            <AnimatePresence>
              {hover && !streaming && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-1 px-1 ${isUser ? 'justify-end' : ''}`}
                >
                  <button
                    onClick={copy}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
                    aria-label="Copy"
                    title="Copy message"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {!isUser && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
                      aria-label="Regenerate"
                      title="Regenerate response"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isUser && onDelete && (
                    <button
                      onClick={onDelete}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary/50 transition-colors"
                      aria-label="Delete"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {(emotion || timestamp) && (
            <div className="flex items-center gap-2 flex-wrap px-1">
              {emotion && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-ui capitalize border ${
                    emotionTone[emotion.primary] ?? 'bg-primary/15 text-primary border-primary/30'
                  }`}
                >
                  {emotion.primary}
                </span>
              )}
              {emotion?.distortions.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 rounded-full text-[10px] font-ui bg-secondary/60 border border-border text-muted-foreground capitalize"
                >
                  {d}
                </span>
              ))}
              {timestamp && (
                <span className="text-[10px] font-ui text-muted-foreground/70">
                  {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </motion.div>
  );
}

export default memo(MessageBubble, (prev, next) =>
  prev.role === next.role &&
  prev.content === next.content &&
  prev.timestamp === next.timestamp &&
  prev.streaming === next.streaming &&
  prev.emotion?.primary === next.emotion?.primary &&
  prev.emotion?.intensity === next.emotion?.intensity &&
  (prev.attachments?.length ?? 0) === (next.attachments?.length ?? 0) &&
  prev.onRegenerate === next.onRegenerate &&
  prev.onDelete === next.onDelete,
);
