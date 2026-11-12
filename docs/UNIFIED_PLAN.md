# TOEIC Path — Kế hoạch phát triển hợp nhất

Cập nhật: 12/11/2026

## 1. Mục tiêu

Hoàn thiện TOEIC Path thành dự án fullstack có demo public để thay SAMI trong CV: người học biết hôm nay cần luyện gì, hiểu lỗi sai và nhận kế hoạch thay đổi theo tiến độ cùng quỹ thời gian.

Luồng sản phẩm trọng tâm: đặt mục tiêu → kiểm tra ngắn → nhận kế hoạch → làm bài → xem lỗi → hỏi AI → cập nhật buổi học tiếp theo.

Ưu tiên web trước; React Native là giai đoạn tiếp theo, dùng chung backend và logic học. Đây là kế hoạch đề xuất, không phải báo cáo các chức năng đã triển khai.

## 2. Hiện trạng đã đối chiếu

Dựa trên source và tài liệu nhánh `fix-voice` ngày 12/11/2026:

- Web JavaScript thuần, HTML/CSS, điều hướng hash; chưa phải React/Vite.
- 246 câu hỏi, 10 mini-test, luyện theo phần, từ vựng, sổ lỗi sai và thống kê.
- Tiến độ lưu localStorage; có export/import JSON.
- Khung lộ trình 4/8/12 tuần; lựa chọn câu ưu tiên câu chưa làm rồi đến câu làm lâu.
- 102 file audio: 76 đoạn nghe, 24 mục từ vựng và 2 mẫu giọng. Audio là giọng HeyGen tạo sẵn, không phải xác nhận bản thu người thật.
- Player phát file, có Play/Stop, chỉnh tốc độ và bảo vệ khỏi callback cũ; không dùng TTS thiết bị hay gọi HeyGen khi học.
- Có build script, tests và workflow GitHub Pages.

Giới hạn kiểm tra: đã đọc source và tài liệu; chưa nghe toàn bộ audio hoặc xác nhận mọi luồng trên thiết bị thật. Trạng thái deploy phải kiểm tra lại khi bắt đầu M0; không dùng lỗi CI cũ để kết luận trạng thái hiện tại.

## 3. Điều chỉnh so với kế hoạch React Native + Supabase

| Nội dung | Quyết định hợp nhất |
| --- | --- |
| Nền tảng đầu tiên | Hoàn thành web public trước, mobile sau |
| Giao diện | Giữ UI hiện có, tách logic khỏi DOM dần; không viết lại toàn bộ ngay |
| Backend | Supabase Auth + PostgreSQL + RLS; RPC/Edge Functions cho thao tác server |
| Offline | MVP có trạng thái lưu/đồng bộ rõ ràng; SQLite/outbox và xung đột nhiều thiết bị để sau |
| Lộ trình | Giữ khung tuần, bổ sung kế hoạch ngày dựa trên kỹ năng và lỗi sai |
| AI | Giải thích, tổng kết và đề xuất đổi lịch; không tự ghi database |
| Audio | Tái sử dụng toàn bộ file; tập trung QA, ánh xạ ổn định và phân phối |
| Tiến độ | Chia mốc nghiệm thu, điều chỉnh ước lượng theo kết quả thực tế |

## 4. Phạm vi MVP

### Bao gồm

- Đăng nhập, hồ sơ, mục tiêu và quỹ thời gian học.
- Giữ các chức năng luyện tập, audio và nội dung hiện có.
- Lưu cloud, phục hồi bài đang làm và nhập tiến độ cũ.
- Bài học hôm nay có cá nhân hóa và giải thích lý do lựa chọn.
- AI coach có ngữ cảnh, xác thực và giới hạn sử dụng.
- Demo public, README, kiểm thử trọng tâm và phản hồi người dùng thật.

### Để sau MVP

- Mobile Android/iOS, offline đầy đủ và đồng bộ xung đột nhiều thiết bị.
- Chấm phát âm, hội thoại giọng nói realtime, sinh audio lúc học.
- Thanh toán, cộng đồng, marketplace và dashboard admin lớn.
- Cam kết tăng điểm TOEIC hoặc quy đổi độ chính xác mini-test thành điểm thi chính thức.

## 5. Kiến trúc

| Thành phần | Trách nhiệm |
| --- | --- |
| Web hiện tại trên GitHub Pages | Giao diện, trình phát audio, nhập liệu và hiển thị tiến độ |
| Logic học độc lập | Chọn câu/nhóm, thống kê, lập lịch, kiểm tra dữ liệu; chuyển dần sang TypeScript khi triển khai |
| Supabase Auth | Tài khoản và phiên đăng nhập |
| PostgreSQL + RLS | Nội dung, bài làm, kế hoạch và dữ liệu cá nhân |
| RPC/Edge Functions | Chấm bài, import, kiểm tra quyền, lập kế hoạch và gọi AI |
| Audio assets | Giữ file hiện có; chuyển sang Storage khi có nhu cầu quản lý hoặc mobile |

