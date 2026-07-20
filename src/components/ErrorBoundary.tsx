import React, { ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 space-y-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Algo deu errado
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Desculpe, encontramos um erro inesperado.
                  </p>
                </div>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="text-xs bg-muted p-3 rounded border border-border">
                  <summary className="cursor-pointer font-mono font-semibold mb-2">
                    Detalhes do Erro (Dev Only)
                  </summary>
                  <pre className="overflow-auto max-h-40 font-mono text-xs whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {"\n\n"}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={this.resetError}
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
                <Button
                  onClick={() => window.location.href = "/"}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Ir para Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
