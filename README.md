# Claude Code GUI - Unrestricted Edition

![Claude Code GUI](src-tauri/icons/128x128.png)

[English](#english) | [中文](#中文)

<a name="english"></a>
## 🚀 Overview (English)

This is an unofficial, completely rewritten Graphical User Interface (GUI) for Anthropic's Claude Code CLI. It leverages **Tauri (Rust)** for the backend and **React** for the frontend to provide a beautiful, fast, and completely unrestricted AI coding assistant.

Unlike the official CLI, which runs in a sandboxed NodeJS environment with limited permissions, this GUI gives Claude **native OS-level access** through Rust.

### ✨ Features

1. **Unrestricted Sandbox Escape**: Built in Rust. Claude can run any `bash` command, interact with the filesystem, and spawn background tasks natively.
2. **Auto Mode & Hard Interception**: In "Safe Mode", if the model attempts to execute dangerous commands (`rm -rf`, `git push --force`), the Rust backend intercepts the call and presents a hard UI block for user approval. In "Auto Mode", it runs completely autonomously.
3. **Prompt Caching & Cost Tracking**: Automatically injects Anthropic's `ephemeral` cache control markers to cut API costs by up to 90%. Includes a real-time token cost tracking dashboard.
4. **MCP (Model Context Protocol) Support**: Dynamically load MCP servers (e.g., SQLite, Brave Search) by adding them to the `.clauderc` file. The Rust backend automatically spins up node/python sub-processes and wires them via JSON-RPC 2.0 directly to the Claude API.
5. **Hooks System**: Define `pre-message` hooks in your `.clauderc` config to run shell commands automatically before API calls.
6. **Built-in Skills**: Quick slash commands like `/commit`, `/pr`, and `/clear` mapped directly to complex AI workflows.
7. **Background Tasks**: The model can spawn persistent background workers (like `npm run dev`) and fetch their logs dynamically via `CheckTask`.
8. **Interactive Electronic Pet**: A cute interactive coding buddy that responds to your petting, levels up, and gives encouragement!
9. **Slash Command Autocomplete**: Type "/" in the input box to see available commands with real-time fuzzy search and keyboard navigation.
10. **Settings Dashboard**: Comprehensive settings with multiple tabs:
    - General: API key, model selection, workspace
    - Auto Mode toggle
    - MCP server management and status
    - Skills catalog with built-in commands

### 🛠 Installation & Build

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production (macOS/Windows/Linux)
npm run tauri build
```

---

<a name="中文"></a>
## 🚀 简介 (中文)

这是一个非官方的、完全重写的 Anthropic Claude Code 命令行工具的图形化界面（GUI）版本。本项目采用 **Tauri (Rust)** 作为后端，**React** 作为前端，旨在提供一个美观、极速且完全不受限的 AI 编程助手。

官方的 CLI 运行在带有严格权限限制的 NodeJS 沙盒中，而本项目通过 Rust 赋予了 Claude **原生操作系统级别的超级权限**。

### ✨ 核心特性

1. **无限制沙盒逃逸**：底层由 Rust 驱动，Claude 可以无缝执行任意 `bash` 命令、读写任意系统文件，甚至原生拉起后台常驻进程。
2. **自动模式与硬拦截安全审批**：在”安全模式”下，当 AI 试图执行高危命令（如 `rm -rf`）时，Rust 后端会在 UI 层面强制拦截调用，弹出确认框要求用户审批。切换到”自动模式”后，AI 将获得完全自治权。
3. **Prompt 提示词缓存与计费面板**：深度集成了 Anthropic 的 `ephemeral` 缓存断点技术，使长上下文的 API 费用骤降最高 90%。UI 左上角自带实时 Token 成本精确估算面板。
4. **完整支持 MCP 扩展生态**：支持通过 `.clauderc` 配置文件动态加载第三方的 MCP（模型上下文协议）服务器（如本地查库、网页搜索）。Rust 后端会自动拉起并管理微服务，通过 JSON-RPC 2.0 原生接入 Claude 大模型。
5. **Hooks 钩子系统**：在 `.clauderc` 中配置 `pre-message` 等钩子，即可在发消息前自动执行本地 Shell 脚本。
6. **内置技能 (Skills)**：输入 `/commit`、`/pr`、`/clear` 等快捷指令，将自动展开为预设的复杂 AI 开发流。
7. **后台任务管理**：模型可以主动拉起如 `npm run dev` 这样的长连接进程，并通过 `CheckTask` 工具动态读取标准输出日志。
8. **互动电子宠物**：超萌的编程伙伴，点击互动会升级、表达情绪、给你加油打气！
9. **斜杠命令自动完成**：在输入框输入 “/” 即可实时显示可用命令，支持模糊搜索和键盘导航。
10. **综合设置面板**：多标签页设置系统：
    - 通用：API 密钥、模型选择、工作区
    - 自动模式切换
    - MCP 服务器管理和状态查看
    - 技能目录（内置命令一览）

### 🛠 安装与编译

```bash
# 安装依赖
npm install

# 启动开发服务器调试
npm run tauri dev

# 编译为生产环境安装包 (dmg / exe)
npm run tauri build
```

### 📝 配置文件示例 (`.clauderc`)

你可以将以下内容保存为当前项目或用户根目录下的 `.clauderc` (或 `.claude.json`)：

```json
{
  "auto_mode": true,
  "mcp_servers": {
    "sqlite": "npx -y @modelcontextprotocol/server-sqlite /tmp/test.db",
    "brave": "npx -y @modelcontextprotocol/server-brave-search"
  },
  "hooks": {
    "pre-message": "echo 'Hello from the pre-message hook!'"
  }
}
```