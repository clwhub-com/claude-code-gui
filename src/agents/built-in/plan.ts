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
