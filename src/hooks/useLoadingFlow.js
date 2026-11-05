import { useCallback, useState } from 'react';

export function useLoadingFlow() {
  const [open, setOpen] = useState(true);
  const hide = useCallback(() => setOpen(false), []);
  return { open, hide };
}
