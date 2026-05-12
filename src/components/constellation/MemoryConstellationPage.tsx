import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/layout/PageShell';
import { useAuth } from '@/context/AuthContext';
import { listMemories, listRelationships } from '@/lib/memory/store';
import { EmotionalMemory, MemoryRelationship, MemoryType } from '@/lib/memory/types';
import { Search, Sparkles, X } from 'lucide-react';

interface NodePos { id: string; x: number; y: number; r: number; m: EmotionalMemory; cluster: number; }

const TYPE_COLOR: Record<MemoryType, string> = {
  person: '32 70% 65%',
  goal: '180 70% 60%',
  fear: '0 70% 60%',
  trigger: '20 80% 55%',
  recovery: '140 60% 60%',
  achievement: '50 80% 60%',
  preference: '280 60% 65%',
  theme: '38 60% 55%',
  event: '210 60% 60%',
  habit: '160 50% 60%',
};

const ALL_TYPES: MemoryType[] = ['person', 'goal', 'fear', 'trigger', 'recovery', 'achievement', 'preference', 'theme', 'event', 'habit'];

/** Cluster-by-type radial layout — deterministic & cheap, scales to hundreds. */
function layoutNodes(memories: EmotionalMemory[], width = 1000, height = 700): NodePos[] {
  const cx = width / 2, cy = height / 2;
  const byType = new Map<MemoryType, EmotionalMemory[]>();
  for (const m of memories) {
    const arr = byType.get(m.type) ?? [];
    arr.push(m); byType.set(m.type, arr);
  }
  const types = [...byType.keys()];
  const ringR = Math.min(width, height) * 0.36;
  const positions: NodePos[] = [];
  types.forEach((type, ti) => {
    const items = byType.get(type)!;
    const clusterAngle = (ti / Math.max(1, types.length)) * Math.PI * 2;
    const ccx = cx + Math.cos(clusterAngle) * ringR;
    const ccy = cy + Math.sin(clusterAngle) * ringR;
    items.forEach((m, i) => {
      const a = (i / Math.max(1, items.length)) * Math.PI * 2;
      const localR = 30 + Math.min(80, items.length * 6);
      const jitter = 8 * Math.sin(i * 1.7);
      const x = ccx + Math.cos(a) * (localR + jitter);
      const y = ccy + Math.sin(a) * (localR + jitter);
      positions.push({
        id: m.id, x, y,
        r: 6 + m.emotional_weight * 14 + Math.min(8, Math.log2(1 + m.recurrence_score) * 2),
        m, cluster: ti,
      });
    });
  });
  return positions;
}

