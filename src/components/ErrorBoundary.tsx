import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Box, Alert, AlertTitle, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    // TODO: Log to error reporting service in production
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
          }}
        >
          <Alert
            severity="error"
            sx={{ maxWidth: 600 }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
              >
                Obnovit stránku
              </Button>
            }
          >
            <AlertTitle>Aplikace narazila na chybu</AlertTitle>
            Omlouváme se za komplikace. Zkuste prosím obnovit stránku.
            {import.meta.env.DEV && this.state.error && (
              <Box component="pre" sx={{ mt: 2, fontSize: '0.75rem', overflow: 'auto' }}>
                {this.state.error.toString()}
              </Box>
            )}
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
