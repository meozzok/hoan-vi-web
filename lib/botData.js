// lib/botData.js
//
// Lưu dữ liệu bot (donhang_by_subid / vitien_by_subid / danhan_by_subid)
// trong Upstash Redis (REST API) — cùng cách và cùng tên khoá mà
// phuongthaovip-main đang dùng (xem pages/api/upload.js và
// pages/api/data/[type].js bên đó), để 2 web có thể chia sẻ cùng một chỗ
// lưu trữ nếu trỏ chung một Upstash Redis, và để cách lưu trữ đồng nhất
// giữa 2 dự án.
//
// Bảng "users" (đăng ký/đăng nhập My ID) vẫn nằm trong Supabase như cũ,
// KHÔNG đổi — xem lib/supabase.js. File này chỉ thay chỗ lưu của riêng
// donhang/vitien/danhan.

const VALID_KEYS = ["donhang_by_subid", "vitien_by_subid", "danhan_by_subid"];
const VALID_TYPES = ["donhang", "vitien", "danhan"];

export function keyForType(type) {
  return `${type}_by_subid`;
}

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Thiếu UPSTASH_REDIS_REST_URL hoặc UPSTASH_REDIS_REST_TOKEN trong biến môi trường."
    );
  }
  return { url, token };
}

/** Đọc 1 khoá bất kỳ trong Upstash Redis, tự parse JSON nếu value là chuỗi JSON. */
async function kvGet(key) {
  const { url, token } = upstashConfig();
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash GET "${key}" lỗi ${res.status}: ${text}`);
  }
  const json = await res.json();
  let result = json.result ?? null;
  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      return null;
    }
  }
  return result;
}

/** Ghi 1 khoá bất kỳ trong Upstash Redis (value được JSON.stringify trước khi lưu). */
async function kvSet(key, value) {
  const { url, token } = upstashConfig();
  const valueStr = typeof value === "string" ? value : JSON.stringify(value);
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(valueStr),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash SET "${key}" lỗi ${res.status}: ${text}`);
  }
  return true;
}

/** Đọc 1 blob JSON (donhang_by_subid | vitien_by_subid | danhan_by_subid). */
export async function getBotData(key) {
  if (!VALID_KEYS.includes(key)) {
    throw new Error(`bot_data key không hợp lệ: ${key}`);
  }
  const data = await kvGet(key);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

/** Đọc cả 3 blob cùng lúc — dùng cho trang dashboard. */
export async function getAllBotData() {
  const [donhang, vitien, danhan] = await Promise.all([
    getBotData("donhang_by_subid"),
    getBotData("vitien_by_subid"),
    getBotData("danhan_by_subid"),
  ]);
  return { donhang, vitien, danhan };
}

/** Ghi đè 1 blob JSON (được gọi từ /api/sync-data khi phuongthaovip/bot đẩy dữ liệu lên). */
export async function setBotData(type, value) {
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`type không hợp lệ: ${type}`);
  }
  const key = keyForType(type);
  const safeValue =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const count = Object.keys(safeValue).length;
  const updated_at = new Date().toISOString();

  console.log("[setBotData] Chuẩn bị ghi vào Upstash Redis:", { key, count });

  await kvSet(key, safeValue);
  // Lưu thêm meta_<type> giống hệt phuongthaovip-main, để dễ kiểm tra lần
  // đồng bộ gần nhất từ Upstash console nếu cần.
  await kvSet(`meta_${type}`, { updated_at, count });

  return { key, count };
}
