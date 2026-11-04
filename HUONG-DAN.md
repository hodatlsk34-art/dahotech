# Xưởng App — cửa hàng phần mềm + trang quản trị

Website tĩnh, chạy miễn phí trên **Render Static Site** (không ngủ, không tốn 750 giờ của dịch vụ web).
Sản phẩm lưu trong `data/products.json`, ảnh trong `uploads/`. Bạn đăng sản phẩm bằng trang **/quan-tri.html**: bấm Lưu → trang quản trị ghi thẳng vào kho GitHub → Render tự cập nhật website sau 1–2 phút.

```
index.html          Cửa hàng (trang chủ, trang sản phẩm, chính sách)
quan-tri.html       Trang quản trị (không hiện link ở cửa hàng, chặn máy tìm kiếm)
assets/             style.css, store.js (cửa hàng) · admin.css, admin.js (quản trị)
data/site.json      Thông tin người bán, trang chủ, lĩnh vực, chế độ bán
data/products.json  Danh sách sản phẩm
uploads/            Ảnh sản phẩm (trang quản trị tự tải lên)
render.yaml         Cấu hình Render
```

## 1. Đưa lên GitHub (1 lần)
1. Vào github.com → **New repository**, tên ví dụ `xuong-app`. Chọn **Private** (khuyên dùng) hoặc Public.
2. Bấm **uploading an existing file**, kéo thả **toàn bộ nội dung** thư mục `xuong-app` (gồm các thư mục `assets`, `data`, `uploads`), bấm **Commit changes**.

## 2. Tạo website trên Render (1 lần)
1. dashboard.render.com → **New** → **Static Site** → chọn kho `xuong-app` (lần đầu cần cho Render quyền truy cập kho).
2. Branch: `main` · Build Command: **để trống** · Publish directory: `.`
3. Bấm **Deploy Static Site**. Sau khoảng 1 phút có địa chỉ dạng `https://xuong-app.onrender.com`.
   (Hoặc dùng **New → Blueprint** để Render đọc sẵn `render.yaml`, có thêm cấu hình chống lưu đệm.)
4. Tên miền riêng: Settings → **Custom Domains**.

## 3. Tạo mã truy cập cho trang quản trị (1 lần)
GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token:
- Expiration: tối đa 1 năm (ghi lịch gia hạn).
- Repository access: **Only select repositories** → `xuong-app`.
- Permissions → Repository permissions → **Contents: Read and write**.
Mã chỉ ghi được vào đúng kho này. Không gửi cho người khác, không dán vào mã nguồn.

## 4. Đăng sản phẩm
1. Mở `https://<website>/quan-tri.html` → nhập kho (`ten-tai-khoan/xuong-app`), nhánh `main`, mã truy cập → Kết nối.
2. **Cài đặt cửa hàng**: điền tên cửa hàng, họ tên, mã số thuế, khu vực, email, Zalo. Giữ cách bán "Chỉ giới thiệu".
3. **Sản phẩm** → Xóa sản phẩm mẫu → **+ Thêm sản phẩm**. Danh sách kiểm tra bên phải chỉ cách làm trang đẹp:
   - Ảnh: kéo thả, chọn hoặc dán (Ctrl+V) ảnh chụp màn hình; tự nén về 1600px. Ảnh đầu là ảnh bìa. Nên có 3–5 ảnh ngang, **không có dữ liệu học sinh thật**.
   - Câu giới thiệu: một câu nói rõ phần mềm làm gì, cho ai.
   - 4–6 tính năng, mỗi cái tiêu đề ngắn + một câu lợi ích. Có ô "Dán nhanh" dạng `Tiêu đề: mô tả`.
   - Bảng giá tối đa 3 gói, đánh dấu 1 gói "Nên chọn". Ô giá trống = Liên hệ, 0 = Miễn phí.
   - Hỏi đáp: dữ liệu lưu ở đâu, hết hạn dùng thử thì sao, có hóa đơn không.
   - Hai ô xác nhận (có quyền bán, đã gỡ dữ liệu thật) là bắt buộc để hiện sản phẩm.
4. **Xem trước trang** (máy tính / điện thoại) → bấm **Lưu & cập nhật website**. Đợi 1–2 phút rồi tải lại cửa hàng.

## 5. Lưu ý
- Trang quản trị không có mật khẩu riêng: ai không có mã truy cập GitHub thì không ghi được gì.
- Chỉ tick "Ghi nhớ trên máy này" ở máy cá nhân. Ở máy dùng chung, bấm **Thoát** khi xong.
- Hai người cùng sửa: trang quản trị phát hiện và hỏi trước khi ghi đè.
- Mọi lần lưu là một bản ghi trên GitHub, xem và khôi phục được ở tab Commits của kho.
- Chỉ đổi cách bán sang "Hiện mã QR thanh toán" sau khi có hộ kinh doanh và website được UBND tỉnh xác nhận thông báo.

## Triển khai hiện tại (04/11/2026)
- Website: https://hodatech.onrender.com · Quản trị: https://hodatech.onrender.com/quan-tri.html
- Kho mã: https://github.com/hodatlsk34-art/dahotech (nhánh `main`, tự triển khai khi có commit)
- Render Static Site `dahotech` (srv-dbl9vijm8hqs738lk5ig): https://dashboard.render.com/static/srv-dbl9vijm8hqs738lk5ig
- Tạo bằng công cụ Render (không qua Blueprint) nên các header trong `render.yaml` chưa áp dụng; cửa hàng vẫn tải dữ liệu mới nhờ `fetch(..., {cache:"no-cache"})`.
- Việc còn lại: tạo mã truy cập GitHub (mục 3), điền thông tin người bán, xóa sản phẩm mẫu, đăng sản phẩm thật; chọn tên thương hiệu (đang tạm "Xưởng App").
