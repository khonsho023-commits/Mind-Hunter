import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface EmotionState {
  primary: string;
  intensity: number;
  distortions: string[];
  sentiment: number;
}

export interface UserProfile {
  avatar: string;
  identityMode: 'anonymous' | 'real';
  nickname?: string;
  email?: string;
  age?: string;
  gender?: string;
  nicknameReason?: string;
  interviewAnswers: Record<string, string>;
  aiTone?: 'friendly' | 'analytical' | 'clinical';
}

export type AppStage =
  | 'login'
  | 'entry'
  | 'interview'
  | 'session'
  | 'dashboard'
  | 'insights'
  | 'history'
  | 'profile'
  | 'settings'
  | 'emergency'
  | 'constellation'
  | 'dreamscape';

interface AppContextType {
  stage: AppStage;
  setStage: (s: AppStage) => void;
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentEmotion: EmotionState | null;
  setCurrentEmotion: (e: EmotionState | null) => void;
  loadExistingSession: boolean;
  setLoadExistingSession: (b: boolean) => void;
  startNewSession: () => void;
  openExistingSession: (sessionId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const SESSION_KEY = 'mind-sentinel.currentSessionId';
const STAGE_KEY = 'mind-sentinel.lastStage';

const PERSISTED_STAGES: AppStage[] = ['session', 'dashboard', 'insights', 'history', 'profile', 'settings', 'constellation', 'dreamscape'];

export function AppProvider({ children }: { children: ReactNode }) {
  const [stage, setStageRaw] = useState<AppStage>(() => {
    try {
      const saved = localStorage.getItem(STAGE_KEY) as AppStage | null;
      if (saved && PERSISTED_STAGES.includes(saved)) return saved;
    } catch { /* ignore */ }
    return 'login';
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentSessionId, setCurrentSessionIdRaw] = useState<string | null>(() => {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  });
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState | null>(null);
  const [loadExistingSession, setLoadExistingSession] = useState(() => {
    try { return !!localStorage.getItem(SESSION_KEY); } catch { return false; }
  });

  const setStage = (s: AppStage) => {
    setStageRaw(s);
    try {
      if (PERSISTED_STAGES.includes(s)) localStorage.setItem(STAGE_KEY, s);
      else localStorage.removeItem(STAGE_KEY);
    } catch { /* ignore */ }
  };

  const setCurrentSessionId = (id: string | null) => {
    setCurrentSessionIdRaw(id);
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  };

  const updateProfile = (partial: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...partial } : null);
  };

  const startNewSession = () => {
    setCurrentSessionId(null);
    setLoadExistingSession(false);
    setStage('entry');
  };

  const openExistingSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setLoadExistingSession(true);
    setStage('entry');
  };

  // Tab-sync: if another tab switches sessions, mirror it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setCurrentSessionIdRaw(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AppContext.Provider value={{
      stage, setStage, profile, setProfile, updateProfile,
      currentSessionId, setCurrentSessionId,
      currentEmotion, setCurrentEmotion,
      loadExistingSession, setLoadExistingSession,
      startNewSession, openExistingSession,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
