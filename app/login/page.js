"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ZALO_GROUP_LINK = "https://zalo.me/g/msd7vvhjcwiffr3tyqor";
const MYID_COMMAND = "#My_ID";

export default function LoginPage() {
  const router = useRouter();

  // "login" | "forgot" | "register"
  const [view, setView] = useState("login");

  // Đăng nhập thường
  const [username, setUsername] = useState("");

  // Quên tên đăng nhập (My ID + Mã đăng nhập)
  const [recoverMyId, setRecoverMyId] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // Đăng ký
  const [regUsername, setRegUsername] = useState("");
  const [regMyId, setRegMyId] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function switchView(next) {
    setView(next);
    setError("");
  }

  async function postJson(endpoint, payload) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
    return data;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await postJson("/api/auth/login", { username });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await postJson("/api/auth/login-with-code", {
        myId: recoverMyId,
        code: loginCode,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await postJson("/api/auth/register", {
        username: regUsername,
        myId: regMyId,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(MYID_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard không khả dụng — người dùng vẫn có thể tự bôi đen & copy
    }
  }

  return (
    <main className="login-pink min-h-screen flex items-center justify-center px-4 py-12">
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
        <div className="ticket-notch bg-panel rounded-2xl border border-border shadow-2xl shadow-black/10 overflow-hidden">
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
                onClick={() => switchView("login")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  view === "login" || view === "forgot"
                    ? "bg-panel-2 text-cream shadow-sm"
                    : "text-muted hover:text-cream"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => switchView("register")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  view === "register" ? "bg-panel-2 text-cream shadow-sm" : "text-muted hover:text-cream"
                }`}
              >
                Đăng ký
              </button>
            </div>

            {/* ─────────── ĐĂNG NHẬP THƯỜNG ─────────── */}
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="username">
                    Tên của bạn
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="vd: PhuongThao-6789"
                    className="field-important w-full bg-surface border-2 border-highlight/40 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-highlight transition-colors placeholder:text-muted/60"
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
                  {loading ? "Đang xử lý..." : "Đăng nhập"}
                </button>

                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  className="w-full text-center text-xs text-highlight hover:underline cursor-pointer pt-1"
                >
                  Bạn quên tên đăng nhập?
                </button>
              </form>
            )}

            {/* ─────────── QUÊN TÊN ĐĂNG NHẬP (My ID + Mã đăng nhập) ─────────── */}
            {view === "forgot" && (
              <form onSubmit={handleRecover} className="space-y-4">
                <div className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-2">
                  Nhập <span className="text-highlight font-semibold">My ID</span> và một{" "}
                  <span className="text-highlight font-semibold">mã đăng nhập</span> còn hiệu lực để
                  vào lại tài khoản. Mỗi mã chỉ dùng được 1 lần.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="recoverMyId">
                    My ID của bạn
                  </label>
                  <input
                    id="recoverMyId"
                    type="text"
                    inputMode="numeric"
                    required
                    value={recoverMyId}
                    onChange={(e) => setRecoverMyId(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="vd: 123456789"
                    className="field-important w-full font-mono-num bg-surface border-2 border-highlight/40 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-highlight transition-colors placeholder:text-muted/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="loginCode">
                    Mã đăng nhập
                  </label>
                  <input
                    id="loginCode"
                    type="text"
                    required
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value)}
                    placeholder="vd: 3zH8#qc"
                    className="field-important w-full font-mono-num bg-surface border-2 border-highlight/40 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-highlight transition-colors placeholder:text-muted/60"
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
                  {loading ? "Đang xử lý..." : "Đăng nhập"}
                </button>

                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="w-full text-center text-xs text-muted hover:text-highlight cursor-pointer pt-1"
                >
                  ← Quay lại đăng nhập bằng tên
                </button>
              </form>
            )}

            {/* ─────────── ĐĂNG KÝ ─────────── */}
            {view === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="regUsername">
                      Tên đăng nhập
                    </label>
                    <input
                      id="regUsername"
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="PhuongThao-6789"
                      className="field-important w-full bg-surface border-2 border-highlight/40 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-highlight transition-colors placeholder:text-muted/60"
                    />
                    <p className="text-[11px] text-muted mt-1.5 leading-snug">
                      Phải đúng định dạng <span className="text-highlight font-semibold">TênZalo-4 số cuối SĐT</span>.
                      <br />
                      Ví dụ: <span className="font-mono-num">PhuongThao-6789</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="regMyId">
                      My ID
                    </label>
                    <input
                      id="regMyId"
                      type="text"
                      inputMode="numeric"
                      required
                      value={regMyId}
                      onChange={(e) => setRegMyId(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="vd: 123456789"
                      className="field-important w-full font-mono-num bg-surface border-2 border-highlight/40 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-highlight transition-colors placeholder:text-muted/60"
                    />
                    <div className="text-[11px] text-muted mt-1.5 leading-snug space-y-1">
                      <p className="font-semibold text-highlight">Cách lấy My ID:</p>
                      <p>
                        <span className="font-semibold">Bước 1:</span> Sao chép câu lệnh{" "}
                        <button
                          type="button"
                          onClick={copyCommand}
                          className="inline-flex items-center gap-1 font-mono-num bg-highlight/15 text-highlight px-1.5 py-0.5 rounded cursor-pointer hover:bg-highlight/25 transition-colors"
                        >
                          {MYID_COMMAND} {copied ? "✓" : ""}
                        </button>
                      </p>
                      <p>
                        <span className="font-semibold">Bước 2:</span>{" "}
                        <a
                          href={ZALO_GROUP_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-highlight underline hover:no-underline"
                        >
                          Gửi vào nhóm
                        </a>{" "}
                        (bấm để mở nhóm Zalo).
                      </p>
                      <p>
                        <span className="font-semibold">Bước 3:</span> Sao chép ID bot gửi cho bạn và
                        điền vào ô My ID.
                      </p>
                    </div>
                  </div>
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
                  {loading ? "Đang xử lý..." : "Đăng ký & đăng nhập"}
                </button>
              </form>
            )}
          </div>

          <div className="ticket-dashed" />
          <div className="px-6 sm:px-8 py-4 flex items-center justify-between">
            <span className="text-xs text-muted">Hoàn Ví · thẻ thành viên hoàn tiền</span>
            <span className="font-mono-num text-xs text-gold">
              •••• {regMyId ? regMyId.slice(-4).padStart(4, "•") : "----"}
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          My ID của bạn sẽ được gắn làm sub_id trong mọi link Shopee bạn chuyển đổi.
        </p>
      </div>
    </main>
  );
}
