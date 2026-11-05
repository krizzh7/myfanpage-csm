import { useBiography } from '../hooks/useBiography';
import { prefetchCharacterImages } from '../data/runContent';

export default function CharacterSection({ character, index, onRun }) {
  const biography = useBiography(character.biographyUrl);
  const quote = biography?.quote;
  const role = biography?.role;
  const contract = biography?.['devil / contract'];
  const preload = () => prefetchCharacterImages(character);

  return (
    <section className={`chapter${index % 2 === 1 ? ' chapter--flip' : ''}`} id={character.id} data-chapter={index} style={{ '--accent': character.accent }}>
      <div className="chapter-shell">
        <div className="chapter-meta">
          <span className="eyebrow"><i /> {character.label}</span>
          <span className="chapter-index">{character.number} <b>/</b> 07</span>
        </div>
        <div className="chapter-copy">
          <p className="chapter-role">{role || 'DEVIL HUNTER'}</p>
          <h2>{character.name.split(' ').map((word) => <span key={word}>{word}</span>)}</h2>
          <div className="chapter-rule" />
          <p className="chapter-bio">{biography?.bio || 'A contract is never a promise. It is a price.'}</p>
          <div className="chapter-details">
            <div><span>DEVIL CONTRACT</span><strong>{contract || 'CLASSIFIED'}</strong></div>
            {quote && <blockquote>“{quote}”</blockquote>}
          </div>
        </div>
        <div className="chapter-image-hint">
          <button
            type="button"
            className="run-trigger"
            onClick={() => onRun?.(character)}
            onPointerEnter={preload}
            onFocus={preload}
            aria-label={`Open RUN MODE for ${character.name}`}
          >
            <i /> RUN MODE <b>↗</b>
          </button>
          <span>SELECT AN IMAGE</span><span className="hint-line" />
        </div>
        <div className="chapter-footer"><span>PUBLIC SAFETY — SPECIAL DIVISION 4</span><span>SCROLL TO CONTINUE ↓</span></div>
      </div>
    </section>
  );
}
