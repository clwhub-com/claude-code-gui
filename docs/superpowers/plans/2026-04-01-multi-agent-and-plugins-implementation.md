# Multi-Agent & Skills/Plugins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete multi-agent system (Agent Tool, Teammates, Agent Swarms) and skills/plugins system for claude-code-gui

**Architecture:** Extend existing Tauri + React app with modular agent/skill/plugin systems, reusing Rust backend tools

**Tech Stack:** TypeScript, React, Tauri, Anthropic SDK, YAML parser

---

## File Structure

### New Files to Create

```
src/
├── agents/
│   ├── index.ts                    # Export all agent modules
│   ├── types.ts                    # Agent type definitions
│   ├── AgentTool.tsx               # Agent tool implementation
│   ├── runAgent.ts                 # Agent execution logic
│   ├── loadAgentsDir.ts            # Load agent definitions from disk
│   ├── built-in/
│   │   ├── index.ts                # Export built-in agents
│   │   ├── explore.ts              # Explore agent definition
│   │   ├── plan.ts                 # Plan agent definition
│   │   └── general.ts              # General agent definition
│   ├── teammate/
│   │   ├── index.ts                # Export teammate modules
│   │   ├── registry.ts             # Agent name registry
│   │   ├── spawn.ts                # Spawn teammate agents
│   │   └── messaging.ts            # Inter-agent messaging
│   └── swarm/
│       ├── index.ts                # Export swarm modules
│       ├── team.ts                 # Team management
│       └── coordinator.ts          # Swarm coordinator
├── skills/
│   ├── index.ts                    # Export all skill modules
│   ├── types.ts                    # Skill type definitions
│   ├── parser.ts                   # SKILL.md parser
│   ├── loadSkillsDir.ts            # Load skills from disk
│   ├── bundledSkills.ts            # Built-in skills
│   └── mcpSkillBuilders.ts         # MCP skill builders
├── plugins/
│   ├── index.ts                    # Export all plugin modules
│   ├── types.ts                    # Plugin type definitions
│   ├── pluginLoader.ts             # Load plugins from disk
│   ├── builtinPlugins.ts           # Built-in plugins
│   └── versionManager.ts           # Plugin version management
└── utils/
    └── frontmatterParser.ts        # YAML frontmatter parser
```

### Files to Modify

```
src/App.tsx                         # Add agent/skill/plugin state
src/App.css                         # Add agent/skill UI styles
```

---

## Task 1: Create Type Definitions

**Files:**
- Create: `src/agents/types.ts`
- Create: `src/skills/types.ts`
- Create: `src/plugins/types.ts`

- [ ] **Step 1: Create agent types**

```typescript
// src/agents/types.ts
export interface AgentDefinition {
  agentType: string;
  description: string;
  getSystemPrompt: (context: { toolUseContext?: any }) => string;
  allowedTools: string[];
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions';
  background?: boolean;
  isolation?: 'worktree';
  model?: string;
  color?: string;
}

export interface AgentState {
  id: string;
  type: string;
  name?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  teamName?: string;
  parentId?: string;
  startTime?: number;
  result?: string;
  error?: string;
}

export interface AgentToolInput {
  description: string;
  prompt: string;
  subagent_type?: string;
  run_in_background?: boolean;
  isolation?: 'worktree';
  name?: string;
  team_name?: string;
  model?: string;
}

export interface AgentToolOutput {
  status: 'completed' | 'async_launched';
  result?: string;
  agentId?: string;
  description?: string;
  outputFile?: string;
}

export interface Team {
  name: string;
  members: Teammate[];
  leadAgentId: string;
}

export interface Teammate {
  id: string;
  name: string;
  agentType: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  color?: string;
}
```

- [ ] **Step 2: Create skill types**

