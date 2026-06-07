# English Trainer

Ứng dụng web tĩnh để luyện dịch và luyện nghe chép chính tả tiếng Anh.

## Cách mở trên máy khác

Bạn chỉ cần copy nguyên thư mục `english-trainer` sang máy khác rồi mở file:

```text
english-trainer/index.html
```

Không được tách riêng `index.html`, vì app cần các thư mục:

```text
assets/css/styles.css
assets/js/app.js
assets/js/services.js
assets/data/built-in-lessons.js
assets/data/imported-800-cau.js
```

## Cách đưa web lên mạng miễn phí

### Cách 1: GitHub Pages

1. Tạo tài khoản GitHub miễn phí.
2. Tạo repository mới, ví dụ `english-trainer`.
3. Upload toàn bộ nội dung trong thư mục `english-trainer`.
4. Vào `Settings` -> `Pages`.
5. Chọn deploy từ branch `main`, thư mục `/root`.
6. GitHub sẽ cấp link miễn phí dạng:

```text
https://ten-cua-ban.github.io/english-trainer/
```

### Cách 2: Netlify

1. Tạo tài khoản Netlify miễn phí.
2. Vào `Add new site` -> `Deploy manually`.
3. Kéo thả nguyên thư mục `english-trainer` vào Netlify.
4. Netlify sẽ cấp link miễn phí dạng:

```text
https://ten-site.netlify.app
```

## Tài khoản test

Tài khoản FREE:

```text
free01 / free01
free02 / free02
free03 / free03
```

Tài khoản PREMIUM:

```text
premium01 / premium01
premium02 / premium02
premium03 / premium03
premium04 / premium04
premium05 / premium05
```

## Gói tài khoản

FREE:

- Tối đa 20 câu luyện tập mỗi ngày.
- Chỉ mở cấp A1 và A2.
- Tối đa 20 câu tự thêm vào kho cá nhân.

PREMIUM:

- Không giới hạn luyện dịch và nghe chép chính tả mỗi ngày.
- Mở A1, A2, B1, B2 và các chủ đề nâng cao.
- Không giới hạn câu tự thêm vào kho cá nhân.
- Có phân tích lỗi sai nâng cao ở mức cục bộ; khi có backend có thể nối AI API thật.

Giá dự kiến:

```text
1 tháng: 35.000đ
6 tháng: 149.000đ
1 năm: 249.000đ
```

Thanh toán dự kiến: VietQR qua PayOS. File `assets/js/services.js` đã có placeholder `createPayOSCheckout()` để sau này nối backend.

## Ghi chú quan trọng

Phiên bản hiện tại là web tĩnh, nên đăng nhập, phân quyền và dữ liệu người dùng đang được lưu trong trình duyệt bằng `localStorage`. Cách này phù hợp để dùng thử miễn phí, demo giao diện và kiểm tra luồng quyền.

Khi tích hợp PayOS hoặc AI API thật, cần thêm backend để bảo mật tài khoản, khóa API, gói PREMIUM và xác nhận thanh toán.
