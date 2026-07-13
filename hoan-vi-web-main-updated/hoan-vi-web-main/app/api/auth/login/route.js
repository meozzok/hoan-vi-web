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

    // My ID (dãy số bot cấp) giờ là BẮT BUỘC cho mọi lượt đăng nhập — không
    // còn cho phép đăng nhập chỉ bằng tên gợi nhớ, để tránh nhầm lẫn giữa các
    // khách trùng tên.
    if (!myId) {
      return NextResponse.json(
        { error: "Vui lòng nhập My ID (dãy số bot cấp) để đăng nhập." },
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

    // Dùng upsert (INSERT ... ON CONFLICT) để gộp "tìm + tạo/ghi đè" thành
    // MỘT round-trip duy nhất tới Supabase thay vì 2 round-trip (select rồi
    // update/insert riêng) như trước — đây là điểm chính giúp đăng nhập
    // nhanh hơn rõ rệt.
    const { data: upserted, error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          my_id: myId,
          // Chỉ ghi đè tên gợi nhớ khi khách CÓ nhập tên mới ở lượt này —
          // nếu bỏ trống, giữ nguyên tên gợi nhớ khách đã đặt trước đó
          // (nhờ không đưa field này vào payload, cột display_name không bị
          // ON CONFLICT UPDATE đụng tới).
          ...(nickname ? { display_name: nickname } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "my_id" }
      )
      .select("my_id, display_name")
      .single();

    if (upsertError) throw upsertError;

    // Tài khoản mới toanh, chưa từng đặt tên gợi nhớ và lần này cũng không
    // nhập tên → hiển thị tạm "Anh / Chị" thay vì để trống hay hiện My ID.
    const user = {
      my_id: upserted.my_id,
      display_name: upserted.display_name || "Anh / Chị",
    };

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
