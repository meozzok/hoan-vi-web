import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();

    if (!username) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập của bạn." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("my_id, username, display_name")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy tên đăng nhập này. Vui lòng kiểm tra lại hoặc dùng \"Bạn quên tên đăng nhập?\".",
        },
        { status: 401 }
      );
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
