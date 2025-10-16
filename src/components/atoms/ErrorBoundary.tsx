import React from "react";
import Button from "./Button";

type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Minimal logging; can be replaced with a logger
    console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="card p-6 max-w-lg w-full text-right">
            <h2 className="text-heading-3 mb-2">خطای غیرمنتظره</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              لطفاً دوباره تلاش کنید یا برنامه را مجدداً اجرا نمایید.
            </p>
            {this.state.message && (
              <pre className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded p-3 overflow-auto">
                {this.state.message}
              </pre>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() =>
                  this.setState({ hasError: false, message: undefined })
                }
              >
                ادامه
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
