

[![简体中文版](https://img.shields.io/badge/简体中文-d9d9d9)](#中文) [![English](https://img.shields.io/badge/English-d9d9d9)](#english)

# 🔥 Claude Code GUI - 桌面端 AI 编程助手

基于 **Tauri (Rust)** 后端和 **React** 前端构建的强大桌面 GUI 应用，为 Anthropic Claude Code 提供丰富的交互式界面，具备超越官方 CLI 的增强功能。

[![Stable Version](https://img.shields.io/github/v/release/clwhub-com/claude-code-gui?label=stable)](https://github.com/clwhub-com/claude-code-gui/releases) [![Commits](https://img.shields.io/github/commit-activity/m/clwhub-com/claude-code-gui)](https://github.com/clwhub-com/claude-code-gui/graphs/commit-activity) [![Issues](https://img.shields.io/github/issues-closed/clwhub-com/claude-code-gui)](https://github.com/clwhub-com/claude-code-gui/issues) [![License](https://img.shields.io/badge/license-MIT-blue)](#license)

---

## 💡 这是什么？

基于 **Rust + React** 构建的 Claude Code 桌面版。底层调用与官方 CLI 相同的 Anthropic API，但用 Rust 重写了执行引擎，性能更快、资源占用更低。

**相比官方 CLI 的不同**：

| 特点 | 说明 |
|------|------|
|  桌面应用 | 下载安装即用，不需要配环境 |
|  图形界面 | 可视化管理技能、MCP、设置 |
|  中文支持 | 完整中文界面 |
| ⚡ Rust 引擎 | 原生执行，更快更稳 |

---

##  下载安装

支持 macOS / Windows / Linux 三端，直接下载安装即可使用：

| 平台 | 下载 |
|------|------|
| macOS (Apple Silicon) | [claude-code-gui_0.1.0_aarch64.dmg](https://github.com/clwhub-com/claude-code-gui/releases/latest) |
| macOS (Intel) | [claude-code-gui_0.1.0_x64.dmg](https://github.com/clwhub-com/claude-code-gui/releases/latest) |
| Windows | [claude-code-gui_0.1.0_x64.msi](https://github.com/clwhub-com/claude-code-gui/releases/latest) |
| Linux | [claude-code-gui_0.1.0_amd64.AppImage](https://github.com/clwhub-com/claude-code-gui/releases/latest) |

 所有版本：[Releases 页面](https://github.com/clwhub-com/claude-code-gui/releases)

---

## 📸 截图预览

### 聊天界面

![Chat](Image/chat.png)

### 设置界面

![Settings](Image/setting.png)

### 技能系统

![Skills](Image/skills.png)

---

<a name="中文"></a>
## 🚀 核心特性

### 1. 🤖 多代理系统 (Multi-Agent System)

- **Agent Tool**：将复杂任务委派给专业代理执行
- **内置代理**：Explore（代码探索）、Plan（计划制定）、General（通用执行）
- **代理注册表**：支持 Teammates 多代理协作通信
- **同步/异步执行**：支持后台运行，实时进度追踪

### 2. ⚡ 技能与插件系统 (Skills & Plugins)

- **SKILL.md 格式**：YAML frontmatter + Markdown 内容
- **双层加载**：项目级 `.claude/skills/` + 全局 `~/.claude/skills/`
- **斜杠命令**：输入 `/` 自动补全可用技能
- **条件技能**：基于文件路径自动激活
- **插件系统**：支持 `plugin.json` 元数据，可扩展功能

### 3. 🔌 MCP 集成 (Model Context Protocol)

- **动态加载**：运行时加载和管理 MCP 服务器
- **管理仪表板**：可视化管理所有 MCP 连接
- **热门服务器**：支持 SQLite、Brave Search 等
- **协议处理**：自动处理 JSON-RPC 2.0

### 4. ⚙️ Hooks 钩子系统

- **自定义钩子**：通过 `.clauderc` 配置
- **生命周期钩子**：`pre-message`、`post-message`
- **无缝集成**：与现有工作流完美配合

### 5. 🔄 后台任务管理

- **进程管理**：启动和监控后台进程
- **实时日志**：流式传输日志输出
- **任务控制**：完整的生命周期管理

### 6. 📅 Cron 定时任务

- **语法调度**：使用 cron 语法调度循环 AI 提示
- **可视化界面**：直观的任务管理
- **灵活配置**：支持一次性定时和循环任务

### 7. 📁 高级文件操作

- **AST 编辑**：基于 tree-sitter 的代码编辑
- **Notebook 支持**：Jupyter (.ipynb) 文件编辑
- **图片处理**：base64 编码，支持图片识别
- **智能搜索**：glob 模式文件搜索

### 8. 🔍 代码搜索与导航

- **正则搜索**：强大的内容搜索能力
- **结构探索**：文件和目录结构导航
- **上下文感知**：智能代码理解

### 9. 🌐 Web 集成

- **网页搜索**：通过 DuckDuckGo 搜索
- **内容获取**：网页转 Markdown
- **URL 处理**：编码和解析

---

## 🛠️ 快速开始

### 系统要求

- Node.js >= 18.0.0
- Rust（用于 Tauri 后端）
- Tauri 系统依赖（[平台特定](https://tauri.app/v1/guides/getting-started/prerequisites)）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/clwhub-com/claude-code-gui.git
cd claude-code-gui

# 安装依赖
npm install

# 启动开发模式
npm run tauri dev

# 编译生产版本
npm run tauri build
```

### 配置说明

在项目根目录或用户主目录创建 `.clauderc` 文件：

```json
{
  "auto_mode": false,
  "mcp_servers": {
    "sqlite": "npx -y @modelcontextprotocol/server-sqlite /tmp/test.db",
    "brave": "npx -y @modelcontextprotocol/server-brave-search"
  },
  "hooks": {
    "pre-message": "echo 'Starting new conversation'",
    "post-message": "echo 'Message sent to AI'"
  }
}
```

---

## 🎮 使用指南

1. **基础对话**：在聊天界面直接输入问题或请求
2. **Agent 工具**：使用 Agent 工具将任务委派给专业代理
3. **技能系统**：输入 `/` 查看可用技能和斜杠命令
4. **MCP 管理**：通过设置 > MCP 标签页管理服务器
5. **后台任务**：AI 可以启动任务，在任务面板中监控
6. **定时任务**：通过 Cron 界面调度循环提示

---

## 📁 项目结构

```
src/
├── agents/              # 多代理系统
│   ├── AgentTool.tsx    # Agent 工具实现
│   ├── runAgent.ts      # 代理执行逻辑
│   ├── built-in/        # 内置代理（Explore、Plan、General）
│   └── teammate/        # 代理通信注册表
├── skills/              # 技能系统
│   ├── parser.ts        # SKILL.md 解析器
│   ├── loadSkillsDir.ts # 技能加载器
│   └── bundledSkills.ts # 内置技能
├── plugins/             # 插件系统
│   ├── pluginLoader.ts  # 插件加载器
│   └── builtinPlugins.ts # 内置插件
├── utils/               # 工具函数
│   └── frontmatterParser.ts # YAML 解析器
└── App.tsx              # 主应用
```

---

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

[![Star History Chart](https://api.star-history.com/svg?repos=clwhub-com/claude-code-gui&type=Date)](https://star-history.com/#clwhub-com/claude-code-gui&Date)

---

# AI 创新工具系列

我们针对多个行业开发了一系列 AI 工具，将陆续上线发布。

### 即将推出：
- 漫剧制作工具
- 自媒体运营 AI 工具
- 自动建站和 GEO 优化工具

---

<a name="english"></a>
## 🚀 Overview (English)

A desktop version of Claude Code built with **Rust + React**. Uses the same Anthropic API as the official CLI, but with a Rust execution engine for faster performance and lower resource usage.

**What's different**:

| Feature | Description |
|---------|-------------|
|  Desktop App | Download and run, no environment setup needed |
|  Visual UI | Manage skills, MCP, and settings visually |
|  Auto Mode | Open unrestricted execution mode for maximum efficiency |
|  Thinking Animation | Real-time AI reasoning visualization |
|  Plugin System | Custom plugin support |
|  Chinese Support | Full Chinese/English interface |
| ⚡ Rust Engine | Native execution, faster and more stable |

##  Download

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [claude-code-gui_0.1.0_aarch64.dmg](https://github.com/clwhub-com/claude-code-gui/releases/latest) |
| macOS (Intel) | [claude-code-gui_0.1.0_x64.dmg](https://github.com/clwhub-com/claude-code-gui/releases/latest) |
| Windows | [claude-code-gui_0.1.0_x64.msi](https://github.com/clwhub-com/claude-code-gui/releases/latest) |
| Linux | [claude-code-gui_0.1.0_amd64.AppImage](https://github.com/clwhub-com/claude-code-gui/releases/latest) |

 All versions: [Releases](https://github.com/clwhub-com/claude-code-gui/releases)

### Quick Start

```bash
git clone https://github.com/clwhub-com/claude-code-gui.git
cd claude-code-gui
npm install
npm run tauri dev
```

### License

MIT License

---
