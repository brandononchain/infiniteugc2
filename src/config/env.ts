import dotenv from "dotenv";

dotenv.config();

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvVarOptional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  supabaseUrl: getEnvVar("SUPABASE_URL"),
  supabaseAnonKey: getEnvVar("SUPABASE_ANON_KEY"),
  supabaseServiceKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  elevenLabsApiKey: getEnvVarOptional("ELEVENLABS_API_KEY", ""),
  internalBridgeSecret: getEnvVar("INTERNAL_BRIDGE_SECRET"),
  port: parseInt(getEnvVarOptional("PORT", "3000"), 10),
  corsOrigin: getEnvVarOptional("CORS_ORIGIN", "http://localhost:3000"),
  corsOrigins: getEnvVarOptional("CORS_ORIGIN", "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  geminiApiKey: getEnvVarOptional("GEMINI_API_KEY", ""),
  awsAccessKeyId: getEnvVarOptional("AWS_ACCESS_KEY_ID", ""),
  awsSecretAccessKey: getEnvVarOptional("AWS_SECRET_ACCESS_KEY", ""),
  awsRegion: getEnvVarOptional("AWS_REGION", "us-east-1"),
  awsSqsQueueUrl: getEnvVarOptional("AWS_SQS_QUEUE_URL", ""),
  backendUrl: getEnvVarOptional("BACKEND_URL", "http://localhost:4000"),
  byteplusAccessKeyId: getEnvVarOptional("BYTEPLUS_ACCESS_KEY_ID", ""),
  byteplusSecretAccessKey: getEnvVarOptional("BYTEPLUS_SECRET_ACCESS_KEY", ""),
};
