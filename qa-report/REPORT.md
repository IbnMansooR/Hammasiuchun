# Feekr (feekrfont.uz) — QA hisoboti / QA Report

**Sana / Date:** 2026-10-04 · **Muhit / Target:** production `https://feekrfont.uz` (Vercel) + repo `IbnMansooR/Hammasiuchun` @ `d437c54`
**Usul / Method:** kod tahlili + jonli HTTP tekshiruvlar + Playwright (Chromium) + Lighthouse 12 + fontTools glif tahlili.
**Dalillar / Evidence:** `qa-report/screenshots/`, `qa-report/evidence/`, `qa-report/glyph-matrix.md`, `qa-report/lighthouse/`

---

# 🇺🇿 O‘ZBEKCHA (qisqa)

> ## 🎨 3-bosqich (2026-10-04): to‘liq qayta dizayn
> - **Yangi dizayn tizimi:** sarlavhalar uchun logotipdagi serifga mos “Feekr Display”, interfeys uchun Inter. Monoxrom fon va bitta brend yashili, ikkalasi ham tokenlar orqali boshqariladi. **Tungi rejim** qo‘shildi: tizim sozlamasiga ergashadi va tugma bilan almashtiriladi.
> - **Logotip** SVG’ga o‘tkazildi, shuning uchun tungi rejimda ham tiniq ko‘rinadi. Favicon va OG rasmlari ham brendga moslandi.
> - **Funksiyalar:**
>   - har qanday sahifada ⌘K yoki “/” orqali tezkor qidiruv;
>   - bitta matnni yozsangiz, u barcha shriftlarda ko‘rinadi (bosh sahifa, katalog, sevimlilar);
>   - katalogda hajm slayderi va to‘r/ro‘yxat ko‘rinishi;
>   - shrift sahifasida sticky navigatsiya, belgilar xaritasi, matn namunalari va “uslubni sinashda ochish” tugmasi.
> - **O‘lchovlar:** Lighthouse mobilda 91–95, desktopda 98–100. Accessibility, Best Practices va SEO 100. axe 15 sahifa × 2 rejim × 2 o‘lchamda 0 xato. Batafsil 10-bo‘limda.

> ## 🔄 2-bosqich (2026-10-04): barcha shriftlar bepul + qolgan kamchiliklar tuzatildi
> - **Pullik toifa olib tashlandi.** Narx, savat, Payme/Click va xaridlar kutubxonasi yo‘q. Saytdagi har bir shrift bepul, butun oila bitta ZIP faylda yuklanadi (ichida `LITSENZIYA.txt` bor).
> - **Litsenziya filtri.** Faqat ochiq litsenziyali (OFL, Apache, Public Domain), Freeware (ogohlantirish bilan) yoki admin “Oʻz shriftimiz / Huquq tasdiqlangan” deb belgilagan oilalar saytda ko‘rinadi. Adobe, Monotype, Linotype, Bitstream, “All Rights Reserved” va Unknown oilalar yashirildi; ular bazada qoladi. ⚠️ 81 ta tasodifiy shriftdan faqat 4 tasi ochiq litsenziyali chiqdi, demak katalogning katta qismi yashirinadi. Sizniki yoki ruxsati bor oilalarni admin paneldan qaytaring (**Shriftlar → Yashirin**).
> - **Tuzatildi:** 34 tadan 27 tasi to‘liq tuzatildi, 4 tasi qisman, 3 tasi endi kerak emas (to‘lov tizimi olib tashlangan). Batafsil 9-bo‘limda.
> - **Sizdan kerak:** (1) deploy qilish, (2) yashirin shriftlarni ko‘rib chiqish, (3) `npm run meta:refresh` skriptini ishga tushirish, (4) xohlasangiz Resend sozlash (parolni tiklash uchun).

## 1. Xulosa

**Umumiy holat: 4 / 10.** Sayt ishlaydi, sahifalar ochiladi, katalog va tester ishlaydi, XSS yo‘q. Lekin **pullik shriftlarni bepul yuklab olish mumkin**, katalogda **tijoriy shriftlar litsenziyasiz tarqatilayotgan** bo‘lishi mumkin, saytning o‘z shrifti (Montserrat) **umuman yuklanmayapti**, qidiruv esa **katta-kichik harfga sezgir**.

| Daraja | Soni |
|---|---|
| 🔴 Critical | 2 |
| 🟠 High | 8 |
| 🟡 Medium | 15 |
| 🔵 Low | 9 |
| **Jami** | **34** |

> ⚠️ "High" ro‘yxatidagi 3 ta to‘lov/SMS xatosi (FKR-08, 09, 10) hozir **uxlab yotibdi**: Payme, Click, SMS va Google kirish productionda o‘chirilgan. Ularni yoqishdan **oldin** tuzatish shart.

## 2. Eng muhim muammolar (qisqa)

| ID | Daraja | Muammo | Nima qilish kerak |
|---|---|---|---|
| FKR-01 | 🔴 | `/api/webfont/...` pullik shriftning **to‘liq** faylini beradi. Himoya faqat `Sec-Fetch-Site` sarlavhasi (soxtalashtirish oson). Ustiga-ustak Vercel CDN uni 1 yilga keshlaydi va **hech qanday sarlavhasiz** hammaga beradi. Geometria Bold (pullik) → 820 glifli, o‘rnatsa bo‘ladigan shrift bo‘lib chiqdi. | Darhol: `Cache-Control: private`. Keyin: preview uchun **qisqartirilgan (subset)** shrift bering (faqat namuna belgilari, nomi o‘zgartirilgan, "Preview" belgili). |
| FKR-02 | 🔴 | Katalogda mashhur **tijoriy** shriftlar bor: Gilroy (18 uslub, "Bepul" ZIP), Geometria, Times New Roman, Adobe Clean, Garamond Premier Pro, Linotype Univers… Fayllarning o‘zida "All rights reserved" yozilgan. | Har bir oila uchun tarqatish huquqini tekshiring; hujjati yo‘qlarini darhol yashiring (`isPublished=false`). |
| FKR-03 | 🟠 | Saytning o‘z shrifti Montserrat har sahifada **404** (fayllar `.gitignore`da, GitHub’ga tushmagan). Butun sayt tizim shriftida ko‘rinadi. | Fayllarni repoga qo‘shish (OFL litsenziya, mumkin). **Tuzatildi.** |
| FKR-04 | 🟠 | Qidiruv katta-kichik harfga sezgir: "Mont" → 2, "mont" → 1, "MONT" → 0, "roboto" → 0. | `mode: "insensitive"`. **Tuzatildi.** |
| FKR-05 | 🟠 | O‘zbek belgilari: 81 ta tekshirilgan shriftdan faqat **6 tasida** `ʻ ʼ` (Oʻ, Gʻ) bor. "Kirill yozuvi" filtri **Қ Ғ Ҳ** yo‘qligini ko‘rsatmaydi (14 tadan 13 tasida yo‘q). | Kartochkaga "Oʻzbek lotin ✓ / Oʻzbek kirill ✓" belgisi; filtrni haqiqiy cmap bo‘yicha qilish. |
| FKR-06 | 🟠 | Next.js 15.5.20: `npm audit` = 1 critical, 6 high. | `npm audit fix` → Next 15.5.27, critical yo‘qoldi. **Tuzatildi.** Qolgan 4 high faqat build vaqtida ishlatiladi; ular Next 16 / Prisma 8 ga o‘tishni talab qiladi. |
| FKR-07 | 🟠 | Server sekin: TTFB 1–4,4 s (bosh sahifa ~4 s). Funksiya **iad1 (AQSH)**, baza **ap-south-1 (Mumbay)** — har so‘rov okean osha. | Vercel funksiya regionini `bom1` (Mumbay) qilish; bosh sahifadagi `ORDER BY RANDOM()` va ketma-ket so‘rovlarni kamaytirish. |
| FKR-08 | 🟠 | SMS kodni cheksiz taxmin qilish mumkin (urinishlar soni cheklanmagan) + SMS spam. | Urinishlar cheklovi. **Tuzatildi** (5 xato → kodlar bekor). |
| FKR-09 | 🟠 | Click: to‘lov **muvaffaqiyatsiz** bo‘lsa ham (`error<0`) shrift egaligi beriladi. | `error` maydonini tekshirish. **Tuzatildi.** |
| FKR-10 | 🟠 | Payme: `PAYME_TEST=1` va test kalit bo‘sh bo‘lsa, istalgan odam webhook’ni chaqirib, shriftni "sotib olingan" qila oladi. Ustiga-ustak login "Paycom" bo‘lishi kerak edi, kod esa merchant ID kutadi. Natijada **haqiqiy Payme to‘lovlari hech qachon tasdiqlanmasdi**. | Login "Paycom", bo‘sh kalitni rad etish, `timingSafeEqual`. **Tuzatildi.** |

To‘liq ro‘yxat (34 ta) inglizcha bo‘limda, 2-jadvalda.

## 3. Nimalar yaxshi ishladi ✅
- Barcha 26 sahifa ochiladi, ichki havolalar buzilmagan (100 ta havola tekshirildi).
- XSS yo‘q: qidiruv, tester va savatga `<script>` yuborildi, hammasi escape qilingan.
- Savatdagi narxni soxtalashtirib bo‘lmaydi: server narxni bazadan qayta oladi.
- Admin panel himoyalangan (middleware), login urinishlari cheklangan.
- Rasmiy yuklab olish endpointlari to‘g‘ri: pullik uslub uchun 403, demo uchun faqat Regular, bepul oila esa ZIP.
- Client JS’da maxfiy kalitlar yo‘q, source map’lar yopiq, katalog ro‘yxati (directory listing) yo‘q.
- Uslub nomlari (Light/Regular/Bold) fayldagi og‘irlik bilan mos (5 oila, 78 fayl tekshirildi).

## 4. Birinchi navbatda qilinadigan 10 ish
1. **FKR-01** Webfont’ni CDN’dan olib tashlash (`private`) ✅, keyin subset preview.
2. **FKR-02** Litsenziyasi noaniq tijoriy shriftlarni yashirish.
3. **FKR-03** Montserrat’ni qaytarish ✅.
4. **FKR-04** Qidiruvni tuzatish ✅.
5. **FKR-06** Next.js xavfsizlik yangilanishi ✅.
6. **FKR-07** Vercel regionini bazaga yaqinlashtirish (`bom1`).
7. **FKR-08/09/10** To‘lov va SMS xatolari ✅ (to‘lovlarni yoqishdan oldin qayta test qiling).
8. **FKR-05** Oʻzbek glif belgisi va to‘g‘ri kirill filtri.
9. **FKR-11** Kategoriyalarni tozalash (79% shrift "Display"da).
10. **FKR-13/14/15** robots.txt, sitemap.xml, OG rasm, xavfsizlik sarlavhalari ✅ (OG rasm qisman).

✅ = shu PR’da tuzatilgan (pastda "Fixed in this branch" bo‘limiga qarang).

---

# 🇬🇧 ENGLISH (full)

## 0. Scope, setup and assumptions

| Item | Result |
|---|---|
| Stack | Next.js 15.5.20 (App Router), React 19, TypeScript, Prisma 6 + Supabase Postgres, Supabase Storage, Vercel. No i18n (Uzbek only). |
| Routes | 26 public/admin pages + 9 API routes (see §2.1). |
| `npm ci` | OK; **7 vulnerabilities (1 critical, 6 high)**. |
| `tsc --noEmit` | ✅ 0 errors. |
| `npm run build` | ✅ builds. During "Generating static pages" Prisma tries to reach the DB (Footer settings on the prerendered 404 page) and logs connection errors when no DB is available. Harmless but noisy. |
| Dev/prod server locally | Not useful: the app needs the production Supabase DB and storage (no credentials in the repo, correctly). **Assumption:** the live site is the system under test. All browser tests ran against `https://feekrfont.uz`. |
| Browsers | **Chromium only.** Firefox and WebKit are not installed in this sandbox, and installing browsers is disallowed here. Cross-browser differences are therefore **not verified**. |
| Writes to production | **None.** I did not submit orders, register accounts, or send SMS. Form tests used validation paths that write nothing. |
| Font files | The webfonts served by the site were downloaded to measure glyph coverage, then **deleted**. No font binaries are committed. |
| Network | Tests ran through a US egress proxy, so the absolute timings are from a US vantage point. Users in Uzbekistan will see additional latency. Lighthouse flags "HTTP/2 not used" because of this proxy; it is an artifact, not a site issue. |

## 1. Summary

**Overall health: 4 / 10**

The storefront basics work. Pages render, catalog navigation and pagination work, the type tester works, there is no reflected XSS, and server-side price verification is solid. The score is low because of two Critical business and security problems (free extraction of paid fonts, questionable redistribution rights). In addition, the site's own brand font is broken on every page, search is case-sensitive, Uzbek-specific glyph support is not surfaced, and server response times are slow.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 8 |
| Medium | 15 |
| Low | 9 |
| **Total** | **34** |

Dormant issues (code paths currently disabled in production: Payme, Click, SMS, Google login are all **off**, confirmed from the `/cart` RSC payload `paymeEnabled:false, clickEnabled:false`, `/api/auth/google` → 404, login page shows email only): FKR-08, 09, 10, 22, 23. They must be fixed **before** those integrations are switched on.

## 2. Issues

### 2.1 Route inventory (production, Chromium, desktop 1280)

| Route | Status | Notes |
|---|---|---|
| `/` | 200 | TTFB ≈ 3.8–4.4 s |
| `/fonts`, `?filter=free`, `?cyr=1`, `?q=…`, `?page=2`, `?cat=…` | 200 | `?cat=xyz` and `?page=99999` are handled correctly (ignored / clamped) |
| `/fonts/[slug]` (gilroy, geometria, aileron, +60 linked) | 200 | |
| `/fonts/does-not-exist` | **200** ⚠️ | soft 404 (FKR-12) |
| `/pairs`, `/blog`, `/blog/[slug]` ×3, `/about`, `/license`, `/support`, `/cart`, `/wishlist`, `/login`, `/register` | 200 | |
| `/account` | 307 → `/login` | correct |
| `/admin`, `/admin/*` | 307 → `/admin/login` | correct (middleware) |
| `/this-page-does-not-exist`, `/blog/does-not-exist` | 404 | correct, branded 404 page |
| `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/manifest.json` | **404** ⚠️ | FKR-13, FKR-28 |
| `/fonts/montserrat/*.woff2` | **404** ⚠️ | FKR-03 |
| `/api/webfont/[slug]/[style]` | 403 without header; **200 with spoofed header or from CDN cache** ⚠️ | FKR-01 |
| `/api/download/[slug]/[style]` | 200 for free / demo-Regular, 403 for paid cuts | correct |
| `/api/download-family/[slug]` | 200 ZIP for free, 403 otherwise | correct |
| `/api/library/[slug]` | 401 without login | correct |
| `/api/payments/payme`, `/api/payments/click` | 405 on GET | POST-only, as expected |
| `/api/auth/google` | 404 | Google login disabled in production |
| `/.env`, `/.git/config`, `*.js.map` | 404 / 403 | not exposed ✅ |
| Internal + external links (100 unique) | 94 × 200, 1 × 302 (Instagram login wall), 5 transient proxy errors | **0 broken links** (the 5 re-checked → 200) |

### 2.2 Issues table

Legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · 💤 = dormant, the code path is disabled in production today · ✅ = fixed in this branch (§7)

