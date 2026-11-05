import { forwardRef } from 'react';

/**
 * A single cinematic panel inside RUN MODE. Positioning and scale are driven
 * imperatively by RunMode's animation loop (no React render per pointer move).
 */
const RunImage = forwardRef(function RunImage(
  { entry, index, total, character, active, onSelect },
  ref,
) {
  return (
    <figure
      ref={ref}
      className={`run-panel${active ? ' is-active' : ''}`}
      data-index={index}
      onClick={() => onSelect(index)}
    >
      <div className="run-panel-media">
        <img
          src={entry.url}
          alt={`${character.name} — ${entry.title}`}
          draggable="false"
          loading={index < 2 ? 'eager' : 'lazy'}
          decoding="async"
        />
        <span className="run-panel-border" aria-hidden="true" />
      </div>
      <figcaption>
        <span>{entry.counter} / {String(total).padStart(2, '0')}</span>
        <span>{entry.title}</span>
      </figcaption>
    </figure>
  );
});

export default RunImage;
