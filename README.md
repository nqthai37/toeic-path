# TOEIC Path

Website luyện TOEIC Listening & Reading với 246 câu hỏi, 10 đề riêng biệt, lộ trình 4/8/12 tuần, sổ lỗi sai và thẻ từ vựng Anh–Việt. Tiến độ lưu trong trình duyệt; có thể xuất và nhập bản sao JSON trong Study preferences.

## Cấu trúc thư mục

```text
toeic-path/
├── src/                         # Mã nguồn: chỉnh sửa tại đây
│   ├── index.html               # Khung trang và thứ tự tải script
│   ├── styles/
│   │   ├── main.css             # Giao diện chung và responsive
│   │   └── library.css          # Giao diện thư viện đề thi
│   ├── js/
│   │   ├── audio.js             # Phát file Faye/Dmitri, tốc độ và hủy phát
│   │   ├── app.js               # Điều hướng, bài thi, chấm điểm, lưu tiến độ
│   │   └── practice-library.js  # Thư viện đề và chọn câu hỏi luyện tập
│   └── data/
│       ├── questions.js         # Ngân hàng gốc, từ vựng và thông tin 7 phần
│       ├── practice-sets.js     # 10 đề bổ sung và dữ liệu minh họa
│       ├── heygen-part3.js      # 13 hội thoại Part 3
│       └── heygen-extra.js      # 89 bản thu còn lại
├── scripts/
│   ├── build.mjs                # Tạo dist từ src
│   └── serve.mjs                # Server phát triển hoặc xem bản build
├── tests/
│   ├── audio.test.cjs           # Giọng đọc, thứ tự hội thoại và hủy phát
│   └── practice.test.cjs        # Kiểm tra đường dẫn, dữ liệu và chức năng
├── dist/                        # Sinh tự động; không sửa trực tiếp, không đưa vào Git
├── .gitignore
├── package.json
└── README.md
```

Repository chứa source, scripts và tests; file build và ảnh kiểm tra cục bộ không được đưa vào Git.

## Chạy và kiểm tra

Yêu cầu Node.js 20 trở lên. Chạy `npm ci` để cài công cụ kiểm thử PostgreSQL cục bộ; frontend vẫn phục vụ file tĩnh.

```bash
npm ci
npm run dev         # Phục vụ src tại http://127.0.0.1:4174
npm test            # Kiểm tra mã nguồn, dữ liệu và đường dẫn asset
npm run build       # Tạo lại dist từ src
npm run test:build  # Kiểm tra bản build dùng để triển khai
npm run preview     # Phục vụ dist tại http://127.0.0.1:4174
```

Sau khi sửa file trong `src`, tải lại trang khi chạy `dev`. Chạy lại `build` trước khi dùng `preview` hoặc triển khai. Có thể đổi cổng bằng biến môi trường `PORT`.

## Dữ liệu và triển khai

Giữ nguyên ID câu hỏi và khóa localStorage để bảo toàn tiến độ, sổ lỗi sai và các bản sao trước đây. Mỗi đề mới có 20 câu thuộc đủ 7 phần và không trùng nhau giữa 10 đề. Bài luyện tùy chọn có 10/20/30/50 câu, ưu tiên câu chưa trả lời rồi đến câu luyện lâu nhất.


Âm thanh dùng file HeyGen tạo sẵn với Faye (nữ) và Dmitri (nam); Part 1 dùng hình minh họa. Đây là bài luyện độc lập, không phải đề TOEIC chính thức đầy đủ và không quy đổi phần trăm thành điểm TOEIC. Google Fonts là tùy chọn, có font hệ thống thay thế.

Trong bài nghe, mở **Voice settings · Faye & Dmitri** để nghe thử hai giọng và đổi tốc độ. Lựa chọn tốc độ được lưu trên thiết bị; giữ tốc độ đã lưu từ bản cũ. Website phát file tại chỗ, không cần API key ở trình duyệt và không tự đổi sang giọng hệ điều hành khi file lỗi.

## Đưa lên GitHub Pages

Workflow có sẵn tại `.github/workflows/deploy-pages.yml`. Đưa nội dung của thư mục `toeic-path` lên gốc repository GitHub (có `package.json`, `src` và `.github` ngay ở gốc). Với GitHub Free, dùng repository public.

Trong repository, vào **Settings → Pages → Build and deployment → Source** và chọn **GitHub Actions**. Sau đó push nhánh `main`, hoặc mở **Actions → Deploy TOEIC Path to GitHub Pages → Run workflow**. Workflow kiểm tra source, tạo `dist`, kiểm tra bản build và triển khai tự động. Không cần đưa `dist` vào Git, cài dependency hay tạo personal access token cho workflow.

Repository GitHub: https://github.com/nqthai37/toeic-path

Các lần cập nhật tiếp theo:

```powershell
git add src scripts tests package.json README.md
git commit -m "feat: describe the change"
git push origin main
```

Website trên Pages không có cổng đăng nhập ChatGPT của Sites. Tiến độ vẫn lưu riêng trong từng trình duyệt và theo địa chỉ website; dùng Export/Import trong Study preferences để chuyển tiến độ từ địa chỉ Sites sang Pages.

