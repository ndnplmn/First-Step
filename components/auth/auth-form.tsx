'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';
import { TendLogo } from '@/components/ui/logo';
import { db } from '@/lib/db';
import { useLanguage } from '@/contexts/language-context';

// Inline SVGs for OAuth provider logos — avoids external image dependency
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 814 1000" aria-hidden="true" style={{ fill: 'currentColor' }}>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.6-154.2-112.6c-59.5-81.7-109.3-209-109.3-330.7 0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

interface AuthFormProps {
  onAuthSuccess: () => void;
}

type Mode = 'login' | 'register' | 'forgot' | 'forgot-sent';

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-6">
      <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'var(--color-muted)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        className="auth-field w-full bg-transparent py-2 text-base"
        style={{ color: 'var(--color-deep)' }}
      />
    </div>
  );
}

function ConfirmationScreen({
  icon,
  title,
  body,
  detail,
  linkLabel,
  onLink,
}: {
  icon: string;
  title: string;
  body: string;
  detail?: string;
  linkLabel: string;
  onLink: () => void;
}) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-8"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(61,107,71,0.08) 0%, transparent 60%)' }}
    >
      <div className="max-w-[400px] text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"
          style={{ background: 'rgba(61,107,71,0.12)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <h2
          className="text-[1.75rem] leading-tight mb-4"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-deep)' }}
        >
          {title}
        </h2>
        <p className="leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {body}
          {detail && (
            <>
              <br />
              <strong style={{ color: 'var(--color-deep)' }}>{detail}</strong>
            </>
          )}
        </p>
        <button
          onClick={onLink}
          className="mt-8 bg-transparent border-none text-sm underline cursor-pointer"
          style={{ color: 'var(--color-sage)' }}
        >
          {linkLabel}
        </button>
      </div>
    </div>
  );
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const reset = (next: Mode) => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setMode(next);
  };

  const isLoginReady = email.trim() && password.trim();
  const isRegisterReady = name.trim() && email.trim() && password.trim() && confirmPassword.trim();
  const isForgotReady = email.trim().includes('@');

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    setError('');
    const { error: err } = await db.signInWithOAuth(provider);
    if (err) {
      setError(t('auth.error.oauth'));
      setOauthLoading(null);
    }
    // On success, Supabase redirects — no state update needed here
  };

  const handleSubmit = async () => {
    setError('');

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error: err } = await db.resetPassword(email.trim());
        if (err) {
          setError(t('auth.error.forgot'));
        } else {
          setMode('forgot-sent');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) { setError(t('auth.error.passwords')); return; }
      if (password.length < 6) { setError(t('auth.error.short')); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await db.signIn(email, password);
        if (err) { setError(t('auth.error.login')); }
        else { onAuthSuccess(); }
      } else {
        const { error: err } = await db.signUp(email, password);
        if (err) { setError(err.message ?? t('auth.error.register')); }
        else { setMode('forgot-sent'); }
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot-sent') {
    const isRegFlow = !!password; // registration: password still filled; forgot: password field never shown
    return (
      <ConfirmationScreen
        icon="✉️"
        title={t('auth.confirm.title')}
        body={isRegFlow ? t('auth.confirm.body.register') : t('auth.confirm.body.forgot')}
        detail={email}
        linkLabel={t('auth.confirm.link')}
        onLink={() => reset('login')}
      />
    );
  }

  const isForgot = mode === 'forgot';

  return (
    <div
      className="min-h-dvh max-w-[680px] mx-auto px-6 pt-[20vh]"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(61,107,71,0.08) 0%, transparent 60%)' }}
    >
      <div className="mb-10">
        <TendLogo size={32} />
      </div>

      {isForgot ? (
        <>
          <h2
            className="text-[1.75rem] leading-tight mb-2"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-deep)' }}
          >
            {t('auth.forgot.title')}
          </h2>
          <p className="text-[0.9375rem] leading-snug mb-8" style={{ color: 'var(--color-muted)' }}>
            {t('auth.forgot.body')}
          </p>
        </>
      ) : (
        <div
          role="tablist"
          className="flex gap-6 mb-8 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {(['login', 'register'] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={mode === tab}
              onClick={() => reset(tab)}
              className="bg-transparent border-none pb-3 text-[0.9375rem] cursor-pointer transition-all -mb-px"
              style={{
                fontWeight: mode === tab ? 600 : 400,
                color: mode === tab ? 'var(--color-deep)' : 'var(--color-muted)',
                borderBottom: mode === tab ? '2px solid var(--color-sage)' : '2px solid transparent',
              }}
            >
              {tab === 'login' ? t('auth.tab.login') : t('auth.tab.register')}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {mode === 'register' && (
            <Field label={t('auth.field.name')} type="text" value={name} onChange={setName} placeholder={t('auth.placeholder.name')} />
          )}
          <Field label={t('auth.field.email')} type="email" value={email} onChange={setEmail} placeholder={t('auth.placeholder.email')} />
          {!isForgot && (
            <Field label={t('auth.field.password')} type="password" value={password} onChange={setPassword} placeholder={t('auth.placeholder.password')} />
          )}
          {mode === 'register' && (
            <Field label={t('auth.field.confirm')} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder={t('auth.placeholder.password')} />
          )}

          {mode === 'login' && (
            <button
              onClick={() => reset('forgot')}
              className="bg-transparent border-none p-0 text-[0.8125rem] cursor-pointer underline block -mt-3 mb-4"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('auth.forgot.link')}
            </button>
          )}

          {isForgot && (
            <button
              onClick={() => reset('login')}
              className="bg-transparent border-none p-0 text-[0.8125rem] cursor-pointer underline block mb-4"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('auth.back')}
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--color-terracotta)' }}>
          {error}
        </p>
      )}

      {/* OAuth divider — only on login/register, not forgot */}
      {!isForgot && (
        <div className="mt-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span
              className="text-xs"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}
            >
              {t('auth.oauth.divider')}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>
          <div className="flex flex-col gap-2">
            <motion.button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading || loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-deep)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {oauthLoading === 'google' ? (
                <span style={{ color: 'var(--color-muted)' }}>{t('auth.oauth.redirecting')}</span>
              ) : (
                <>
                  <GoogleLogo />
                  {t('auth.oauth.google')}
                </>
              )}
            </motion.button>
            <motion.button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={!!oauthLoading || loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: 'var(--color-deep)',
                color: 'var(--color-base)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {oauthLoading === 'apple' ? (
                <span style={{ opacity: 0.7 }}>{t('auth.oauth.redirecting')}</span>
              ) : (
                <>
                  <AppleLogo />
                  {t('auth.oauth.apple')}
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}

      <div className="h-24" />

      <FloatingBar visible={isForgot ? isForgotReady : mode === 'login' ? !!isLoginReady : !!isRegisterReady}>
        <motion.button
          onClick={handleSubmit}
          disabled={loading}
          whileTap={loading ? {} : { scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide disabled:opacity-60"
          style={{
            background: loading ? 'var(--color-muted)' : 'var(--color-deep)',
            transition: 'background 0.2s',
          }}
        >
          {loading
            ? t('auth.submit.loading')
            : isForgot
              ? t('auth.submit.forgot')
              : mode === 'login' ? t('auth.submit.login') : t('auth.submit.register')}
        </motion.button>
      </FloatingBar>
    </div>
  );
}
