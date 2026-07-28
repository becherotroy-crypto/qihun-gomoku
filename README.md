# 棋魂五子棋

一款可安装至 Android 设备的 15x15 五子棋应用。React、TypeScript、Vite 与 Capacitor 仅用于开发和构建；正式交付物是 APK 或 AAB，不依赖浏览器、网页服务器或 `localhost`。

## 本地运行

```bash
pnpm install
pnpm dev
```

生产构建与测试：

```bash
pnpm test
pnpm build
```

## Android

Android 工程位于 `android/`，已配置包名 `com.qihun.gomoku`、竖屏、原生状态栏、启动图、应用图标、震动和棋谱文件分享。

```bash
pnpm run android:apk
```

调试安装包输出到 `android/app/build/outputs/apk/debug/app-debug.apk`。本机打包脚本会同步资源后调用 Android 原生 Gradle 工程。

本机编译需要 Android SDK Platform 35 与 JDK 21。需要在 Android Studio 中查看工程时，执行：

```bash
pnpm run android:open
```

正式上架前，先创建私密 upload key，将 `android/keystore.properties.example` 复制为 `android/keystore.properties` 并填入签名信息，然后生成商店用 AAB：

```bash
pnpm run android:aab
```

每次提交商店前必须递增 `android/app/build.gradle` 中的 `versionCode`。

## Windows

Windows 版会生成标准安装程序 `.exe`，不依赖浏览器或本地开发服务器：

```bash
pnpm run desktop:build
```

输出文件位于 `release/windows/`。安装器会创建桌面和开始菜单快捷方式；首次在未签名状态下运行时，Windows 可能显示 SmartScreen 提示。

## 目录

- `src/game/`：棋局规则、AI、提示、复盘、序列化和单元测试
- `src/screens/`：首页、对局、棋谱、排行、个人中心、设置与教学页面
- `src/store/`：版本化本地存储、统计和每日挑战状态
- `src/utils/`：音效触感与棋谱图片导出/分享
- `android/`：Capacitor Android 原生工程

当前的“在线对战”入口使用本地匹配流程与高难度对手模拟。接入真实赛季服务时，需要补充账号认证、WebSocket 对局房间、断线重连、反作弊和服务端排行榜。
