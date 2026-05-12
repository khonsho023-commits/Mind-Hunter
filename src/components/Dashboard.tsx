import TopNav from '@/components/layout/TopNav';
import AnimatedBackdrop from '@/components/ui/AnimatedBackdrop';
import CustomCursor from '@/components/ui/CustomCursor';
import FloatingBackButton from '@/components/ui/FloatingBackButton';
import HeroSection from '@/components/dashboard/HeroSection';
import FeaturesSection from '@/components/dashboard/FeaturesSection';
import TimelineSection from '@/components/dashboard/TimelineSection';
import AnalyticsSection from '@/components/dashboard/AnalyticsSection';
import { motion } from 'framer-motion';

const Dashboard = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative warm-vignette overflow-x-hidden"
    >
      <AnimatedBackdrop />
      <CustomCursor />
      <TopNav />
      <FloatingBackButton />

      <main>
        <HeroSection />
        <FeaturesSection />
        <TimelineSection />
        <AnalyticsSection />
      </main>

      <footer className="relative border-t border-border/30 px-6 py-10 text-center">
        <p className="text-xs font-ui tracking-[0.3em] text-muted-foreground uppercase">
          Mind Sentinel · A quiet companion for your inner world
        </p>
      </footer>
    </motion.div>
  );
};

export default Dashboard;
