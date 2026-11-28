import { CATEGORIES, CATEGORY_LABEL } from "@/lib/fonts";
import { uploadFontFamilyAction } from "../../../actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Shrift yuklash" };

const ERRORS: Record<string, string> = {
  name: "Oila nomini kiriting.",
  files: "Kamida bitta font fayli tanlang.",
  parse: "Fayllarni oʻqib boʻlmadi. TTF / OTF / WOFF2 ekanini tekshiring.",
};

export default async function UploadFont({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Yangi shrift oilasini yuklash</h1>
      <p className="muted" style={{ maxWidth: 640, marginTop: -12, marginBottom: 22 }}>
        Bitta oilaning barcha uslublarini (Regular, Bold, Italic…) tanlang. Tizim har birini oʻqib,
        WOFF2 ga oʻgiradi va katalogga qoʻshadi. Qoidaga koʻra oilada kamida 3 ta uslub boʻlgani maʼqul.
      </p>
      {error && (
        <div className="adm-notice adm-notice-error" role="alert" style={{ maxWidth: 640 }}>
          {ERRORS[error] ?? "Xatolik yuz berdi."}
        </div>
      )}
      <form action={uploadFontFamilyAction} style={{ maxWidth: 640 }}>
        <div className="field-row">
          <div className="field">
            <label>Oila nomi</label>
            <input type="text" name="familyName" placeholder="masalan: Inter" required />
          </div>
          <div className="field">
            <label>Toifa</label>
            <select name="category" defaultValue="Sans" aria-label="Toifa">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Font fayllari (TTF / OTF / WOFF2, bir nechta)</label>
          <input type="file" name="files" multiple accept=".ttf,.otf,.woff2" required aria-label="Shrift fayllari (.ttf, .otf, .woff2)" />
        </div>
        <SubmitButton pendingLabel="Yuklanmoqda…">Yuklash va qoʻshish</SubmitButton>
      </form>
    </>
  );
}
