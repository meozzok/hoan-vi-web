"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_THEME, getStoredTheme } from "../../lib/theme";

// Link nhóm Zalo nơi khách nhận My ID — dùng để khách gửi lệnh rút tiền vào nhóm.
const ZALO_GROUP_LINK = "https://zalo.me/g/msd7vvhjcwiffr3tyqor";

const PAGE_SIZE = 10;
const PAGE_WINDOW = 10;

// Bot dùng chữ trạng thái tự do (vd "Hoàn thành", "Chờ xử lý", "Đã huỷ"...)
// nên map theo từ khoá thay vì enum cố định, phòng khi bot đổi cách gọi.
function classifyStatus(trangThai) {
  const s = (trangThai || "").toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy")) return "cancelled";
  if (s.includes("hoàn thành")) return "completed";
  return "pending";
}

function statusMeta(trangThai) {
  const kind = classifyStatus(trangThai);
  if (kind === "cancelled") return { bg: "bg-danger/15", text: "text-danger" };
  if (kind === "completed") return { bg: "bg-mint/20", text: "text-mint" };
  return { bg: "bg-gold/15", text: "text-gold" };
}

const ORDER_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "completed", label: "Hoàn thành" },
  { id: "pending", label: "Đang chờ xử lý" },
  { id: "cancelled", label: "Đã hủy" },
];

// Chiết khấu hiển thị theo từng đơn: hoa hồng gốc -> trừ thuế 10% -> còn 80% hoa hồng.
function commissionBreakdown(grossCommission) {
  const gross = Number(grossCommission) || 0;
  const afterTax = Math.round(gross * 0.9);
  const final80 = Math.round(afterTax * 0.8);
  return { gross, afterTax, final80 };
}

function PasteIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

function CloseIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function LinkTabIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.36-1.36" />
    </svg>
  );
}

function OrdersTabIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function WalletTabIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CopyIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
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

