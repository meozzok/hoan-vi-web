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

      // Dùng upsert (INSERT ... ON CONFLICT) để gộp "tìm + tạo/ghi đè" thành
      // MỘT round-trip duy nhất tới Supabase thay vì 2 round-trip (select rồi
      // update/insert riêng) như trước — đây là điểm chính giúp đăng nhập
      // nhanh hơn rõ rệt.
      const { data: upserted, error: upsertError } = await supabase
        .from("users")
        .upsert(
          {
            my_id: myId,
            ...(nickname ? { display_name: nickname } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "my_id" }
        )
        .select("my_id, display_name")
        .single();

      if (upsertError) throw upsertError;

      user = {
        my_id: upserted.my_id,
        display_name: upserted.display_name || nickname || upserted.my_id,
      };
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

      // Cập nhật "updated_at" chỉ phục vụ thống kê, KHÔNG ảnh hưởng tới việc
      // đăng nhập thành công hay không → không await, trả kết quả cho người
      // dùng ngay để đăng nhập nhanh hơn.
      supabase
        .from("users")
        .update({ updated_at: new Date().toISOString() })
        .eq("my_id", user.my_id)
        .then(({ error: touchError }) => {
          if (touchError) console.error("touch updated_at lỗi:", touchError);
        });
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
