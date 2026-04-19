import type { PatientSession } from './types';

function toDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function prevDay(key: string): string {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the current engagement streak in days.
 * A "day active" = any calendar day a session was created or updated.
 * If the user was active today the streak includes today.
 * If not active today but active yesterday, the streak is still alive.
 */
export function computeStreak(sessions: PatientSession[]): number {
  if (!sessions.length) return 0;

  const daySet = new Set<string>();
  for (const s of sessions) {
    daySet.add(toDateKey(s.updatedAt));
    daySet.add(toDateKey(s.createdAt));
  }

  const today = toDateKey(Date.now());
  const yesterday = toDateKey(Date.now() - 86_400_000);

  // Start from today if active today, otherwise check yesterday (streak still alive)
  const cursor = daySet.has(today) ? today : yesterday;
  if (!daySet.has(cursor)) return 0;

  let count = 0;
  let day = cursor;
  while (daySet.has(day)) {
    count++;
    day = prevDay(day);
  }
  return count;
}

export function streakLabel(streak: number): string {
  if (streak === 1) return '1 día seguido';
  return `${streak} días seguidos`;
}
