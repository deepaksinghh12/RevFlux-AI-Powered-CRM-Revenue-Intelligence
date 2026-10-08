import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "../ui";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/30 p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink mb-2">Something went wrong</h2>
          <p className="max-w-md text-sm text-ink-soft mb-6">
            An unexpected error occurred while rendering this page. Our team has been notified.
          </p>
          <Button variant="primary" onClick={this.handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
