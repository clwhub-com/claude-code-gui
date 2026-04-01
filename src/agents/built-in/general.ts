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
