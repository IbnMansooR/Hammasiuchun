import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** True while `next build` prerenders pages: there may be no DB, so shared
 * chrome (footer settings/counts) uses defaults instead of querying. */
export const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
