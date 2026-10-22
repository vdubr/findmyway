// Chyba – liška na zadních s vysvětlením a případným tlačítkem pro nový pokus
import RefreshIcon from '@mui/icons-material/Refresh';
import { Button } from '@mui/material';
import FoxMessage from './FoxMessage';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  title = 'Tady stezka končí',
  message = 'Něco se pokazilo. Zkuste to prosím znovu.',
  onRetry,
}: ErrorDisplayProps) {
  return (
    <FoxMessage
      fox="standing"
      title={title}
      message={message}
      role="alert"
      action={
        onRetry && (
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRetry}>
            Zkusit znovu
          </Button>
        )
      }
    />
  );
}
