# Backend foundation — M2 đang triển khai

Đã áp dụng schema, seed và đồng bộ tiến độ lên project `znklwghqiielgzbgfqtv` ngày 12/11/2026. Frontend đã nối email Auth/PKCE và backup theo tài khoản. Chỉ báo Saved to cloud sau khi RPC trả revision mới; người dùng đã hoàn thành email login, và đã quan sát Saved to cloud sau reload ngày 13/11/2026.

## Chuẩn bị project

1. Tạo project Supabase riêng cho TOEIC Path; tự giữ mật khẩu database.
2. Cung cấp Project URL và **publishable key** (hoặc legacy anon key) cho cấu hình frontend. Không đưa service-role key, database password hay AI key vào frontend/Git.
3. Trên project mới, chạy theo thứ tự bằng SQL Editor hoặc CLI migrations:
   - `migrations/202611120001_learning_foundation.sql`
   - `migrations/202611120002_progress_sync.sql`
   - `migrations/202611120003_account_fence.sql`
   - `seed.sql`
4. Bật provider email theo nhu cầu và cấu hình Site URL/Redirect URLs cho địa chỉ Pages cùng localhost. Site URL đã đặt về GitHub Pages; allowlist gồm public URL, `http://127.0.0.1:4174/` và `http://localhost:4174/`.
5. SDK Auth/repository đã nối UI. Kiểm tra email login và hai tài khoản thật trước khi đánh dấu M2 hoàn thành.

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

- Đã nghiệm thu email login/callback và tải backup với một tài khoản thật; hai tài khoản/thiết bị thật vẫn cần nghiệm thu thêm.
- Backup có cả checkpoint để restore/resume qua cloud; thiết bị thứ hai chưa nghiệm thu thực tế.
- Import local/guest merge có dedupe rồi lưu snapshot cloud; chưa chuẩn hóa lịch sử import thành các server-graded attempts.
- Từ vựng/lịch sử/mục tiêu nằm trong backup cloud; các bảng events/vocabulary chuẩn hóa và quản lý tài khoản đầy đủ để sau.
- Daily plan đã tính từ lịch sử đồng bộ trên client; bảng audit items/revisions, AI coach/quota/retention còn ở các bước sau.

Frontend tĩnh cũ có đáp án trong ngân hàng public. Việc schema backend giữ answer key riêng **không** biến bản demo local thành hệ thống chống gian lận. Timed flow đăng nhập hiện dùng snapshot/API phía server và không coi điểm do client gửi là đã xác minh.

## Kiểm thử

```bash
npm ci
npm run backend:seed
npm run test:db
```

Test dùng PostgreSQL qua PGlite trong RAM; `auth.users` và `auth.uid()` được stub riêng trong test để mô phỏng claim. Migration thực không tạo hoặc thay đổi schema Auth của Supabase. Đã kiểm tra SQL/RLS bằng hai UUID và role anonymous; Auth, JWT, HTTP, email callback và môi trường Supabase thật vẫn cần integration test.

Tài liệu chính thức: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions).

## Backup và điểm server

`progress_snapshots` được RLS theo auth.uid(); client không ghi bảng trực tiếp. RPC `save_progress` validate payload, khóa theo tài khoản, kiểm tra revision, bắt buộc `_owner_id` trùng auth.uid() và loại mọi cờ server_graded do client gửi. `_owner_id` chỉ là chốt chống race khi đổi tài khoản, không cấp quyền thay cho JWT.

Backup không biến kết quả browser thành điểm server. Các RPC attempt/answer/submit hiện có tiếp tục giữ answer key riêng và quyền ghi server; quiz đăng nhập hiện đã gọi wrapper practice RPC từ migration 202611130004. Snapshot mở không trả answer key; chỉ feedback đã check hoặc kết quả sau submit mới có lời giải. History được lấy lại từ server, không tin cờ trong backup.

Đã kiểm tra HTTP bằng public key: 246 questions, 154 question_groups, 10 practice_tests, 102 audio_assets; anonymous đọc progress_snapshots bị từ chối (401/42501). Không đưa service-role key vào ứng dụng.
