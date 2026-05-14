import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, BarChart3, Wind, LayoutDashboard, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp, EmotionState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { analyzeEmotion, generateRecommendations, detectCrisis } from '@/lib/emotionEngine';
import { streamChat, ChatMsg } from '@/lib/streamChat';
import { createPacedDelta } from '@/lib/pacedStream';
import EmotionalAtmosphere from '@/components/ui/EmotionalAtmosphere';
import { toast } from 'sonner';

import BreathingExercise from '@/components/BreathingExercise';
import MoodTracker from '@/components/MoodTracker';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatInput from '@/components/chat/ChatInput';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import { useSound } from '@/context/SoundContext';
import { loadDraft, saveDraft, loadScroll, useSessionScrollMemory } from '@/lib/sessionMemory';
import { useEmotionalEngine } from '@/hooks/useEmotionalEngine';
import { uploadVoiceMessage, encodeVoiceContent, encodeReflection } from '@/lib/voice/upload';
import { generateVoiceReply, uploadAssistantVoice } from '@/lib/voice/voiceReply';
import { transcribeVoice } from '@/lib/voice/transcribe';
import { shouldReflect, fetchReflection } from '@/lib/reflection';
import type { VoiceRecording } from '@/lib/voice/recorder';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: EmotionState;
  ts: number;
}

interface MemoryItem {
  topic: string;
  emotion_pattern?: string;
  context?: string;
}

function emotionToMood(emotion: EmotionState | null): { opacity: number } {
  if (!emotion) return { opacity: 0.3 };
  const p = emotion.primary.toLowerCase();
  if (p.includes('anxiety') || p.includes('stress')) return { opacity: 0.2 };
  if (p.includes('sadness') || p.includes('depress')) return { opacity: 0.35 };
  return { opacity: 0.3 };
}

function extractTopics(messages: DisplayMessage[]): string[] {
  const userMsgs = messages.filter((m) => m.role === 'user').map((m) => m.content.toLowerCase());
  const topicKeywords = [
    'work', 'family', 'relationship', 'sleep', 'anxiety', 'stress', 'school',
    'money', 'health', 'loneliness', 'grief', 'anger', 'fear', 'trauma',
    'self-esteem', 'motivation', 'career', 'friends',
  ];
  const found = new Set<string>();
  for (const msg of userMsgs) {
    for (const kw of topicKeywords) if (msg.includes(kw)) found.add(kw);
  }
  return Array.from(found).slice(0, 5);
}

const REFLECTION_PROMPTS = [
  "Take a moment to notice how you're feeling right now. Has anything shifted since we started?",
  "What's one thing you'd like to carry forward from today's session?",
  "Let's pause for a moment. You're doing important work here.",
  'Would you like to try a brief grounding exercise? Focus on 5 things you can see around you.',
];

