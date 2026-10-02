import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireRole, sanitizeForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  commissionPercent: z.coerce.number().min(0, "Commission % must be non-negative").default(0),
  contact: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            products: true,
            purchases: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const sanitized = sanitizeForRole(companies, user.role);
    return NextResponse.json({ companies: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"], req);
    const body = await req.json();

    const parseResult = createCompanySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, commissionPercent, contact, active } = parseResult.data;

    const existing = await prisma.company.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A company with this name already exists" },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        commissionPercent,
        contact: contact ? contact.trim() : null,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json({ company, message: "Company created successfully" }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
