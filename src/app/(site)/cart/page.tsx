"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { formatPrice } from "@/lib/format";
import { placeOrderAction } from "./actions";

const ERRORS: Record<string, string> = {
  contact: "Email yoki Telegram manzilingizni kiriting — operatorlarimiz shu orqali bog'lanadi.",
  empty: "Savatchada haqiqiy buyurtma beriladigan shrift topilmadi. Sahifani yangilab ko'ring.",
  network: "Buyurtmani yuborishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
};

export default function CartPage() {
  const { cart, removeFromCart, clearCart, ready } = useStore();
  const [contact, setContact] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = cart.reduce((s, i) => s + (i.isFree || !Number.isFinite(i.priceCents) ? 0 : i.priceCents), 0);

  if (!ready) return <div className="container section" style={{ paddingTop: 40 }} />;

  async function checkout() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await placeOrderAction(cart, contact);
      if (res.ok) {
        setOrdered(true);
        clearCart();
      } else {
        setError(ERRORS[res.error] ?? "Xatolik yuz berdi.");
      }
    } catch {
      setError(ERRORS.network);
    } finally {
      setSubmitting(false);
    }
  }

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
            <label className="field" style={{ display: "block", margin: "14px 0" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Email yoki Telegram</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="siz@example.com yoki @foydalanuvchi"
                style={{ width: "100%" }}
              />
            </label>
            {error && (
              <p style={{ color: "#b91c1c", fontSize: 13, marginTop: -6, marginBottom: 10 }}>{error}</p>
            )}
            <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={submitting} onClick={checkout}>
              {submitting ? "Yuborilmoqda…" : "To'lovga o'tish"}
            </button>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 12, textAlign: "center" }}>
              To&apos;lov tizimi tez orada ulanadi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
