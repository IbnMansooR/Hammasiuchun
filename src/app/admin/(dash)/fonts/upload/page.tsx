import { CATEGORIES, CATEGORY_LABEL } from "@/lib/fonts";
import { uploadFontFamilyAction } from "../../../actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Shrift yuklash" };

const ERRORS: Record<string, string> = {
  name: "Oila nomini kiriting.",
  files: "Kamida bitta font fayli tanlang.",
  parse: "Fayllarni o'qib bo'lmadi. TTF / OTF / WOFF2 ekanini tekshiring.",
};

export default async function UploadFont({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Yangi shrift oilasini yuklash</h1>
      <p className="muted" style={{ maxWidth: 640, marginTop: -12, marginBottom: 22 }}>
        Bitta oilaning barcha uslublarini (Regular, Bold, Italic…) tanlang. Tizim har birini o&apos;qib,
        WOFF2 ga o&apos;giradi va katalogga qo&apos;shadi. Qoidaga ko&apos;ra oilada kamida 3 ta uslub bo&apos;lgani ma&apos;qul.
      </p>
      {error && (
        <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18, maxWidth: 640 }}>
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
            <select name="category" defaultValue="Sans">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Font fayllari (TTF / OTF / WOFF2, bir nechta)</label>
          <input type="file" name="files" multiple accept=".ttf,.otf,.woff2" required />
        </div>
        <SubmitButton pendingLabel="Yuklanmoqda…">Yuklash va qo&apos;shish</SubmitButton>
      </form>
    </>
  );
}
