import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    // Perform simple query to verify database connectivity
    await prisma.$queryRaw`SELECT 1 as health`;
    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      latencyMs: latency,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
