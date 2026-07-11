/**
 * DEMO: Chuyển link Shopee thường thành link hoàn tiền bằng cách gắn My ID
 * làm sub_id để tra cứu đơn hàng / ví tiền sau này.
 *
 * ⚠️ Đây là bản demo. Khi có API / code Shopee Affiliate thật, hãy thay
 * toàn bộ nội dung hàm `convertShopeeLink` bằng lệnh gọi API thật, ví dụ:
 *
 *   const res = await fetch("https://open-api.affiliate.shopee.vn/...", {
 *     method: "POST",
 *     headers: { Authorization: `Bearer ${process.env.SHOPEE_API_KEY}` },
 *     body: JSON.stringify({ originUrl: shopeeUrl, subId: myId }),
 *   });
 *   const data = await res.json();
 *   return data.shortLink;
 */
export function convertShopeeLink(shopeeUrl, myId) {
  let parsed;
  try {
    parsed = new URL(shopeeUrl);
  } catch {
    throw new Error("Link Shopee không hợp lệ.");
  }

  const isShopeeHost = /(^|\.)shopee\.(vn|com|co\.id|com\.my|ph|sg|tw|th|com\.br)$|(^|\.)shp\.ee$/i.test(
    parsed.hostname
  );
  if (!isShopeeHost) {
    throw new Error("Vui lòng nhập link thuộc trang Shopee.");
  }

  parsed.searchParams.set("af_sub_id", myId);
  parsed.searchParams.set("sub_id", myId);
  parsed.searchParams.set("utm_source", "cashback_myid");

  return parsed.toString();
}

export function isValidMyId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_]{4,20}$/.test(value);
}
