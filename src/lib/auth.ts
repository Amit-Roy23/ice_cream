import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./prisma";
import { env } from "@/env";

const SECRET_KEY = env.AUTH_SECRET;
const key = new TextEncoder().encode(SECRET_KEY);

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get("auth_token")?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("auth_token")?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;

  const user = await verifyToken(token);
  if (!user) return null;

  // Verify active user in DB
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  if (!dbUser || !dbUser.active) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as Role,
  };
}

export async function requireAuth(req?: NextRequest): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(allowedRoles: Role[], req?: NextRequest): Promise<SessionUser> {
  const user = await requireAuth(req);
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Strips sensitive financial fields (purchase prices & commission %)
 * from products/companies when returning to Manager or Staff.
 */
export function sanitizeForRole<T>(data: T, role: Role): T {
  if (role === "ADMIN") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForRole(item, role)) as unknown as T;
  }

  if (data !== null && typeof data === "object") {
    const copy = { ...data } as Record<string, unknown>;
    if ("purchasePrice" in copy) {
      delete copy.purchasePrice;
    }
    if ("commissionPercent" in copy) {
      delete copy.commissionPercent;
    }
    if ("commissionAmount" in copy) {
      delete copy.commissionAmount;
    }
    if ("stockValueAtCost" in copy) {
      delete copy.stockValueAtCost;
    }
    return copy as T;
  }

  return data;
}
