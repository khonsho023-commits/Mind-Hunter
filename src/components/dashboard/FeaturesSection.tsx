import { motion } from 'framer-motion';
import { Brain, Mic, ShieldAlert, LineChart, Heart, Sparkles } from 'lucide-react';
import TiltCard from '@/components/ui/TiltCard';

const FEATURES = [
  { icon: Brain, title: 'AI Emotion Detection', desc: 'Real-time analysis of tone, language and pattern to mirror what you feel.' },
  { icon: Mic, title: 'Voice Therapy', desc: 'Speak naturally. Dr. Sentinel listens with warmth and unhurried presence.' },
  { icon: ShieldAlert, title: 'Crisis Detection', desc: 'Quietly watching for distress signals — and bringing real help when needed.' },
  { icon: LineChart, title: 'Emotional Analytics', desc: 'See your inner weather over time, with charts that respect your privacy.' },
  { icon: Heart, title: 'Recovery Tracking', desc: 'Personalized milestones that celebrate small, real progress.' },
  { icon: Sparkles, title: 'AI Companion Sessions', desc: 'A presence that remembers you between visits, without judgment.' },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-primary/5 blur-[140px] -z-10" />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-ui tracking-[0.4em] text-primary/70 uppercase mb-4">
            What is Mind Sentinel
          </p>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-5 tracking-tight">
            Therapy, <span className="gold-text">reimagined.</span>
          </h2>
          <p className="text-base md:text-lg font-body text-muted-foreground max-w-2xl mx-auto">
            Six pillars working together to make every session feel like a turning point.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
              >
                <TiltCard
                  intensity={10}
                  className="glass rounded-3xl p-8 h-full transition-all hover:gold-glow hover:border-primary/40 group cursor-default"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-sm font-body text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
