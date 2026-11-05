import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursor = useRef(null);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const moveX = gsap.quickTo(cursor.current, 'x', { duration: 0.11, ease: 'power3.out' });
    const moveY = gsap.quickTo(cursor.current, 'y', { duration: 0.11, ease: 'power3.out' });
    const onMove = (event) => {
      moveX(event.clientX);
      moveY(event.clientY);
      window.dispatchEvent(new CustomEvent('csm:pointer', {
        detail: {
          x: (event.clientX / window.innerWidth) * 2 - 1,
          y: 1 - (event.clientY / window.innerHeight) * 2,
        },
      }));
    };
    const onOver = (event) => setEngaged(Boolean(event.target.closest('a, button, [data-cursor="image"]')));
    const onDown = () => setEngaged(true);
    const onUp = (event) => setEngaged(Boolean(event.target.closest('a, button, [data-cursor="image"]')));
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <div className="custom-cursor" aria-hidden="true">
      <span className={`cursor-position${engaged ? ' is-engaged' : ''}`} ref={cursor}>
        <img className="cursor-normal" src="/csm/cource/ui/cursor_normal.png" alt="" draggable="false" />
        <img className="cursor-hover" src="/csm/cource/ui/cursor_hover.png" alt="" draggable="false" />
      </span>
    </div>
  );
}
