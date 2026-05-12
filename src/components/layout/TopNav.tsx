import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useApp, AppStage } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, MessageCircle, BarChart3, Clock, Settings, User, ShieldAlert, LogOut,
  Sparkles, Moon, Mic,
} from 'lucide-react';

const NAV: { stage: AppStage; labelKey: string; icon: React.ComponentType<{ className?: string }>; emergency?: boolean }[] = [
  { stage: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { stage: 'insights', labelKey: 'nav.insights', icon: BarChart3 },
  { stage: 'history', labelKey: 'nav.history', icon: Clock },
  { stage: 'constellation', labelKey: 'nav.constellation', icon: Sparkles },
  { stage: 'dreamscape', labelKey: 'nav.dreamscape', icon: Moon },
  { stage: 'voice', labelKey: 'nav.voice', icon: Mic },
  { stage: 'profile', labelKey: 'nav.profile', icon: User },
  { stage: 'settings', labelKey: 'nav.settings', icon: Settings },
  { stage: 'emergency', labelKey: 'nav.emergency', icon: ShieldAlert, emergency: true },
];

export default function TopNav() {
  const { t } = useTranslation();
  const { stage, setStage, startNewSession } = useApp();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    setStage('login');
  };

  return (
    <header className="glass-strong border-b border-border/50 px-6 py-3 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center gap-6">
        <button
          onClick={() => setStage('dashboard')}
          className="text-base font-display gold-text tracking-widest font-bold"
        >
          MIND SENTINEL
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = stage === item.stage;
            return (
              <button
                key={item.stage}
                onClick={() => setStage(item.stage)}
                className={`relative flex items-center gap-2 text-xs font-ui px-3 py-2 rounded-lg transition-all
                  ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                  ${item.emergency ? 'text-destructive/80 hover:text-destructive' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t(item.labelKey)}</span>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 bottom-0.5 h-0.5 rounded-full"
                    style={{ background: 'var(--gradient-gold)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={startNewSession}
          className="sentinel-btn py-2 px-4 text-xs flex items-center gap-2"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {t('nav.startSession')}
        </button>
        <button
          onClick={handleLogout}
          className="sentinel-btn-outline py-2 px-3 text-xs flex items-center gap-1.5"
          title={t('common.signOut')}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
