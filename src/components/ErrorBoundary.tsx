import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              The application encountered an unexpected runtime error. We've logged the incident and are working on a fix.
            </p>
            
            <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-32 mb-6">
              <code className="text-[10px] font-mono whitespace-pre">
                {this.state.error?.message || 'Unknown Error'}
              </code>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 gap-2" 
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => {
                   this.setState({ hasError: false, error: null });
                   window.location.href = '/';
                }}
              >
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
