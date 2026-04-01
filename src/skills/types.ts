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