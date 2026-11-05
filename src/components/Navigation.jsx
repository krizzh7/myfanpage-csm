import { characters, series } from '../data/assets';

export default function Navigation({ musicEnabled, onMusicToggle }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <header className="site-header">
      <button className="wordmark" onClick={() => scrollTo('top')} aria-label="Back to top">
        <span className="mark-icon">C</span><span>CHAINSAW<br />MAN</span>
      </button>
      <nav className="desktop-nav" aria-label="Character chapters">
        {characters.map((character, index) => (
          <button key={character.id} onClick={() => scrollTo(character.id)}>{String(index + 1).padStart(2, '0')}</button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="music-toggle" type="button" onClick={onMusicToggle} aria-pressed={musicEnabled} aria-label={musicEnabled ? 'Disable music' : 'Enable music'}>
          <span className="music-indicator" /> MUSIC {musicEnabled ? 'ON' : 'OFF'}
        </button>
        <a className="header-link" href="#about" onClick={(event) => { event.preventDefault(); scrollTo('about'); }}>THE SERIES <span>↘</span></a>
      </div>
    </header>
  );
}
