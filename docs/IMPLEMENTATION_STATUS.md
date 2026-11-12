# Trạng thái thực hiện kế hoạch hợp nhất

Cập nhật 12/11/2026. Kế hoạch gốc của người dùng được lưu nguyên văn trong `UNIFIED_PLAN.md`. File này ghi việc thực sự đã làm, không coi checklist kế hoạch là chức năng đã có.

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
- Kiểm tra HTTP project thật xác nhận số lượng nội dung; anonymous không đọc được progress_snapshots. Email login/callback cần người dùng thực hiện; chưa ghi đã nghiệm thu luồng này.
- Backup có mục tiêu/lịch sử/sổ lỗi/từ vựng/checkpoint; guest import có preview và dedupe. Backup luôn client_practice/server_graded=false.
- Tích hợp grading RPC vào quiz UI, chuẩn hóa progress/import/events và nghiệm thu hai thiết bị vẫn còn; xem `supabase/README.md`.

## M3–M6 — Chưa triển khai

Chưa có daily adaptive plan trên sản phẩm, AI coach, nghiệm thu portfolio với người dùng thật hoặc app React Native. Theo kế hoạch, hoàn thiện luồng M2 trước khi mở rộng các mốc này.

## Lệnh kiểm tra

`npm test` kiểm tra catalog/seed không stale, domain, các chức năng web, audio và PostgreSQL. `npm run build` + `npm run test:build` kiểm tra output tĩnh. CI cài dependency bằng lockfile rồi chạy các kiểm tra này; frontend không tải PGlite.