export default function MemoryConstellationPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<EmotionalMemory[]>([]);
  const [relations, setRelations] = useState<MemoryRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmotionalMemory | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<MemoryType>>(() => new Set(ALL_TYPES));
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([listMemories(user.id, 500), listRelationships(user.id)])
      .then(([m, r]) => { setMemories(m); setRelations(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return memories.filter((m) =>
      activeTypes.has(m.type)
      && (!q || m.title.toLowerCase().includes(q) || (m.content ?? '').toLowerCase().includes(q)),
    );
  }, [memories, activeTypes, query]);

  const W = 1000, H = 700;
  const nodes = useMemo(() => layoutNodes(filtered, W, H), [filtered]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const visibleRels = useMemo(
    () => relations.filter((r) => nodeMap.has(r.from_memory_id) && nodeMap.has(r.to_memory_id)),
    [relations, nodeMap],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(2.5, z * (e.deltaY > 0 ? 0.94 : 1.06))));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = draggingRef.current; if (!d) return;
    setPan({ x: e.clientX - d.x, y: e.clientY - d.y });
  };
  const onPointerUp = () => { draggingRef.current = null; };

  const toggleType = (t: MemoryType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  return (
    <PageShell title="Memory Constellation" subtitle="The emotional map of who you've been becoming.">
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-4 min-h-[640px]">
        {/* Sidebar */}
        <aside className="glass-strong rounded-2xl p-4 flex flex-col gap-4 h-fit">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories…"
              className="w-full bg-background/50 border border-border/30 rounded-lg pl-9 pr-3 py-2 text-xs font-ui focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <p className="text-[10px] font-ui tracking-[0.3em] uppercase text-muted-foreground mb-2">Filters</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((t) => {
                const on = activeTypes.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border transition-all ${
                      on ? 'border-primary/50 text-foreground' : 'border-border/20 text-muted-foreground/60'
                    }`}
                    style={on ? { background: `hsl(${TYPE_COLOR[t]} / 0.15)` } : undefined}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-[10px] font-ui text-muted-foreground space-y-1">
            <div>· {filtered.length} memories visible</div>
            <div>· {visibleRels.length} connections</div>
            <div>· Drag to pan, scroll to zoom</div>
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative rounded-2xl overflow-hidden glass-strong border border-border/20" style={{ height: 700 }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Mapping your inner sky…
            </div>
          ) : memories.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <Sparkles className="w-8 h-8 text-primary/60" />
              <p className="text-sm font-display gold-text">Your constellation is forming.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                As you reflect, recurring people, fears, goals, and recoveries become stars in this map.
              </p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <defs>
                <radialGradient id="bg-glow" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="hsl(38 65% 55% / 0.10)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <filter id="soft-glow"><feGaussianBlur stdDeviation="3.5" /></filter>
              </defs>
              <rect width={W} height={H} fill="url(#bg-glow)" />
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {/* drifting particles */}
                {Array.from({ length: 60 }).map((_, i) => (
                  <motion.circle
                    key={`p-${i}`}
                    cx={(i * 137) % W}
                    cy={(i * 89) % H}
                    r={0.8}
                    fill="hsl(38 70% 70% / 0.4)"
                    animate={{ opacity: [0.1, 0.6, 0.1] }}
                    transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.07 }}
                  />
                ))}

                {/* relationships */}
                {visibleRels.map((r) => {
                  const a = nodeMap.get(r.from_memory_id)!;
                  const b = nodeMap.get(r.to_memory_id)!;
                  const isHi = hoverId === a.id || hoverId === b.id;
                  return (
                    <motion.line
                      key={r.id}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={`hsl(38 60% 70% / ${0.06 + r.strength * 0.18})`}
                      strokeWidth={isHi ? 1.4 : 0.6}
                      animate={{ opacity: isHi ? 1 : 0.55 }}
                    />
                  );
                })}

                {/* nodes */}
                {nodes.map((n) => {
                  const color = TYPE_COLOR[n.m.type];
                  const isHi = hoverId === n.id;
                  return (
                    <g key={n.id} onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(null)}
                       onClick={() => setSelected(n.m)} style={{ cursor: 'pointer' }}>
                      <motion.circle
                        cx={n.x} cy={n.y}
                        r={n.r * 1.7}
                        fill={`hsl(${color} / 0.18)`}
                        filter="url(#soft-glow)"
                        animate={{ opacity: isHi ? 0.9 : 0.5, scale: isHi ? 1.15 : 1 }}
                        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                      />
                      <motion.circle
                        cx={n.x} cy={n.y} r={n.r}
                        fill={`hsl(${color} / 0.85)`}
                        stroke={`hsl(${color})`}
                        strokeWidth={isHi ? 1.5 : 0.5}
                        animate={{ scale: isHi ? 1.2 : 1 }}
                        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                      />
                      {(isHi || n.m.recurrence_score >= 5) && (
                        <text x={n.x} y={n.y - n.r - 6} textAnchor="middle"
                              fill="hsl(var(--foreground))" fontSize={10}
                              style={{ font: '10px ui-sans-serif', pointerEvents: 'none' }}>
                          {n.m.title.length > 28 ? n.m.title.slice(0, 25) + '…' : n.m.title}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Hover card */}
          <AnimatePresence>
            {hoverId && nodeMap.get(hoverId) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute bottom-4 left-4 glass-strong rounded-xl p-3 max-w-sm pointer-events-none"
              >
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {nodeMap.get(hoverId)!.m.type}
                </p>
                <p className="text-sm font-display text-foreground mt-0.5">{nodeMap.get(hoverId)!.m.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Weight {Math.round(nodeMap.get(hoverId)!.m.emotional_weight * 100)}% · Recurrence {nodeMap.get(hoverId)!.m.recurrence_score}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Inspector */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed right-4 top-24 bottom-4 w-[22rem] z-40 glass-strong border border-border/30 rounded-2xl p-5 overflow-y-auto"
          >
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-1 rounded hover:bg-secondary/50">
              <X className="w-4 h-4" />
            </button>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{selected.type}</p>
            <h3 className="text-xl font-display gold-text mt-1">{selected.title}</h3>
            {selected.emotion && (
              <p className="text-xs text-muted-foreground mt-1 capitalize">felt as {selected.emotion}</p>
            )}
            {selected.content && (
              <p className="text-sm font-body text-foreground/90 mt-4 whitespace-pre-wrap leading-relaxed">
                {selected.content}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Stat label="Weight" value={`${Math.round(selected.emotional_weight * 100)}%`} />
              <Stat label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
              <Stat label="Recurrence" value={String(selected.recurrence_score)} />
              <Stat label="Sources" value={String(selected.source_session_ids.length)} />
            </div>
            {selected.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.tags.map((t) => (
                  <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-border/30 text-muted-foreground">{t}</span>
                ))}
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/20 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-display text-foreground mt-0.5">{value}</p>
    </div>
  );
}
