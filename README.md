# Blue Archive AR

Ứng dụng WebAR theo dõi không gian (World Tracking SLAM) cho các nhân vật Blue Archive, xây dựng trên nền tảng 8th Wall, A-Frame và Three.js. Dự án tích hợp hệ thống điều khiển Pixel HUD trên thiết bị di động, bộ phát giọng nói nhân vật từ Blue Archive Wiki và công cụ kiểm thử hoạt ảnh 3D.

## Tính năng chính

- Định vị và tương tác nhân vật 3D trên mặt đất thông qua cơ chế raycasting và cử chỉ kéo thả.
- Hỗ trợ mô hình 3D định dạng GLB (Miyu) và VRM (Arona) kèm bộ điều khiển biểu cảm khuôn mặt.
- Đồng bộ âm thanh lồng tiếng và thoại nhân vật lấy từ cơ sở dữ liệu Blue Archive Wiki.
- Giao diện điều khiển Pixel HUD tối giản: theo dõi ma trận tọa độ, chỉnh tỷ lệ, xoay hướng, điều khiển nguồn sáng và chuyển đổi shader unlit.
- Công cụ Debug Studio độc lập (`src/debug-studio.html`) để xem trước hoạt ảnh, kiểm tra animation clips và kiểm tra khẩu hình miệng.

## Yêu cầu môi trường

- Node.js phiên bản 18 hoặc 20.
- Git LFS (bắt buộc để tải các file mô hình 3D `.glb` và `.vrm` trong thư mục `src/assets/models/`).

Cài đặt Git LFS trước khi làm việc với mã nguồn:
```bash
git lfs install
git lfs pull
```

## Cài đặt và khởi chạy

1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

2. Khởi chạy máy chủ phát triển:
```bash
npm run serve
```

Lệnh trên khởi chạy Webpack Dev Server với chứng chỉ HTTPS tự ký. Trình duyệt di động yêu cầu kết nối HTTPS để cấp quyền truy cập camera và cảm biến chuyển động. Bạn mở địa chỉ IP hiển thị trong terminal trên thiết bị di động cùng mạng Wi-Fi để thử nghiệm.

3. Mở công cụ Debug Studio:
Truy cập đường dẫn `https://<ip-cua-ban>:<port>/debug-studio.html` trên trình duyệt để kiểm tra mô hình 3D và hoạt ảnh ngoài môi trường AR.

## Đóng gói và phát hành

### Đóng gói thủ công

Tạo gói sản phẩm cho môi trường production:
```bash
npm run build
```

Webpack xuất kết quả biên dịch vào thư mục `dist/`. Thư mục này chứa file `index.html`, file bundle JavaScript và toàn bộ tài nguyên tĩnh. Bạn có thể tải thư mục `dist/` lên bất kỳ web server hoặc dịch vụ lưu trữ nào có hỗ trợ HTTPS.

### Tự động phát hành qua GitHub Pages

Dự án có sẵn quy trình GitHub Actions tại `.github/workflows/deploy.yml`. Khi đẩy commit lên nhánh `main`, hệ thống tự động tải tài nguyên Git LFS, cài đặt thư viện, build với tiền tố `/bluearchive-ar/` và phát hành lên GitHub Pages.

Các bước kích hoạt:
1. Mở mục Settings > Pages trên kho lưu trữ GitHub.
2. Tại phần Build and deployment, chuyển Source thành GitHub Actions.

## Cấu trúc thư mục

```
mascos-ar-worldtracking/
├── config/                  Cấu hình Webpack, dev server và chứng chỉ HTTPS
├── public/                  Tài nguyên tĩnh bổ sung
├── src/
│   ├── assets/              Mô hình 3D (.glb, .vrm), CSS và âm thanh
│   ├── audio/               Quản lý phát âm thanh nhân vật
│   ├── components/          Thành phần A-Frame và bộ điều khiển hoạt ảnh
│   ├── config/              Cấu hình nhân vật (Miyu, Arona)
│   ├── hud/                 Giao diện điều khiển Pixel HUD và console logger
│   ├── utils/               Dịch vụ tra cứu dữ liệu Wiki, điều khiển VRM và Three.js helper
│   ├── app.js               Khởi chạy module camera 8th Wall
│   ├── debug-studio.html    Công cụ kiểm thử animation và khẩu hình 3D
│   ├── hud.js               Khởi tạo hệ thống HUD
│   └── index.html           Trang HTML chính chứa khung cảnh AR A-Frame
├── .github/workflows/       Quy trình tự động triển khai GitHub Pages
└── package.json             Định nghĩa phụ thuộc và scripts npm
```
