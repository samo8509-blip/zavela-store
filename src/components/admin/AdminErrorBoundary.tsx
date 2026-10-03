import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  sectionName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xl max-w-2xl mx-auto my-8 space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="p-3 bg-rose-100 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Hubo un detalle al cargar la sección {this.props.sectionName ? `"${this.props.sectionName}"` : ''}
              </h3>
              <p className="text-xs text-slate-500">
                Se detectó una discrepancia de datos temporal. Los datos de la tienda siguen seguros.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-4 bg-slate-900 text-rose-300 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 hover:opacity-90 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar Cargar Sección</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>Recargar Panel Completo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


