# Mind Sentinel — Platform Evolution Plan

## Guardrails (non-negotiable)
- `ClinicEntry` and all `src/components/3d/*` files: **zero modifications**. Timing, camera, lighting, sound preserved.
- Stack stays: Vite + React 18 + Tailwind v3 + existing Supabase client + AppContext stage machine.
- Extend, don't rewrite. No router migration — keep the `stage` switcher in `Index.tsx`, just add new stages.

## New Flow
```
login → dashboard → [Start Session] → entry (3D intro) → session (chat)
                 ↘ insights / history / profile / settings / emergency
```
Intro plays on **every** session start (skip button stays as in current intro, but flow always routes through `entry`).

## Stage Machine Extension
`AppStage` adds: `'insights' | 'history' | 'profile' | 'settings' | 'emergency'`. Default post-login stage becomes `'dashboard'` (was `'entry'`). Starting a session sets `stage='entry'`; `ClinicEntry`'s existing `setStage('interview')` or `setStage('session')` continues to work — we keep its current target (interview for first session, session for returning users via a small check on `profile.interviewAnswers`).

## Sessions System
New table `sessions` (id, user_id, title, created_at, ended_at, summary). Existing `messages`/chat table extended with `session_id` FK if not present. Add `src/lib/sessions.ts` with: `createSession`, `listSessions`, `getSessionMessages`, `setActiveSession`. `AppContext` already has `currentSessionId` — wire it through.

## New Components
```
src/components/
  Dashboard.tsx              (rewrite — cinematic hub)
  layout/TopNav.tsx          (shared nav: Sessions, Insights, History, Settings, Profile, Emergency)
  layout/PageShell.tsx       (warm bg + nav + content slot)
  sessions/SessionsSidebar.tsx
  insights/InsightsPage.tsx + charts (recharts)
  history/HistoryPage.tsx
  profile/ProfilePage.tsx
  settings/SettingsPage.tsx
  emergency/EmergencyChat.tsx
```
`SessionChat.tsx`: add left `SessionsSidebar`, swap Send text for `Send` icon, add mic button (reuse `VoiceInput`), add paperclip upload button (stub handler). All streaming/TTS/emotion logic untouched.

## Pages Detail
- **Dashboard**: welcome, animated stat cards (sessions count, last mood, streak), big "Start Session" CTA, quick links.
- **Insights**: recharts line (mood over time), bar (distortion frequency), session summaries list.
- **History**: grouped-by-date session list, click to open read-only transcript modal.
- **Profile**: avatar, nickname, age/gender, session count, editable nickname/preferences.
- **Settings**: sound volume slider (wire to SoundContext), AI tone radio (friendly/analytical/clinical) stored in profile, export/delete data buttons.
- **Emergency**: focused minimal chat, calmer palette accent, crisis-aware system prompt, helpline footer. Auto-route trigger: when `currentEmotion.intensity > threshold` and primary in crisis set, show banner offering switch.

## DB Migration
```sql
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  summary text,
  created_at timestamptz default now(),
  ended_at timestamptz
);
alter table public.sessions enable row level security;
create policy "own sessions" on public.sessions for all using (auth.uid() = user_id);
-- add session_id to existing messages table if missing
```
(Anonymous users keep local-only sessions in `localStorage` with same shape.)

## Emergency Trigger
In `SessionChat`, after each `currentEmotion` update, if `intensity >= 0.85` and `primary ∈ {despair, suicidal, panic}`, show non-blocking toast with "Switch to Emergency Support" → `setStage('emergency')`.

## Files Touched
- Modified: `AppContext.tsx`, `Index.tsx`, `Dashboard.tsx`, `SessionChat.tsx`
- New: ~10 files listed above + `src/lib/sessions.ts` + migration
- **Untouched**: `ClinicEntry.tsx`, `src/components/3d/*`, `SoundContext.tsx`, `streamChat.ts`, `emotionEngine.ts`, `useSpeechSynthesis.ts`

## Out of Scope (this pass)
- File upload backend (button is wired to a stub + toast "coming soon")
- Real escalation API on Emergency page (placeholder)
- New theme tokens — reuse existing gold/warm palette
