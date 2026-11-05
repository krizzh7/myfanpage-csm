import { useEffect, useState } from 'react';
import { parseBiography } from '../data/assets';

export function useBiography(url) {
  const [biography, setBiography] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Biography request failed: ${response.status}`);
        return response.text();
      })
      .then((text) => setBiography(parseBiography(text)))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error);
      });
    return () => controller.abort();
  }, [url]);

  return biography;
}
