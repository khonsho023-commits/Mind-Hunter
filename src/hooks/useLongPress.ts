import { useCallback, useRef } from 'react';

/**
 * useLongPress — touch + mouse long-press detector with movement cancel.
 * Returns handlers to spread onto an element.
 */
export function useLongPress(onLongPress: () => void, ms = 480) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  const begin = useCallback(
    (x: number, y: number) => {
      clear();
      start.current = { x, y };
      timer.current = window.setTimeout(() => {
        onLongPress();
        timer.current = null;
      }, ms);
    },
    [clear, ms, onLongPress],
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!start.current) return;
      const dx = Math.abs(x - start.current.x);
      const dy = Math.abs(y - start.current.y);
      if (dx > 8 || dy > 8) clear();
    },
    [clear],
  );

  return {
    onPointerDown: (e: React.PointerEvent) => begin(e.clientX, e.clientY),
    onPointerMove: (e: React.PointerEvent) => move(e.clientX, e.clientY),
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
  };
}
