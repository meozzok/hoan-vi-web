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

/** Ghi đè 1 blob JSON (được gọi từ /api/sync-data khi phuongthaovip/bot đẩy dữ liệu lên). */
export async function setBotData(type, value) {
  if (!["donhang", "vitien", "danhan"].includes(type)) {
    throw new Error(`type không hợp lệ: ${type}`);
  }
  const key = keyForType(type);
  const supabase = getSupabaseAdmin();
  const count = value && typeof value === "object" ? Object.keys(value).length : 0;

  const { error } = await supabase.from("bot_data").upsert({
    key,
    value,
    count,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return { key, count };
}
