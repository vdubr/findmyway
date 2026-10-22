// Načítání – sedící liška se jemně pohupuje (bez animace při prefers-reduced-motion)
import FoxMessage from './FoxMessage';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Hledám cestu…' }: LoadingSpinnerProps) {
  return <FoxMessage fox="sitting" title={message} bob role="status" />;
}
