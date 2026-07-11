-- ────────────────────────────────────────────────────────────────
-- CHẠY FILE NÀY TRONG: Supabase Dashboard > SQL Editor > New query > Run
-- (chỉ chứa phần MỚI thêm — an toàn để chạy dù bảng đã tồn tại, nhờ
--  "if not exists", không đụng tới dữ liệu users/orders hiện có)
-- ────────────────────────────────────────────────────────────────

create table if not exists bot_data (
  key text primary key,             -- 'donhang_by_subid' | 'vitien_by_subid' | 'danhan_by_subid'
  value jsonb not null default '{}',
  count integer not null default 0,
  updated_at timestamptz not null default now()
);
