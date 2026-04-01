# Multi-Agent System & Skills/Plugins System Design

## 概述

本文档描述了 claude-code-gui 项目的多代理系统和技能/插件系统的设计方案。该设计基于参考项目 claude-code-source-code,适配 Tauri 环境。

## 目标

1. 实现完整的多代理系统,包括 Agent Tool、Teammates、Agent Swarms
2. 实现技能系统,支持 SKILL.md 格式、斜杠命令、条件技能
3. 实现插件系统,支持插件安装/卸载、版本管理
4. 复用现有 Rust 后端工具,同进程执行

## 需求

### 功能需求

#### 多代理系统
- 内置 3 个代理类型: Explore、Plan、General
- 支持同步/异步代理执行
- Worktree 隔离
- 代理间通信 (SendMessage)
- Teammates 多代理协作
- Agent Swarms 团队代理

#### 技能系统
- SKILL.md 格式 (YAML frontmatter + Markdown)
- 双层目录结构: 项目级 `.claude/skills/` + 全局 `~/.claude/skills/`
- 条件技能 (paths 过滤)
- 动态发现
- MCP 技能支持

#### 插件系统
- 插件目录结构: `~/.claude/plugins/<plugin-name>/`
- 插件元数据: `plugin.json`
- 内置插件
- 插件管理 (安装/卸载/启用/禁用)

### 非功能需求
- 性能: 代理执行延迟 < 100ms
- 可靠性: 错误处理完善,不崩溃
- 可扩展性: 支持自定义代理和技能
- 兼容性: 与参考项目格式兼容

## 架构

### 整体架构

```
src/
├── agents/              # 多代理系统
│   ├── AgentTool.tsx    # Agent 工具
│   ├── runAgent.ts      # 代理执行器
│   ├── loadAgentsDir.ts # 代理定义加载器
│   ├── built-in/        # 内置代理
│   │   ├── explore.ts   # Explore 代理
│   │   ├── plan.ts      # Plan 代理
│   │   └── general.ts   # General 代理
│   ├── teammate/        # Teammates 系统
│   │   ├── spawn.ts     # 代理生成
│   │   ├── registry.ts  # 代理注册表
│   │   └── messaging.ts # 代理间消息
│   └── swarm/           # Agent Swarms
│       ├── team.ts      # 团队管理
│       └── coordinator.ts # 协调器
├── skills/              # 技能系统
│   ├── loadSkillsDir.ts # 技能加载器
│   ├── bundledSkills.ts # 内置技能
│   ├── mcpSkillBuilders.ts # MCP 技能
│   └── parser.ts        # SKILL.md 解析器
├── plugins/             # 插件系统
│   ├── pluginLoader.ts  # 插件加载器
│   ├── builtinPlugins.ts # 内置插件
│   └── versionManager.ts # 版本管理
└── App.tsx              # 主应用 (扩展)
```

### 组件关系

```
App.tsx
  ├── AgentTool (新增工具)
  │   ├── runAgent (代理执行)
  │   │   ├── built-in agents (内置代理)
  │   │   └── custom agents (自定义代理)
  │   └── teammate system (团队系统)
  ├── Skill System (技能系统)
  │   ├── loadSkillsDir (加载器)
  │   ├── parser (解析器)
  │   └── bundledSkills (内置技能)
  └── Plugin System (插插件系统)
      ├── pluginLoader (加载器)
      └── builtinPlugins (内置插件)
```

## 组件设计

### 1. Agent Tool

**职责**: 作为新工具添加到工具列表,负责代理调度和执行

**接口**:
```typescript
interface AgentToolInput {
  description: string;      // 任务描述
  prompt: string;           // 任务提示
  subagent_type?: string;   // 代理类型
  run_in_background?: boolean; // 后台运行
  isolation?: 'worktree';   // 隔离模式
  name?: string;            // 代理名称
  team_name?: string;       // 团队名称
}

interface AgentToolOutput {
  status: 'completed' | 'async_launched';
  result?: string;
  agentId?: string;
  description?: string;
}
```

**依赖**:
- `runAgent.ts`: 代理执行逻辑
- `loadAgentsDir.ts`: 代理定义加载
- 现有 Rust 后端工具

### 2. runAgent

**职责**: 执行代理,管理代理生命周期

