import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, shopee_order_id, product_name, order_amount, cashback_amount, status, ordered_at")
      .eq("my_id", currentUser.myId)
      .order("ordered_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      orders: (orders || []).map((o) => ({
        id: o.id,
        shopeeOrderId: o.shopee_order_id,
        productName: o.product_name,
        orderAmount: Number(o.order_amount),
        cashbackAmount: Number(o.cashback_amount),
        status: o.status,
        orderedAt: o.ordered_at,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Có lỗi xảy ra." }, { status: 500 });
  }
}
