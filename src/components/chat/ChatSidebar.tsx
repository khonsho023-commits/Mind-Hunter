import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Sparkles, X, Menu, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { listSessions, SessionRow } from '@/lib/sessions';
import { Skeleton } from '@/components/ui/skeleton';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface Props {
  onNewChat: () => void;
  refreshKey?: number;
}

const STORAGE_KEY = 'mind-sentinel.sidebar.open';

type Group = 'Today' | 'Yesterday' | 'This Week' | 'Older';

function groupOf(d: Date): Group {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const day = 86400000;
  if (ts === today) return 'Today';
  if (ts === today - day) return 'Yesterday';
  if (ts > today - 7 * day) return 'This Week';
  return 'Older';
}

export default function ChatSidebar({ onNewChat, refreshKey }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';
  const { user } = useAuth();
  const { currentSessionId, startNewSession, openExistingSession } = useApp();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useLockBodyScroll(open);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSessions(null);
    listSessions(user.id)
      .then((s) => { if (!cancelled) setSessions(s); })
      .catch(() => { if (!cancelled) setSessions([]); });
    return () => { cancelled = true; };
  }, [user, refreshKey, currentSessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, open ? '1' : '0'); } catch { /* ignore */ }
  }, [open]);

  const filtered = useMemo(() => {
    if (!sessions) return null;
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      (s.summary_emotion ?? '').toLowerCase().includes(q) ||
      new Date(s.started_at).toLocaleString().toLowerCase().includes(q),
    );
  }, [sessions, query]);

  const grouped = useMemo(() => {
    if (!filtered) return null;
    const buckets: Record<Group, SessionRow[]> = {
      'Today': [], 'Yesterday': [], 'This Week': [], 'Older': [],
    };
    for (const s of filtered) buckets[groupOf(new Date(s.started_at))].push(s);
    return (Object.entries(buckets) as [Group, SessionRow[]][]).filter(([, list]) => list.length > 0);
  }, [filtered]);

  const closeMobile = () => setOpen(false);

  const renderSession = (s: SessionRow) => {
    const active = s.id === currentSessionId;
    return (
      <motion.button
        key={s.id}
        whileHover={{ x: isRtl ? -3 : 3 }}
        onClick={() => { openExistingSession(s.id); closeMobile(); }}
        className={`w-full text-start p-3 rounded-lg flex items-start gap-2.5 transition-all relative ${
          active
            ? 'bg-primary/12 border border-primary/30 shadow-[0_0_18px_-4px_hsl(var(--gold)/0.45)]'
            : 'hover:bg-secondary/40 border border-transparent'
        }`}
      >
        <MessageSquare
          className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${active ? 'text-primary' : 'text-primary/50'}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-ui text-foreground truncate">
            {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-[10px] text-muted-foreground capitalize mt-0.5 truncate">
            {s.summary_emotion ?? 'New conversation'}
            {s.summary_intensity != null && ` · ${Math.round((s.summary_intensity ?? 0) * 100)}%`}
          </p>
        </div>
        {active && (
          <motion.span
            layoutId="active-session-dot"
            className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shadow-[0_0_8px_hsl(var(--gold))]"
          />
        )}
      </motion.button>
    );
  };

  const content = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/30 space-y-2">
        <button
          onClick={() => { onNewChat(); closeMobile(); }}
          className="sentinel-btn-outline w-full text-xs py-2.5 flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
        <button
          onClick={() => { startNewSession(); closeMobile(); }}
          className="sentinel-btn w-full text-xs py-2.5 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" /> New Session
        </button>
        <div className="relative pt-1">
          <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-muted-foreground/60 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions..."
            className={`w-full bg-secondary/30 border border-border/40 rounded-lg text-xs font-ui py-2 focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessions === null && (
          <div className="space-y-2 px-2 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg bg-secondary/30" />
            ))}
          </div>
        )}

        {sessions !== null && grouped && grouped.length === 0 && (
          <div className="px-3 py-10 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {query ? 'No matches found' : 'Your conversations will appear here'}
            </p>
          </div>
        )}

        {grouped?.map(([label, list]) => (
          <div key={label} className="mb-3">
            <p className="text-[10px] font-ui tracking-[0.25em] text-muted-foreground/80 uppercase px-3 py-2">
              {label}
            </p>
            <div className="space-y-1">{list.map(renderSession)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="chat-sidebar-toggle"
        className={`md:hidden fixed top-4 z-30 glass-strong p-2.5 rounded-xl border border-border/40 ${
          isRtl ? 'right-4' : 'left-4'
        }`}
        aria-label="Open sessions"
      >
        <Menu className="w-4 h-4 text-foreground" />
      </button>

      <aside
        data-testid="chat-sidebar"
        className={`hidden md:flex w-[280px] glass-strong flex-col flex-shrink-0 ${
          isRtl ? 'border-l border-border/30' : 'border-r border-border/30'
        }`}
      >
        {content}
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
              className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className={`md:hidden fixed top-0 bottom-0 z-50 w-[85vw] max-w-[320px] glass-strong flex flex-col ${
                isRtl ? 'right-0 border-l border-border/30' : 'left-0 border-r border-border/30'
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Sessions"
            >
              <button
                onClick={closeMobile}
                className={`absolute top-3 p-2 rounded-lg hover:bg-secondary/50 z-10 ${
                  isRtl ? 'left-3' : 'right-3'
                }`}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
