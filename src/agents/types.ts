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