GitHub Pages phục vụ frontend tĩnh; logic chứa API key chạy phía server. Client chỉ dùng khóa công khai phù hợp và quyền dữ liệu được kiểm soát bằng RLS. Không đưa khóa AI/service-role vào source frontend hoặc bundle.

Không bắt buộc chuyển frontend sang React để đạt MVP. Nếu chuyển sau này, làm từng màn hình khi logic đã tách khỏi DOM.

## 6. Nội dung và cá nhân hóa

### Metadata cần bổ sung

| Trường | Ý nghĩa |
| --- | --- |
| skill_tags | Kỹ năng: word-form, verb-tense, inference, paraphrase… |
| difficulty | Độ khó do người biên soạn đánh giá ban đầu, chưa phải mức đã hiệu chuẩn |
| group_id | Nhóm câu dùng chung đoạn nghe/bài đọc |
| estimated_seconds | Thời gian ước lượng, gồm chi phí nghe/đọc chung theo nhóm |
| content_version | Phiên bản nội dung và đáp án |
| audio_asset_id | ID audio ổn định, tách khỏi nguyên văn transcript |

Giữ ID câu hỏi và đề cũ để nhập tiến độ. Rà soát nhãn và đáp án; không tự coi nhãn do AI sinh là đúng nếu chưa kiểm tra.

### Quy tắc chọn bài ban đầu

1. Khi chưa đủ dữ liệu, dùng bài khảo sát cân bằng.
2. Ưu tiên nội dung đến hạn ôn.
3. Bổ sung nhóm bài thuộc kỹ năng thường sai.
4. Dành một phần thời gian cho nội dung mới.
5. Giữ cấu trúc nhóm câu nghe/đọc; tính thời gian đoạn chung một lần.
6. Chọn bài trong quỹ thời gian; nếu không có nhóm phù hợp, đề xuất bài ngắn hơn và giải thích.
7. Sau buổi học, cập nhật các nhiệm vụ chưa hoàn thành, giữ nguyên lịch sử đã học.

Không kết luận yếu kỹ năng chỉ từ một hoặc hai câu. Tách kết quả lần đầu khỏi kết quả làm lại, tránh nhầm nhớ đáp án với tiến bộ. Trường hợp thiếu dữ liệu phải thể hiện độ tin cậy thấp.

Ví dụ lý do: “Ưu tiên loại từ vì bạn sai 4/6 câu gần đây; buổi hôm nay gồm bài loại từ, một nhóm nghe và ôn lỗi cũ, dự kiến 20 phút.”

Các tỷ lệ phân bổ/ngưỡng là giả thuyết thiết kế cần thử nghiệm. Chưa tuyên bố đã tối ưu hiệu quả học tập.

## 7. AI coach

| Chức năng | Ngữ cảnh | Kết quả |
| --- | --- | --- |
| Giải thích câu sai | Câu hỏi, lựa chọn, đáp án và lời giải chuẩn | Giải thích tiếng Việt và ví dụ bổ sung |
| Tổng kết buổi học | Thống kê do code tính, nhóm lỗi | Nhận xét có căn cứ và gợi ý luyện tập |
| Điều chỉnh lịch | Mục tiêu, quỹ thời gian, tiến độ và bài khả dụng | Đề xuất thay đổi cùng lý do để người học áp dụng |

### Hợp đồng xử lý

- Backend xác thực người dùng và lấy đúng dữ liệu của họ; không tin user_id do client gửi.
- Chỉ gửi ngữ cảnh cần thiết, không gửi email hoặc toàn bộ hồ sơ nếu không cần.
- AI trả dữ liệu có cấu trúc; server kiểm tra schema, ID bài, thời lượng và phiên bản kế hoạch.
- Người học xem đề xuất trước khi áp dụng. Server từ chối cập nhật dựa trên revision đã cũ.
- Không cho chatbot tiết lộ đáp án timed attempt chưa nộp.
- Có timeout, giới hạn độ dài, giới hạn lượt gọi và ngân sách. Không retry vô hạn.
- Khi AI lỗi, chức năng học, lời giải chuẩn và kế hoạch hiện có vẫn hoạt động.
- Không train model, không cần multi-agent hoặc vector database cho MVP.

## 8. Mô hình dữ liệu

