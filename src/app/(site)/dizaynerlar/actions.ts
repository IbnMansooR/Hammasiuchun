"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { getCurrentUser } from "@/lib/userAuth";
import { hit, isLocked } from "@/lib/rateLimit";
import { normalizeUrl, splitLines, splitTags, uniqueWorkSlug } from "@/lib/works";

const MAX_IMAGES = 8;
const MAX_PENDING = 5;
const DAY = 24 * 60 * 60 * 1000;

export type SubmitResult = { error: string } | void;

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

/** A signed-in member sends a work. It is stored as pending and stays invisible until the admin approves it.
 * Problems come back as { error } (not a redirect) so the form keeps everything the member typed and uploaded. */
export async function submitWorkAction(fd: FormData): Promise<SubmitResult> {
  const user = await getCurrentUser(); // null for signed-out and blocked accounts alike
  if (!user) redirect("/login");

  const key = `submit:${user.id}`;
  if (await isLocked(key)) return { error: "limit" };
  if ((await db.work.count({ where: { submittedById: user.id, status: "pending" } })) >= MAX_PENDING) return { error: "pending" };

  const title = str(fd, "title").slice(0, 120);
  const authorName = str(fd, "authorName").slice(0, 120);
  if (title.length < 3) return { error: "title" };
  if (!authorName) return { error: "author" };
  const rawUrl = str(fd, "authorUrl");
  const authorUrl = normalizeUrl(rawUrl);
  if (rawUrl && !authorUrl) return { error: "link" };

  // Only images this member uploaded themselves: nothing hot-linked, nothing borrowed from someone else.
  const wanted = [...new Set(splitLines(str(fd, "images")))].slice(0, MAX_IMAGES);
  if (wanted.length === 0) return { error: "images" };
  const owned = await db.media.findMany({ where: { uploadedBy: user.id, url: { in: wanted } }, select: { url: true } });
  const ok = new Set(owned.map((m) => m.url));
  const images = wanted.filter((u) => ok.has(u));
  if (images.length !== wanted.length || images.length === 0) return { error: "images" };

  const asked = splitTags(str(fd, "fonts")).slice(0, 6);
  const fonts = asked.length
    ? (await db.family.findMany({ where: { ...PUBLIC_FAMILY, slug: { in: asked } }, select: { slug: true } })).map((f) => f.slug)
    : [];

  await db.work.create({
    data: {
      slug: await uniqueWorkSlug(title),
      title,
      summary: str(fd, "summary").slice(0, 300) || null,
      body: str(fd, "body").slice(0, 1500),
      kind: "member",
      authorName,
      authorUrl,
      coverImage: images[0],
      images: images.join("\n"),
      fonts: fonts.join(","),
      isPublished: false,
      status: "pending",
      submittedById: user.id,
    },
  });
  await hit(key, 5, DAY); // at most five submissions a day
  revalidatePath("/admin/works");
  redirect("/dizaynerlar/yuborish?sent=1");
}
