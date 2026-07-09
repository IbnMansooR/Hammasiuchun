import Image from "next/image";

// next/image only handles same-origin/local paths safely; admin-pasted external
// URLs fall back to a plain <img> so they never break the render.
const isLocal = (src: string) => src.startsWith("/") && !src.startsWith("//");

export function CardCover({ src, alt }: { src: string; alt: string }) {
  if (!isLocal(src)) return <img className="post-cover" src={src} alt={alt} />;
  return (
    <div className="post-cover" style={{ position: "relative" }}>
      <Image src={src} alt={alt} fill sizes="(max-width: 900px) 100vw, 33vw" style={{ objectFit: "cover" }} />
    </div>
  );
}

export function HeroCover({ src, alt }: { src: string; alt: string }) {
  const style = { width: "100%", height: "auto", borderRadius: 16, marginBottom: 30 } as const;
  if (!isLocal(src)) return <img src={src} alt={alt} style={style} />;
  return <Image src={src} alt={alt} width={1200} height={675} style={style} />;
}