**接口**:
```typescript
async function* runAgent(params: {
  agentDefinition: AgentDefinition;
  promptMessages: Message[];
  toolUseContext: ToolUseContext;
  canUseTool: CanUseToolFn;
  isAsync: boolean;
  override?: {
    systemPrompt?: SystemPrompt;
    abortController?: AbortController;
    agentId?: string;
  };
}): AsyncGenerator<Message, void>
```

**依赖**:
- 现有 `query.ts`: API 调用
- 现有工具系统: 工具执行

### 3. 内置代理定义

**Explore 代理**:
```typescript
{
  agentType: 'Explore',
  description: '代码探索代理',
  getSystemPrompt: () => '...',
  allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
  permissionMode: 'plan'
}
```

**Plan 代理**:
```typescript
{
  agentType: 'Plan',
  description: '计划制定代理',
  getSystemPrompt: () => '...',
  allowedTools: ['Read', 'Glob', 'Grep'],
  permissionMode: 'plan'
}
```

**General 代理**:
```typescript
{
  agentType: 'General',
  description: '通用执行代理',
  getSystemPrompt: () => '...',
  allowedTools: ['*'], // 所有工具
  permissionMode: 'acceptEdits'
}
```

### 4. Teammates 系统

**代理注册表**:
```typescript
interface AgentRegistry {
  register(name: string, agentId: string): void;
  unregister(name: string): void;
  lookup(name: string): string | undefined;
}
```

**SendMessage 工具**:
```typescript
interface SendMessageInput {
  to: string;           // 目标代理名称
  content: string;      // 消息内容
}
```

### 5. Agent Swarms

**团队管理**:
```typescript
interface Team {
  name: string;
  members: Teammate[];
  leadAgentId: string;
}

interface TeamManager {
  createTeam(name: string, leadAgentId: string): Team;
  addMember(teamName: string, teammate: Teammate): void;
  removeMember(teamName: string, agentId: string): void;
  getTeam(name: string): Team | undefined;
}
```

### 6. 技能加载器

**职责**: 从文件系统加载技能定义

**接口**:
```typescript
async function loadSkillsDir(dir: string): Promise<Skill[]>;

interface Skill {
  name: string;
  description: string;
  content: string;
  allowedTools: string[];
  whenToUse?: string;
  paths?: string[];
  hooks?: HooksSettings;
}
```

**加载流程**:
1. 扫描目录 `skills/`
2. 查找 `SKILL.md` 文件
3. 解析 YAML frontmatter
4. 创建 Skill 对象
5. 注册斜杠命令

### 7. SKILL.md 解析器

**职责**: 解析 SKILL.md 文件的 YAML frontmatter 和 Markdown 内容

**接口**:
```typescript
function parseSkill(content: string): {
  frontmatter: Record<string, any>;
  content: string;
};
```

**Frontmatter 字段**:
- `name`: 技能名称
- `description`: 技能描述
- `allowed-tools`: 允许的工具列表
- `when-to-use`: 使用场景
- `argument-hint`: 参数提示
- `model`: 模型选择
- `paths`: 条件激活路径
- `hooks`: 钩子配置

### 8. 插件加载器

**职责**: 从文件系统加载插件定义

**接口**:
```typescript
async function loadPlugins(dir: string): Promise<Plugin[]>;

interface Plugin {
  name: string;
  version: string;
  description: string;
  skills: Skill[];
  agents: AgentDefinition[];
  mcpServers?: Record<string, McpServerConfig>;
}
```

**加载流程**:
1. 扫描 `plugins/` 目录
2. 读取 `plugin.json`
3. 加载技能和代理
4. 合并到全局列表

## 数据流

### 代理执行数据流

```
用户输入 → 解析 Agent Tool 调用
  ↓
选择代理类型 (subagent_type)
  ↓
创建代理上下文 (隔离/共享)
  ↓
执行代理 (runAgent)
  ↓
代理使用工具 (复用 Rust 后端)
  ↓
收集结果 → 返回给主代理
```

### 技能加载数据流

```
启动时:
  扫描目录 → 解析 SKILL.md → 注册斜杠命令

运行时:
  文件变更 → 重新发现 → 更新技能列表
  
触发时:
  /skill-name → 加载技能内容 → 注入系统提示
```

### 插件加载数据流

```
启动时:
  扫描 plugins/ → 读取 plugin.json → 
  加载技能/代理 → 合并到全局列表
```

### 代理间通信数据流

```
代理 A (SendMessage) → agentNameRegistry 查找 → 
  代理 B 的消息队列 → 代理 B 处理消息
```

## 错误处理

### 代理执行错误

