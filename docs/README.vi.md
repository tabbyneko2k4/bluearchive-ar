[English](../README.md) | **Tiếng Việt**

# Blue Archive AR

Ứng dụng WebAR theo dõi không gian (World Tracking SLAM) cho các nhân vật Blue Archive, xây dựng trên nền tảng 8th Wall, A-Frame và Three.js. Dự án tích hợp hệ thống điều khiển Pixel HUD trên thiết bị di động, bộ phát giọng nói nhân vật từ Blue Archive Wiki và công cụ kiểm thử hoạt ảnh 3D.

---

## Tính năng chính

- **World Tracking SLAM**: Định vị và tương tác nhân vật 3D trên mặt đất thông qua cơ chế raycasting và cử chỉ chạm / kéo thả.
- **Hỗ trợ đa định dạng 3D**: Tương thích mô hình GLB (Miyu) và VRM (Arona) kèm bộ điều khiển biểu cảm khuôn mặt (blendshapes).
- **Đồng bộ giọng nói & Thoại**: Tích hợp dữ liệu âm thanh lồng tiếng và phụ đề câu thoại nhân vật lấy trực tiếp từ cơ sở dữ liệu Blue Archive Wiki.
- **Pixel HUD Controls**: Giao diện điều khiển Pixel HUD tối giản: theo dõi ma trận tọa độ telemetry, chỉnh tỷ lệ (scale), xoay hướng (rotation), điều khiển nguồn sáng và bật/tắt shader unlit.
- **Debug Studio**: Công cụ độc lập (`src/debug-studio.html`) để xem trước hoạt ảnh, kiểm tra animation clips và kiểm tra khẩu hình miệng mà không cần bật AR.

---

## Tài liệu kỹ thuật

- [Đặc tả hệ thống giao diện Pixel HUD (DESIGN.md)](DESIGN.md)

---

## Yêu cầu môi trường

- **Node.js**: Phiên bản 18 hoặc 20.
- **Git LFS**: Bắt buộc để tải các file mô hình 3D `.glb` và `.vrm` trong thư mục `src/assets/models/`.

Cài đặt Git LFS trước khi làm việc với mã nguồn:
```bash
git lfs install
git lfs pull
```

---

## Cài đặt và khởi chạy

1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

2. Khởi chạy máy chủ phát triển:
```bash
npm run serve
```

> Lệnh trên khởi chạy Webpack Dev Server với chứng chỉ HTTPS tự ký. Trình duyệt di động yêu cầu kết nối HTTPS để cấp quyền truy cập camera và cảm biến chuyển động. Bạn mở địa chỉ IP hiển thị trong terminal trên thiết bị di động cùng mạng Wi-Fi để thử nghiệm.

3. Mở công cụ Debug Studio:
Truy cập đường dẫn `https://<ip-cua-ban>:<port>/debug-studio.html` trên trình duyệt để kiểm tra mô hình 3D và hoạt ảnh ngoài môi trường AR.

---

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
1. Mở mục **Settings > Pages** trên kho lưu trữ GitHub.
2. Tại phần **Build and deployment**, chuyển **Source** thành **GitHub Actions**.

---

## Cấu trúc thư mục

```
mascos-ar-worldtracking/
├── config/                  Cấu hình Webpack, dev server và chứng chỉ HTTPS
├── docs/                    Tài liệu thiết kế và hướng dẫn kỹ thuật
│   ├── DESIGN.md            Quy chuẩn thiết kế Pixel HUD UI & Agent spec
│   └── README.vi.md         Bản tài liệu tiếng Việt
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
├── LICENSE                  Giấy phép MIT
├── package.json             Định nghĩa phụ thuộc và scripts npm
└── README.md                Tài liệu chính của dự án (English)
```

---

## Tác giả & Ghi nhận (Credits)

Dự án là sản phẩm phái sinh phi thương mại (fan-made) được lấy cảm hứng từ tựa game **Blue Archive**.

### Bảng thông tin dự án & Quyền tác giả

| Hạng mục | Đối tượng / Thực thể | Đường dẫn / Liên kết | Ghi chú & Chi tiết |
| :--- | :--- | :--- | :--- |
| **Playground** | WebAR Live Demo | [kawaiilabs.tabbyneko.asia/bluearchive-ar/](https://kawaiilabs.tabbyneko.asia/bluearchive-ar/) | Môi trường thử nghiệm WebAR trực tiếp trên mobile |
| **Product Owner (PO)** | Tabby Neko | [tabbyneko.asia](https://tabbyneko.asia/) | Trưởng dự án, thiết kế kiến trúc WebAR |
| **Credit Game** | Blue Archive | [Chi tiết Blue Archive (Nexon)](https://www.nexon.com/main/en/Blue%20Archive/details) | © NEXON Games Co., Ltd. & Yostar, Inc. |
| **Luật Fankit** | Quy định tác phẩm phái sinh | [bluearchive.jp/fankit/guidelines](https://bluearchive.jp/fankit/guidelines) | Tuân thủ chính sách Fankit & Guidelines chính thức |
| **Git Project** | GitHub Repository | [tabbyneko2k4/bluearchive-ar](https://github.com/tabbyneko2k4/bluearchive-ar) | Kho mã nguồn mở và luồng triển khai GitHub Pages |

### Frameworks & Công nghệ nền tảng

| Framework / Thư viện | Vai trò kỹ thuật trong dự án | Liên kết tham khảo |
| :--- | :--- | :--- |
| **8th Wall** | Công cụ WebAR SLAM World Tracking trên trình duyệt | [8thwall.com](https://www.8thwall.com/) |
| **A-Frame** (8frame 1.3.0) | Framework WebXR theo mô hình Entity-Component-System | [aframe.io](https://aframe.io/) |
| **Three.js** | Thư viện kết xuất đồ họa 3D WebGL trên JavaScript | [threejs.org](https://threejs.org/) |
| **@pixiv/three-vrm** | Trình nạp mô hình VRM và điều khiển khẩu hình/biểu cảm | [pixiv.github.io/three-vrm](https://pixiv.github.io/three-vrm/) |
| **Webpack 5** | Đóng gói mã nguồn & môi trường phát triển cục bộ | [webpack.js.org](https://webpack.js.org/) |
| **Google Fonts** | Bộ phông chữ Pixel (*Pixelify Sans, Silkscreen, JetBrains Mono, Geist*) | [fonts.google.com](https://fonts.google.com/) |

### Cảm ơn & Tài nguyên cộng đồng

Cảm ơn các bên sau vì đã cung cấp các tài nguyên được cập nhật liên tục:
- [bluearchive.wiki](https://bluearchive.wiki/) — Nguồn tra cứu dữ liệu thoại, thông tin sinh viên và tệp âm thanh lồng tiếng phong phú.
- [BlueArchiveModels (lihaohong6)](https://github.com/lihaohong6/BlueArchiveModels) — Kho lưu trữ tài nguyên mô hình 3D học sinh Blue Archive cập nhật liên tục.

---

## Giấy phép (License)

Dự án được phát hành dưới [Giấy phép MIT](../LICENSE).

