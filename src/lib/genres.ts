// Curated genre / subgenre vocabulary used to turn noisy Last.fm community tags
// (which are full of junk like "seen live", "favorites", "american", "00s")
// into a clean, consistent genre label. A tag is only accepted if it matches
// one of these entries exactly after normalization — the display casing here is
// exactly what ends up shown in the stats. The metal/hardcore families are
// intentionally deep so subgenres like metalcore/deathcore survive instead of
// collapsing to "Rock"/"Metal".
const GENRES: string[] = [
  // Metal
  "Metal",
  "Heavy Metal",
  "Thrash Metal",
  "Death Metal",
  "Melodic Death Metal",
  "Technical Death Metal",
  "Brutal Death Metal",
  "Blackened Death Metal",
  "Black Metal",
  "Atmospheric Black Metal",
  "Doom Metal",
  "Power Metal",
  "Progressive Metal",
  "Nu Metal",
  "Groove Metal",
  "Sludge Metal",
  "Post-Metal",
  "Symphonic Metal",
  "Folk Metal",
  "Industrial Metal",
  "Gothic Metal",
  "Speed Metal",
  "Metalcore",
  "Melodic Metalcore",
  "Deathcore",
  "Symphonic Deathcore",
  "Mathcore",
  "Grindcore",
  "Deathgrind",
  "Djent",
  "Slam",
  // Hardcore / punk
  "Hardcore",
  "Hardcore Punk",
  "Post-Hardcore",
  "Beatdown",
  "Punk",
  "Punk Rock",
  "Pop Punk",
  "Skate Punk",
  "Emo",
  "Screamo",
  "Ska",
  // Rock
  "Rock",
  "Hard Rock",
  "Classic Rock",
  "Alternative Rock",
  "Indie Rock",
  "Progressive Rock",
  "Psychedelic Rock",
  "Post-Rock",
  "Garage Rock",
  "Grunge",
  "Shoegaze",
  "Math Rock",
  "Stoner Rock",
  // Alternative / indie
  "Alternative",
  "Indie",
  "Indie Pop",
  // Pop
  "Pop",
  "Synth-Pop",
  "Electropop",
  "Dance-Pop",
  "K-Pop",
  "Hyperpop",
  "Art Pop",
  // Electronic
  "Electronic",
  "EDM",
  "House",
  "Deep House",
  "Tech House",
  "Techno",
  "Trance",
  "Dubstep",
  "Drum & Bass",
  "Ambient",
  "IDM",
  "Synthwave",
  "Trap",
  "Future Bass",
  "Electro",
  "Downtempo",
  "Breakbeat",
  "Hardstyle",
  // Hip-hop
  "Hip-Hop",
  "Boom Bap",
  "Cloud Rap",
  "Drill",
  "Grime",
  "Lo-fi Hip-Hop",
  // R&B / soul / funk
  "R&B",
  "Soul",
  "Neo-Soul",
  "Funk",
  "Motown",
  // Jazz / blues
  "Jazz",
  "Blues",
  "Swing",
  // Folk / country
  "Folk",
  "Indie Folk",
  "Country",
  "Americana",
  "Bluegrass",
  "Singer-Songwriter",
  // Other
  "Classical",
  "Reggae",
  "Dancehall",
  "Latin",
  "Reggaeton",
  "Afrobeats",
  "Gospel",
  "Soundtrack",
  "Instrumental",
  "Acoustic",
];

// Broad umbrella genres. When a track's tags include both a broad genre and a
// more specific one within the top results, the specific one wins — that's what
// keeps "Deathcore" from being flattened to "Metal".
const BROAD_GENRES: string[] = [
  "Metal",
  "Rock",
  "Pop",
  "Hip-Hop",
  "Electronic",
  "Alternative",
  "Indie",
  "Punk",
  "Folk",
  "Jazz",
  "Classical",
  "Country",
  "R&B",
  "Reggae",
  "Blues",
  "Soul",
  "Funk",
  "Hardcore",
];

// Common Last.fm spellings that don't normalize to a canonical entry above.
const ALIASES: Record<string, string> = {
  rap: "Hip-Hop",
  "hip hop": "Hip-Hop",
  rnb: "R&B",
  "r and b": "R&B",
  dnb: "Drum & Bass",
  "drum n bass": "Drum & Bass",
  "drum and bass": "Drum & Bass",
  lofi: "Lo-fi Hip-Hop",
  "lo fi": "Lo-fi Hip-Hop",
  synthpop: "Synth-Pop",
  "melodic hardcore": "Post-Hardcore",
  "nu-metal": "Nu Metal",
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

const LOOKUP = new Map<string, string>();
for (const genre of GENRES) LOOKUP.set(normalize(genre), genre);
for (const [alias, canonical] of Object.entries(ALIASES)) {
  LOOKUP.set(normalize(alias), canonical);
}

const BROAD = new Set(BROAD_GENRES.map(normalize));

// Returns the canonical genre label for a single tag, or null if the tag isn't
// a recognized genre (the common case for junk tags).
export function matchGenreTag(tag: string | null | undefined): string | null {
  if (!tag) return null;
  return LOOKUP.get(normalize(tag)) ?? null;
}

const TOP_TAGS_CONSIDERED = 10;

// Picks the best genre from a popularity-ordered list of tag names: the first
// recognized *specific* genre within the top tags, else the most popular broad
// genre among them, else null. This mirrors how fans tag things — the specific
// subgenre is what we want, but a broad genre is a fine fallback.
export function pickGenre(
  tagNames: (string | null | undefined)[],
): string | null {
  let broadFallback: string | null = null;
  const limit = Math.min(tagNames.length, TOP_TAGS_CONSIDERED);
  for (let index = 0; index < limit; index++) {
    const matched = matchGenreTag(tagNames[index]);
    if (!matched) continue;
    if (BROAD.has(normalize(matched))) {
      broadFallback ??= matched;
      continue;
    }
    return matched;
  }
  return broadFallback;
}
