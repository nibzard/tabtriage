import { z } from 'zod';

/**
 * Environment schema with validation
 */
const envSchema = z.object({
  // App Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database Configuration
  DATABASE_MODE: z.enum(['local', 'turso']).default('local'),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  
  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  JINA_API_KEY: z.string().optional(),
  JINA_API_URL: z.string().url().default('https://api.jina.ai/v1/embeddings'),
  
  // File Upload
  UPLOADTHING_TOKEN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(['uploadthing', 'local']).default('uploadthing'),
});

/**
 * Environment-specific validation rules
 */
const environmentValidation = {
  turso: (env: any) => {
    if (env.DATABASE_MODE === 'turso') {
      if (!env.TURSO_DATABASE_URL) {
        throw new Error('TURSO_DATABASE_URL is required when DATABASE_MODE=turso');
      }
      if (!env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_AUTH_TOKEN is required when DATABASE_MODE=turso');
      }
    }
  },
  
  production: (env: any) => {
    if (env.NODE_ENV === 'production') {
      if (!env.OPENAI_API_KEY) {
        console.warn('⚠️  OPENAI_API_KEY not set in production');
      }
      if (!env.UPLOADTHING_TOKEN) {
        console.warn('⚠️  UPLOADTHING_TOKEN not set in production');
      }
    }
  }
};

/**
 * Parse and validate environment variables
 */
function parseEnv() {
  try {
    // Parse basic schema
    const parsed = envSchema.parse(process.env);
    
    // Run environment-specific validations
    environmentValidation.turso(parsed);
    environmentValidation.production(parsed);
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
}

/**
 * Validated environment variables
 */
export const env = parseEnv();

/**
 * Environment helper functions
 */
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const isLocalDatabase = env.DATABASE_MODE === 'local';
export const isTursoDatabase = env.DATABASE_MODE === 'turso';

/**
 * Database configuration getter
 */
export function getDatabaseConfig() {
  if (env.DATABASE_MODE === 'turso') {
    return {
      mode: 'turso' as const,
      url: env.TURSO_DATABASE_URL!,
      authToken: env.TURSO_AUTH_TOKEN!,
    };
  }
  
  return {
    mode: 'local' as const,
    url: 'file:local.db',
    authToken: undefined,
  };
}

/**
 * Environment validation summary for debugging
 */
export function getEnvironmentSummary() {
  const dbConfig = getDatabaseConfig();
  
  return {
    environment: env.NODE_ENV,
    database: {
      mode: dbConfig.mode,
      url: dbConfig.mode === 'turso' ? dbConfig.url : 'local.db',
      hasAuthToken: dbConfig.mode === 'turso' && !!dbConfig.authToken,
    },
    services: {
      openai: !!env.OPENAI_API_KEY,
      jina: !!env.JINA_API_KEY,
      uploadthing: !!env.UPLOADTHING_TOKEN,
    },
    auth: {
      nextauth: !!env.NEXTAUTH_SECRET,
      url: env.NEXTAUTH_URL,
    },
  };
}