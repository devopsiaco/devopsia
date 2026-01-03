import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';

export type PromptMode = 'secure' | 'optimized' | 'standard';

type AssistantType = 'cloud' | 'format';
type Cloud = 'aws' | 'azure' | 'gcp' | 'unknown';
type Goal = 'build' | 'migrate' | 'operate' | 'secure' | 'unknown';
type OutputFormat =
  | 'terraform'
  | 'yaml'
  | 'bicep'
  | 'cli'
  | 'runbook'
  | 'rego'
  | 'ci'
  | 'dockerfile'
  | 'compose'
  | 'unknown';
type FormatType =
  | 'terraform'
  | 'kubernetes'
  | 'helm'
  | 'github-actions'
  | 'gitlab-ci'
  | 'docker'
  | 'ansible'
  | 'observability'
  | 'policy';
type Profile = 'secure' | 'optimized' | 'default';

interface RequestContext {
  cloud: Cloud;
  goal: Goal;
  outputFormat: OutputFormat;
  profile: Profile;
}

interface FormatRequestContext {
  format: FormatType;
  outputFormat: OutputFormat;
  profile: Profile;
}

interface FormatArtifact {
  type: string;
  filename: string;
  content: string;
}

const assistantTypeAllowlist: Record<string, AssistantType> = {
  cloud: 'cloud',
  format: 'format'
};

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
  rego: 'rego',
  ci: 'ci',
  dockerfile: 'dockerfile',
  compose: 'compose',
  unknown: 'unknown'
};

const formatAllowlist: Record<string, FormatType> = {
  terraform: 'terraform',
  kubernetes: 'kubernetes',
  helm: 'helm',
  'github-actions': 'github-actions',
  'gitlab-ci': 'gitlab-ci',
  docker: 'docker',
  ansible: 'ansible',
  observability: 'observability',
  policy: 'policy'
};

const profileAllowlist: Record<string, Profile> = {
  secure: 'secure',
  'secure-by-default': 'secure',
  'secure_default': 'secure',
  optimized: 'optimized',
  default: 'default'
};

const profileGuidanceText: Record<Profile, string> = {
  secure: 'Profile SECURE: be conservative, highlight warnings, and avoid risky defaults. Prefer explicit safeguards.',
  optimized: 'Profile OPTIMIZED: keep responses concise, prioritize performance and cost efficiency while maintaining safety.',
  default: 'Profile DEFAULT: provide balanced guidance with practical detail and security-first posture.'
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

function sanitizeFormatContext(rawContext: Partial<Record<keyof FormatRequestContext, unknown>>): FormatRequestContext {
  const formatInput = String(rawContext.format || 'terraform').toLowerCase();
  const outputFormatInput = String(rawContext.outputFormat || 'terraform').toLowerCase();
  const profileInput = String(rawContext.profile || 'secure').toLowerCase();

  const format = formatAllowlist[formatInput] ?? 'terraform';
  const outputFormat = outputFormatAllowlist[outputFormatInput] ?? 'terraform';
  const profile = profileAllowlist[profileInput] ?? 'secure';

  return { format, outputFormat, profile };
}

function sanitizeAssistantType(input: unknown): AssistantType {
  const normalized = String(input || 'cloud').toLowerCase();
  return assistantTypeAllowlist[normalized] ?? 'cloud';
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

  return [basePrompt, cloudGuidance[context.cloud], goalGuidance[context.goal], profileGuidanceText[context.profile]].join('\n');
}

function buildFormatSystemPrompt(context: FormatRequestContext): string {
  const basePrompt = [
    'You are a format-focused automation assistant. Generate paste-ready files with clear filenames, no placeholders, and conservative defaults.',
    'Include a concise validation checklist tailored to the artifact. Call out common hurdles, edge cases, and security-first defaults.',
    'Prefer immutable patterns, avoid secrets in code, and ensure outputs can be applied safely without manual fixes.',
    `Honor the requested output format (${context.outputFormat}) and keep responses compact.`
  ].join('\n');

  const formatGuidance: Record<FormatType, string> = {
    terraform: 'Terraform: use modules, remote state, state locking, IAM least privilege, workspaces, and dependency isolation.',
    kubernetes: 'Kubernetes: include probes, resource requests/limits, RBAC roles/bindings, PodSecurity/NetworkPolicies, and rollout safety.',
    helm: 'Helm: structure values.yaml clearly, use helpers/templates, support overrides, and document default values.',
    'github-actions': 'CI/CD: secure secrets handling, caching, OIDC auth to clouds, environment protections, and artifact integrity.',
    'gitlab-ci': 'CI/CD: secure secrets handling, caching, OIDC auth to clouds, environment protections, and artifact integrity.',
    docker: 'Docker: multi-stage builds, non-root user, minimal base images, pinned versions, and avoid secret baking.',
    ansible: 'Ansible: idempotent tasks, roles with defaults/vars, handlers, and warnings on variable precedence.',
    observability: 'Observability: OTEL pipelines, consistent attributes, sampling strategies, alert noise reduction, and runbooks.',
    policy: 'Policy: Rego/Conftest layout, tests with examples, deny reasons, and reusable policy packages.'
  };

  const formatSpecific = formatGuidance[context.format];

  return [basePrompt, formatSpecific, profileGuidanceText[context.profile]].join('\n');
}

async function applyPromptModePrefix(userPrompt: string, promptMode: PromptMode): Promise<string> {
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

export async function buildPrompt(userPrompt: string, promptMode: PromptMode, context: RequestContext): Promise<{ system: string; user: string; }> {
  const userWithPrefix = await applyPromptModePrefix(userPrompt, promptMode);
  const profile = promptMode === 'secure' ? 'secure' : promptMode === 'optimized' ? 'optimized' : context.profile;
  return { system: buildSystemPrompt({ ...context, profile }), user: userWithPrefix };
}

export async function buildClaudePrompt(userPrompt: string, promptMode: PromptMode, context: RequestContext): Promise<{ system: string; user: string; }> {
  const promptWithPrefix = await buildPrompt(userPrompt, promptMode, context);
  const MAX_LENGTH = 16000; // rough safeguard against token limits
  return { system: promptWithPrefix.system.slice(0, MAX_LENGTH), user: promptWithPrefix.user.slice(0, MAX_LENGTH) };
}

async function buildFormatPrompt(userPrompt: string, promptMode: PromptMode, context: FormatRequestContext): Promise<{ system: string; user: string; }> {
  const userWithPrefix = await applyPromptModePrefix(userPrompt, promptMode);
  const responseShape = [
    'Respond in JSON with keys: summary (string), plan (array of strings), artifacts (array of {type, filename, content}), validation (array of strings), notes (array of strings), text (string fallback narrative).',
    'Do not wrap the JSON in markdown fences. Favor concrete filenames (e.g., Dockerfile, values.yaml, main.tf, policy.rego).',
    'Keep the response concise but complete enough to paste directly into files. Avoid placeholders like <TODO>.',
    'If information is missing, state assumptions in notes and proceed with secure defaults.'
  ].join('\n');

  const system = buildFormatSystemPrompt(context);
  const user = `${responseShape}\n\nUSER REQUEST:\n${userWithPrefix}`;

  const MAX_LENGTH = 16000;
  return { system: system.slice(0, MAX_LENGTH), user: user.slice(0, MAX_LENGTH) };
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value];
  }
  return [];
}

