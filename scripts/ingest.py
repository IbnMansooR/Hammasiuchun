#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Feekr font ingestion pipeline.

Phase 1 (parallel): parse metadata for every font file in SRC.
Phase 2 (serial):   group by family, assign clean style slugs, organize the
                    original files into  LIB/<Family>/<Family>-<Style>.<ext>
                    (via hardlink, falling back to copy), and emit catalog JSON.

Usage:
  python ingest.py scan  [--limit N] [--workers K]
  python ingest.py stats
"""
import os, sys, re, json, argparse, unicodedata, logging, traceback
from concurrent.futures import ProcessPoolExecutor, as_completed

logging.getLogger("fontTools").setLevel(logging.CRITICAL)

ROOT = r"C:\Users\feekr\Documents\feekr\font"
SRC  = r"C:\Users\feekr\Documents\feekr\Jama fonts"
LIB  = os.path.join(ROOT, "font")          # organized originals (family folders)
DATA = os.path.join(ROOT, "data")
RECORDS = os.path.join(DATA, "records.jsonl")
CATALOG = os.path.join(DATA, "catalog.json")

FONT_EXT = (".ttf", ".otf", ".ttc", ".otc")

# ---- weight / style parsing -------------------------------------------------
WEIGHT_TOKENS = [
    # order matters: match longer / more specific first
    ("extrablack", 950), ("ultrablack", 950),
    ("extrabold", 800), ("ultrabold", 800),
    ("extralight", 200), ("ultralight", 200),
    ("semibold", 600), ("demibold", 600),
    ("semilight", 350),
    ("hairline", 100), ("thin", 100),
    ("light", 300),
    ("medium", 500),
    ("black", 900), ("heavy", 900), ("fat", 900), ("ultra", 900),
    ("bold", 700),
    ("book", 400), ("regular", 400), ("normal", 400), ("roman", 400),
    ("plain", 400),
]
WEIGHT_NAME = {100:"Thin",200:"ExtraLight",300:"Light",350:"SemiLight",400:"Regular",
               500:"Medium",600:"SemiBold",700:"Bold",800:"ExtraBold",900:"Black",950:"ExtraBlack"}
ITALIC_TOKENS = ("italic","oblique","kursiv","ital","itali")

def parse_style(subfamily, ps_name, weight_class, mac_italic, fs_italic):
    s = (subfamily or "").strip()
    low = s.lower()
    italic = any(t in low for t in ITALIC_TOKENS) or bool(mac_italic) or bool(fs_italic)
    weight = None
    for tok, w in WEIGHT_TOKENS:
        if tok in low:
            weight = w
            break
    if weight is None:
        # fall back to usWeightClass if it looks sane (100..1000)
        if isinstance(weight_class, int) and 100 <= weight_class <= 1000:
            weight = int(round(weight_class/100.0))*100
            weight = max(100, min(900, weight))
        else:
            weight = 400
    return weight, italic

def camel(text):
    parts = re.findall(r"[A-Za-z0-9]+", text or "")
    return "".join(p[:1].upper()+p[1:] for p in parts)

def style_slug(weight, italic, subfamily):
    base = WEIGHT_NAME.get(weight, "Regular")
    if base == "Regular" and italic:
        return "Italic"
    return base + ("Italic" if italic else "")

# ---- filesystem-safe names --------------------------------------------------
_INVALID = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
def safe_folder(name):
    name = _INVALID.sub("", name or "").strip().strip(".")
    name = re.sub(r"\s+", " ", name)
    return name[:120] or "Unnamed"

def slugify(name):
    n = unicodedata.normalize("NFKD", name or "").encode("ascii","ignore").decode("ascii")
    n = re.sub(r"[^A-Za-z0-9]+", "-", n).strip("-").lower()
    return n or "font"

# ---- name-table extraction --------------------------------------------------
def get_name(name_table, ids):
    plats = [(3,1),(3,0),(1,0),(0,3),(0,4)]
    for wid in ids:
        for pid, eid in plats:
            for rec in name_table.names:
                if rec.nameID == wid and rec.platformID == pid and rec.platEncID == eid:
                    try:
                        v = rec.toUnicode().strip()
                        if v: return v
                    except Exception:
                        continue
    for wid in ids:
        try:
            v = name_table.getDebugName(wid)
            if v and v.strip(): return v.strip()
        except Exception:
            pass
    return None

def classify_license(copyright_str, license_str):
    blob = ((copyright_str or "") + " " + (license_str or "")).lower()
    if "open font license" in blob or "ofl" in blob: return "OFL"
    if "apache" in blob: return "Apache"
    if "public domain" in blob: return "Public Domain"
    if "freeware" in blob or "free for" in blob or "free font" in blob: return "Freeware"
    if "shareware" in blob: return "Shareware"
    if "bitstream" in blob: return "Bitstream"
    if "adobe" in blob: return "Adobe"
    if "monotype" in blob: return "Monotype"
    if "linotype" in blob: return "Linotype"
    if "all rights reserved" in blob: return "All Rights Reserved"
    return "Unknown"

def probe(path):
    from fontTools.ttLib import TTFont
    try:
        f = TTFont(path, fontNumber=0, lazy=True)
    except Exception as e:
        return {"error": f"open:{e}", "path": path}
    try:
        nt = f["name"]
        family = get_name(nt, [16,1]) or os.path.splitext(os.path.basename(path))[0]
        sub    = get_name(nt, [17,2]) or "Regular"
        full   = get_name(nt, [4])
        ps     = get_name(nt, [6])
        designer = get_name(nt, [9])
        manuf    = get_name(nt, [8])
        cpy      = get_name(nt, [0])
        lic      = get_name(nt, [13])
        licurl   = get_name(nt, [14])
        vendurl  = get_name(nt, [11])
        ver      = get_name(nt, [5])
        wclass = None; fs_ital = False
        try:
            os2 = f["OS/2"]; wclass = int(os2.usWeightClass)
            fs_ital = bool(getattr(os2,"fsSelection",0) & 0x01)
        except Exception: pass
        mac_ital = False; upm = 1000
        try:
            mac_ital = bool(f["head"].macStyle & 0b10); upm = int(f["head"].unitsPerEm)
        except Exception: pass
        # glyph coverage / latin detection
        has_latin = False; nglyphs = 0
        try:
            cmap = f.getBestCmap()
            nglyphs = len(cmap)
            has_latin = all(ord(c) in cmap for c in "AaEeRr")
        except Exception: pass
        weight, italic = parse_style(sub, ps, wclass, mac_ital, fs_ital)
        rec = {
            "path": path,
            "ext": os.path.splitext(path)[1].lower().lstrip("."),
            "size": os.path.getsize(path),
            "family": family, "subfamily": sub, "full": full, "ps": ps,
            "weight": weight, "italic": italic,
            "designer": designer, "manufacturer": manuf,
            "copyright": cpy, "license": lic, "licenseUrl": licurl, "vendorUrl": vendurl,
            "version": ver, "unitsPerEm": upm,
            "glyphs": nglyphs, "hasLatin": has_latin,
            "licenseClass": classify_license(cpy, lic),
        }
        f.close()
        return rec
    except Exception as e:
        try: f.close()
        except Exception: pass
        return {"error": f"parse:{e}", "path": path}

# ---- driver -----------------------------------------------------------------
def iter_font_files(src):
    for root, _dirs, files in os.walk(src):
        for fn in files:
            if fn.lower().endswith(FONT_EXT):
                yield os.path.join(root, fn)

def load_done():
    done = set()
    if os.path.exists(RECORDS):
        with open(RECORDS, "r", encoding="utf-8") as fh:
            for line in fh:
                try:
                    done.add(json.loads(line)["path"])
                except Exception:
                    pass
    return done

def scan(limit=None, workers=None):
    os.makedirs(DATA, exist_ok=True)
    workers = workers or max(2, (os.cpu_count() or 4) - 1)
    done = load_done()
    files = [p for p in iter_font_files(SRC) if p not in done]
    if limit: files = files[:limit]
    total = len(files)
    print(f"[scan] {total} files to parse ({len(done)} already done), {workers} workers", flush=True)
    n = 0
    with open(RECORDS, "a", encoding="utf-8") as out:
        with ProcessPoolExecutor(max_workers=workers) as ex:
            for rec in ex.map(probe, files, chunksize=32):
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                n += 1
                if n % 500 == 0:
                    out.flush()
                    print(f"[scan] {n}/{total}", flush=True)
    print(f"[scan] done, parsed {n}", flush=True)

def organize():
    """Group records into families, hardlink originals into LIB, write catalog.json."""
    recs = []
    with open(RECORDS, "r", encoding="utf-8") as fh:
        for line in fh:
            try:
                r = json.loads(line)
            except Exception:
                continue
            if "error" in r: continue
            recs.append(r)
    fams = {}
    for r in recs:
        key = re.sub(r"\s+"," ",(r["family"] or "").strip()).casefold()
        fams.setdefault(key, []).append(r)

    catalog = []
    linked = 0; copied = 0; skipped = 0
    for key, items in fams.items():
        fam_display = max((i["family"] for i in items), key=lambda s: len(s or ""))
        fam_display = safe_folder(fam_display)
        slug = slugify(fam_display)
        folder = os.path.join(LIB, fam_display)
        os.makedirs(folder, exist_ok=True)
        styles = []
        used = {}
        # sort: upright before italic, by weight
        items.sort(key=lambda r: (r["italic"], r["weight"], r["ext"]))
        for r in items:
            sslug = style_slug(r["weight"], r["italic"], r["subfamily"])
            # prefer otf over ttf on collision
            dedup_key = sslug
            if dedup_key in used:
                prev = used[dedup_key]
                # keep otf if new is otf and prev ttf
                if r["ext"] == "otf" and prev["ext"] == "ttf":
                    used[dedup_key] = r  # replace mapping; file handled below
                else:
                    skipped += 1
                    continue
            fname = f"{slugify(fam_display)}-{sslug}.{r['ext']}"
            # keep family display casing in filename similar to examples
            fname = f"{re.sub(r'[^A-Za-z0-9]','',fam_display) or slug}-{sslug}.{r['ext']}"
            dst = os.path.join(folder, fname)
            r["_dst"] = dst; r["_style"] = sslug
            used[dedup_key] = r

        for sslug, r in used.items():
            dst = r["_dst"]
            if not os.path.exists(dst):
                try:
                    os.link(r["path"], dst); linked += 1
                except Exception:
                    try:
                        import shutil; shutil.copy2(r["path"], dst); copied += 1
                    except Exception:
                        continue
            styles.append({
                "style": r["_style"], "subfamily": r["subfamily"],
                "weight": r["weight"], "italic": r["italic"],
                "ext": r["ext"], "size": r["size"],
                "file": os.path.basename(dst),
            })
        styles.sort(key=lambda s: (s["italic"], s["weight"]))
        sample = items[0]
        catalog.append({
            "slug": slug,
            "family": fam_display,
            "styleCount": len(styles),
            "hasItalic": any(s["italic"] for s in styles),
            "weights": sorted(set(s["weight"] for s in styles)),
            "designer": next((i["designer"] for i in items if i["designer"]), None),
            "manufacturer": next((i["manufacturer"] for i in items if i["manufacturer"]), None),
            "copyright": sample.get("copyright"),
            "license": sample.get("license"),
            "licenseUrl": sample.get("licenseUrl"),
            "licenseClass": sample.get("licenseClass"),
            "version": sample.get("version"),
            "hasLatin": any(i.get("hasLatin") for i in items),
            "glyphs": max((i.get("glyphs") or 0) for i in items),
            "folder": fam_display,
            "styles": styles,
        })
    catalog.sort(key=lambda c: c["family"].casefold())
    with open(CATALOG, "w", encoding="utf-8") as fh:
        json.dump({"count": len(catalog), "families": catalog}, fh, ensure_ascii=False, indent=1)
    print(f"[organize] families={len(catalog)} linked={linked} copied={copied} skipped_dupes={skipped}", flush=True)
    # quick stats
    multi = sum(1 for c in catalog if c["styleCount"] > 1)
    latin = sum(1 for c in catalog if c["hasLatin"])
    print(f"[organize] multi-style families={multi}  latin-capable={latin}", flush=True)

def stats():
    if not os.path.exists(CATALOG):
        print("no catalog yet"); return
    d = json.load(open(CATALOG, encoding="utf-8"))
    fams = d["families"]
    from collections import Counter
    lc = Counter(c["licenseClass"] for c in fams)
    print("families:", d["count"])
    print("license classes:", dict(lc.most_common()))
    print("multi-style:", sum(1 for c in fams if c["styleCount"]>1))
    print("top families by styleCount:")
    for c in sorted(fams, key=lambda c:-c["styleCount"])[:15]:
        print(f"   {c['styleCount']:>3}  {c['family']}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["scan","organize","stats","all"])
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=None)
    a = ap.parse_args()
    if a.mode in ("scan","all"): scan(a.limit, a.workers)
    if a.mode in ("organize","all"): organize()
    if a.mode == "stats": stats()
