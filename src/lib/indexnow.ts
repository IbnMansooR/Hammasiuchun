// IndexNow (Yandex, Bing, Naver, Seznam…): tell search engines right away which pages changed,
// instead of waiting for their crawler. The key is public by design; it is served at /<key>.txt.
import { SITE_URL } from "./site";

export const INDEXNOW_KEY = "ad7835fd67c4450efea77f89d5670112";
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";

export async function submitIndexNow(paths: string[]): Promise<{ sent: number; status: number }> {
  const host = new URL(SITE_URL).host;
  const urls = [...new Set(paths)].map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`)).slice(0, 10_000);
  // Never ping the real service from a local or preview build.
  if (urls.length === 0 || (!process.env.INDEXNOW_ENDPOINT && !/(^|\.)feekrfont\.uz$/.test(host))) return { sent: 0, status: 0 };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(10_000),
    });
    return { sent: res.ok ? urls.length : 0, status: res.status };
  } catch {
    return { sent: 0, status: 0 };
  }
}
