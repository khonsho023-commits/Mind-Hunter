import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EmotionState } from '@/context/AppContext';

/**
 * Ambient emotional atmosphere — a single fixed-position canvas of soft
 * radial gradients that gently breathes and re-tints based on the current
 * emotional state. Pure presentation, GPU-only transforms, listens to
 * prefers-reduced-motion. Sits behind everything, never interactive.
 */

interface Props {
  emotion: EmotionState | null;
  active?: boolean;
  /** When true (e.g. assistant streaming), pulse glow gently. */
  streaming?: boolean;
}

interface Tone {
  warm: string;   // hsl values without hsl() wrapper
  cool: string;
  glow: number;   // 0..1 ambient glow multiplier
  saturation: number; // 0..1
}

function toneFor(emotion: EmotionState | null): Tone {
  const p = (emotion?.primary || '').toLowerCase();
  const intensity = emotion?.intensity ?? 0.3;
  if (!emotion || p.includes('calm')) {
    return { warm: '38 55% 60%', cool: '180 30% 40%', glow: 0.55, saturation: 1 };
  }
  if (p.includes('anxiety') || p.includes('stress')) {
    return { warm: '28 45% 55%', cool: '210 35% 45%', glow: 0.35 + intensity * 0.2, saturation: 0.75 };
  }
  if (p.includes('depress') || p.includes('sad') || p.includes('grief')) {
    return { warm: '230 25% 45%', cool: '260 25% 38%', glow: 0.28, saturation: 0.55 };
  }
  if (p.includes('anger')) {
    return { warm: '14 55% 50%', cool: '20 40% 35%', glow: 0.45, saturation: 0.85 };
  }
  if (p.includes('burnout')) {
    return { warm: '270 25% 45%', cool: '210 20% 35%', glow: 0.32, saturation: 0.65 };
  }
  return { warm: '38 50% 55%', cool: '20 25% 30%', glow: 0.5, saturation: 0.95 };
}

export default function EmotionalAtmosphere({ emotion, active = true, streaming = false }: Props) {
  const tone = useMemo(() => toneFor(emotion), [emotion]);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Smoothly transition CSS vars rather than swapping classes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--atm-warm', tone.warm);
    el.style.setProperty('--atm-cool', tone.cool);
    el.style.setProperty('--atm-glow', String(tone.glow));
    el.style.setProperty('--atm-sat', String(tone.saturation));
  }, [tone]);

  if (!active) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        // sensible defaults so initial paint isn't blank
        ['--atm-warm' as string]: tone.warm,
        ['--atm-cool' as string]: tone.cool,
        ['--atm-glow' as string]: tone.glow,
        ['--atm-sat' as string]: tone.saturation,
        filter: `saturate(calc(var(--atm-sat) * 100%))`,
        transition: 'filter 1.6s ease',
      }}
    >
      <motion.div
        className="absolute -inset-[10%]"
        style={{
          background:
            'radial-gradient(60% 50% at 25% 30%, hsl(var(--atm-warm) / calc(var(--atm-glow) * 0.18)) 0%, transparent 70%),' +
            'radial-gradient(55% 45% at 75% 70%, hsl(var(--atm-cool) / calc(var(--atm-glow) * 0.14)) 0%, transparent 70%),' +
            'radial-gradient(80% 60% at 50% 100%, hsl(var(--atm-warm) / calc(var(--atm-glow) * 0.10)) 0%, transparent 75%)',
          willChange: 'transform, opacity',
        }}
        animate={
          reduce
            ? undefined
            : {
                scale: [1, 1.025, 1],
                opacity: streaming ? [0.85, 1, 0.85] : [0.75, 0.9, 0.75],
              }
        }
        transition={{ duration: streaming ? 4.2 : 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* faint depth blur halo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(closest-side at 50% 60%, transparent 55%, hsl(20 12% 5% / 0.45) 100%)',
        }}
      />
    </div>
  );
}