| Nhóm bảng | Nội dung |
| --- | --- |
| profiles | user_id, tên hiển thị, múi giờ, ngôn ngữ |
| study_plans / study_plan_items | Mục tiêu, lịch, nhiệm vụ theo ngày, thời lượng, trạng thái, revision |
| plan_revisions | Lịch sử thay đổi kế hoạch và lý do |
| skills / question_skills | Kỹ năng và ánh xạ câu hỏi |
| question_groups / questions / question_options | Nội dung có phiên bản và nhóm dùng chung |
| private.answer_keys | Đáp án/lời giải, không expose trực tiếp qua Data API |
| practice_tests / test_questions | Đề và thứ tự câu |
| audio_assets | ID, đường dẫn, hash, thời lượng, transcript/voice metadata |
| attempts / attempt_questions / attempt_answers | Phiên làm bài, snapshot câu/version và lựa chọn |
| attempt_results | Kết quả server chấm và thời điểm chấm |
| review_items | Nội dung cần ôn, lịch ôn, lần ôn gần nhất |
| vocabulary / vocabulary_progress | Nội dung và tiến độ từ vựng |
| study_events | Hoạt động, thời điểm, dữ liệu suy ra streak |
| legacy_imports | Payload hash, nguồn và kết quả nhập |
| coach_threads / coach_messages / ai_usage | Hội thoại và dữ liệu sử dụng tối thiểu; có chính sách lưu/xóa |

Timestamp lưu UTC; ngày học và start_date theo múi giờ tài khoản. Thêm index theo truy vấn thực tế. Bản ghi cá nhân phải được bảo vệ bởi RLS; client không được tự ghi điểm server hay cờ server_graded.

### Chấm bài và trạng thái attempt

- start-attempt chốt danh sách câu/version, mode và hạn nộp nếu có.
- save-answer kiểm tra quyền sở hữu, câu thuộc attempt, option hợp lệ và trạng thái còn mở.
- Learning mode có thể trả giải thích sau khi kiểm tra đáp án.
- Timed mode không trả đáp án trước khi nộp; thời hạn do server kiểm tra.
- submit-attempt phải idempotent; chấm bài và cập nhật tiến độ nhất quán trong transaction.
- Attempt đã nộp là bất biến. MVP chưa hỗ trợ hai thiết bị đồng thời sửa một attempt.
- Đây là công cụ luyện tập, không phải hệ thống thi chính thức chống gian lận.

## 9. Chuyển dữ liệu và phục hồi

- Giữ định dạng export JSON v1 để nhập lịch sử cũ.
- Kiểm tra kích thước, schema, ID, ngày giờ và option; xem trước thống kê trước khi nhập.
- Không nhận user_id từ file; chỉ nhập vào tài khoản đang đăng nhập.
- Tính lại điểm khi đủ dữ liệu và đúng phiên bản; nếu không kiểm chứng được, ghi nguồn legacy_import và không đánh dấu server-verified.
- Dedupe bằng payload hash và ID ổn định; nhập lại không nhân đôi.
- Không tự xóa tiến độ hiện tại; giữ backup trước thao tác lớn.
- Hiển thị rõ đang lưu/đã lưu/chưa đồng bộ. Không báo “đã lưu cloud” khi chưa có xác nhận.
- Chốt chính sách mất mạng/timeout cho timed mode; chưa hứa chấm và nộp timed test offline.

## 10. Audio

- Tái sử dụng 102 file; không phát sinh tác vụ tạo giọng trong luồng học.
- Chuyển ánh xạ dựa trên nguyên văn text sang audio_asset_id để sửa transcript không làm mất file.
- Kiểm tra đầy đủ ánh xạ câu/nhóm → file, duration/hash và lỗi thiếu asset.
- Nghe QA số tiền, giờ, từ phủ định, phát âm và chuyển vai. Theo dõi file đã nghe/chưa nghe.
- Thử Play/Stop, tốc độ, đổi câu, thoát màn hình, tai nghe và mạng chậm trên thiết bị thật.
- Giữ master WAV; thử MP3/AAC cho phân phối và đối chiếu chất lượng trước khi thay.
- Chưa cần chuyển Storage nếu cách phục vụ hiện tại hoạt động tốt. Khi chuyển, chỉ server/admin được upload/xóa; dữ liệu cá nhân không nằm trong bucket public.

## 11. Lộ trình và nghiệm thu

| Mốc | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| M0: Bản nền | Kiểm tra deploy/audio/làm bài/lưu tiến độ | URL public hoạt động trên máy khác; hoàn thành bài nghe và tải lại còn kết quả |
| M1: Logic và nội dung | Tách domain logic; metadata kỹ năng, nhóm, phiên bản | Test độc lập; giữ ID và dữ liệu cũ |
| M2: Backend | Auth, schema, RLS, lưu/resume/import | User A/B cách ly; import lặp không trùng; resume đúng |
| M3: Cá nhân hóa | Bài hôm nay, lịch ôn, phân bổ thời gian, lý do | Hồ sơ khác nhau nhận kế hoạch khác nhau; không vượt thời gian theo quy tắc |
| M4: AI coach | Giải thích, tổng kết, đổi lịch có kiểm tra | Đúng ngữ cảnh; xử lý lỗi; không sửa dữ liệu trái quyền |
| M5: Portfolio | E2E, người dùng thử, README, demo và số liệu | Người khác tự hoàn thành luồng học; xử lý lỗi nghiêm trọng |
| M6: Mobile | Expo/React Native dùng chung domain/backend | Một luồng online hoàn chỉnh trên thiết bị thật trước khi thêm offline |

