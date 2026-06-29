import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, an uncaught render error anywhere in the tree unmounts the
// entire app (React's default behavior) and leaves a blank page that only a
// full reload can recover from — there was no error boundary anywhere in
// this app before. AdminLayout mounts this with `key={location.pathname}`,
// so navigating to a different route remounts it and clears any caught
// error, meaning a crash on one page no longer takes down the whole SPA or
// requires a manual refresh to move past.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[60vh] p-6">
          <div className="flex flex-col items-center text-center max-w-md">
            <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
            <h2 className="text-lg font-semibold mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This page failed to render. Try again, or navigate to another page.
            </p>
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
