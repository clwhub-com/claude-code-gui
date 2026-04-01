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