```typescript
// src/skills/types.ts
export interface Skill {
  name: string;
  description: string;
  content: string;
  allowedTools: string[];
  whenToUse?: string;
  argumentHint?: string;
  paths?: string[];
  hooks?: HooksSettings;
  source: 'project' | 'global' | 'bundled' | 'plugin';
  filePath?: string;
}

export interface HooksSettings {
  PreToolUse?: HookConfig[];
  PostToolUse?: HookConfig[];
  Notification?: HookConfig[];
}

export interface HookConfig {
  matcher?: string;
  command: string;
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  'allowed-tools'?: string | string[];
  'when-to-use'?: string;
  'argument-hint'?: string;
  model?: string;
  paths?: string | string[];
  hooks?: HooksSettings;
}
```

- [ ] **Step 3: Create plugin types**

```typescript
// src/plugins/types.ts
import { Skill } from '../skills/types';
import { AgentDefinition } from '../agents/types';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  skills: Skill[];
  agents: AgentDefinition[];
  mcpServers?: Record<string, McpServerConfig>;
  enabled: boolean;
  source: 'builtin' | 'installed';
  path: string;
}

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  skills?: string[];
  agents?: string[];
  mcpServers?: Record<string, McpServerConfig>;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/types.ts src/skills/types.ts src/plugins/types.ts
git commit -m "feat: add type definitions for agents, skills, and plugins"
```

---

## Task 2: Create Frontmatter Parser

**Files:**
- Create: `src/utils/frontmatterParser.ts`

- [ ] **Step 1: Install yaml dependency**

```bash
npm install yaml
npm install -D @types/yaml
```

- [ ] **Step 2: Create frontmatter parser**

```typescript
// src/utils/frontmatterParser.ts
import { parse as parseYaml } from 'yaml';

export interface ParsedFrontmatter {
  frontmatter: Record<string, any>;
  content: string;
}

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: markdown,
    };
  }

  try {
    const frontmatter = parseYaml(match[1]) || {};
    const content = match[2];
    return { frontmatter, content };
  } catch (error) {
    console.error('Failed to parse frontmatter:', error);
    return {
      frontmatter: {},
      content: markdown,
    };
  }
}

export function stringifyFrontmatter(
  frontmatter: Record<string, any>,
  content: string
): string {
  const yaml = Object.entries(frontmatter)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n');

  return `---\n${yaml}\n---\n${content}`;
}
```

- [ ] **Step 3: Create test file**

```typescript
// src/utils/frontmatterParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatterParser';

describe('parseFrontmatter', () => {
  it('should parse frontmatter correctly', () => {
    const input = `---
name: test
description: A test skill
---

