"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { formatPrice } from "@/lib/format";
import { placeOrderAction, initiatePaymentAction, type PaymentProvider } from "./actions";

const ERRORS: Record<string, string> = {
  contact: "Email yoki Telegram manzilingizni kiriting — operatorlarimiz shu orqali bog'lanadi.",
  empty: "Savatchada haqiqiy buyurtma beriladigan shrift topilmadi. Sahifani yangilab ko'ring.",
  network: "Buyurtmani yuborishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
  login: "To'lov qilish uchun avval hisobingizga kiring — xaridingiz shu hisobga bog'lanadi.",
  unavailable: "Bu to'lov usuli hozircha sozlanmagan.",
};

export default function CartClient({
  loggedIn, paymeEnabled, clickEnabled,
}: { loggedIn: boolean; paymeEnabled: boolean; clickEnabled: boolean }) {
  const { cart, removeFromCart, clearCart, ready } = useStore();
  const [contact, setContact] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState<PaymentProvider | "manual" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = cart.reduce((s, i) => s + (i.isFree || !Number.isFinite(i.priceCents) ? 0 : i.priceCents), 0);

  if (!ready) return <div className="container section" style={{ paddingTop: 40 }} />;

  async function checkoutManual() {
    setError(null);
    setSubmitting("manual");
    try {
      const res = await placeOrderAction(cart, contact);
      if (res.ok) { setOrdered(true); clearCart(); }
      else setError(ERRORS[res.error] ?? "Xatolik yuz berdi.");
    } catch {
      setError(ERRORS.network);
    } finally {
      setSubmitting(null);
    }
  }

  async function payWith(provider: PaymentProvider) {
    setError(null);
    setSubmitting(provider);
    try {
      const res = await initiatePaymentAction(cart, provider);
      if (res.ok) { window.location.href = res.url; return; }
      setError(ERRORS[res.error] ?? "Xatolik yuz berdi.");
    } catch {
      setError(ERRORS.network);
    } finally {
      setSubmitting(null);
    }
  }

  const showPayments = paymeEnabled || clickEnabled;

  return (
    <div className="container section" style={{ paddingTop: 34 }}>
      <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", marginBottom: 24 }}>Savatcha</h1>

      {ordered ? (
        <div style={{ border: "1px solid var(--line)", borderRadius: 16, padding: 30, maxWidth: 560 }}>
          <h2 style={{ fontSize: 24, marginBottom: 10 }}>Rahmat! 🎉</h2>
          <p className="muted">Buyurtmangiz qabul qilindi. To&apos;lov tizimi tez orada ulanadi — operatorlarimiz siz qoldirgan aloqa orqali bog&apos;lanadi.</p>
          <Link href="/fonts" className="btn btn-accent" style={{ marginTop: 16 }}>Yana shrift tanlash</Link>
        </div>
      ) : cart.length === 0 ? (
        <div>
          <p className="muted" style={{ fontSize: 17 }}>Savatchangiz bo&apos;sh.</p>
          <Link href="/fonts" className="btn btn-accent" style={{ marginTop: 16 }}>Shriftlarni ko&apos;rish</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div>
            {cart.map((i) => (
              <div key={i.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <Link href={`/fonts/${i.slug}`} style={{ fontSize: 19, fontWeight: 700 }}>{i.name}</Link>
                  <div className="muted" style={{ fontSize: 13 }}>To&apos;liq oila litsenziyasi</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <strong>{formatPrice(i.priceCents, i.isFree)}</strong>
                  <button className="chip" style={{ color: "#b91c1c" }} onClick={() => removeFromCart(i.slug)}>O&apos;chirish</button>
                </div>
              </div>
            ))}
            <button className="chip" style={{ marginTop: 16 }} onClick={clearCart}>Savatchani tozalash</button>
          </div>

          <div className="buybox">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="muted">Mahsulotlar</span><span>{cart.length} ta</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 800, padding: "12px 0", borderTop: "1px solid var(--line)" }}>
              <span>Jami</span><span>{formatPrice(total, total === 0)}</span>
            </div>

            {error && <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 4, marginBottom: 4 }}>{error}</p>}

            {showPayments && (
              <>
                {!loggedIn && (
                  <p className="muted" style={{ fontSize: 12.5, margin: "10px 0" }}>
                    To&apos;lov qilish uchun <Link href="/login">hisobingizga kiring</Link> — xaridingiz shu hisobga
                    bog&apos;lanadi va istagan payt qayta yuklab olasiz.
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {paymeEnabled && (
                    <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={!!submitting} onClick={() => payWith("payme")}>
                      {submitting === "payme" ? "…" : "Payme orqali to'lash"}
                    </button>
                  )}
                  {clickEnabled && (
                    <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={!!submitting} onClick={() => payWith("click")}>
                      {submitting === "click" ? "…" : "Click orqali to'lash"}
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  <span className="muted" style={{ fontSize: 12.5 }}>yoki</span>
                  <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                </div>
              </>
            )}

            <label className="field" style={{ display: "block", margin: "4px 0 14px" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Email yoki Telegram (biz siz bilan bog'lanamiz)</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="siz@example.com yoki @foydalanuvchi"
                style={{ width: "100%" }}
              />
            </label>
            <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={!!submitting} onClick={checkoutManual}>
              {submitting === "manual" ? "Yuborilmoqda…" : "Murojaat qoldirish"}
            </button>
            {!showPayments && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 12, textAlign: "center" }}>
                To&apos;lov tizimi tez orada ulanadi.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
