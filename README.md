<p align="center">
  <img src="icons/icon.png" alt="JEI WebBrowser Icon" width="20%">
</p>

# JEI WebBrowser

给明日方舟：终末地的辅助查询网页 JEIWEB 和其他页面使用的快速在游戏里打开页面的专用浏览器外壳。

> **注意**：本项目与 Minecraft 的 JEI (Just Enough Items) mod 无任何关系。名称 JEI 源自作者的其他项目命名习惯。

## 功能特性

### 游戏内辅助浏览

- **置顶模式** - 可设置窗口始终置顶，在游戏内快速访问
- **全局快捷键** - 使用快捷键快速显示/隐藏浏览器（默认 `Ctrl+F8`）
- **无边框窗口** - 沉浸式浏览体验，不影响游戏界面

### 浏览器功能

- **标签页管理** - 支持多标签页浏览，水平和垂直布局切换
- **书签系统** - 保存和管理常用网页
- **浏览历史** - 自动记录浏览历史
- **搜索引擎** - 支持多种搜索引擎（Google、Bing、DuckDuckGo、百度）
- **SSL 证书查看** - 查看当前网站的 HTTPS 证书信息

### 内置页面

- **jei://home** - 内置主页
- **jei://bookmarks** - 书签管理页面
- **jei://history** - 历史记录页面
- **jei://settings** - 设置页面

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式前端框架
- **TypeScript** - 类型安全
- **electron-vite** - 快速构建工具
- **electron-builder** - 应用打包
- **electron-store** - 持久化存储
- **lucide-vue-next** - 图标库

## 快速开始

### 环境要求

- Node.js >= 22.12.0
- Yarn

### 安装依赖

```bash
yarn install
```

### 开发模式

```bash
yarn dev
```

### 构建编译

```bash
yarn build
```

### 打包发布

```bash
yarn dist
```

打包后的文件将输出到 `release/` 目录。

## 使用说明

1. 启动应用后，浏览器会自动打开
2. 按 `Ctrl+F8`（可自定义）可以快速显示/隐藏浏览器
3. 点击右上角的"图钉"图标可以切换"始终置顶"模式
4. 在游戏时保持置顶模式，可以随时查看攻略和资料

## 项目结构

```
JEIWebBrowser/
├── src/
│   ├── main/           # 主进程代码
│   │   └── index.ts    # 主进程入口
│   ├── preload/        # 预加载脚本
│   │   ├── index.ts
│   │   └── webview-home.ts
│   └── renderer/       # 渲染进程代码（Vue 3）
│       ├── components/ # Vue 组件
│       ├── internal-pages/ # 内置页面
│       ├── composables/   # Vue 组合式函数
│       ├── types/      # TypeScript 类型定义
│       ├── App.vue     # 根组件
│       ├── index.html  # HTML 入口
│       └── style.css   # 全局样式
├── icons/             # 应用图标
├── electron.vite.config.ts  # Electron Vite 配置
├── electron-builder.yml     # 打包配置
└── package.json
```

## 配置说明

### 快捷键

默认快捷键为 `Ctrl+F8`（Windows/Linux）或 `Cmd+F8`（macOS），可在设置中修改。

### 数据存储

应用使用 `electron-store` 进行数据持久化，存储位置：

- **Windows**: `%APPDATA%/JEIWebBrowser/config.json`
- **macOS**: `~/Library/Application Support/JEIWebBrowser/config.json`
- **Linux**: `~/.config/JEIWebBrowser/config.json`

### 支持的内部页面 URL

项目支持以下元 URL，用于访问内置功能：

- `jei://home` - 主页
- `jei://bookmarks` - 书签管理
- `jei://history` - 历史记录
- `jei://settings` - 设置

## GitHub Actions

项目配置了自动构建和发布：

- **自动触发**: 推送到 `master` 或 `main` 分支
- **手动触发**: 在 Actions 页面手动运行

支持平台：Windows、macOS、Linux

## 关联项目

- [JEI-web](https://github.com/AndreaFrederica/jei-web) - 明日方舟：终末地物品查询和合成规划工具

## 许可证

[MPL-2.0](LICENSE)

## 作者

AndreaFrederica
