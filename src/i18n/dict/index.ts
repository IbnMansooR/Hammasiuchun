import { uz } from "./uz";
import { ru } from "./ru";
import type { Locale } from "../config";

export const DICTS: Record<Locale, typeof uz> = { uz, ru };
export type { Dict } from "./uz";
