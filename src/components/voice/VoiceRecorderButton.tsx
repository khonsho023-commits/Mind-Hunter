import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Trash2, Send, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { startRecording } from '@/lib/voice/recorder';
import type { VoiceRecording } from '@/lib/voice/recorder';
import Waveform from './Waveform';
import { toast } from 'sonner';

interface Props {
  disabled?: boolean;
  onRecorded: (rec: VoiceRecording, transcript: string) => void;
}

type SR = {
  start(): void; stop(): void; abort(): void;
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

// Map app i18n code → BCP-47 STT locale. Arabic uses Saudi as a strong default
// (covers MSA + most dialects in browser engines); falls back gracefully.
const STT_LANG: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
};

function makeSTT(lang: string): SR | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = lang;
  return r;
}

export default function VoiceRecorderButton({ disabled, onRecorded }: Props) {
  const { i18n } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<number[]>(Array(36).fill(0.05));
  const [level, setLevel] = useState(0);
  const handleRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const sttRef = useRef<SR | null>(null);
  const transcriptRef = useRef('');
  const cancelledRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => () => stopAll(true), []);

  function stopAll(silent: boolean) {
    cancelAnimationFrame(rafRef.current);
    if (sttRef.current) { try { sttRef.current.stop(); } catch { /* */ } sttRef.current = null; }
    if (silent && handleRef.current) handleRef.current.cancel();
    handleRef.current = null;
  }

  const begin = async () => {
    if (disabled || recording) return;
    console.log('[voice] recording started');
    cancelledRef.current = false;
    transcriptRef.current = '';
    try {
      const h = await startRecording();
      handleRef.current = h;
      setRecording(true);
      setElapsed(0);

      // Pick STT language from current i18n locale (preserves punctuation & native script).
      const base = (i18n.language || 'en').split('-')[0];
      const sttLang = STT_LANG[base] ?? i18n.language ?? 'en-US';
      const stt = makeSTT(sttLang);
      if (stt) {
        stt.onresult = (e) => {
          let finalText = ''; let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
          }
          if (finalText) transcriptRef.current = (transcriptRef.current + ' ' + finalText).trim();
          if (interim && !transcriptRef.current) transcriptRef.current = interim.trim();
          const heard = (finalText || interim).trim();
          if (heard) console.log('[voice] transcript detected', { lang: sttLang, transcript: heard });
        };
        stt.onerror = () => { console.log('[voice] browser STT unavailable or interrupted', { lang: sttLang }); };
        stt.onend = () => { /* may auto-stop; ok */ };
        try { stt.start(); sttRef.current = stt; } catch { /* */ }
      }

      const tick = () => {
        const hh = handleRef.current;
        if (!hh) return;
        setElapsed(hh.duration());
        setLive(hh.getLiveWave());
        setLevel(hh.getLevel());
        if (hh.duration() > 300) finish();
        else rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.warn('mic', e);
      toast.error('Microphone unavailable. Please grant access and retry.');
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    stopAll(true);
    setRecording(false);
  };

  const finish = async () => {
    const h = handleRef.current;
    if (!h) { setRecording(false); return; }
    cancelAnimationFrame(rafRef.current);
    if (sttRef.current) { try { sttRef.current.stop(); } catch { /* */ } sttRef.current = null; }
    const rec = await h.stop();
    handleRef.current = null;
    setRecording(false);
    if (cancelledRef.current || !rec) return;
    if (rec.duration < 0.4) {
      toast('Hold a moment longer to record.');
      return;
    }
    onRecorded(rec, transcriptRef.current);
  };

  // Glow scales with input loudness
  const glowScale = 1 + Math.min(0.25, level * 0.6);

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2 glass-strong border border-destructive/30 rounded-full pl-2.5 pr-1 py-1 shadow-[0_0_24px_-6px_hsl(var(--destructive)/0.5)]"
          >
            <button
              type="button"
              onClick={cancel}
              className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              aria-label="Cancel"
              title="Cancel"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <Waveform values={live} active color="hsl(var(--destructive))" height={20} barWidth={2} gap={2} className="w-32" />
            <span className="text-[11px] font-ui tabular-nums text-muted-foreground min-w-[34px] text-right">
              {formatTime(elapsed)}
            </span>
            <motion.button
              type="button"
              onClick={finish}
              whileTap={{ scale: 0.92 }}
              className="p-1.5 rounded-full bg-primary text-background"
              aria-label="Send voice message"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => { e.preventDefault(); begin(); }}
        onPointerUp={() => { if (recording) finish(); }}
        onPointerLeave={() => { /* keep recording on accidental drift */ }}
        onContextMenu={(e) => e.preventDefault()}
        whileTap={{ scale: 0.94 }}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
          recording
            ? 'bg-destructive/25 border border-destructive/60 text-destructive'
            : 'glass border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label={recording ? 'Release to send' : 'Hold to record voice'}
        title={recording ? 'Release to send' : 'Hold to record (tap to start, tap again to stop)'}
      >
        {recording ? (
          <>
            {/* Outer breathing ring */}
            <motion.span
              className="absolute -inset-1 rounded-full border border-destructive/40"
              animate={{ scale: [1, 1.5, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            {/* Inner reactive halo driven by mic level */}
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, hsl(var(--destructive)/0.45), transparent 70%)',
                transform: `scale(${glowScale})`,
                transition: 'transform 90ms ease-out',
              }}
            />
            <Square className="w-3.5 h-3.5 fill-current relative" />
          </>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </motion.button>
    </div>
  );
}

function formatTime(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
