export const zh = {
  // Header
  title: 'Claude Code Gui',
  totalCost: '总花费',
  autoModeActive: '自动模式已启动',
  safeMode: '安全模式',
  settings: '系统设置',
  
  // Settings
  settingsTitle: '系统参数设定',
  general: '通用',
  mcp: 'MCP',
  skills: '技能',
  
  // General Settings
  apiKeyLabel: 'API 密钥 (Anthropic)',
  modelLabel: '模型引擎',
  baseUrlLabel: 'API 代理节点 (Base URL)',
  baseUrlPlaceholder: '默认官方节点 (留空)',
  workspaceLabel: '目标工作区 (Workspace)',
  changeDir: '变更目录',
  current: '当前',
  autoModeLabel: 'Auto Mode',
  autoModeDesc: '允许AI免许可执行系统指令',
  clearHistory: '清空对话历史',
  
  // MCP
  mcpServerManagement: 'MCP 服务器管理',
  mcpToolsLoaded: '个工具已加载',
  noMcpServers: '暂无已加载的 MCP 服务器',
  tools: '个工具',
  
  // Skills
  skillsAndCommands: '技能 & 命令',
  skillsLoaded: '个技能已加载',
  pluginsLoaded: '个插件已加载',
  slashCommandHint: '使用斜杠命令',
  quickTrigger: '快速触发',
  loadedPlugins: '已加载插件',
  
  // Welcome
  welcomeTitle: '欢迎使用 Claude Code',
  welcomeDesc: '我可以通过 Rust 原生执行任何终端命令。请提供您的 Anthropic API Key 以开始。',
  tryCommands: '试试',
  mcpTools: 'MCP 工具已加载',
  
  // Chat
  thinking: 'Claude 正在思考或执行工具...',
  systemNotify: '系统通知',
  workspaceChanged: '空间锚点已切换至',
  received: '已收到空间坐标。我当前的操作锚点已变更为',
  
  // Tool Approval
  sensitiveOperation: '拦截到敏感操作',
  autoModeWarning: 'Claude 试图在安全模式下执行高危工具调用：',
  allowExecute: '允许执行',
  rejectCall: '拒绝调用',
  userRejected: '用户拒绝了执行',
  
  // Input
  placeholder: '询问 Claude 执行命令或编写代码... (输入 / 查看命令)',
  placeholderNoKey: '请先输入 API Key',
  send: '发送',
  
  // Commands
  clearDesc: '清空聊天记录',
  commitDesc: '查看 git 状态和差异，编写规范提交信息并提交更改',
  prDesc: '查看 git 分支和更改，推送到 origin 并创建 GitHub PR',
  helpDesc: '显示可用命令和功能的帮助信息',
  
  // Language
  language: '语言',
  chinese: '中文',
  english: 'English',
};

export const en = {
  // Header
  title: 'Claude Code GUI',
  totalCost: 'Total Cost',
  autoModeActive: 'Auto Mode Active',
  safeMode: 'Safe Mode',
  settings: 'Settings',
  
  // Settings
  settingsTitle: 'System Settings',
  general: 'General',
  mcp: 'MCP',
  skills: 'Skills',
  
  // General Settings
  apiKeyLabel: 'API Key (Anthropic)',
  modelLabel: 'Model Engine',
  baseUrlLabel: 'API Base URL',
  baseUrlPlaceholder: 'Default official endpoint (leave empty)',
  workspaceLabel: 'Workspace',
  changeDir: 'Change Directory',
  current: 'Current',
  autoModeLabel: 'Auto Mode',
  autoModeDesc: 'Allow AI to execute system commands without permission',
  clearHistory: 'Clear Chat History',
  
  // MCP
  mcpServerManagement: 'MCP Server Management',
  mcpToolsLoaded: 'tools loaded',
  noMcpServers: 'No MCP servers loaded',
  tools: 'tools',
  
  // Skills
  skillsAndCommands: 'Skills & Commands',
  skillsLoaded: 'skills loaded',
  pluginsLoaded: 'plugins loaded',
  slashCommandHint: 'Use slash command',
  quickTrigger: 'quick trigger',
  loadedPlugins: 'Loaded Plugins',
  
  // Welcome
  welcomeTitle: 'Welcome to Claude Code',
  welcomeDesc: 'I can execute ANY terminal command natively via Rust. Please provide your Anthropic API Key to start.',
  tryCommands: 'Try',
  mcpTools: 'MCP Tools Loaded',
  
  // Chat
  thinking: 'Claude is thinking or executing tools...',
  systemNotify: 'System Notice',
  workspaceChanged: 'Workspace changed to',
  received: 'Workspace anchor received. Current operation anchor changed to',
  
  // Tool Approval
  sensitiveOperation: 'Sensitive Operation Intercepted',
  autoModeWarning: 'Claude attempted to execute high-risk tool calls in safe mode:',
  allowExecute: 'Allow Execution',
  rejectCall: 'Reject Call',
  userRejected: 'User rejected execution',
  
  // Input
  placeholder: 'Ask Claude to run a command or write code... (type / for commands)',
  placeholderNoKey: 'Please enter API Key first',
  send: 'Send',
  
  // Commands
  clearDesc: 'Clear the chat history',
  commitDesc: 'Review git status and diff, write conventional commit, and commit changes',
  prDesc: 'Review git branch and changes, push to origin, and create a GitHub PR',
  helpDesc: 'Show help information about available commands and features',
  
  // Language
  language: 'Language',
  chinese: '中文',
  english: 'English',
};

export type Translations = typeof zh;
