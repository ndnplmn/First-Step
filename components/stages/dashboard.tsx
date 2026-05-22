'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Eye, BookOpen, Path, Plus, SignOut, Gear, Flame, Trash } from '@phosphor-icons/react';
import { ChapterProgress } from '@/components/ui/chapter-progress';
import { TendLogo } from '@/components/ui/logo';
import { computeStreak } from '@/lib/streak';
import type { Patient, PatientSession } from '@/lib/types';
import { useLanguage } from '@/contexts/language-context';

interface DashboardProps {
  patient: Patient;
  sessions: PatientSession[];
  activeSession: PatientSession | null;
  onStartSession: () => void;
  onViewRecord: () => void;
  onViewDiary: () => void;
  onViewProgress: () => void;
  onNew: () => void;
  onSignOut: () => void;
  onViewSettings: () => void;
  onDeleteSession?: (sessionId: string) => void;
  showMigrationPrompt?: boolean;
  onMigrate?: () => void;
  onDismissMigration?: () => void;
}

export function Dashboard({
  patient,
  sessions,
  activeSession,
  onStartSession,
  onViewRecord,
  onViewDiary,
  onViewProgress,
  onNew,
  onSignOut,
  onViewSettings,
  onDeleteSession,
  showMigrationPrompt,
  onMigrate,
  onDismissMigration,
}: DashboardProps) {
  const shouldReduce = useReducedMotion();
  const { t } = useLanguage();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const STAGE_NAMES: Record<number, string> = {
    1: t('dashboard.stage.1'),
    2: t('dashboard.stage.2'),
    3: t('dashboard.stage.3'),
    4: t('dashboard.stage.4'),
    5: t('dashboard.stage.5'),
    6: t('dashboard.stage.6'),
  };

  function getGreeting(name: string): string {
    const hour = new Date().getHours();
    const firstName = name.split(' ')[0];
    if (hour >= 5 && hour < 12) return t('dashboard.greeting.morning').replace('{name}', firstName);
    if (hour >= 12 && hour < 20) return t('dashboard.greeting.afternoon').replace('{name}', firstName);
    return t('dashboard.greeting.evening').replace('{name}', firstName);
  }

  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    if (diff <= 0) return t('dashboard.time.moment');
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (hours < 1) return t('dashboard.time.moment');
    if (hours < 24) return hours === 1 ? t('dashboard.time.hour') : t('dashboard.time.hours').replace('{n}', String(hours));
    if (days === 1) return t('dashboard.time.yesterday');
    return t('dashboard.time.days').replace('{n}', String(days));
  }

  function getDailyInsight(sessions: PatientSession[], activeSession: PatientSession | null): { text: string; accent: string } | null {
    if (activeSession) return null;
    const completed = sessions.filter(s => s.stage >= 6);
    if (completed.length === 0) return null;

    const last = [...completed].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const wbBefore = last.wellbeingBefore ?? 0;
    const wbAfter = last.wellbeingAfter ?? 0;

    if (wbAfter > wbBefore) {
      return { text: t('dashboard.insight.improved'), accent: 'var(--color-sage)' };
    }

    const daysSince = Math.floor((Date.now() - last.updatedAt) / 86_400_000);
    if (daysSince >= 14) {
      return { text: t('dashboard.insight.away'), accent: 'var(--color-terracotta)' };
    }

    if (completed.length >= 3) {
      return { text: t('dashboard.insight.streak').replace('{n}', String(completed.length)), accent: 'var(--color-sage)' };
    }

    return null;
  }

  const completedSessions = sessions.filter(s => s.stage >= 6);
  const sessionCount = sessions.length;
  const dailyInsight = getDailyInsight(sessions, activeSession);
  const streak = computeStreak(sessions);

  const sessionCountLabel = sessionCount === 0
    ? t('dashboard.sessions.none')
    : completedSessions.length === 1
      ? t('dashboard.sessions.one')
      : t('dashboard.sessions.many').replace('{n}', String(completedSessions.length));

  return (
    <div className="min-h-dvh">
      {/* Sticky glass header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--color-glass-heavy)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
          <TendLogo size={26} />

          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={onNew}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
            >
              <Plus size={14} />
              {t('dashboard.new')}
            </motion.button>
            <motion.button
              type="button"
              onClick={onViewSettings}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              aria-label={t('dashboard.settings.aria')}
              style={{ color: 'var(--color-muted)', padding: '0.5rem' }}
            >
              <Gear size={18} aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              onClick={onSignOut}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              aria-label={t('dashboard.signout.aria')}
              style={{ color: 'var(--color-muted)', padding: '0.5rem' }}
            >
              <SignOut size={18} aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[680px] mx-auto px-6 pt-10 pb-16">
        {/* Migration banner */}
        {showMigrationPrompt && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-[var(--radius-card)] border"
            style={{
              background: 'rgba(107,127,110,0.07)',
              borderColor: 'var(--color-sage)',
            }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--color-deep)' }}>
              {t('dashboard.migrate.body')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onMigrate}
                className="text-sm font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: 'var(--color-sage)' }}
              >
                {t('dashboard.migrate')}
              </button>
              <button
                onClick={onDismissMigration}
                className="text-sm"
                style={{ color: 'var(--color-muted)' }}
              >
                {t('dashboard.migrate.dismiss')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Greeting */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div
            style={{
              width: 28,
              height: 2,
              background: 'var(--color-sage)',
              opacity: 0.55,
              marginBottom: 14,
              borderRadius: 2,
            }}
          />
          <h1
            className="leading-tight breathe"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 7vw, 3.25rem)',
              color: 'var(--color-deep)',
              letterSpacing: '-0.025em',
            }}
          >
            {getGreeting(patient.name)}
          </h1>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--color-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {sessionCountLabel}
            </p>
            {streak >= 2 && (
              <motion.div
                initial={shouldReduce ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(180,110,69,0.1)',
                  border: '1px solid rgba(180,110,69,0.18)',
                }}
              >
                <Flame size={11} weight="fill" style={{ color: 'var(--color-terracotta)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    color: 'var(--color-terracotta)',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  {streak === 1
                    ? t('dashboard.streak.1')
                    : t('dashboard.streak.n').replace('{n}', String(streak))}
                </span>
              </motion.div>
            )}
          </div>

          {/* Daily insight card */}
          {dailyInsight && (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mt-4 px-4 py-3.5 rounded-[var(--radius-inner)]"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                borderLeft: `3px solid ${dailyInsight.accent}`,
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)', fontStyle: 'italic' }}>
                {dailyInsight.text}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Active session card */}
        {activeSession && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p
              className="mb-2 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.1em' }}
            >
              {t('dashboard.in_progress')}
            </p>
            <div
              className="w-full rounded-[var(--radius-card)] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(61,107,71,0.07) 0%, var(--color-surface) 55%)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid rgba(61,107,71,0.15)',
              }}
            >
              <motion.div
                role="button"
                tabIndex={0}
                onClick={onStartSession}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartSession(); } }}
                whileHover={shouldReduce ? {} : { y: -1 }}
                whileTap={shouldReduce ? {} : { scale: 0.99 }}
                className="w-full p-5 text-left cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontSize: '1.0625rem',
                        color: 'var(--color-deep)',
                      }}
                    >
                      {t('dashboard.session').replace('{n}', String(activeSession.sessionNumber))}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {STAGE_NAMES[activeSession.stage] ?? t('dashboard.stage.ongoing')} · {formatRelativeTime(activeSession.updatedAt)}
                    </p>
                  </div>
                  <ChapterProgress currentStage={activeSession.stage} />
                </div>
                <div className="flex items-center gap-1.5 mt-3.5">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-sage)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-sage)' }}>
                    {t('dashboard.continue')}
                  </p>
                </div>
              </motion.div>

              {/* Delete row */}
              <AnimatePresence>
                {confirmDeleteId === activeSession.id ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between px-5 py-3 border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {t('dashboard.delete.confirm')}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ color: 'var(--color-muted)', background: 'var(--color-border)' }}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => { onDeleteSession?.(activeSession.id); setConfirmDeleteId(null); }}
                        className="text-xs px-3 py-1 rounded-lg text-white"
                        style={{ background: 'var(--color-terracotta)' }}
                      >
                        {t('dashboard.delete.aria')}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => setConfirmDeleteId(activeSession.id)}
                    className="w-full flex items-center gap-2 px-5 py-2.5 border-t"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-muted)',
                      background: 'none',
                    }}
                    aria-label={t('dashboard.delete.aria')}
                  >
                    <Trash size={13} />
                    <span className="text-xs">{t('dashboard.delete.aria')}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* No active session — start new */}
        {!activeSession && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <motion.button
              type="button"
              onClick={onStartSession}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.99 }}
              className="w-full p-5 rounded-[var(--radius-card)] text-left card-lift"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                border: '1.5px dashed rgba(61,107,71,0.25)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: 'rgba(61,107,71,0.1)',
                    color: 'var(--color-sage)',
                  }}
                >
                  <Plus size={20} weight="bold" />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: '1rem',
                      color: 'var(--color-deep)',
                    }}
                  >
                    {sessionCount > 0 ? t('dashboard.start.new') : t('dashboard.start.first')}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {sessionCount > 0
                      ? t('dashboard.start.new.sub').replace('{n}', String(sessionCount + 1))
                      : t('dashboard.start.first.sub')}
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            {
              icon: <Eye size={18} weight="duotone" />,
              label: t('dashboard.quick.record'),
              onClick: onViewRecord,
              iconBg: 'rgba(61,107,71,0.12)',
              iconColor: 'var(--color-sage)',
            },
            {
              icon: <BookOpen size={18} weight="duotone" />,
              label: t('dashboard.quick.diary'),
              onClick: onViewDiary,
              iconBg: 'rgba(107,94,158,0.1)',
              iconColor: 'var(--color-violet)',
            },
            {
              icon: <Path size={18} weight="duotone" />,
              label: t('dashboard.quick.progress'),
              onClick: onViewProgress,
              iconBg: 'rgba(180,110,69,0.1)',
              iconColor: 'var(--color-terracotta)',
            },
          ].map(({ icon, label, onClick, iconBg, iconColor }) => (
            <motion.button
              key={label}
              type="button"
              onClick={onClick}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="flex flex-col items-center gap-3 py-5 px-3 rounded-[var(--radius-card)] card-lift"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 40, height: 40, background: iconBg, color: iconColor }}
              >
                {icon}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Session history */}
        {completedSessions.length > 0 && (
          <div className="mt-10">
            <p
              className="mb-3 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.1em' }}
            >
              {t('dashboard.history')}
            </p>
            <div className="space-y-2">
              {completedSessions.slice(0, 5).map(session => {
                const delta = session.wellbeingAfter && session.wellbeingBefore
                  ? session.wellbeingAfter - session.wellbeingBefore
                  : null;
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between px-4 py-3.5 rounded-[var(--radius-inner)]"
                    style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: '0.9375rem',
                          color: 'var(--color-deep)',
                        }}
                      >
                        {t('dashboard.session').replace('{n}', String(session.sessionNumber))}
                      </p>
                      {(session.selectedWorkCard?.title || session.explorationRecord?.insights[0]?.theme) && (
                        <p
                          className="truncate mt-0.5"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--color-muted)' }}
                        >
                          {session.selectedWorkCard?.title ?? session.explorationRecord?.insights[0]?.theme}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {delta !== null && (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: delta > 0
                              ? 'var(--color-sage)'
                              : delta < 0
                                ? 'var(--color-terracotta)'
                                : 'var(--color-muted)',
                          }}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.625rem',
                          color: 'var(--color-muted)',
                        }}
                      >
                        {formatRelativeTime(session.updatedAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
