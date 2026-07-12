"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ZALO_GROUP_LINK = "https://zalo.me/g/msd7vvhjcwiffr3tyqor";
const MYID_COMMAND = "#My_ID";

export default function LoginPage() {
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [myId, setMyId] = useState("");
  const [groupLinkOpened, setGroupLinkOpened] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nickname.trim() && !myId.trim()) {
      setError("Vui lòng nhập Tên gợi nhớ hoặc My ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, myId }),
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
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-ink text-sm">%</span>
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">
              Mua sắm hoàn tiền cùng Phương Thảo
            </span>
          </div>
          <p className="text-muted text-sm">Shop càng nhiều hoàn càng đã</p>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="nickname">
                  Tên gợi nhớ
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Đặt tên gì cũng được, vd: Thảo Shopee"
                  className="field-important w-full bg-surface border-2 border-highlight/40 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-highlight transition-colors placeholder:text-muted/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-highlight mb-1.5" htmlFor="myId">
                  My ID
                </label>
                <input
                  id="myId"
                  type="text"
                  inputMode="numeric"
                  disabled={!groupLinkOpened}
                  value={myId}
                  onChange={(e) => setMyId(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={groupLinkOpened ? "vd: 123456789" : "Bấm vào link nhóm bên dưới để mở khoá"}
                  className={`field-important w-full font-mono-num border-2 rounded-lg px-3.5 py-2.5 text-base sm:text-sm outline-none transition-colors placeholder:text-muted/60 ${
                    groupLinkOpened
                      ? "bg-surface border-highlight/40 focus:border-highlight"
                      : "bg-border/20 border-border text-muted cursor-not-allowed"
                  }`}
                />

                <div className="text-[11px] text-muted mt-2 leading-snug space-y-1 bg-surface/60 border border-border rounded-lg px-3 py-2.5">
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
                      onClick={() => setGroupLinkOpened(true)}
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
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
