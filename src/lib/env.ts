const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

export function getEnv(name: string): string | undefined {
  const runtime = typeof process !== 'undefined' ? process.env[name] : undefined;
  const build = (import.meta as ImportMeta).env?.[name] as string | undefined;
  const value = runtime ?? build;
  return value && value.trim() ? value : undefined;
}

export function missingRequiredEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !getEnv(name));
}

export function hasRequiredEnv(): boolean {
  return missingRequiredEnv().length === 0;
}
