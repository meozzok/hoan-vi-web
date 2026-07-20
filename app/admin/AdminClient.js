"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Tên khách được lưu ngay trên trình duyệt (localStorage) NGOÀI việc gửi
// lên server — vì vậy gõ xong rồi tải lại trang (kể cả khi mạng chập chờn
// hoặc request lưu lên server bị lỗi) tên vẫn còn nguyên trên máy admin.
const LOCAL_NAMES_KEY = "hoanvi_admin_customer_names_v1";

function readLocalNames() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_NAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalNames(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_NAMES_KEY, JSON.stringify(map));
  } catch {
    // Bỏ qua — nếu localStorage đầy/bị chặn thì vẫn còn bản lưu trên server.
  }
}

function formatVnd(amount) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount || 0) + "đ";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function truncateChars(text, limit = 60) {
  const s = String(text || "");
  return s.length > limit ? s.slice(0, limit) + "..." : s;
}

// Khoá lưu tên khách theo từng đơn — ưu tiên mã đơn (duy nhất), nếu đơn nào
// thiếu mã thì ghép sub_id + ngày đặt + sản phẩm để vẫn có khoá ổn định.
function rowKeyOf(order) {
  return order.orderId || `${order.subId}__${order.orderedAt}__${order.productName}`;
}

// Bot dùng chữ trạng thái tự do (vd "Hoàn thành", "Chờ xử lý", "Đã huỷ"...)
// nên map theo từ khoá thay vì enum cố định, phòng khi bot đổi cách gọi.
function classifyStatus(trangThai) {
  const s = (trangThai || "").toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy")) return "cancelled";
  if (s.includes("hoàn thành")) return "completed";
  return "pending";
}

const STATUS_COLORS = {
  green: { solid: "#1f9d5c", soft: "rgba(31,157,92,0.14)" },
  yellow: { solid: "#c8930a", soft: "rgba(200,147,10,0.16)" },
  red: { solid: "#d9534f", soft: "rgba(217,83,79,0.14)" },
};

function statusMeta(trangThai) {
  const kind = classifyStatus(trangThai);
  if (kind === "cancelled") return { ...STATUS_COLORS.red, label: trangThai || "Đã hủy" };
  if (kind === "completed") return { ...STATUS_COLORS.green, label: trangThai || "Hoàn thành" };
  return { ...STATUS_COLORS.yellow, label: trangThai || "Chờ xử lý" };
}

const AMOUNT_COLORS = {
  gross: { solid: "#d9534f", border: "rgba(47,158,99,0.25)", soft: "rgba(47,158,99,0.05)" },
  afterTax: { solid: "#2f9e63", border: "rgba(47,158,99,0.25)", soft: "rgba(47,158,99,0.05)" },
  final80: { solid: "#0ecb81", border: "rgba(47,158,99,0.25)", soft: "rgba(47,158,99,0.05)" },
};