const TABS = [
  { id: "link", label: "Tạo link", Icon: LinkTabIcon },
  { id: "orders", label: "Đơn hàng", Icon: OrdersTabIcon },
  { id: "wallet", label: "Ví Tiền", Icon: WalletTabIcon },
];

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
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [activeTab, setActiveTab] = useState("link");

  // Đơn hàng: lọc theo trạng thái + phân trang.
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [pageWindowStart, setPageWindowStart] = useState(0);

  // Ví tiền: yêu cầu rút.
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawCode, setWithdrawCode] = useState("");
  const [withdrawCopied, setWithdrawCopied] = useState(false);

  // Đồng bộ giao diện màu đã chọn ở trang đăng nhập.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ với localStorage, chỉ chạy 1 lần lúc mount
    setTheme(getStoredTheme());
  }, []);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter((o) => classifyStatus(o.status) === orderFilter);
  }, [orders, orderFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, orderPage]);

  function handleFilterChange(id) {
    setOrderFilter(id);
    setOrderPage(1);
    setPageWindowStart(0);
  }

  function goToPage(p) {
    setOrderPage(p);
  }

  function advancePageWindow() {
    setPageWindowStart((w) => Math.min(w + PAGE_WINDOW, Math.max(0, totalPages - 1)));
  }

  function retreatPageWindow() {
    setPageWindowStart((w) => Math.max(0, w - PAGE_WINDOW));
  }

  async function handlePasteUrl() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setShopeeUrl(text.trim());
    } catch {
      // Trình duyệt có thể chặn đọc clipboard — khách vẫn có thể tự dán (Ctrl/Cmd+V).
    }
  }

  function handleClearUrl() {
    setShopeeUrl("");
    setConvertedUrl("");
    setProductInfo(null);
    setConvertError("");
    setCopied(false);
  }

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

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleWithdrawRequest() {
    setWithdrawError("");
    setWithdrawCode("");
    setWithdrawCopied(false);
    const amount = Math.round(Number(withdrawAmount));
    const available = wallet ? wallet.coTheRutHien : 0;
    if (!amount || amount <= 0) {
      setWithdrawError("Vui lòng nhập số tiền muốn rút.");
      return;
    }
    if (amount > available) {
      setWithdrawError(`Số tiền vượt quá số dư có thể rút (${formatVnd(available)}).`);
      return;
    }
    setWithdrawCode(`#ruttien_${amount}`);
  }

  async function handleCopyWithdrawCode() {
    if (!withdrawCode) return;
    await navigator.clipboard.writeText(withdrawCode);
    setWithdrawCopied(true);
    setTimeout(() => setWithdrawCopied(false), 1800);
  }

  const displayName = user.displayName || user.myId;

  // Tiêu đề đầu trang đổi theo tab đang xem.
  let headerTitle = `Hello ${displayName}🌷`;
  let headerSubtitle = "Tiền kiếm khó lắm hãy tiết kiệm nhé!";
  if (activeTab === "orders") {
    headerTitle = `Các đơn hàng của ${displayName} 🛍️`;
    headerSubtitle = "";
  } else if (activeTab === "wallet") {
    headerTitle = `Tổng tiền hoa hồng của ${displayName} 🌷`;
    headerSubtitle = "";
  }

  return (
    <main className={`login-pink theme-${theme} min-h-screen`}>
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
              <span className="font-display font-bold text-ink text-xs">%</span>
            </div>
            <span className="font-display font-semibold tracking-tight">Mua Sắm Hoàn Tiền 🌷</span>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-28 sm:pb-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {headerTitle}
          </h1>
          {headerSubtitle && <p className="text-muted text-sm mt-1">{headerSubtitle}</p>}
        </div>

        {/* Thanh chuyển tab (ẩn trên desktop vì đã có thanh cố định phía dưới) */}
        <div className="hidden sm:flex items-center gap-2 mb-6 bg-panel border border-border rounded-full p-1.5 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-highlight text-white shadow-sm"
                  : "text-muted hover:text-cream"
              }`}
            >
              <tab.Icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "link" && (
          <div className="bg-panel border border-border rounded-2xl p-6 sm:p-7">
            <h2 className="font-display font-semibold text-lg mb-1">
              Dán link sản phẩm {user.displayName ? user.displayName : "bạn"} muốn mua
            </h2>
            <p className="text-muted text-sm mb-5">
              Dán link &gt; Tạo link hoàn tiền &gt; Mua ngay &gt; Sáng hôm sau khoảng 9h quay lại kiểm tra🔥
            </p>

            <form onSubmit={handleConvert} className="space-y-3">
              <div className="relative">
                <input
                  type="url"
                  required
                  value={shopeeUrl}
                  onChange={(e) => setShopeeUrl(e.target.value)}
                  placeholder="https://shopee.vn/..."
                  className="w-full bg-surface border border-border rounded-lg pl-3.5 pr-11 py-3 text-base sm:text-sm outline-none focus:border-gold transition-colors placeholder:text-muted/60"
                />
                <button
                  type="button"
                  onClick={handlePasteUrl}
                  aria-label="Dán link từ clipboard"
                  title="Dán link"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md bg-panel-2 text-gold hover:brightness-95 active:scale-90 transition-all cursor-pointer"
                >
                  <PasteIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={converting}
                  className="flex-1 sm:flex-none sm:w-auto bg-gold hover:bg-gold-soft text-ink font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {converting ? "Đang tạo..." : "Tạo link hoàn tiền"}
                </button>
                <button
                  type="button"
                  onClick={handleClearUrl}
                  aria-label="Xóa link"
                  title="Xóa"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#eceef1] hover:bg-[#dfe2e6] text-[#5b616b] font-semibold rounded-lg px-3.5 py-2.5 text-sm transition-colors cursor-pointer shrink-0"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                  Xóa
                </button>
              </div>
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
                        Hoa hồng ước tính:{" "}
                        <span className="text-gold font-mono-num">
                          {productInfo.commissionStr}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted mb-3">
                  Link hoàn tiền đã được tạo thành công — bấm &quot;Mua Ngay&quot; để đặt hàng nhé!
                </p>
                <div className="flex gap-2.5">
                  <a
                    href={convertedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-[#7fc99a] hover:bg-[#6fbb8b] text-white text-sm font-bold rounded-lg px-3.5 py-3 shadow-md shadow-[#7fc99a]/30 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    🛍️ Mua Ngay
                  </a>
                  <button
                    onClick={handleCopy}
                    className="flex-1 bg-white hover:bg-white/90 text-ink border border-border text-sm font-semibold rounded-lg px-3.5 py-3 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {copied ? "Đã chép ✓" : "📋 Sao chép"}
                  </button>
                </div>

                <div className="mt-4 bg-surface/70 border border-border rounded-lg px-4 py-3.5 space-y-1.5">
                  <p className="text-xs font-semibold text-highlight mb-1">Lưu ý để đơn được ghi nhận:</p>
                  <p className="text-xs text-muted">1. Xóa sản phẩm này khỏi giỏ hàng (nếu có) ✅</p>
                  <p className="text-xs text-muted">2. Bấm link bỏ giỏ hoặc mua ngay ✅</p>
                  <p className="text-xs text-muted">3. Thao tác chậm lại để Shopee ghi nhận đơn ✅</p>
                  <p className="text-xs text-muted">4. Không xem live trước hoặc sau khi bấm link ✅</p>
                  <p className="text-xs text-muted">
                    5. Không bấm vào link mã giảm giá của người khác sau khi bấm link ✅
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="bg-panel border border-border rounded-2xl overflow-hidden">
            {/* Thanh lọc trạng thái */}
            <div className="p-6 sm:p-7 pb-4 flex flex-wrap items-center gap-2">
              {ORDER_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    orderFilter === f.id
                      ? "bg-highlight text-white border-highlight"
                      : "bg-surface text-muted border-border hover:text-cream"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
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
                  {pagedOrders.map((order) => {
                    const meta = statusMeta(order.status);
                    const { gross, afterTax, final80 } = commissionBreakdown(order.commission);
                    return (
                      <div key={order.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium line-clamp-2">{order.productName}</p>
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
                          <div className="text-right space-y-1.5">
                            <div>
                              <p className="text-[11px] text-muted">Hoa hồng</p>
                              <p className="font-mono-num text-sm text-gold">{formatVnd(gross)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted">Sau thuế 10%</p>
                              <p className="font-mono-num text-sm">{formatVnd(afterTax)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted">80% hoa hồng</p>
                              <p className="font-mono-num text-sm text-mint">{formatVnd(final80)}</p>
                            </div>
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
                      {pagedOrders.map((order) => {
                        const meta = statusMeta(order.status);
                        const { gross, afterTax, final80 } = commissionBreakdown(order.commission);
                        return (
                          <tr key={order.id} className="border-t border-border/60">
                            <td className="px-7 py-3.5 font-mono-num text-xs text-muted">
                              {order.id || "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="line-clamp-2 max-w-[280px] inline-block align-top">
                                {order.productName}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="space-y-1">
                                <div>
                                  <p className="text-[10px] text-muted">Hoa hồng</p>
                                  <p className="font-mono-num text-gold">{formatVnd(gross)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted">Sau thuế 10%</p>
                                  <p className="font-mono-num">{formatVnd(afterTax)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted">80% hoa hồng</p>
                                  <p className="font-mono-num text-mint">{formatVnd(final80)}</p>
                                </div>
                              </div>
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

                {/* Phân trang: tối đa 10 số trang mỗi lượt, mỗi trang 10 đơn */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 px-5 py-5 border-t border-border">
                    {pageWindowStart > 0 && (
                      <button
                        type="button"
                        onClick={retreatPageWindow}
                        className="w-8 h-8 rounded-full text-xs font-semibold text-muted hover:text-cream border border-border cursor-pointer"
                        aria-label="Trang trước đó"
                      >
                        ‹
                      </button>
                    )}
                    {Array.from({ length: Math.min(PAGE_WINDOW, totalPages - pageWindowStart) }).map(
                      (_, i) => {
                        const p = pageWindowStart + i + 1;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => goToPage(p)}
                            className={`w-8 h-8 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              orderPage === p
                                ? "bg-highlight text-white"
                                : "text-muted hover:text-cream border border-border"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      }
                    )}
                    {pageWindowStart + PAGE_WINDOW < totalPages && (
                      <button
                        type="button"
                        onClick={advancePageWindow}
                        className="w-8 h-8 rounded-full text-xs font-semibold text-muted hover:text-cream border border-border cursor-pointer"
                        aria-label="Xem thêm trang"
                      >
                        ›...
                      </button>
                    )}
                    <span className="text-xs text-muted ml-2 font-mono-num">
                      Trang {orderPage}/{totalPages}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="ticket-notch bg-panel border border-border rounded-2xl overflow-hidden max-w-md">
            <div className="p-6 sm:p-7">
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Có sẵn để rút</p>
              <p className="font-display font-bold text-4xl text-gold tabular-nums">
                {wallet ? formatVnd(wallet.coTheRutHien) : "—"}
              </p>

              {wallet && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Nhập số tiền muốn rút"
                      className="flex-1 bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold transition-colors placeholder:text-muted/60"
                    />
                    <button
                      type="button"
                      onClick={handleWithdrawRequest}
                      className="bg-gold hover:bg-gold-soft text-ink font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer shrink-0"
                    >
                      Rút ngay
                    </button>
                  </div>

                  {withdrawError && (
                    <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                      {withdrawError}
                    </p>
                  )}

                  {withdrawCode && (
                    <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2.5">
                      <div>
                        <p className="text-[11px] text-muted mb-1">
                          Sao chép lệnh rút và gửi vào nhóm
                        </p>
                        <div className="flex items-center gap-2 bg-panel-2 border border-border rounded-lg px-3 py-2">
                          <code className="flex-1 font-mono-num text-sm truncate">{withdrawCode}</code>
                          <button
                            type="button"
                            onClick={handleCopyWithdrawCode}
                            aria-label="Sao chép lệnh rút"
                            title="Sao chép"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-panel text-gold hover:brightness-95 active:scale-90 transition-all cursor-pointer shrink-0"
                          >
                            <CopyIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {withdrawCopied && (
                          <p className="text-[11px] text-mint mt-1">Đã sao chép ✓</p>
                        )}
                      </div>
                      <a
                        href={ZALO_GROUP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-highlight hover:brightness-95 text-white text-sm font-semibold rounded-lg px-3.5 py-2.5 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Gửi vào nhóm
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!wallet && (
                <p className="text-xs text-muted mt-2">
                  Chưa có dữ liệu ví cho My ID này — hãy đợi lần đồng bộ tiếp theo
                </p>
              )}
            </div>
            {wallet && (
              <>
                <div className="ticket-dashed" />
                <div className="p-6 sm:p-7 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted mb-1">🟡 Đang chờ xử lý</p>
                    <p className="font-mono-num text-lg font-semibold">{formatVnd(wallet.dangCho)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">🟣 Đã hoàn thành</p>
                    <p className="font-mono-num text-lg font-semibold">
                      {formatVnd(wallet.hoanThanhChuaRut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">🟢 Có thể rút ngay</p>
                    <p className="font-mono-num text-lg font-semibold text-mint">
                      {formatVnd(wallet.coTheRut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">🔴 Đã nhận</p>
                    <p className="font-mono-num text-lg font-semibold">{formatVnd(wallet.daNhan)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "link" && (
          <p className="text-center text-xs text-muted mt-8">
            Việc ghi nhận chuyển đổi đơn hàng là do Shopee quyết định, chúng tôi không thể can thiệp!
          </p>
        )}
        {activeTab === "wallet" && (
          <p className="text-center text-xs text-muted mt-8">
            Tạo yêu cầu rút tiền và Admin sẽ chuyển tiền cho Ok trong thời gian sớm nhất có thể.
          </p>
        )}
      </div>

      {/* Thanh chuyển tab cố định phía dưới màn hình (kiểu app di động) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-border flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id ? "text-highlight" : "text-muted"
            }`}
          >
            <tab.Icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
