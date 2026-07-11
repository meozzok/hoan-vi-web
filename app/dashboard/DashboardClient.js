"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_META = {
  pending: { label: "Chờ xác nhận", bg: "bg-gold/15", text: "text-gold" },
  confirmed: { label: "Đã xác nhận", bg: "bg-mint/15", text: "text-mint" },
  paid: { label: "Đã cộng ví", bg: "bg-mint/25", text: "text-mint" },
  cancelled: { label: "Đã huỷ", bg: "bg-danger/15", text: "text-danger" },
};

function formatVnd(amount) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount) + "đ";
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function DashboardClient({ user, initialOrders }) {
  const router = useRouter();
  const [orders] = useState(initialOrders);
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [convertedUrl, setConvertedUrl] = useState("");
  const [convertError, setConvertError] = useState("");
  const [converting, setConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending");
    const pendingCashback = pending.reduce((sum, o) => sum + o.cashbackAmount, 0);
    return {
      totalOrders: orders.length,
      pendingCount: pending.length,
      pendingCashback,
    };
  }, [orders]);

  async function handleConvert(e) {
    e.preventDefault();
    setConvertError("");
    setConvertedUrl("");
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

          {/* Ví tiền - kiểu vé/biên lai */}
          <div className="lg:col-span-2 ticket-notch bg-panel border border-border rounded-2xl overflow-hidden">
            <div className="p-6 sm:p-7">
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Ví hoàn tiền</p>
              <p className="font-display font-bold text-4xl text-gold tabular-nums">
                {formatVnd(user.walletBalance)}
              </p>
              <p className="text-xs text-muted mt-2">Số dư đã được cộng vào ví, có thể rút</p>
            </div>
            <div className="ticket-dashed" />
            <div className="p-6 sm:p-7 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Tổng đơn hàng</p>
                <p className="font-mono-num text-lg font-semibold">{stats.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Chờ hoàn tiền</p>
                <p className="font-mono-num text-lg font-semibold text-gold">
                  {formatVnd(stats.pendingCashback)}
                </p>
              </div>
            </div>
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
                Chưa có đơn hàng nào. Chuyển link Shopee ở trên và bắt đầu mua sắm để thấy đơn hàng tại đây.
              </p>
            </div>
          ) : (
            <>
              {/* Dạng thẻ - dùng trên điện thoại */}
              <div className="sm:hidden divide-y divide-border/60 border-t border-border">
                {orders.map((order) => {
                  const meta = STATUS_META[order.status] || STATUS_META.pending;
                  return (
                    <div key={order.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{order.productName}</p>
                          <p className="font-mono-num text-xs text-muted mt-0.5">
                            {order.shopeeOrderId || "—"}
                          </p>
                        </div>
                        <span className={`status-pill shrink-0 ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <p className="text-[11px] text-muted">Giá trị đơn</p>
                          <p className="font-mono-num text-sm">{formatVnd(order.orderAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted">Hoàn tiền</p>
                          <p className="font-mono-num text-sm text-gold">
                            {formatVnd(order.cashbackAmount)}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted mt-2">{formatDate(order.orderedAt)}</p>
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
                      <th className="text-right font-medium px-4 py-3">Giá trị đơn</th>
                      <th className="text-right font-medium px-4 py-3">Hoàn tiền</th>
                      <th className="text-left font-medium px-4 py-3">Trạng thái</th>
                      <th className="text-right font-medium px-7 py-3">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const meta = STATUS_META[order.status] || STATUS_META.pending;
                      return (
                        <tr key={order.id} className="border-t border-border/60">
                          <td className="px-7 py-3.5 font-mono-num text-xs text-muted">
                            {order.shopeeOrderId || "—"}
                          </td>
                          <td className="px-4 py-3.5">{order.productName}</td>
                          <td className="px-4 py-3.5 text-right font-mono-num">
                            {formatVnd(order.orderAmount)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono-num text-gold">
                            {formatVnd(order.cashbackAmount)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`status-pill ${meta.bg} ${meta.text}`}>{meta.label}</span>
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
          Đơn hàng &amp; ví tiền hiện đang dùng dữ liệu demo. Kết nối API Shopee Affiliate thật trong{" "}
          <span className="font-mono-num">lib/shopee.js</span> để tự động đồng bộ.
        </p>
      </div>
    </main>
  );
}
