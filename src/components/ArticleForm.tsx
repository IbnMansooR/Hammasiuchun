import Link from "next/link";
import { saveArticleAction } from "@/app/admin/actions";
import SubmitButton from "@/components/SubmitButton";

type Article = {
  id: number; slug: string; type: string; title: string; excerpt: string | null;
  body: string; coverImage: string | null; author: string; tags: string; isPublished: boolean;
};

export default function ArticleForm({ article }: { article?: Article }) {
  const a = article;
  return (
    <form action={saveArticleAction}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="field-row">
        <div className="field">
          <label htmlFor="af-title">Sarlavha</label>
          <input type="text" id="af-title" name="title" defaultValue={a?.title ?? ""} required />
        </div>
        <div className="field">
          <label htmlFor="af-slug">Slug (URL) — boʻsh qoldirsangiz avtomatik</label>
          <input type="text" id="af-slug" name="slug" defaultValue={a?.slug ?? ""} placeholder="masalan: yangi-shriftlar" />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="af-type">Turi</label>
          <select id="af-type" name="type" defaultValue={a?.type ?? "blog"}>
            <option value="blog">Blog</option>
            <option value="news">Yangilik</option>
            <option value="article">Maqola</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="af-author">Muallif</label>
          <input type="text" id="af-author" name="author" defaultValue={a?.author ?? "Feekr"} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="af-excerpt">Qisqacha (excerpt)</label>
        <input type="text" id="af-excerpt" name="excerpt" defaultValue={a?.excerpt ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="af-cover">Muqova rasmi URL (Rasmlar boʻlimidan nusxalang)</label>
        <input type="text" id="af-cover" name="coverImage" defaultValue={a?.coverImage ?? ""} placeholder="/uploads/..." />
      </div>
      <div className="field">
        <label htmlFor="af-body">Matn (Markdown: ## sarlavha, **qalin**, - roʻyxat)</label>
        <textarea id="af-body" name="body" rows={16} defaultValue={a?.body ?? ""} style={{ minHeight: 320, fontFamily: "ui-monospace, monospace", fontSize: 13.5 }} />
      </div>
      <div className="field">
        <label htmlFor="af-tags">Teglar (vergul bilan)</label>
        <input type="text" id="af-tags" name="tags" defaultValue={a?.tags ?? ""} placeholder="dizayn, yangilik" />
      </div>
      <label className="check" style={{ margin: "8px 0 20px" }}>
        <input type="checkbox" name="isPublished" defaultChecked={a?.isPublished ?? false} /> Chop etish (saytda koʻrsatish)
      </label>
      <div style={{ display: "flex", gap: 10 }}>
        <SubmitButton>Saqlash</SubmitButton>
        <Link href="/admin/articles" className="btn">Bekor qilish</Link>
      </div>
    </form>
  );
}