Ước lượng M0–M5: 6–8 tuần ở mức 10–15 giờ/tuần, cần điều chỉnh sau M1 và M2. Đây là khung dự kiến, không phải cam kết. Nếu trễ mốc, giảm tính năng phụ trước; không bỏ kiểm tra phân quyền, lưu dữ liệu hoặc deploy.

## 12. React Native sau MVP web

- Expo + React Native + TypeScript; chọn SDK/thư viện tương thích tại thời điểm triển khai và khóa bằng lockfile.
- Tái sử dụng types, thuật toán, API và tests; UI DOM phải viết lại bằng thành phần native.
- PoC phát audio và auth trên thiết bị thật trước khi chuyển hết màn hình.
- Bắt đầu từ một luồng: đăng nhập → bài nghe → nộp → kết quả → xem lại tiến độ.
- Sau luồng online mới triển khai SQLite/cache/outbox, giới hạn dung lượng và retry có idempotency.
- Thiết kế giải quyết xung đột bằng revision, không ghi đè âm thầm. Timed mode có chính sách server riêng.
- Phát hành store và thời gian xét duyệt không nằm trong MVP web.

## 13. Kiểm thử và vận hành

- Unit: chọn nhóm, ngân sách thời gian, thống kê lần đầu/làm lại, ôn tập, scoring và import.
- Database: user A/B/anonymous, dữ liệu con thuộc attempt, submit lặp, option sai, nộp quá hạn.
- AI: đầu ra sai schema, ID không tồn tại, đề xuất quá thời gian, timeout, quota và ngữ cảnh không đủ.
- Audio: ánh xạ, file lỗi, đổi câu, Stop, rate và thiết bị thật.
- E2E: đăng nhập → mục tiêu → học → kết quả → AI → áp dụng lịch → đăng nhập thiết bị khác.
- CI chạy kiểm tra thích hợp và build. Không đưa secret/token vào log.
- Theo dõi lỗi, độ trễ AI, chi phí gọi và tải audio; đặt giới hạn sử dụng trước khi public AI.
- Có migration được review, backup khi chuyển dữ liệu và bản web ổn định để rollback.

## 14. Điều kiện đưa vào CV

- [ ] Demo public hoạt động, có cách dùng thử dễ hiểu.
- [ ] Tài khoản và dữ liệu được phân quyền đúng.
- [ ] Hoàn thành luồng học xuyên suốt và phục hồi tiến độ.
- [ ] Lộ trình thay đổi dựa trên dữ liệu, giải thích được lý do.
- [ ] AI có ngữ cảnh, kiểm tra đầu ra và xử lý lỗi.
- [ ] README mô tả kiến trúc, cách chạy, quyết định và giới hạn.
- [ ] Có video demo ngắn cùng phản hồi người dùng thực tế.
- [ ] Chỉ ghi số liệu đã đo; không bịa mức cải thiện điểm hay lượng người dùng.

Không cần chờ cả Android và iOS để thay SAMI. Mốc phù hợp là hoàn thành M0–M5 với bằng chứng hoạt động.

## 15. Thứ tự bắt đầu

1. Chốt bản web/audio ổn định và xác nhận URL deploy.
2. Kiểm kê nội dung, giữ ID; gắn nhãn kỹ năng cho một tập nhỏ đã rà soát.
3. Tách module chọn câu/nhóm, thống kê và lập lịch khỏi app.js.
4. Thiết kế migrations/RLS và kiểm tra hai tài khoản trước khi nối dữ liệu cá nhân.
5. Hoàn thiện một luồng nhỏ: đăng nhập → học một nhóm → lưu → xem lại.
6. Thêm kế hoạch thích nghi; sau đó thêm một chức năng AI “Giải thích câu sai”.
7. Mở rộng chỉ khi luồng trước đã đạt nghiệm thu.

## Nguồn và tài liệu tham khảo

- Repository: https://github.com/nqthai37/toeic-path
- Kế hoạch mobile gốc: https://github.com/nqthai37/toeic-path/blob/fix-voice/docs/REACT_NATIVE_SUPABASE_PLAN.md
- GitHub Pages: https://docs.github.com/en/pages
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Expo Router: https://docs.expo.dev/router/introduction/
- Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/

Các đường dẫn nền tảng là tài liệu để đối chiếu khi triển khai; kế hoạch này không khóa phiên bản SDK hoặc cam kết hạn mức/chi phí dịch vụ.
