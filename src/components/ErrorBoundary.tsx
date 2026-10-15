import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Ocorreu um erro no aplicativo</span>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed">
              O sistema detectou um erro inesperado. Seus dados gravados no banco de dados estão seguros.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-neutral-50 border border-neutral-300 text-[11px] font-mono text-neutral-800 break-all max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold border border-black hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Sistema
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
