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
