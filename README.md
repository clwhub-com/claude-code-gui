# AI 创新工具系列

欢迎来到我们的 GitHub 仓库！

**官网地址**：[clwhub.com](https://clwhub.com)

我们针对多个行业开发了一系列 AI 工具，将陆续上线发布。  
敬请持续关注我们，更多精彩产品正在紧张准备中！

### 即将推出的 AI 工具包括：
- **漫剧制作工具**  
- **自媒体运营AI工具**  
- **自动建站和 GEO 优化工具**

更多垂直行业的 AI 工具也将陆续与大家见面，欢迎持续关注我们的官网和 GitHub，一起探索 AI 赋能未来的无限可能！

---

# Claude Code GUI

![Claude Code GUI](src-tauri/icons/128x128.png)

[English](#english) | [中文](#中文)

<a name="english"></a>
## 🚀 Overview (English)

A powerful desktop GUI application for Anthropic's Claude Code, built with **Tauri (Rust)** backend and **React** frontend. This application provides a rich, interactive interface for AI-powered coding assistance with enhanced features beyond the official CLI.

### ✨ Key Features

1. **🤖 Multi-Agent System**
   - Agent Tool for delegating tasks to specialized agents
   - Built-in agents: Explore (code search), Plan (implementation planning), General (full access)
   - Agent registry for teammate communication
   - Sync/async agent execution with progress tracking

2. **⚡ Skills & Plugins System**
   - SKILL.md format with YAML frontmatter
   - Dual-layer loading: project-level `.claude/skills/` + global `~/.claude/skills/`
   - Slash command autocomplete (`/skill-name`)
   - Conditional skills with path-based activation
   - Plugin system with `plugin.json` metadata

3. **🔌 MCP (Model Context Protocol) Integration**
   - Dynamically load and manage MCP servers
   - Built-in MCP management dashboard
   - Support for popular servers (SQLite, Brave Search, etc.)
   - Automatic JSON-RPC 2.0 protocol handling

4. **⚙️ Hooks System**
   - Configure `.clauderc` for custom hooks
   - `pre-message`, `post-message` hooks for automation
   - Seamless integration with existing workflows

5. **🔄 Background Task Management**
   - Spawn and monitor background processes
   - Real-time log streaming
   - Task lifecycle management (start/stop/check)

6. **📅 Cron Job Scheduling**
   - Schedule recurring AI prompts with cron syntax
   - Visual job management interface
   - One-time and recurring job support

7. **📁 Advanced File Operations**
   - AST-based code editing with tree-sitter
   - Notebook (.ipynb) editing support
   - Image file handling with base64 encoding
   - Smart file search with glob patterns

8. **🔍 Code Search & Navigation**
   - Powerful regex-based content search
   - File structure exploration
   - Context-aware code understanding

9. **🌐 Web Integration**
   - Web search capabilities via DuckDuckGo
   - Web page fetching with markdown conversion
   - URL encoding and HTML parsing

10. **🐙 Interactive Electronic Pet**
    - Cute coding companion that responds to interactions
    - Leveling system and emotional states
    - Encouragement and Easter eggs

### 🛠️ Installation & Build

#### Prerequisites

- Node.js >= 18.0.0
- Rust (for Tauri backend)
- System dependencies for Tauri (platform-specific)

#### Setup

```bash
# Clone the repository
git clone https://github.com/clwhub-com/claude-code-gui.git
cd claude-code-gui

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

#### Configuration

Create a `.clauderc` file in your project root or home directory:

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

### 🎮 Usage

1. **Basic Chat**: Simply type your questions or requests in the chat interface
2. **Agent Tool**: Use the Agent tool to delegate tasks to specialized agents
3. **Skills**: Type `/` to see available skills and slash commands
4. **MCP Management**: Use Settings > MCP tab to manage servers
5. **Background Tasks**: AI can spawn tasks; monitor them in the task panel
6. **Cron Jobs**: Schedule recurring prompts via the Cron interface

### 📁 Project Structure

```
src/
├── agents/              # Multi-agent system
│   ├── AgentTool.tsx    # Agent tool implementation
│   ├── runAgent.ts      # Agent execution logic
│   ├── built-in/        # Built-in agents (Explore, Plan, General)
│   └── teammate/        # Agent registry for communication
├── skills/              # Skills system
│   ├── parser.ts        # SKILL.md parser
│   ├── loadSkillsDir.ts # Skills loader
│   └── bundledSkills.ts # Built-in skills
├── plugins/             # Plugins system
│   ├── pluginLoader.ts  # Plugin loader
│   └── builtinPlugins.ts # Built-in plugins
└── App.tsx              # Main application
```

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### 📄 License

This project is provided as-is for educational and research purposes.

---

<a name="中文"></a>
## 🚀 简介 (中文)

基于 **Tauri (Rust)** 后端和 **React** 前端构建的强大桌面 GUI 应用，为 Anthropic Claude Code 提供丰富的交互式界面，具备超越官方 CLI 的增强功能。

### ✨ 核心特性

1. **🤖 多代理系统**
   - Agent Tool 用于将任务委派给专业代理
   - 内置代理：Explore（代码搜索）、Plan（计划制定）、General（通用执行）
   - 代理注册表支持 Teammates 通信
   - 同步/异步执行，支持进度追踪

2. **⚡ 技能与插件系统**
   - SKILL.md 格式（YAML frontmatter）
   - 双层加载：项目级 `.claude/skills/` + 全局 `~/.claude/skills/`
   - 斜杠命令自动补全（`/skill-name`）
   - 条件技能，基于路径激活
   - 插件系统，支持 `plugin.json` 元数据

3. **🔌 MCP（模型上下文协议）集成**
   - 动态加载和管理 MCP 服务器
   - 内置 MCP 管理仪表板
   - 支持热门服务器（SQLite、Brave 搜索等）
   - 自动处理 JSON-RPC 2.0 协议

4. **⚙️ Hooks 钩子系统**
   - 通过 `.clauderc` 配置自定义钩子
   - `pre-message`、`post-message` 钩子实现自动化
   - 无缝集成现有工作流

5. **🔄 后台任务管理**
   - 启动和监控后台进程
   - 实时日志流传输
   - 任务生命周期管理（启动/停止/检查）

6. **📅 Cron 定时任务**
   - 使用 cron 语法调度循环 AI 提示
   - 可视化任务管理界面
   - 支持一次性定时和循环任务

7. **📁 高级文件操作**
   - 基于 AST 的代码编辑（tree-sitter）
   - Notebook (.ipynb) 编辑支持
   - 图片文件处理，base64 编码
   - 智能文件搜索（glob 模式）

8. **🔍 代码搜索与导航**
   - 强大的正则表达式内容搜索
   - 文件结构探索
   - 上下文感知的代码理解

9. **🌐 Web 集成**
   - 通过 DuckDuckGo 进行网页搜索
   - 网页获取，转换为 Markdown
   - URL 编码和 HTML 解析

10. **🐙 互动电子宠物**
    - 可爱的编程伴侣，响应交互
    - 升级系统和情绪状态
    - 鼓励内容和彩蛋

### 🛠️ 安装与编译

#### 系统要求

- Node.js >= 18.0.0
- Rust（用于 Tauri 后端）
- Tauri 系统依赖（平台特定）

#### 安装步骤

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

#### 配置说明

在项目根目录或用户主目录创建 `.clauderc` 文件：

```json
{
  "auto_mode": false,
  "mcp_servers": {
    "sqlite": "npx -y @modelcontextprotocol/server-sqlite /tmp/test.db",
    "brave": "npx -y @modelcontextprotocol/server-brave-search"
  },
  "hooks": {
    "pre-message": "echo '开始新对话'",
    "post-message": "echo '消息已发送给 AI'"
  }
}
```

### 🎮 使用指南

1. **基础对话**：在聊天界面直接输入问题或请求
2. **Agent 工具**：使用 Agent 工具将任务委派给专业代理
3. **技能系统**：输入 `/` 查看可用技能和斜杠命令
4. **MCP 管理**：通过设置 > MCP 标签页管理服务器
5. **后台任务**：AI 可以启动任务，在任务面板中监控
6. **定时任务**：通过 Cron 界面调度循环提示

### 📁 项目结构

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
└── App.tsx              # 主应用
```

### 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 📄 许可证

本项目仅供教育和研究用途使用。
