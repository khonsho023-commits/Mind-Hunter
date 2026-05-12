import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ClipboardCheck, MessageCircle, Brain, BarChart3, TrendingUp } from 'lucide-react';

const STEPS = [
  { icon: ClipboardCheck, title: 'Initial Assessment', desc: 'A gentle intake — your story, your pace, your boundaries.' },
  { icon: MessageCircle, title: 'AI Session', desc: 'Talk freely with Dr. Sentinel in a safe, immersive space.' },
  { icon: Brain, title: 'Emotional Analysis', desc: 'Patterns, distortions and intensity surfaced in real time.' },
  { icon: BarChart3, title: 'Insights Generation', desc: 'Your emotional landscape visualized across sessions.' },
  { icon: TrendingUp, title: 'Recovery Tracking', desc: 'Milestones that grow with you. Quiet, honest progress.' },
];

export default function TimelineSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.85], ['0%', '100%']);

  return (
    <section data-testid="timeline-section" className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center mb-24"
        >
          <p className="text-xs font-ui tracking-[0.4em] text-primary/70 uppercase mb-4">
            The Journey
          </p>
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight">
            From first word to <span className="gold-text">lasting change.</span>
          </h2>
        </motion.div>

        <div ref={ref} className="relative">
          {/* Track */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border/40 -translate-x-1/2" />
          {/* Animated progress line */}
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-8 md:left-1/2 top-0 w-px -translate-x-1/2 origin-top"
          >
            <div className="w-full h-full bg-gradient-to-b from-primary via-primary/70 to-accent shadow-[0_0_20px_hsl(var(--gold)/0.6)]" />
          </motion.div>

          <div className="space-y-20">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.7 }}
                  className={`relative flex items-center gap-6 ${
                    left ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Node */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                    <motion.div
                      whileInView={{ scale: [0.5, 1.15, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                      className="w-14 h-14 rounded-full glass-strong border border-primary/40 flex items-center justify-center gold-glow"
                    >
                      <Icon className="w-5 h-5 text-primary" />
                    </motion.div>
                  </div>

                  {/* Spacer */}
                  <div className="hidden md:block flex-1" />

                  {/* Card */}
                  <div className="ml-24 md:ml-0 flex-1 md:max-w-md">
                    <div className="glass rounded-2xl p-6 hover:border-primary/40 transition-all">
                      <p className="text-[10px] font-ui tracking-[0.3em] text-primary/70 uppercase mb-2">
                        Step {String(i + 1).padStart(2, '0')}
                      </p>
                      <h3 className="text-2xl font-display font-semibold mb-2">{s.title}</h3>
                      <p className="text-sm font-body text-muted-foreground leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
