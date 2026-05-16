import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Waveform from './Waveform';

interface Props {
  url?: string;
  duration: number;
  waveform: number[];
  accent?: 'gold' | 'muted';
  pending?: boolean;
  autoplay?: boolean;
}

export default function VoicePlayer({ url, duration, waveform, accent = 'gold', pending, autoplay }: Props) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t_, setT] = useState(0);

  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    a.preload = 'metadata';
    audioRef.current = a;
    const onTime = () => setT(a.currentTime);
    const onEnd = () => { setPlaying(false); setT(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.pause();
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (!autoplay || !audioRef.current || pending) return;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => { /* browser may block autoplay */ });
  }, [autoplay, pending, url]);

  const toggle = () => {
    if (pending) return;
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => { /* */ }); }
  };

  const seek = (ratio: number) => {
    if (pending) return;
    const a = audioRef.current; if (!a) return;
    a.currentTime = ratio * (a.duration || duration);
    setT(a.currentTime);
  };

  const total = a_dur(audioRef.current, duration);
  const progress = total > 0 ? Math.min(1, t_ / total) : 0;
  const color = accent === 'gold' ? 'hsl(var(--gold))' : 'hsl(var(--foreground) / 0.65)';

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[320px]">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={toggle}
        disabled={pending || !url}
        className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_16px_-4px_hsl(var(--gold)/0.5)] disabled:opacity-60 disabled:cursor-wait"
        aria-label={pending ? t('voice.generatingVoice') : playing ? t('voice.pause') : t('voice.play')}
      >
        {pending ? <span className="w-3 h-3 rounded-full bg-primary animate-pulse" /> : playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
      </motion.button>
      <Waveform
        values={waveform.length ? waveform : new Array(40).fill(0.4)}
        progress={progress}
        active={playing || pending}
        color={color}
        height={26}
        barWidth={2.5}
        gap={2}
        className="flex-1"
        onSeek={seek}
      />
      <span className="text-[10px] font-ui tabular-nums text-muted-foreground min-w-[34px] text-end">
        {pending ? '…' : format(playing ? t_ : total)}
      </span>
    </div>
  );
}

function a_dur(a: HTMLAudioElement | null, fallback: number) {
  const d = a?.duration;
  return d && isFinite(d) && d > 0 ? d : fallback;
}

function format(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
