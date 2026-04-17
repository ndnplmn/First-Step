'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeft, SignOut, Trash, Lock, EnvelopeSimple, CheckCircle, Bell, BellSlash } from '@phosphor-icons/react';
import { db } from '@/lib/db';

interface SettingsProps {
  onBack: () => void;
  onSignOut: () => void;
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

export function Settings({ onBack, onSignOut }: SettingsProps) {
  const shouldReduce = useReducedMotion();
  const [email, setEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    db.getEmail().then(setEmail);
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  const handlePasswordReset = async () => {
    if (!email) return;
    setPasswordLoading(true);
    setFeedback(null);
    const { error } = await db.resetPassword(email);
    setPasswordLoading(false);
    if (error) {
      setFeedback({ type: 'error', message: 'No se pudo enviar el enlace. Intenta de nuevo.' });
    } else {
      setFeedback({ type: 'success', message: 'Te enviamos un enlace a tu correo para cambiar tu contraseña.' });
    }
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setFeedback({ type: 'success', message: 'Los recordatorios ya están activados. Puedes desactivarlos en los ajustes de tu navegador.' });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      new Notification('Tend', {
        body: 'Los recordatorios están activados. Te avisaremos para cuidarte.',
        icon: '/favicon.svg',
      });
      setFeedback({ type: 'success', message: 'Recordatorios activados. Te cuidaremos.' });
    } else {
      setFeedback({ type: 'error', message: 'Permiso denegado. Puedes activarlo desde los ajustes de tu navegador.' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const { error } = await db.deleteAccount();
    if (error) {
      setDeleteLoading(false);
      setFeedback({ type: 'error', message: 'No se pudo eliminar la cuenta. Intenta de nuevo.' });
      setShowDeleteConfirm(false);
    } else {
      onSignOut();
    }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-base)' }}>
      {/* Header */}
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
          <motion.button
            type="button"
            onClick={onBack}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="flex items-center gap-2"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Volver</span>
          </motion.button>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
          >
            Ajustes
          </p>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-6 pt-8 pb-24 space-y-8">
        {/* Title */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 5vw, 40px)',
              color: 'var(--color-deep)',
              lineHeight: 1.1,
            }}
          >
            Tu cuenta
          </h1>
        </div>

        {/* Feedback banner */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 p-4 rounded-[var(--radius-inner)]"
              style={{
                background: feedback.type === 'success' ? 'rgba(61,107,71,0.08)' : 'rgba(180,110,69,0.08)',
                border: `1px solid ${feedback.type === 'success' ? 'var(--color-sage)' : 'var(--color-terracotta)'}`,
              }}
            >
              {feedback.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--color-sage)', flexShrink: 0, marginTop: 1 }} />}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                {feedback.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account section */}
        <div
          className="rounded-[var(--radius-card)] overflow-hidden"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Email row */}
          <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: 'rgba(61,107,71,0.08)', color: 'var(--color-sage)' }}
            >
              <EnvelopeSimple size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                Correo electrónico
              </p>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-deep)' }}>
                {email ?? '—'}
              </p>
            </div>
          </div>

          {/* Change password */}
          <motion.button
            type="button"
            onClick={handlePasswordReset}
            disabled={passwordLoading}
            whileTap={shouldReduce ? {} : { scale: 0.99 }}
            className="w-full px-5 py-4 flex items-center gap-3 text-left"
            style={{ borderBottom: '1px solid var(--color-border)', opacity: passwordLoading ? 0.6 : 1 }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: 'rgba(61,107,71,0.08)', color: 'var(--color-sage)' }}
            >
              <Lock size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                {passwordLoading ? 'Enviando...' : 'Cambiar contraseña'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                Te enviaremos un enlace por correo
              </p>
            </div>
          </motion.button>

          {/* Sign out */}
          <motion.button
            type="button"
            onClick={onSignOut}
            whileTap={shouldReduce ? {} : { scale: 0.99 }}
            className="w-full px-5 py-4 flex items-center gap-3 text-left"
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: 'rgba(107,94,82,0.08)', color: 'var(--color-muted)' }}
            >
              <SignOut size={16} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
              Cerrar sesión
            </p>
          </motion.button>
        </div>

        {/* Notifications section */}
        {notifPermission !== 'unsupported' && (
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              Recordatorios
            </p>
            <div
              className="rounded-[var(--radius-card)] overflow-hidden"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <motion.button
                type="button"
                onClick={handleNotificationToggle}
                whileTap={shouldReduce ? {} : { scale: 0.99 }}
                className="w-full px-5 py-4 flex items-center gap-3 text-left"
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 36, height: 36,
                    background: notifPermission === 'granted' ? 'rgba(61,107,71,0.1)' : 'rgba(107,94,82,0.08)',
                    color: notifPermission === 'granted' ? 'var(--color-sage)' : 'var(--color-muted)',
                  }}
                >
                  {notifPermission === 'granted' ? <Bell size={16} /> : <BellSlash size={16} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                    {notifPermission === 'granted' ? 'Recordatorios activados' : 'Activar recordatorios'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {notifPermission === 'granted'
                      ? 'Recibirás avisos para cuidarte'
                      : 'Te avisamos cuando sea hora de tu sesión'}
                  </p>
                </div>
                <div
                  className="w-10 h-6 rounded-full flex-shrink-0 flex items-center px-0.5 transition-all"
                  style={{
                    background: notifPermission === 'granted' ? 'var(--color-sage)' : 'var(--color-border)',
                    justifyContent: notifPermission === 'granted' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </div>
              </motion.button>
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Zona de riesgo
          </p>
          <div
            className="rounded-[var(--radius-card)] overflow-hidden"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid rgba(180,110,69,0.2)' }}
          >
            <motion.button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              whileTap={shouldReduce ? {} : { scale: 0.99 }}
              className="w-full px-5 py-4 flex items-center gap-3 text-left"
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: 'rgba(180,110,69,0.1)', color: 'var(--color-terracotta)' }}
              >
                <Trash size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-terracotta)' }}>
                  Eliminar mi cuenta
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Borra todos tus datos permanentemente
                </p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Legal */}
        <div className="pt-2 space-y-1 text-center">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Tend · Espacio de cuidado personal
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted-soft)' }}>
            Al usar Tend aceptas que no es un sustituto de la terapia profesional.
          </p>
        </div>
      </main>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(25,22,15,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-6 rounded-t-[var(--radius-card)]"
              style={{ background: 'var(--color-base)', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}
            >
              <p
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
              >
                ¿Estás seguro/a?
              </p>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Esta acción eliminará permanentemente tu cuenta, sesiones, diario y todo tu progreso.
                No se puede deshacer.
              </p>
              <div className="space-y-3">
                <motion.button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  whileTap={shouldReduce ? {} : { scale: 0.98 }}
                  className="w-full py-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'var(--color-terracotta)', opacity: deleteLoading ? 0.6 : 1 }}
                >
                  {deleteLoading ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  whileTap={shouldReduce ? {} : { scale: 0.98 }}
                  className="w-full py-4 rounded-2xl font-medium text-sm"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
