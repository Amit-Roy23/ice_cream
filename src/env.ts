import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters long").optional(),
  JWT_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().optional(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  // In production runtime (or when building if DB is not mocked), fail with clear message
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
    throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  AUTH_SECRET: process.env.AUTH_SECRET || process.env.JWT_SECRET || "default-demo-secret-key-32-chars-long-minimum",
  NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};
