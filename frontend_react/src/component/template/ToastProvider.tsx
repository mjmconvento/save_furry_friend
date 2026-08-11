import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Alert, AlertColor, Snackbar } from '@mui/material';

export interface Notice {
  message: string;
  severity: AlertColor;
}

/**
 * Message and severity outlive `open` on purpose: the Snackbar keeps rendering
 * its child through the exit transition, so clearing them on dismiss would
 * blank the alert mid-fade. `seq` is the remount key — MUI restarts the
 * autohide timer when the Snackbar mounts, not when its message changes, so
 * two notices in quick succession would otherwise share the first timer and
 * the second would vanish early.
 */
interface ToastState extends Notice {
  open: boolean;
  seq: number;
}

const INITIAL: ToastState = {
  message: '',
  severity: 'info',
  open: false,
  seq: 0,
};

/**
 * No-op default: `ToastProvider` is mounted at the root in `index.tsx`, so a
 * consumer outside it is a wiring mistake, not a supported mode.
 */
const NotifyContext = createContext<(notice: Notice) => void>(() => {});

/** Stable across renders, so it is safe in effect dependency lists. */
export const useNotify = (): ((notice: Notice) => void) =>
  useContext(NotifyContext);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [state, setState] = useState<ToastState>(INITIAL);

  const notify = useCallback((notice: Notice) => {
    setState((prev) => ({ ...notice, open: true, seq: prev.seq + 1 }));
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={state.seq}
        open={state.open}
        autoHideDuration={3000}
        onClose={dismiss}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={dismiss}
          severity={state.severity}
          sx={{ width: '100%' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
};
