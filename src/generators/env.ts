export type RedisSecrets = {
  endpoint: string;
  port: number;
  password: string;
  restToken: string;
};

export function generateEnvSnippet(name: string, secrets: RedisSecrets): string {
  const lines = [
    `# Upstash Redis — ${name}`,
    `UPSTASH_REDIS_REST_URL=https://${secrets.endpoint}`,
    `UPSTASH_REDIS_REST_TOKEN=${secrets.restToken}`,
    `REDIS_URL=rediss://default:${secrets.password}@${secrets.endpoint}:${secrets.port}`,
  ];

  return lines.join("\n") + "\n";
}
