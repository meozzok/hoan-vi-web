"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [myId, setMyId] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myId, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <span className="font-display font-bold text-ink text-sm">%</span>
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">Hoàn Ví</span>
          </div>
          <p className="text-muted text-sm">
            Chuyển link Shopee bằng My ID riêng của bạn để tra cứu hoàn tiền
          </p>
        </div>

        {/* Thẻ thành viên */}
        <div className="ticket-notch bg-panel rounded-2xl border border-border shadow-2xl shadow-black/30 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-gold-soft to-gold" />
              <span className="font-mono-num text-xs text-muted uppercase tracking-widest">
                Member ID
              </span>
            </div>

            <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  mode === "login" ? "bg-panel-2 text-cream" : "text-muted hover:text-cream"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  mode === "register" ? "bg-panel-2 text-cream" : "text-muted hover:text-cream"
                }`}
              >
                Tạo My ID mới
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5" htmlFor="myId">
                  My ID
                </label>
                <input
                  id="myId"
                  type="text"
                  required
                  value={myId}
                  onChange={(e) => setMyId(e.target.value.trim())}
                  placeholder="vd: nguyenvana01"
                  className="w-full font-mono-num bg-surface border border-border rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-gold transition-colors placeholder:text-muted/60"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-xs text-muted mb-1.5" htmlFor="displayName">
                    Tên hiển thị (tuỳ chọn)
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="vd: Nguyễn Văn A"
                    className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-gold transition-colors placeholder:text-muted/60"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-muted mb-1.5" htmlFor="password">
                  Mật khẩu
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-gold transition-colors placeholder:text-muted/60"
                />
              </div>

              {error && (
                <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-gold-soft text-ink font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-60 cursor-pointer mt-2"
              >
                {loading
                  ? "Đang xử lý..."
                  : mode === "login"
                  ? "Đăng nhập"
                  : "Tạo My ID & đăng nhập"}
              </button>
            </form>
          </div>

          <div className="ticket-dashed" />
          <div className="px-6 sm:px-8 py-4 flex items-center justify-between">
            <span className="text-xs text-muted">Hoàn Ví · thẻ thành viên hoàn tiền</span>
            <span className="font-mono-num text-xs text-gold">•••• {myId ? myId.slice(-4).padStart(4, "•") : "----"}</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          My ID của bạn sẽ được gắn làm sub_id trong mọi link Shopee bạn chuyển đổi.
        </p>
      </div>
    </main>
  );
}
