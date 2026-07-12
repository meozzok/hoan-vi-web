-- Migration: thêm cột username cho bảng users, tạo bảng login_codes
-- Chạy trong Supabase Dashboard > SQL Editor > New query > Run

-- 1) Thêm cột username (Tên đăng nhập, định dạng TênZalo-4soDienThoai, vd: PhuongThao-6789)
alter table users add column if not exists username text;
-- Cho phép password_hash rỗng vì hệ thống đăng nhập mới không dùng mật khẩu nữa
alter table users alter column password_hash drop not null;

-- Sau khi chắc chắn dữ liệu cũ (nếu có) đã được cập nhật cột username, bật ràng buộc unique + not null:
-- alter table users alter column username set not null;
create unique index if not exists users_username_key on users (username);

-- 2) Bảng mã đăng nhập một lần (dùng cho luồng "Quên tên đăng nhập" — đăng nhập bằng My ID + Mã đăng nhập)
create table if not exists login_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  used boolean not null default false,
  used_by text references users(my_id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_codes_used on login_codes(used);

-- 3) Chèn 50 mã đăng nhập một lần (mỗi mã dùng được đúng 1 lần)
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
