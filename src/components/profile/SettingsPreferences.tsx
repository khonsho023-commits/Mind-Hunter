import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSound } from '@/context/SoundContext';

const TONES = [
  { id: 'friendly', label: 'Friendly', desc: 'Warm and conversational' },
  { id: 'analytical', label: 'Analytical', desc: 'Reflective and pattern-focused' },
  { id: 'clinical', label: 'Clinical', desc: 'Professional and precise' },
] as const;

const MOTION_OPTS = [
  { id: 'full', label: 'Full', desc: 'Cinematic motion' },
  { id: 'reduced', label: 'Reduced', desc: 'Subtle transitions' },
  { id: 'minimal', label: 'Minimal', desc: 'Accessibility first' },
] as const;

type MotionLevel = typeof MOTION_OPTS[number]['id'];

const STORAGE_KEYS = {
  volume: 'mind-sentinel.audio.volume',
  voice: 'mind-sentinel.voice.enabled',
  voiceSpeed: 'mind-sentinel.voice.speed',
  streaming: 'mind-sentinel.ai.streaming',
};

export default function SettingsPreferences() {
  const { profile, updateProfile } = useApp();
  const { user } = useAuth();
  const sound = useSound();

  const [volume, setVolume] = useState<number>(() => Number(localStorage.getItem(STORAGE_KEYS.volume) ?? 50));
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => localStorage.getItem(STORAGE_KEYS.voice) !== 'false');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => Number(localStorage.getItem(STORAGE_KEYS.voiceSpeed) ?? 1));
  const [streaming, setStreaming] = useState<boolean>(() => localStorage.getItem(STORAGE_KEYS.streaming) !== 'false');
  const [motionLevel, setMotionLevel] = useState<MotionLevel>('full');
  const [tone, setTone] = useState<'friendly' | 'analytical' | 'clinical'>(profile?.aiTone ?? 'friendly');

  useEffect(() => {
    if (!user) return;
    supabase.from('user_settings').select('motion_intensity').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.motion_intensity) setMotionLevel(data.motion_intensity as MotionLevel);
    });
  }, [user]);

  // Apply volume to all sound layers
  useEffect(() => {
    const v = volume / 100;
    sound.setLayerVolume('ambient', v);
    sound.setLayerVolume('environmental', v);
    sound.setLayerVolume('ui', v);
    sound.setLayerVolume('session', v);
    localStorage.setItem(STORAGE_KEYS.volume, String(volume));
  }, [volume, sound]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.voice, String(voiceEnabled));
  }, [voiceEnabled]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.voiceSpeed, String(voiceSpeed));
  }, [voiceSpeed]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.streaming, String(streaming));
  }, [streaming]);

  const setMotion = async (lvl: MotionLevel) => {
    setMotionLevel(lvl);
    document.documentElement.dataset.motion = lvl;
    if (!user) return;
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, motion_intensity: lvl }, { onConflict: 'user_id' });
    if (error) toast.error('Could not save motion preference');
    else toast.success(`Motion: ${lvl}`);
  };

  const setTonePref = (t: typeof tone) => {
    setTone(t);
    updateProfile({ aiTone: t });
    toast.success(`AI tone: ${t}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* AI Behavior */}
      <Card title="AI Behavior" delay={0}>
        <div className="space-y-2">
          {TONES.map((t) => (
            <OptionRow
              key={t.id}
              active={tone === t.id}
              onClick={() => setTonePref(t.id)}
              label={t.label}
              desc={t.desc}
            />
          ))}
        </div>
        <Toggle
          className="mt-4"
          label="Streaming responses"
          desc="Stream AI replies token-by-token"
          checked={streaming}
          onChange={setStreaming}
        />
      </Card>

      {/* Motion */}
      <Card title="Motion & Atmosphere" delay={0.05}>
        <div className="space-y-2">
          {MOTION_OPTS.map((o) => (
            <OptionRow
              key={o.id}
              active={motionLevel === o.id}
              onClick={() => setMotion(o.id)}
              label={o.label}
              desc={o.desc}
            />
          ))}
        </div>
      </Card>

      {/* Audio */}
      <Card title="Audio" delay={0.1}>
        <label className="block text-sm font-ui text-foreground mb-2">Master Volume</label>
        <input
          type="range" min={0} max={100} value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">{volume}%</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => sound.playClick()} className="sentinel-btn-outline px-3 py-1.5 text-xs">Test click</button>
          <button onClick={() => sound.playMessageChime()} className="sentinel-btn-outline px-3 py-1.5 text-xs">Test chime</button>
        </div>
      </Card>

      {/* Voice */}
      <Card title="Voice" delay={0.15}>
        <Toggle
          label="Voice replies"
          desc="Speak AI responses out loud"
          checked={voiceEnabled}
          onChange={setVoiceEnabled}
        />
        <div className="mt-4">
          <label className="block text-sm font-ui text-foreground mb-2">Speaking speed · {voiceSpeed.toFixed(2)}x</label>
          <input
            type="range" min={0.5} max={1.5} step={0.05} value={voiceSpeed}
            onChange={(e) => setVoiceSpeed(Number(e.target.value))}
            disabled={!voiceEnabled}
            className="w-full accent-primary disabled:opacity-50"
          />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, delay = 0, children }: { title: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass rounded-2xl p-6"
    >
      <h3 className="text-xs font-ui tracking-[0.25em] text-muted-foreground uppercase mb-4 font-semibold">{title}</h3>
      {children}
    </motion.section>
  );
}

function OptionRow({ active, onClick, label, desc }: { active: boolean; onClick: () => void; label: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        active ? 'border-primary/60 bg-primary/10' : 'border-border/30 hover:border-border'
      }`}
    >
      <p className="text-sm font-ui text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </button>
  );
}

function Toggle({
  label, desc, checked, onChange, className,
}: { label: string; desc?: string; checked: boolean; onChange: (b: boolean) => void; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className ?? ''}`}>
      <div>
        <p className="text-sm font-ui text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-secondary'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all ${checked ? 'left-[1.4rem]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
