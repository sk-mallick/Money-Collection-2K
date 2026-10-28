import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred while displaying this page.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="size-4" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
