import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { isValidMyId, isValidUsername } from "@/lib/shopee";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();
    const myId = (body.myId || "").trim();

    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          error:
            "Tên đăng nhập không đúng định dạng. Vui lòng nhập theo dạng TênZalo-4 số cuối SĐT, ví dụ: PhuongThao-6789.",
        },
        { status: 400 }
      );
    }

    if (!isValidMyId(myId)) {
      return NextResponse.json(
        { error: "My ID không hợp lệ. My ID chỉ gồm các chữ số do bot cấp." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existingByMyId } = await supabase
      .from("users")
      .select("my_id")
      .eq("my_id", myId)
      .maybeSingle();

    if (existingByMyId) {
      return NextResponse.json(
        { error: "My ID này đã tồn tại." },
        { status: 409 }
      );
    }

    const { data: existingByUsername } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (existingByUsername) {
      return NextResponse.json(
        { error: "Tên đăng nhập này đã được sử dụng, vui lòng kiểm tra lại." },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from("users").insert({
      my_id: myId,
      username,
      display_name: username,
    });

    if (insertError) throw insertError;

    // Không seed đơn hàng demo nữa — đơn hàng & ví tiền của My ID này sẽ tự
    // xuất hiện ngay khi phuongthaovip-main/bot đồng bộ dữ liệu có sub_id trùng My ID.

    const token = await createSessionToken({ myId, displayName: username });
    const response = NextResponse.json({ myId, displayName: username, username });
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
