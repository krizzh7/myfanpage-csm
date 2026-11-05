import { useEffect, useRef, useState } from 'react';

export const VIDEO_URL = '/csm/cource/Assets/Chainsaw Man GTA IV Loading Screen.mp4';
export const LOADING_VIDEO_LIMIT = 52;

export default function LoadingScreen({ musicEnabled, onMusicChoice, onExit }) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showMakima, setShowMakima] = useState(false);

  useEffect(() => {
    if (!started || !videoRef.current) return undefined;
    const video = videoRef.current;
    const onSeeking = () => {
      if (video.currentTime >= LOADING_VIDEO_LIMIT) {
        video.currentTime = LOADING_VIDEO_LIMIT;
        onExit();
      }
    };
    const onTimeUpdate = () => {
      if (video.currentTime >= LOADING_VIDEO_LIMIT) {
        video.currentTime = LOADING_VIDEO_LIMIT;
        video.pause();
        onExit();
        return;
      }
      setShowMakima(false);
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeking', onSeeking);
    video.currentTime = 0;
    video.play().catch(() => setVideoError(true));
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('seeking', onSeeking);
    };
  }, [started, onExit]);

  const begin = (withMusic) => {
    onMusicChoice(withMusic);
    setStarted(true);
  };

  const requestExit = () => {
    if (!started) return;
    setExitPrompt(true);
  };

  return (
    <div className="loading-screen" onClick={requestExit} role="presentation">
      <video
        ref={videoRef}
        className="loader-video"
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        onEnded={onExit}
        onError={() => setVideoError(true)}
        aria-label="Chainsaw Man loading video"
      />
      <div className="loader-vignette" />
      <div className="loader-hud" aria-hidden="true">
        <div className="loader-brand"><span>CHAINSAW MAN</span><small>PUBLIC SAFETY — TOKYO</small></div>
        <div className="loader-location"><span>JAPAN</span><b>1997 / PRESENT</b></div>
        <div className="loader-bottom"><span>{videoError ? 'VIDEO UNAVAILABLE — ENTER TO CONTINUE' : started ? 'CLICK ANYWHERE TO CONTINUE' : 'A FAN-MADE CINEMATIC EXPERIENCE'}</span><span>◈ 01 — 07 ◈</span></div>
      </div>
      {showMakima && <div className="loader-makima" aria-hidden="true">MAKIMA</div>}

      {!started && (
        <div className="loader-choice" role="dialog" aria-modal="true" aria-labelledby="loaderChoiceTitle" onClick={(event) => event.stopPropagation()}>
          <p className="loader-overline">CHAINSAW MAN — SPECIAL DIVISION 4</p>
          <h1 id="loaderChoiceTitle">ENTER THE<br /><span>DEVIL HUNTER FILES</span></h1>
          <p className="loader-choice-copy">Would you like to hear the soundtrack during your visit?</p>
          <div className="loader-choice-actions">
            <button type="button" className="loader-button loader-button--primary" onClick={() => begin(true)}>ENTER WITH MUSIC</button>
            <button type="button" className="loader-button" onClick={() => begin(false)}>ENTER WITHOUT MUSIC</button>
          </div>
          <p className="loader-choice-note">THE VIDEO PLAYS FOR UP TO 00:52 · CLICK ANYTIME TO SKIP</p>
        </div>
      )}

      {exitPrompt && (
        <div className="loader-choice loader-choice--exit" role="dialog" aria-modal="true" aria-labelledby="loaderExitTitle" onClick={(event) => event.stopPropagation()}>
          <p className="loader-overline">PUBLIC SAFETY — ACCESS POINT</p>
          <h2 id="loaderExitTitle">LEAVE THE<br /><span>LOADING SCREEN?</span></h2>
          <div className="loader-choice-actions">
            <button type="button" className="loader-button loader-button--primary" onClick={onExit}>EXIT TO MAIN PAGE</button>
            <button type="button" className="loader-button" onClick={() => setExitPrompt(false)}>KEEP WATCHING</button>
          </div>
        </div>
      )}
    </div>
  );
}
