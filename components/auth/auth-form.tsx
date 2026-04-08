'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';
import { db } from '@/lib/db';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

type Tab = 'login' | 'register';

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

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const isLoginReady = email.trim() && password.trim();
  const isRegisterReady =
    name.trim() && email.trim() && password.trim() && confirmPassword.trim();

  const handleSubmit = async () => {
    setError('');
    if (tab === 'register') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        const { error: err } = await db.signIn(email, password);
        if (err) {
          setError('Email o contraseña incorrectos.');
        } else {
          onAuthSuccess();
        }
      } else {
        const { error: err } = await db.signUp(email, password);
        if (err) {
          setError(err.message ?? 'No se pudo crear la cuenta.');
        } else {
          setRegistered(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
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
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(107,127,110,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '1.5rem',
          }}>✉️</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '1.75rem',
            color: 'var(--color-deep)',
            marginBottom: '1rem',
          }}>Revisa tu correo</h2>
          <p style={{ color: 'var(--color-muted)', lineHeight: 1.6 }}>
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            Una vez confirmado, vuelve aquí para iniciar sesión.
          </p>
          <button
            onClick={() => { setRegistered(false); setTab('login'); }}
            style={{
              marginTop: '2rem',
              background: 'none',
              border: 'none',
              color: 'var(--color-sage)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      maxWidth: 680,
      margin: '0 auto',
      padding: '0 1.5rem',
      paddingTop: '22vh',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(107,127,110,0.08) 0%, transparent 60%)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
        color: 'var(--color-deep)',
        marginBottom: '0.5rem',
        lineHeight: 1.1,
      }}>
        First Step
      </h1>
      <p style={{
        color: 'var(--color-muted)',
        fontSize: '1rem',
        marginBottom: '2.5rem',
        lineHeight: 1.5,
      }}>
        Tu espacio terapéutico personal.
      </p>

      <div style={{
        display: 'flex',
        gap: '1.5rem',
        marginBottom: '2rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {(['login', 'register'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 0 0.75rem',
              fontSize: '0.9375rem',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--color-deep)' : 'var(--color-muted)',
              cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--color-sage)' : '2px solid transparent',
              transition: 'all 0.2s',
              marginBottom: '-1px',
            }}
          >
            {t === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'register' && (
            <Field label="Nombre" type="text" value={name} onChange={setName} placeholder="Tu nombre" />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          {tab === 'register' && (
            <Field label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p style={{
          color: 'var(--color-terracotta)',
          fontSize: '0.875rem',
          marginTop: '0.5rem',
          marginBottom: '1rem',
        }}>
          {error}
        </p>
      )}

      <div style={{ height: '6rem' }} />

      <FloatingBar visible={tab === 'login' ? !!isLoginReady : !!isRegisterReady}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? 'var(--color-muted)' : 'var(--color-deep)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: '1rem',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading
            ? 'Un momento...'
            : tab === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
        </button>
      </FloatingBar>
    </div>
  );
}
