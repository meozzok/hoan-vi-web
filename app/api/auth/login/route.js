import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { isValidMyId } from "@/lib/shopee";

function respondWithSession(user) {
  return { myId: user.my_id, displayName: user.display_name };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nickname = (body.nickname || "").trim();
    const myId = (body.myId || "").trim();

    if (!nickname && !myId) {
      return NextResponse.json(
        { error: "Vui lòng nhập Tên gợi nhớ hoặc My ID." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let user;

    if (myId) {
      // Đăng nhập / tự tạo tài khoản bằng My ID.
      if (!isValidMyId(myId)) {
        return NextResponse.json(
          { error: "My ID không hợp lệ. My ID chỉ gồm các chữ số do bot cấp." },
          { status: 400 }
        );
      }

      const { data: existing, error: findError } = await supabase
        .from("users")
        .select("my_id, display_name")
        .eq("my_id", myId)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        // My ID đã tồn tại — nếu tên gợi nhớ mới khác tên cũ thì ghi đè bằng tên mới nhất.
        const nextDisplayName = nickname || existing.display_name;
        const { data: updated, error: updateError } = await supabase
          .from("users")
          .update({ display_name: nextDisplayName, updated_at: new Date().toISOString() })
          .eq("my_id", myId)
          .select("my_id, display_name")
          .single();
        if (updateError) throw updateError;
        user = updated;
      } else {
        // My ID chưa từng đăng nhập — tạo tài khoản mới ngay lần này.
        const { data: created, error: insertError } = await supabase
          .from("users")
          .insert({
            my_id: myId,
            display_name: nickname || myId,
            updated_at: new Date().toISOString(),
          })
          .select("my_id, display_name")
          .single();
        if (insertError) throw insertError;
        user = created;
      }
    } else {
      // Chỉ có tên gợi nhớ (đăng nhập lại không cần lấy lại My ID) —
      // tìm tài khoản có tên gợi nhớ này, ưu tiên tài khoản đăng nhập gần nhất.
      const { data: matches, error: findError } = await supabase
        .from("users")
        .select("my_id, display_name")
        .eq("display_name", nickname)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (findError) throw findError;

      if (!matches || matches.length === 0) {
        return NextResponse.json(
          {
            error:
              "Không tìm thấy tên gợi nhớ này. Vui lòng đăng nhập bằng My ID để bắt đầu.",
          },
          { status: 404 }
        );
      }

      user = matches[0];
      const { error: touchError } = await supabase
        .from("users")
        .update({ updated_at: new Date().toISOString() })
        .eq("my_id", user.my_id);
      if (touchError) throw touchError;
    }

    const token = await createSessionToken({
      myId: user.my_id,
      displayName: user.display_name,
    });

    const response = NextResponse.json(respondWithSession(user));
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