| ID | Sev | Page / URL | Steps to reproduce | Expected | Actual | Evidence | Suggested fix |
|---|---|---|---|---|---|---|---|
| FKR-01 | 🔴 | `/api/webfont/{slug}/{style}` (`src/app/api/webfont/[slug]/[style]/route.ts`) | 1) `curl https://feekrfont.uz/api/download/geometria/Bold` → 403 (paid cut). 2) `curl -H "Sec-Fetch-Site: same-origin" https://feekrfont.uz/api/webfont/geometria/Bold -o x.woff2`. 3) Repeat step 2 **without** the header → still 200, `x-vercel-cache: HIT`. 4) Decompress the WOFF2 to TTF. | Paid cuts are not obtainable without paying. Previews are not usable as production fonts. | The route returns the **complete original font** converted to WOFF2 (Geometria Bold: 820 glyphs, full GPOS kerning, original name table, "All rights reserved"). The only gate is the client-controlled `Sec-Fetch-Site` header. Worse, the response has `Cache-Control: public, max-age=31536000, immutable` and no `Vary`, so **Vercel's CDN caches it and serves it to anyone with no header at all**. Simply opening a font page (which the crawler did) unlocks every cut of that family for a year. | `evidence/webfont-bypass.txt` | (a) Now: `Cache-Control: private, max-age=31536000, immutable` so the CDN never stores it ✅. A new deploy purges the existing Vercel cache. (b) Serve **subset preview fonts** for paid/demo families: only the glyphs needed for the specimen and tester (Basic Latin, Uzbek, Cyrillic), hinting stripped, family renamed "<Name> Feekr Preview", optionally with short-lived signed URLs. Never send the original binary to unauthenticated users. |
| FKR-02 | 🔴 | Catalog-wide, e.g. `/fonts/gilroy`, `/fonts/geometria`, `/fonts/times-new-roman`, `/fonts/adobe-clean`, `/fonts/garamond-premier-pro`, featured "LinotypeUnivers Extd" | Open `/fonts/gilroy`: the page itself says **"Litsenziya: All Rights Reserved"** while the buy box offers the whole 18-cut family as a free ZIP. Inspect the files' name tables. | Only fonts that Feekr has the right to redistribute or sell are listed. Free = genuinely open licence (OFL etc.). | Many well-known commercial families appear as **free** or **$1 demo**: Gilroy (Radomir Tinkov, commercial; only 2 weights are free), Geometria (Brownfox), Times New Roman (Monotype), Adobe Clean / Clean Serif / Clean UX (Adobe corporate fonts, not sold), Garamond Premier Pro (Adobe), Linotype Univers, Avenir Next Cyr, PF/ParaType families, TT Norms (TypeType). The fonts' own copyright fields say "All rights reserved". Conversely, open fonts such as Aileron (CC0) are sold as "demo $1". **Assumption:** I could not verify any licence agreement, so this is a legal-risk finding, not a legal conclusion. | `screenshots/route-fonts_gilroy.png`, `screenshots/vp-360-fonts_gilroy.png` | Audit every family's licence (`licenseClass`, `copyright`, `license` fields are already in the DB). Unpublish (`isPublished=false`) everything without a written redistribution/reseller agreement. Show the real licence name and link on each page. |
| FKR-03 | 🟠 | Every page | Load any page and watch the network tab. | Site UI renders in the brand font Montserrat ("Feekr"). | `/fonts/montserrat/{Light,Regular,Medium,SemiBold,Bold,ExtraBold,Black}.woff2` → **404** on every page (4–5 console errors per page). `document.fonts` shows `Feekr 400–800: error`. The whole UI falls back to the OS font (Segoe UI, Roboto, DejaVu…), so a type foundry's own site has no brand typography. Root cause: `/public/fonts/` is in `.gitignore`, so the files never reached GitHub, and Vercel builds from Git. | `screenshots/route-home.png` (fallback font), crawl log | Commit the OFL Montserrat files and un-ignore `public/fonts/montserrat` ✅. One variable WOFF2 per subset (latin, latin-ext, cyrillic, cyrillic-ext) with `unicode-range`, plus a preload of the Latin subset. |
| FKR-04 | 🟠 | `/fonts?q=…` (`src/app/(site)/fonts/page.tsx`) | Search "Mont", then "mont", then "MONT", then "roboto". | Case-insensitive results. | "Mont" → 2, "mont" → 1, "MONT" → 0, "roboto"/"Roboto" → 0. Prisma `contains` on Postgres is case-sensitive unless `mode: "insensitive"` is set. Most users type lowercase. | `screenshots/catalog-search-Mont.png`, `results` log | `name: { contains: q, mode: "insensitive" }` ✅ |
| FKR-05 | 🟠 | Catalog, font cards, tester, "Kirill yozuvi" filter | Type "Oʻzbekiston, gʻoya, maʼno" (U+02BB/U+02BC) or "Қ Ғ Ҳ" into the tester of Gilroy, Geometria, TT Norms or Bebas Neue Pro. | The site tells Uzbek users whether a font supports their alphabet, and the "Cyrillic" filter means usable Cyrillic. | 75 / 81 sampled fonts lack `ʻ ʼ`, so those characters render in a fallback font inside the specimen. 13 / 14 Cyrillic-flagged fonts lack Ққ Ғғ Ҳҳ, and 3 also lack Ўў. Times New Roman and Adobe Clean Serif have full Cyrillic but are *not* flagged. No Uzbek support indicator exists anywhere. | §3 matrix, `screenshots/glyphs-*.png` | Compute flags from the cmap at ingest/upload time: `hasUzLatin` (U+02BB, U+02BC or at least U+2018/2019), `hasUzCyrillic` (Ўў Ққ Ғғ Ҳҳ), `hasCyrillic` (А–я Ёё). Show badges on cards. Add an "Oʻzbekcha" filter. Default the tester to an Uzbek sample. |
| FKR-06 | 🟠 | Dependencies | `npm audit` | No known critical vulnerabilities. | `next@15.5.20` matches advisories rated critical/high (Server Actions DoS, cache confusion of response bodies, unauthenticated disclosure of Server Function endpoints, image-optimizer issues). Also `postcss`, `sharp`, `nanoid`, `deepmerge-ts`. 7 total (1 critical, 6 high). | `npm audit` output | `npm audit fix` → Next **15.5.27**, critical cleared ✅. Remaining 4 high + 1 moderate are build-time only (`postcss` bundled in Next, `deepmerge-ts` in the Prisma CLI) and need Next 16 / Prisma 8 majors. Plan that upgrade separately. |
| FKR-07 | 🟠 | All SSR pages | Measure TTFB: static asset vs DB-backed route. | TTFB < 0.8 s. | Static `/assets/favicon.png` 0.13–0.34 s, but `/api/download/x/y` (1 DB query) 1.1–2.2 s, `/fonts` 1.1 s, `/` **3.8–4.4 s**. `x-vercel-id: iad1::iad1` (functions in Washington DC) while `.env.example` points the DB at `aws-0-ap-south-1` (Mumbai): every Prisma query crosses an ocean. The home page is `force-dynamic` with `ORDER BY RANDOM()` plus 5 queries, two of them sequential after the first batch. Lighthouse: "Document request latency, est. savings 3.5 s". | Lighthouse §4, curl timings | Set the Vercel function region to `bom1` (Mumbai: same region as the DB and much closer to Tashkent) in Project Settings → Functions, or `vercel.json` `"regions": ["bom1"]`. Make `/` ISR (`revalidate = 300`) and pick the random showcase client-side or from a cached list. Consider `unstable_cache` for category counts and settings. |
| FKR-08 | 🟠💤 | Phone login (`src/app/(site)/account/actions.ts`) | Call `verifyPhoneOtpAction(phone, guess)` repeatedly. | Limited attempts per code/phone. | No attempt counter: a 6-digit code valid for 5 min can be brute-forced with parallel server-action calls, giving account takeover of phone-based accounts. The resend cooldown is per phone only, so an attacker can trigger SMS to unlimited numbers (SMS-pumping cost). SMS is currently disabled in production. | code review | After 5 wrong codes, invalidate all outstanding codes for that phone ✅ (reuses `LoginAttempt`, no schema change). Add per-IP rate limiting for `sendPhoneOtpAction` before enabling SMS. |
| FKR-09 | 🟠💤 | Click webhook (`src/app/api/payments/click/route.ts`) | Click sends `action=1` (Complete) with `error=-5017` (insufficient funds / payment failed). | The transaction is cancelled and no ownership is granted. | The `error` field is ignored, so the order is marked confirmed and `grantOrderPurchases` runs. **Failed payments unlock the fonts.** Click is currently disabled in production. | code review vs Click Merchant API spec | If `error < 0` on Complete, mark the transaction `cancelled` and reply `-9` ✅. |
| FKR-10 | 🟠💤 | Payme webhook (`src/lib/payme.ts`) | With `PAYME_TEST=1` (the default in `.env.example`) and an empty or unset `PAYME_TEST_KEY`, send `Authorization: Basic base64("<merchant_id>:")` (or without the colon). The merchant id is public: it is base64'd in every checkout URL. | Rejected. | `key === expectedKey` evaluates `"" === ""` or `undefined === undefined` → authenticated. The attacker can then call `CreateTransaction` + `PerformTransaction` → ownership granted for free. **Also:** Payme's real credentials are `Paycom:<key>` (the login is the literal "Paycom"), but the code expects the merchant id as the login, so **every genuine Payme callback would be rejected** and paid orders would never complete. String comparison is not constant-time. Verified with a 9-case harness against the old and new code. | code review + unit harness | Login must equal "Paycom"; reject when the expected key is empty; compare with `crypto.timingSafeEqual` ✅. |
| FKR-11 | 🟡 | `/fonts?cat=*`, home category tiles | Open `/fonts?cat=Sans`; search for Gilroy, Geometria, Aileron. | Geometric sans families are in Sans-serif. | 1,865 / 2,346 families (79.5 %) are "Display" (the Prisma default `category @default("Display")`). Sans-serif has only 192. Gilroy, Geometria and Aileron are all "Display", so the category filter is almost useless. | category counts in §2.1 data, `screenshots/route-fonts_gilroy.png` | Re-classify (use OS/2 `sFamilyClass` / PANOSE plus manual review). Change the ingest default to "Unclassified" and hide it from tiles. |
| FKR-12 | 🟡 | `/fonts/{unknown}`, every font detail page | (a) `curl -I /fonts/does-not-exist`. (b) Disable JS and open `/fonts/gilroy`. (c) Click any font card on a slow connection. | (a) 404. (b) Content visible. (c) Detail-page skeleton or none. | (a) **200** with a `noindex` meta (soft 404). (b) Only grey skeleton boxes, no content, forever. (c) The *catalog* grid skeleton flashes for 1–3 s. Cause: `src/app/(site)/fonts/loading.tsx` wraps `[slug]` in a Suspense boundary, so the status is committed before `notFound()` runs and content streams in a hidden div that needs JS. | `screenshots/nojs-fonts_gilroy.png`, `screenshots/slow4g-1000ms.png` | Scope the skeleton to the catalog only: move `fonts/page.tsx` + `loading.tsx` into a route group `fonts/(catalog)/` ✅. |
| FKR-13 | 🟡 | `/robots.txt`, `/sitemap.xml` | Request both. | Valid robots.txt with a Sitemap line; sitemap with ~2,350 font URLs plus blog. | Both 404. Lighthouse SEO: "robots.txt is not valid" (it parses the HTML 404 page). | Lighthouse `home-mobile` | `src/app/robots.ts` + `src/app/sitemap.ts` (published families + articles + static pages) ✅. |
| FKR-14 | 🟡 | All pages `<head>` | View source; share a link in Telegram. | `canonical`, `og:url`, `og:image` (1200×630), absolute URLs on the real domain. | No canonical, no `og:image`, no `og:url` on any page. `twitter:card=summary_large_image` with no image, so link previews have no picture. `metadataBase` falls back to `https://feekr.uz`, **a different live site** (a QR-feedback product), if `NEXT_PUBLIC_SITE_URL` is unset. | crawl log | Default `SITE_URL` to `https://feekrfont.uz`; per-page canonical on font and blog pages; default OG image ✅ (logo-based placeholder; replace with a designed 1200×630 card). Per-font OG images via `opengraph-image.tsx` rendering the font name in the font. |
| FKR-15 | 🟡 | All responses | `curl -I https://feekrfont.uz/` | CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. | Only HSTS is set. No clickjacking protection on `/login`, `/cart`, `/admin/login`. `X-Powered-By: Next.js` is exposed. | header dump in §2.1 | Add headers in `next.config.mjs`, disable `poweredByHeader` ✅. CSP needs a nonce setup for Next inline scripts, so it is left as a follow-up. |
| FKR-16 | 🟡 | `/login` | Look for "Forgot password". | Password-reset flow. | None. A user who forgets the password loses access to "Mening xaridlarim", contradicting the "re-download forever" promise. | `screenshots/login.png` | Email reset link (signed, 30-min token) or allow linking a phone number. |
| FKR-17 | 🟡 | Header on ≤ 390 px | Open any page at 360 or 390 px. | Logo visible and tappable. | Logo `<img>` collapses to **0 px** (360) / 14 px (390): the `.logo` flex item shrinks and global `img{max-width:100%}` follows it. Brand missing on most phones; on desktop the "Menyu" (hamburger) button is visible too, because `.hdr .iconbtn` overrides `.menu-toggle{display:none}`. | `screenshots/vp-360-*.png`, `vp-390-home.png`, `login-error.png` (desktop hamburger) | `.hdr .logo{flex-shrink:0}`, `.hdr .logo img{max-width:none}`, `.hdr .menu-toggle{display:none}` ✅ |
| FKR-18 | 🟡 | Type tester (`src/components/Tester.tsx`) | Drag "Hajm" to 320 px on a 1280 px screen; look for reset / alignment / colour; open on 360 px. | Slider value = rendered size; basic tester controls. | Rendered size is `min(size, 13vw)`, so on desktop everything above **166 px does nothing** (320 → 166.4 px). On a 360 px phone, anything above 47 px does nothing while the label still says "140px". No reset, alignment, colour, line-height or letter-spacing controls. The default text is just the family name; there are no Uzbek/Russian sample presets. Long text scrolls inside a fixed-height textarea. Emoji, RTL (Arabic/Hebrew) and special characters render via fallback without breaking layout (OK). | `screenshots/tester-*.png` | Show the effective size in the label or clamp the slider's `max` to the viewport. Add Reset, alignment, presets ("Oʻzbekcha", "Русский", "Pangram", "ABC…"). Auto-grow the textarea. |
| FKR-19 | 🟡 | `/login`, `/register`, admin login, phone form, home, tester, footer | axe-core + keyboard pass. | WCAG 2.1 AA. | **critical** `label`: email/password inputs have `<label>` elements not associated with them (no `htmlFor`/nesting), on login, register, phone and admin. No `<h1>` on login/register/admin login. **serious** contrast 4.31 : 1 (`.showcase-meta .sub`, tester "Hajm" label: #71717a on #f2f2f0). `heading-order` (footer `h4` after `h2`; blog cards `h3`). No skip-link. The "Tez kunda" modal (paid fonts) has no Esc-to-close, no initial focus, and doesn't return focus. Visible focus ring ✅. The tester is fully keyboard-operable ✅. | `screenshots/a11y-focus-visible.png`, axe log | `htmlFor`/`id`, `<h1>`, `autoComplete` on auth forms ✅. Darker muted colour on soft backgrounds ✅. Modal Esc + focus ✅. Skip link + heading fixes: follow-up. |
| FKR-20 | 🟡 | `/login`, `/register` | Open the login page; submit. | Consistent form styling; correct button feedback; accurate copy. | The email input is unstyled (CSS covers `text/number/password` but not `email`/`tel`). The pending button says "Saqlanmoqda…" ("Saving…") on *login*. The register page says "you can also sign in with Google or phone number", but both are disabled in production. | `screenshots/login-error.png`, `route-register.png` | Add `input[type=email]`/`[type=tel]` to `.field` CSS; pass `pendingLabel` "Kirilmoqda…" / "Yuborilmoqda…"; render the Google/phone hint only when enabled ✅. |
| FKR-21 | 🟡 | Buy box (`src/components/BuyBox.tsx`), `/about`, `/license` | Open a free and a demo font; download the demo. | Accurate licence claims. | Every font (free, demo, paid) lists "✓ Desktop litsenziya ✓ Web (WOFF2) litsenziya ✓ Umrbod foydalanish", but downloads contain only TTF/OTF, never WOFF2. The "demo" download is the **full original Regular file** (Geometria-Regular-DEMO.otf, 167 KB, all glyphs, original names). Only the file name says DEMO. | `results` (`demoDownload`) | Per-tier perk lists; ship WOFF2 in paid ZIPs or drop the claim; make demo files real demos (subset + renamed + "Demo" in the name table). |
| FKR-22 | 🟡💤 | Payme webhook | Payme sandbox test suite. | Spec-compliant state machine. | No 12-hour timeout check in `PerformTransaction` (spec: -31008). `CancelTransaction` of a performed transaction (refund) leaves the Purchase in place. The expected amount is recomputed with the *current* USD→UZS rate, so if the admin changes the rate between checkout and payment, the payment fails "Invalid amount". `CheckPerformTransaction` doesn't reject already-paid orders. | code review | Store `amountTiyin` on the Order at checkout. Enforce the timeout. Revoke purchases on refund. Run the official Payme sandbox tests before go-live. |
| FKR-23 | 🟡💤 | Google OAuth callback | Sign in with a Google account whose email is not verified but equals an existing user's email. | Not linked. | Linked by email without checking `email_verified` → potential account takeover. Google login is currently disabled. | code review | Link by email only when `email_verified === true` ✅. |
| FKR-24 | 🟡 | Site copy | Read the main pages as an Uzbek speaker. | Natural spoken Uzbek, consistent orthography, Uzbek specimens. | Specimens are English ("The quick brown fox…") for an Uzbek audience. Apostrophes are mixed: `Ko'rish` (ASCII '), `Oʻzbekiston` (ʻ), `so‘rovni` (‘) in the same UI. Stiff/literal phrases (see §8). "Savat" vs "Savatcha" are used interchangeably. | text dump | Pick one orthography (recommended: ʻ U+02BB and ʼ U+02BC). Add Uzbek pangram defaults. Copy edits in §8. |
| FKR-25 | 🟡 | `/fonts` toolbar (`CatalogToolbar.tsx`) | Type "abc" in search, wait, clear the box, then within ~1 s click a category chip (slow network). | Category filter without the old query. | The URL becomes `?q=abc&cat=Serif`: the chip's `push()` reads the stale `useSearchParams()` before the debounced "clear q" navigation commits, so the cleared query comes back. Reproduced in the automated run (`filterSortUrl = /fonts?q=zzqqxx&cat=Serif&sort=az`). | `results` (`filterSortUrl`) | Merge from the live input state (`q`) when pushing filter changes, or flush the pending debounce before pushing. Wrap pushes in `startTransition` and show a pending state. |
| FKR-26 | 🔵 | Header logo | Inspect `/assets/logo-horizontal.png`. | Small, sized image. | 3877 × 1001 px PNG (54 KB) rendered at 26 px tall, preloaded on every page via a `Link` header. No `width`/`height` attributes (Lighthouse `unsized-images`, `image-aspect-ratio`, est. 53 KB savings). | Lighthouse | Export a ~200 px wide WebP/SVG logo; add `width`/`height` ✅ (attributes). |
| FKR-27 | 🔵 | `/register` (intermittent) | Observed once in ~12 loads during the a11y run. | Branded error page. | Next.js fatal error document (`#__next_error__`, no `<title>`, no `lang`). The app has no `global-error.tsx`, so a failure in the root/site layout shows a blank error page. Not reproducible afterwards. | axe log | Add `src/app/global-error.tsx` ✅. Check Vercel function logs around 2026-10-04 09:17 UTC. |
| FKR-28 | 🔵 | `/favicon.ico`, `/wishlist`, 404 pages | Request `/favicon.ico`; check titles. | 200; page-specific titles. | `/favicon.ico` 404 (browsers and bots request it regardless of `<link rel=icon>`). `/wishlist` and 404 pages use the default site title. | crawl | Rewrite `/favicon.ico` → `/assets/favicon.png` ✅. Add metadata to wishlist and not-found. |
| FKR-29 | 🔵 | Font files (downloads) | Inspect OS/2 of Aileron, Gilroy, Creato Display, Fonseca. | Weight classes match names. | Thin cuts carry `usWeightClass` 250/265 (a GDI workaround). Aileron Thin and ExtraLight are *both* 250, so they collide in Office/Windows menus. Fonseca "Oblique" cuts lack the italic `fsSelection` bit. The site's own labels and CSS weights are correct. | §3 weights table (78 cuts) | Document it on the font page or fix the files at ingest (fontTools). |
| FKR-30 | 🔵 | Home / catalog | Read names and counts. | Clean names, consistent numbers. | "LinotypeUnivers Extd", "LingwoodEF", "ZineSerifDis" (missing spaces from PostScript names). "2 346+" on the hero vs "2000+" in footer/meta. | `screenshots/route-home.png` | Use the name table's typographic family (ID 16) at ingest. Derive counts from one source. |
| FKR-31 | 🔵 | Global CSS | Emulate dark mode, reduced motion, print. | Respect user preferences; printable specimens. | No dark theme (fine, but `color-scheme` is not declared). 61 elements keep transitions under `prefers-reduced-motion: reduce`. Print prints the sticky header, nav and footer; no print stylesheet. | `screenshots/dark-mode-home.png`, `print-home.png`, `print-font-detail.pdf` | `@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}` ✅. A small `@media print` block hiding header/footer/buttons ✅. |
| FKR-32 | 🔵 | `/login`, `/register`, `/cart` guest order | Code review. | Rate limits. | No throttling on user login (credential stuffing), registration (`?error=exists` also enables email enumeration), or guest "Murojaat qoldirish" orders (admin spam). Admin login *is* throttled (good). | code review | Reuse the `LoginAttempt` table for user login/register; add a per-IP cap on guest orders. |
| FKR-33 | 🔵 | Cart / wishlist | Edit `localStorage.feekr_cart` price to 0. | UI shows the server price. | The cart shows "Jami: Bepul" from the tampered local value. The server re-verifies, so no financial impact, but stale prices show if the admin edits a price. The cart and wishlist are not tied to the account. | `results` (`tamperedTotal`) | Re-fetch prices for cart slugs on the cart page. Persist the wishlist per user. |
| FKR-34 | 🔵 | Build | `npm run build` without DB access. | Clean build log. | Prerendering `/_not-found` runs `getSiteSettings()` (Footer), so Prisma logs connection errors during build. Harmless (caught), but it hides real errors in CI logs. | `build.log` | Mark the not-found page dynamic or skip DB reads at build time. |

## 3. Font glyph coverage matrix

Method: I downloaded the preview cut (the same WOFF2 the browser loads) for **81 fonts**: catalog page 1 + "Kirill yozuvi" page 1 + Serif page 1 + Script page 1. I read each font's `cmap` with fontTools. ✅ = all present, ⚠️ = partial (missing characters listed), ❌ = none present.

Character sets: **UZ ʻ ʼ** = U+02BB/U+02BC (official Uzbek Latin oʻ, gʻ, tutuq belgisi). **‘ ’ '** = the substitutes most people actually type. **Ў Қ Ғ Ҳ** = Ўў Ққ Ғғ Ҳҳ. **Punct.** = `.,;:!?"'«»„“”‘’–—…()[]/@#&*%-`. Uzbek "so‘m" has no currency sign, so it is covered by the apostrophe columns plus `сўм` in the Cyrillic columns.

**Totals (81 fonts):**

| Set | Full coverage |
|---|---|
| Basic Latin | 81 / 81 |
| **Uzbek Latin ʻ ʼ (U+02BB/02BC)** | **6 / 81** |
| ‘ ’ ' substitutes | 79 / 81 |
| Cyrillic (RU) | 26 / 81 |
| **Uzbek Cyrillic Ў Қ Ғ Ҳ** | **12 / 81** |
| Digits | 81 / 81 |
| Punctuation | 74 / 81 |
| Currency $ € ₽ £ ¥ | 18 / 81 |
| Latin-1 diacritics | 73 / 81 |
| Latin Ext-A (ş ğ ı İ ā) | 35 / 81 |

Key observations:
- Only Adobe Clean, Adobe Clean Serif, Adobe Clean UX, Meta Pro, Montserrat and Montserrat Alternates contain `ʻ ʼ`. In every other font, "Oʻzbekiston" typed with the correct character renders that glyph in a **fallback system font** inside the tester. See `screenshots/glyphs-*.png`.
- The "Kirill yozuvi" (Cyrillic) filter returned 14 sampled fonts. **13 of them lack Ққ Ғғ Ҳҳ**, and 3 also lack Ўў (Bebas Neue Pro, Muller, Uni Sans). Uzbek Cyrillic text cannot be set in them.
- The flag is also wrong the other way: Times New Roman and Adobe Clean Serif have full Cyrillic but are **not** flagged `hasCyrillic`.
- Weight mapping (5 families, 78 cuts): the labels shown on the site match the files. File-level oddities are listed in FKR-29.

<details><summary>Full per-font matrix (81 rows)</summary>

| Font / Style | Latin | UZ ʻ ʼ | ‘ ’ ' | Кирилл (RU) | Ў Қ Ғ Ҳ | 0–9 | Punct. | $ € ₽ £ ¥ | Latin-1 é ü | Ext-A ş ğ | Glyphs | Kern | WOFF2 KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8ballscriptscapsssk/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ `„` | ⚠️ `€₽` | ✅ | ❌ | 216 | ✓ | 22 |
| abrazo-script-ssi/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 225 | ✓ | 29 |
| abrazoscriptssk/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 232 | ✓ | 27 |
| adobe-clean-serif/Regular | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1859 | ✓ | 125 |
| adobe-clean-ux/Regular | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1453 | ✓ | 112 |
| adobe-clean/Regular | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1899 | ✓ | 125 |
| adobe-garamond-pro/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 806 | ✓ | 65 |
| agfa-wile-roman-std/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 254 | ✓ | 18 |
| aileron/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 338 | ✓ | 18 |
| apex-new/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1089 | ✓ | 47 |
| apple-garamond-bt/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 258 | — | 29 |
| ashety/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 235 | ✓ | 12 |
| avenir-next-cyr/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 730 | ✓ | 37 |
| ballantinesscriptef/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 245 | — | 26 |
| baskerville-handcut/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 232 | ✓ | 26 |
| bauerbodonief/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 245 | ✓ | 19 |
| bebas-neue-pro/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 576 | ✓ | 44 |
| bodoni-be-condensed/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 19 |
| bodoni-be/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 18 |
| bodoni-mt-std/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 253 | ✓ | 18 |
| bodoni-mt/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 252 | ✓ | 38 |
| bodoni-old-face-be/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 21 |
| bodoni/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 15 |
| caflisch-script-pro/Italic | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1306 | ✓ | 139 |
| cascadeur/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 758 | ✓ | 33 |
| conduititcstd/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 334 | ✓ | 23 |
| creato-display/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 245 | ✓ | 18 |
| fonseca/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 345 | ✓ | 21 |
| garamond-be/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 21 |
| garamond-premier-pro/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 2373 | ✓ | 170 |
| geometria/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ✅ | ✅ | ✅ | 820 | ✓ | 54 |
| gilroy/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ✅ | ✅ | ✅ | 558 | ✓ | 25 |
| grunionscript/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 227 | ✓ | 14 |
| handscript/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 24 |
| handscriptlefty/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 26 |
| handscriptupright/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 26 |
| humana-serif-itc-std/Light | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 253 | ✓ | 24 |
| itc-garamond-std/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 253 | ✓ | 26 |
| itc-mendoza-roman-std/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 332 | ✓ | 40 |
| jost/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ `„` | ⚠️ `₽` | ✅ | ✅ | 383 | ✓ | 25 |
| komika-hand/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ `“”-` | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 214 | ✓ | 22 |
| legacy-serif-itc-std/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 413 | ✓ | 42 |
| linotype-didot/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 15 |
| mediaserifef/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 245 | ✓ | 19 |
| meta-pro/Regular | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1181 | ✓ | 67 |
| mluvka/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 954 | ✓ | 41 |
| montserrat-alternates/Regular | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1482 | ✓ | 80 |
| montserrat/Regular | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1946 | ✓ | 98 |
| muller/Regular | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 542 | ✓ | 35 |
| notehand/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 231 | ✓ | 26 |
| notehandlefty/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 230 | ✓ | 25 |
| pf-beausans-pro/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1191 | ✓ | 82 |
| pf-centro-slab-pro/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1522 | ✓ | 90 |
| pf-dintext-pro/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1466 | ✓ | 79 |
| poppins/Regular | ✅ | ⚠️ `ʻ` | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 1060 | — | 56 |
| rifrafscriptssk/Regular | ✅ | ❌ | ⚠️ `‘’` | ❌ | ❌ | ✅ | ⚠️ `«»„“”‘… (8)` | ⚠️ `€₽£¥` | ⚠️ `ÀÁÂÇÈÉ… (41)` | ❌ | 111 | ✓ | 14 |
| sf-burlington-script-sc/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ `–—` | ⚠️ `€₽£` | ⚠️ `Ççß` | ⚠️ `ŞşĞğıĀ… (7)` | 191 | — | 17 |
| sf-burlington-script/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ `–—` | ⚠️ `€₽£` | ⚠️ `Ççß` | ⚠️ `ŞşĞğıĀ… (7)` | 191 | — | 15 |
| sf-cartoonist-hand-sc/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽£` | ⚠️ `Çç` | ⚠️ `ŞşĞğİĀ… (7)` | 205 | ✓ | 18 |
| sf-cartoonist-hand/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽£` | ⚠️ `Çç` | ⚠️ `ŞşĞğİĀ… (7)` | 205 | ✓ | 21 |
| sf-compact-text/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 2307 | ✓ | 104 |
| sf-foxboro-script-extended/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ⚠️ `ß` | ⚠️ `ŞşĞğİĀ… (7)` | 198 | — | 18 |
| sf-foxboro-script/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ⚠️ `ß` | ⚠️ `ŞşĞğİĀ… (7)` | 198 | — | 18 |
| sf-pro-display/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 2324 | ✓ | 98 |
| sf-pro-text/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 2439 | ✓ | 103 |
| times-new-roman/Regular | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 1320 | ✓ | 159 |
| times-nr-mt-std/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 403 | ✓ | 30 |
| times/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 229 | ✓ | 16 |
| tt-commons/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1226 | ✓ | 59 |
| tt-corals-trial/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ✅ | ✅ | ✅ | 493 | ✓ | 22 |
| tt-interfaces/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 937 | ✓ | 63 |
| tt-norms/Regular | ✅ | ⚠️ `ʻ` | ✅ | ✅ | ⚠️ `ҚқҒғҲҳ` | ✅ | ✅ | ✅ | ✅ | ✅ | 533 | ✓ | 42 |
| uni-sans/Regular | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 444 | ✓ | 38 |
| vtc-joelenehand/Regular | ✅ | ❌ | ⚠️ `‘’` | ❌ | ❌ | ✅ | ⚠️ `«»„“”‘… (10)` | ⚠️ `€₽£¥` | ❌ | ❌ | 98 | — | 19 |
| zapf-calligraphic-801-swa/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `Āā` | 260 | ✓ | 31 |
| zapf-calligraphic-801/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 230 | ✓ | 19 |
| zapfcalligr-bt/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `€₽` | ✅ | ⚠️ `Āā` | 260 | ✓ | 29 |
| zineserifdis-tf/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 232 | ✓ | 14 |
| zineserifdis/Regular | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ⚠️ `ŞşĞğİĀ… (7)` | 232 | ✓ | 14 |
| zona-pro/Regular | ✅ | ❌ | ✅ | ✅ | ⚠️ `Ҳҳ` | ✅ | ✅ | ✅ | ✅ | ✅ | 698 | ✓ | 32 |
| zuume/Regular | ✅ | ⚠️ `ʻ` | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ `₽` | ✅ | ✅ | 602 | ✓ | 21 |


</details>

## 4. Lighthouse

Lighthouse 12, Chromium, default mobile emulation (simulated Slow 4G, 4× CPU) and the `desktop` preset. Full HTML reports are in `qa-report/lighthouse/`.

| Page | Device | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | Speed Index | TTFB (root doc) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | mobile | 74 | 93 | 93 | 92 | 1.0 s | 0.04 | 800 ms | 1.0 s | 6.6 s | 3,820 ms |
| `/` | desktop | 94 | 93 | 96 | 100 | 0.5 s | 0.017 | 0 ms | 0.3 s | 2.5 s | 3,590 ms |
| `/fonts` | mobile | 91 | 98 | 93 | 100 | 2.5 s | 0 | 240 ms | 1.0 s | 4.0 s | 990 ms |
| `/fonts` | desktop | 96 | 98 | 96 | 100 | 0.8 s | 0 | 0 ms | 0.5 s | 2.0 s | 2,110 ms |
| `/fonts/gilroy` | mobile | 90 | 94 | 93 | 100 | 2.7 s | 0 | 260 ms | 1.0 s | 3.4 s | 990 ms |
| `/fonts/gilroy` | desktop | 97 | 94 | 96 | 100 | 0.8 s | 0.001 | 0 ms | 0.4 s | 1.5 s | 1,000 ms |

**INP:** Lighthouse navigation runs cannot measure INP (it needs real user interaction). TBT is the lab proxy. Mobile home TBT is **800 ms**, which predicts a poor INP on low-end Android. No CrUX field data exists for this origin yet.

Main Lighthouse findings:
- **Server response (TTFB) 1.0–3.8 s** is the dominant cost: "Document request latency, est. savings 3,500 ms" on the home page. See FKR-07.
- The mobile home page has the worst score (74). TBT is 800 ms because `force-dynamic` re-renders everything and ships inline `@font-face` CSS plus the hydration of 10+ font cards. Speed Index is 6.6 s.
- `robots-txt`: "robots.txt is not valid", because `/robots.txt` returns the HTML 404 page (FKR-13). This is the only SEO failure.
- `color-contrast`: `.showcase-meta .sub` uses #71717a on #f2f2f0, a ratio of **4.31 : 1**, below the 4.5 minimum (FKR-19).
- `unsized-images` / `image-aspect-ratio` / `uses-responsive-images`: the header logo is a **3877×1001 px, 54 KB PNG** rendered at 26 px tall. It is also preloaded on every page (FKR-26).
- `heading-order`: footer `<h4>` follows `<h2>` with no `<h3>` in between (FKR-19).
- `errors-in-console`: 4–5 × 404 for `/fonts/montserrat/*.woff2` on every page (FKR-03).
- `bf-cache`: the documents are sent with `Cache-Control: no-store` (the dynamic layout reads cookies), so back/forward navigation always re-fetches from the slow server.
- The LCP values for desktop (0.5–0.8 s) look optimistic next to the measured TTFB. This is a known effect of Lighthouse's simulated throttling. Treat TTFB and Speed Index as the trustworthy numbers.


## 5. What passed (tested and OK)

**Functional**
- All 26 routes load. Redirects for `/account` and `/admin/*` work. The branded 404 works for unknown top-level and blog URLs.
- Catalog: listing (24/page), the Bepul / Kirill / category chips, sort select, pagination ("Keyingi →" → `?page=2`), refresh on a deep URL (`/fonts?page=2`), browser Back, and the empty state ("Hech narsa topilmadi…").
- Junk parameters are handled: `?cat=xyz` is ignored and `?page=99999` is clamped to the last page.
- Font detail: hero, 18-cut style list, related families. Every cut has its own `@font-face` and the right `font-weight`/`font-style`. Text renders in the font itself, not a system fallback (`document.fonts` → each `ff-gilroy-*` "loaded").
- Tester: weight chips, italic toggle, slider by mouse and keyboard (Arrow keys), empty input, 2,160-character text, emoji, RTL Arabic/Hebrew, quotes/HTML/special characters. No crashes, no page overflow, no injection.
- Cart: add-to-cart is idempotent (double-click → 1 item). Empty contact shows a validation error and writes nothing. Server-side price/tier re-verification is correct (`verifyLines`).
- Downloads: demo `Geometria-Regular-DEMO.otf` (valid `OTTO`, 167 KB, correct MIME and `Content-Disposition`). Free family ZIP `creato-display` (valid `PK`, 403 KB, 14 cuts). Paid cut → 403.
- Login with a wrong password redirects back to `/login` without leaking which field was wrong.

**Font checks**
- Weight/style mapping: the labels shown on the site (Thin … Black, Italic/Oblique) match the files for 5 families / 78 cuts (§3).
- Kerning: 73 / 81 sampled fonts ship kerning (`kern`/GPOS); 36 have `liga`. The browser applies them by default (no `font-feature-settings` override found).
- `font-display: swap` on every `@font-face` (site + catalog). FOUT is short on Slow 4G (fonts ready ≈ 7.1 s, together with the page `load`). No FOIT.
- WOFF2 is used for all web previews. Median preview size 26 KB, max 170 KB (Garamond Premier Pro).
- Same-origin font loading, so no CORS needed. Long-lived immutable caching (after FKR-01 it is browser-only).

**Responsive / browser**
- No horizontal scroll at 360, 390, 768, 1024, 1280, 1440 or 1920 px on `/`, `/fonts`, `/fonts/gilroy`, `/cart` or `/pairs` (one transient 413 px overflow on `/fonts/gilroy` @360 during font loading was not reproducible). 200 % zoom (640 px CSS viewport): no horizontal scroll. The mobile menu opens and closes.
- Chromium only, so Firefox/WebKit are not verified (see §0).

**Accessibility**
- Visible 2 px focus ring on every interactive element (`:focus-visible`). Logical tab order. The tester is fully keyboard-reachable (weights → italic → slider → textarea).
- `<html lang="uz">`. One `<h1>` on content pages. All `<img>` have `alt`. `<main>`, `<nav>`, `<header>`, `<footer>` landmarks are present.

**SEO / meta**
- Unique `<title>` and meta description on content pages. Font pages use the tagline as the description. `og:title`/`og:description`/`og:locale=uz_UZ`. Favicon via `<link rel=icon>`. HTTP→HTTPS 308, HSTS 2 years. No mixed content.

**Security**
- No reflected XSS (`/fonts?q=<script>…`, tester, cart contact). React escapes everything, and the Markdown renderer escapes before formatting.
- No secrets in client bundles (scanned 11 JS chunks for service_role/JWT/keys/Supabase URLs). Source maps return 403. No `.env`/`.git` exposure. No directory listing.
- Admin: middleware guard, bcrypt, DB-backed lockout (8 failures / 15 min), timing-safe dummy hash. Separate JWT cookies for admin and users, both `httpOnly`, `SameSite=Lax`, `Secure`.
- Uploads (admin): extension + MIME + magic-byte sniffing, size caps. Storage key sanitising prevents path traversal.
- The official download routes enforce tiers correctly (free / demo-Regular / paid → 403). `/api/library` requires ownership.

## 6. Top 10 fixes, in priority order

1. **FKR-01** Stop paid-font extraction. Set `Cache-Control: private` now (done in this branch). Then serve subset/renamed preview fonts and short-lived signed URLs.
2. **FKR-02** Audit redistribution rights. Unpublish every family without a documented licence (Gilroy, Geometria, Times New Roman, Adobe Clean*, Garamond Premier Pro, Linotype Univers, …).
3. **FKR-03** Restore the UI font (done).
4. **FKR-04** Make search case-insensitive (done).
5. **FKR-06** Upgrade Next.js to a patched 15.5.x (done).
6. **FKR-07** Move Vercel functions to `bom1` (same region as the Supabase DB). Cache the home page (ISR, e.g. 5 min) instead of `force-dynamic` with `ORDER BY RANDOM()`.
7. **FKR-08 / 09 / 10** Payment and OTP hardening (done). Re-test end-to-end in the Payme and Click sandboxes before enabling them.
8. **FKR-05** Compute and display real "Uzbek Latin ✓ / Uzbek Cyrillic ✓" support per family from the cmap. Fix the `hasCyrillic` filter. Offer an Uzbek specimen preset in the tester.
9. **FKR-11** Re-categorise the 1,865 "Display" families. Fix the ingest default so unknown fonts are not dumped into Display.
10. **FKR-13 / 14 / 15** robots.txt, sitemap.xml, canonical, security headers (done in this branch). Add an OG image.

## 7. Fixed in this branch

Separate commit on `claude/keen-ritchie-6pfrkh`, made after the report. Each change is small and local. `tsc --noEmit` ✅, `next build` ✅. Verified against a local `next start` with Chromium where the page works without the production DB.

| Issue | Change | Verified |
|---|---|---|
| FKR-01 (partial) | `/api/webfont`: `Cache-Control: private, …` + `Vary: Sec-Fetch-Site`, so the Vercel CDN no longer stores or serves paid fonts. **The subset-preview work is still required.** | header in code; existing CDN entries are dropped on the next deploy |
| FKR-03 | Montserrat variable WOFF2 (latin, latin-ext, cyrillic, cyrillic-ext, 159 KB total, OFL licence included) committed to `public/fonts/montserrat/`; `.gitignore` exception; `@font-face` with `unicode-range`; Latin subset preloaded (HTTP `Link` header). | 0 × 404; `document.fonts` → Feekr "loaded" |
| FKR-04 | `mode: "insensitive"` for catalog **and** admin font search. | code + types |
| FKR-06 | `npm audit fix` → next 15.5.27 (lockfile only). | build ✅, audit: 0 critical |
| FKR-08 | OTP: 5 wrong codes → all outstanding codes for that phone are burned; counter resets on new code or success (uses `LoginAttempt`, no migration). | types |
| FKR-09 | Click Complete with `error < 0` → transaction cancelled, nothing granted. | types |
| FKR-10 | Payme auth: login "Paycom", fail closed on empty key, constant-time compare. | 9/9 harness cases |
| FKR-12 | Catalog `page.tsx` + `loading.tsx` moved into `fonts/(catalog)/`, so detail pages are no longer wrapped in the catalog skeleton. Unknown fonts get a real 404 status, and detail content renders without JS. | unknown slug returns a non-streamed status (500 locally without DB, so 404 with DB) |
| FKR-13 | `src/app/robots.ts` (disallows /admin, /api/, /account, /cart; Sitemap line) + `src/app/sitemap.ts` (static + published families + articles, rendered per request so builds don't need the DB). | `/robots.txt` 200 |
| FKR-14 (partial) | `SITE_URL` helper defaulting to `https://feekrfont.uz` (not feekr.uz); canonical on font and blog pages; default `og:image` (logo, placeholder) with `twitter:card=summary`. | meta tags present |
| FKR-15 (partial) | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `CSP: frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader: false`. A full CSP is still to do. | headers present, `X-Powered-By` gone |
| FKR-17 | Logo no longer collapses (`flex-shrink:0`, `max-width:none`). Desktop hamburger hidden. Compact header ≤ 480 px (34 px icons, "Kirish" moves to the menu) and ≤ 374 px (search icon hidden), so the guest **and** logged-in header fit from 320 px up. | measured at 320/360/390/480/600/768/901/1280 |
| FKR-19 (partial) | `htmlFor`/`id` + `autoComplete` on login, register, phone and admin forms; `<h1>` on login/register/admin login; `--muted` #71717a → #64646b (≥ 4.5:1 on soft backgrounds); "Tez kunda" dialog gets Esc-to-close, focus-in, focus-return and `aria-labelledby`. | axe on /login: `label` + `page-has-heading-one` gone |
| FKR-20 | `.field` styles now cover `email`/`tel`; pending labels "Kirilmoqda…" / "Yuborilmoqda…"; register page only mentions Google/phone when they are enabled. | screenshot |
| FKR-23 | Google: link by email only if `email_verified`; unverified emails are not stored. | types |
| FKR-26 (partial) | Logo `width`/`height` attributes. A smaller logo asset is still to do. | — |
| FKR-27 | `src/app/global-error.tsx` (branded fallback with `lang`, title, retry). | build |
| FKR-28 (partial) | `/favicon.ico` → `/assets/favicon.png` rewrite. | 200 image/png |
| FKR-31 | `prefers-reduced-motion` kill-switch; print stylesheet hides header, footer, buy box, tester bar and toolbars. | CSS |

**Not changed on purpose** (needs product, legal or infra decisions): FKR-02 licensing, FKR-05/11 data re-classification, FKR-07 Vercel region, FKR-16 password reset, FKR-18 tester features, FKR-21 licence copy, FKR-22 Payme state machine, FKR-24 copy edits, FKR-25 toolbar race, FKR-29/30 data, FKR-32 rate limits, FKR-33, FKR-34.

**Before you merge, please check:** (1) the header looks right to you on a real phone, since "Kirish" now lives in the ≡ menu below 480 px; (2) after deploying, `curl -I https://feekrfont.uz/api/webfont/<slug>/<style>` should show `cache-control: private` and **no** `x-vercel-cache: HIT`.

## 8. Localization and Uzbek copy notes

The site is **Uzbek-only**: no Russian or English, no language switcher, no hreflang. **Assumption:** this is intentional. A Russian version would widen reach in Uzbekistan and Central Asia, and the URL structure (`/ru/...`) should be planned before SEO accrues. The checks for untranslated strings and switcher persistence are therefore N/A. The current pages showed no layout breaks from long Uzbek words.

Copy that reads as stiff or literal, with suggested rewrites:

| Where | Now | Suggested |
|---|---|---|
| /about h1 | "Feekr — shrift bu ovoz degan ishonchda." | "Feekr shrift — brendning ovozi, degan gʻoyaga tayanadi." |
| /about, buy box | "Har bir shrift desktop va web (WOFF2) foydalanish uchun litsenziyalanadi." | "Har bir shriftni kompyuterda ham, saytda ham ishlatishingiz mumkin." (and only if true, see FKR-21) |
| eyebrow / footer | "Mustaqil shrift ombori" ("ombor" = warehouse) | "Mustaqil shriftlar kutubxonasi" or keep as a brand line, but use one consistently |
| blog title | "Feekr'ga xush kelibsiz" | "Feekrga xush kelibsiz" (suffix attaches directly) |
| sort | "Ko'p uslub" | "Uslublar soni boʻyicha" |
| 401 message | "Kirish talab qilinadi" | "Avval hisobingizga kiring" |
| 403 library | "Bu shrift sizga tegishli emas" (sounds accusatory) | "Bu shriftni hali sotib olmagansiz" |
| login button pending | "Saqlanmoqda…" | "Kirilmoqda…" (FKR-20) |
| cart | "Savatga qo'shish" / "Savatcha" / "Savatchaga o'tish" | pick one: "Savat" everywhere |
| everywhere | `'` / `ʻ` / `‘` mixed | Use `ʻ` (U+02BB) for oʻ/gʻ and `ʼ` (U+02BC) for the tutuq belgisi, consistently |

Good, natural lines worth keeping: "Brendingizga ovoz beradigan shriftlar.", "Hech narsa topilmadi. Boshqa soʻrovni sinab koʻring.", "Bunday sahifa mavjud emas yoki koʻchirilgan."


## 9. Round 2 — every font free + remaining findings (2026-10-04)

**Owner decision:** all fonts are free and the paid category is removed entirely. **Constraint I applied:** families whose licence does not allow free redistribution are *not* given away. A public listing requires `isPublished` **and** a `licenseClass` in {OFL, Apache, Public Domain, Freeware, Own, Licensed}. This is enforced in every public query and in the download, webfont and OG routes, so it takes effect on deploy with **no data migration**. Restricted families (Adobe, Monotype, Linotype, Bitstream, All Rights Reserved, Shareware, Unknown) stay in the DB. An admin can mark a family **Own** (their own design) or **Licensed** (written permission) to publish it.

⚠️ **Impact:** in a sample of 81 live font pages, only **4** carried an open licence (OFL). 40 were "All Rights Reserved", 15 Adobe, 9 Unknown, 4 Monotype, 4 Bitstream, and 5 unparsed. Expect most of the current 2,346 families to be hidden until reviewed. Some "All Rights Reserved"/"Unknown" fonts are genuinely free or the owner's own; review them under **Admin → Shriftlar → Yashirin**.

### 9.1 Status of every finding

Legend: ✅ fixed · 🟡 partial / needs an owner action · ➖ no longer applicable

| ID | Status | What changed |
|---|---|---|
| FKR-01 | ✅ | Only published, freely licensed fonts are ever served (checked before the cache). With every listed font free there is nothing paid left to extract. CDN caching is re-enabled for speed (`s-maxage=86400`). |
| FKR-02 | ✅ | Licence gate (above). Admin licence select with explanation, visibility status, a hidden-list filter and a dashboard counter. |
| FKR-03 | ✅ | (round 1) Montserrat committed. |
| FKR-04 | ✅ | (round 1) case-insensitive search. Re-verified with a real DB: "mont" = "Mont" = "MONT". |
| FKR-05 | 🟡 | Font page shows **Uzbek Latin (ʻ ʼ)** and **Uzbek Cyrillic (Ў Қ Ғ Ҳ)** badges computed from the font's cmap (cached per family). The tester has "Oʻzbekcha" and "Ўзбекча" presets. `hasCyrillic` gets corrected by `npm run meta:refresh`. *Not done:* a catalog-level "Oʻzbekcha" filter, which needs two new DB columns (deferred to avoid a migration). |
| FKR-06 | 🟡 | (round 1) Next 15.5.27, critical cleared. The 4 remaining high advisories are build-time only and need the Next 16 / Prisma 8 majors. |
| FKR-07 | ✅ | `vercel.json` → `regions: ["bom1"]` (same region as the Supabase DB per `.env.example`). Home data cached for 5 min, counts for 1 h, both tag-invalidated on admin edits. The random showcase is picked in memory. **Verify after deploy** that the Supabase project really is in ap-south-1; otherwise change the region. |
| FKR-08 | ✅ | OTP attempt cap (round 1) + per-IP SMS send cap. |
| FKR-09 | ➖ | Click integration removed. |
| FKR-10 | ➖ | Payme integration removed. |
| FKR-11 | 🟡 | `npm run meta:refresh` re-classifies families still on the "Display" default from `post.isFixedPitch`, OS/2 `sFamilyClass`, PANOSE and name keywords. Dry run writes `data/meta-report.csv`; `--apply` writes. It needs the DB and the font files, so the owner must run it. |
| FKR-12 | ✅ | The catalog skeleton is removed entirely; the toolbar shows a pending state instead. Verified with a real DB: unknown slug → **404**, and font pages **and** the catalog render fully without JS. |
| FKR-13 | ✅ | (round 1) robots.txt + sitemap. The sitemap now lists only public families. |
| FKR-14 | ✅ | 1200×630 OG images: a site card, plus a per-font card that sets the family name in its own font. Fonts Satori can't parse (variable/CFF2) fall back to Montserrat. Verified both paths. |
| FKR-15 | ✅ | Per-request CSP with nonce + `strict-dynamic` (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`). The admin auth gate still runs for every `/admin` request, including prefetches. 0 CSP violations across all tested pages. |
| FKR-16 | ✅ | "Parolni unutdingizmi?": stateless 30-min reset token bound to the current password hash, sent via Resend. Hidden until `RESEND_API_KEY` + `MAIL_FROM` are set. Rate-limited, no account enumeration. |
| FKR-17 | ✅ | (round 1) logo/hamburger, compact header from 320 px. |
| FKR-18 | ✅ | Tester: honest size range (slider max follows width, 320px shows 320px), alignment, text colour, dark background, presets (Oʻzbekcha / Ўзбекча / Pangram / ABC / 0–9), reset, auto-grow. |
| FKR-19 | ✅ | Skip link, heading order (footer/blog), labelled forms, contrast; the paid-font modal is gone. **axe: 0 violations** on `/`, `/fonts`, a font page, `/pairs`, `/blog`, `/about`, `/wishlist`, `/login`, `/register`, `/license`, `/support`. |
| FKR-20 | ✅ | (round 1) + lockout messages. |
| FKR-21 | ✅ | Per-family licence note + Freeware warning on the page. `LITSENZIYA.txt` (licence class, copyright, licence text/URL) inside every ZIP. The "demo" concept and the WOFF2 claim are removed. |
| FKR-22 | ➖ | Payment flow removed. |
| FKR-23 | ✅ | (round 1) Google links by verified email only. |
| FKR-24 | ✅ | All UI copy uses ʻ (U+02BB) / ʼ (U+02BC). Uzbek specimen lines on cards, style rows and showcases (ʻ when the font has it, ‘ otherwise). Copy rewritten for a free library. Blog article bodies/titles live in the DB: edit "Feekr'ga…" in admin. |
| FKR-25 | ✅ | Toolbar builds on the last requested URL + the live search value. Verified: clear search → click chip → `/fonts?cat=Serif` (no stale `q`). |
| FKR-26 | ✅ | Header logo 201×52 PNG, 3.3 KB (was 3877×1001, 54 KB), with width/height. |
| FKR-27 | ✅ | (round 1) global-error. |
| FKR-28 | ✅ | 404 pages titled "Sahifa topilmadi" + noindex; wishlist title. |
| FKR-29 | ✅ | Weight number shown next to each style name. Font files are deliberately left unmodified. |
| FKR-30 | 🟡 | Counts are real everywhere (footer, home, about, meta); the "2000+" claims are gone. Squashed names get suggestions from `meta:refresh`; apply them with `--apply --names` after reviewing the CSV. |
| FKR-31 | ✅ | `color-scheme: light`, reduced-motion kill-switch, print stylesheet (round 1). |
| FKR-32 | ✅ | Per-IP limits: user login 8 fails → 15 min, registration 10/h, password-reset 5/h, SMS 10/h. Guest orders no longer exist. |
| FKR-33 | ✅ | Cart removed (`/cart` → 308 `/wishlist`); wishlist stores only slug + name. |
| FKR-34 | ✅ | No DB access during `next build` (0 Prisma errors in the build log); failed DB reads are never cached. |

**Totals:** 27 ✅ · 4 🟡 · 3 ➖.

### 9.2 New issues found and fixed while verifying round 2

- A statically prerendered 404 + nonce CSP blocked all of that page's JS. The root `not-found` is now rendered per request.
- Per-font OG images crashed mid-stream for variable fonts. They now render to a buffer and fall back to Montserrat.
- `unstable_cache` stored a DB failure as "0 fonts" for an hour. Failures now throw inside the cache and fall back outside it.
- `scripts/seed.mjs` would overwrite admin-confirmed licences on re-seed. Own/Licensed classes are now preserved.

### 9.3 How round 2 was verified

`tsc --noEmit` ✅ and `next build` ✅ (0 warnings, 0 Prisma errors). A throwaway **local PostgreSQL 16** held seeded families covering every case: OFL, Freeware, All Rights Reserved, Own, unpublished OFL, and a static plus a variable font. Against `next start`:
- Status codes: public 200; restricted/unpublished/unknown 404 on page, ZIP, single-cut and webfont routes.
- ZIP contents include `LITSENZIYA.txt`. The sitemap lists only public families.
- Playwright (Chromium): tester controls, wishlist, catalog race, 360 px, no-JS, admin licence flip (Locked → Own ⇒ 404 → 200). axe as above. CSP headers checked with 0 console errors.
- Screenshots: `qa-report/screenshots/after/`. The test DB and files were deleted afterwards.

### 9.4 Owner checklist

1. Deploy: pull this branch into the repo Vercel builds from, then push.
2. Admin → **Shriftlar → Yashirin**: mark your own fonts **Oʻz shriftimiz** and licensed ones **Tarqatish huquqi tasdiqlangan**.
3. Locally, with `.env` and the `font/` folder: `npm run meta:refresh` → review `data/meta-report.csv` → `npm run meta:refresh -- --apply` (add `--names` to also rename).
4. Optional: set `RESEND_API_KEY` and `MAIL_FROM` in Vercel to switch on password reset.
5. Confirm the Supabase region is ap-south-1 (Mumbai); otherwise change `vercel.json → regions`.
6. Re-run Lighthouse after deploy; TTFB should drop well below 1 s on cached pages.
7. ~~Decide whether to keep login~~ — **decided: login stays** (profile + wishlist link; Google/SMS/password reset switch on via env vars).


## 10. Round 3 — full redesign (2026-10-04)

Goal set by the owner: 10/10 on beauty, functionality, minimalism, typography and hierarchy, component consistency, mobile, layout, brand identity and font-site functionality. Verified against a local copy with 18 real OFL families (Google Fonts sources, static cuts) plus a hidden "All Rights Reserved" family and a Freeware family. Screenshots: `screenshots/redesign/` (`overview.png` first).

**Design system**
- Type: **Feekr Display** for headings and **Feekr Sans** (Inter variable, 4 script subsets) for UI. Feekr Display is Fraunces pinned to its soft, wordmark-like cut, subset to Uzbek Latin, with ʻ mapped (≈33 KB). Both fonts are self-hosted under the OFL (see `public/fonts/ui/README.txt`). The display font uses `font-display: optional` + preload, so headings never reflow.
- Colour: monochrome surfaces and one brand green (`--brand` #009A76 for marks; `--accent` #0b7a55 for AA text and buttons). Every colour is a token, redefined for dark mode.
- Dark mode: follows the system and can be switched in the header. A nonce'd inline script applies it before first paint. Admin stays light.
- Logo traced to SVG: the mark keeps the brand green and the wordmark follows `currentColor`. It is also used for the SVG favicon, the admin sidebar, the footer signature and the OG images (now in the brand fonts).
- Components: buttons, chips, segmented controls, a unified range slider, inputs, tags, cards, alerts and a FAQ accordion. Spacing uses 4/8 steps; radii are 6/10/14/22 px.

**Functionality added**
- ⌘K / “/” quick search dialog (native `<dialog>`, ARIA combobox, keyboard navigation, “Aa” previewed in each font). New public API `/api/search` (only public families; also used by the wishlist).
- One shared specimen text for the whole site, kept per browser: typed in the home hero, it appears in the featured rows, the catalog cards and the wishlist.
- Catalog:
  - sticky controls (text, size 20–160 px, grid/list view) plus URL-driven filters;
  - category intros and an empty state;
  - each card has a heart button.
- Font page:
  - hero rendered in the family itself, with the download card and Uzbek support tags;
  - spec sheet and a sticky section nav with scroll-spy and a compact download button;
  - tester with weight, italic, size, alignment, inverse and presets;
  - style rows that load a cut into the tester;
  - glyph map with an inspector and copy button;
  - waterfall and paragraph settings;
  - an about section with facts, and related cards.
- Home:
  - headline whose last word cycles through one family per category (fonts are preloaded before each swap; the cycle pauses in background tabs and is off with reduced motion);
  - type bar and featured specimen rows;
  - category tiles drawn in a representative family;
  - newest cards, an Uzbek-first block, pairings and the journal.
- Wishlist shows real specimen cards. Secondary pages (pairs, journal, article, about, licence, support, auth, account, 404/error) were rebuilt on the same system.
- Leftover paid-era copy on the register page was removed.

**Bugs found and fixed during the redesign**
- `.section`/`.hero` shorthand padding wiped the container gutter: content sat flush against the screen edge. Fixed site-wide.
- `backdrop-filter` on the header made it the containing block for the fixed mobile menu, so the menu was clipped. The blur now lives on `::before`.
- A nonce attribute hydration warning (browsers blank `nonce` after parsing) was fixed with `suppressHydrationWarning` on that one script.

**Measured (production build, local DB)**

| Page | Lighthouse mobile | Lighthouse desktop |
|---|---|---|
| `/` | perf 92–95 · a11y 100 · BP 100 · SEO 100 | 100 · 100 · 100 · 100 |
| `/fonts` | perf 91–95 · 100 · 100 · 100 | 98 · 100 · 100 · 100 |
| `/fonts/lora` | perf 90 · 100 · 100 · 100 (was 64 before deferring off-screen sections) | 99 · 100 · 100 · 100 |

- axe-core (WCAG 2.1 AA + best practice): **0 violations** on 15 pages, in light and dark, at 1440 px and 390 px.
- Console: 0 errors.
- No horizontal scroll at 390 px.
- Licence gate re-checked: a restricted family returns 404 for its page, webfont and ZIP, and `/api/search?slugs=` drops it.
- Performance technique: below-the-fold sections and off-screen cards use `content-visibility: auto`, so their webfonts load only when they are near the viewport. The hero cut of a font page is preloaded.

## 11. Production follow-ups (2026-10-04)

- **Deployed** to `IbnMansooR/feekr` `main` (Vercel project `feekrfont`, region `bom1`; the Supabase project is confirmed to be in ap-south-1).
- **Build fix:** `.vercelignore` patterns are now anchored. `font` had excluded `src/components/font`, and `public/fonts/*` would have dropped the UI fonts.
- **CJK previews:** fonts over 1.5 MB are served to specimens as a Latin/Cyrillic subset built with HarfBuzz. Noto Sans SC Bold went from 6.4 MB to 48 KB, and the first conversion is no longer slow enough to time out with a 502.
- **Broken cmaps:** Sanity and Sanity Wide were rejected by Chrome's font sanitizer ("cmap language id should be zero"). They are now rebuilt with every character kept, and they render.
- **Download counter:** new column `Family.downloads`, added on production first. The ZIP and single-cut routes increment it. "0 so'm" is gone; the public total appears once it reaches 100, and the admin dashboard shows the exact number.
- **Metadata refresh** (the equivalent of `npm run meta:refresh --apply`). The source font bucket is private and this session has no service key, so it ran in two parts:
  - **Public families (35):** files were read through the live webfont route, using the script's logic plus Google Fonts' own category where one exists, with a visual check of the uncertain ones. 14 categories were corrected (e.g. Montserrat, Poppins, Jost, Manrope, Barlow, Inter UI → Sans; Aleo → Serif; DreamerOne → Script). No `hasCyrillic` changes were needed. Report: `meta-refresh-2026-10-04.csv`.
  - **Hidden "Display" families:** the script's name rules were applied in SQL. That gave 37 changes: 31 Serif (Caslon, Baskerville, Antiqua…), 4 Slab (Egyptian 505, American Typewriter) and 2 Monospace. The file-based checks for hidden families still need the owner's `npm run meta:refresh` run locally, where the files are available.

## 12. Portfolio, user management and notifications (2026-10-04)

**Database (production first).** The migration `users_notifications_portfolio_rls` adds:
- `User.lastLoginAt`, `blockedAt`, `blockedUntil` and `blockReason`;
- a `Notification` table (one row per recipient; a shared `batch` id groups one send);
- a `Work` table for portfolio items.

The same migration also enables Row Level Security on all 15 public tables. Before this, the Data API (anon key) could read every table, including user and admin password hashes. The app connects as `postgres`, which bypasses RLS, so the site is unaffected; I checked that it still served normally after the change.

**Blocking and suspension**
- `startUserSession()` is now the single sign-in gate for password, SMS code, Google, password reset and registration.
- A block with no end date lasts until an admin lifts it. A suspension (1/3/7/30 days, or a chosen date in Tashkent time) ends on its own.
- `getCurrentUser()` treats a restricted account as signed out, so a block also ends an open session on the next request.
- The login page explains the block and shows the end date. Only the date is read from the URL, never free text.

**Notifications**
- The header bell shows the unread count. It refreshes after client-side navigation, at most every 30 s.
- `/account/notifications` lists messages and marks them read after the response.
- The admin can message one user or broadcast to all users (or to those active in the last 30 days). A sent message can be withdrawn. Read rates show per send.
- Links must be internal (`/…`) or `https://`. `javascript:` and other schemes are rejected.

**Admin**
- Refreshed shell: grouped navigation with active state, a badge for drafts and new orders, theme toggle, token-based colours (dark mode works) and a usable phone layout.
- New pages:
  - `/admin/users`: stats, filters, search by name, email, phone or ID, and status tags;
  - `/admin/users/[id]`: profile, restrict or lift, message, history and delete;
  - `/admin/notifications`;
  - `/admin/works`.
- The work editor has a drag-and-drop gallery. Images go to `/api/admin/upload` one at a time, and the browser first downsizes large files to WebP (long side ≤ 2560 px). This keeps every request under Vercel's 4.5 MB body limit; a 9 MB PNG was uploaded in testing. The bytes are checked server-side, and the pixel size is stored in `Media` so pages can reserve space before an image loads.
- The editor can also reorder images, choose the cover, credit the fonts used (picked from the catalogue), publish, feature and preview a draft.

**Public**
- `/portfolio` has a featured lead tile, a grid, kind filters (own / partner) and tag filters. It ends with a call to action asking partners to get in touch.
- `/portfolio/[slug]` is the case study page:
  - facts, cover, Markdown body and gallery; portrait images are capped at screen height so they don't run several screens tall;
  - a disclosure plus the author's link on partner work;
  - "Ishlatilgan shriftlar" font cards, a next-work link, JSON-LD and Open Graph image.
- Partner work is always labelled "Hamkor".
- Other new spots: a home page teaser, an "Amalda" section on each credited font's page, a "Portfolio" link in the header and sitemap entries.

**Verification (local production build + Postgres 16)**
- Playwright end-to-end: 68/68 checks pass. They cover public pages, filters, image sizes, blocked / suspended / expired sign-ins, ending an open session, sending and reading notifications, broadcast and withdraw, link validation, uploads, the work lifecycle, upload API guards, user deletion and mobile overflow.
- axe (WCAG 2.1 AA + best practice): 0 violations on every new page, in light and dark.
- `tsc` and `next build` pass.
- Screenshots: `screenshots/portfolio/`.

**Rename (owner's request):** the section is called **"Dizaynerlar"** in the header, on the home page and in the admin, and it lives at `/dizaynerlar`. The old `/portfolio` and `/portfolio/<slug>` addresses redirect there permanently (308, query string kept).


## 13. Statistics (2026-10-05)

**Question:** how many people visit, which parts are viewed most, where do they come from and do they stay, and how many register.

**Starting point.** Vercel Web Analytics was never enabled, so there is no history. The numbers start on the day this ships. The canonical/sitemap domain problem found in round 12 turned out to be already fixed in Vercel (`feekrfont.uz` everywhere, `feekrfont.vercel.app` redirects with 301), so no code change was needed.

**What was built** (first-party, cookie-less, stored in our own database):
- `Hit` table, created on production first with Row Level Security on. One row per page view or event.
- The visitor is `HMAC(IP, browser)` keyed by a secret that changes every Tashkent day. No raw IP is stored and nobody can be followed from one day to the next. Because of this, "visitors" over a range is a sum of daily unique visitors, and the stats page says so.
- The browser reports page views and engaged time (`sendBeacon`; time counts only while the tab is visible). Download and wishlist clicks are reported as events. Sign-ups are recorded on the server only, for email, phone and Google.
- Source of a visit: `utm_source`, then the referrer host, then the in-app browser (Instagram, Facebook, TikTok, Telegram), otherwise "direct". The label lives in a 7-day `fk_src` cookie (it identifies nobody) so a later sign-up is credited to the source of the visit. Instagram often hides the referrer, so put `?utm_source=instagram` on the bio link.
- `/api/track` ignores bots, the admin's own browsing, and visitors with Do-Not-Track or Global Privacy Control. It rejects foreign origins, unknown events, admin/API paths, oversized bodies and negative times; it strips query strings from paths and soft-limits each visitor to 90 events a minute. It answers 204 and writes after the response. Rows older than 400 days are pruned occasionally.
- `/admin/stats`: Today / 7 / 30 / 90 days, eight headline numbers, a daily (or hourly) chart with a table fallback, the funnel (visit → font page → wishlist → download → sign-up), sources with their sign-up conversion, top pages, top fonts, devices, countries, referring sites, and "on the site now".
- `/maxfiylik` (privacy) page and a footer link that state exactly this.

**Also fixed while testing**
- The admin followed the OS theme only on the sign-in page; after sign-in it forced light. It now follows the saved choice, like the site.
- Replaced every hard-coded colour in the admin with theme tokens, so dark mode is complete. Danger buttons now meet contrast, and three file/select inputs got labels.

**Verification** (local production build, Postgres 16):
- 38 analytics checks pass, including source detection, cookie, bots, DNT, admin, signup attribution and the numbers on the stats page.
- The earlier 68 end-to-end checks still pass.
- axe: 0 violations on `/maxfiylik` and on all 14 admin pages in real dark and light mode, and the stats page has no horizontal scroll on a phone.


## 14. Reasons to register (2026-10-05)

**Principle.** Registration stays optional and downloads stay free (the licence gate is unchanged). People are invited to register by giving them something real, at the moment it is worth something, in one click, and never with fake scarcity, invented counters, shaming buttons or a blocking pop-up.

**Built**
- **Wishlist on the account.** New `Wish` table (production first, RLS on) and `/api/me/wish`. The first time someone signs in, the list saved in the browser is merged into the account; after that the account is the truth, so a font removed on one device stays removed on the others (a first version resurrected it; found by the two-device test and fixed). Only changes the account has not received yet are merged. Signing out clears the browser's copy, so the next person on a shared computer starts clean. Unknown or hidden fonts are dropped server-side, with a 500 limit.
- **News opt-in.** `User.notifyNews` (on by default), a switch on the account page, and the admin's broadcast goes only to people who have not opted out. Personal messages are always delivered. After uploading a font the admin gets a pre-filled "send a message" link (nothing is sent automatically).
- **Soft offers** (signed-out visitors only): after the second ♡ ("2 fonts are saved; save them to an account") and after a download ("Yangi shriftlar chiqqanda xabar olasizmi?"). At most once a day; closing or "no thanks" silences it for 14 days. It never covers the page, never takes focus, does not appear on sign-in, registration or account pages, closes with Escape, and on a phone is a small card at the bottom. Show / click / dismiss are recorded, so `/admin/stats` can show which offer works. The wishlist page also carries a permanent, honest note that the list lives only in this browser.
- **Telegram sign-in** (Telegram's Login Widget). The callback verifies Telegram's signature (HMAC-SHA256 keyed by the bot token) before it touches the database, and rejects repeated keys, a changed field, a stale or future `auth_date` (15-minute window), a hash made with another token and a non-numeric id. Blocked accounts are refused like on every other sign-in path. It is hidden until `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` are set. CSP gained only `frame-src https://oauth.telegram.org`.
- **Registration page** leads with the two real benefits, offers Google (and Telegram) in one click, and the form is down to email and password.

**Verification** (local production build, Postgres 16, a fake bot token used only for the test): 69 checks pass (prompts and their frequency rules, sign-in merge, two-device sync both ways, API guards, sign-out cleanup, opt-out and broadcast, Telegram acceptance and every rejection case, axe in light and dark, phone layout). Earlier suites still pass (68 + 38), and axe is at 0 violations on every public and admin page in light and dark.

**Not verifiable here:** the real Telegram widget (it needs the owner's bot). The signature check, the callback, the CSP and the script injection are tested; the button itself appears once the bot is configured.


## 15. Members send work; labelled ad banners (2026-10-05)

**Members send work.** A signed-in member opens `/dizaynerlar/yuborish`, uploads up to eight images, names the fonts used and sends it. Signed-out visitors see what they would get and a register button.
- The work is stored as `pending` and is invisible everywhere (public page 404, not in the list, the sitemap or the font page) until the admin approves it. The invariant is: published only when approved.
- Images go through `/api/me/upload`, which shares one validator with the admin uploader (the bytes decide the type, 4 MB limit, SVG refused). A member may upload 24 images a day, may have five works waiting at once and may send five a day. Blocked members are refused.
- A work can use only images that member uploaded: another member's image or an external link is rejected (so nothing is hot-linked and nothing is borrowed). The portfolio link must be http(s) (a `javascript:` link is rejected).
- When the form reports a problem it keeps everything that was typed and uploaded. The first version sent errors by redirect, which wiped the form; the browser test caught it and the form now reports problems in place.
- Admin: a "Koʻrib chiqish kutilmoqda" queue at the top of `/admin/works` (cover, author, link to the user, summary), with approve, or reject with a reason; the sidebar badge counts waiting works. Either decision sends the member a bell message (the news opt-out does not apply to these). Saving a pending work with "published" ticked also approves it; saving unchanged never changes its kind.
- Public: "Aʼzo ishi" label and flag, an "Aʼzolar" filter, and the author link and any links in the text are `nofollow ugc`, because they are user content. `/account/ishlarim` shows each work's status and the reason for a rejection.

**Ad banners.** `Ad` table (production first, RLS on) and `/admin/ads`: advertiser, landing page (https only), a banner image (about 4:1), a slot (home page or the Dizaynerlar page), optional start and end (Tashkent time), a switch and a priority.
- A banner is always labelled "Reklama", its link is `rel="sponsored noopener noreferrer"`, and it reserves its space from the image size (no layout shift). With nothing live, the slot renders nothing. At most one banner per slot.
- A view is counted once, after at least half the banner has been on screen for one second; a click is counted when followed. The admin's own visits are not counted. `/admin/ads` shows 30-day views, clicks and CTR per banner, so the numbers can be shown to an advertiser.
- Switching a banner off removes it at once (the cache is tagged). Not-yet-started and expired banners do not show.

**Verification** (local production build, Postgres 16): 99 checks pass for this stage: submission, pending invisibility, approve and reject with notifications, limits and abuse cases, upload guards, ad creation and validation, scheduling, impressions and clicks, and axe in light and dark on the new pages plus phone layout. The earlier suites (68 + 38 + 69) still pass. Locally, uploaded images are not shown by `next start` because files added to `public/` after the build are not served; on production they are served from the public Supabase `uploads` bucket.

## 16. Telegram bot: channel, member messages, admin moderation (2026-10-11)

The bot (@feekrfont_bot) runs inside the site: Telegram posts every update to `/api/telegram/webhook` (checked against a secret header), so no separate server is needed. Everything is set up once from **Admin → Telegram**; the chosen channel and the admins' chats are stored in a `Setting` row, so nothing needs a redeploy.

**Channel.**
- When the bot is made an admin of a channel, the site sees it and offers it on the Telegram page. Nothing is chosen automatically, because anyone could add the bot to their own channel. A channel can also be connected by `@name`; the site checks that the bot can post there.
- "Telegram kanalga" on a public font and on an approved work opens a draft: the picture (the font's Open Graph card from a stable `/api/tg-image/font/[slug]` address, or the work's cover), an editable caption and the button. The caption is escaped and its first line is set in bold. A silent option is available, the page warns if the item was posted before, and every post is logged in a new `TgPost` table.
- Buttons lead back with `utm_source=telegram&utm_medium=channel`, so channel visits show up as Telegram in the statistics.

**Members.**
- "Telegramni ulash" in the account opens a one-time link to the bot (15 minutes, single use, stored on the user). It refuses a Telegram that is already on another account and an account already tied to another Telegram, because a linked Telegram can also sign in.
- Personal messages and news are copied to Telegram for members who turned it on (`User.tgNotify`, off by default; Start in the bot or the account switch turns it on). The copies are sent after the response, about 25 a second. Someone who blocks the bot is switched off automatically (403, or the block event). `/stop` turns the copies off.
- The login widget now asks for permission to message. It is shown only when Telegram confirms the bot's domain is this site; before `/setdomain` it would show "Bot domain invalid".

**Admin.**
- A one-time link from Admin → Telegram connects the admin's private chat.
- A new member work arrives there with the cover and ✅ / ❌ buttons. ❌ offers four preset reasons; another reason can be written on the site. Approving or rejecting runs the same code as the admin panel and notifies the member.
- The buttons only work for a connected admin in their own private chat. A second press reports "already".
- Vercel Cron calls `/api/cron/daily` at 04:00 UTC (09:00 Tashkent). The admin gets yesterday's visitors (with the change on the day before), views, downloads, ♡, new members, top sources, top downloads and the number of works waiting. The route needs `CRON_SECRET`.

**Verification:** local production build with a fake Telegram API that records every call and downloads photos the way Telegram does; 74 checks pass:
- webhook secret;
- connecting the webhook, an admin and a channel;
- font and work posts, including escaping, the image actually loading and the utm tags;
- one-time links, the duplicate-account guards and approve/reject from buttons, including strangers, wrong chats, repeats and deleted works;
- broadcast copies, blocked bot, `/start` and `/stop`, ignored groups;
- the daily report figures against seeded hits, cron auth, losing the channel, and the Telegram API being down.

The earlier suites still pass.

Found and fixed while testing:
- A work whose cover had a site-relative path would have been posted without its picture.
- An unreachable photo now falls back to the same text and buttons as a plain message.

## 17. Telegram bot, phase 2: text samples, Uzbek letters, inline search, weekly digest (2026-10-11)

**Text samples.** Any plain text sent to the bot (up to 60 characters) comes back as a picture: the text set in four of our fonts, with a button to each font. The button opens the font page with the same text in the tester (`?t=`). "Keyingi / Oldingi" page through the rest by editing the same message.
- Only fonts that can draw every character of the text are offered. The list of families, with the characters each covers and whether the renderer can draw it, is built once a day from the font files; the daily cron keeps it warm.
- Uzbek: `o'` `g'` typed with any apostrophe are shown as `oʻ` `gʻ` (U+02BB), and an apostrophe inside a word becomes `ʼ` (U+02BC). The caption says so. Fonts without these signs, or without `ў қ ғ ҳ` for Cyrillic text, are left out. Characters none of our fonts have (emoji, other scripts) are named in the reply.
- The picture comes from `/api/tg-image/sample`, which renders only URLs the bot signed (HMAC over mode, text and fonts); a changed text or font list gets 403. A soft limit of 12 samples a minute per chat stops flooding.
- `/harflar` explains the Uzbek signs and says how many fonts have them. `/help` lists what the bot does.

**Inline search.** In any chat, `@feekrfont_bot <name>` lists matching fonts (most downloaded first). Picking one sends a card with the font page's preview and a button tagged `utm_medium=inline`. It needs inline mode switched on in @BotFather (`/setinline`).

**Weekly digest.** On Fridays the cron sends the admins a draft: the week's most downloaded fonts (topped up with all-time favourites in a quiet week), new fonts and new works, with a picture of each font's name set in that font. "📣 Kanalga yuborish" publishes it to the channel once (a second press says it was already sent). The same draft can be edited and sent from Admin → Telegram → "Dayjestni koʻrish".

**Verification:** 39 new checks with the fake Telegram API, using real TTF/OTF fonts (DejaVu, Liberation and Loma, a Latin-only font without `ʻ`). They cover:
- the picture renders and the font order is right;
- paging edits the same message;
- `o'` becomes `oʻ` and Loma is left out;
- the Cyrillic filter, emoji, stripped markup and the signed URL (tampering returns 403);
- the flood brake, `/harflar`, `/help` and inline results (found, none, empty query);
- the digest: figures, picture, publish once, strangers refused, compose page;
- the `?t=` tester.

The phase 1 suite (74) still passes.

## 18. Search engines: verification, structured data, IndexNow (2026-10-11)

**Why.** In the first six days the statistics showed 74 visitors, almost all from Uzbekistan and almost all direct: one each came from Google and Yandex. The site was not being found in search, so this step comes before a second language.

**What changed.**
- **Ownership codes without a redeploy.** Admin → Sozlamalar has a "Qidiruv tizimlari" section for the Google Search Console and Yandex Webmaster codes ("HTML tag" method). The whole pasted `<meta>` tag is accepted and only the code is kept; anything else is refused. The codes become `google-site-verification` / `yandex-verification` meta tags on every page through the root layout's `generateMetadata`. Settings are cached and refreshed on save, and saving the other settings no longer drops fields it does not show.
- **Canonical on the home page:** it was the only page without one.
- **Structured data (JSON-LD):**
  - The home page has `WebSite` with a sitelinks search box pointing to `/fonts?q=`, and `Organization` with the logo and the enabled social links plus the Telegram channel.
  - Each font page has a 4-step `BreadcrumbList` and a `CreativeWork` with a free flag, the licence, the designer, an image and the date modified.
  - `<` is escaped, so text from the database cannot close the script tag (tested with a hostile tagline).
- **Font titles and descriptions** now match what people type: "<name> shrifti — bepul yuklab olish | Feekr". The description says the category, the style count and whether the font has Latin or Latin and Cyrillic.
- **IndexNow** (Yandex, Bing and others). The key is served at `/<key>.txt`. The daily cron sends the public font and work pages that changed in the last day (plus `/` and `/fonts` when a font changed); `?indexnow=all` sends every public page once. It is never called from local or preview builds.

**Verification:** 22 new checks pass:
- the canonical tag;
- JSON-LD content, including the hostile tagline staying inside one valid block and not running in the browser;
- title and description;
- codes from a pasted tag, a bare code, on every page, kept when other settings are saved, invalid codes refused, and clearing them;
- the key file;
- the IndexNow payload for changed pages and for `?indexnow=all`.

All earlier suites still pass.

## 19. Russian language (2026-10-11)

**Why.** Many visitors from Uzbekistan read Russian more easily, and Russian searches ("шрифт скачать бесплатно", "кириллические шрифты") are a large share of type searches in the region. Uzbek stays the main language.

**How it works.**
- **Addresses.** Uzbek pages keep their addresses. Russian pages live under `/ru` (`/ru/fonts`, `/ru/fonts/<slug>`, …). The middleware rewrites `/ru/...` to the same page and tells it the language in a request header; a header sent by the visitor is ignored. `/ru/admin` and `/ru/api/...` redirect to the real address, because the admin panel and the API have no Russian version.
- **Text.** All interface text is in two dictionaries (`src/i18n/dict/uz.ts`, `ru.ts`). The Russian one must have the same shape as the Uzbek one, so a missing translation is a build error. Russian plurals are correct ("1 начертание, 3 начертания, 5 начертаний"), and dates follow each language ("11-oktabr, 2026" or "11 октября 2026").
- **Staying in the language.** Every internal link, filter, search result, form and redirect keeps the visitor in their language. This covers sign-in, registration, password reset (the email link too) and Google and Telegram sign-in.
- **Language switch.** "RU" / "UZ" sits in the header, in the mobile menu and in the footer. It opens the same page in the other language, filters included. It reloads the page fully: both languages share one layout, so a client-side switch would keep the old header text.
- **Search engines.** Every translated page has its own canonical address and `hreflang` links (uz, ru, x-default). The sitemap lists both addresses with alternates.
  - Font pages are translated, including the generated description and the structured data.
  - The few admin-written taglines and descriptions are Uzbek, so Russian font pages use the generated Russian text instead.
  - Journal articles and designers' works are written once, in Uzbek. Their Russian pages have Russian menus but are `noindex`, point to the Uzbek original and are not in the sitemap. The journal says its articles are in Uzbek.
- **Headings in Cyrillic.** The display font (Fraunces) has no Cyrillic, so Lora's Cyrillic is joined to "Feekr Display" by `unicode-range` and preloaded on Russian pages (OFL, `public/fonts/ui/OFL-Lora.txt`). On Russian pages, font cards and the tester show Russian sample text for fonts that have Cyrillic. The Russian headline ("Голос вашему бренду дают шрифты") ends, like the Uzbek one, with the word "fonts", and that word rotates through Cyrillic fonts.
- **Not translated:** the admin panel, the Telegram bot, messages sent to members, and the licence file inside the ZIP.

**Verification:** a new suite of 65 checks passes. It covers:
- language, title, `og:locale`, canonical and hreflang on Uzbek and Russian pages;
- that a spoofed language header is ignored;
- every translated page (status and language), the Russian 404, and the `/ru/admin`, `/ru/api` and `/ru/cart` redirects;
- prefetch requests to Russian pages;
- `noindex` and canonical on the Russian work and journal pages, and the sitemap alternates;
- in the browser: links, filters, cards and search staying in `/ru`; the header's current page; switching in both directions with filters kept; the Cyrillic heading font loading;
- the sign-in error, registration, the account page and sign-out staying in Russian;
- no horizontal scroll on phones and the Russian mobile menu;
- no page or hydration errors.

All earlier suites and the accessibility check (now including Russian pages, light and dark) still pass.

## 20. Security hardening (2026-10-11)

**Audit.** Reviewed in order: admin and member sign-in, sessions, every server action and API route, uploads, Markdown rendering, headers, the database's public API and dependencies.
- Every admin action and admin API checks the session.
- Member text is escaped before Markdown rendering.
- No secrets are in the git history.
- Storage buckets for fonts are private.

The weakest point was the admin panel: one password was the whole door, and a stolen session stayed valid for 7 days whatever happened.

**What changed.**
- **Two-step admin sign-in.**
  - **When it applies:** as long as an admin Telegram is connected (Admin → Telegram). The correct password alone no longer opens the panel.
  - **The code:** a 6-digit code goes to the admin's Telegram with the IP and device of the attempt. It is valid for 5 minutes, works once, and is cancelled after 5 wrong tries.
  - **What the browser holds meanwhile:** a signed, httpOnly, `SameSite=Strict` cookie limited to `/admin`. Only an HMAC of the code is stored.
  - **If Telegram can't be reached:** the panel stays closed rather than falling back to the password.
  - **Way out:** if the admin's Telegram is lost, setting `ADMIN_2FA=off` in Vercel switches the second step off.
- **Alerts in the admin's Telegram:**
  - every sign-in (with how it happened);
  - an address locked after 8 wrong passwords;
  - the login locked after 20 wrong passwords from any number of addresses (new: guessing spread over many addresses used to be unlimited);
  - 5 wrong codes;
  - a password change.
- **Sessions follow the password.** The admin session token now carries a fingerprint of the password hash and its type. A token from before this change, a token whose admin was deleted, and every session issued before a password change are refused. A member's token can never open the admin panel.
- **Password change** in Admin → Sozlamalar → Xavfsizlik.
  - It asks for the current password (5 wrong tries lock it for 15 minutes).
  - The new password must have at least 12 characters, must not contain the login and must not be a well-known one.
  - It signs out every other device and sends an alert.
  - The section also says whether two-step sign-in is on.
- **Database public API.** The anon and authenticated roles had every privilege on every table. Row Level Security already denied them all rows, but the grants included `TRUNCATE`, which RLS does not cover. All privileges are now revoked, including default privileges for future tables. With the public key, `/rest/v1/User` now answers `permission denied`. The site uses its own database role and is unaffected (checked live).
- **Soft limits on heavy endpoints**, counted per address per server instance:
  - ZIP downloads: 30 per 10 minutes;
  - single cuts: 120;
  - web fonts: 1,200;
  - Telegram pictures: 300.

  Above the limit the answer is 429 with `Retry-After`. Normal use is far below these numbers.
- **Headers:** `Cross-Origin-Opener-Policy: same-origin-allow-popups` (the Telegram login popup keeps working), `X-Permitted-Cross-Domain-Policies: none`, and `usb=()` added to the permissions policy.
- **`/.well-known/security.txt`** (RFC 9116). It takes its contacts from the settings and has a rolling one-year expiry.
- **Dependencies:** `source-map-js` updated. What remains (`postcss` inside Next.js, `deepmerge-ts` inside the Prisma CLI) only processes this project's own files at build time; the fixes need major upgrades (Next 16, Prisma 7), planned separately.

**Verification:** a new suite of 37 checks passes:
- headers, `security.txt` and the noindex login page;
- password-only sign-in when no Telegram is linked;
- old, forged and member tokens refused;
- the code step: the code arrives with the IP; admin pages stay closed; a wrong code; cookie flags; the right code; the sign-in alert; a used code can't be replayed; 5 wrong codes cancel it; Telegram unreachable;
- the per-login lockout across addresses and the per-address lockout, with their alerts;
- the password change: every rule; the other device is signed out while this one stays in; the old password fails and the new one works;
- the ZIP limit, and another address still downloading.

All earlier suites still pass.

## 21. Automatic channel posts with specimen posters and quotes (2026-10-11)

**What it does.** The bot now posts the site's fonts to the Telegram channel by itself, one family per post, the way type foundries post. Each post is an album of 1080×1350 pictures (4:5, the largest Telegram shows in a feed), rendered by the site from the font file:
1. **Iqtibos:** a quote set in the font, as large as it fits, with the font's own quotation mark, the author and the font's name.
2. **Muqova:** "Aa", the name, category, styles, scripts and designer.
3. **Harflar:** the Latin alphabet, the Uzbek letters (oʻ gʻ sh ch ʼ and ў қ ғ ҳ), Cyrillic and figures. A sign the font lacks is left out rather than drawn as a box, an empty section is not shown, and wide faces shrink to the page width.
4. **Matn:** a headline, a paragraph and three text sizes.
5. **Uslublar:** each style in its own cut. Only for families with 3+ styles.

The caption carries the details. An album can't have buttons, so the caption ends with a link to the font page, tagged `utm_source=telegram`. Each family gets one of four colour schemes, the same on all its pictures.

**Quotes.** 51 ready-made ones: Uzbek proverbs, plus lines by Alisher Navoiy, Abdulla Avloniy and Bobur, chosen only where the attribution is certain. Each quote has a mood, matched to the font's category:
- script → kindness;
- serif → wisdom;
- display → drive, life and kindness;
- sans → life, drive and wisdom;
- slab and monospace → two moods each;
- symbol fonts get no quote.

How a quote is chosen:
- The choice is deterministic, so the preview is exactly what gets posted.
- It moves on after every post: the last 40 used quotes are not repeated, and the admin's own quotes go first.
- Cyrillic-only fonts get the quote transliterated to Uzbek Cyrillic.
- A font without ʻ or — gets the nearest sign it has. With no dash at all, a line break takes its place.
- A font without punctuation (common in demo fonts) gets the words alone. Production's newest font, a letters-only demo, showed this.
- A quote the font can't draw is never used.

How the text is laid out:
- The size is fitted by measuring the actual glyphs (fontkit).
- Lines are balanced, and a dash stays with the word before it.
- Line spacing comes from the ink of the text itself, so tall script faces don't collide.

**Schedule and safety.**
- Autopost is on by default: daily at 09:00 Tashkent, from the existing daily cron. It can be every 2 or 3 days, weekly, or off.
- Queue order: new families (14 days) first, then the most downloaded. Families already posted to the connected channel never repeat.
- One scheduled post per day even if the cron fires twice: the first run claims the day.
- If Telegram refuses the album (400), the family goes out as the single card with a button. If Telegram can't be reached, nothing is sent and the family stays first in the queue.
- If Telegram doesn't answer in time, the album may still have gone out. The family is set aside and never resent, and the admins are asked to check the channel; one press brings it back. The channel post runs first in the daily cron, well inside the 60-second limit.
- The admins get a message with a link to the post and the name of the next family.
- Fonts the renderer can't read (variable fonts, WOFF2-only) go out as the single card.
- Posters read only that family's font file, cached per family and version. They don't depend on the bot's daily list of drawable fonts, and a re-uploaded font is seen at once.

**Admin (Telegram page).**
- "Avtomatik postlar" shows:
  - the switch and the frequency;
  - the next run and the last post;
  - the next family's album preview;
  - the queue with "skip" (and "bring back");
  - "post the next one now".
- "Rasmdagi iqtiboslar":
  - add your own quote (with author and mood; o' is turned into oʻ);
  - remove your own quotes;
  - switch any ready-made quote off or on.
- The manual post page shows the album and lets the admin pick another quote, suitable ones listed first.
- Poster URLs are public, but they only render published families and known quotes, never arbitrary text. They are rate-limited and cached for a week on the CDN.

**Verification:**
- Posters were rendered and checked by eye for sans, serif, mono, script (Pacifico), display (Lobster, Bebas Neue), a Latin-only Thai face (Loma), a letters-only font and a Cyrillic-only case. After deploy they were checked again on production fonts: Montserrat (all five pictures), MADE Tommy Outline and the letters-only Raventy demo.
- A new suite of 52 checks passes:
  - the poster route: bad input, unknown quote, styles picture, a letters-only font;
  - the scheduled run: album order, every picture fetched as PNG by the fake Telegram, the same quote on each, a quote that suits the font, the caption and its link, the admin's message, remembered state;
  - no second post the same day; "busy" when the day is already claimed; the next family with a different quote; every-3-days; off;
  - album refused → single card, with the quote not counted as used;
  - network failure → nothing sent;
  - no answer in time → the family set aside, the admin warned, the next run moves on;
  - the admin UI: queue preview loads, skip and restore, add, switch-off and remove quotes, your own quote used first, manual post with a chosen quote, "post now";
  - axe light and dark.

## 22. Font files in a Telegram file channel, and the channel's post style (2026-10-11)

**Request.** The owner keeps a second channel, @feekrfontbase, for font files. Each font post in the main channel should link to its file there, as in the owner's own example post.

**File channel.**
- In Admin → Telegram → Kanal → "Fayl kanali", the admin connects a second channel. The bot must be an admin there with the right to post, and it can't be the main channel.
- Any channel the bot was made admin of also shows a "Fayl kanali qilish" button. @feekrfontbase is already in that list in production.
- Before a font is posted, its ZIP is uploaded there with a short caption (name, styles, scripts, category, licence, link to the font page). It is the very file the site's "download" button gives: the ZIP building moved into `lib/familyZip.ts`, shared by the download route and the bot.
- **Reuse:** a font is uploaded once. The upload is reused until the font's files, name or licence change, recorded as a fingerprint in `TgPost` (`kind = "file"`).
- **Limits and failures:**
  - Files over Telegram's 50 MB bot limit only lose the Telegram link.
  - If the upload fails, the post isn't sent, so it never goes out without the link. The admin page says why, and the admins get a Telegram message when the daily post didn't go out.
- **Counting:** Telegram uploads don't count as site downloads.

**Post style** (from the owner's example):
- The admin's tagline becomes the bold title. If it doesn't name the font, "<name> shrifti – …" is put in front. A second sentence becomes the next paragraph.
- Then the description (Markdown marks dropped, cut at a sentence) and one line of facts.
- Then the links:
  - Saytdan yuklab olish: bu yerda;
  - Telegramdan yuklab olish (when the file channel is connected);
  - 🔗 feekrfont.uz;
  - 📱 Instagram (from the site settings).
- Telegram counts the 1,024-character caption limit without markup, so the text is shortened when needed, never the links.
- Hashtags and the button are gone from font posts. The single-card fallback carries the same links.

**Verification:** the autopost suite grows to 69 checks, all passing. New checks:
- the file channel can't be the main channel, or one where the bot isn't admin; connecting by `t.me` link;
- the ZIP is uploaded before the album, and is identical in name and contents to the site's download;
- the post links to the file;
- a repeat post reuses the file;
- a refused upload stops the post and tells the admin;
- disconnecting;
- titles built from taglines, with or without the font's name, and descriptions with Markdown.

The fake Telegram API now accepts file uploads, which are saved so the test can open the ZIP. Uploads send their text in the query string, because multipart encoding would turn the caption's line breaks into CRLF; a test checks this.

## 23. Channel post times: two a day, at the times the admin sets (2026-10-11)

**Request.** Two posts a day, with a setting for the times.

**Why a second scheduler.** The site is on Vercel's Hobby plan, where a cron job runs at most once a day and can start anywhere within its hour. So exact times need another clock. The database has one: Supabase's `pg_cron` (with `pg_net`) calls `/api/cron/autopost` every 5 minutes. The call is cheap when nothing is due. The daily Vercel cron calls the same code as a fallback.

**Auth without moving a secret.** The 5-minute job sends a token that the database generates and keeps in the `Setting` table (`cron-token`). The site reads the same row, so the token never leaves the database and never had to be copied anywhere. `CRON_SECRET` keeps working for Vercel. Both cron routes now share `lib/cronAuth.ts`.

**Setting.** Admin → Telegram → "Avtomatik postlar":
- up to 4 post times (Tashkent);
- the weekdays (Du … Ya);
- the switch.

Defaults: 09:00 and 20:00, every day. Times must be at least 30 minutes apart, midnight included. The section shows the next post, posts per week, and how many days the queue lasts.

**Rules.**
- Each time is claimed once (`autopost:<date>@<time>`), so overlapping calls never post twice.
- A time missed by an outage still goes out up to 2 hours late, never later.
- A time that comes within 30 minutes of another font post (e.g. "post now" just before) is let pass.
- One post per call, so two late times don't arrive back to back.

**Also fixed:**
- **Lost error messages.** Error redirects in the Telegram admin put `?error=` after an `#anchor`, where the browser drops it. Errors from the quote form, and the new schedule form, were invisible; they now show.
- **Time field validation.** A 5-minute `step` on the time fields anchored to the current value, so the browser could refuse a valid time like 10:00. Any minute is now accepted.

**Verification:** the autopost suite has 83 checks, all passing. New checks:
- the 5-minute endpoint: no token or a wrong token is refused; the database's token works, on the daily cron too;
- a post time coming;
- the same time again (busy);
- a second time right after a post (let pass, and it doesn't come back);
- the next time posting the next family;
- a time later today, one missed by more than 2 hours, today not among the days, switched off;
- the daily cron fallback;
- the form: 10-minute gap and no days refused with their messages; times saved sorted, days saved; posts per week and queue length shown;
- the quote form's empty-text error now showing.

## 24. New fonts from Google Fonts, approved in Telegram (2026-10-11)

**Request.** The bot finds free fonts elsewhere by itself and puts them, with their details, on the site and in the channel. Agreed: Google Fonts only (every family there is OFL or Apache, so it may be given away), one tap in Telegram to approve, and an Uzbek description from a template (no AI service, no API key).

**How it works.**
- Once a day at the set time (default 11:00 Tashkent, 3 suggestions), the same 5-minute `pg_cron` call as the autopost (§23) runs the scout. It never runs in the same call as a channel post, so the two can't run past the 60-second limit together. Each day is claimed once (`scout:<date>`).
- Candidates are Google's catalogue minus families the site already has (by name or slug, hidden ones included), minus earlier offers. Noto, colour and non-Latin families are skipped. Families with Cyrillic come first. The likeliest few are then checked on their real regular file:
  - the licence written in the file (OFL or Apache, else refused for good);
  - which Uzbek letters it actually draws.

  Both alphabets with oʻ gʻ and ў қ ғ ҳ rank first.
- Each admin gets a picture of the font (name, "Oʻzbekiston", the alphabets, the Uzbek letters) with **✅ Saytga qoʻshish**, **❌ Kerak emas** and a Google Fonts link. The picture is drawn from the font's outlines with fontkit, so fonts the image renderer can't read (it doesn't support some lookup tables, e.g. in Lato 2) still get a picture. Its URL is signed, so nobody else can make the server fetch and draw fonts.
- **✅** downloads every style (static TTF, up to 18) and saves them like an admin upload. It creates the family as published, free and new, with:
  - licence class from the file;
  - designers, category, scripts and glyph count;
  - a tagline and description from the template: use, styles ("Regular dan Bold gacha, kursivlari bilan"), scripts, the Uzbek letters only if really there, designers, licence, "Manba: Google Fonts".

  The admin's buttons turn into "✅ Saytga qoʻshildi · koʻrish". The family is first in the channel queue (new fonts first).
- **❌** never offers that family again. Offers nobody answers expire after 14 days; at most 15 wait at a time.
- Admin → Telegram → **5. Yangi shriftlar (Google Fonts)** has:
  - the switch, suggestions per day (1–5) and the time;
  - **Hozir taklif olish** (works without a Telegram admin too);
  - the waiting offers, with their pictures and the same ✅ / ❌.

**Safety.**
- Taking an offer is a compare-and-swap on its settings row. A double tap, or two admins at once, can't add a family twice or lose a decision.
- Only a connected admin, in their own chat with the bot, can press the buttons.
- When Google doesn't answer, the offer stays and its buttons come back. Fonts already on the site are never added again.

**Also fixed:** a red "Uzish"/"Oʻchirish" chip under the mouse now gets a soft red background. Its text contrast in dark mode no longer depends on the neutral hover colour.

**Verification:** new suite `e2e-scout`, 62 checks, all passing, against a stand-in for Google Fonts. The stand-in serves real OFL fonts (Lato, PT Sans, Liberation), a GPL font, a family whose file is missing, and one already on the site. Checks:
- the signed picture (403 without a signature or with another's, 404 for an unknown family, PNG for Lato);
- the plain user agent;
- not due, due (3 offers, Uzbek-ready first), the same day again;
- GPL refused silently; a missing file not refused;
- a non-admin press refused;
- ❌; ✅ (Lato published, 2 styles, OFL, Latin + Cyrillic, designer, template texts, page, catalogue, ZIP, web font);
- a second press; no licence in the file; Google down (offer kept, buttons back); already on the site;
- expiry, the cap of 15, no admin, switched off;
- the new family posted first by the autopost;
- the admin section: list, pictures, ✅ (Liberation Serif, 4 styles), ❌, "now" with nothing left and with a new family, settings saved;
- mobile width, axe light and dark.

Real Google Fonts files were checked as well (Roboto, Inter, Montserrat, Open Sans, Nunito, Raleway, Rubik, Google Sans). Each gave static TTFs, OFL found in the file, Uzbek letters detected, and outlines that fontkit draws.

## 25. Sevimlilar need an account; advertising: page, applications (site and bot), channel ad posts, reports, promo kit (2026-10-13)

**Requests.**
- Saving to Sevimlilar (♡) should need registration.
- For advertising, "do all of it".
- The bot should take ad applications and send them to the owner.

**♡ needs an account.**
- A guest's ♡ goes to the sign-in page with a reason ("Sevimlilarga saqlash uchun hisobingizga kiring…").
- The pressed font is remembered (30 minutes). After signing in or registering, it is saved to the account and the visitor is taken back to the page they were on.
- Lists saved in a browser before this change still merge into the account on first sign-in.
- The wishlist page asks a guest to sign in or register.
- The soft "save your list" prompt after the 2nd ♡ is gone (no guest ♡ any more). The download prompt stays.
- Downloads stay free without an account.

**"Reklama berish" page** (`/reklama`, Uzbek and Russian, in the footer and sitemap).
- **Audience:** real numbers only. Visits and page views over 30 days come from our own statistics; channel subscribers come from Telegram. The font count is shown, and downloads once past the public threshold.
- **Formats:** channel post, site banner, package. Each shows the admin's price, or "Narx kelishiladi" when none is set.
- **Report and rules:** every ad gets a report link. Ads are always labelled; gambling, adult content, scams and pirated fonts are not accepted.
- **Application form:** name, contact, what, where, timing/budget, link. A honeypot field stops bots, and one address can send 3 a day. A "Telegram orqali ariza" button opens the bot.

**Applications reach the owner.** Each one, from the form or the bot, is saved (`AdRequest`) and sent to every admin's Telegram. The message carries the details and these buttons:
- **✍️ Yozish:** opens a chat with the applicant;
- **✅ Qabul qilish / ❌ Rad etish;**
- **Admin panelda.**

After ✅ or ❌, every admin's copy updates, and a bot applicant gets a message.

**The bot's /reklama** (also `t.me/<bot>?start=reklama`, listed in /help and the command menu). It starts with the real numbers and prices, then asks 4 questions:
1. what to advertise (a link in the text is picked up);
2. where (4 buttons);
3. when, for how long and the budget (can be skipped);
4. contact: a typed number, "Telegramda yozing (@username)", or a one-tap "📱 Raqamimni yuborish". Only the sender's own number is accepted.

A summary follows with ✅ Yuborish / ✏️ Qaytadan / ❌ Bekor qilish. Plain text during the questions isn't turned into a font sample. The answers live 30 minutes; there are 3 applications a day per chat; a double press sends one.

**Channel ad posts** (Admin → Reklama → Kanal postlari).
- **Writing a post:** text, optional picture, button text and an https link, the time (Tashkent), and deletion after 6, 12, 24 or 47 hours or never. Telegram only lets a bot delete its posts within 48 hours. A post can be started from an application, prefilled.
- **Sending:** the 5-minute pg_cron call sends it at its time, before the font autopost. The text ends with "#reklama". The button goes through `/r/<id>`, which counts the click (link-preview bots excluded) and redirects only to the stored link. Each post is claimed once, so it is never sent twice.
- **Late or failed:**
  - a post more than 6 hours late is not sent, and the admin is told;
  - with no channel connected, the post is marked failed with the reason;
  - if Telegram refuses the delete, the admin is asked to delete it by hand.
- **Admin controls:** "Hozir yuborish", "Bekor qilish", "Kanaldan oʻchirish", and click counts (total and unique people).
- **Admin messages:** the admins get a message when the post is out, with links to the post and the report.

**Advertiser reports** (`/reklama/hisobot/<secret>`, noindex).
- Channel post: time, status, button clicks and unique people by day, and a link to the post. Post views show under the post in Telegram; the Bot API can't read them.
- Banner: views, clicks and CTR by day. The admin makes the link with "Hisobot havolasi" on the banner list.

**Narxlar va promo.**
- Prices for /reklama.
- For promoting Feekr itself:
  - a link builder (UTM source, page, campaign) whose visits show under that source in Statistika;
  - three ready texts with the real font count (Instagram, Telegram, a message to a partner page);
  - two ready pictures, post 1080×1080 and story 1080×1920 (`/api/tg-image/promo/<square|story>`).

**Database (production first, RLS on, anon/authenticated revoked):** `AdRequest`, `ChannelAd`, `Ad.reportToken`.

**Bugs found by the tests and fixed before release:**
- The bot's last question removed the phone keyboard in the same message as the ✅ buttons, so the buttons never showed. Telegram allows one keyboard per message; a separate message now removes it.
- A double press of ✅ Yuborish could send two applications. The press now claims the conversation atomically.

**Verification:**
- **New suite `e2e-ads`, 82 checks, all passing:**
  - **Page:** numbers, prices, Russian page, sitemap, footer.
  - **Form:** errors, honeypot, the daily limit, the admin message.
  - **Bot:** every step; someone else's contact refused; double press; deep link; cancel.
  - **Admin buttons:** a non-admin refused; ✅ tells the applicant; ❌.
  - **Cron:** a due post out once, #reklama, the tracked button, a picture, the application marked done.
  - **Clicks and reports:** clicks counted with previews excluded; unknown id → home; the report page; deletion after its hours; a refused delete; missed and no-channel cases.
  - **Banners:** the report with an 8.00% CTR.
  - **Admin pages:** tabs and counts; status and note; a post from an application (the http link refused, the application kept); send now, take down, cancel; prices on the page; the UTM builder; the ready texts and pictures.
  - **Accessibility:** axe light and dark, no sideways scroll on a phone.
- **`e2e-stage2` rewritten for the ♡ change, 72 checks:**
  - a guest ♡ goes to sign-in, remembered, nothing saved without an account;
  - register → back on the page with the font saved;
  - the download prompt dismissal;
  - the account sync across two devices.

## 26. Dizaynerlar: profiles of well-known designers and design news, found by the bot, approved in Telegram (2026-10-14)

**Request.** Fill the Dizaynerlar section like a "Google Fonts for designers": designers and their well-known work. The bot should find them and put them on the site and in the channel, as an article, blog post or news item.

**Rights.** The owner's view: the site earns nothing from this, and the author is named and promoted for free. That is a good-faith reason, but it doesn't make copying a picture or text from Behance, Dribbble or a magazine lawful: non-commercial use and credit are not a licence. So each source is used only the way it allows:
- **Designer profiles:** facts from **Wikidata (CC0, free to use)**; the portrait from **Wikimedia Commons**, saved only when its licence is CC BY, CC BY-SA, CC0 or public domain, with author and licence shown (non-commercial, no-derivatives and non-free files are refused). The text is Feekr's own, built from the facts. Nothing is copied from Wikipedia articles; they are linked.
- **News:** from feeds the admin chooses (RSS/Atom): the title, the publisher's own short summary (cut to 280 characters) and a prominent link and button to the original. No article text, no pictures.
- **Behance / Dribbble:** nothing is taken from them automatically. A work whose author agreed can be added by hand in Admin → Dizaynerlar (kind "Hamkor"), which already labels it as partner work.

**How it works.**
- Once a day at the set time (default 12:00 Tashkent) the 5-minute cron runs the scout, never in a call that already posted a font, found fonts or sent ads. Each day is claimed once.
- **News:** the feeds take turns, newest first. Items already offered, already on the site, rejected, or older than 14 days are skipped. Up to 5 a day (default 2).
- **Designers:** one every N days (default 2). The bot takes the next name from a list of about 65 well-known designers and type designers, looks it up on Wikidata and checks that it is a person with a design occupation (graphic designer, typographer, type designer, art director and so on). A name that finds no one, or someone who isn't a designer, is never looked up again. If Wikidata can't be reached, no name is held against it. A "slow down" answer (429) is waited out and retried.
- **The offer** goes to every admin in Telegram: the picture, name, years, occupations, country, known works, the portrait's credit and a link. Buttons: **✅ Sayt + kanal**, **🌐 Faqat sayt**, **❌ Kerak emas**.
  - ✅ puts it on the site: a news item becomes an Article (type "news") with its source name and link, and a designer becomes a profile at `/dizaynerlar/profil/<name>` with the portrait copied to our storage.
  - Sayt + kanal also posts it to the channel (a news item with "Feekr’da oʻqish" and "Asl maqola" buttons, a profile with its photo, credit and links).
  - ❌ is never offered again.
  - Pressing again does nothing; the offer leaves the waiting list atomically. Only a connected admin in their own chat can press.
- **Also:** at most 20 offers wait, and unanswered ones expire after 14 days.

**On the site.**
- **`/dizaynerlar/profil`:** list of profiles.
- **`/dizaynerlar/profil/<name>`:**
  - portrait with its credit and a link to the Commons file;
  - the text, "Mashhur ishlari" and Wikipedia / official site buttons;
  - a "Data from Wikidata (CC0)" note and Person structured data.
- **`/dizaynerlar`:** a strip of the latest profiles under the work grid.
- **News articles:** at `/blog/…` with an "Asl maqolani oʻqish · <source> ↗" button (nofollow).
- **Sitemap:** profiles and the list page are in it.
- **Russian pages:** profiles are Uzbek-only, so the Russian versions are noindex.
- **Work slugs:** "profil" is reserved so a work can't hide the designers' pages.

**Admin → Yangilik va profillar** (`/admin/content`):
- the switch, time, news per day, designer frequency;
- the waiting offers with the same three buttons;
- "Hozir taklif olish";
- feeds: add (checked that it reads), switch off, remove;
- add a designer by name (Wikidata search, "Saytga" or "Sayt + kanal");
- the profiles: edit the text, hide, delete (a deleted one is never offered again).

The channel-posts table in Admin → Telegram now names news and profile posts.

**Database (production first, RLS on, anon/authenticated revoked):** `Designer`, `Article.sourceName/sourceUrl`.

**Verification:** new suite `e2e-content`, 81 checks, all passing, against stand-ins for Wikidata, Commons and two feeds (RSS with CDATA and escaped HTML, Atom). Checks:
- **The offers:**
  - not due, due, the same day again, switched off, no admin, 20 waiting, expiry;
  - feeds take turns and an old item is skipped;
  - text cleaned of markup and entities, and escaped for Telegram;
  - the designer's facts, credit and portrait fetched like Telegram does.
- **Safety:** non-admin refused; a double press; ❌ never again.
- **✅ paths:**
  - news: the article, the channel post with its buttons, the log, the article page with its source button;
  - site-only: no channel post;
  - designer: facts, Uzbek text, credit, links, portrait stored;
  - the profile page and Person data, the list page and strip, the sitemap, an unpublished profile 404, the Russian page noindex.
- **Day by day:**
  - the next run doesn't repeat what was seen;
  - a name that finds no one is dropped;
  - a profile with no free portrait is offered without one;
  - the N-day rhythm.
- **Failures:**
  - Wikidata down: no designer and nothing blacklisted;
  - a "429, retry after 1 s" answer: the bot waits and retries, and a politician is refused;
  - an unreachable feed breaks nothing.
- **Admin page:**
  - settings, the three buttons, "now";
  - feeds: an unreadable one and an http one refused, off, on, remove;
  - search by name and add;
  - a politician refused, someone already on the site marked;
  - edit, hide, delete;
  - axe light and dark, and no sideways scroll on a phone.

**Not covered.** Real Wikidata and real feeds were not run from the build environment. Wikidata's API rate-limits that environment's shared address, which is why the tests use stand-ins and the client waits and retries. The first real run is the scheduled one at 12:00 Tashkent, or "Hozir taklif olish" in the admin page.

### 26.1 Uzbek translation and editing of news offers

- **What.** Each news offer's title and the publisher's short summary are translated into natural, everyday Uzbek (Latin script, `oʻ gʻ`) by Claude (`src/lib/translate.ts`, model `claude-sonnet-5-5`, override with `ANTHROPIC_MODEL`). Names of people, studios, brands and typefaces stay as written. The feed text is passed as data inside `<item>` tags with a rule not to follow instructions in it.
- **Output is checked.** The answer must be the two tags; a translation that brings a link or markup, or is far too long, is thrown away, and the offer is then treated as untranslated.
- **Offer in Telegram.** Shows the Uzbek text, the original title in italics below it, and the usual ✅ buttons. When there is no translation (no key, API error, unusable answer) the offer says so and has only "✏️ Tahrirlash" (a link to the admin page) and ❌; a ✅ press that still arrives is refused, so English is never published as Uzbek by accident.
- **Admin page.** Every news offer is a form with editable title and summary (prefilled with the Uzbek text, or the English one when there is none); the three buttons publish what is in the fields. ❌ works with an empty field.
- **Published article.** Uzbek title and summary, a line "Asl sarlavhasi: …", the source link. The channel post uses the same Uzbek text.
- **Needs.** `ANTHROPIC_API_KEY` in the Vercel environment (never in code). Without it everything still works, only by hand.
- **Tests (e2e-content, 95 checks).** Translated offer and stored text; rules and `<item>` wrapping reach the translator; Uzbek article; API refusal, wrong answer shape and a translation with an added link each leave the offer English with an edit link and no Telegram ✅; manual edit published as typed; ❌ with an empty field.
- **Not covered.** The quality of the real translation: the tests use a stand-in that echoes the text. Read the first real offers and adjust the prompt in `translate.ts` if needed.
- **Later (asked by the owner).** Russian for the channel and the bot's welcome message.

### 26.2 Offer schedule like the font posts

- **What.** The scout's single "time" is replaced by the same schedule the font auto-posts use: up to 4 times a day (Tashkent, at least 30 minutes apart) and the weekdays. Leave every time empty and the offers are off (only "Hozir taklif olish" works). An old single `time` setting is read as a one-item list.
- **Count.** "Yangilik, har safar" is the number of news offers at each time; a designer profile still follows its own "every N days" rule.
- **How it runs.** Same slot logic as the font posts (`dueSlots`): each time of each chosen day is claimed once, a missed slot goes out up to 2 hours late.
- **Tests (e2e-content, 98).** Not a chosen weekday → nothing; no times → off; two times today → each claimed once; the admin form saves the times.

### 26.3 The bot refuses swearing in text samples

- **What.** Text sent to the bot is checked before it is set in pictures (`lib/profanity.ts`, used in `sendSample`). Uzbek (Latin and Cyrillic) and Russian swearing gets "Bunday soʻzlarni yozib boʻlmaydi" and no picture. English is deliberately not checked: those words are used in real design work.
- **How it matches.** The text is brought to one plain Latin spelling (Cyrillic letters, `ʻ ʼ '` marks, look-alike digits and `@ $`, repeated letters, dots and stars inside a word, "h" and "x" alike), then compared with word beginnings (words take endings), short stems with a limit on the ending, and a few whole words and two-word phrases ("am qutoq"). Ordinary words that begin like a swear (Mudofaa, Sukarno, Sikl, Sikka, Amir, Huawei, Xursand) pass.
- **Limits.** A list never catches everything (new spellings, words broken with spaces or other letters), and some rare names may be refused: the person is asked to write something else. The word list lives in one file and is easy to extend.
- **Tests.** e2e-tg2: seven Uzbek/Russian swears in Latin, Cyrillic and disguised spellings are refused, an English phrase and an ordinary lookalike word pass.

### 26.4 The owner's swear dictionary added

- **What.** The Uzbek/Russian dictionary the owner supplied (1829 spellings) was merged into the filter: 530 single words in one plain Latin spelling (`lib/profanityWords.ts`, generated), matched as whole words and with an ending of up to 3 letters (`axmoqlar`), plus the earlier stems. Spellings with a hyphen particle (`axmoq-ku`) are checked on the part before the hyphen.
- **Left out on purpose** (blocking them would refuse honest text): ordinary words and everyday vocabulary (`it`, `mol`, `qo'y`, `bachcha`, `past`, `baxtsiz`, `yovuz`, `jinni`, `iblis`), mild exclamations (`блин`, `чёрт`, `ёлки-палки`, `фигня`, `капец`), words that are also names or brands (`lox`, `kozel`, `durak`, `idiot`, `suki`, `AM`), phrases that are not swearing (`yo'qol`, `odam bo'l`), and descriptions ("jinsiy haqorat"). Two forms that are normal Uzbek (`onangni`, `otangni`, "your mother/father") are not blocked alone; with a swear word next to them the swear is caught.
- **Strict mode** (everything in the dictionary, including the above) is possible if the owner wants it; the cost is more refused honest texts.
- **Tests.** e2e-tg2 (61 checks): dictionary swears in Cyrillic, Latin, with a hyphen and with an ending are refused; "IT company 9 AM", "Onangni hurmat qil", "Sikka muzeyi" and "Bachcha bog'chasi" pass.

### 26.5 Bot statistics and the /help card

- **Statistics.** Two new tables, `BotUser` (chat id, first/last time, message count, `?start=` label, blocked time) and `BotEvent` (a kind and a time), applied to production first (RLS on, anon/authenticated revoked). No name, username or text is stored; one-time link codes (`l_…`, `a_…`) never reach the label. Blocking the bot is noted through `my_chat_member`, writing again clears it.
- **Where.** Admin → Telegram → "6. Bot foydalanuvchilari" (totals, blocked, new today/7 days, active, 14-day table, kinds, sources), `/stat` in the bot for admins only (added to their own "/" menu), and a line in the daily report. `/maxfiylik` says what is kept (uz and ru).
- **/help.** Now a designed card (`/api/tg-image/help`, 1080×1350, Feekr type, no user text, cached) with the explanation as caption and buttons: text sample, Uzbek letters, advertising, fonts, channel. `setMyCommands` lists start, help, harflar, reklama, stop; the bot's description and short description are set (`setMyDescription`).
- **Tests.** e2e-tg2 (80): counted once per chat, `?start=` label, codes never stored, message counts, blocking and unblocking, `/stat` refused for non-admins and shown to admins, the help card renders, caption/buttons, each menu button.

### 26.6 Bot play features: /test, /fon, /brend

- **/test "Qaysi shrift sensan?"** Five questions with four answers each (klassik, zamonaviy, jasur, romantik); the answers travel in the buttons (`t:<n>:<answers>`), so nothing is stored. The top type wins, a tie is settled by a seed of the person and the answers (the same answers give the same font). The font is picked from the families of that type's category that can draw the person's first name (a swear, an emoji or a name no font draws falls back to "Sen"). The result is a 9:16 story card (name set in the font, type, a line, three chips, the font's name, bot and site) with share, retry, wallpaper and "see the font" buttons.
- **/fon.** Asks for a text with a force-reply, then sends a 1080×2340 phone wallpaper; ⟵ ⟶ change the font (only fonts that draw every letter), 🎨 the colour (8 palettes). The text travels in the caption.
- **/brend.** Asks for a name, sends an album of four 1080×1080 wordmark cards in four different fonts and colours, then "Yana 4 ta" for another set.
- **Safety.** All pictures come from `/api/tg-image/card`, which draws only URLs the bot signed (HMAC), text up to 48 characters, soft limit per address; 20 pictures a minute per chat; the swear filter runs on every text and name.
- **/help** lists the new features (card height 1560), the "/" menu has /test, /fon and /brend, the usage statistics count the three kinds.
- **Tests.** e2e-play (29): question flow and edits, stale buttons refused, signed and tampered card URLs, the three cards render at the right size, name fallbacks, wallpaper font/colour buttons, album of four distinct fonts, a second set, swears refused in /fon and /brend, help menu buttons, caption within the limit.

### 26.7 The daily quiz: /viktorina, /reyting

- **The question.** One a day, the same for everybody: a famous font (one of the 150 most downloaded) set in a word, four names (the same kind of font where possible). Kept in `BotQuizDay` the first time it is asked, so the answer can't change if the catalogue does. The card never names the font; after the answer a second card shows it.
- **Answering.** One answer a day (an atomic claim: a double press counts once). Right answer: 10 points plus a streak bonus (up to 7); a wrong one scores nothing but still counts as played. The streak is the days played in a row; missing a day restarts it at 1, the best is kept. An old day's button is refused.
- **Ranking.** `/reyting`: this week's top ten (week = Monday in Tashkent), your own place when you are outside it, and "🙈 Ismimni yashir" to show as "Anonim". Only first names are kept (letters only, swear filter), for the ranking; the privacy page says so (uz and ru).
- **Practice.** "🎯 Mashq" gives endless questions with no points and no stored state (the right index travels in the buttons).
- **Reminder.** From 19:00 Tashkent the 5-minute cron tells players whose streak ends today, once a day, a hundred per call; a button switches it off, and a player who blocked the bot is switched off automatically.
- **Database (production first, RLS on, anon/authenticated revoked):** `BotQuizDay`, `BotQuiz`.
- **Tests.** e2e-quiz (26): same question for everybody, four distinct options, card sizes, reveal, one answer a day, wrong answers, streak continuing and restarting, ranking order and hiding, practice, the reminder (once, not for opted-out or broken streaks), help menu.
- **Test-harness slip (not flakiness).** In two full runs e2e-content saw the scout switched off: a script edit that added a suite name had broken the shell test that turns the scout on for that suite. Fixed; the suite passes in the full run again. e2e-tg2 once hit the React #418 hydration warning documented earlier and passed on a rerun.

### 26.8 The /help card, compact

The card keeps the row layout (icon tile, command, a few words) but is compact: 1080×1350 (4:5, fits a phone without cropping), a two-line headline and eight rows of 98 px (type a text, /viktorina, /test, /reyting, /fon, /brend, /harflar, /reklama). The tiles carry drawn icons (target, star, bars, phone, tag, megaphone; "Aa" and "Oʻ" as type) instead of text labels. The explanations live in the caption and the buttons. e2e-tg2 (80) renders it and checks the caption.

### 26.9 Button menu instead of the "/" list; the help picture refreshed

- **Hidden commands.** The bot's "/" list is empty (the Menu button disappears), while every command still works when typed. Only an admin's own chat lists `/stat`.
- **Button menu.** Everybody gets, once, a persistent keyboard under the input field (8 buttons: 🎯 Viktorina, 🎭 Qaysi shrift sen?, 🖼 Fon rasmi, 🏷 Brend nomi, 🏆 Reyting, 🔤 Harflar, 📣 Reklama, ℹ️ Yordam). A tap arrives as the label and is treated as the command; a text that merely contains a label is still a normal sample. `BotUser.menuShown` records that it was sent (production column added first), so existing users get it with their next message.
- **Why the old card kept showing.** Telegram keeps a picture it has fetched for a URL, so `/help` went on showing the first design after the card was redrawn. The picture URL now carries a version number (`?v=5`, `HELP_IMAGE_VERSION` in `lib/tgHelp.ts`): raise it whenever the card is redesigned.
- **Tests.** e2e-play (40) adds: the menu is sent once (persistent, 8 buttons), each button does what its command does, typed slash commands still work, "Reyting" alone is still a text sample.

### 26.10 Finding a font from a picture (no AI): site and bot

- **How it works** (`lib/fontFinder.ts`, no model, no key): the picture is turned into black and white (ink = what differs from the border's median colour, by Otsu's threshold, so light-on-dark works), cut into letters with connected components (dots, accents and ʻ are joined to their letter), and every candidate font draws the same letters from its outlines with our own rasterizer (fontkit + a scanline fill). Each letter is compared as a 32×32 bitmap plus its width/height ratio, where its top and bottom sit in the line, and how heavy its ink is; the whole line is compared as well. When the picture can't be cut into exactly the typed letters (touching or broken letters) only the line is compared. The person types the text on the picture, so no letter recognition is needed. Fonts we don't have simply score low everywhere: the best of what we have are the lookalikes, shown with a percentage. Up to three styles per family (regular, bold, italic) are tried; a family counts with its best.
- **Site:** `/shrift-topish` (uz and ru, footer link, sitemap): upload, type the text, see the closest fonts, each linking to the font page with the text in the tester. `POST /api/find-font` checks the bytes (PNG/JPEG/WebP, 6 MB), the text (swear filter) and limits requests per address (8 a minute).
- **Bot:** send a picture with the text as its caption, or without and answer the question; `/topish`, the "🔍 Shrift topish" menu button and help row. The answer is a picture of the text set in the closest fonts, a list with percentages, and buttons to the fonts, "Yana rasm" and the site page. The picture is read, never stored; the one waiting for its text is kept in `BotFind` for 30 minutes (production table added first).
- **Accuracy test** (e2e-find): Chromium draws five words in each of 11 fonts (independent of our rasterizer); the right font is first in 54 of 55 pictures (the one miss was a word cut by the screenshot's edge, answered with a clear message). Also working: light text on a dark background, a 300 px JPEG at quality 55, a blurred picture, a text that doesn't match (line mode), no text, a blank picture, a file that isn't a picture, a swear as the text. The first search after a restart takes about half a second for 15 families.
- **Limits.** One line of text per picture; handwriting, heavy effects and photos of curved surfaces are out of reach for this method. Every search reads the candidate fonts (cached per instance), which is fine for a catalogue of a few hundred families; a much larger one would need precomputed letter bitmaps.
- `sharp` is now an explicit dependency.
