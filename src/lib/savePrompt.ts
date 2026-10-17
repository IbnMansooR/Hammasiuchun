// A tiny bus between the places where interest shows (♡, download) and the one
// component that may answer with a "save to an account" offer.
export const OFFER_EVENT = "feekr:offer-save";
export type OfferKind = "wish" | "download";

export function offerSave(kind: OfferKind, detail: { n?: number } = {}, delayMs = 0) {
  const fire = () => window.dispatchEvent(new CustomEvent(OFFER_EVENT, { detail: { kind, ...detail } }));
  if (delayMs) window.setTimeout(fire, delayMs); else fire();
}
