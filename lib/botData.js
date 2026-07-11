import { getSupabaseAdmin } from "@/lib/supabase";

const VALID_KEYS = ["donhang_by_subid", "vitien_by_subid", "danhan_by_subid"];

export function keyForType(type) {
  return `${type}_by_subid`;
}

/** Đọc 1 blob JSON (donhang_by_subid | vitien_by_subid | danhan_by_subid). */
export async function getBotData(key) {
  if (!VALID_KEYS.includes(key)) {
    throw new Error(`bot_data key không hợp lệ: ${key}`);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_data")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data?.value || {};
}

/** Đọc cả 3 blob cùng lúc — dùng cho trang dashboard. */
export async function getAllBotData() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_data")
    .select("key, value")
    .in("key", VALID_KEYS);

  if (error) throw error;

  const byKey = Object.fromEntries((data || []).map((row) => [row.key, row.value || {}]));
  return {
    donhang: byKey["donhang_by_subid"] || {},
    vitien: byKey["vitien_by_subid"] || {},
    danhan: byKey["danhan_by_subid"] || {},
  };
}

/** Ghi đè 1 blob JSON (được gọi từ /api/sync-data khi phuongthaovip/bot đẩy dữ liệu lên).
 *
 * Gọi thẳng REST API của Supabase bằng fetch() thay vì qua client supabase-js —
 * để tránh trường hợp thư viện client dựng/parse request sai với payload lớn,
 * và để đọc được nguyên văn lỗi thật từ Postgrest khi có sự cố (thay vì bị
 * supabase-js rút gọn thành {code, details: null, hint: null}).
 */
export async function setBotData(type, value) {
  if (!["donhang", "vitien", "danhan"].includes(type)) {
    throw new Error(`type không hợp lệ: ${type}`);
  }
  const key = keyForType(type);

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong biến môi trường.");
  }

  const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const count = Object.keys(safeValue).length;

  const row = {
    key,
    value: safeValue,
    count,
    updated_at: new Date().toISOString(),
  };
  const bodyStr = JSON.stringify([row]);

  // Quét ký tự điều khiển bất thường (control chars ngoài \n \r \t) có thể lọt
  // vào JSON hợp lệ về mặt cú pháp nhưng khiến parser của Postgrest từ chối.
  const badCharMatch = bodyStr.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
  if (badCharMatch) {
    const idx = badCharMatch.index;
    console.error("[setBotData] Phát hiện ký tự điều khiển bất thường trong JSON:", {
      key,
      charCode: badCharMatch[0].charCodeAt(0),
      position: idx,
      context: bodyStr.slice(Math.max(0, idx - 60), idx + 60),
    });
  }

  console.log("[setBotData] Chuẩn bị gửi lên Supabase:", {
    key,
    count,
    payloadBytes: Buffer.byteLength(bodyStr, "utf8"),
    hasControlChar: !!badCharMatch,
  });

  const res = await fetch(`${url}/rest/v1/bot_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: bodyStr,
  });

  if (!res.ok) {
    const rawText = await res.text().catch(() => "(không đọc được response body)");

    // Tự test: gửi 1 payload rất nhỏ lên cùng bảng để biết lỗi do KÍCH THƯỚC
    // hay do NỘI DUNG dữ liệu thật gây ra.
    let probeResult = "chưa chạy";
    try {
      const probeBody = JSON.stringify([
        { key: "__probe_test__", value: { ok: true }, count: 1, updated_at: new Date().toISOString() },
      ]);
      const probeRes = await fetch(`${url}/rest/v1/bot_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: probeBody,
      });
      probeResult = probeRes.ok
        ? "THÀNH CÔNG (vậy lỗi do NỘI DUNG dữ liệu thật, không phải do kích thước/kết nối)"
        : `THẤT BẠI luôn (status ${probeRes.status}) — vậy lỗi không liên quan tới nội dung donhang/vitien`;
    } catch (probeErr) {
      probeResult = `Lỗi khi tự test: ${probeErr.message}`;
    }

    console.error("[setBotData] Supabase REST trả lỗi:", {
      key,
      count,
      status: res.status,
      statusText: res.statusText,
      rawResponseBody: rawText,
      probeResult,
    });
    throw new Error(`Supabase REST lỗi ${res.status}: ${rawText}`);
  }

  return { key, count };
}
