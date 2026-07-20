import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";
import { setCustomerName } from "@/lib/adminNames";

export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifyAdminSessionToken(token) : null;
  if (!payload) {
    return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const name = typeof body?.name === "string" ? body.name : "";

  if (!orderId) {
    return NextResponse.json({ error: "Thiếu orderId." }, { status: 400 });
  }

  try {
    const customerNames = await setCustomerName(orderId, name);
    return NextResponse.json({ ok: true, customerNames });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Lưu tên khách thất bại." },
      { status: 500 }
    );
  }
}
