# ⚡️ Claude Code GUI - 终极解除封印版 (Unrestricted Edition)

[🇨🇳 中文介绍](#-中文介绍) | [🇬🇧 English](#-english)

---

<a name="-中文介绍"></a>
## 🇨🇳 中文介绍

终于不用在枯燥的终端黑框框里敲代码了！我们使用 **Tauri (Rust) + React** 将 Anthropic 官方强大的 `Claude Code CLI` 进行了**彻底的重写与图形化**。这不仅仅是一个漂亮的壳子，我们直接拆掉了原版的所有“安全护栏”，为你带来了一个性能极强、极其自由的 AI 编程超级外脑！

### 🔥 我们和官方原版 CLI 有什么区别？(大白话对比)

如果你是用来做宣传或者给团队安利，看这里就够了：

1. **告别黑框框，拥抱高颜值 GUI**
   原版只能在终端里跑，看代码累眼睛。我们重写了赛博朋克玻璃拟物风的完整桌面端，有代码高亮、对话气泡、系统参数设置侧边栏，体验直线上升！
2. **打破 NodeJS 沙盒，获取 Rust 级“神之权限”**
   原版为了安全，把 Claude 关在了一个受限的 Node 沙盒里。我们底层直接换成了 Rust，Claude 现在可以直接原生调用系统底层的 bash 命令、无缝读写任意文件、甚至悄悄在后台拉起你的 `npm run dev` 进程（我们叫它“沙盒逃逸”）。
3. **成本刺客：硬核注入 Prompt Caching (省钱高达 90%!)**
   用过原版 CLI 的人都知道，读几个大文件后 API 费用简直在烧钱。我们在调用层**强行注入了 Anthropic 最新的 Ephemeral 提示词缓存标记**！长对话和巨大的代码库上下文会被完美缓存，而且我们在 UI 上做了一个粉色的 **精准计费面板**，花了几分钱一目了然。
4. **进可“自动驾驶”，退可“绝对拦截”**
   原版的权限审批比较繁琐。我们在系统里内置了物理开关：
   -开启 **Auto Mode（自动模式）**：AI 彻底放飞自我，自己写代码、自己查 Bug、自己跑测试。
   -开启 **安全模式**：当 AI 试图执行 `rm -rf` 或者删库跑路这种高危命令时，Rust 底层会**硬拦截**，并在界面上弹出一个巨大的警告框，只有你点击“允许执行”才会放行。
5. **满血支持 MCP 生态与快捷指令**
   想让 Claude 连你的本地数据库？想让它上网搜索？只需要在目录里建一个 `.clauderc` 文件配置好 MCP 服务，Rust 会自动拉起这些后台服务并接入大模型。此外，我们在输入框支持了 `/commit`、`/pr`、`/clear` 等快捷一键指令，大幅提升摸鱼效率。

---

### 💻 技术细节与安装使用 (Technical Details)

本项目基于 Tauri 2.0 和 Vite (React+TS) 构建。

**1. 环境准备**
确保你安装了 Node.js (>=18) 和 Rust 环境。

**2. 安装与运行**
```bash
# 安装依赖
npm install

# 启动本地开发环境 (自动拉起桌面端)
npm run tauri dev

# 编译打包 (生成 Mac 的 .app/.dmg，或 Windows 的 .exe)
npm run tauri build
```

**3. 配置 `.clauderc` (可选)**
在你的项目根目录或用户主目录下创建一个 `.clauderc` (或 `.claude.json`)，即可解锁扩展能力：
```json
{
  "auto_mode": false,
  "mcp_servers": {
    "sqlite": "npx -y @modelcontextprotocol/server-sqlite /tmp/test.db",
    "brave": "npx -y @modelcontextprotocol/server-brave-search"
  },
  "hooks": {
    "pre-message": "echo '即将发送消息给大模型！'"
  }
}
```

---

<br/>

<a name="-english"></a>
## 🇬🇧 English

Tired of staring at a dull terminal window? We've completely rewritten Anthropic's official `Claude Code CLI` using **Tauri (Rust) + React** to give you a gorgeous Graphical User Interface (GUI). But this isn't just a pretty wrapper—we've removed the original sandboxing limitations to bring you an unbelievably powerful, unrestricted AI coding assistant.

### 🔥 Why use this over the official CLI?

If you want the quick pitch, here is what makes this GUI superior:

1. **A Gorgeous GUI over Terminal Text**
   The original CLI restricts you to a terminal. We built a beautiful, cyberpunk-inspired glassmorphism desktop app featuring proper code highlighting, chat bubbles, and an intuitive settings sidebar. 
2. **Sandbox Escape: True OS-Level Power via Rust**
   The official CLI runs in a restricted NodeJS sandbox. By using Rust as our backend engine, Claude now has native, unrestricted access to your OS. It can run any `bash` command natively, interact with your file system without arbitrary limits, and even spin up background tasks like `npm run dev`.
3. **The Cost Killer: Aggressive Prompt Caching (Save up to 90%)**
   Running the official CLI on large codebases burns through API credits fast. We've **force-injected Anthropic's Ephemeral Prompt Caching** into the API layer. Huge context windows are efficiently cached, and we've added a highly visible **Real-time Cost Tracker** to the UI so you know exactly what you're spending.
4. **"Auto-Pilot" vs "Hard Interception"**
   - **Auto Mode**: Claude operates entirely autonomously—writing code, debugging, and running tests without asking for permission.
   - **Safe Mode**: If Claude attempts high-risk actions (like `rm -rf` or database drops), the Rust backend performs a **hard interception** and blocks execution until you explicitly click "Approve" on a prominent UI alert.
5. **Full MCP Ecosystem & Slash Commands**
   Want Claude to query your local database or search the web? Simply define MCP (Model Context Protocol) servers in your `.clauderc` file. The Rust backend automatically manages these services. We also support quick slash commands like `/commit`, `/pr`, and `/clear` right from the chat box to speed up your workflow.

---

### 💻 Installation & Technical Setup

Built with Tauri 2.0 and Vite (React+TS).

**1. Prerequisites**
Ensure you have Node.js (>=18) and Rust installed.

**2. Run & Build**
```bash
# Install dependencies
npm install

# Run the app in development mode
npm run tauri dev

# Build the standalone application (macOS .app/.dmg, Windows .exe)
npm run tauri build
```

**3. Advanced Configuration (`.clauderc`)**
Create a `.clauderc` (or `.claude.json`) file in your project root or home directory to enable MCP servers and hooks:
```json
{
  "auto_mode": false,
  "mcp_servers": {
    "sqlite": "npx -y @modelcontextprotocol/server-sqlite /tmp/test.db",
    "brave": "npx -y @modelcontextprotocol/server-brave-search"
  },
  "hooks": {
    "pre-message": "echo 'Sending message to Claude!'"
  }
}
```