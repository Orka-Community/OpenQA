/**
 * Environment Variables Configuration Schema
 * Defines all configurable environment variables with metadata
 */

export type EnvVarType = 'text' | 'password' | 'url' | 'number' | 'boolean' | 'select';
export type EnvCategory = 'llm' | 'security' | 'target' | 'github' | 'web' | 'agent' | 'database' | 'notifications';

export interface EnvVariable {
  key: string;
  value?: string;
  type: EnvVarType;
  category: EnvCategory;
  required: boolean;
  description: string;
  placeholder?: string;
  validation?: (value: string) => { valid: boolean; error?: string };
  options?: string[];
  sensitive?: boolean;
  testable?: boolean; // Can we test this value (e.g., API key)?
  restartRequired?: boolean; // Does changing this require restart?
}

export const ENV_VARIABLES: EnvVariable[] = [
  // ============================================================================
  // LLM CONFIGURATION
  // ============================================================================
  {
    key: 'LLM_PROVIDER',
    type: 'select',
    category: 'llm',
    required: true,
    description: 'LLM provider to use for AI operations',
    options: ['openai', 'anthropic', 'ollama'],
    placeholder: 'openai',
    restartRequired: true,
  },
  {
    key: 'OPENAI_API_KEY',
    type: 'password',
    category: 'llm',
    required: false,
    description: 'OpenAI API key (required if LLM_PROVIDER=openai)',
    placeholder: 'sk-...',
    sensitive: true,
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      if (!value.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI API key must start with "sk-"' };
      }
      if (value.length < 20) {
        return { valid: false, error: 'API key seems too short' };
      }
      return { valid: true };
    },
    restartRequired: true,
  },
  {
    key: 'ANTHROPIC_API_KEY',
    type: 'password',
    category: 'llm',
    required: false,
    description: 'Anthropic API key (required if LLM_PROVIDER=anthropic)',
    placeholder: 'sk-ant-...',
    sensitive: true,
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      if (!value.startsWith('sk-ant-')) {
        return { valid: false, error: 'Anthropic API key must start with "sk-ant-"' };
      }
      return { valid: true };
    },
    restartRequired: true,
  },
  {
    key: 'OLLAMA_BASE_URL',
    type: 'url',
    category: 'llm',
    required: false,
    description: 'Ollama server URL (required if LLM_PROVIDER=ollama)',
    placeholder: 'http://localhost:11434',
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      try {
        new URL(value);
        return { valid: true };
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
    },
    restartRequired: true,
  },
  {
    key: 'LLM_MODEL',
    type: 'text',
    category: 'llm',
    required: false,
    description: 'LLM model to use (e.g., gpt-4, claude-3-opus, llama2)',
    placeholder: 'gpt-4',
    restartRequired: true,
  },

  // ============================================================================
  // SECURITY
  // ============================================================================
  {
    key: 'OPENQA_JWT_SECRET',
    type: 'password',
    category: 'security',
    required: true,
    description: 'Secret key for JWT token signing (min 32 characters)',
    placeholder: 'Generate with: openssl rand -hex 32',
    sensitive: true,
    validation: (value) => {
      if (!value) return { valid: false, error: 'JWT secret is required' };
      if (value.length < 32) {
        return { valid: false, error: 'JWT secret must be at least 32 characters' };
      }
      return { valid: true };
    },
    restartRequired: true,
  },
  {
    key: 'OPENQA_AUTH_DISABLED',
    type: 'boolean',
    category: 'security',
    required: false,
    description: '⚠️ DANGER: Disable authentication (NEVER use in production!)',
    placeholder: 'false',
    validation: (value) => {
      if (value === 'true' && process.env.NODE_ENV === 'production') {
        return { valid: false, error: 'Cannot disable auth in production!' };
      }
      return { valid: true };
    },
    restartRequired: true,
  },
  {
    key: 'NODE_ENV',
    type: 'select',
    category: 'security',
    required: false,
    description: 'Node environment (production enables security features)',
    options: ['development', 'production', 'test'],
    placeholder: 'production',
    restartRequired: true,
  },

  // ============================================================================
  // TARGET APPLICATION
  // ============================================================================
  {
    key: 'SAAS_URL',
    type: 'url',
    category: 'target',
    required: false,
    description: 'URL of the application to test (leave empty if using GITHUB_REPO instead)',
    placeholder: 'https://your-app.com',
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: 'URL must use http or https protocol' };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
    },
  },
  {
    key: 'SAAS_AUTH_TYPE',
    type: 'select',
    category: 'target',
    required: false,
    description: 'Authentication type for target application',
    options: ['none', 'basic', 'session'],
    placeholder: 'none',
  },
  {
    key: 'SAAS_USERNAME',
    type: 'text',
    category: 'target',
    required: false,
    description: 'Username for target application authentication',
    placeholder: 'test@example.com',
  },
  {
    key: 'SAAS_PASSWORD',
    type: 'password',
    category: 'target',
    required: false,
    description: 'Password for target application authentication',
    placeholder: '••••••••',
    sensitive: true,
  },

  // ============================================================================
  // GITHUB INTEGRATION
  // ============================================================================
  {
    key: 'GITHUB_TOKEN',
    type: 'password',
    category: 'github',
    required: false,
    description: 'GitHub personal access token for issue creation',
    placeholder: 'ghp_...',
    sensitive: true,
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
        return { valid: false, error: 'GitHub token must start with "ghp_" or "github_pat_"' };
      }
      return { valid: true };
    },
  },
  {
    key: 'GITHUB_OWNER',
    type: 'text',
    category: 'github',
    required: false,
    description: 'GitHub repository owner/organization',
    placeholder: 'your-username',
  },
  {
    key: 'GITHUB_REPO',
    type: 'text',
    category: 'github',
    required: false,
    description: 'GitHub repository — full URL (https://github.com/owner/repo) or short form (owner/repo)',
    placeholder: 'https://github.com/your-org/your-repo',
  },
  {
    key: 'GITHUB_BRANCH',
    type: 'text',
    category: 'github',
    required: false,
    description: 'GitHub branch to monitor',
    placeholder: 'main',
  },

  // ============================================================================
  // WEB SERVER
  // ============================================================================
  {
    key: 'WEB_PORT',
    type: 'number',
    category: 'web',
    required: false,
    description: 'Port for web server',
    placeholder: '4242',
    validation: (value) => {
      if (!value) return { valid: true };
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { valid: false, error: 'Port must be between 1 and 65535' };
      }
      return { valid: true };
    },
    restartRequired: true,
  },
  {
    key: 'WEB_HOST',
    type: 'text',
    category: 'web',
    required: false,
    description: 'Host to bind web server (0.0.0.0 for all interfaces)',
    placeholder: '0.0.0.0',
    restartRequired: true,
  },
  {
    key: 'CORS_ORIGINS',
    type: 'text',
    category: 'web',
    required: false,
    description: 'Allowed CORS origins (comma-separated)',
    placeholder: 'https://your-domain.com,https://app.example.com',
    restartRequired: true,
  },

  // ============================================================================
  // AGENT CONFIGURATION
  // ============================================================================
  {
    key: 'AGENT_AUTO_START',
    type: 'boolean',
    category: 'agent',
    required: false,
    description: 'Auto-start agent on server launch',
    placeholder: 'false',
  },
  {
    key: 'AGENT_INTERVAL_MS',
    type: 'number',
    category: 'agent',
    required: false,
    description: 'Agent run interval in milliseconds (1 hour = 3600000)',
    placeholder: '3600000',
    validation: (value) => {
      if (!value) return { valid: true };
      const interval = parseInt(value, 10);
      if (isNaN(interval) || interval < 60000) {
        return { valid: false, error: 'Interval must be at least 60000ms (1 minute)' };
      }
      return { valid: true };
    },
  },
  {
    key: 'AGENT_MAX_ITERATIONS',
    type: 'number',
    category: 'agent',
    required: false,
    description: 'Maximum iterations per agent session',
    placeholder: '20',
    validation: (value) => {
      if (!value) return { valid: true };
      const max = parseInt(value, 10);
      if (isNaN(max) || max < 1 || max > 1000) {
        return { valid: false, error: 'Max iterations must be between 1 and 1000' };
      }
      return { valid: true };
    },
  },
  {
    key: 'GIT_LISTENER_ENABLED',
    type: 'boolean',
    category: 'agent',
    required: false,
    description: 'Enable git merge/pipeline detection',
    placeholder: 'true',
  },
  {
    key: 'GIT_POLL_INTERVAL_MS',
    type: 'number',
    category: 'agent',
    required: false,
    description: 'Git polling interval in milliseconds',
    placeholder: '60000',
  },

  // ============================================================================
  // DATABASE
  // ============================================================================
  {
    key: 'DB_PATH',
    type: 'text',
    category: 'database',
    required: false,
    description: 'Path to the JSON database file (LowDB). All data is stored here — must be inside the Docker volume.',
    placeholder: '/app/data/openqa.json',
    restartRequired: true,
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  {
    key: 'SLACK_WEBHOOK_URL',
    type: 'url',
    category: 'notifications',
    required: false,
    description: 'Slack webhook URL for notifications',
    placeholder: 'https://hooks.slack.com/services/...',
    sensitive: true,
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      if (!value.startsWith('https://hooks.slack.com/')) {
        return { valid: false, error: 'Invalid Slack webhook URL' };
      }
      return { valid: true };
    },
  },
  {
    key: 'DISCORD_WEBHOOK_URL',
    type: 'url',
    category: 'notifications',
    required: false,
    description: 'Discord webhook URL for notifications',
    placeholder: 'https://discord.com/api/webhooks/...',
    sensitive: true,
    testable: true,
    validation: (value) => {
      if (!value) return { valid: true };
      if (!value.startsWith('https://discord.com/api/webhooks/')) {
        return { valid: false, error: 'Invalid Discord webhook URL' };
      }
      return { valid: true };
    },
  },
];

export function getEnvVariablesByCategory(category: EnvCategory): EnvVariable[] {
  return ENV_VARIABLES.filter(v => v.category === category);
}

export function getEnvVariable(key: string): EnvVariable | undefined {
  return ENV_VARIABLES.find(v => v.key === key);
}

export function validateEnvValue(key: string, value: string): { valid: boolean; error?: string } {
  const envVar = getEnvVariable(key);
  if (!envVar) return { valid: false, error: 'Unknown environment variable' };
  
  if (envVar.required && !value) {
    return { valid: false, error: 'This field is required' };
  }
  
  if (envVar.validation) {
    return envVar.validation(value);
  }
  
  return { valid: true };
}
