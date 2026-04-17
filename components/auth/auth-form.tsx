'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';
import { TendLogo } from '@/components/ui/logo';
import { db } from '@/lib/db';

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
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--color-muted)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.5rem',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.5rem 0',
          fontSize: '1rem',
          color: 'var(--color-deep)',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => (e.target.style.borderBottomColor = 'var(--color-sage)')}
        onBlur={e => (e.target.style.borderBottomColor = 'var(--color-border)')}
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
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(107,127,110,0.08) 0%, transparent 60%)',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(107,127,110,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: '1.5rem',
        }}>{icon}</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: '1.75rem', color: 'var(--color-deep)', marginBottom: '1rem',
        }}>{title}</h2>
        <p style={{ color: 'var(--color-muted)', lineHeight: 1.6 }}>
          {body}
          {detail && <><br /><strong style={{ color: 'var(--color-deep)' }}>{detail}</strong></>}
        </p>
        <button
          onClick={onLink}
          style={{
            marginTop: '2rem', background: 'none', border: 'none',
            color: 'var(--color-sage)', fontSize: '0.875rem',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          {linkLabel}
        </button>
      </div>
    </div>
  );
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = (next: Mode) => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setMode(next);
  };

  const isLoginReady = email.trim() && password.trim();
  const isRegisterReady = name.trim() && email.trim() && password.trim() && confirmPassword.trim();
  const isForgotReady = email.trim().includes('@');

  const handleSubmit = async () => {
    setError('');

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error: err } = await db.resetPassword(email.trim());
        if (err) {
          setError('No pudimos enviar el correo. Verifica el email ingresado.');
        } else {
          setMode('forgot-sent');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
      if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await db.signIn(email, password);
        if (err) { setError('Email o contraseña incorrectos.'); }
        else { onAuthSuccess(); }
      } else {
        const { error: err } = await db.signUp(email, password);
        if (err) { setError(err.message ?? 'No se pudo crear la cuenta.'); }
        else { setMode('forgot-sent'); } // reuse confirm screen for registration
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot-sent') {
    const isRegFlow = !password; // distinguish: forgot has no password filled
    return (
      <ConfirmationScreen
        icon="✉️"
        title="Revisa tu correo"
        body={isRegFlow
          ? 'Te enviamos un enlace para restablecer tu contraseña a'
          : 'Te enviamos un enlace de confirmación a'}
        detail={email}
        linkLabel="Volver al inicio de sesión"
        onLink={() => reset('login')}
      />
    );
  }

  const isForgot = mode === 'forgot';

  return (
    <div style={{
      minHeight: '100dvh', maxWidth: 680, margin: '0 auto',
      padding: '0 1.5rem', paddingTop: '20vh',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(107,127,110,0.08) 0%, transparent 60%)',
    }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <TendLogo size={32} />
      </div>

      {isForgot ? (
        <>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: '1.75rem', color: 'var(--color-deep)',
            marginBottom: '0.5rem', lineHeight: 1.15,
          }}>
            Restablecer contraseña
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.55 }}>
            Ingresa tu email y te enviamos un enlace para crear una nueva contraseña.
          </p>
        </>
      ) : (
        <div style={{
          display: 'flex', gap: '1.5rem', marginBottom: '2rem',
          borderBottom: '1px solid var(--color-border)',
        }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => reset(t)}
              style={{
                background: 'none', border: 'none', padding: '0 0 0.75rem',
                fontSize: '0.9375rem', fontWeight: mode === t ? 600 : 400,
                color: mode === t ? 'var(--color-deep)' : 'var(--color-muted)',
                cursor: 'pointer',
                borderBottom: mode === t ? '2px solid var(--color-sage)' : '2px solid transparent',
                transition: 'all 0.2s', marginBottom: '-1px',
              }}
            >
              {t === 'login' ? 'Entrar' : 'Crear cuenta'}
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
            <Field label="Nombre" type="text" value={name} onChange={setName} placeholder="Tu nombre" />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" />
          {!isForgot && (
            <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          )}
          {mode === 'register' && (
            <Field label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
          )}

          {mode === 'login' && (
            <button
              onClick={() => reset('forgot')}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'var(--color-muted)', fontSize: '0.8125rem',
                cursor: 'pointer', textDecoration: 'underline',
                display: 'block', marginTop: '-0.75rem', marginBottom: '1rem',
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {isForgot && (
            <button
              onClick={() => reset('login')}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'var(--color-muted)', fontSize: '0.8125rem',
                cursor: 'pointer', textDecoration: 'underline',
                display: 'block', marginBottom: '1rem',
              }}
            >
              ← Volver
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p style={{
          color: 'var(--color-terracotta)', fontSize: '0.875rem',
          marginTop: '0.25rem', marginBottom: '1rem',
        }}>
          {error}
        </p>
      )}

      <div style={{ height: '6rem' }} />

      <FloatingBar visible={isForgot ? isForgotReady : mode === 'login' ? !!isLoginReady : !!isRegisterReady}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '1rem',
            background: loading ? 'var(--color-muted)' : 'var(--color-deep)',
            color: 'white', border: 'none', borderRadius: 12,
            fontSize: '1rem', fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading
            ? 'Un momento...'
            : isForgot
              ? 'Enviar enlace'
              : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </FloatingBar>
    </div>
  );
}
