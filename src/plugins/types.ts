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