import { useCallback, useRef, useState } from 'react';

export const SOUND_URL = '/csm/cource/Assets/Chainsaw Man GTA IV Loading Screen.mp3';

export function useMusic() {
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  const toggle = useCallback((nextEnabled) => {
    if (!audioRef.current) return Promise.resolve(false);
    if (!nextEnabled) {
      audioRef.current.pause();
      setEnabled(false);
      setError('');
      return Promise.resolve(false);
    }
    setEnabled(true);
    setError('');
    return audioRef.current.play().then(() => true).catch(() => {
      setEnabled(false);
      setError('Sound could not start. Use the music button to try again.');
      return false;
    });
  }, []);

  return { audioRef, enabled, error, toggle, url: SOUND_URL };
}