Tài liệu: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Giọng HeyGen cho toàn bộ nội dung

Nhánh `fix-voice` có **102 bản thu**: 76 đoạn nghe khác nhau cho toàn bộ Part 1–4, 24 mục từ vựng và 2 mẫu giọng. Tái sử dụng 13 hội thoại Part 3 đã có, bổ sung 89 bản thu. Câu hỏi dùng chung đoạn nghe tham chiếu chung file. File nằm trong `src/assets/audio/heygen-part3/` và `src/assets/audio/heygen-extra/`; manifest nằm trong `src/data/heygen-part3.js` và `src/data/heygen-extra.js`.

- Faye đọc Part 1, Part 4, từ vựng và câu hỏi Part 2; Dmitri đọc các lựa chọn trả lời Part 2.
- Part 3: Woman/Assistant dùng Faye, Man/Customer dùng Dmitri, không đọc nhãn vai.
- Giữ Play/Stop, nghe thử từng giọng và bốn mức tốc độ. Stop, chuyển câu hoặc phát file mới hủy file cũ; callback cũ không ảnh hưởng file mới.
- Website không gọi HeyGen khi người dùng nhấn nghe. Nếu file không tải được, trang cho thử lại hoặc đọc transcript.

`docs/heygen-part3-provenance.json` và `docs/heygen-all-voices-provenance.json` ghi voice ID, script, tham số, hash file và ánh xạ cắt/ghép theo mốc ký tự thực của HeyGen. Bản gốc PCM/timing được giữ tại thư mục artifacts cục bộ, không đưa signed URL vào repo. Các script sau chỉ ghép từ bản gốc, không dùng quota:

```bash
python scripts/assemble-heygen-part3.py --input <thu-muc-ban-goc-part3>
python scripts/assemble-heygen-remaining.py --input <thu-muc-ban-goc-con-lai>
```

Giữ tốc độ/pitch nguồn khi ghép, thêm 0.18 giây giữa các lượt. Đã đối chiếu text đầu vào với mốc ký tự, kiểm tra WAV, hash, thời lượng và đoạn không im lặng. Chưa có vòng nghe thủ công toàn bộ 102 bản thu; kiểm tra dữ liệu không thay thế đánh giá nghe về phát âm.

## Kế hoạch React Native + Supabase

Xem [kế hoạch migration](docs/REACT_NATIVE_SUPABASE_PLAN.md): Expo/React Native/TypeScript, Supabase Auth/Postgres/Storage, RLS, chấm bài phía server, đồng bộ offline và nhập tiến độ từ web. Dự kiến MVP 2–4 tuần cho một lập trình viên, điều chỉnh sau PoC và chưa gồm xét duyệt app store. Hiện mới lập kế hoạch, chưa tạo app native hay project Supabase.

## Lịch sử chức năng

Xem [kế hoạch và các mốc commit](docs/FEATURE_HISTORY.md). Các commit được tổ chức lại từ những bản source đã có; source ứng dụng ở commit cuối giữ nguyên so với bản đang triển khai.

## Triển khai kế hoạch hợp nhất

Kế hoạch hiện hành: [UNIFIED_PLAN.md](docs/UNIFIED_PLAN.md); [trạng thái thực hiện và bằng chứng](docs/IMPLEMENTATION_STATUS.md). Kế hoạch này thay ưu tiên mobile trước bằng web trước.

- `src/domain/core.js`: logic thuần, không phụ thuộc DOM/localStorage; chọn nguyên nhóm, tính thời gian chung một lần, chấm điểm, tách lần đầu/làm lại và kiểm tra/merge backup.
- `src/data/content-bindings.json`: ID nhóm/audio khai báo riêng, không phụ thuộc nguyên văn transcript. `content-metadata.js` được sinh bằng `npm run content:generate`, kiểm tra bằng `npm run content:check`.
- Có 154 nhóm, 246 content versions, 102 audio IDs. Chỉ 12 nhãn kỹ năng grammar đã đối chiếu câu hỏi/lời giải; các câu khác ghi rõ `format-only`, độ khó chưa hiệu chuẩn (`null`). Thời gian là ước lượng, chưa đo thực nghiệm.
- Phiên đang làm lưu riêng trên thiết bị; Overview có Resume. Giữ thời hạn timed khi resume, giữ trạng thái đã check và lời giải. Bản web local không chống việc đổi giờ máy; backend dùng thời gian server.
- Backup JSON v1 được xem số bản ghi trước khi merge, không thay mục tiêu đang dùng, không nhân đôi session và không xóa lịch sử hiện có. Dữ liệu cũ chưa kiểm chứng ghi `legacy_import`, `server_graded=false`.
- `supabase/migrations/` và `supabase/seed.sql`: nền backend với RLS, snapshot bài, chấm điểm server và kiểm tra revision. Chưa nối frontend với Supabase; xem [hướng dẫn kết nối](supabase/README.md).

`npm test` gồm cả PostgreSQL/PGlite: tài khoản A/B/anonymous, quyền dữ liệu con, đáp án riêng, điểm server, option sai, hết hạn và submit/start lặp. PGlite mô phỏng `auth.uid()` để kiểm tra SQL; không thay thế kiểm thử Auth/API trên project Supabase thật.
