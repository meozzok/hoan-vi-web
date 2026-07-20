"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

const AMOUNT_COLORS = {
  gross: { solid: "#e0524f", border: "rgba(139,95,191,0.30)", soft: "rgba(139,95,191,0.05)" },
  afterTax: { solid: "#a855f7", border: "rgba(139,95,191,0.30)", soft: "rgba(139,95,191,0.05)" },
  final80: { solid: "#0ecb81", border: "rgba(139,95,191,0.30)", soft: "rgba(139,95,191,0.05)" },
};

export default function AdminClient({ initialOrders, initialCustomerNames }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders || []);
  const [customerNames, setCustomerNames] = useState(initialCustomerNames || {});
  const [refreshing, setRefreshing] = useState(false);
  const [savingKeys, setSavingKeys] = useState({});
  const saveTimers = useRef({});

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

  const persistName = useCallback(async (rowKey, name) => {
    setSavingKeys((s) => ({ ...s, [rowKey]: true }));
    try {
      await fetch("/api/admin/customer-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: rowKey, name }),
      });
    } catch {
      // Bỏ qua lỗi lưu tạm thời — giá trị vẫn còn trên màn hình, thử lại khi gõ tiếp.
    } finally {
      setSavingKeys((s) => {
        const next = { ...s };
        delete next[rowKey];
        return next;
      });
    }
  }, []);

  function handleNameChange(rowKey, value) {
    setCustomerNames((prev) => ({ ...prev, [rowKey]: value }));
    clearTimeout(saveTimers.current[rowKey]);
    saveTimers.current[rowKey] = setTimeout(() => persistName(rowKey, value), 600);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setOrders(data.orders || []);
        setCustomerNames(data.customerNames || {});
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
    <main className="min-h-screen px-4 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-cream">
              Admin — Danh sách đơn hàng
            </h1>
            <p className="text-muted text-sm mt-1">
              Chỉ hiện các sub ID dạng số đủ 18 chữ số · {orders.length} đơn
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

        <div className="bg-panel border border-border rounded-2xl overflow-hidden">
          {orders.length === 0 ? (
            <div className="px-7 py-10 text-center">
              <p className="text-muted text-sm">Chưa có đơn hàng nào khớp điều kiện sub ID.</p>
            </div>
          ) : (
            <>
              {/* Dạng thẻ — điện thoại */}
              <div className="sm:hidden flex flex-col gap-3 p-3">
                {orders.map((order) => {
                  const rowKey = rowKeyOf(order);
                  return (
                    <div
                      key={rowKey}
                      className="px-4 py-4 rounded-xl border-2 border-border bg-surface/50"
                    >
                      <p className="text-sm font-bold">
                        🛍️ {truncateChars(order.productName, 60)}
                      </p>
                      <p className="font-mono-num text-xs text-muted mt-1">
                        Mã đơn: {order.orderId || "—"}
                      </p>
                      <p className="font-mono-num text-xs text-muted">
                        Sub ID: {order.subId}
                      </p>

                      <div className="mt-3">
                        <label className="block text-[11px] text-muted mb-1">Tên khách</label>
                        <input
                          type="text"
                          value={customerNames[rowKey] || ""}
                          onChange={(e) => handleNameChange(rowKey, e.target.value)}
                          placeholder="Tự nhập tên khách..."
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted/60 outline-none focus:border-gold transition-colors"
                        />
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
                })}

                <div className="px-4 py-4 rounded-xl border-2 border-gold bg-surface/70">
                  <p className="text-sm font-bold text-gold mb-2">Tổng hoa hồng</p>
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

              {/* Dạng bảng — từ sm trở lên */}
              <div className="hidden sm:block overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border text-ink text-xs uppercase tracking-wider">
                      <th className="text-left font-bold px-5 py-3">Sản phẩm</th>
                      <th className="text-left font-bold px-4 py-3">Mã đơn</th>
                      <th className="text-left font-bold px-4 py-3">Sub ID</th>
                      <th className="text-left font-bold px-4 py-3 min-w-[160px]">Tên khách</th>
                      <th className="text-right font-bold px-4 py-3">Hoa hồng</th>
                      <th className="text-right font-bold px-4 py-3">Sau thuế -11%</th>
                      <th className="text-right font-bold px-5 py-3">Hoa hồng 80%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const rowKey = rowKeyOf(order);
                      return (
                        <tr key={rowKey} className="border-t border-border/60">
                          <td className="px-5 py-3.5">
                            <span className="font-bold inline-block max-w-[260px] truncate align-top">
                              🛍️ {truncateChars(order.productName, 60)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block font-mono-num text-xs text-muted border border-border rounded-md bg-surface px-2 py-1">
                              {order.orderId || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono-num text-xs text-muted">{order.subId}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <input
                              type="text"
                              value={customerNames[rowKey] || ""}
                              onChange={(e) => handleNameChange(rowKey, e.target.value)}
                              placeholder="Tự nhập..."
                              className="w-full min-w-[140px] bg-surface border border-border rounded-lg px-2.5 py-1.5 text-sm text-cream placeholder:text-muted/60 outline-none focus:border-gold transition-colors"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono-num font-bold" style={{ color: AMOUNT_COLORS.gross.solid }}>
                            {formatVnd(order.gross)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono-num font-bold" style={{ color: AMOUNT_COLORS.afterTax.solid }}>
                            {formatVnd(order.afterTax)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono-num font-bold" style={{ color: AMOUNT_COLORS.final80.solid }}>
                            {formatVnd(order.final80)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gold/60 bg-surface/40">
                      <td className="px-5 py-4 font-bold text-gold" colSpan={4}>
                        Tổng hoa hồng
                      </td>
                      <td className="px-4 py-4 text-right font-mono-num font-bold" style={{ color: AMOUNT_COLORS.gross.solid }}>
                        {formatVnd(totals.gross)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono-num font-bold" style={{ color: AMOUNT_COLORS.afterTax.solid }}>
                        {formatVnd(totals.afterTax)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono-num font-bold" style={{ color: AMOUNT_COLORS.final80.solid }}>
                        {formatVnd(totals.final80)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        <p className="text-muted text-xs mt-3">
          {Object.keys(savingKeys).length > 0 ? "Đang lưu tên khách..." : "Tên khách tự lưu khi bạn ngừng gõ."}
        </p>
      </div>
    </main>
  );
}
