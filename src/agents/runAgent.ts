import Anthropic from '@anthropic-ai/sdk';
import { AgentDefinition } from './types';

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
