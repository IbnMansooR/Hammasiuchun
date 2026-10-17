import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { restrictedWhere, unrestrictedWhere, statusOf, signInMethods, displayName } from "@/lib/userStatus";
import Notice from "@/components/admin/Notice";
import { IconSearch } from "@/components/Icons";

export const metadata = { title: "Admin — Foydalanuvchilar" };

const PER_PAGE = 50;
const DAY = 24 * 60 * 60 * 1000;
const FILTERS = [
  { key: "", label: "Hammasi" },
  { key: "active", label: "Faol" },
  { key: "restricted", label: "Cheklangan" },
] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = sp.status === "active" || sp.status === "restricted" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();

  const and: Prisma.UserWhereInput[] = [];
  if (status === "restricted") and.push(restrictedWhere(now));
  if (status === "active") and.push(unrestrictedWhere(now));
  if (q) {
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        // A long digit string is a phone number, not an ID (Int overflows past 2^31).
        ...(/^\d{1,9}$/.test(q) ? [{ id: Number(q) }] : []),
      ],
    });
  }
  const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

  const [total, weekNew, active30, restricted, found, users] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    db.user.count({ where: { lastLoginAt: { gte: new Date(now.getTime() - 30 * DAY) } } }),
    db.user.count({ where: restrictedWhere(now) }),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, name: true, email: true, phone: true, googleId: true, passwordHash: true,
        createdAt: true, lastLoginAt: true, blockedAt: true, blockedUntil: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(found / PER_PAGE));
  const href = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q, status, page: 1, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) u.set(k, String(v));
    const s = u.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Foydalanuvchilar</h1>
          <p className="adm-sub">Roʻyxatdan oʻtganlar, ularning holati va cheklovlari.</p>
        </div>
        <Link href="/admin/notifications" className="btn btn-sm">Hammaga xabar yuborish</Link>
      </div>
      {sp.ok === "deleted" && <Notice>Foydalanuvchi oʻchirildi.</Notice>}

      <div className="stat-grid">
        <div className="stat"><div className="n">{formatNumber(total)}</div><div className="l">Jami</div></div>
        <div className="stat"><div className="n">{formatNumber(weekNew)}</div><div className="l">Soʻnggi 7 kunda yangi</div></div>
        <div className="stat"><div className="n">{formatNumber(active30)}</div><div className="l">30 kunda kirganlar</div></div>
        <div className="stat"><div className="n">{formatNumber(restricted)}</div><div className="l">Cheklangan</div></div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-filters" role="group" aria-label="Holat boʻyicha">
          {FILTERS.map((f) => (
            <Link key={f.key} href={href({ status: f.key })} className={`chip${status === f.key ? " active" : ""}`} aria-current={status === f.key ? "true" : undefined}>
              {f.label}
              {f.key === "restricted" && restricted > 0 && <span className="n">{restricted}</span>}
            </Link>
          ))}
        </div>
        <form className="search adm-search" action="/admin/users" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <IconSearch />
          <input type="search" name="q" defaultValue={q} placeholder="Ism, email, telefon yoki ID" aria-label="Foydalanuvchi qidirish" />
        </form>
      </div>

      <div className="adm-card">
        <table className="adm-table">
          <thead>
            <tr><th>Foydalanuvchi</th><th className="hide-sm">Kirish usuli</th><th className="hide-sm">Roʻyxatdan oʻtgan</th><th className="hide-sm">Oxirgi kirish</th><th>Holat</th><th className="hide-sm"><span className="sr-only">Amallar</span></th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const st = statusOf(u);
              const name = displayName(u);
              return (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="adm-user">
                      <span className="adm-avatar" aria-hidden="true">{name.replace(/^\+/, "").charAt(0).toUpperCase()}</span>
                      <span>
                        <strong>{name}</strong>
                        <span className="adm-meta">{[u.name ? u.email : null, u.phone && (u.name || u.email) ? `+${u.phone}` : null].filter(Boolean).join(" · ") || `ID ${u.id}`}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hide-sm"><div className="adm-tags">{signInMethods(u).map((m) => <span key={m} className="tag">{m}</span>)}</div></td>
                  <td className="nowrap hide-sm">{formatDate(u.createdAt)}</td>
                  <td className="nowrap hide-sm">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="muted">—</span>}</td>
                  <td><span className={st.cls}>{st.label}</span></td>
                  <td className="adm-act hide-sm"><Link href={`/admin/users/${u.id}`} className="chip">Ochish</Link></td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="adm-empty">{q || status ? "Hech kim topilmadi." : "Hali hech kim roʻyxatdan oʻtmagan."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="pager" aria-label="Sahifalar">
          {page > 1 && <Link href={href({ page: page - 1 })}>←</Link>}
          <span className="cur">{page} / {pages}</span>
          {page < pages && <Link href={href({ page: page + 1 })}>→</Link>}
        </nav>
      )}
    </>
  );
}
