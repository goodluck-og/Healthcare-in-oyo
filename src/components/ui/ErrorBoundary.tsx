import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isFirestorePermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isFirestorePermissionError: false,
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : String(error);
    let parsedMessage = raw;
    let isFirestorePermissionError = false;

    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      if (parsed && typeof parsed.error === 'string' && parsed.operationType) {
        isFirestorePermissionError = true;
        parsedMessage = `${parsed.operationType.toUpperCase()} on "${parsed.path || 'unknown'}" failed: ${parsed.error}`;
      }
    } catch {
      // Non-JSON error message
    }

    return {
      hasError: true,
      message: parsedMessage,
      isFirestorePermissionError,
    };
  }

  override componentDidCatch(error: unknown) {
    console.error('HealthConnect ErrorBoundary caught error:', error);
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F5F6FC] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl bg-white border border-[#E5484D]/25 p-8 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#E5484D] shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-[#0F0E47]">
                {this.state.isFirestorePermissionError
                  ? 'Access or Database Synchronization Notice'
                  : 'Unexpected Application Error'}
              </h1>
              <p className="text-xs text-[#505081] mt-1 leading-relaxed">
                {this.state.message || 'An unexpected error occurred while processing your request.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[#F5F6FC] p-3 text-xs text-[#505081] leading-relaxed">
            If you just signed in with a new account or changed roles, ensure your email is verified and refresh your session.
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reload HealthConnect Oyo State
          </button>
        </div>
      </div>
    );
  }
}
