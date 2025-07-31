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

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }), headers };
    }

    const { prompt, promptMode = 'standard' } = JSON.parse(event.body);
    const fullPrompt = await buildPrompt(prompt, promptMode as PromptMode);

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
