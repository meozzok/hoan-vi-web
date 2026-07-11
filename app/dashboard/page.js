import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { getSupabaseAdmin } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";

async function loadDashboardData(myId) {
  const supabase = getSupabaseAdmin();

  const [{ data: user }, { data: orders }] = await Promise.all([
    supabase
      .from("users")
      .select("my_id, display_name, wallet_balance, created_at")
      .eq("my_id", myId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, shopee_order_id, product_name, order_amount, cashback_amount, status, ordered_at")
      .eq("my_id", myId)
      .order("ordered_at", { ascending: false }),
  ]);

  return {
    user: user
      ? {
          myId: user.my_id,
          displayName: user.display_name,
          walletBalance: Number(user.wallet_balance),
          createdAt: user.created_at,
        }
      : null,
    orders: (orders || []).map((o) => ({
      id: o.id,
      shopeeOrderId: o.shopee_order_id,
      productName: o.product_name,
      orderAmount: Number(o.order_amount),
      cashbackAmount: Number(o.cashback_amount),
      status: o.status,
      orderedAt: o.ordered_at,
    })),
  };
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { user, orders } = await loadDashboardData(currentUser.myId);
  if (!user) redirect("/login");

  return <DashboardClient user={user} initialOrders={orders} />;
}
