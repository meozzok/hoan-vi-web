// lib/adminNames.js
//
// Lưu "Tên khách" mà Admin tự gõ tay ở trang /admin, theo từng mã đơn
// (order_id). Đây KHÔNG phải dữ liệu thật từ bot/Shopee — chỉ là ghi chú
// nội bộ để Admin biết đơn nào của khách nào. Lưu trong cùng Upstash Redis
// mà lib/botData.js đang dùng (biến môi trường UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN), dưới 1 khoá riêng để không đụng vào dữ liệu
// donhang/vitien/danhan của bot.

const KEY = "admin_customer_names_by_order";

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

/** Đọc toàn bộ map { [orderId]: tenKhach }. Trả về {} nếu chưa có gì / lỗi. */
export async function getCustomerNames() {
  try {
    const { url, token } = upstashConfig();
    const res = await fetch(`${url}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const json = await res.json();
    let result = json.result ?? null;
    if (typeof result === "string") {
      try {
        result = JSON.parse(result);
      } catch {
        return {};
      }
    }
    return result && typeof result === "object" && !Array.isArray(result) ? result : {};
  } catch (err) {
    console.warn("[adminNames] getCustomerNames lỗi:", err?.message || err);
    return {};
  }
}

/**
 * Ghi tên khách cho 1 mã đơn. Truyền name rỗng để xoá lại (bỏ trống ô).
 * Trả về map mới nhất sau khi ghi.
 */
export async function setCustomerName(orderId, name) {
  if (!orderId) throw new Error("Thiếu orderId.");
  const { url, token } = upstashConfig();

  const current = await getCustomerNames();
  const next = { ...current };
  const trimmed = String(name ?? "").trim();
  if (trimmed) next[orderId] = trimmed;
  else delete next[orderId];

  const res = await fetch(`${url}/set/${KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(JSON.stringify(next)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash SET "${KEY}" lỗi ${res.status}: ${text}`);
  }
  return next;
}
