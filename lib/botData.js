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

async function tryUpsertProbe(url, serviceKey, probeValue) {
  const body = JSON.stringify([
    { key: "__probe_bisect__", value: probeValue, count: Object.keys(probeValue).length, updated_at: new Date().toISOString() },
  ]);
  const res = await fetch(`${url}/rest/v1/bot_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body,
  });
  return res.ok;
}

/** Chia đôi liên tục tập sub_id để tìm chính xác bản ghi nào gây lỗi JSON. */
async function bisectFindBadSubId(url, serviceKey, safeValue) {
  let keys = Object.keys(safeValue);
  let steps = 0;
  while (keys.length > 1 && steps < 12) {
    steps++;
    const mid = Math.ceil(keys.length / 2);
    const left = keys.slice(0, mid);
    const leftObj = Object.fromEntries(left.map((k) => [k, safeValue[k]]));
    const leftOk = await tryUpsertProbe(url, serviceKey, leftObj);
    keys = leftOk ? keys.slice(mid) : left;
  }
  return { subId: keys[0], steps };
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

  console.log("[setBotData] Chuẩn bị gửi lên Supabase:", {
    key,
    count,
    payloadBytes: Buffer.byteLength(bodyStr, "utf8"),
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

    // Chia đôi liên tục để tìm chính xác sub_id nào trong dữ liệu gây lỗi JSON.
    let bisectInfo = "chưa chạy";
    try {
      const { subId, steps } = await bisectFindBadSubId(url, serviceKey, safeValue);
      const badRecord = JSON.stringify(safeValue[subId]);
      bisectInfo = { subId, steps, badRecordPreview: badRecord.slice(0, 1000) };
    } catch (bisectErr) {
      bisectInfo = `Lỗi khi bisect: ${bisectErr.message}`;
    }

    console.error("[setBotData] Supabase REST trả lỗi:", {
      key,
      count,
      status: res.status,
      statusText: res.statusText,
      rawResponseBody: rawText,
      bisectInfo,
    });
    throw new Error(`Supabase REST lỗi ${res.status}: ${rawText}`);
  }

  return { key, count };
}
