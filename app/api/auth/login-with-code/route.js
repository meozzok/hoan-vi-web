import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { isValidMyId } from "@/lib/shopee";

// Đăng nhập bằng My ID + Mã đăng nhập dùng 1 lần (luồng "Quên tên đăng nhập").
export async function POST(request) {
  try {
    const body = await request.json();
    const myId = (body.myId || "").trim();
    const code = (body.code || "").trim();

    if (!myId || !code) {
      return NextResponse.json(
        { error: "Vui lòng nhập My ID và mã đăng nhập." },
        { status: 400 }
      );
    }

    if (!isValidMyId(myId)) {
      return NextResponse.json(
        { error: "My ID không hợp lệ, My ID chỉ gồm các chữ số." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("my_id, username, display_name")
      .eq("my_id", myId)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return NextResponse.json(
        { error: "My ID này chưa được đăng ký trong hệ thống." },
        { status: 404 }
      );
    }

    // Cập nhật mã đăng nhập thành "đã dùng" CHỈ KHI nó đang ở trạng thái chưa dùng.
    // Nếu không có dòng nào được cập nhật => mã sai hoặc đã bị dùng trước đó.
    const { data: updatedCode, error: codeError } = await supabase
      .from("login_codes")
      .update({ used: true, used_by: myId, used_at: new Date().toISOString() })
      .eq("code", code)
      .eq("used", false)
      .select("code")
      .maybeSingle();

    if (codeError) throw codeError;

    if (!updatedCode) {
      const { data: existingCode } = await supabase
        .from("login_codes")
        .select("used")
        .eq("code", code)
        .maybeSingle();

      const message = existingCode
        ? "Mã đăng nhập này đã được sử dụng trước đó."
        : "Mã đăng nhập không đúng. Vui lòng kiểm tra lại.";

      return NextResponse.json({ error: message }, { status: 401 });
    }

    const token = await createSessionToken({
      myId: user.my_id,
      displayName: user.display_name || user.username,
    });

    const response = NextResponse.json({
      myId: user.my_id,
      displayName: user.display_name || user.username,
      username: user.username,
    });
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
      { error: "Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
