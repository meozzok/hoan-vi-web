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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-3 font-display text-lg font-semibold text-neutral-900">
          Cách thêm web vào màn hình chính trên điện thoại
        </h2>

        <img
          src="/add-to-home-screen-guide.png"
          alt="Hướng dẫn thêm web vào màn hình chính"
          className="mb-4 w-full rounded-xl"
        />

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleHideForever}
            className="rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-2.5 font-medium text-neutral-600 transition hover:bg-neutral-200"
          >
            Không hiển thị lại (vĩnh viễn)
          </button>
          <button
            onClick={handleUnderstood}
            className="rounded-xl bg-green-600 px-4 py-2.5 font-semibold text-white transition hover:bg-green-700"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
