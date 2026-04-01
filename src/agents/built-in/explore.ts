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
