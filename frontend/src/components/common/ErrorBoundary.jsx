import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 text-center">
          <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-ink">Something went wrong</h2>
            <p className="mt-2 text-xs text-ink-soft">
              An unexpected UI rendering error occurred. Click reload to refresh your session.
            </p>

            {this.state.error && (
              <div className="mt-4 max-h-40 overflow-auto rounded-xl bg-slate-900 p-3 text-left font-mono text-[11px] text-rose-300">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="brand-gradient mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-xs hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
