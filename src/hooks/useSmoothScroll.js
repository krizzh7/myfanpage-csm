import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneState } from '../scene/sceneState';

gsap.registerPlugin(ScrollTrigger);

export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.3,
    });
    let previousScroll = 0;
    const tick = (time) => lenis.raf(time * 1000);
    const update = ({ scroll, velocity, progress }) => {
      sceneState.scrollProgress = progress;
      sceneState.scrollVelocity = velocity;
      previousScroll = scroll;
      ScrollTrigger.update();
    };
    lenis.on('scroll', update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // RUN MODE freezes the page; the overlay handles all of its own gestures.
    const onRunMode = (event) => {
      if (event.detail?.active) lenis.stop();
      else lenis.start();
    };
    window.addEventListener('csm:runmode', onRunMode);

    return () => {
      window.removeEventListener('csm:runmode', onRunMode);
      lenis.off('scroll', update);
      gsap.ticker.remove(tick);
      lenis.destroy();
      sceneState.scrollProgress = 0;
      sceneState.scrollVelocity = 0;
      previousScroll = 0;
    };
  }, [enabled]);
}
