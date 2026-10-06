**English** | [Tiếng Việt](docs/README.vi.md)

# Blue Archive AR

A WebAR World Tracking (SLAM) experience for Blue Archive characters, powered by 8th Wall, A-Frame, and Three.js. The project features a mobile-optimized Minimalist Pixel HUD control suite, synced Japanese character voice lines fetched from the Blue Archive Wiki database, and an isolated 3D animation and facial blendshape testing studio.

---

## Key Features

- **World Tracking SLAM**: Ground-plane detection, surface anchoring, and intuitive touch/drag raycasting to place and manipulate 3D characters in real physical spaces.
- **Dual 3D Format Pipeline**: Seamless rendering and animation handling for both **GLB** (Miyu) and **VRM** (Arona), including real-time facial blendshapes and morph targets.
- **Voice Lines & Dialogue Synchronization**: Real-time integration with character audio databases, syncing spoken Japanese voice lines with subtitle overlays.
- **Minimalist Pixel HUD**: A retro-futuristic, mobile-first control overlay offering real-time transform telemetry, scaling, directional rotation, ambient/directional light adjustments, and unlit shader toggles.
- **Standalone Debug Studio**: An isolated desktop/browser viewer (`src/debug-studio.html`) for previewing animations, testing clip playback, and validating facial expressions without needing an active AR camera session.

---

## Documentation

- [Pixel HUD UI System & Agent Specification (DESIGN.md)](docs/DESIGN.md)
- [Vietnamese Documentation (README.vi.md)](docs/README.vi.md)

---

## Prerequisites

- **Node.js**: Version 18 or 20 LTS recommended.
- **Git LFS**: Required to clone and pull binary 3D assets (`.glb` and `.vrm` files under `src/assets/models/`).

Initialize and pull Git LFS assets before building or launching:
```bash
git lfs install
git lfs pull
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run serve
```

> Webpack Dev Server will start with self-signed HTTPS certificates. Modern mobile browsers strictly require an HTTPS origin to grant camera and device motion/sensor permissions. Open the HTTPS URL displayed in your terminal on a mobile device connected to the same local Wi-Fi network.

### 3. Open Debug Studio
Navigate to `https://<your-local-ip>:<port>/debug-studio.html` on your desktop or mobile browser to test animations, lighting, and VRM expressions outside the AR tracking loop.

---

## Build & Deployment

### Manual Production Build
Generate optimized production bundles:
```bash
npm run build
```
Webpack outputs build artifacts to the `dist/` directory, containing the compiled `index.html`, minified JavaScript bundles, and static assets. Deploy the `dist/` directory to any static web host supporting HTTPS.

### Automated GitHub Pages Deployment
This repository includes a continuous deployment workflow configured at `.github/workflows/deploy.yml`. Pushes to the `main` branch automatically:
1. Pull Git LFS model binaries.
2. Install npm dependencies.
3. Build production assets with the public base path `/bluearchive-ar/`.
4. Deploy the output to GitHub Pages.

To enable GitHub Pages:
1. Go to **Settings > Pages** on your GitHub repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

---

## Project Structure

```
mascos-ar-worldtracking/
├── config/                  Webpack build configurations, dev server, and SSL certs
├── docs/                    Technical documentation and design specifications
│   ├── DESIGN.md            Pixel HUD design tokens, bento drawer specs & UI rules
│   └── README.vi.md         Vietnamese version of project documentation
├── public/                  Static public assets
├── src/
│   ├── assets/              3D models (.glb, .vrm), CSS stylesheets, and audio clips
│   ├── audio/               Character audio and voice line manager
│   ├── components/          Custom A-Frame components and animation controllers
│   ├── config/              Character configuration profiles (Miyu, Arona)
│   ├── hud/                 Minimalist Pixel HUD controller and mobile log drawer
│   ├── utils/               Wiki scraping service, VRM helpers, and Three.js utilities
│   ├── app.js               8th Wall camera pipeline initializers
│   ├── debug-studio.html    Standalone animation and blendshape debug studio
│   ├── hud.js               HUD initialization and interaction binding
│   └── index.html           Main WebAR entrypoint with A-Frame scene
├── .github/workflows/       Automated CI/CD pipelines (GitHub Pages)
├── LICENSE                  MIT License
├── package.json             npm project metadata, dependencies, and build scripts
└── README.md                Main project documentation (English)
```

---

## Credits & Attributions

This project is a non-commercial, fan-made WebAR exploration inspired by the universe of **Blue Archive**.

### Project & Attribution Grid

| Category | Reference / Entity | URL / Link | Description |
| :--- | :--- | :--- | :--- |
| **Playground** | WebAR Live Demo | [kawaiilabs.tabbyneko.asia/bluearchive-ar/](https://kawaiilabs.tabbyneko.asia/bluearchive-ar/) | Interactive mobile WebAR testing sandbox |
| **Product Owner (PO)** | Tabby Neko | [tabbyneko.asia](https://tabbyneko.asia/) | Project lead, concept & WebAR engineering |
| **Original Game** | Blue Archive | [Nexon Blue Archive Details](https://www.nexon.com/main/en/Blue%20Archive/details) | © NEXON Games Co., Ltd. & Yostar, Inc. |
| **Fankit Guidelines** | Secondary Creation Policy | [bluearchive.jp/fankit/guidelines](https://bluearchive.jp/fankit/guidelines) | Compliance with official derivative work guidelines |
| **Git Project** | GitHub Repository | [tabbyneko2k4/bluearchive-ar](https://github.com/tabbyneko2k4/bluearchive-ar) | Open-source codebase & deployment workflows |

### Frameworks & Core Libraries

| Framework / Library | Role & Functionality | Resource Link |
| :--- | :--- | :--- |
| **8th Wall** | WebAR SLAM World Tracking Engine | [8thwall.com](https://www.8thwall.com/) |
| **A-Frame** (8frame 1.3.0) | Entity-Component WebXR Scene Framework | [aframe.io](https://aframe.io/) |
| **Three.js** | 3D WebGL Graphics & Rendering Engine | [threejs.org](https://threejs.org/) |
| **@pixiv/three-vrm** | 3D Humanoid VRM loader & morph blendshape controller | [pixiv.github.io/three-vrm](https://pixiv.github.io/three-vrm/) |
| **Webpack 5** | JavaScript module bundler & local dev server pipeline | [webpack.js.org](https://webpack.js.org/) |
| **Google Fonts** | Retro UI typography (*Pixelify Sans, Silkscreen, JetBrains Mono, Geist*) | [fonts.google.com](https://fonts.google.com/) |

### Special Thanks & Community Resources

Special thanks to the following community resources for providing continuously updated assets and game data:
- [bluearchive.wiki](https://bluearchive.wiki/) — Invaluable repository for character voice audio clips, localized lines, and student metadata.
- [BlueArchiveModels (lihaohong6)](https://github.com/lihaohong6/BlueArchiveModels) — Continuously maintained 3D model repository of Blue Archive characters.

---

## License

This project is licensed under the [MIT License](LICENSE).

