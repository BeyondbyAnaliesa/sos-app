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

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      JSON.stringify({
        _level: 'error',
        _ts: new Date().toISOString(),
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        componentStack: info.componentStack?.split('\n').slice(0, 5).join('\n'),
        source: 'ErrorBoundary',
      }),
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
          <h2 className="text-lg font-light text-[var(--color-text)]">Something went wrong</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Try refreshing the page. If this keeps happening, reach out to us.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
