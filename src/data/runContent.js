import { characters } from './assets';

/**
 * RUN MODE content.
 *
 * Every character folder ships one `contN.txt` per artwork. The files are not
 * named after the images, so the associations below were established by
 * inspecting each artwork against the copy (titles + body text). Entries are
 * ordered as chapters 01..0N so the gallery reads like the character's arc.
 *
 * `cont` refers to `source/<folder>/cont<N>.txt`, `image` to the existing file
 * in the character folder. Nothing here renames, moves or edits those assets.
 */
const imageToCont = {
  aki: [
    // Determined, blade-ready cover portrait — the origin of the vendetta.
    { cont: 1, image: 'aki.webp' },
    // The two-finger "Kon" hand sign — the Fox Devil pact.
    { cont: 2, image: 'aki2.webp' },
    // Aki and Denji together — the reluctant guardian / makeshift home.
    { cont: 3, image: 'aki and denji.jpg' },
    // Dim, solitary portrait — the revenge beginning to fracture.
    { cont: 4, image: 'aki3.webp' },
    // Ethereal smoke / white negative space — the final farewell.
    { cont: 5, image: 'Aki hayakawa.webp' },
  ],
  asa: [
    // Isolated, downcast portrait — solitude before the murder.
    { cont: 1, image: 'asa3.jpg' },
    // Scarred close-up — Yoru sharing her body.
    { cont: 2, image: 'asa2.jpg' },
    // Frantic, object in hand — guilt turned into a weapon.
    { cont: 3, image: 'asa.webp' },
    // Asa and Denji at school — orbiting Denji.
    { cont: 4, image: 'asaden.jpg' },
    // Composed, scarred smile — defying fate on her own terms.
    { cont: 5, image: 'asa2.webp' },
  ],
  denji: [
    // Chainsaw form — Pochita fused with his heart.
    { cont: 1, image: 'denji1.webp' },
    // "TADA!" with a flower — toast, small joys, grounded desires.
    { cont: 2, image: 'denji3.jpg' },
    // Warm domestic portrait — the surrogate family.
    { cont: 3, image: 'denji2.webp' },
    // Grass and cross — the burden of adulthood and freedom.
    { cont: 4, image: 'denji4.jpg' },
  ],
  makima: [
    // Elegant hand-framed portrait — the pristine facade.
    { cont: 1, image: 'makima.webp' },
    // Rats and shadow — primordial domination.
    { cont: 2, image: 'makima2.webp' },
    // Isolated red frame — the lonely tyrant.
    { cont: 3, image: 'makima3.jpg' },
    // Feeding Denji — control, hubris and erasure.
    { cont: 4, image: 'maki and denji.jpg' },
  ],
  power: [
    // Feral, bloodied grin — the Blood Fiend.
    { cont: 1, image: 'power.webp' },
    // Clawed, lettered cover — the sanguine arsenal.
    { cont: 2, image: 'power3.jpg' },
    // Meowy on her shoulder — compassion and the cat.
    { cont: 3, image: 'power1.webp' },
    // Goofy bedroom pose — chaotic siblinghood.
    { cont: 4, image: 'power2.webp' },
    // The embrace — defying domination in her final moments.
    { cont: 5, image: 'power and denji.jpg' },
  ],
  reze: [
    // Rain and a flower — the phone booth meeting.
    { cont: 1, image: 'reze2.jpg' },
    // Grenade pin and bomb silhouette — Soviet ordnance.
    { cont: 2, image: 'reze.webp' },
    // Cafe with Denji — the country mouse.
    { cont: 3, image: 'reze and denji.jpg' },
    // Flowers in hand — intercepted in the alleyway.
    { cont: 4, image: 'reze3.jpg' },
  ],
  himeno: [
    // Smoking, green-lit portrait — the melancholy veteran.
    { cont: 1, image: 'himeno.webp' },
    // Eyepatched, focused close-up — the Ghost Devil's arm.
    { cont: 2, image: 'himeno2.jpg' },
    // Warm, laughing doorway portrait — found kinship.
    { cont: 3, image: 'himeno3.jpg' },
    // Close with Denji — the special space in her heart.
    { cont: 4, image: 'himemo and denji.jpg' },
  ],
};

// Raw text is imported at build time straight from the existing source folders.
// This keeps a single source of truth and never mutates the original assets.
const rawContent = import.meta.glob('/source/*/cont*.txt', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function folderFor(character) {
  const prefix = `/source/${character.folder}/`.toLowerCase();
  const key = Object.keys(rawContent).find((path) => path.toLowerCase().startsWith(prefix));
  return key ? key.split('/')[2] : character.folder;
}

function urlForFilename(character, filename) {
  return character.imageUrls.find(
    (url) => decodeURIComponent(url.split('/').pop()) === filename,
  );
}

function parseCont(raw) {
  const lines = raw.replace(/\r\n/g, '\n').trim().split('\n');
  const title = (lines.shift() || '').trim();
  const description = lines.join(' ').replace(/\s+/g, ' ').trim();
  return { title, description };
}

function buildRunContent() {
  const content = {};

  characters.forEach((character) => {
    const folder = folderFor(character);
    const mapping = imageToCont[character.id] || [];

    const entries = mapping.map(({ cont, image }, index) => {
      const raw = rawContent[`/source/${folder}/cont${cont}.txt`];
      const parsed = parseCont(raw || '');
      const url = urlForFilename(character, image);

      return {
        index,
        image,
        url,
        title: parsed.title || `IMAGE ${String(index + 1).padStart(2, '0')}`,
        description: parsed.description || '',
        counter: String(index + 1).padStart(2, '0'),
      };
    });

    if (import.meta.env?.DEV) {
      const missing = mapping.filter((item) => !urlForFilename(character, item.image));
      const unused = character.images.filter(
        (image) => !mapping.some((item) => item.image === image),
      );
      if (missing.length) console.warn(`[RUN MODE] Missing images for ${character.name}:`, missing);
      if (unused.length) console.warn(`[RUN MODE] Unmapped images for ${character.name}:`, unused);
      entries.forEach((entry) => {
        if (!entry.description) console.warn(`[RUN MODE] Empty copy for ${character.name} — ${entry.image}`);
      });
    }

    content[character.id] = {
      ...character,
      entries,
      count: entries.length,
    };
  });

  return content;
}

export const runContentByCharacterId = buildRunContent();

export function getRunContent(characterId) {
  return runContentByCharacterId[characterId];
}

const prefetched = new Set();

export function prefetchCharacterImages(character) {
  if (!character || typeof window === 'undefined') return;
  character.imageUrls.forEach((url) => {
    if (prefetched.has(url)) return;
    prefetched.add(url);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
  });
}
