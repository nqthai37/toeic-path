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
│   │   ├── audio.js             # Giọng nữ/nam, tách lượt thoại, tốc độ và lưu lựa chọn
│   │   ├── app.js               # Điều hướng, bài thi, chấm điểm, lưu tiến độ
│   │   └── practice-library.js  # Thư viện đề và chọn câu hỏi luyện tập
│   └── data/
│       ├── questions.js         # Ngân hàng gốc, từ vựng và thông tin 7 phần
│       └── practice-sets.js     # 10 đề bổ sung và dữ liệu minh họa
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

Yêu cầu Node.js 20 trở lên. Không cần cài dependency.

```bash
npm run dev         # Phục vụ src tại http://127.0.0.1:4174
npm test            # Kiểm tra mã nguồn, dữ liệu và đường dẫn asset
npm run build       # Tạo lại dist từ src
npm run test:build  # Kiểm tra bản build dùng để triển khai
npm run preview     # Phục vụ dist tại http://127.0.0.1:4174
```

Sau khi sửa file trong `src`, tải lại trang khi chạy `dev`. Chạy lại `build` trước khi dùng `preview` hoặc triển khai. Có thể đổi cổng bằng biến môi trường `PORT`.

## Dữ liệu và triển khai

Giữ nguyên ID câu hỏi và khóa localStorage để bảo toàn tiến độ, sổ lỗi sai và các bản sao trước đây. Mỗi đề mới có 20 câu thuộc đủ 7 phần và không trùng nhau giữa 10 đề. Bài luyện tùy chọn có 10/20/30/50 câu, ưu tiên câu chưa trả lời rồi đến câu luyện lâu nhất.


Âm thanh dùng speech synthesis của trình duyệt; Part 1 dùng hình minh họa. Đây là bài luyện độc lập, không phải đề TOEIC chính thức đầy đủ và không quy đổi phần trăm thành điểm TOEIC. Google Fonts là tùy chọn, có font hệ thống thay thế.

Trong bài nghe, mở **Voice settings · female & male** để chọn và nghe thử hai giọng tiếng Anh, hoặc đổi tốc độ. Hội thoại tách thành từng lượt: Woman/Assistant dùng giọng nữ, Man/Customer dùng giọng nam, không đọc nhãn vai. Giọng nữ cũng dùng mặc định cho thông báo và từ vựng. Lựa chọn được lưu riêng trên thiết bị. Danh sách giọng phụ thuộc trình duyệt/hệ điều hành; khi chỉ có một giọng tiếng Anh, trang hiển thị thông báo và vẫn phát bằng giọng đó. Không cần API key hay dịch vụ âm thanh trả phí.

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

## Lịch sử chức năng

Xem [kế hoạch và các mốc commit](docs/FEATURE_HISTORY.md). Các commit được tổ chức lại từ những bản source đã có; source ứng dụng ở commit cuối giữ nguyên so với bản đang triển khai.
