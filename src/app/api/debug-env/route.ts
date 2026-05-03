import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    APP_MODE: process.env.APP_MODE || "(not set)",
    ADMIN_EMAIL_set: !!process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD_set: !!process.env.ADMIN_PASSWORD,
    AUTH_SECRET_set: !!process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL || "(not set)",
    DATABASE_URL_set: !!process.env.DATABASE_URL,
  });
}
