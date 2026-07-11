import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const myId = (body.myId || "").trim();
    const password = body.password || "";

    if (!myId || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập My ID và mật khẩu." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("my_id, password_hash, display_name")
      .eq("my_id", myId)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return NextResponse.json(
        { error: "My ID hoặc mật khẩu không đúng." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "My ID hoặc mật khẩu không đúng." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      myId: user.my_id,
      displayName: user.display_name,
    });

    const response = NextResponse.json({
      myId: user.my_id,
      displayName: user.display_name,
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
