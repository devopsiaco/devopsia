import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';

export type PromptMode = 'secure' | 'optimized' | 'standard';

type Cloud = 'aws' | 'azure' | 'gcp' | 'unknown';
type Goal = 'build' | 'migrate' | 'operate' | 'secure' | 'unknown';
type OutputFormat = 'terraform' | 'yaml' | 'bicep' | 'cli' | 'runbook' | 'unknown';
type Profile = 'secure' | 'optimized' | 'default';

interface RequestContext {
  cloud: Cloud;
  goal: Goal;
  outputFormat: OutputFormat;
  profile: Profile;
}

const cloudAllowlist: Record<string, Cloud> = {
  aws: 'aws',
  azure: 'azure',
  gcp: 'gcp',
  unknown: 'unknown'
};

const goalAllowlist: Record<string, Goal> = {
  build: 'build',
  migrate: 'migrate',
  operate: 'operate',
  secure: 'secure',
  unknown: 'unknown'
};

const outputFormatAllowlist: Record<string, OutputFormat> = {
  terraform: 'terraform',
  yaml: 'yaml',
  bicep: 'bicep',
  cli: 'cli',
  runbook: 'runbook',
  unknown: 'unknown'
};

const profileAllowlist: Record<string, Profile> = {
  secure: 'secure',
  'secure-by-default': 'secure',
  'secure_default': 'secure',
  optimized: 'optimized',
  default: 'default'
};

function sanitizeContext(rawContext: Partial<Record<keyof RequestContext, unknown>>): RequestContext {
  const cloudInput = String(rawContext.cloud || 'unknown').toLowerCase();
  const goalInput = String(rawContext.goal || 'build').toLowerCase();
  const outputFormatInput = String(rawContext.outputFormat || 'terraform').toLowerCase();
  const profileInput = String(rawContext.profile || 'secure').toLowerCase();

  const cloud = cloudAllowlist[cloudInput] ?? 'unknown';
  const goal = goalAllowlist[goalInput] ?? 'build';
  const outputFormat = outputFormatAllowlist[outputFormatInput] ?? 'terraform';
  const profile = profileAllowlist[profileInput] ?? 'secure';

  return { cloud, goal, outputFormat, profile };
}

function buildSystemPrompt(context: RequestContext): string {
  const basePrompt = `You are a cloud infrastructure assistant. Ask clarifying questions only when absolutely required; otherwise proceed with reasonable, secure defaults. Always prioritize least privilege, encryption in transit and at rest, logging/monitoring, and align outputs to the requested format (${context.outputFormat}).`;

  const cloudGuidance: Record<Cloud, string> = {
    aws: 'For AWS, emphasize IAM role policies, VPC segmentation, CloudWatch/CloudTrail logging, and account/organization patterns.',
    azure: 'For Azure, emphasize Entra ID/RBAC, VNet design, Azure Monitor/Log Analytics, and subscription/resource group scoping.',
    gcp: 'For GCP, emphasize IAM roles, VPC design, Cloud Logging/Monitoring, and project/folder organization.',
    unknown: 'When cloud is unspecified, provide multi-cloud friendly guidance with portable patterns.'
  };

  const goalGuidance: Record<Goal, string> = {
    build: 'Goal is BUILD: create a baseline architecture blueprint and matching infrastructure-as-code with secure defaults.',
    migrate: 'Goal is MIGRATE: produce a migration plan, target architecture, cutover checklist, and explicit risks/mitigations.',
    operate: 'Goal is OPERATE: provide runbooks, monitoring dashboards, troubleshooting steps, and SLO/SLA hints.',
    secure: 'Goal is SECURE: deliver hardening guidance, policy snippets, and least privilege enforcement.',
    unknown: 'If goal is unclear, provide a concise blueprint with secure defaults and call out assumptions.'
  };

  const profileGuidance: Record<Profile, string> = {
    secure: 'Profile SECURE: be conservative, highlight warnings, and avoid risky defaults. Prefer explicit safeguards.',
    optimized: 'Profile OPTIMIZED: keep responses concise, prioritize performance and cost efficiency while maintaining safety.',
    default: 'Profile DEFAULT: provide balanced guidance with practical detail and security-first posture.'
  };

  return [basePrompt, cloudGuidance[context.cloud], goalGuidance[context.goal], profileGuidance[context.profile]].join('\n');
}

export async function buildPrompt(userPrompt: string, promptMode: PromptMode, context: RequestContext): Promise<{ system: string; user: string; }> {
  if (promptMode === 'secure') {
    const prefixPath = path.join(__dirname, '../prompts/prefixes/secure_instructions.md');
    const prefix = await fs.readFile(prefixPath, 'utf8');
    return { system: buildSystemPrompt({ ...context, profile: 'secure' }), user: `${prefix}\n\n${userPrompt}` };
  }

  if (promptMode === 'optimized') {
    const prefix = '[OPTIMIZATION INSTRUCTIONS – Output should be minimal, performant, and cost-aware]';
    return { system: buildSystemPrompt({ ...context, profile: 'optimized' }), user: `${prefix}\n\n${userPrompt}` };
  }

  return { system: buildSystemPrompt(context), user: userPrompt };
}

export async function buildClaudePrompt(userPrompt: string, promptMode: PromptMode, context: RequestContext): Promise<{ system: string; user: string; }> {
  const promptWithPrefix = await buildPrompt(userPrompt, promptMode, context);
  const MAX_LENGTH = 16000; // rough safeguard against token limits
  return { system: promptWithPrefix.system.slice(0, MAX_LENGTH), user: promptWithPrefix.user.slice(0, MAX_LENGTH) };
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
    const requestId = bodyData.requestId || event.requestContext?.requestId || randomUUID();
    const context = sanitizeContext({
      cloud: bodyData.context?.cloud ?? bodyData.metadata?.cloud,
      goal: bodyData.context?.goal ?? bodyData.metadata?.goal,
      outputFormat: bodyData.context?.outputFormat ?? bodyData.metadata?.outputFormat,
      profile: bodyData.context?.profile ?? bodyData.metadata?.profile,
    });

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }), headers };
    }

    const fullPrompt = await buildClaudePrompt(prompt, promptMode, context);
    console.log(`requestId=${requestId} context=${JSON.stringify(context)} promptMode=${promptMode}`);
    console.log(`Prompt preview: ${fullPrompt.user.slice(0, 100)}`);

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
        messages: [
          { role: 'system', content: fullPrompt.system },
          { role: 'user', content: fullPrompt.user }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const data = await response.json();
    const output = Array.isArray(data?.content)
      ? data.content.map((chunk: any) => chunk?.text || '').join('\n')
      : data?.content || '';

    const responseContext = {
      requestId,
      context,
      summary: output,
      plan: '',
      artifacts: [],
      validation: [],
      notes: [],
      text: output,
      output
    };

    return { statusCode: 200, headers, body: JSON.stringify(responseContext) };
  } catch (error) {
    console.error('Claude generation error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Generation failed' }) };
  }
};
