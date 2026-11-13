# Trạng thái thực hiện kế hoạch hợp nhất

Cập nhật 13/11/2026. Kế hoạch gốc của người dùng được lưu nguyên văn trong `UNIFIED_PLAN.md`. File này ghi việc thực sự đã làm, không coi checklist kế hoạch là chức năng đã có.

## M0 — Bản nền public

- Đã xác định repo public nhưng Pages chưa bật (`has_pages=false`); lần deploy main `3986126` thất bại tại Configure GitHub Pages.
- Đã bật Pages dùng workflow và chạy lại run `43087368751`; deploy job `131039757853` hoàn tất **success**.
- URL: https://nqthai37.github.io/toeic-path/
- Đã kiểm tra tự động dữ liệu, chấm bài, localStorage và WAV/hash; kiểm tra trình duyệt cục bộ Play/Stop, chọn/check giữ nguyên vị trí, leave → reload → resume giữ câu/đáp án/trạng thái đã check và lời giải.
- Vẫn cần người dùng thử trên thiết bị khác, tai nghe/mạng chậm và vòng nghe QA toàn bộ audio. Không ghi đã nghe thủ công 102 file.

## M1 — Logic và nội dung

- `src/domain/core.js`: chọn nguyên nhóm, xếp câu mới, scoring, thống kê lần đầu/lặp, chọn trong ngân sách thời gian, validate/merge backup; không truy cập DOM/storage/network.
- Giữ 246 ID câu, 10 ID đề, khóa lưu tiến độ và export JSON v1.
- 154 nhóm ổn định; 102 audio IDs khai báo riêng trong content bindings; version/hash/estimated_seconds được kiểm tra.
- 12 nhãn grammar đã đối chiếu prompt/options/explanation; phần còn lại chỉ `format-only`, difficulty chưa gán. Nhãn này chưa được hiệu chuẩn bằng kết quả học thực tế.
- Custom/balanced session giữ nhóm đầy đủ, nên yêu cầu 10 câu cho đủ 7 phần có thể thành 11; UI nêu rõ, giới hạn thời gian custom dựa trên số câu thực.
- Khôi phục phiên local, nhập backup merge không ghi đè và thống kê lần đầu/lặp đã tích hợp UI.

## M2 — Đã chuẩn bị SQL, chưa nghiệm thu end-to-end

- Có migration, seed đầy đủ và RPC cho một lát cắt học → lưu answer → check/submit → kết quả/review.
- Có test PostgreSQL/PGlite về RLS A/B/anon, không tự sửa score/time, không đọc private key, invalid answer, deadline, idempotency và revision (kể cả NULL revision).
- Đã nhận URL/public key, áp dụng schema/seed lên project `znklwghqiielgzbgfqtv`, bật callback đúng public URL và localhost.
- Đã nối email Auth/PKCE, SDK bundle, account-scoped local cache và backup cloud có revision/account guard.
- Kiểm tra HTTP project thật xác nhận số lượng nội dung; anonymous không đọc được progress_snapshots. Người dùng đã hoàn thành email login; ngày 13/11 đã quan sát tài khoản thật tải backup và hiển thị Saved to cloud sau reload.
- Backup có mục tiêu/lịch sử/sổ lỗi/từ vựng/checkpoint; guest import có preview và dedupe. Backup luôn client_practice/server_graded=false.
- Đã nối quiz đăng nhập vào begin/save/check/submit/snapshot/history RPC; queue theo revision, khôi phục feedback đã check, deadline dựa giờ server và kết quả lấy từ server. Guest vẫn local. Migration 004 đã áp dụng lên project thật.
- Chuẩn hóa progress/import/events và nghiệm thu hai thiết bị vẫn còn; xem `supabase/README.md`.

## M3 — Daily practice theo quy tắc

- Đã có planner thuần domain và thẻ trên Dashboard/Study plan: ngân sách trừ thời gian đã học hôm nay, giữ nguyên nhóm, tính audio/passage chung một lần và tối đa 50 câu.
- Cold start dùng baseline cân bằng; khi đủ mẫu, xen kẽ lỗi từ ngày trước, phần có ít nhất 5 câu trả lời lần đầu và tài liệu mới. Không dùng lần làm lại để nâng độ tin cậy.
- Cùng ngày/dữ liệu tạo cùng gợi ý; hồ sơ khác nhau nhận bài khác nhau. Có lý do và trạng thái hết thời gian/hết nội dung.
- Chưa lưu audit daily-plan revisions vào bảng riêng hoặc cho AI đổi lịch; đây là bước M3 đầu tiên.

## M4–M6 — Chưa triển khai

Chưa có AI coach, nghiệm thu portfolio với người dùng thật hoặc app React Native.

## Lệnh kiểm tra

`npm test` kiểm tra catalog/seed không stale, domain, các chức năng web, audio và PostgreSQL. `npm run build` + `npm run test:build` kiểm tra output tĩnh. CI cài dependency bằng lockfile rồi chạy các kiểm tra này; frontend không tải PGlite.

## Kiểm chứng kết nối ngày 13/11/2026

- Code triển khai `654a1ea`; GitHub Pages run `43184503083` thành công.
- Email login/callback do người dùng thực hiện; phiên được khôi phục sau khi mở/tải lại trang.
- Quan sát Saved to cloud cùng mục tiêu 8 tuần / 750 / 45 phút và ngày bắt đầu 12/11 được tải lại từ tài khoản.
- Đã sửa xung đột giả khi email callback mở tab thứ hai: chỉ tự xác nhận khi hai snapshot tương đương; dữ liệu thực sự khác nhau vẫn cần người dùng xử lý.
- Có test snapshot giống nhau, thứ tự key JSON, thay đổi khi đang load/offline và chống ghi dữ liệu sang tài khoản khác.
- Đây là nghiệm thu một tài khoản thật trên cùng trình duyệt. Hai tài khoản/thiết bị thật, AI coach vẫn chưa nghiệm thu; luồng server grading tiếp tục được kiểm tra bên dưới.

## Luồng practice ngày 13/11/2026

- Migration 004 chạy thành công trên Supabase Dashboard. CI/source/build kiểm tra queue, RPC, RLS, không lộ key trong snapshot mở, grading, resume, deadline và plan theo hồ sơ.
- Public Pages: đã chọn/check câu Part 5, thấy Answers saved to your account, reload → Resume khôi phục lựa chọn và lời giải. Vị trí cuộn sau phản hồi giữ nguyên.
- Đã nộp một phiên QA Part 5: 1 đáp án đúng, 7 bỏ trống. Phiên này nằm trong lịch sử tài khoản thử nghiệm, không phải bằng chứng năng lực người học. Không tự xóa dữ liệu tài khoản.
- Sửa đồng bộ nền làm mất màn hình kết quả; thêm Review results cho lịch sử đã xác minh và test không nhân đôi kết quả khi mở lại.
- Asset URLs có hash nội dung khi build, tránh trình duyệt dùng lẫn mã nguồn cũ và mới sau deploy.
