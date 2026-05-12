import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Square } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamChat, ChatMsg } from '@/lib/streamChat';
import { analyzeEmotion } from '@/lib/emotionEngine';
import { createSTT, createTTS } from '@/lib/voice/providers';
import { useEmotionalEngine } from '@/hooks/useEmotionalEngine';

export default function VoiceModePage() {
  const { setStage, profile, currentSessionId, setCurrentSessionId } = useApp();
  const { user } = useAuth();
  const engine = useEmotionalEngine();
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [transcript, setTranscript] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(36).fill(0.1));
  const historyRef = useRef<ChatMsg[]>([]);
  const sessionRef = useRef<string | null>(null);

  const tts = useMemo(() => createTTS({ rate: 0.92, pitch: 0.94 }), []);
  const sttRef = useRef<ReturnType<typeof createSTT> | null>(null);

  // Ensure a session exists
  useEffect(() => {
    if (!user) return;
    if (currentSessionId) { sessionRef.current = currentSessionId; return; }
    supabase.from('sessions').insert({ user_id: user.id }).select('id').single()
      .then(({ data }) => {
        if (data?.id) { sessionRef.current = data.id; setCurrentSessionId(data.id); }
      });
  }, [user, currentSessionId, setCurrentSessionId]);

  // Animated waveform driven by mic level when supported, else synthetic
  useEffect(() => {
    let raf = 0; let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null; let ctx: AudioContext | null = null;
    const synthetic = () => {
      raf = requestAnimationFrame(synthetic);
      const t = Date.now() / 200;
      setWaveform((prev) => prev.map((_, i) =>
        listening || aiSpeaking
          ? Math.max(0.1, Math.min(1, 0.4 + Math.sin(t + i * 0.4) * 0.3 + Math.random() * 0.15))
          : 0.1 + Math.sin(t / 4 + i * 0.3) * 0.05,
      ));
    };
    if (listening && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        stream = s;
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const src = ctx.createMediaStreamSource(s);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(buf);
          setWaveform(Array.from({ length: 36 }, (_, i) => Math.max(0.08, (buf[i % buf.length] ?? 0) / 255)));
          raf = requestAnimationFrame(tick);
        };
        tick();
      }).catch(() => { raf = requestAnimationFrame(synthetic); });
    } else {
      raf = requestAnimationFrame(synthetic);
    }
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [listening, aiSpeaking]);

  const speakAndRespond = async (userText: string) => {
    if (!user || !sessionRef.current) return;
    setTranscript((prev) => [...prev, { role: 'user', text: userText }]);
    historyRef.current = [...historyRef.current, { role: 'user', content: userText }];

    await supabase.from('chat_messages').insert({
      session_id: sessionRef.current, user_id: user.id, role: 'user', content: userText,
    });

    const emotion = analyzeEmotion(userText);
    const prepared = await engine.prepareTurn(user.id, userText, emotion).catch(() => null);
    engine.recordTurn({
      userId: user.id, sessionId: sessionRef.current, messageId: null,
      position: historyRef.current.length, text: userText, emotion,
    }).catch(() => {});

    setAiSpeaking(true);
    let full = '';
    await streamChat({
      messages: historyRef.current,
      interviewContext: profile?.interviewAnswers,
      emotionState: emotion,
      memories: prepared?.recall ?? [],
      systemAddenda: prepared?.systemAddenda ?? [],
      onDelta: (c) => { full += c; },
      onDone: async () => {
        const reply = full.trim();
        setTranscript((prev) => [...prev, { role: 'assistant', text: reply }]);
        historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
        if (sessionRef.current) {
          await supabase.from('chat_messages').insert({
            session_id: sessionRef.current, user_id: user.id, role: 'assistant', content: reply,
          });
        }
        tts.speak(reply);
        // approximate speaking duration
        setTimeout(() => setAiSpeaking(false), Math.min(20000, 1200 + reply.length * 45));
      },
      onError: () => setAiSpeaking(false),
    });
  };

  const toggleListening = () => {
    if (listening) { sttRef.current?.stop(); setListening(false); return; }
    if (aiSpeaking) { tts.stop(); setAiSpeaking(false); }
    const stt = createSTT({
      onPartial: (t) => setPartial(t),
      onFinal: (t) => { setPartial(''); if (t.length >= 2) speakAndRespond(t); },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
    if (!stt.available) { return; }
    sttRef.current = stt;
    stt.start();
    setListening(true);
  };

  useEffect(() => () => { sttRef.current?.stop(); tts.stop(); }, [tts]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Atmosphere */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: [
          'radial-gradient(ellipse at 30% 30%, hsl(38 60% 45% / 0.45), transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(220 50% 35% / 0.45), transparent 60%), hsl(0 0% 4%)',
          'radial-gradient(ellipse at 70% 30%, hsl(38 60% 45% / 0.45), transparent 60%), radial-gradient(ellipse at 30% 80%, hsl(220 50% 35% / 0.45), transparent 60%), hsl(0 0% 4%)',
        ] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: 'reverse' }}
      />
      <button onClick={() => setStage('dashboard')}
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-xs font-ui tracking-[0.25em] uppercase text-foreground/70 hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Return
      </button>
      <p className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-ui tracking-[0.4em] uppercase text-foreground/50">
        Voice Mode
      </p>

      {/* Voice orb */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-10">
        <motion.button
          onClick={toggleListening}
          whileTap={{ scale: 0.96 }}
          className="relative w-72 h-72 rounded-full focus:outline-none"
          aria-label={listening ? 'Stop listening' : 'Start listening'}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: listening
                ? 'radial-gradient(circle at 35% 35%, hsl(38 80% 60% / 0.95), hsl(20 70% 40% / 0.6) 60%, transparent 80%)'
                : aiSpeaking
                ? 'radial-gradient(circle at 35% 35%, hsl(180 70% 55% / 0.85), hsl(220 60% 35% / 0.55) 60%, transparent 80%)'
                : 'radial-gradient(circle at 35% 35%, hsl(38 40% 35% / 0.7), hsl(220 40% 25% / 0.4) 60%, transparent 80%)',
              boxShadow: listening
                ? '0 0 140px hsl(38 80% 60% / 0.7)'
                : aiSpeaking ? '0 0 140px hsl(180 70% 55% / 0.6)' : '0 0 60px hsl(38 30% 30% / 0.5)',
            }}
            animate={{ scale: listening || aiSpeaking ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* waveform ring */}
          <svg viewBox="-100 -100 200 200" className="absolute inset-0 w-full h-full pointer-events-none">
            {waveform.map((v, i) => {
              const angle = (i / waveform.length) * Math.PI * 2 - Math.PI / 2;
              const r1 = 86; const r2 = 86 + v * 22;
              return (
                <line key={i}
                  x1={Math.cos(angle) * r1} y1={Math.sin(angle) * r1}
                  x2={Math.cos(angle) * r2} y2={Math.sin(angle) * r2}
                  stroke={listening ? 'hsl(38 80% 70%)' : aiSpeaking ? 'hsl(180 70% 70%)' : 'hsl(0 0% 60% / 0.4)'}
                  strokeWidth={1.5} strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {listening
              ? <Square className="w-8 h-8 text-foreground/90" />
              : <Mic className="w-10 h-10 text-foreground/90" />}
          </div>
        </motion.button>

        <p className="text-xs font-ui tracking-[0.4em] uppercase text-foreground/60">
          {aiSpeaking ? 'Sentinel is speaking' : listening ? 'Listening…' : 'Tap to speak'}
        </p>
      </div>

      {/* Live transcript / partial */}
      <div className="absolute bottom-8 inset-x-0 px-6 max-h-64 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-2">
          <AnimatePresence initial={false}>
            {transcript.slice(-4).map((t, i) => (
              <motion.div
                key={`${i}-${t.text.slice(0, 20)}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 0.85, y: 0 }} exit={{ opacity: 0 }}
                className={`text-sm font-body ${t.role === 'user' ? 'text-foreground/90 text-right' : 'text-foreground/70 text-left'}`}
              >
                <span className="text-[9px] uppercase tracking-[0.3em] mr-2 text-foreground/40">
                  {t.role === 'user' ? 'you' : 'sentinel'}
                </span>
                {t.text}
              </motion.div>
            ))}
            {partial && (
              <motion.div key="partial" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                className="text-sm font-body text-foreground/60 italic text-right">
                {partial}…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!createSTT({ onFinal: () => {} }).available && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-xs text-destructive">
          <MicOff className="w-3.5 h-3.5" /> Voice recognition unavailable in this browser.
        </div>
      )}
    </div>
  );
}
