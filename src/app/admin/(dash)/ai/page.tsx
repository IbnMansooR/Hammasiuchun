import { AI_TASKS, aiOn, getAiSettings, monthUsage, MODEL_ID } from "@/lib/ai";
import { formatNumber } from "@/lib/format";
import { saveAiSettingsAction, testAiAction } from "@/app/admin/aiActions";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — AI sarfi" };
export const maxDuration = 60;

const usd = (n: number) => (n < 0.01 && n > 0 ? "< $0.01" : `$${n.toFixed(2)}`);

export default async function AiAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; detail?: string }> }) {
  const { ok, error, detail } = await searchParams;
  const [set, use] = await Promise.all([getAiSettings(), monthUsage()]);
  const share = Math.min(100, Math.round((use.usd / set.monthlyUsd) * 100));
  const rows = [...use.byTask.entries()].sort((a, b) => b[1].usd - a[1].usd);
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>AI sarfi</h1>
          <p className="adm-sub">Claude yordamida bajariladigan ishlar (tarjima, tavsif, maqola qoralamalari) shu yerdan sanaladi. Matnlar saqlanmaydi, faqat soni.</p>
        </div>
      </div>
      {ok === "saved" && <Notice>Saqlandi.</Notice>}
      {ok === "test" && <Notice>{`AI ishlayapti ✓ ${(detail ?? "").slice(0, 200)}`}</Notice>}
      {error === "usd" && <Notice tone="error">Oylik chegarani 1 dan 1000 dollargacha kiriting.</Notice>}
      {error === "test" && <Notice tone="error">{`Sinov muvaffaqiyatsiz: ${(detail ?? "").slice(0, 200)}`}</Notice>}

      <section className="adm-card adm-pad" aria-labelledby="h-month">
        <h2 className="adm-h2" id="h-month">Shu oy</h2>
        <p className="adm-text">
          <strong>{usd(use.usd)}</strong> sarflangan, oylik chegara <strong>${set.monthlyUsd}</strong> ({share}%).
          {!aiOn() ? " Kalit (ANTHROPIC_API_KEY) sozlanmagan: AI ishlamaydi." : set.on ? " AI yoqilgan." : " AI oʻchirilgan."}
          {use.usd >= set.monthlyUsd ? " Chegara tugadi: AI toʻxtatilgan." : ""}
        </p>
        <div className="adm-bar" role="img" aria-label={`Chegaraning ${share}% i ishlatilgan`} style={{ height: 10, borderRadius: 6, background: "var(--adm-line, #e5e5df)", overflow: "hidden" }}>
          <div style={{ width: `${share}%`, height: "100%", background: share >= 90 ? "#c0392b" : "var(--adm-accent, #009a76)" }} />
        </div>
        <p className="adm-meta">Taxminiy hisob: Anthropic narxlari boʻyicha (Sonnet 5.5: kirish $2, chiqish $10 / million token; Haiku 5.5: $0.10 / $0.50). Aniq summa console.anthropic.com da.</p>
        <form action={saveAiSettingsAction} className="adm-tg-auto-form">
          <label className="check"><input type="checkbox" name="on" defaultChecked={set.on} /> AI yoqilgan</label>
          <label className="adm-tg-scout-field">
            <span>Oylik chegara ($)</span>
            <input type="number" name="monthlyUsd" min={1} max={1000} step="0.5" defaultValue={set.monthlyUsd} required />
          </label>
          <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
        </form>
        <form action={testAiAction}>
          <SubmitButton className="btn btn-sm" pendingLabel="Sinalmoqda…">Kalitni sinash</SubmitButton>
        </form>
        <p className="adm-meta">{`Modellar: ${MODEL_ID.sonnet()} (sifat kerak ishlar), ${MODEL_ID.haiku()} (arzon va tez ishlar).`}</p>
      </section>

      <section className="adm-card" aria-labelledby="h-tasks">
        <h2 className="adm-h2 adm-pad-top" id="h-tasks">Ishlar boʻyicha</h2>
        {rows.length === 0 ? (
          <p className="adm-text adm-pad">Shu oy hali AI ishlatilmagan.</p>
        ) : (
          <table className="adm-table">
            <thead><tr><th>Ish</th><th>Chaqiruv</th><th>Xato</th><th>Kirish tokeni</th><th>Chiqish tokeni</th><th>Taxminiy narx</th></tr></thead>
            <tbody>
              {rows.map(([task, t]) => (
                <tr key={task}>
                  <td><strong>{AI_TASKS[task as keyof typeof AI_TASKS] ?? task}</strong></td>
                  <td>{formatNumber(t.calls)}</td>
                  <td>{formatNumber(t.failures)}</td>
                  <td>{formatNumber(t.inTok)}</td>
                  <td>{formatNumber(t.outTok)}</td>
                  <td>{usd(t.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
