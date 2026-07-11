# Hoàn Ví — Web chuyển link Shopee nhận hoàn tiền theo My ID

Web app Next.js, deploy trên Vercel. Người dùng đăng nhập bằng **My ID** riêng, dán link Shopee để
tự động gắn My ID làm `sub_id`, rồi tra cứu **đơn hàng** và **ví tiền** của mình.

## Tính năng
- Đăng ký / đăng nhập bằng **My ID + mật khẩu** (không dùng Google/Facebook)
- Mỗi My ID là duy nhất, dùng làm `sub_id` gắn vào mọi link Shopee đã chuyển
- Ô chuyển link Shopee → sinh link mới có gắn My ID (đang ở chế độ demo, xem phần "Nối API thật" bên dưới)
- Ô đơn hàng: danh sách đơn hàng gắn với My ID, trạng thái Chờ xác nhận / Đã xác nhận / Đã cộng ví / Đã huỷ
- Ô ví tiền: số dư hoàn tiền hiện có, số đơn chờ hoàn tiền
- Dữ liệu lưu thật trong Supabase (Postgres)

## 1. Tạo database Supabase (miễn phí)
1. Vào https://supabase.com → tạo tài khoản → **New project** (nhớ mật khẩu database, chọn region gần VN như Singapore).
2. Vào **SQL Editor** → **New query** → dán toàn bộ nội dung file `supabase-schema.sql` trong repo này → **Run**.
3. Vào **Project Settings → API**, copy 2 giá trị:
   - `Project URL` → dùng cho biến `SUPABASE_URL`
   - `service_role` key (mục Project API keys, **không phải** `anon` key) → dùng cho `SUPABASE_SERVICE_ROLE_KEY`

⚠️ `service_role` key có toàn quyền, chỉ dùng ở server (đã cấu hình sẵn trong code), tuyệt đối không đưa vào code phía client hay commit lên GitHub public.

## 2. Chạy thử ở máy local
```bash
npm install
cp .env.example .env.local   # rồi điền SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm run dev
```
Mở http://localhost:3000 → sẽ tự chuyển tới `/login`. Chọn tab "Tạo My ID mới" để đăng ký tài khoản đầu tiên (hệ thống tự tạo demo 1 đơn hàng mẫu để bạn xem giao diện).

`JWT_SECRET` là chuỗi bí mật tự đặt, có thể tạo nhanh bằng lệnh:
```bash
openssl rand -base64 32
```

## 3. Deploy lên Vercel
1. Đẩy code này lên một repo GitHub (repo riêng tư cũng được).
2. Vào https://vercel.com → **Add New → Project** → chọn repo vừa đẩy lên.
3. Ở phần **Environment Variables**, thêm đúng 3 biến (copy từ `.env.local` của bạn):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
4. Bấm **Deploy**. Xong là có link `xxxxx.vercel.app` dùng được ngay.

## 4. Nối API Shopee Affiliate thật (khi bạn có code/API)
Toàn bộ logic chuyển link đang nằm gọn trong 1 file: `lib/shopee.js`, hàm `convertShopeeLink()`.
Hiện tại nó chỉ gắn tham số `af_sub_id` / `sub_id` = My ID vào link Shopee gốc (demo, không gọi API ngoài).

Khi có API/code Shopee Affiliate thật, chỉ cần thay nội dung hàm này bằng lệnh gọi API thật (đã có
comment hướng dẫn mẫu ngay trong file). Không cần sửa gì ở giao diện hay các trang khác.

Tương tự, dữ liệu **đơn hàng** hiện đọc trực tiếp từ bảng `orders` trong Supabase (đang có 1 đơn demo
khi tạo tài khoản). Khi có webhook/API thật từ Shopee trả về đơn hàng theo `sub_id`, chỉ cần insert
dữ liệu vào bảng `orders` (và cộng tiền vào `users.wallet_balance` khi đơn được duyệt hoàn tiền) —
giao diện sẽ tự hiển thị, không cần sửa code frontend.

## Cấu trúc thư mục chính
```
app/
  login/page.js          → trang đăng nhập / đăng ký My ID
  dashboard/page.js       → trang chính (server component, lấy dữ liệu)
  dashboard/DashboardClient.js → giao diện chuyển link, ví tiền, bảng đơn hàng
  api/auth/register       → API tạo My ID mới
  api/auth/login          → API đăng nhập
  api/auth/logout         → API đăng xuất
  api/me                  → API lấy thông tin tài khoản + số dư ví
  api/convert-link        → API chuyển link Shopee (demo)
  api/orders              → API lấy danh sách đơn hàng
lib/
  supabase.js             → kết nối Supabase (server-only)
  auth.js                 → tạo/xác thực JWT phiên đăng nhập
  password.js             → băm/kiểm tra mật khẩu
  shopee.js                → logic chuyển link Shopee (chỗ cần thay API thật)
proxy.js                  → bảo vệ route /dashboard, redirect nếu chưa đăng nhập
supabase-schema.sql       → schema database, chạy 1 lần trong Supabase SQL Editor
```