function ensureArtifacts(value: unknown): FormatArtifact[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      type: String(item?.type || '').trim() || 'file',
      filename: String(item?.filename || '').trim() || 'artifact.txt',
      content: String(item?.content || '').trim()
    }))
    .filter((artifact) => Boolean(artifact.content));
}

function normalizeFormatResponse(rawOutput: string): {
  summary: string;
  plan: string[];
  artifacts: FormatArtifact[];
  validation: string[];
  notes: string[];
  text: string;
} {
  try {
    const parsed = JSON.parse(rawOutput);
    return {
      summary: String(parsed.summary || rawOutput),
      plan: ensureStringArray(parsed.plan),
      artifacts: ensureArtifacts(parsed.artifacts),
      validation: ensureStringArray(parsed.validation),
      notes: ensureStringArray(parsed.notes),
      text: String(parsed.text || rawOutput)
    };
  } catch (error) {
    console.warn('Failed to parse format response as JSON, returning raw output.');
  }

  return {
    summary: rawOutput,
    plan: [],
    artifacts: [],
    validation: [],
    notes: [],
    text: rawOutput
  };
}

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const bodyData = event.body ? JSON.parse(event.body) : {};
    const queryMode = event.queryStringParameters?.promptMode;
    const queryAssistantType = event.queryStringParameters?.assistantType;
    const prompt = bodyData.prompt;
    const promptMode: PromptMode = (bodyData.promptMode || queryMode || 'standard') as PromptMode;
    const assistantType: AssistantType = sanitizeAssistantType(bodyData.assistantType || queryAssistantType);
    const requestId = bodyData.requestId || event.requestContext?.requestId || randomUUID();

    const context = sanitizeContext({
      cloud: bodyData.context?.cloud ?? bodyData.metadata?.cloud,
      goal: bodyData.context?.goal ?? bodyData.metadata?.goal,
      outputFormat: bodyData.context?.outputFormat ?? bodyData.metadata?.outputFormat,
      profile: bodyData.context?.profile ?? bodyData.metadata?.profile,
    });

    const formatContext = sanitizeFormatContext({
      format: bodyData.format ?? bodyData.context?.format ?? bodyData.metadata?.format,
      outputFormat: bodyData.outputFormat ?? bodyData.context?.outputFormat ?? bodyData.metadata?.outputFormat,
      profile: bodyData.context?.profile ?? bodyData.metadata?.profile,
    });

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }), headers };
    }

    const fullPrompt =
      assistantType === 'format'
        ? await buildFormatPrompt(prompt, promptMode, formatContext)
        : await buildClaudePrompt(prompt, promptMode, context);

    console.log(`requestId=${requestId} assistantType=${assistantType} promptMode=${promptMode}`);
    console.log(`Context: ${assistantType === 'format' ? JSON.stringify(formatContext) : JSON.stringify(context)}`);
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

    if (assistantType === 'format') {
      const parsed = normalizeFormatResponse(output);
      const responseContext = {
        requestId,
        context: formatContext,
        summary: parsed.summary,
        plan: parsed.plan,
        artifacts: parsed.artifacts,
        validation: parsed.validation,
        notes: parsed.notes,
        text: parsed.text
      };

      return { statusCode: 200, headers, body: JSON.stringify(responseContext) };
    }

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
