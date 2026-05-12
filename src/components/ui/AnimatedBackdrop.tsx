import { motion } from 'framer-motion';

/** Subtle slow-moving gradient + floating glow particles. Stays behind content. */
export default function AnimatedBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-1/3 -left-1/3 h-[80vh] w-[80vh] rounded-full blur-[120px] opacity-30"
        style={{ background: 'radial-gradient(circle, hsl(var(--gold) / 0.35), transparent 70%)' }}
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-1/3 -right-1/3 h-[80vh] w-[80vh] rounded-full blur-[120px] opacity-25"
        style={{ background: 'radial-gradient(circle, hsl(20 30% 25% / 0.5), transparent 70%)' }}
        animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/40"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
