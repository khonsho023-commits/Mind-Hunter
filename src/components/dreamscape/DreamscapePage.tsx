import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Wind, Pause, Play } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { loadRecentPulses } from '@/lib/presence/pulse';
import { deriveSanctuary, SanctuaryState } from '@/lib/sanctuary/atmosphere';

const PROMPTS = [
  'What part of today is asking to be held?',
  'If your feelings had a colour right now, what would it be?',
  'Notice your breath. Notice it again. Nothing else needs to happen.',
  'What did you carry today that wasn\'t yours to carry?',
  'Where in your body does softness live right now?',
  'What would it look like to forgive yourself one degree more?',
];

export default function DreamscapePage() {
  const { setStage } = useApp();
  const { user } = useAuth();
  const [atmos, setAtmos] = useState<SanctuaryState | null>(null);
  const [breathing, setBreathing] = useState(true);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [promptIdx, setPromptIdx] = useState(0);
  const mx = useRef(0); const my = useRef(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!user) return;
    loadRecentPulses(user.id, 14).then((p) => setAtmos(deriveSanctuary(p)));
  }, [user]);

  // Box-breathing cycle 4-4-4
  useEffect(() => {
    if (!breathing) return;
    let t: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setPhase('in');
      t = setTimeout(() => {
        setPhase('hold');
        t = setTimeout(() => {
          setPhase('out');
          t = setTimeout(cycle, 4000);
        }, 4000);
      }, 4000);
    };
    cycle();
    return () => clearTimeout(t);
  }, [breathing]);

  // rotate prompts
  useEffect(() => {
    const i = setInterval(() => setPromptIdx((p) => (p + 1) % PROMPTS.length), 18000);
    return () => clearInterval(i);
  }, []);

  // gentle parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.current = (e.clientX / window.innerWidth) * 2 - 1;
      my.current = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    const r = setInterval(() => setTilt({ x: mx.current, y: my.current }), 80);
    return () => { window.removeEventListener('mousemove', onMove); clearInterval(r); };
  }, []);

  const palette = atmos?.palette ?? { warm: '38 50% 50%', cool: '230 30% 30%' };
  const orbScale = phase === 'in' ? 1.4 : phase === 'hold' ? 1.4 : 0.85;
  const phaseLabel = phase === 'in' ? 'Inhale' : phase === 'hold' ? 'Hold' : 'Exhale';

  const particles = useMemo(
    () => Array.from({ length: 80 }).map((_, i) => ({
      i, x: Math.random() * 100, y: Math.random() * 100,
      d: 8 + Math.random() * 14, dl: Math.random() * 6,
    })),
    [],
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      {/* Atmospheric gradients */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: [
          `radial-gradient(ellipse at 30% 30%, hsl(${palette.warm} / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(${palette.cool} / 0.55), transparent 60%), hsl(0 0% 4%)`,
          `radial-gradient(ellipse at 70% 30%, hsl(${palette.warm} / 0.55), transparent 60%), radial-gradient(ellipse at 30% 80%, hsl(${palette.cool} / 0.55), transparent 60%), hsl(0 0% 4%)`,
        ] }}
        transition={{ duration: 24, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* parallax aurora */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ x: tilt.x * -30, y: tilt.y * -20 }}
      >
        {particles.map((p) => (
          <motion.div
            key={p.i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: 3, height: 3,
              background: `hsl(${palette.warm} / 0.6)`,
              boxShadow: `0 0 ${6 + (p.i % 4) * 2}px hsl(${palette.warm} / 0.5)`,
            }}
            animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -20, 0] }}
            transition={{ duration: p.d, repeat: Infinity, delay: p.dl, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-10">
        <button
          onClick={() => setStage('dashboard')}
          className="flex items-center gap-2 text-xs font-ui tracking-[0.25em] uppercase text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return
        </button>
        <p className="text-[10px] font-ui tracking-[0.4em] uppercase text-foreground/50">
          {atmos?.caption ?? 'Dreamscape'}
        </p>
        <button
          onClick={() => setBreathing((b) => !b)}
          className="flex items-center gap-2 text-xs font-ui tracking-[0.25em] uppercase text-foreground/70 hover:text-foreground"
        >
          {breathing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {breathing ? 'Pause' : 'Breathe'}
        </button>
      </div>

      {/* Breathing orb */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{ scale: orbScale }}
          transition={{ duration: 4, ease: [0.45, 0, 0.55, 1] }}
        >
          <div
            className="w-64 h-64 rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 35%, hsl(${palette.warm} / 0.95), hsl(${palette.cool} / 0.6) 60%, transparent 80%)`,
              boxShadow: `0 0 120px hsl(${palette.warm} / 0.6), inset 0 0 80px hsl(${palette.cool} / 0.4)`,
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-foreground/10"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-foreground/10"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, delay: 1.2, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phaseLabel}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 0.85, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-48 text-xs font-ui tracking-[0.5em] uppercase text-foreground/60"
        >
          {breathing ? phaseLabel : 'Stillness'}
        </motion.p>
      </AnimatePresence>

      {/* Reflection prompt */}
      <div className="absolute bottom-12 inset-x-0 px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={promptIdx}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.2 }}
            className="text-base md:text-xl font-display text-foreground/85 max-w-2xl mx-auto leading-relaxed"
          >
            {PROMPTS[promptIdx]}
          </motion.p>
        </AnimatePresence>
        <div className="flex items-center justify-center gap-2 mt-6 text-[10px] font-ui tracking-[0.3em] uppercase text-foreground/40">
          <Wind className="w-3 h-3" /> No goal. No pressure. Just presence.
        </div>
      </div>
    </div>
  );
}
