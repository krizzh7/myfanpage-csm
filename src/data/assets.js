const base = '/csm/cource/';

const assetUrl = (folder, filename) =>
  `${base}${[folder, filename].map((part) => encodeURIComponent(part)).join('/')}`;

export const series = {
  title: 'Chainsaw Man FanPage',
  folder: 'original background',
  image: assetUrl('original background', '993958580276623817.jpg'),
  biography: assetUrl('original background', 'main_bio.txt'),
  subtitle: 'Blood, contracts, and the heart of a devil.',
  quote: '“Everybody’s after my chainsaw heart! What about Denji’s heart?!”',
};

export const characters = [
  {
    id: 'aki', name: 'Aki Hayakawa', number: '01', folder: 'Aki Hayakawa',
    biography: 'aki_bio.txt', accent: '#91a2af', label: 'THE CONTRACTOR',
    images: ['Aki hayakawa.webp', 'aki.webp', 'aki2.webp', 'aki3.webp', 'aki and denji.jpg'],
  },
  {
    id: 'asa', name: 'Asa Mitaka', number: '02', folder: 'Asa Mitaka',
    biography: 'asa_bio.txt', accent: '#bd7a62', label: 'THE WAR HOST',
    images: ['asa.webp', 'asa2.webp', 'asa2.jpg', 'asa3.jpg', 'asaden.jpg'],
  },
  {
    id: 'denji', name: 'Denji', number: '03', folder: 'Denji',
    biography: 'denji_bio.txt', accent: '#e44832', label: 'THE CHAINSAW HYBRID',
    images: ['denji1.webp', 'denji2.webp', 'denji3.jpg', 'denji4.jpg'],
  },
  {
    id: 'makima', name: 'Makima', number: '04', folder: 'Makima',
    biography: 'makima_bio.txt', accent: '#c56555', label: 'THE CONTROL DEVIL',
    images: ['makima.webp', 'makima2.webp', 'makima3.jpg', 'maki and denji.jpg'],
  },
  {
    id: 'power', name: 'Power', number: '05', folder: 'Power',
    biography: 'power_bio.txt', accent: '#d5a15c', label: 'THE BLOOD FIEND',
    images: ['power.webp', 'power1.webp', 'power2.webp', 'power3.jpg', 'power and denji.jpg'],
  },
  {
    id: 'reze', name: 'Reze', number: '06', folder: 'Reze',
    biography: 'reze_bio.txt', accent: '#8d9c82', label: 'THE BOMB GIRL',
    images: ['reze.webp', 'reze2.jpg', 'reze3.jpg', 'reze and denji.jpg'],
  },
  {
    id: 'himeno', name: 'Himeno', number: '07', folder: 'Himeno',
    biography: 'himeno_bio.txt', accent: '#b8a384', label: 'THE GHOST HUNTER',
    images: ['himeno.webp', 'himeno2.jpg', 'himeno3.jpg', 'himemo and denji.jpg'],
  },
].map((character) => ({
  ...character,
  biographyUrl: assetUrl(character.folder, character.biography),
  imageUrls: character.images.map((image) => assetUrl(character.folder, image)),
}));

export const galleryImages = characters.flatMap((character, characterIndex) =>
  character.imageUrls.map((url, imageIndex) => ({
    url,
    characterIndex,
    imageIndex,
    characterId: character.id,
  })),
);

export function parseBiography(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    fields[key] = line.slice(separator + 1).trim().replace(/^['“”"]|['“”"]$/g, '');
  }
  return fields;
}
