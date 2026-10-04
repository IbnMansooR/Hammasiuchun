import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/format";
import { deleteOrderAction } from "../../actions";
import ConfirmButton from "@/components/ConfirmButton";
import OrderStatusForm from "@/components/OrderStatusForm";

export const metadata = { title: "Admin — Buyurtmalar" };

type OrderItem = { slug: string; name: string; priceCents: number };

export default async function OrdersPage() {
  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>Buyurtmalar</h1>
      </div>

      {orders.length === 0 ? (
        <p className="muted">Hali buyurtma yoʻq.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th>Shriftlar</th><th>Jami</th><th>Aloqa</th><th>Holat</th><th>Sana</th><th><span className="sr-only">Amallar</span></th></tr></thead>
          <tbody>
            {orders.map((o) => {
              let items: OrderItem[] = [];
              try { items = JSON.parse(o.itemsJson); } catch { /* corrupt row, show empty */ }
              return (
                <tr key={o.id}>
                  <td>{items.map((i) => i.name).join(", ") || "—"}</td>
                  <td>{formatPrice(o.totalCents, o.totalCents === 0)}</td>
                  <td>{o.contact}</td>
                  <td><OrderStatusForm id={o.id} status={o.status} /></td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deleteOrderAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <ConfirmButton className="chip" style={{ color: "#b91c1c" }} message="Buyurtma oʻchirilsinmi? Bu amalni qaytarib boʻlmaydi.">
                        Oʻchirish
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
