// Lightweight MediaRecorder wrapper that also captures a downsampled waveform
// (peak amplitudes per frame) for both the recording UI and the saved bubble.

export interface VoiceRecording {
  blob: Blob;
  mime: string;
  duration: number;     // seconds
  waveform: number[];   // 0..1 peaks, ~40-80 samples
}

export interface RecorderHandle {
  stop: () => Promise<VoiceRecording | null>;
  cancel: () => void;
  getLevel: () => number;             // 0..1, current loudness
  getLiveWave: () => number[];        // rolling 36 samples for UI
  duration: () => number;             // seconds since start
}

const PEAK_BUCKETS = 60;

export async function startRecording(): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  rec.start(100);

  // analyser for live + final waveform
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  const peaks: number[] = [];     // for final waveform (continuous)
  const live: number[] = new Array(36).fill(0.05);
  let level = 0;
  let raf = 0;
  const startedAt = performance.now();

  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    level = peak;
    peaks.push(peak);
    live.push(peak);
    if (live.length > 36) live.shift();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const cleanup = () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };

  return {
    duration: () => (performance.now() - startedAt) / 1000,
    getLevel: () => level,
    getLiveWave: () => live.slice(),
    cancel: () => {
      try { rec.stop(); } catch { /* noop */ }
      cleanup();
    },
    stop: () =>
      new Promise<VoiceRecording | null>((resolve) => {
        const dur = (performance.now() - startedAt) / 1000;
        rec.onstop = () => {
          cleanup();
          if (chunks.length === 0) { resolve(null); return; }
          const blob = new Blob(chunks, { type: mime || chunks[0].type || 'audio/webm' });
          resolve({
            blob,
            mime: blob.type,
            duration: Math.max(0.3, dur),
            waveform: downsample(peaks, PEAK_BUCKETS),
          });
        };
        try { rec.stop(); } catch { resolve(null); }
      }),
  };
}

function pickMime(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

function downsample(values: number[], buckets: number): number[] {
  if (values.length === 0) return new Array(buckets).fill(0.05);
  const out: number[] = [];
  const size = values.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * size);
    const end = Math.max(start + 1, Math.floor((i + 1) * size));
    let peak = 0;
    for (let j = start; j < end && j < values.length; j++) {
      if (values[j] > peak) peak = values[j];
    }
    out.push(Math.min(1, Math.max(0.04, peak)));
  }
  // gentle normalization
  const max = Math.max(...out);
  if (max < 0.6 && max > 0) {
    const k = 0.85 / max;
    return out.map((v) => Math.min(1, v * k));
  }
  return out;
}
