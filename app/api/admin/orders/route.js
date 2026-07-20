import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";
import { getBotData } from "@/lib/botData";
import { listAdminOrders } from "@/lib/botLogic";
import { getCustomerNames } from "@/lib/adminNames";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifyAdminSessionToken(token) : null;
  if (!payload) {
    return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const [donhang, customerNames] = await Promise.all([
    getBotData("donhang_by_subid"),
    getCustomerNames(),
  ]);

  const orders = listAdminOrders(donhang);
  return NextResponse.json({ orders, customerNames });
}
