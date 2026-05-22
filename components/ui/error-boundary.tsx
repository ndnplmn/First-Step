'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="min-h-dvh flex flex-col items-center justify-center px-6 text-center max-w-[480px] mx-auto"
          style={{ background: 'var(--color-base)' }}
        >
          <div
            className="w-12 h-1 rounded-full mb-8 mx-auto"
            style={{ background: 'var(--color-terracotta)' }}
          />
          <h2
            className="text-2xl mb-3 leading-snug"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-deep)' }}
          >
            Algo salió mal
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
            Ocurrió un error inesperado. Tu progreso está guardado — recarga la página para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
            style={{ background: 'var(--color-deep)' }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