# Content`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.name).toBe('test');
    expect(result.frontmatter.description).toBe('A test skill');
    expect(result.content).toBe('# Content');
  });

  it('should handle missing frontmatter', () => {
    const input = '# Just content';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(input);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/utils/frontmatterParser.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/frontmatterParser.ts src/utils/frontmatterParser.test.ts package.json
git commit -m "feat: add YAML frontmatter parser"
```

---

## Task 3: Create Skill Parser and Loader

**Files:**
- Create: `src/skills/parser.ts`
- Create: `src/skills/loadSkillsDir.ts`
- Create: `src/skills/types.ts` (update)

- [ ] **Step 1: Create skill parser**

```typescript
// src/skills/parser.ts
import { parseFrontmatter } from '../utils/frontmatterParser';
import { Skill, SkillFrontmatter } from './types';

export function parseSkill(
  content: string,
  filePath: string,
  source: Skill['source']
): Skill | null {
  const { frontmatter, content: markdownContent } = parseFrontmatter(content);

  const name = frontmatter.name || extractNameFromPath(filePath);
  const description = frontmatter.description || extractDescription(markdownContent);

  if (!name) {
    console.warn(`Skill at ${filePath} has no name`);
    return null;
  }

  return {
    name,
    description,
    content: markdownContent,
    allowedTools: parseAllowedTools(frontmatter['allowed-tools']),
    whenToUse: frontmatter['when-to-use'],
    argumentHint: frontmatter['argument-hint'],
    paths: parsePaths(frontmatter.paths),
    hooks: frontmatter.hooks,
    source,
    filePath,
  };
}

function extractNameFromPath(filePath: string): string {
  const parts = filePath.split('/');
  const dirName = parts[parts.length - 2];
  return dirName || '';
}

function extractDescription(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.replace(/^#*\s*/, '').slice(0, 100);
}

function parseAllowedTools(tools: string | string[] | undefined): string[] {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools;
  return tools.split(',').map(t => t.trim());
}

function parsePaths(paths: string | string[] | undefined): string[] | undefined {
  if (!paths) return undefined;
  if (Array.isArray(paths)) return paths;
  return paths.split(',').map(p => p.trim());
}
```

- [ ] **Step 2: Create skill loader**

```typescript
// src/skills/loadSkillsDir.ts
import { Skill } from './types';
import { parseSkill } from './parser';

export async function loadSkillsFromDir(
  dirPath: string,
  source: Skill['source']
): Promise<Skill[]> {
  try {
    const entries = await invoke('read_dir', { path: dirPath });
    const skills: Skill[] = [];

    for (const entry of entries as any[]) {
      if (entry.is_dir) {
        const skillPath = `${dirPath}/${entry.name}/SKILL.md`;
        try {
          const content = await invoke('read_file', { path: skillPath }) as string;
          const skill = parseSkill(content, skillPath, source);
          if (skill) {
            skills.push(skill);
          }
        } catch {
          // SKILL.md doesn't exist, skip
        }
      }
    }

    return skills;
  } catch (error) {
    console.error(`Failed to load skills from ${dirPath}:`, error);
    return [];
  }
}

export async function loadAllSkills(
  projectDir: string,
  globalDir: string
): Promise<Skill[]> {
  const [projectSkills, globalSkills] = await Promise.all([
    loadSkillsFromDir(`${projectDir}/.claude/skills`, 'project'),
    loadSkillsFromDir(`${globalDir}/skills`, 'global'),
  ]);

  // Project skills override global skills with same name
  const skillMap = new Map<string, Skill>();
  for (const skill of globalSkills) {
    skillMap.set(skill.name, skill);
  }
  for (const skill of projectSkills) {
    skillMap.set(skill.name, skill);
  }

  return Array.from(skillMap.values());
}
```

- [ ] **Step 3: Create test**

```typescript
// src/skills/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkill } from './parser';

describe('parseSkill', () => {
  it('should parse skill with frontmatter', () => {
    const content = `---
name: my-skill
description: A test skill
allowed-tools: Bash, Read
---

# My Skill

This is the skill content.`;

    const skill = parseSkill(content, '/path/to/skill/SKILL.md', 'project');
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe('my-skill');
    expect(skill!.description).toBe('A test skill');
    expect(skill!.allowedTools).toEqual(['Bash', 'Read']);
  });

  it('should extract name from path if missing', () => {
    const content = '# My Skill';
    const skill = parseSkill(content, '/path/to/my-skill/SKILL.md', 'project');
    expect(skill!.name).toBe('my-skill');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/skills/parser.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/skills/parser.ts src/skills/loadSkillsDir.ts src/skills/parser.test.ts
git commit -m "feat: add skill parser and loader"
```

---

## Task 4: Create Built-in Agents

**Files:**
- Create: `src/agents/built-in/explore.ts`
- Create: `src/agents/built-in/plan.ts`
- Create: `src/agents/built-in/general.ts`
- Create: `src/agents/built-in/index.ts`

- [ ] **Step 1: Create Explore agent**

```typescript
// src/agents/built-in/explore.ts
import { AgentDefinition } from '../types';

export const EXPLORE_AGENT: AgentDefinition = {
  agentType: 'Explore',
  description: 'Code exploration agent for searching and understanding codebases',
  getSystemPrompt: () => `You are a code exploration agent. Your job is to search and understand codebases.
You have access to Read, Glob, Grep, and Bash tools.
Focus on finding relevant code, understanding structure, and reporting findings.
Do not make any changes to the codebase.`,
  allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
  permissionMode: 'plan',
  color: '#4CAF50',
};
```

- [ ] **Step 2: Create Plan agent**

```typescript
// src/agents/built-in/plan.ts
import { AgentDefinition } from '../types';

export const PLAN_AGENT: AgentDefinition = {
  agentType: 'Plan',
  description: 'Planning agent for creating implementation plans',
  getSystemPrompt: () => `You are a planning agent. Your job is to create detailed implementation plans.
You have access to Read, Glob, and Grep tools for understanding the codebase.
Create step-by-step plans with clear file paths and code examples.
Do not make any changes to the codebase.`,
  allowedTools: ['Read', 'Glob', 'Grep'],
  permissionMode: 'plan',
  color: '#2196F3',
};
```

- [ ] **Step 3: Create General agent**

```typescript
// src/agents/built-in/general.ts
import { AgentDefinition } from '../types';

export const GENERAL_AGENT: AgentDefinition = {
  agentType: 'General',
  description: 'General-purpose agent with full tool access',
  getSystemPrompt: () => `You are a general-purpose coding agent. You can read, write, and execute code.
Use all available tools to complete tasks efficiently.
Always verify your changes work correctly.`,
  allowedTools: ['*'], // All tools
  permissionMode: 'acceptEdits',
  color: '#9C27B0',
};
```

- [ ] **Step 4: Create index export**

```typescript
// src/agents/built-in/index.ts
export { EXPLORE_AGENT } from './explore';
export { PLAN_AGENT } from './plan';
export { GENERAL_AGENT } from './general';

import { AgentDefinition } from '../types';
import { EXPLORE_AGENT } from './explore';
import { PLAN_AGENT } from './plan';
import { GENERAL_AGENT } from './general';

export const BUILT_IN_AGENTS: AgentDefinition[] = [
  EXPLORE_AGENT,
  PLAN_AGENT,
  GENERAL_AGENT,
];
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/built-in/
git commit -m "feat: add built-in agent definitions (Explore, Plan, General)"
```

---

## Task 5: Create Agent Registry

**Files:**
- Create: `src/agents/teammate/registry.ts`
- Create: `src/agents/teammate/index.ts`

- [ ] **Step 1: Create agent registry**

```typescript
// src/agents/teammate/registry.ts
export class AgentRegistry {
  private nameToId = new Map<string, string>();
  private idToName = new Map<string, string>();

  register(name: string, agentId: string): void {
    // Remove old registration if exists
    const oldId = this.nameToId.get(name);
    if (oldId) {
      this.idToName.delete(oldId);
    }

    this.nameToId.set(name, agentId);
    this.idToName.set(agentId, name);
  }

  unregister(name: string): void {
    const agentId = this.nameToId.get(name);
    if (agentId) {
      this.nameToId.delete(name);
      this.idToName.delete(agentId);
    }
  }

  unregisterById(agentId: string): void {
    const name = this.idToName.get(agentId);
    if (name) {
      this.nameToId.delete(name);
      this.idToName.delete(agentId);
    }
  }

  lookup(name: string): string | undefined {
    return this.nameToId.get(name);
  }

  lookupByAgentId(agentId: string): string | undefined {
    return this.idToName.get(agentId);
  }

  has(name: string): boolean {
    return this.nameToId.has(name);
  }

  clear(): void {
    this.nameToId.clear();
    this.idToName.clear();
  }

  getAll(): Array<{ name: string; agentId: string }> {
    return Array.from(this.nameToId.entries()).map(([name, agentId]) => ({
      name,
      agentId,
    }));
  }
}
```

- [ ] **Step 2: Create index export**

```typescript
// src/agents/teammate/index.ts
export { AgentRegistry } from './registry';
```

- [ ] **Step 3: Create test**

```typescript
// src/agents/teammate/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from './registry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register and lookup agents', () => {
    registry.register('worker-1', 'agent-123');
    expect(registry.lookup('worker-1')).toBe('agent-123');
    expect(registry.lookupByAgentId('agent-123')).toBe('worker-1');
  });

  it('should unregister agents', () => {
    registry.register('worker-1', 'agent-123');
    registry.unregister('worker-1');
    expect(registry.lookup('worker-1')).toBeUndefined();
  });

  it('should handle duplicate registrations', () => {
    registry.register('worker-1', 'agent-123');
    registry.register('worker-1', 'agent-456');
    expect(registry.lookup('worker-1')).toBe('agent-456');
    expect(registry.lookupByAgentId('agent-123')).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/agents/teammate/registry.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/teammate/ src/agents/teammate/registry.test.ts
git commit -m "feat: add agent registry for teammate communication"
```

---

## Task 6: Create Agent Tool

**Files:**
- Create: `src/agents/AgentTool.tsx`
- Create: `src/agents/runAgent.ts`
- Create: `src/agents/index.ts`

- [ ] **Step 1: Create runAgent function**

```typescript
// src/agents/runAgent.ts
import Anthropic from '@anthropic-ai/sdk';
import { AgentDefinition, AgentState } from './types';
import { invoke } from '@tauri-apps/api/core';

export interface RunAgentParams {
  agentDefinition: AgentDefinition;
  prompt: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  tools: Anthropic.Tool[];
  handleToolCall: (toolUse: Anthropic.ToolUseBlock) => Promise<string | Anthropic.ImageBlockParam[]>;
  onProgress?: (message: string) => void;
  abortController?: AbortController;
}

export interface RunAgentResult {
  success: boolean;
  result?: string;
  error?: string;
  messages: Anthropic.MessageParam[];
}

export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const {
    agentDefinition,
    prompt,
    apiKey,
    baseUrl,
    model,
    tools,
    handleToolCall,
    onProgress,
    abortController,
  } = params;

  const anthropic = new Anthropic({
    apiKey,
    baseURL: baseUrl || undefined,
    dangerouslyAllowBrowser: true,
  });

  // Filter tools based on agent's allowed tools
  const agentTools = agentDefinition.allowedTools.includes('*')
    ? tools
    : tools.filter(t => agentDefinition.allowedTools.includes(t.name));

  const systemPrompt = agentDefinition.getSystemPrompt({});
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  let isDone = false;
  let stepCount = 0;
  const maxSteps = 50;

  try {
    while (!isDone && stepCount < maxSteps) {
      if (abortController?.signal.aborted) {
        throw new Error('Agent execution aborted');
      }

      stepCount++;
      onProgress?.(`Agent step ${stepCount}...`);

      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: agentTools,
      });

      messages.push({ role: 'assistant', content: response.content });

      const toolUses = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use'
      );

      if (toolUses.length > 0) {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUses) {
          try {
            const result = await handleToolCall(toolUse);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            });
          } catch (error) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              is_error: true,
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
      } else {
        isDone = true;
      }
    }

    const finalText = messages
      .filter((m): m is { role: 'assistant'; content: any } => m.role === 'assistant')
      .map(m => {
        if (typeof m.content === 'string') return m.content;
        return m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
      })
      .pop() || '';

    return {
      success: true,
      result: finalText,
      messages,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      messages,
    };
  }
}
```

- [ ] **Step 2: Create AgentTool component**

```typescript
// src/agents/AgentTool.tsx
import { AgentToolInput, AgentToolOutput, AgentDefinition } from './types';
import { BUILT_IN_AGENTS } from './built-in';
import { runAgent } from './runAgent';
import { AgentRegistry } from './teammate/registry';

export function createAgentTool(
  apiKey: string,
  baseUrl: string | undefined,
  model: string,
  tools: any[],
  handleToolCall: (toolUse: any) => Promise<string | any[]>,
  setAppState: (updater: (prev: any) => any) => void
) {
  const registry = new AgentRegistry();
  const agents: AgentDefinition[] = [...BUILT_IN_AGENTS];

  async function executeAgent(input: AgentToolInput): Promise<AgentToolOutput> {
    const agentType = input.subagent_type || 'General';
    const agent = agents.find(a => a.agentType === agentType);

    if (!agent) {
      throw new Error(`Agent type '${agentType}' not found. Available: ${agents.map(a => a.agentType).join(', ')}`);
    }

    const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Register agent name if provided
    if (input.name) {
      registry.register(input.name, agentId);
    }

    // Update state
    setAppState(prev => ({
      ...prev,
      agents: {
        ...prev.agents,
        [agentId]: {
          id: agentId,
          type: agentType,
          name: input.name,
          status: 'running',
          startTime: Date.now(),
        },
      },
    }));

    try {
      const result = await runAgent({
        agentDefinition: agent,
        prompt: input.prompt,
        apiKey,
        baseUrl,
        model: input.model || model,
        tools,
        handleToolCall,
        onProgress: (msg) => console.log(`[${agentId}] ${msg}`),
      });

      // Update state
      setAppState(prev => ({
        ...prev,
        agents: {
          ...prev.agents,
          [agentId]: {
            ...prev.agents[agentId],
            status: result.success ? 'completed' : 'failed',
            result: result.result,
            error: result.error,
          },
        },
      }));

      if (input.run_in_background) {
        return {
          status: 'async_launched',
          agentId,
          description: input.description,
        };
      }

      return {
        status: 'completed',
        result: result.result || result.error,
        agentId,
        description: input.description,
      };
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        agents: {
          ...prev.agents,
          [agentId]: {
            ...prev.agents[agentId],
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          },
        },
      }));

      throw error;
    } finally {
      if (input.name) {
        registry.unregister(input.name);
      }
    }
  }

  return {
    executeAgent,
    registry,
    agents,
  };
}
```

- [ ] **Step 3: Create index export**

```typescript
// src/agents/index.ts
export * from './types';
export * from './built-in';
export { createAgentTool } from './AgentTool';
export { runAgent } from './runAgent';
export { AgentRegistry } from './teammate/registry';
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/AgentTool.tsx src/agents/runAgent.ts src/agents/index.ts
git commit -m "feat: add Agent Tool implementation"
```

---

## Task 7: Integrate Agent Tool into App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Agent Tool to tools list**

Add to the `tools` array in `App.tsx`:

```typescript
{
  name: "Agent",
  description: "Launch a new agent to handle complex, multi-step tasks autonomously.",
  input_schema: {
    type: "object",
    properties: {
      description: { type: "string", description: "A short (3-5 word) description of the task" },
      prompt: { type: "string", description: "The task for the agent to perform" },
      subagent_type: { type: "string", description: "The type of specialized agent (Explore, Plan, General)", enum: ["Explore", "Plan", "General"] },
      run_in_background: { type: "boolean", description: "Set to true to run this agent in the background" },
      isolation: { type: "string", description: "Isolation mode", enum: ["worktree"] },
      name: { type: "string", description: "Name for the spawned agent (for team communication)" },
      team_name: { type: "string", description: "Team name for spawning" },
    },
    required: ["description", "prompt"],
  },
},
```

- [ ] **Step 2: Add agent state to App**

```typescript
// In App component
const [agents, setAgents] = useState<Record<string, AgentState>>({});
const [agentRegistry] = useState(() => new AgentRegistry());
```

- [ ] **Step 3: Handle Agent tool calls**

In `handleToolCall`, add:

```typescript
else if (toolUse.name === "Agent") {
  const input = toolUse.input as AgentToolInput;
  const agentTool = createAgentTool(
    apiKey,
    baseUrl,
    model,
    tools,
    handleToolCall,
    setAppState
  );
  const result = await agentTool.executeAgent(input);
  resultStr = JSON.stringify(result, null, 2);
}
```

- [ ] **Step 4: Test integration**

Run the app and test:
```
Ask: "Use the Explore agent to find all TypeScript files in src/"
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate Agent Tool into main application"
```

---

## Task 8: Create Skill Slash Commands

**Files:**
- Modify: `src/App.tsx`
- Create: `src/skills/bundledSkills.ts`

- [ ] **Step 1: Add skill state**

```typescript
// In App component
const [skills, setSkills] = useState<Skill[]>([]);
const [skillSuggestions, setSkillSuggestions] = useState<Skill[]>([]);
```

- [ ] **Step 2: Load skills on mount**

```typescript
useEffect(() => {
  async function loadSkills() {
    const projectDir = await invoke('get_cwd') as string;
    const homeDir = await invoke('get_home_dir') as string;
    
    const loadedSkills = await loadAllSkills(projectDir, homeDir);
    setSkills(loadedSkills);
  }
  
  loadSkills().catch(console.error);
}, []);
```

- [ ] **Step 3: Extend slash command search**

```typescript
function searchCommands(query: string): typeof slashCommands {
  const commands = [...slashCommands];
  
  // Add skills as slash commands
  for (const skill of skills) {
    commands.push({
      name: skill.name,
      description: skill.description,
      type: 'skill',
      skill,
    });
  }
  
  if (!query) return commands;
  
  const lowerQuery = query.toLowerCase();
  return commands.filter(cmd =>
    cmd.name.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery)
  );
}
```

- [ ] **Step 4: Handle skill execution**

```typescript
// In handleKeyDown or command execution
if (selectedCommand.type === 'skill') {
  const skill = selectedCommand.skill;
  setInput('');
  await processCommand(skill.content);
}
```

- [ ] **Step 5: Create bundled skills**

```typescript
// src/skills/bundledSkills.ts
import { Skill } from './types';

