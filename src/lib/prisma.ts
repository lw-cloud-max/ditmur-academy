import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (databaseUrl.startsWith("prisma+postgres://")) {
  console.warn(
    "Detected a Prisma Data Platform URL. Replace DATABASE_URL with a standard PostgreSQL URL such as postgresql://postgres:postgres@localhost:5432/school_app?schema=public"
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
