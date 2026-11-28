// Uzbek and Russian swearing, so the bot does not set it in pictures. English is left alone on
// purpose: those words are used in real design work.
//
// Everything is brought to one plain Latin spelling first (Cyrillic letters, ʻ ʼ ' marks,
// look-alike digits, repeated letters, dots and stars inside a word), then compared with word
// beginnings (the Russian/Uzbek words take endings) or whole words (short ones that would
// otherwise sit inside ordinary words).

import { DICTIONARY } from "./profanityWords";

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "s", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h", ђ: "", і: "i", ї: "i", є: "e",
};
const LOOK: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", "$": "s", "€": "e" };

/** One plain spelling: lower case, Latin letters only, words separated by single spaces. */
export function skeleton(raw: string, hyphenIsSpace = false): string {
  let s = raw.toLowerCase();
  s = [...s].map((c) => CYR[c] ?? c).join(""); // before accents are stripped: й, ў, ё are letters of their own
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[ʻʼ'’‘`´]/g, ""); // o' g' oʻ gʻ → o g
  s = s.replace(hyphenIsSpace ? /([a-z])[.*_]+(?=[a-z])/g : /([a-z])[.*\-_]+(?=[a-z])/g, "$1"); // p.i.z.d.a
  s = [...s].map((c) => LOOK[c] ?? c).join("");
  s = s.replace(/(?<![sc])h/g, "x"); // huy / xuy are the same word (sh and ch stay)
  s = s.replace(/[^a-z\s]/g, " ");
  s = s.replace(/(.)\1+/g, "$1"); // pizzzda → pizda
  return s.replace(/\s+/g, " ").trim();
}

// Stems are written in the same plain spelling (h→x, doubled letters single).
// Long, unambiguous stems: any word that begins with one.
const LONG = [
  // Russian
  "pizd", "pzd", "pisd", "bliad", "bliat", "blyad", "blyat", "ebat", "yebat", "zaeb", "doeb", "mudak", "mudil", "pidor", "pidar", "pidr", "gandon", "gondon",
  "slyux", "shlyux", "sxlyux", "shluxa", "sxluxa", "govn", "zalup", "podonok", "ublyud", "ublyd", "pedik", "oxuen", "oxuit", "naxui", "naxuy", "poxui", "poxuy",
  // Uzbek
  "qotoq", "qutoq", "qotog", "qutog", "amqotoq", "amqutoq", "amjiq", "amcik", "amchik", "amcix", "amxor", "siktir", "sikay", "sikdi", "sikib",
  "sikish", "sikaman", "sikasan", "sikmoq", "dalbayob", "dalbayop", "dalbaeb", "dalbaib", "qaxba", "qaxpa", "foxisha", "orospu", "pezevenk",
  "xaromzoda",
];
// Short stems: the word itself, or with an ending of at most n letters.
const SHORT: [string, number][] = [["xuy", 4], ["xui", 4], ["xuev", 3], ["xuil", 3], ["jopa", 2], ["suka", 1], ["eban", 3], ["ebal", 2], ["ebis", 2], ["ebu", 1], ["ebi", 1], ["mraz", 2], ["dermo", 1], ["jalab", 2], ["jalap", 2], ["xaromi", 1]];
const WORDS = new Set(["sik", "sikt", "sikma", "qoto", "xuyam"]);

const DICT = new Set(DICTIONARY);
function badWord(w: string): boolean {
  if (WORDS.has(w) || DICT.has(w)) return true;
  // The dictionary word with an ending (axmoqlar, siktirlar): 5+ letter stems only.
  for (let k = w.length - 1; k >= Math.max(5, w.length - 3); k--) if (DICT.has(w.slice(0, k))) return true;
  if (LONG.some((s) => w.startsWith(s))) return true;
  return SHORT.some(([s, n]) => w.startsWith(s) && w.length - s.length <= n);
}

/** True when the text holds Uzbek or Russian swearing. */
export function hasProfanity(text: string): boolean {
  const sk = skeleton(text);
  if (!sk) return false;
  const words = sk.split(" ");
  if (words.some(badWord)) return true;
  // "axmoq-ku": the part before a hyphen is the word.
  if (/-/.test(text) && skeleton(text, true).split(" ").some(badWord)) return true;
  // Two-word swears ("am qutoq", "ona sikay") and swears typed with spaces between the letters.
  const joined = words.join("");
  if (/amqotoq|amqutoq|amjiq|amcik|amchik|dalbay|pizd|blyad|blyat|bliad|zaeb|siktir/.test(joined)) return true;
  for (let i = 0; i + 1 < words.length; i++) if (badWord(words[i] + words[i + 1])) return true;
  return false;
}