// 3 ô hoa hồng theo trạng thái, hiển thị cho từng Sub ID.
const GROUP_STAT_COLORS = {
  pending: { solid: "#c8930a", border: "rgba(200,147,10,0.30)", soft: "rgba(200,147,10,0.07)" },
  completed: { solid: "#1f9d5c", border: "rgba(31,157,92,0.30)", soft: "rgba(31,157,92,0.07)" },
  total: { solid: "#0ecb81", border: "rgba(14,203,129,0.35)", soft: "rgba(14,203,129,0.08)" },
};

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function OrderRow({ order }) {
  const meta = statusMeta(order.status);
  return (
    <div className="px-4 py-3.5 rounded-xl border border-border bg-surface/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold min-w-0 truncate">
          🛍️ {truncateChars(order.productName, 60)}
        </p>
        <span
          className="status-pill shrink-0"
          style={{ background: meta.soft, color: meta.solid }}
        >
          {meta.label}
        </span>
      </div>
      <p className="font-mono-num text-xs text-muted mt-1">Mã đơn: {order.orderId || "—"}</p>

      <div className="flex items-center gap-4 mt-1.5">
        <p className="text-[11px] text-muted">
          Ngày đặt: <span className="font-mono-num">{formatDate(order.orderedAt)}</span>
        </p>
        <p className="text-[11px] text-muted">
          Ngày hoàn thành: <span className="font-mono-num">{formatDate(order.completedAt)}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-3">
        <div
          className="text-center rounded-lg py-1.5"
          style={{ border: `1px solid ${AMOUNT_COLORS.gross.border}`, background: AMOUNT_COLORS.gross.soft }}
        >
          <p className="text-[10px] text-ink font-semibold">Hoa hồng</p>
          <p className="font-mono-num text-sm font-bold" style={{ color: AMOUNT_COLORS.gross.solid }}>
            {formatVnd(order.gross)}
          </p>
        </div>
        <div
          className="text-center rounded-lg py-1.5"
          style={{ border: `1px solid ${AMOUNT_COLORS.afterTax.border}`, background: AMOUNT_COLORS.afterTax.soft }}
        >
          <p className="text-[10px] text-ink font-semibold">Sau thuế -11%</p>
          <p className="font-mono-num text-sm font-bold" style={{ color: AMOUNT_COLORS.afterTax.solid }}>
            {formatVnd(order.afterTax)}
          </p>
        </div>
        <div
          className="text-center rounded-lg py-1.5"
          style={{ border: `1px solid ${AMOUNT_COLORS.final80.border}`, background: AMOUNT_COLORS.final80.soft }}
        >
          <p className="text-[10px] text-ink font-semibold">Hoa hồng 80%</p>
          <p className="font-mono-num text-sm font-bold" style={{ color: AMOUNT_COLORS.final80.solid }}>
            {formatVnd(order.final80)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminClient({ initialOrders, initialCustomerNames }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders || []);
  const [customerNames, setCustomerNames] = useState(initialCustomerNames || {});
  const [refreshing, setRefreshing] = useState(false);
  const [savingKeys, setSavingKeys] = useState({});
  const [expanded, setExpanded] = useState({});
  const saveTimers = useRef({});

  // Sau khi hydrate xong, nạp thêm bản lưu trên trình duyệt — nếu tên nào
  // đã gõ trước đó nhưng chưa kịp đồng bộ lên server thì vẫn hiện lại đúng.
  useEffect(() => {
    const local = readLocalNames();
    if (Object.keys(local).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ localStorage (nguồn ngoài React) sau khi mount, đúng theo khuyến nghị của React docs.
      setCustomerNames((prev) => ({ ...prev, ...local }));
    }
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      if (!map.has(order.subId)) map.set(order.subId, []);
      map.get(order.subId).push(order);
    }
    return Array.from(map.entries()).map(([subId, list]) => {
      const stat = { pending: 0, completed: 0, total: 0 };
      for (const o of list) {
        const amount = o.final80 || 0;
        stat.total += amount;
        const kind = classifyStatus(o.status);
        if (kind === "pending") stat.pending += amount;
        else if (kind === "completed") stat.completed += amount;
      }
      return { subId, orders: list, stat };
    });
  }, [orders]);

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, o) => ({
        gross: acc.gross + (o.gross || 0),
        afterTax: acc.afterTax + (o.afterTax || 0),
        final80: acc.final80 + (o.final80 || 0),
      }),
      { gross: 0, afterTax: 0, final80: 0 }
    );
  }, [orders]);

  const persistName = useCallback(async (subId, name) => {
    setSavingKeys((s) => ({ ...s, [subId]: true }));
    try {
      await fetch("/api/admin/customer-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subId, name }),
      });
    } catch {
      // Bỏ qua lỗi mạng — tên vẫn còn trong localStorage nên không mất.
    } finally {
      setSavingKeys((s) => {
        const next = { ...s };
        delete next[subId];
        return next;
      });
    }
  }, []);

  function handleNameChange(subId, value) {
    setCustomerNames((prev) => {
      const next = { ...prev, [subId]: value };
      writeLocalNames(next);
      return next;
    });
    clearTimeout(saveTimers.current[subId]);
    saveTimers.current[subId] = setTimeout(() => persistName(subId, value), 600);
  }

  function toggleGroup(subId) {
    setExpanded((prev) => ({ ...prev, [subId]: !prev[subId] }));
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setOrders(data.orders || []);
        // Ưu tiên tên đã lưu trên trình duyệt (mới nhất) đè lên tên từ server,
        // phòng khi có tên vừa gõ mà server chưa kịp lưu xong.
        setCustomerNames({ ...(data.customerNames || {}), ...readLocalNames() });
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    // Nạp lại trang /admin — vì cookie đã bị xoá, server sẽ tự hiện lại
    // ô nhập mật khẩu (vẫn cùng 1 trang, không có route /admin/login riêng).
    router.refresh();
  }

  return (
    <main className="admin-green min-h-screen px-4 py-8 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-cream">
              Admin — Danh sách đơn hàng
            </h1>
            <p className="text-muted text-sm mt-1">
              Chỉ hiện các sub ID dạng số trên 10 chữ số · {orders.length} đơn · {groups.length} khách
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-panel border border-border text-cream hover:border-gold transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {refreshing ? "Đang tải..." : "Làm mới"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-panel border border-border text-danger hover:border-danger transition-colors cursor-pointer active:scale-95"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-panel border border-border rounded-2xl px-7 py-10 text-center">
            <p className="text-muted text-sm">Chưa có đơn hàng nào khớp điều kiện sub ID.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const isOpen = !!expanded[group.subId];
              return (
                <div
                  key={group.subId}
                  className="bg-panel border border-border rounded-2xl overflow-hidden shadow-sm shadow-black/5"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroup(group.subId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleGroup(group.subId);
                      }
                    }}
                    className="w-full px-4 sm:px-5 py-4 cursor-pointer hover:bg-panel-2/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronIcon open={isOpen} />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted">Sub ID</p>
                        <p className="font-mono-num text-sm font-bold truncate">{group.subId}</p>
                      </div>
                      <p className="text-[11px] text-muted ml-auto shrink-0">{group.orders.length} đơn</p>
                    </div>

                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[11px] text-muted mb-1">Tên khách hàng</p>
                      <input
                        type="text"
                        value={customerNames[group.subId] || ""}
                        onChange={(e) => handleNameChange(group.subId, e.target.value)}
                        placeholder="Tự nhập tên khách..."
                        className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-cream placeholder:text-muted/60 outline-none focus:border-gold transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-3">
                      <div
                        className="text-center rounded-lg py-1.5"
                        style={{ border: `1px solid ${GROUP_STAT_COLORS.pending.border}`, background: GROUP_STAT_COLORS.pending.soft }}
                      >
                        <p className="text-[10px] text-ink font-semibold">Đang chờ xử lý</p>
                        <p className="font-mono-num text-sm font-bold" style={{ color: GROUP_STAT_COLORS.pending.solid }}>
                          {formatVnd(group.stat.pending)}
                        </p>
                      </div>
                      <div
                        className="text-center rounded-lg py-1.5"
                        style={{ border: `1px solid ${GROUP_STAT_COLORS.completed.border}`, background: GROUP_STAT_COLORS.completed.soft }}
                      >
                        <p className="text-[10px] text-ink font-semibold">Hoàn thành</p>
                        <p className="font-mono-num text-sm font-bold" style={{ color: GROUP_STAT_COLORS.completed.solid }}>
                          {formatVnd(group.stat.completed)}
                        </p>
                      </div>
                      <div
                        className="text-center rounded-lg py-1.5"
                        style={{ border: `1px solid ${GROUP_STAT_COLORS.total.border}`, background: GROUP_STAT_COLORS.total.soft }}
                      >
                        <p className="text-[10px] text-ink font-semibold">Tổng hoa hồng</p>
                        <p className="font-mono-num text-sm font-bold" style={{ color: GROUP_STAT_COLORS.total.solid }}>
                          {formatVnd(group.stat.total)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col gap-2 px-3 sm:px-4 pb-4">
                      {group.orders.map((order) => (
                        <OrderRow key={rowKeyOf(order)} order={order} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="bg-panel border-2 border-gold/60 rounded-2xl px-5 py-4">
              <p className="text-sm font-bold text-gold mb-2">Tổng hoa hồng (tất cả sub ID)</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center">
                  <p className="text-[10px] text-muted">Hoa hồng</p>
                  <p className="font-mono-num text-sm font-bold" style={{ color: AMOUNT_COLORS.gross.solid }}>
                    {formatVnd(totals.gross)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted">Sau thuế -11%</p>
                  <p className="font-mono-num text-sm font-bold" style={{ color: AMOUNT_COLORS.afterTax.solid }}>
                    {formatVnd(totals.afterTax)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted">Hoa hồng 80%</p>
                  <p className="font-mono-num text-sm font-bold" style={{ color: AMOUNT_COLORS.final80.solid }}>
                    {formatVnd(totals.final80)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-muted text-xs mt-3">
          {Object.keys(savingKeys).length > 0
            ? "Đang lưu tên khách..."
            : "Tên khách tự lưu theo Sub ID ngay trên trình duyệt này khi bạn ngừng gõ — lần sau đơn mới của cùng khách sẽ tự có sẵn tên."}
        </p>
      </div>
    </main>
  );
}
