import { NextResponse } from "next/server";
import { isPrivateMode } from "@/lib/app-mode";

export async function GET() {
  return NextResponse.json({
    mode: isPrivateMode() ? "private" : "server",
    allowRegister: !isPrivateMode(),
  });
}