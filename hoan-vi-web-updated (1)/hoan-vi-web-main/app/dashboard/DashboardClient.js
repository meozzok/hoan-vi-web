"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Bot dùng chữ trạng thái tự do (vd "Hoàn thành", "Chờ xử lý", "Đã huỷ"...)
// nên map theo từ khoá thay vì enum cố định, phòng khi bot đổi cách gọi.
function statusMeta(trangThai) {
  const s = (trangThai || "").toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy")) return { bg: "bg-danger/15", text: "text-danger" };
  if (s.includes("hoàn thành")) return { bg: "bg-mint/20", text: "text-mint" };
  return { bg: "bg-gold/15", text: "text-gold" };
}

function formatVnd(amount) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount || 0) + "đ";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default function DashboardClient({ user, initialOrders, initialWallet }) {
  const router = useRouter();
  const [orders] = useState(initialOrders || []);
  const [wallet] = useState(initialWallet);
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [convertedUrl, setConvertedUrl] = useState("");
  const [productInfo, setProductInfo] = useState(null);
  const [convertError, setConvertError] = useState("");
  const [converting, setConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleConvert(e) {
    e.preventDefault();
    setConvertError("");
    setConvertedUrl("");
    setProductInfo(null);
    setCopied(false);
    setConverting(true);
    try {
      const res = await fetch("/api/convert-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopeeUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConvertError(data.error || "Không thể chuyển link này.");
      } else {
        setConvertedUrl(data.convertedUrl);
        setProductInfo({
          productName: data.productName,
          commissionStr: data.commissionStr,
          commissionPct: data.commissionPct,
          image: data.image,
        });
      }
    } catch {
      setConvertError("Không thể kết nối máy chủ.");
    } finally {
      setConverting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(convertedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: convertedUrl, title: "Link hoàn tiền Shopee" });
      } catch {
        // Người dùng huỷ chia sẻ, bỏ qua
      }
    } else {
      handleCopy();
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
              <span className="font-display font-bold text-ink text-xs">%</span>
            </div>
            <span className="font-display font-semibold tracking-tight">Hoàn Ví</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-panel border border-border rounded-full pl-2.5 sm:pl-3 pr-1 py-1">
              <span className="hidden sm:inline text-xs text-muted">My ID</span>
              <span className="font-mono-num text-[11px] sm:text-xs bg-panel-2 rounded-full px-2 sm:px-2.5 py-1 text-gold max-w-[84px] sm:max-w-none truncate">
                {user.myId}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs sm:text-sm text-muted hover:text-cream transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loggingOut ? "Đang thoát..." : "Đăng xuất"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Chào {user.displayName || user.myId} 👋
          </h1>
          <p className="text-muted text-sm mt-1">
            Dán link Shopee bên dưới, hệ thống tự gắn My ID của bạn để tra cứu hoàn tiền.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Bộ chuyển link Shopee */}
          <div className="lg:col-span-3 bg-panel border border-border rounded-2xl p-6 sm:p-7">
            <h2 className="font-display font-semibold text-lg mb-1">Chuyển link Shopee</h2>
            <p className="text-muted text-sm mb-5">
              Dán link sản phẩm hoặc shop trên Shopee để tạo link hoàn tiền của riêng bạn.
            </p>

            <form onSubmit={handleConvert} className="space-y-3">
              <input
                type="url"
                required
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                placeholder="https://shopee.vn/..."
                className="w-full bg-surface border border-border rounded-lg px-3.5 py-3 text-base sm:text-sm outline-none focus:border-gold transition-colors placeholder:text-muted/60"
              />
              <button
                type="submit"
                disabled={converting}
                className="w-full sm:w-auto bg-gold hover:bg-gold-soft text-ink font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {converting ? "Đang chuyển..." : "Chuyển link"}
              </button>
            </form>

            {convertError && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mt-4">
                {convertError}
              </p>
            )}

            {convertedUrl && (
              <div className="mt-5 bg-surface border border-border rounded-lg p-4">
                {productInfo && (productInfo.image || productInfo.productName) && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/60">
                    {productInfo.image ? (
                      <img
                        src={productInfo.image}
                        alt={productInfo.productName || "Sản phẩm Shopee"}
                        className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-panel-2 border border-border shrink-0 flex items-center justify-center text-muted text-xs">
                        Không ảnh
                      </div>
                    )}
                    <div className="min-w-0">
                      {productInfo.productName && (
                        <p className="text-sm font-medium truncate">
                          {productInfo.productName}
                        </p>
                      )}
                      <p className="text-xs text-muted mt-0.5">
                        Hoa hồng:{" "}
                        <span className="text-gold font-mono-num">
                          {productInfo.commissionStr}
                        </span>{" "}
                        ({productInfo.commissionPct})
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted mb-2">Link hoàn tiền của bạn</p>
                <div className="font-mono-num text-xs sm:text-sm text-mint bg-ink/40 rounded-md px-3 py-2.5 overflow-x-auto scrollbar-thin whitespace-nowrap">
                  {convertedUrl}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none bg-panel-2 hover:bg-border text-cream text-xs font-medium rounded-md px-3.5 py-2.5 sm:py-2 transition-colors cursor-pointer"
                  >
                    {copied ? "Đã chép ✓" : "Sao chép"}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 sm:flex-none bg-gold hover:bg-gold-soft text-ink text-xs font-semibold rounded-md px-3.5 py-2.5 sm:py-2 transition-colors cursor-pointer"
                  >
                    Chia sẻ
                  </button>
                </div>
                <p className="text-xs text-muted mt-2">
                  Đơn hàng phát sinh từ link này sẽ tự động gắn với My ID{" "}
                  <span className="text-gold font-mono-num">{user.myId}</span> để bạn theo dõi bên dưới.
                </p>
              </div>
            )}
          </div>

          {/* Ví tiền - kiểu vé/biên lai, giống hệt lệnh #vitien của bot */}
          <div className="lg:col-span-2 ticket-notch bg-panel border border-border rounded-2xl overflow-hidden">
            <div className="p-6 sm:p-7">
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Có thể rút hiện</p>
              <p className="font-display font-bold text-4xl text-gold tabular-nums">
                {wallet ? formatVnd(wallet.coTheRutHien) : "—"}
              </p>
              <p className="text-xs text-muted mt-2">
                {wallet
                  ? "Đơn đã hoàn thành ≥ 3 ngày, trừ phần đã nhận"
                  : "Chưa có dữ liệu ví cho My ID này — hãy đợi lần đồng bộ tiếp theo"}
              </p>
            </div>
            {wallet && (
              <>
                <div className="ticket-dashed" />
                <div className="p-6 sm:p-7 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted mb-1">Đang chờ</p>
                    <p className="font-mono-num text-lg font-semibold">{formatVnd(wallet.dangCho)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Hoàn thành chưa rút</p>
                    <p className="font-mono-num text-lg font-semibold">
                      {formatVnd(wallet.hoanThanhChuaRut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Có thể rút</p>
                    <p className="font-mono-num text-lg font-semibold text-mint">
                      {formatVnd(wallet.coTheRut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Đã nhận</p>
                    <p className="font-mono-num text-lg font-semibold">{formatVnd(wallet.daNhan)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Đơn hàng */}
        <div className="mt-6 bg-panel border border-border rounded-2xl overflow-hidden">
          <div className="p-6 sm:p-7 pb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-lg">Đơn hàng theo My ID</h2>
              <p className="text-muted text-sm mt-0.5">Tra cứu theo sub_id {user.myId}</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="px-7 pb-10 text-center">
              <p className="text-muted text-sm">
                Chưa tìm thấy đơn hàng của bạn 😿 Hãy quay lại kiểm tra vào sáng ngày mai khi có thông
                báo chuyển đổi từ Shopee, hoặc đảm bảo My ID của bạn khớp với sub_id trong file đã upload.
              </p>
            </div>
          ) : (
            <>
              {/* Dạng thẻ - dùng trên điện thoại */}
              <div className="sm:hidden divide-y divide-border/60 border-t border-border">
                {orders.map((order) => {
                  const meta = statusMeta(order.status);
                  return (
                    <div key={order.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{order.productName}</p>
                          <p className="font-mono-num text-xs text-muted mt-0.5">{order.id || "—"}</p>
                        </div>
                        <span className={`status-pill shrink-0 ${meta.bg} ${meta.text}`}>
                          {order.status || "—"}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <p className="text-[11px] text-muted">Ngày đặt</p>
                          <p className="font-mono-num text-sm">{formatDate(order.orderedAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted">Hoa hồng</p>
                          <p className="font-mono-num text-sm text-gold">
                            {formatVnd(order.commission)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dạng bảng - dùng từ màn hình sm trở lên */}
              <div className="hidden sm:block overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left font-medium px-7 py-3">Mã đơn</th>
                      <th className="text-left font-medium px-4 py-3">Sản phẩm</th>
                      <th className="text-right font-medium px-4 py-3">Hoa hồng</th>
                      <th className="text-left font-medium px-4 py-3">Trạng thái</th>
                      <th className="text-right font-medium px-7 py-3">Ngày đặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const meta = statusMeta(order.status);
                      return (
                        <tr key={order.id} className="border-t border-border/60">
                          <td className="px-7 py-3.5 font-mono-num text-xs text-muted">
                            {order.id || "—"}
                          </td>
                          <td className="px-4 py-3.5">{order.productName}</td>
                          <td className="px-4 py-3.5 text-right font-mono-num text-gold">
                            {formatVnd(order.commission)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`status-pill ${meta.bg} ${meta.text}`}>
                              {order.status || "—"}
                            </span>
                          </td>
                          <td className="px-7 py-3.5 text-right text-muted text-xs">
                            {formatDate(order.orderedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-8">
          Đơn hàng &amp; ví tiền được đồng bộ trực tiếp từ dữ liệu bot (phuongthaovip-main /
          bot_v23.py) theo My ID = sub_id của bạn.
        </p>
      </div>
    </main>
  );
}
