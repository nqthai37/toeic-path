# Backend foundation — M2 đang triển khai

Các file này chưa được áp dụng lên project Supabase. Frontend hiện vẫn lưu trên thiết bị; không có nút đăng nhập giả hoặc thông báo lưu cloud khi chưa kết nối.

## Chuẩn bị project

1. Tạo project Supabase riêng cho TOEIC Path; tự giữ mật khẩu database.
2. Cung cấp Project URL và **publishable key** (hoặc legacy anon key) cho cấu hình frontend. Không đưa service-role key, database password hay AI key vào frontend/Git.
3. Trên project mới, chạy theo thứ tự bằng SQL Editor hoặc CLI migrations:
   - `migrations/202611120001_learning_foundation.sql`
   - `seed.sql`
4. Bật provider email theo nhu cầu và cấu hình Site URL/Redirect URLs cho địa chỉ Pages cùng localhost. Đây là bước cần project thật; chưa xác nhận Auth ở task này.
5. Nối SDK Auth và repository vào UI, kiểm tra bằng hai tài khoản thật trước khi đánh dấu M2 hoàn thành.

Không chạy seed vào dữ liệu production đang có mà chưa đối chiếu schema/backup. Seed hiện phục vụ lần nhập nội dung ban đầu, idempotent với cùng content; chưa phải công cụ nâng version nội dung đang hoạt động.

## Đã có

- Profiles và study plans theo tài khoản.
- 246 câu / 154 nhóm / 102 audio references / 10 test; ID gốc giữ nguyên. Audio vẫn phục vụ từ Pages, chưa upload Storage.
- RLS cho các bảng exposed; attempt, answers, results, review chỉ đọc theo chủ sở hữu; ghi qua RPC.
- Đáp án chuẩn và bản chụp đáp án nằm trong schema private, không cấp quyền cho anon/authenticated.
- `start_attempt`: auth, nhóm đầy đủ, snapshot phiên bản và idempotency key theo tài khoản. Đề cố định lấy danh sách/thời gian từ server.
- `save_answer`: ownership, trạng thái, thời hạn server, option/câu thuộc attempt và optimistic revision.
- `check_answer`: feedback learning; timed phải nộp trước.
- `submit_attempt`: khóa attempt, chấm trong transaction, cập nhật review; nộp lại trả cùng kết quả.
- `save_study_plan`: revision, giới hạn mục tiêu/thời gian, không nhận user_id từ client.

Sau khi hết hạn, server từ chối đáp án mới. Nộp muộn chỉ chấm các đáp án đã được server nhận trước hạn; không khôi phục thời gian hoặc nhận answer payload muộn.

## Chưa có — không coi M2 hoàn tất

- Auth/SDK frontend, cấu hình project và xác nhận lưu cloud trên UI.
- Resume qua HTTP và thiết bị thứ hai; UI hiện chỉ resume trên thiết bị.
- Import cloud có dedupe/payload hash; hiện chỉ merge backup local.
- Cloud vocabulary/progress events, quản lý tài khoản đầy đủ.
- Daily plan items/revisions, AI coach/quota/retention; thuộc các mốc sau.

Frontend tĩnh cũ có đáp án trong ngân hàng public. Việc schema backend giữ answer key riêng **không** biến bản demo local thành hệ thống chống gian lận. Khi nối timed flow, dùng snapshot/API phía server và không coi điểm do client gửi là đã xác minh.

## Kiểm thử

```bash
npm ci
npm run backend:seed
npm run test:db
```

Test dùng PostgreSQL qua PGlite trong RAM; `auth.users` và `auth.uid()` được stub riêng trong test để mô phỏng claim. Migration thực không tạo hoặc thay đổi schema Auth của Supabase. Đã kiểm tra SQL/RLS bằng hai UUID và role anonymous; Auth, JWT, HTTP, email callback và môi trường Supabase thật vẫn cần integration test.

Tài liệu chính thức: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions).
