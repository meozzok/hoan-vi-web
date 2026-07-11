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
    });

    if (insertError) throw insertError;

    // Không seed đơn hàng demo nữa — đơn hàng & ví tiền của My ID này sẽ tự
    // xuất hiện ngay khi phuongthaovip-main/bot đồng bộ dữ liệu có sub_id trùng My ID.

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
