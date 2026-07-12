-- Chạy toàn bộ file này trong Supabase Dashboard > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  my_id text unique not null,
  username text unique not null, -- Tên đăng nhập, định dạng TênZalo-4 số cuối SĐT (vd: PhuongThao-6789)
  password_hash text, -- không bắt buộc: hệ thống đăng nhập mới chỉ dùng Tên đăng nhập / My ID + mã đăng nhập
  display_name text,
  wallet_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Mã đăng nhập một lần, dùng cho luồng "Quên tên đăng nhập" (đăng nhập bằng My ID + Mã đăng nhập).
-- Mỗi mã chỉ dùng được đúng 1 lần.
create table if not exists login_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  used boolean not null default false,
  used_by text references users(my_id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_codes_used on login_codes(used);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  my_id text not null references users(my_id) on delete cascade,
  shopee_order_id text,
  product_name text not null,
  order_amount numeric(14,2) not null default 0,
  cashback_amount numeric(14,2) not null default 0,
  status text not null default 'pending', -- pending | confirmed | paid | cancelled
  ordered_at timestamptz not null default now()
);

create index if not exists idx_orders_my_id on orders(my_id);
create index if not exists idx_orders_ordered_at on orders(ordered_at desc);

-- Bảng lịch sử ví tiền (tuỳ chọn, dùng khi cộng/trừ tiền thật)
create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  my_id text not null references users(my_id) on delete cascade,
  amount numeric(14,2) not null,
  type text not null, -- credit | debit
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_tx_my_id on wallet_transactions(my_id);

-- Lưu ý: dự án dùng SUPABASE_SERVICE_ROLE_KEY ở phía server (API routes) để
-- đọc/ghi trực tiếp, nên KHÔNG bắt buộc bật Row Level Security. Nếu sau này
-- bạn gọi Supabase trực tiếp từ trình duyệt (client), hãy bật RLS và viết
-- policy giới hạn theo my_id trước khi làm điều đó.

-- Bảng orders cũ (demo) và wallet_balance trong users không còn được dashboard
-- dùng nữa — đơn hàng & ví tiền giờ tính trực tiếp từ dữ liệu bot (donhang/
-- vitien/danhan) theo My ID, giống hệt cách bot_v23.py tính cho lệnh
-- #donhang / #vitien. Có thể giữ lại bảng orders/cột wallet_balance để tương
-- thích ngược, không bắt buộc xoá.

-- ── [ĐÃ CHUYỂN SANG UPSTASH REDIS] ───────────────────────────────────────────
-- Dữ liệu donhang_by_subid / vitien_by_subid / danhan_by_subid (đồng bộ từ
-- phuongthaovip-main / bot_v23.py) KHÔNG còn lưu trong bảng `bot_data` ở
-- Supabase nữa — đã chuyển sang Upstash Redis, cùng cách phuongthaovip-main
-- đang dùng (xem lib/botData.js và README.md, mục "Nhận dữ liệu đơn hàng/ví
-- tiền thật từ bot"). Nếu bảng `bot_data` đã tồn tại từ trước, có thể xoá:
--   drop table if exists bot_data;


-- 50 mã đăng nhập một lần khởi tạo sẵn (mỗi mã dùng được đúng 1 lần)
insert into login_codes (code) values
  ('!fL?G44'),
  ('%nee%6S'),
  ('9?uv#2%'),
  ('mP3*86d'),
  ('z52w$@r'),
  ('3s4*?VV'),
  ('mk3?QMy'),
  ('SZ3!bnH'),
  ('3WP2v#%'),
  ('pHU@Sg9'),
  ('FVBR%z8'),
  ('5Pg2hN%'),
  ('2Zf35c$'),
  ('7$DVLgB'),
  ('#z*tD6X'),
  ('s43#%L$'),
  ('5#pJMg*'),
  ('2w6$EWT'),
  ('L8#KNu8'),
  ('9*$hpsC'),
  ('5*shp8Y'),
  ('4!Xjf$x'),
  ('5d%ufJ7'),
  ('WJxB%4r'),
  ('n@Pp%37'),
  ('d7bn2?L'),
  ('X9?N*S!'),
  ('v3pcX*n'),
  ('%z?8w6r'),
  ('Jc98#uG'),
  ('@fgM8$9'),
  ('uA@P4aM'),
  ('re@XDT9'),
  ('?%PMK6r'),
  ('3zH8#qc'),
  ('7NvaA$c'),
  ('GX?5w2@'),
  ('Ew74k#2'),
  ('CT48c@B'),
  ('FP@F*p9'),
  ('wV7K!Du'),
  ('*Lb@9sq'),
  ('9SdzHg*'),
  ('w?!z4N@'),
  ('7wm!njH'),
  ('g9%7SJ!'),
  ('u3$2#UK'),
  ('!J6N#aZ'),
  ('%$YS7%T'),
  ('!3EE98x')
on conflict (code) do nothing;
