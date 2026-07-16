"use client";

import { useEffect, useState } from "react";

// localStorage key used to remember the "never show again" choice
const HIDE_FOREVER_KEY = "hideAddToHomeScreenGuide";

export default function AddToHomeScreenModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hiddenForever = window.localStorage.getItem(HIDE_FOREVER_KEY);
    if (hiddenForever !== "true") {
      setShow(true);
    }
  }, []);

  const handleUnderstood = () => {
    // Only hides for this visit — nothing is saved, so it will
    // show again the next time the site is loaded.
    setShow(false);
  };

  const handleHideForever = () => {
    window.localStorage.setItem(HIDE_FOREVER_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-[300px] rounded-[32px] bg-gradient-to-br from-pink-300 via-rose-300 to-orange-200 p-[3px] shadow-2xl">
        <div className="flex max-h-[92dvh] flex-col rounded-[30px] bg-white p-4 text-center">
          <div className="mb-1 text-2xl">🌷</div>

          <h2 className="mb-3 font-display text-[15px] font-semibold leading-snug text-neutral-800">
            Cách thêm web vào màn hình chính trên điện thoại
          </h2>

          {/* Cute iPhone-style frame around the guide image */}
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            <div className="relative mx-auto w-full rounded-[38px] bg-gradient-to-b from-rose-200 to-pink-100 p-2 shadow-inner">
              {/* side buttons */}
              <div className="absolute -left-[3px] top-16 h-8 w-[3px] rounded-full bg-rose-300/80" />
              <div className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-full bg-rose-300/80" />
              <div className="absolute -right-[3px] top-24 h-14 w-[3px] rounded-full bg-rose-300/80" />

              {/* screen */}
              <div className="relative overflow-hidden rounded-[30px] bg-white">
                {/* dynamic island */}
                <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-neutral-900/90" />
                <img
                  src="/add-to-home-screen-guide.png"
                  alt="Hướng dẫn thêm web vào màn hình chính"
                  className="w-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-shrink-0 flex-col gap-2">
            <button
              onClick={handleHideForever}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-500 transition hover:bg-rose-100"
            >
              Không hiển thị lại (vĩnh viễn)
            </button>
            <button
              onClick={handleUnderstood}
              className="rounded-full bg-gradient-to-r from-rose-400 to-orange-300 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Đã hiểu ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
