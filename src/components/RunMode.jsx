import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useBiography } from '../hooks/useBiography';
import { sceneState } from '../scene/sceneState';
import RunImage from './RunImage';

// Approximate scatter origins of the five WebGL portraits. Used only for the
// entrance/exit gather so RUN MODE feels like it grows out of the chapter.
const SCATTER = [
  { x: -0.16, y: 0.02, r: -2.6 },
  { x: 0.12, y: 0.19, r: 2.0 },
  { x: 0.15, y: -0.25, r: -1.7 },
  { x: 0.34, y: 0.03, r: 2.8 },
  { x: -0.05, y: -0.34, r: 1.8 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function RunMode({ character, onExit }) {
  const entries = character.entries;
  const total = entries.length;
  const maxProgress = Math.max(0, total - 1);
  const biography = useBiography(character.biographyUrl);

  const overlayRef = useRef(null);
  const galleryRef = useRef(null);
  const infoRef = useRef(null);
  const exitRef = useRef(null);
  const fillRef = useRef(null);
  const panelsRef = useRef([]);
  const sizeRef = useRef({ width: 0, height: 0 });
  const scatterRef = useRef([]);

  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const entryRef = useRef(0);
  const activeIndexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastPointerRef = useRef(null);
  const dragRef = useRef({ active: false, moved: false, lastX: 0 });
  const suppressClickRef = useRef(false);
  const exitingRef = useRef(false);
  const reducedRef = useRef(false);
  const tweensRef = useRef([]);
  const restoreFocusRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const goTo = useCallback((index) => {
    targetRef.current = clamp(index, 0, maxProgress);
  }, [maxProgress]);

  const step = useCallback((direction) => {
    targetRef.current = clamp(Math.round(progressRef.current) + direction, 0, maxProgress);
  }, [maxProgress]);

  const requestExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);

    if (reducedRef.current) {
      tweensRef.current.push(gsap.to(overlayRef.current, {
        opacity: 0, duration: 0.18, ease: 'power1.out', onComplete: onExit,
      }));
      return;
    }

    const proxy = { value: 1 };
    tweensRef.current.push(
      gsap.to(proxy, {
        value: 0,
        duration: 0.58,
        ease: 'power3.inOut',
        onUpdate: () => { entryRef.current = proxy.value; },
      }),
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.52,
        ease: 'power2.inOut',
        onComplete: onExit,
      }),
    );
  }, [onExit]);

  // Lock the page, stop Lenis, mount/unmount housekeeping.
  useEffect(() => {
    const overlay = overlayRef.current;
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    restoreFocusRef.current = document.activeElement;

    root.style.setProperty('--run-scrollbar', `${Math.max(0, scrollbar)}px`);
    root.classList.add('run-mode-open');
    document.querySelector('main')?.setAttribute('inert', '');
    sceneState.runMode = true;
    window.dispatchEvent(new CustomEvent('csm:runmode', { detail: { active: true } }));

    reducedRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    exitRef.current?.focus({ preventScroll: true });

    const measure = () => {
      const gallery = galleryRef.current;
      if (!gallery) return;
      const rect = gallery.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };

      const characterIndex = Number(character.number) - 1;
      const direction = characterIndex % 2 === 0 ? 1 : -1;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      scatterRef.current = entries.map((_, index) => {
        const layout = SCATTER[index % SCATTER.length];
        const viewportX = window.innerWidth / 2 + (0.63 + layout.x * 0.72 - 0.5) * window.innerWidth * direction;
        const viewportY = window.innerHeight / 2 - layout.y * window.innerHeight;
        return {
          x: viewportX - centerX,
          y: viewportY - centerY,
          rot: layout.r,
          scale: 0.82,
          opacity: 0,
        };
      });
    };

    measure();

    if (reducedRef.current) {
      entryRef.current = 1;
      gsap.set(overlay, { opacity: 1 });
    } else {
      tweensRef.current.push(
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.38, ease: 'power2.out' }),
        gsap.fromTo(infoRef.current, { opacity: 0, y: 20 }, {
          opacity: 1, y: 0, duration: 0.7, delay: 0.18, ease: 'power3.out',
        }),
      );
      const proxy = { value: 0 };
      tweensRef.current.push(gsap.to(proxy, {
        value: 1,
        duration: 1.05,
        delay: 0.05,
        ease: 'power3.out',
        onUpdate: () => { entryRef.current = proxy.value; },
      }));
    }

    let resizeFrame = 0;
    const onResize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', onResize);
      tweensRef.current.forEach((tween) => tween.kill());
      tweensRef.current = [];
      root.classList.remove('run-mode-open');
      root.style.removeProperty('--run-scrollbar');
      document.querySelector('main')?.removeAttribute('inert');
      sceneState.runMode = false;
      window.dispatchEvent(new CustomEvent('csm:runmode', { detail: { active: false } }));
      restoreFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [character.number, entries]);

  // Continuous damped progression + imperative panel transforms.
  useEffect(() => {
    let frame = 0;

    const render = (time) => {
      const gallery = galleryRef.current;
      const width = sizeRef.current.width;
      const height = sizeRef.current.height;

      if (gallery && width > 0) {
        const progress = progressRef.current;
        const pointerParallax = sceneState.pointerX * width * 0.012;
        const entry = entryRef.current;

        panelsRef.current.forEach((panel, index) => {
          if (!panel) return;
          const offset = index - progress;
          const distance = Math.abs(offset);
          const scatter = scatterRef.current[index] || { x: 0, y: 0, rot: 0, scale: 0.82, opacity: 0 };

          const targetX = offset * width * 0.3;
          const targetY = (index % 2 === 0 ? -1 : 1) * Math.min(distance, 1) * height * 0.018;
          const targetRot = offset * -1.7;
          const targetScale = 1 - Math.min(distance, 1.3) * 0.31;
          const targetOpacity = distance > 2.4 ? 0 : Math.max(0.1, 1 - distance * 0.39);

          const x = scatter.x + (targetX - scatter.x) * entry + pointerParallax * (1 - Math.min(distance, 1));
          const y = scatter.y + (targetY - scatter.y) * entry;
          const rot = scatter.rot + (targetRot - scatter.rot) * entry;
          const scale = scatter.scale + (targetScale - scatter.scale) * entry;
          const opacity = (scatter.opacity + (targetOpacity - scatter.opacity) * entry);

          panel.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
          panel.style.opacity = opacity.toFixed(3);
          panel.style.zIndex = String(Math.max(1, 100 - Math.round(distance * 10)));
          panel.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
          panel.style.filter = distance > 0.8
            ? `brightness(${Math.max(0.58, 1 - (distance - 0.8) * 0.22)})`
            : 'none';
        });

        if (fillRef.current) {
          const ratio = maxProgress > 0 ? progress / maxProgress : 0;
          fillRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
        }

        const nearest = clamp(Math.round(progress), 0, maxProgress);
        if (nearest !== activeIndexRef.current) {
          activeIndexRef.current = nearest;
          setActiveIndex(nearest);
        }
      }

      const previous = lastTimeRef.current || time;
      const delta = Math.min((time - previous) / 1000, 0.05);
      lastTimeRef.current = time;

      if (!exitingRef.current) {
        const damping = 1 - Math.exp(-delta * (reducedRef.current ? 14 : 6.2));
        progressRef.current += (targetRef.current - progressRef.current) * damping;
        if (Math.abs(targetRef.current - progressRef.current) < 0.0004) {
          progressRef.current = targetRef.current;
        }
      }

      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [maxProgress]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestExit();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestExit, step]);

  const onPointerEnter = (event) => {
    lastPointerRef.current = event.clientX;
  };

  const onPointerMove = (event) => {
    if (!galleryRef.current) return;
    const width = sizeRef.current.width;
    if (!width) return;

    const previousX = lastPointerRef.current ?? event.clientX;
    const deltaX = event.clientX - previousX;
    lastPointerRef.current = event.clientX;

    if (dragRef.current.active) {
      if (Math.abs(deltaX) > 1.5) dragRef.current.moved = true;
      if (dragRef.current.moved) {
        targetRef.current = clamp(
          targetRef.current + (-deltaX / width) * maxProgress * 1.35,
          0,
          maxProgress,
        );
      }
      return;
    }

    // Cursor position drives progression through accumulated horizontal motion.
    // Because it is relative to the previous pointer sample, entering the
    // gallery can never snap or jump to a different image.
    targetRef.current = clamp(
      targetRef.current + (deltaX / width) * maxProgress * 1.45,
      0,
      maxProgress,
    );
  };

  const onPointerDown = (event) => {
    if (!galleryRef.current) return;
    dragRef.current = { active: true, moved: false, lastX: event.clientX };
    lastPointerRef.current = event.clientX;
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerUp = (event) => {
    if (!dragRef.current.active) return;
    const moved = dragRef.current.moved;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (moved) {
      suppressClickRef.current = true;
      targetRef.current = clamp(Math.round(progressRef.current), 0, maxProgress);
      window.setTimeout(() => { suppressClickRef.current = false; }, 260);
    }
  };

  const onPointerLeave = () => {
    if (!dragRef.current.active) lastPointerRef.current = null;
  };

  const onPanelSelect = (index) => {
    if (suppressClickRef.current) return;
    goTo(index);
  };

  const role = biography?.role || character.label;
  const contract = biography?.['devil / contract'];
  const quote = biography?.quote;
  const activeEntry = entries[activeIndex] || entries[0];

  return (
    <section
      ref={overlayRef}
      className={`run-mode${exiting ? ' is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${character.name} — RUN MODE image exploration`}
      style={{ '--run-accent': character.accent }}
    >
      <div className="run-backdrop" aria-hidden="true" />
      <header className="run-topbar">
        <p className="run-brand"><i /> RUN MODE <span>/</span> CHAPTER {character.number} — {character.name.toUpperCase()}</p>
        <button ref={exitRef} type="button" className="run-exit" onClick={requestExit}>
          EXIT RUN <b>×</b>
        </button>
      </header>

      <div className="run-layout">
        <aside className="run-info" ref={infoRef} data-lenis-prevent>
          <div className="run-identity">
            <p className="eyebrow"><i /> {character.label} <span className="run-sep">/</span> {character.number}</p>
            <h2>{character.name.split(' ').map((word) => <span key={word}>{word}</span>)}</h2>
            <p className="run-role">{role}</p>
          </div>

          <div className="run-divider" />

          <div className="run-copy" key={activeIndex} aria-live="polite">
            <p className="run-image-index">IMAGE {String(activeIndex + 1).padStart(2, '0')} <span>/ {String(total).padStart(2, '0')}</span></p>
            <h3>{activeEntry.title}</h3>
            <p className="run-description">{activeEntry.description}</p>
          </div>

          <div className="run-info-footer">
            {contract && (
              <div className="run-contract">
                <span>DEVIL CONTRACT</span>
                <strong>{contract}</strong>
              </div>
            )}
            {quote && <blockquote className="run-quote">“{quote}”</blockquote>}
          </div>

          <div className="run-controls">
            <button
              type="button"
              className="run-nav"
              onClick={() => step(-1)}
              disabled={activeIndex <= 0}
              aria-label="Previous image"
            >←</button>
            <span className="run-counter"><b>{String(activeIndex + 1).padStart(2, '0')}</b><em>/</em>{String(total).padStart(2, '0')}</span>
            <button
              type="button"
              className="run-nav"
              onClick={() => step(1)}
              disabled={activeIndex >= maxProgress}
              aria-label="Next image"
            >→</button>
          </div>
        </aside>

        <div className="run-gallery-wrap">
          <div
            ref={galleryRef}
            className="run-gallery"
            data-cursor="image"
            onPointerEnter={onPointerEnter}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerLeave}
          >
            {entries.map((entry, index) => (
              <RunImage
                key={`${character.id}-${entry.image}`}
                ref={(node) => { panelsRef.current[index] = node; }}
                entry={entry}
                index={index}
                total={total}
                character={character}
                active={index === activeIndex}
                onSelect={onPanelSelect}
              />
            ))}
          </div>

          <div className="run-rail">
            <div className="run-rail-track"><span ref={fillRef} /></div>
            <div className="run-rail-ticks">
              {entries.map((entry, index) => (
                <button
                  key={`tick-${entry.image}`}
                  type="button"
                  className={`run-tick${index === activeIndex ? ' is-current' : ''}`}
                  aria-label={`Show image ${index + 1}: ${entry.title}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          </div>

          <div className="run-gallery-hint">
            <span><i /> MOVE CURSOR TO EXPLORE</span>
            <span>DRAG / SWIPE · ← →</span>
          </div>
        </div>
      </div>
    </section>
  );
}
