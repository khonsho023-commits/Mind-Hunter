import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AVATARS from '@/data/avatars';
import { useApp, UserProfile } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import GenderSelector from '@/components/login/GenderSelector';

type LoginStep = 'avatar' | 'identity' | 'anonymous-form' | 'real-form' | 'resume';

const LoginPage = () => {
  const { t } = useTranslation();
  const { setStage, setProfile } = useApp();
  const { signUpAnonymous, signUpWithEmail, signInWithEmail, user } = useAuth();
  const [step, setStep] = useState<LoginStep>('avatar');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [identityMode, setIdentityMode] = useState<'anonymous' | 'real'>('anonymous');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '', email: '', password: '', age: '', gender: '', nicknameReason: '', resumeEmail: '', resumePassword: '',
  });

  const handleAnonymousComplete = async () => {
    setIsLoading(true);
    try {
      const anonUser = await signUpAnonymous();
      if (!anonUser) { toast.error(t('login.errors.anonFailed')); return; }

      // Update profile in database
      await supabase.from('profiles').update({
        avatar: selectedAvatar,
        identity_mode: 'anonymous',
        nickname: formData.nickname,
        age: formData.age,
        gender: formData.gender,
        nickname_reason: formData.nicknameReason,
      }).eq('user_id', anonUser.id);

      setProfile({
        avatar: selectedAvatar,
        identityMode: 'anonymous',
        nickname: formData.nickname,
        age: formData.age,
        gender: formData.gender,
        nicknameReason: formData.nicknameReason,
        interviewAnswers: {},
      });
      setStage('dashboard');
    } catch (e) {
      toast.error(t('common.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealComplete = async () => {
    setIsLoading(true);
    try {
      const result = isLogin
        ? await signInWithEmail(formData.email, formData.password)
        : await signUpWithEmail(formData.email, formData.password);

      if (result.error) { toast.error(result.error); return; }
      if (!result.user) { toast.error(t('login.errors.authFailed')); return; }

      if (!isLogin) {
        await supabase.from('profiles').update({
          avatar: selectedAvatar,
          identity_mode: 'real',
          email: formData.email,
          age: formData.age,
          gender: formData.gender,
        }).eq('user_id', result.user.id);
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', result.user.id)
        .single();

      if (profileData) {
        setProfile({
          avatar: profileData.avatar,
          identityMode: profileData.identity_mode as 'anonymous' | 'real',
          nickname: profileData.nickname ?? undefined,
          email: profileData.email ?? undefined,
          age: profileData.age ?? undefined,
          gender: profileData.gender ?? undefined,
          nicknameReason: profileData.nickname_reason ?? undefined,
          interviewAnswers: (profileData.interview_answers as Record<string, string>) ?? {},
        });
      }

      setStage('dashboard');
    } catch (e) {
      toast.error(t('common.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithEmail(formData.resumeEmail, formData.resumePassword);
      if (result.error) { toast.error(result.error); return; }
      if (!result.user) { toast.error(t('login.errors.loginFailed')); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', result.user.id)
        .single();

      if (profileData) {
        setProfile({
          avatar: profileData.avatar,
          identityMode: profileData.identity_mode as 'anonymous' | 'real',
          nickname: profileData.nickname ?? undefined,
          email: profileData.email ?? undefined,
          age: profileData.age ?? undefined,
          gender: profileData.gender ?? undefined,
          interviewAnswers: (profileData.interview_answers as Record<string, string>) ?? {},
        });
      }
      setStage('dashboard');
    } catch (e) {
      toast.error(t('common.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center particle-bg warm-vignette relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold/5 blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gold-dark/5 blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <motion.div className="relative z-10 w-full max-w-2xl mx-4" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <motion.div className="text-center mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h1 className="text-4xl md:text-5xl font-display gold-text text-glow tracking-widest">{t('brand.title')}</h1>
          <p className="text-muted-foreground font-ui text-sm tracking-[0.3em] mt-2 uppercase">{t('brand.tagline')}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'avatar' && (
            <motion.div key="avatar" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display text-foreground mb-6 text-center">{t('login.chooseAvatar')}</h2>
              <div className="grid grid-cols-5 gap-3 mb-8">
                {AVATARS.map(av => (
                  <button key={av.id} onClick={() => setSelectedAvatar(av.id)}
                    className={`avatar-ring rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${selectedAvatar === av.id ? 'selected glass-strong' : 'hover:bg-secondary/50'}`}>
                    <span className="text-3xl">{av.emoji}</span>
                    <span className="text-[10px] font-ui text-muted-foreground truncate w-full text-center">{av.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('resume')} className="sentinel-btn-outline flex-1">{t('login.resumeSession')}</button>
                <button onClick={() => selectedAvatar && setStep('identity')} disabled={!selectedAvatar} className="sentinel-btn flex-1 disabled:opacity-30 disabled:cursor-not-allowed">{t('common.continue')}</button>
              </div>
            </motion.div>
          )}

          {step === 'identity' && (
            <motion.div key="identity" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display text-foreground mb-6 text-center">{t('login.identityMode')}</h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => { setIdentityMode('anonymous'); setStep('anonymous-form'); }} className="glass rounded-xl p-6 text-center hover:gold-glow transition-all group">
                  <span className="text-4xl block mb-3">🎭</span>
                  <span className="font-display text-foreground group-hover:text-primary transition-colors">{t('login.anonymous')}</span>
                  <p className="text-xs font-ui text-muted-foreground mt-2">{t('login.anonymousDesc')}</p>
                </button>
                <button onClick={() => { setIdentityMode('real'); setIsLogin(false); setStep('real-form'); }} className="glass rounded-xl p-6 text-center hover:gold-glow transition-all group">
                  <span className="text-4xl block mb-3">👤</span>
                  <span className="font-display text-foreground group-hover:text-primary transition-colors">{t('login.realIdentity')}</span>
                  <p className="text-xs font-ui text-muted-foreground mt-2">{t('login.realIdentityDesc')}</p>
                </button>
              </div>
              <button onClick={() => setStep('avatar')} className="sentinel-btn-outline w-full">{t('common.back')}</button>
            </motion.div>
          )}

          {step === 'anonymous-form' && (
            <motion.div key="anon-form" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display text-foreground mb-6 text-center">{t('login.anonymousProfile')}</h2>
              <div className="space-y-4">
                <InputField label={t('login.fields.nickname')} value={formData.nickname} onChange={v => updateField('nickname', v)} placeholder={t('login.fields.nicknamePh')} />
                <InputField label={t('login.fields.age')} value={formData.age} onChange={v => updateField('age', v)} placeholder={t('login.fields.agePh')} type="number" />
                <GenderSelector value={formData.gender} onChange={v => updateField('gender', v)} />
                <InputField label={t('login.fields.nicknameReason')} value={formData.nicknameReason} onChange={v => updateField('nicknameReason', v)} placeholder={t('login.fields.nicknameReasonPh')} />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('identity')} className="sentinel-btn-outline flex-1">{t('common.back')}</button>
                <button onClick={handleAnonymousComplete} disabled={!formData.nickname || !formData.age || isLoading} className="sentinel-btn flex-1 disabled:opacity-30">
                  {isLoading ? t('login.creating') : t('login.enter')}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'real-form' && (
            <motion.div key="real-form" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display text-foreground mb-6 text-center">
                {isLogin ? t('login.signIn') : t('login.createAccount')}
              </h2>
              <div className="space-y-4">
                <InputField label={t('login.fields.email')} value={formData.email} onChange={v => updateField('email', v)} placeholder={t('login.fields.emailPh')} type="email" />
                <InputField label={t('login.fields.password')} value={formData.password} onChange={v => updateField('password', v)} placeholder={t('login.fields.passwordPh')} type="password" />
                {!isLogin && (
                  <>
                    <InputField label={t('login.fields.age')} value={formData.age} onChange={v => updateField('age', v)} placeholder={t('login.fields.agePh')} type="number" />
                    <GenderSelector value={formData.gender} onChange={v => updateField('gender', v)} />
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('identity')} className="sentinel-btn-outline flex-1">{t('common.back')}</button>
                <button onClick={handleRealComplete} disabled={!formData.email || !formData.password || isLoading} className="sentinel-btn flex-1 disabled:opacity-30">
                  {isLoading ? t('login.loading') : isLogin ? t('login.signIn') : t('login.createAccount')}
                </button>
              </div>
              <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-xs font-ui text-muted-foreground mt-4 hover:text-primary transition-colors">
                {isLogin ? t('login.noAccount') : t('login.hasAccount')}
              </button>
            </motion.div>
          )}

          {step === 'resume' && (
            <motion.div key="resume" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display text-foreground mb-6 text-center">{t('login.continuePrev')}</h2>
              <div className="space-y-4">
                <InputField label={t('login.fields.email')} value={formData.resumeEmail} onChange={v => updateField('resumeEmail', v)} placeholder={t('login.fields.emailPh')} type="email" />
                <InputField label={t('login.fields.password')} value={formData.resumePassword} onChange={v => updateField('resumePassword', v)} placeholder={t('login.fields.passwordPh')} type="password" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('avatar')} className="sentinel-btn-outline flex-1">{t('common.back')}</button>
                <button onClick={handleResume} disabled={!formData.resumeEmail || !formData.resumePassword || isLoading} className="sentinel-btn flex-1 disabled:opacity-30">
                  {isLoading ? t('login.loading') : t('login.resume')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

function InputField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-ui text-muted-foreground mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-foreground font-ui text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-ui text-muted-foreground mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-foreground font-ui text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all">
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default LoginPage;
