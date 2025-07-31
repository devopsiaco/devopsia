import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

export type PromptMode = 'secure' | 'optimized' | 'standard';

export async function buildPrompt(userPrompt: string, promptMode: PromptMode): Promise<string> {
  if (promptMode === 'secure') {
    const prefixPath = path.join(__dirname, '../prompts/prefixes/secure_instructions.md');
    const prefix = await fs.readFile(prefixPath, 'utf8');
    return `${prefix}\n\n${userPrompt}`;
  }

  if (promptMode === 'optimized') {
    const prefix = '[OPTIMIZATION INSTRUCTIONS – Output should be minimal, performant, and cost-aware]';
    return `${prefix}\n\n${userPrompt}`;
  }

  return userPrompt;
}

export async function buildClaudePrompt(userPrompt: string, promptMode: PromptMode): Promise<string> {
  const promptWithPrefix = await buildPrompt(userPrompt, promptMode);
  const MAX_LENGTH = 16000; // rough safeguard against token limits
  return promptWithPrefix.slice(0, MAX_LENGTH);
}

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const bodyData = event.body ? JSON.parse(event.body) : {};
    const queryMode = event.queryStringParameters?.promptMode;
    const prompt = bodyData.prompt;
    const promptMode: PromptMode = (bodyData.promptMode || queryMode || 'standard') as PromptMode;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }), headers };
    }

    const fullPrompt = await buildClaudePrompt(prompt, promptMode);
    console.log(`Mode: ${promptMode}, prompt preview: ${fullPrompt.slice(0, 100)}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: fullPrompt }]
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const data = await response.json();
    const output = data?.content || '';

    return { statusCode: 200, headers, body: JSON.stringify({ output }) };
  } catch (error) {
    console.error('Claude generation error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Generation failed' }) };
  }
};