```typescript
try {
  // 执行代理
} catch (error) {
  // 1. 记录错误日志
  console.error(`Agent ${agentId} failed:`, error);
  
  // 2. 更新代理状态
  setAppState(prev => ({
    ...prev,
    agents: {
      ...prev.agents,
      [agentId]: { ...prev.agents[agentId], status: 'failed' }
    }
  }));
  
  // 3. 通知主代理
  return { error: error.message };
}
```

### 技能加载错误

- 解析失败: 跳过该技能,记录警告
- 文件不存在: 忽略
- 权限错误: 记录错误,继续加载其他技能

### 插件加载错误

- `plugin.json` 无效: 跳过该插件
- 依赖缺失: 记录警告,部分加载
- 版本不兼容: 提示用户更新

### 代理通信错误

- 目标代理不存在: 返回错误
- 消息队列满: 阻塞或丢弃
- 代理已终止: 清理注册表

## 测试策略

### 单元测试

- **代理定义加载**: 测试 `loadAgentsDir.ts`
- **技能解析**: 测试 `parser.ts`
- **插件元数据**: 测试 `plugin.json` 解析

### 集成测试

- **代理执行**: 测试 `runAgent()` 与工具交互
- **技能触发**: 测试斜杠命令执行
- **代理通信**: 测试 SendMessage 路由

### 端到端测试

- **完整代理流程**: 用户请求 → 代理执行 → 返回结果
- **技能加载流程**: 启动 → 加载 → 触发
- **插件管理流程**: 安装 → 启用 → 使用

### 测试工具

- Vitest (单元测试)
- Playwright (E2E 测试)
- Mock Tauri API (模拟后端)

## 实现阶段

### 阶段 1: 基础代理系统 (3-5 天)

1. 创建 `src/agents/` 目录结构
2. 实现 `AgentTool.tsx` (基础版本)
3. 实现 `runAgent.ts` (同步执行)
4. 实现内置代理定义 (Explore, Plan, General)
5. 集成到现有工具列表

### 阶段 2: 技能系统 (2-3 天)

1. 创建 `src/skills/` 目录结构
2. 实现 SKILL.md 解析器
3. 实现技能加载器
4. 实现斜杠命令注册
5. 添加条件技能支持

### 阶段 3: Teammates 和 Swarms (3-5 天)

1. 实现代理注册表
2. 实现 SendMessage 工具
3. 实现团队管理
4. 实现代理间通信

### 阶段 4: 插件系统 (2-3 天)

1. 创建 `src/plugins/` 目录结构
2. 实现插件加载器
3. 实现插件管理
4. 添加内置插件

### 阶段 5: 高级功能 (3-5 天)

1. 实现异步代理执行
2. 实现 Worktree 隔离
3. 实现 MCP 技能支持
4. 实现动态技能发现

### 阶段 6: 测试和优化 (2-3 天)

1. 编写单元测试
2. 编写集成测试
3. 性能优化
4. 错误处理完善

## 依赖关系

### 外部依赖

- `@anthropic-ai/sdk`: Anthropic API 客户端
- `@tauri-apps/api`: Tauri API
- `yaml`: YAML 解析 (用于 frontmatter)
- `ignore`: Gitignore 风格路径匹配

### 内部依赖

- 现有工具系统: 复用 Rust 后端工具
- 现有 AppState: 扩展代理和技能状态
- 现有 UI 组件: 复用聊天界面

## 风险和缓解

### 风险 1: 复杂度高

**缓解**: 分阶段实现,每个阶段独立测试

### 风险 2: 性能问题

**缓解**: 使用异步执行,避免阻塞主线程

### 风险 3: 兼容性问题

**缓解**: 与参考项目格式保持兼容,支持渐进式迁移

### 风险 4: 错误处理

**缓解**: 完善的错误处理机制,不因单个错误崩溃

## 参考资料

- [claude-code-source-code](/Users/a1/Desktop/workspace/claude-code-source-code)
- [AgentTool.tsx](/Users/a1/Desktop/workspace/claude-code-source-code/src/tools/AgentTool/AgentTool.tsx)
- [runAgent.ts](/Users/a1/Desktop/workspace/claude-code-source-code/src/tools/AgentTool/runAgent.ts)
- [loadSkillsDir.ts](/Users/a1/Desktop/workspace/claude-code-source-code/src/skills/loadSkillsDir.ts)
- [bundledSkills.ts](/Users/a1/Desktop/workspace/claude-code-source-code/src/skills/bundledSkills.ts)
