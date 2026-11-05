import { useCallback, useEffect, useState } from 'react';
import { useBiography } from '../hooks/useBiography';

const CLOSE_DURATION = 240;

export default function ImageLightbox({ image, onClose }) {
  const biography = useBiography(image.biographyUrl);
  const [closing, setClosing] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const requestClose = useCallback(() => {
    setClosing(true);
  }, []);

  useEffect(() => {
    if (!closing) return undefined;
    const timer = window.setTimeout(onClose, CLOSE_DURATION);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const role = biography?.role || image.characterLabel;
  const contract = biography?.['devil / contract'];

  return (
    <div
      className={`image-lightbox${closing ? ' is-closing' : ''}`}
      role="presentation"
      onClick={requestClose}
      style={{ '--accent': image.characterAccent }}
    >
      <div
        className="lightbox-shell"
        role="dialog"
        aria-modal="true"
        aria-label={`${image.characterName} — enlarged portrait`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="lightbox-close" aria-label="Close enlarged image" onClick={requestClose}>×</button>
        <figure className={`lightbox-media${zoomed ? ' is-zoomed' : ''}`}>
          <button type="button" className="lightbox-image-button" onClick={() => setZoomed((value) => !value)} aria-label={zoomed ? 'Zoom out' : 'Zoom in'}>
            <img src={image.url} alt={image.alt} draggable="false" />
          </button>
          <figcaption>
            <span>PORTRAIT {String((image.imageIndex ?? 0) + 1).padStart(2, '0')}</span>
            <span className="lightbox-zoom-hint">{zoomed ? 'CLICK TO ZOOM OUT' : 'CLICK TO ZOOM IN'}</span>
          </figcaption>
        </figure>
        <aside className="lightbox-copy">
          <p className="eyebrow"><i /> CHAPTER {image.characterNumber} — {image.characterLabel}</p>
          <h2>{image.characterName}</h2>
          <p className="lightbox-role">{role}</p>
          <div className="lightbox-rule" />
          <p className="lightbox-bio">{biography?.bio || 'A contract is never a promise. It is a price.'}</p>
          <div className="lightbox-details">
            {contract && <div><span>DEVIL CONTRACT</span><strong>{contract}</strong></div>}
            {biography?.quote && <blockquote>“{biography.quote}”</blockquote>}
          </div>
        </aside>
      </div>
    </div>
  );
}
