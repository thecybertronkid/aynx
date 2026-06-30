import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in AYNX React tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.hash = '/';
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-discord-tertiary text-discord-textNormal select-none p-6 font-sans">
          <div className="max-w-md w-full bg-discord-secondary border border-discord-border p-6 rounded-2xl shadow-2xl space-y-6 text-center">
            
            {/* Danger Icon */}
            <div className="w-16 h-16 rounded-2xl bg-discord-danger/10 border border-discord-danger/25 flex items-center justify-center mx-auto text-discord-danger animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Message Header */}
            <div className="space-y-1">
              <h2 className="text-lg font-black text-discord-textNormal uppercase tracking-wide">React Render Crash</h2>
              <p className="text-xs text-discord-textMuted font-semibold">An unexpected runtime error crashed the view.</p>
            </div>

            {/* Stack trace log */}
            <div className="bg-discord-primary/60 border border-discord-border rounded-xl p-3.5 text-left text-[10px] font-mono text-discord-danger/90 max-h-40 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </div>

            {/* Recovery actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload UI</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn-primary text-[11px] py-2 flex items-center justify-center space-x-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
