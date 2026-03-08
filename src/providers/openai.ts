import OpenAI from 'openai';
import type { LLMProvider, Message, ChatOptions, ChatResult, ToolDefinition, ToolCall } from './base.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  async chat(messages: Message[], options: ChatOptions): Promise<ChatResult> {
    const openaiMessages = messages.map(toOpenAIMessage);
    const tools = options.tools?.map(toOpenAITool);

    const maxTokens = options.max_tokens ?? 4096;
    const response = await this.client.chat.completions.create({
      model: options.model,
      temperature: options.temperature,
      max_completion_tokens: maxTokens,
      messages: openaiMessages,
      ...(tools?.length ? { tools } : {}),
    });

    return fromOpenAIResponse(response);
  }
}

function toOpenAIMessage(msg: Message): OpenAI.ChatCompletionMessageParam {
  if (msg.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: msg.tool_call_id ?? '',
      content: msg.content,
    };
  }
  if (msg.role === 'assistant' && msg.tool_calls?.length) {
    return {
      role: 'assistant',
      content: msg.content || null,
      tool_calls: msg.tool_calls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      })),
    };
  }
  return {
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content,
  };
}

function toOpenAITool(tool: ToolDefinition): OpenAI.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  };
}

function fromOpenAIResponse(response: OpenAI.ChatCompletion): ChatResult {
  const choice = response.choices[0];
  const message = choice?.message;

  const toolCalls: ToolCall[] = [];
  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      });
    }
  }

  return {
    content: message?.content ?? '',
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: response.usage ? {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens ?? 0,
    } : undefined,
  };
}
