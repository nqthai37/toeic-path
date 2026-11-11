# Kế hoạch và lịch sử chức năng

## Cách thực hiện

1. Giữ nguyên repository dùng để triển khai Sites.
2. Tạo checkout riêng cho GitHub, khôi phục từng mốc source có sẵn.
3. Chạy git add và git commit riêng cho từng nhóm chức năng.
4. Tách workflow GitHub Pages khỏi chức năng giọng đọc.
5. Kiểm tra từng mốc có tests, kiểm tra bản build và so sánh source cuối.
6. Tạo repository GitHub, đẩy main và xác nhận các commit trên remote.

Các commit này là lịch sử được tổ chức lại từ snapshots, được tạo vào ngày chuẩn bị repository GitHub. Không giả lập ngày phát triển cũ và không thay đổi lịch sử repository gốc.

## Các commit chức năng

| Thứ tự | Commit mới | Nội dung | Mốc source gốc |
| --- | --- | --- | --- |
| 1 | `52f3369` | feat: add TOEIC dashboard and core practice experience | `25dc13d` |
| 2 | `3e67cd9` | feat: add 10 themed tests and expand the bank to 246 questions | `32984b0` |
| 3 | `f969fd1` | refactor: organize source files and add build and test commands | `2765abd` |
| 4 | `c999cd8` | fix: preserve quiz scroll position and expanded transcripts | `9d01820` |
| 5 | `ec0a919` | feat: add female and male dialogue voices | `aa4aaaa` |
| 6 | `c4fdf3a` | ci: deploy the static website to GitHub Pages | `aa4aaaa` |
| 7 | `60d76de` | fix: update answer feedback in place and stabilize quiz layout | `2acdf93` |
| 8 | Commit tài liệu hiện tại | docs: document feature milestones and GitHub setup | Source cuối `2acdf93` |

## Kiểm tra

- Các file src, scripts, tests, package.json và workflow cuối tương đương source gốc.
- Chạy npm test, npm run build và npm run test:build trước khi push.
- dist là sản phẩm build và bị Git bỏ qua ở phiên bản hiện tại.
- Metadata triển khai riêng của Sites không được đưa sang repo GitHub.
- GitHub dùng email noreply cho các commit mới.

## Sau khi đẩy lên GitHub

Repo dự kiến: https://github.com/nqthai37/toeic-path

Để bật Pages: Settings → Pages → Source: GitHub Actions. Sau đó chạy workflow Deploy TOEIC Path to GitHub Pages nếu cần. Workflow tự build và triển khai từ main.