export const BUNDLED_SKILLS: Skill[] = [
  {
    name: 'explain-code',
    description: 'Explain how a piece of code works',
    content: 'Explain the following code in detail, including what it does, how it works, and any important patterns or considerations.',
    allowedTools: ['Read'],
    source: 'bundled',
  },
  {
    name: 'refactor',
    description: 'Refactor code for better quality',
    content: 'Refactor the following code to improve readability, maintainability, and performance. Keep the same functionality.',
    allowedTools: ['Read', 'Edit', 'Write'],
    source: 'bundled',
  },
];
```

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/skills/bundledSkills.ts
git commit -m "feat: add skill slash commands and bundled skills"
```

---

## Task 9: Create Plugin Loader

**Files:**
- Create: `src/plugins/pluginLoader.ts`
- Create: `src/plugins/builtinPlugins.ts`
- Create: `src/plugins/index.ts`

- [ ] **Step 1: Create plugin loader**

```typescript
// src/plugins/pluginLoader.ts
import { Plugin, PluginMetadata } from './types';
import { parseSkill } from '../skills/parser';

export async function loadPluginsFromDir(pluginsDir: string): Promise<Plugin[]> {
  try {
    const entries = await invoke('read_dir', { path: pluginsDir }) as any[];
    const plugins: Plugin[] = [];

    for (const entry of entries) {
      if (entry.is_dir) {
        const pluginPath = `${pluginsDir}/${entry.name}`;
        const plugin = await loadPlugin(pluginPath);
        if (plugin) {
          plugins.push(plugin);
        }
      }
    }

    return plugins;
  } catch (error) {
    console.error(`Failed to load plugins from ${pluginsDir}:`, error);
    return [];
  }
}

async function loadPlugin(pluginPath: string): Promise<Plugin | null> {
  try {
    const metadataPath = `${pluginPath}/plugin.json`;
    const metadataStr = await invoke('read_file', { path: metadataPath }) as string;
    const metadata: PluginMetadata = JSON.parse(metadataStr);

    // Load skills
    const skills = await loadPluginSkills(`${pluginPath}/skills`, metadata.name);

    // Load agents (simplified - would need proper agent loading)
    const agents: any[] = [];

    return {
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      skills,
      agents,
      mcpServers: metadata.mcpServers,
      enabled: true,
      source: 'installed',
      path: pluginPath,
    };
  } catch (error) {
    console.error(`Failed to load plugin at ${pluginPath}:`, error);
    return null;
  }
}

async function loadPluginSkills(skillsDir: string, pluginName: string): Promise<any[]> {
  try {
    const entries = await invoke('read_dir', { path: skillsDir }) as any[];
    const skills = [];

    for (const entry of entries) {
      if (entry.is_dir) {
        const skillPath = `${skillsDir}/${entry.name}/SKILL.md`;
        try {
          const content = await invoke('read_file', { path: skillPath }) as string;
          const skill = parseSkill(content, skillPath, 'plugin');
          if (skill) {
            // Namespace skill name with plugin
            skill.name = `${pluginName}:${skill.name}`;
            skills.push(skill);
          }
        } catch {
          // SKILL.md doesn't exist
        }
      }
    }

    return skills;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Create built-in plugins**

```typescript
// src/plugins/builtinPlugins.ts
import { Plugin } from './types';
import { BUNDLED_SKILLS } from '../skills/bundledSkills';
import { BUILT_IN_AGENTS } from '../agents/built-in';

