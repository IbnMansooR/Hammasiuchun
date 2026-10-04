"use client";
import { useRef, useState } from "react";

// Uploads straight to /api/admin/upload, one image per request. Large photos are
// downsized in the browser first (long side ≤ 2560 px, WebP) so each request
// stays well under the 4.5 MB serverless body limit.
const MAX_SIDE = 2560;
const KEEP_UNDER = 3.5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/avif";

async function prepare(file: File): Promise<File> {
  if (file.type === "image/gif") return file; // keep animation
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size <= KEEP_UNDER) { bmp.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.88));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}

export default function GalleryInput({ cover: initialCover, images: initialImages }: { cover: string | null; images: string[] }) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [cover, setCover] = useState<string>(initialCover ?? "");
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [manual, setManual] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const added: string[] = [];
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      setBusy(`Yuklanmoqda ${i + 1} / ${list.length}…`);
      try {
        const fd = new FormData();
        fd.append("file", await prepare(list[i]));
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || "Yuklashda xatolik.");
        added.push(data.url);
      } catch (e) {
        setError(`${list[i].name}: ${(e as Error).message}`);
      }
    }
    setImages((prev) => [...prev, ...added]);
    setCover((c) => c || added[0] || "");
    setBusy("");
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const a = prev.slice();
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  const remove = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
    if (cover === url) setCover("");
  };
  const addManual = () => {
    const u = manual.trim();
    if (!/^https:\/\/\S+$/.test(u) && !u.startsWith("/uploads/")) { setError("Havola https:// bilan boshlanishi kerak."); return; }
    setImages((prev) => (prev.includes(u) ? prev : [...prev, u]));
    setCover((c) => c || u);
    setManual("");
    setError("");
  };

  return (
    <div className="gallery-input">
      <input type="hidden" name="images" value={images.join("\n")} />
      <input type="hidden" name="coverImage" value={cover} />

      <div
        className="drop"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("is-over"); }}
        onDragLeave={(e) => e.currentTarget.classList.remove("is-over")}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("is-over"); upload(e.dataTransfer.files); }}
      >
        <p><b>Rasmlarni shu yerga tashlang</b> yoki</p>
        <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={!!busy}>Fayl tanlash</button>
        <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => upload(e.target.files)} />
        <p className="muted">JPG, PNG, WebP, GIF, AVIF. Katta rasmlar avtomatik kichraytiriladi.</p>
        {busy && <p role="status" className="drop-busy">{busy}</p>}
      </div>
      {error && <p role="alert" className="adm-notice adm-notice-error" style={{ marginTop: 10 }}>{error}</p>}

      {images.length > 0 && (
        <ol className="thumbs">
          {images.map((u, i) => (
            <li key={u} className={u === cover ? "is-cover" : ""}>
              <img src={u} alt="" loading="lazy" />
              {u === cover && <span className="tag tag-new thumbs-badge">Muqova</span>}
              <div className="thumbs-bar">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Chapga">←</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Oʻngga">→</button>
                {u !== cover && <button type="button" onClick={() => setCover(u)}>Muqova</button>}
                <button type="button" onClick={() => remove(u)} aria-label="Olib tashlash" className="danger">✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="gallery-url">
        <input
          type="url"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          placeholder="…yoki rasm havolasini qoʻying (https://)"
          aria-label="Rasm havolasi"
        />
        <button type="button" className="btn btn-sm" onClick={addManual}>Qoʻshish</button>
      </div>
    </div>
  );
}
