import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { isValidMyId } from "@/lib/shopee";

export async function POST(request) {
  try {
    const body = await request.json();
    const myId = (body.myId || "").trim();
    const password = body.password || "";
    const displayName = (body.displayName || "").trim() || myId;

    if (!isValidMyId(myId)) {
      return NextResponse.json(
        { error: "My ID phải dài 4-20 ký tự, chỉ gồm chữ, số và dấu gạch dưới." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("users")
      .select("my_id")
      .eq("my_id", myId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "My ID này đã được sử dụng, vui lòng chọn My ID khác." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { error: insertError } = await supabase.from("users").insert({
      my_id: myId,
      password_hash: passwordHash,
      display_name: displayName,
      wallet_balance: 0,
    });

    if (insertError) throw insertError;

    // Seed vài đơn hàng demo để bạn xem trước giao diện (xoá đoạn này khi có dữ liệu thật)
    await supabase.from("orders").insert([
      {
        my_id: myId,
        shopee_order_id: "DEMO" + Math.floor(100000 + Math.random() * 900000),
        product_name: "Đơn hàng mẫu - Áo thun basic",
        order_amount: 199000,
        cashback_amount: 9950,
        status: "pending",
      },
    ]);

    const token = await createSessionToken({ myId, displayName });
    const response = NextResponse.json({ myId, displayName });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