export const BUILTIN_PLUGINS: Plugin[] = [
  {
    name: 'core',
    version: '1.0.0',
    description: 'Core built-in functionality',
    skills: BUNDLED_SKILLS,
    agents: BUILT_IN_AGENTS,
    enabled: true,
    source: 'builtin',
    path: '',
  },
];
```

- [ ] **Step 3: Create index export**

```typescript
// src/plugins/index.ts
export * from './types';
export { loadPluginsFromDir } from './pluginLoader';
export { BUILTIN_PLUGINS } from './builtinPlugins';
```

- [ ] **Step 4: Commit**

```bash
git add src/plugins/
git commit -m "feat: add plugin loader and built-in plugins"
```

---

## Task 10: Final Integration and Testing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Load plugins on startup**

```typescript
useEffect(() => {
  async function initialize() {
    // Load skills
    const projectDir = await invoke('get_cwd') as string;
    const homeDir = await invoke('get_home_dir') as string;
    const loadedSkills = await loadAllSkills(projectDir, homeDir);
    setSkills([...loadedSkills, ...BUNDLED_SKILLS]);

    // Load plugins
    const pluginsDir = `${homeDir}/.claude/plugins`;
    const loadedPlugins = await loadPluginsFromDir(pluginsDir);
    setPlugins([...BUILTIN_PLUGINS, ...loadedPlugins]);

    // Add plugin skills to skills list
    const pluginSkills = loadedPlugins.flatMap(p => p.skills);
    setSkills(prev => [...prev, ...pluginSkills]);
  }

  initialize().catch(console.error);
}, []);
```

- [ ] **Step 2: Add UI for agents/skills**

Add UI components to display:
- Active agents
- Available skills
- Plugin status

- [ ] **Step 3: Run full test suite**

```bash
npm run test
npm run build
```

- [ ] **Step 4: Manual testing**

Test the following scenarios:
1. Agent execution: "Use the Explore agent to find all TypeScript files"
2. Skill execution: "/explain-code src/App.tsx"
3. Plugin loading: Check if plugins load correctly

- [ ] **Step 5: Final commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: complete multi-agent and skills/plugins integration"
```

---

## Summary

This implementation plan covers:

1. **Type definitions** for agents, skills, and plugins
2. **Frontmatter parser** for SKILL.md files
3. **Skill parser and loader** with directory scanning
4. **Built-in agents** (Explore, Plan, General)
5. **Agent registry** for teammate communication
6. **Agent Tool** implementation with runAgent
7. **Integration** into main App
8. **Skill slash commands** with auto-complete
9. **Plugin loader** with metadata parsing
10. **Final integration** and testing

Total estimated time: 2-3 weeks
