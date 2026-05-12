import { AppProvider, useApp, AppStage } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SoundProvider } from '@/context/SoundContext';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage from '@/components/LoginPage';
import ClinicEntry from '@/components/ClinicEntry';
import DoctorInterview from '@/components/DoctorInterview';
import SessionChat from '@/components/SessionChat';
import Dashboard from '@/components/Dashboard';
import InsightsPage from '@/components/insights/InsightsPage';
import HistoryPage from '@/components/history/HistoryPage';
import ProfilePage from '@/components/profile/ProfilePage';
import SettingsPage from '@/components/settings/SettingsPage';
import EmergencyChat from '@/components/emergency/EmergencyChat';
import DevVersionBadge from '@/components/ui/DevVersionBadge';
import MemoryConstellationPage from '@/components/constellation/MemoryConstellationPage';
import DreamscapePage from '@/components/dreamscape/DreamscapePage';
import VoiceModePage from '@/components/voice/VoiceModePage';

const renderStage = (stage: AppStage) => {
  switch (stage) {
    case 'login': return <LoginPage />;
    case 'entry': return <ClinicEntry />;
    case 'interview': return <DoctorInterview />;
    case 'session': return <SessionChat />;
    case 'dashboard': return <Dashboard />;
    case 'insights': return <InsightsPage />;
    case 'history': return <HistoryPage />;
    case 'profile': return <ProfilePage />;
    case 'settings': return <SettingsPage />;
    case 'emergency': return <EmergencyChat />;
    case 'constellation': return <MemoryConstellationPage />;
    case 'dreamscape': return <DreamscapePage />;
    case 'voice': return <VoiceModePage />;
    default: return <LoginPage />;
  }
};

const AppContent = () => {
  const { stage } = useApp();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center particle-bg">
        <div className="text-center">
          <h1 className="text-3xl font-display gold-text text-glow tracking-widest mb-4">MIND SENTINEL</h1>
          <p className="text-sm font-ui text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(8px)' }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        className="min-h-screen"
      >
        {renderStage(stage)}
      </motion.div>
    </AnimatePresence>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <SoundProvider>
          <AppContent />
          <DevVersionBadge />
        </SoundProvider>
      </AppProvider>
    </AuthProvider>
  );
};

export default Index;
