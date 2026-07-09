"use client";
import { setOrderStatusAction } from "@/app/admin/actions";

const STATUS_BADGE: Record<string, string> = { new: "badge-new", contacted: "", done: "badge-free" };
const STATUS_LABEL: Record<string, string> = { new: "Yangi", contacted: "Bog'lanildi", done: "Yakunlandi" };

export default function OrderStatusForm({ id, status }: { id: number; status: string }) {
  return (
    <form action={setOrderStatusAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="hidden" name="id" value={id} />
      <span className={`badge ${STATUS_BADGE[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>
      <select
        name="status"
        defaultValue={status}
        className="sel"
        style={{ fontSize: 12 }}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="new">Yangi</option>
        <option value="contacted">Bog&apos;lanildi</option>
        <option value="done">Yakunlandi</option>
      </select>
    </form>
  );
}