const SessionChat = () => {
  const { t, i18n } = useTranslation();
  const sound = useSound();
  const {
    setStage, profile, currentSessionId, setCurrentSessionId,
    currentEmotion, setCurrentEmotion, loadExistingSession, setLoadExistingSession,
  } = useApp();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathingCount, setBreathingCount] = useState(0);
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [emotionLog, setEmotionLog] = useState<EmotionState[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [panelTab, setPanelTab] = useState<'insights' | 'mood'>('insights');
  const engine = useEmotionalEngine();
  const breakthroughRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const reflectionSentRef = useRef(false);
  const restoredScrollRef = useRef<string | null>(null);

  // Per-session draft persistence
  useEffect(() => {
    setInput(loadDraft(currentSessionId));
  }, [currentSessionId]);
  useEffect(() => {
    const t = setTimeout(() => saveDraft(currentSessionId, input), 250);
    return () => clearTimeout(t);
  }, [input, currentSessionId]);

  // Per-session scroll memory
  useSessionScrollMemory(currentSessionId, scrollRef);

  // Session timer
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - sessionStart), 1000);
    return () => clearInterval(iv);
  }, [sessionStart]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  // Load memories
  useEffect(() => {
    const loadMemories = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('session_memories')
        .select('topic, emotion_pattern, context')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) setMemories(data);
    };
    loadMemories();
  }, [user]);

  // Init session
  useEffect(() => {
    const initSession = async () => {
      if (!user) return;
      if (loadExistingSession && currentSessionId) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true });
        if (msgs) {
          const display: DisplayMessage[] = msgs.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            ts: new Date(m.created_at).getTime(),
          }));
          setMessages(display);
          setChatHistory(
            msgs
              .filter((m) => !m.content.startsWith('\u0001REFLECT\u0001'))
              .map((m) => {
                // strip voice metadata so AI only sees the transcript
                const c = m.content.split('\u0001VOICE\u0001')[0] || '[Voice message]';
                return { role: m.role as 'user' | 'assistant', content: c };
              }),
          );
          if (currentSessionId && restoredScrollRef.current !== currentSessionId) {
            restoredScrollRef.current = currentSessionId;
            const top = loadScroll(currentSessionId);
            requestAnimationFrame(() => {
              if (scrollRef.current && top > 0) {
                scrollRef.current.scrollTop = top;
                userScrolledRef.current = true;
              }
            });
          }
        }
        setLoadExistingSession(false);
        return;
      }

      const { data } = await supabase
        .from('sessions')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      if (data) setCurrentSessionId(data.id);

      const hasMemories = memories.length > 0;
      const greeting: DisplayMessage = {
        id: 'greeting',
        role: 'assistant',
        ts: Date.now(),
        content: hasMemories
          ? `Welcome back${profile?.nickname ? `, ${profile.nickname}` : ''}. It's good to see you again. I remember our previous conversations. How have you been since we last spoke?`
          : `Welcome${profile?.nickname ? `, ${profile.nickname}` : ''}. You're now in a safe space. I'm here to listen and help you understand your emotions better. Please share whatever is on your mind — there's no judgment here.`,
      };
      setMessages([greeting]);
    };
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, memories.length]);

  // Smart auto-scroll: never yank users away if they scrolled up
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unread, setUnread] = useState(0);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = dist > 120;
    userScrolledRef.current = scrolledUp;
    setShowScrollDown(dist > 240);
    if (!scrolledUp) setUnread(0);
  }, []);

  const lastAssistantContent = messages[messages.length - 1]?.role === 'assistant'
    ? messages[messages.length - 1]?.content : '';

  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (lastAssistantContent) {
      setUnread((u) => u + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, lastAssistantContent]);

  const jumpToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setUnread(0);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const mins = elapsed / 60000;
    if (mins > 8 && messages.length > 6 && !reflectionSentRef.current && !isThinking) {
      reflectionSentRef.current = true;
      const prompt = REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
      toast(prompt, {
        duration: 8000,
        action: { label: '🫁 Breathe', onClick: () => setShowBreathing(true) },
      });
    }
  }, [elapsed, messages.length, isThinking]);

  const saveMessage = async (role: 'user' | 'assistant', content: string, sessionId: string) => {
    if (!user) return null;
    const { data } = await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, user_id: user.id, role, content })
      .select('id')
      .single();
    return data?.id ?? null;
  };

  const saveEmotionAnalysis = async (
    messageId: string, sessionId: string, emotion: EmotionState,
  ) => {
    if (!user) return;
    await supabase.from('emotion_analyses').insert([{
      message_id: messageId, session_id: sessionId, user_id: user.id,
      primary_emotion: emotion.primary, intensity: emotion.intensity,
      sentiment: String(emotion.sentiment), distortions: emotion.distortions,
    }]);
  };

  // Save session memories on unmount
  useEffect(() => {
    return () => {
      if (!user || !currentSessionId || messages.length < 3) return;
      const topics = extractTopics(messages);
      const dominantEmotion = emotionLog.length > 0
        ? emotionLog.reduce((a, b) => (a.intensity > b.intensity ? a : b)).primary
        : undefined;
      for (const topic of topics) {
        supabase.from('session_memories').insert({
          user_id: user.id,
          session_id: currentSessionId,
          topic,
          emotion_pattern: dominantEmotion,
          context: `Discussed during session on ${new Date().toLocaleDateString()}`,
        });
      }
      // Engine post-processing — pulse, personality, achievements.
      engine.finalizeSession({
        userId: user.id,
        breakthroughDuringSession: breakthroughRef.current,
        longSession: messages.length >= 14,
      });
    };
  }, [user, currentSessionId, messages, emotionLog, engine]);

  const sendMessage = useCallback(
    async (overrideInput?: string, voice?: { url: string; duration: number; waveform: number[] }) => {
      const text = overrideInput ?? input;
      // Voice with empty transcript still allowed; otherwise need text
      if (!voice && !text.trim()) return;
      if (isThinking || !currentSessionId) return;

      userScrolledRef.current = false;
      const transcript = (text || '').trim();
      // Content for AI / memory uses the transcript only; storage adds voice metadata
      const userContentForAI = transcript || '[Voice message]';
      const userContentForStore = voice
        ? encodeVoiceContent({ url: voice.url, duration: voice.duration, waveform: voice.waveform, transcript })
        : transcript;
      const userMsg: DisplayMessage = {
        id: `u-${Date.now()}`, role: 'user', content: userContentForStore, ts: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsThinking(true);

      const msgId = await saveMessage('user', userContentForStore, currentSessionId);

      if (detectCrisis(userContentForAI)) {
        setShowCrisis(true);
        setIsThinking(false);
        return;
      }

      const emotion = analyzeEmotion(userContentForAI);
      setCurrentEmotion(emotion);
      setEmotionLog((prev) => [...prev, emotion]);

      if (msgId) await saveEmotionAnalysis(msgId, currentSessionId, emotion);

      await supabase
        .from('sessions')
        .update({ summary_emotion: emotion.primary, summary_intensity: emotion.intensity })
        .eq('id', currentSessionId);

      // ── Engine layer: prepare turn (recall + personality + crisis addenda) and
      //    record memories + key moments. Runs in parallel with AI streaming.
      let preparedAddenda: string[] = [];
      let preparedRecall: typeof memories = memories;
      if (user) {
        try {
          const prepared = await engine.prepareTurn(user.id, userContentForAI, emotion);
          preparedAddenda = prepared.systemAddenda;
          preparedRecall = prepared.recall as typeof memories;
        } catch (e) { console.warn('prepareTurn', e); }
        // record after prepare so the just-said message is included for next turn
        engine.recordTurn({
          userId: user.id,
          sessionId: currentSessionId,
          messageId: msgId,
          position: messages.length,
          text: userContentForAI,
          emotion,
        }).then(({ moment }) => {
          if (moment?.moment_type === 'breakthrough') breakthroughRef.current = true;
        }).catch(() => {});
      }

      const newHistory: ChatMsg[] = [...chatHistory, { role: 'user', content: userContentForAI }];
      setChatHistory(newHistory);

      const assistantId = `a-${Date.now()}`;
      let fullResponse = '';
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', emotion, ts: Date.now() },
      ]);
      setStreamingId(assistantId);
      setIsSpeaking(true);

      // Tiny humanizing pause before the assistant starts replying
      await new Promise((r) => setTimeout(r, 320));

      // Paced presentation layer — variable cadence + punctuation pauses
      // for a more human-feeling stream. Backend logic untouched.
      const paced = createPacedDelta((piece) => {
        fullResponse += piece;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullResponse } : m)),
        );
      });

      try {
        await streamChat({
          messages: newHistory,
          interviewContext: profile?.interviewAnswers,
          emotionState: emotion,
          memories: preparedRecall,
          systemAddenda: preparedAddenda,
          onDelta: (chunk) => paced.push(chunk),
          onDone: async () => {
            await paced.flush();
            setIsThinking(false);
            setIsSpeaking(false);
            setStreamingId(null);
            setChatHistory((prev) => [
              ...prev, { role: 'assistant', content: fullResponse },
            ]);
            sound.playMessageChime();
            await saveMessage('assistant', fullResponse, currentSessionId);

            // ── AI Voice Reply: shorter paraphrase + ElevenLabs TTS ──
            (async () => {
              try {
                const reply = await generateVoiceReply({
                  text: fullResponse,
                  lang: (i18n.language || 'en').split('-')[0],
                  emotion: emotion?.primary,
                });
                if (!reply || !user) return;
                const url = await uploadAssistantVoice(reply.audioBlob, user.id);
                if (!url) return;
                const id = `av-${Date.now()}`;
                const stored = encodeVoiceContent({
                  url,
                  duration: reply.duration,
                  waveform: reply.waveform,
                  transcript: reply.paraphrase,
                });
                setMessages((prev) => [
                  ...prev,
                  { id, role: 'assistant', content: stored, ts: Date.now() },
                ]);
                await saveMessage('assistant', stored, currentSessionId);
              } catch (e) {
                console.warn('voice reply', e);
              }
            })();

            // ── Reflection layer: emotionally-meaningful follow-up bubble ──
            const decision = shouldReflect(userContentForAI, emotion);
            if (decision.trigger && fullResponse.length > 40) {
              const delay = 800 + Math.random() * 700; // 0.8–1.5s
              setTimeout(async () => {
                const reflection = await fetchReflection({
                  userMessage: userContentForAI,
                  assistantMessage: fullResponse,
                  emotion,
                });
                if (!reflection) return;
                const id = `r-${Date.now()}`;
                setMessages((prev) => [
                  ...prev,
                  { id, role: 'assistant', content: encodeReflection(reflection), ts: Date.now() },
                ]);
                await saveMessage('assistant', encodeReflection(reflection), currentSessionId);
              }, delay);
            }
          },
          onError: (errMsg) => {
            paced.cancel();
            setIsThinking(false);
            setIsSpeaking(false);
            setStreamingId(null);
            toast.error(errMsg);
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          },
        });
      } catch {
        setIsThinking(false);
        setIsSpeaking(false);
        setStreamingId(null);
        toast.error('Failed to connect to AI');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, isThinking, currentSessionId, chatHistory, profile, memories],
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage],
  );

  const handleVoiceMessage = useCallback(
    async (rec: VoiceRecording, transcript: string) => {
      if (!user || !currentSessionId) return;
      try {
        const uploaded = await uploadVoiceMessage(rec.blob, user.id, rec.duration, rec.waveform);
        await sendMessage(transcript, {
          url: uploaded.url, duration: uploaded.duration, waveform: uploaded.waveform,
        });
      } catch (e) {
        console.warn('voice upload', e);
        toast.error('Voice upload failed');
      }
    },
    [user, currentSessionId, sendMessage],
  );

  const onNewChat = () => {
    setMessages([]);
    setChatHistory([]);
    setCurrentEmotion(null);
    sound.playClick();
  };

  // Delete user message (and its AI reply if present); soft-delete from UI + chatHistory.
  const handleDeleteMessage = useCallback((id: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      // also drop the immediately following assistant reply if any
      if (next[idx + 1]?.role === 'assistant') next.splice(idx, 2);
      else next.splice(idx, 1);
      return next;
    });
    setChatHistory((prev) => {
      // best-effort: drop the last user/assistant pair matching content
      const target = messages.find((m) => m.id === id);
      if (!target) return prev;
      const i = prev.findIndex((m) => m.role === 'user' && m.content === target.content);
      if (i < 0) return prev;
      const next = [...prev];
      if (next[i + 1]?.role === 'assistant') next.splice(i, 2);
      else next.splice(i, 1);
      return next;
    });
  }, [messages]);

  // Regenerate: drop last assistant, re-send the previous user content.
  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || isThinking) return;
    setMessages((prev) => {
      const idx = prev.map((m) => m.role).lastIndexOf('assistant');
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    setChatHistory((prev) => {
      const idx = prev.map((m) => m.role).lastIndexOf('assistant');
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    setTimeout(() => sendMessage(lastUser.content), 0);
  }, [messages, isThinking, sendMessage]);

  const messageActions = useMemo(() => ({
    onRegenerate: handleRegenerate,
    onDelete: handleDeleteMessage,
  }), [handleRegenerate, handleDeleteMessage]);

  const mood = emotionToMood(currentEmotion);
  const lastMsg = messages[messages.length - 1];
  const showTyping =
    isThinking && (!lastMsg || lastMsg.role === 'user' || lastMsg.content === '');

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <EmotionalAtmosphere emotion={currentEmotion} streaming={!!streamingId} />
      <AnimatePresence>
        {showBreathing && (
          <BreathingExercise
            onClose={() => {
              setShowBreathing(false);
              setBreathingCount((c) => c + 1);
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <ChatSidebar onNewChat={onNewChat} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Sticky header */}
        <header className="glass-strong border-b border-border/40 px-4 md:px-6 py-3 flex items-center justify-between z-20 sticky top-0">
          <div className="flex items-center gap-3 ml-12 md:ml-0 min-w-0">
            <h1 className="text-sm md:text-base font-display gold-text tracking-widest font-bold truncate">
              MIND SENTINEL
            </h1>
            <span className="text-[10px] font-ui text-muted-foreground hidden sm:inline">
              {formatTime(elapsed)}
            </span>
            {currentEmotion && (
              <span className="hidden md:inline px-2.5 py-0.5 rounded-full text-[10px] font-ui capitalize bg-primary/15 text-primary border border-primary/30">
                {currentEmotion.primary}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { sound.playBreathingStart(); setShowBreathing(true); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
              title="Breathing exercise"
              aria-label="Breathing"
            >
              <Wind className="w-4 h-4" />
            </button>
            <button
              onClick={() => { sound.playClick(); setPanelTab('insights'); setShowPanel(!showPanel); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
              title="Insights"
              aria-label="Insights"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { sound.playClick(); setStage('dashboard'); }}
              className="hidden sm:inline-flex items-center text-xs px-3 py-1.5 rounded-md border border-border/60 text-foreground hover:bg-secondary/60 transition-colors font-ui"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* Crisis banner */}
        <AnimatePresence>
          {currentEmotion &&
            currentEmotion.intensity >= 0.85 &&
            /despair|suicidal|panic|severe|crisis|hopeless/i.test(currentEmotion.primary) && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="bg-destructive/15 border-b border-destructive/30 px-6 py-3 flex items-center justify-between gap-3"
              >
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-xs font-ui text-destructive">{t('chat.highDistress')}</p>
                </motion.div>
                <button
                  onClick={() => setStage('emergency')}
                  className="text-xs font-ui px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {t('chat.talkToSpecialist')} →
                </button>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain relative"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {/* Soft ambient vignette + emotion-tinted glow that pulses while streaming */}
          <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]">
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: streamingId ? [0.18, 0.35, 0.18] : mood.opacity }}
              transition={streamingId
                ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.2 }}
              style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--gold) / 0.18), transparent 60%)' }}
            />
          </div>

          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-6 relative">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  emotion={msg.emotion}
                  timestamp={msg.ts}
                  streaming={msg.id === streamingId}
                  onRegenerate={msg.role === 'assistant' ? messageActions.onRegenerate : undefined}
                  onDelete={msg.role === 'user' ? () => messageActions.onDelete(msg.id) : undefined}
                />
              ))}
            </AnimatePresence>
            {showTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Floating scroll-to-bottom + unread pill */}
          <AnimatePresence>
            {(showScrollDown || unread > 0) && (
              <motion.button
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                onClick={jumpToBottom}
                className={`absolute bottom-28 left-1/2 -translate-x-1/2 z-10 glass-strong border rounded-full shadow-[0_4px_24px_-4px_hsl(var(--gold)/0.5)] transition-colors flex items-center gap-2 ${
                  unread > 0
                    ? 'border-primary/50 text-primary px-3.5 py-2 pr-4'
                    : 'border-primary/30 text-primary p-2.5 hover:bg-primary/15'
                }`}
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="w-4 h-4" />
                {unread > 0 && (
                  <span className="text-[11px] font-ui">{unread} new {unread === 1 ? 'message' : 'messages'}</span>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => { sound.playSend(); sendMessage(); }}
          onAttach={() => toast(t('chat.uploadComing'))}
          onVoice={handleVoiceTranscript}
          onVoiceMessage={handleVoiceMessage}
          onMicToggle={() => sound.playMicToggle()}
          disabled={isThinking}
          placeholder={t('chat.placeholder')}
        />
      </div>

      {/* Side panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="hidden lg:flex flex-col w-80 glass-strong border-l border-border/30 p-6 overflow-y-auto"
          >
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setPanelTab('insights')}
                className={`flex-1 text-xs font-ui py-2 rounded-lg transition-colors ${
                  panelTab === 'insights'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/40'
                }`}
              >
                Insights
              </button>
              <button
                onClick={() => setPanelTab('mood')}
                className={`flex-1 text-xs font-ui py-2 rounded-lg transition-colors ${
                  panelTab === 'mood'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/40'
                }`}
              >
                Mood
              </button>
            </div>
            {panelTab === 'mood' ? (
              <MoodTracker
                emotionLog={emotionLog}
                elapsed={elapsed}
                breathingUsed={breathingCount}
              />
            ) : currentEmotion ? (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-ui tracking-[0.2em] text-muted-foreground uppercase mb-1">
                    Current State
                  </p>
                  <p className="font-display text-primary capitalize text-lg">
                    {currentEmotion.primary}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-ui tracking-[0.2em] text-muted-foreground uppercase mb-1.5">
                    Intensity
                  </p>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--gradient-gold)' }}
                      animate={{ width: `${currentEmotion.intensity * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-ui text-muted-foreground mt-1 text-right">
                    {Math.round(currentEmotion.intensity * 100)}%
                  </p>
                </div>
                {currentEmotion.distortions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-ui tracking-[0.2em] text-muted-foreground uppercase mb-2">
                      Patterns
                    </p>
                    <div className="space-y-1.5">
                      {currentEmotion.distortions.map((d) => (
                        <div
                          key={d}
                          className="flex items-center gap-2 text-xs font-ui text-foreground/80 capitalize"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-ui tracking-[0.2em] text-muted-foreground uppercase mb-2">
                    Recommendations
                  </p>
                  <div className="space-y-2">
                    {generateRecommendations(currentEmotion).slice(0, 3).map((rec, i) => (
                      <div key={i} className="glass rounded-lg p-3 text-xs font-ui text-foreground/80">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-ui text-muted-foreground">
                Send a message to start emotional analysis.
              </p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Crisis modal */}
      <AnimatePresence>
        {showCrisis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-strong rounded-2xl p-8 max-w-md mx-4 border border-destructive/30"
            >
              <div className="text-center">
                <span className="text-4xl block mb-4">🆘</span>
                <h3 className="font-display text-destructive text-xl mb-3">Crisis Support</h3>
                <p className="font-body text-foreground text-sm mb-4">
                  I care about your safety. If you're in immediate danger, please reach out to these resources:
                </p>
                <div className="space-y-2 mb-6">
                  <div className="glass rounded-lg p-3 text-sm font-ui">
                    <span className="text-primary font-semibold">988 Suicide & Crisis Lifeline</span>
                    <p className="text-muted-foreground">Call or text 988</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-sm font-ui">
                    <span className="text-primary font-semibold">Crisis Text Line</span>
                    <p className="text-muted-foreground">Text HOME to 741741</p>
                  </div>
                </div>
                <button onClick={() => setShowCrisis(false)} className="sentinel-btn w-full">
                  I understand, continue session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionChat;
