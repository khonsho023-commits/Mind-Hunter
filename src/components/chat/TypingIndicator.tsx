import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 px-1"
    >
      <motion.div
        animate={{
          boxShadow: [
            '0 0 14px hsl(var(--gold) / 0.3)',
            '0 0 28px hsl(var(--gold) / 0.65)',
            '0 0 14px hsl(var(--gold) / 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm"
      >
        🧠
      </motion.div>
      <div className="glass rounded-2xl px-5 py-3.5 flex gap-1.5 border border-primary/20">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              y: [0, -5, 0],
              opacity: [0.35, 1, 0.35],
              scale: [0.85, 1.05, 0.85],
            }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </motion.div>
  );
}
