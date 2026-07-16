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
          <div className="mb-2 text-2xl">🌷</div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <img
              src="/add-to-home-screen-guide.png"
              alt="Hướng dẫn thêm web vào màn hình chính"
              className="mx-auto w-full rounded-2xl object-contain"
            />
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
