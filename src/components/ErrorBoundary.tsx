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
    // Structured log — swap to Sentry.captureException() later
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
          <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-rose-400/30 to-transparent" />
          <h2 className="text-lg font-light text-white">Something went wrong</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Try refreshing the page. If this keeps happening, reach out to us.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.05] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/[0.08]"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
