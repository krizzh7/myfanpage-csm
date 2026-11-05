import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { characters, series } from './data/assets';
import { getRunContent } from './data/runContent';
import { useBiography } from './hooks/useBiography';
import { useMusic } from './hooks/useMusic';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { sceneState } from './scene/sceneState';
import Scene from './scene/Scene';
import CharacterSection from './components/CharacterSection';
import CustomCursor from './components/CustomCursor';
import ImageLightbox from './components/ImageLightbox';
import LoadingScreen from './components/LoadingScreen';
import Navigation from './components/Navigation';
import RunMode from './components/RunMode';
import './styles.css';

function Hero() {
  const overview = useBiography(series.biography);
  return (
    <section className="hero" id="top">
      <div className="hero-grid" />
      <div className="hero-label"><span>AN INTERACTIVE FAN EXPERIENCE</span><span>JAPAN · 1997 / PRESENT</span></div>
      <div className="hero-center">
        <p className="hero-kicker"><span className="red-mark" /> A STORY ABOUT WHAT WE FEAR</p>
        <h1><span>CHAINSAW</span><em>MAN</em></h1>
        <div className="hero-subline"><span>FANPAGE — 2025</span><span>{series.subtitle}</span></div>
      </div>
      <div className="hero-bottom">
        <div className="hero-description">
          <span className="small-label">A WORLD BUILT ON FEAR</span>
          <p>{overview?.bio || 'Devils are born from human fears. One boy just wants a normal life.'}</p>
        </div>
        <div className="hero-quote">{overview?.quote ? `“${overview.quote}”` : series.quote}<span>— DENJI</span></div>
        <a className="scroll-cue" href="#aki" onClick={(event) => { event.preventDefault(); document.getElementById('aki')?.scrollIntoView({ behavior: 'smooth' }); }}><span>SCROLL TO ENTER</span><b>↓</b></a>
      </div>
      <div className="hero-coordinates"><span>35° 40′ 41.2″ N</span><span>139° 45′ 43.7″ E</span></div>
    </section>
  );
}

function SeriesInterlude() {
  return (
    <section className="interlude" id="about">
      <div className="interlude-inner">
        <p className="eyebrow"><i /> THE WORLD OF CHAINSAW MAN</p>
        <p className="interlude-title">FEAR IS<br /><span>THE CURRENCY.</span></p>
        <div className="interlude-bottom"><span>DEVILS TAKE THE SHAPE OF WHAT WE DREAD.</span><span>AND HUNTERS PAY IN YEARS.</span></div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <footer className="closing">
      <p className="eyebrow"><i /> THE END… FOR NOW</p>
      <h2>KEEP YOUR<br /><span>HEART RUNNING.</span></h2>
      <button onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}>BACK TO THE BEGINNING <span>↑</span></button>
      <div className="closing-bottom"><span>UNOFFICIAL FAN EXPERIENCE</span><span>MADE FOR THE LOVE OF THE STORY</span></div>
    </footer>
  );
}

function useScrollScenes(enabled) {
  const root = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;

    const chapters = gsap.utils.toArray('.chapter');
    const setActiveChapter = (activeIndex) => {
      if (sceneState.activeIndex === activeIndex) return;
      sceneState.activeIndex = activeIndex;
      chapters.forEach((chapter, chapterIndex) => {
        chapter.classList.toggle('is-active', chapterIndex === activeIndex);
      });
    };

    // Free scrolling: the chapter crossing the viewport centre drives the
    // WebGL gallery, instead of pinning the page for every character.
    const updateActiveChapter = () => {
      const focalPoint = window.innerHeight * 0.5;
      let activeIndex = -1;
      chapters.forEach((chapter, chapterIndex) => {
        const rect = chapter.getBoundingClientRect();
        if (rect.top <= focalPoint && rect.bottom > focalPoint) activeIndex = chapterIndex;
      });
      setActiveChapter(activeIndex);
    };

    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-kicker, .hero h1 span, .hero h1 em, .hero-subline, .hero-bottom > *',
        { y: 34, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out', delay: 0.2 },
      );

      gsap.to('.hero-center', {
        yPercent: -12,
        opacity: 0.62,
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 },
      });

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: updateActiveChapter,
        onRefresh: updateActiveChapter,
      });

      gsap.fromTo('.interlude-title', { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, scrollTrigger: { trigger: '.interlude', start: 'top 70%', end: 'center center', scrub: 1 },
      });
    }, root);

    updateActiveChapter();
    window.addEventListener('scroll', updateActiveChapter, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateActiveChapter);
      ctx.revert();
    };
  }, [enabled]);
  return root;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [runCharacter, setRunCharacter] = useState(null);
  const runOriginRef = useRef(0);
  const hasRunRef = useRef(false);
  const root = useScrollScenes(!loading);
  const { audioRef, enabled: musicEnabled, error: musicError, toggle: setMusicEnabled, url: musicUrl } = useMusic();
  const exitLoading = useCallback(() => setLoading(false), []);
  const handleMusicChoice = useCallback((choice) => {
    setMusicEnabled(choice);
  }, [setMusicEnabled]);
  useSmoothScroll(!loading);

  const startRun = useCallback((character) => {
    if (loading) return;
    const content = getRunContent(character.id);
    if (!content?.count) return;
    runOriginRef.current = window.scrollY;
    hasRunRef.current = true;
    setSelectedImage(null);
    setRunCharacter(content);
  }, [loading]);

  const exitRun = useCallback(() => setRunCharacter(null), []);

  // RUN MODE locks scrolling while open; restore the exact previous position
  // once the overlay has fully unmounted and the original scroll is released.
  useEffect(() => {
    if (runCharacter || !hasRunRef.current) return;
    hasRunRef.current = false;
    const scrollY = runOriginRef.current;
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
    return () => window.cancelAnimationFrame(frame);
  }, [runCharacter]);

  useEffect(() => {
    const onPointer = (event) => {
      sceneState.pointerX = event.detail.x;
      sceneState.pointerY = event.detail.y;
    };
    window.addEventListener('csm:pointer', onPointer);
    return () => window.removeEventListener('csm:pointer', onPointer);
  }, []);

  return (
    <>
      <audio ref={audioRef} className="site-audio" src={musicUrl} loop preload="auto" aria-label="Chainsaw Man soundtrack" />
      <main ref={root}>
        <Scene onImageSelect={setSelectedImage} selectedImage={selectedImage} />
        <Navigation musicEnabled={musicEnabled} onMusicToggle={() => setMusicEnabled(!musicEnabled)} />
        <Hero />
        <SeriesInterlude />
        {characters.map((character, index) => <CharacterSection key={character.id} character={character} index={index} onRun={startRun} />)}
        <Closing />
        <div className="grain" aria-hidden="true" />
      </main>
      {loading && <LoadingScreen musicEnabled={musicEnabled} onMusicChoice={handleMusicChoice} onExit={exitLoading} />}
      <CustomCursor />
      {musicError && <div className="music-error" role="status">{musicError}</div>}
      {selectedImage && !loading && (
        <ImageLightbox image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
      {runCharacter && !loading && (
        <RunMode character={runCharacter} onExit={exitRun} />
      )}
    </>
  );
}
