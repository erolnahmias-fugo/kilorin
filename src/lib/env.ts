/** Centralized env access with clear errors when a required var is missing. */
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
function opt(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  supabaseUrl: () => req('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => req('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => req('SUPABASE_SERVICE_ROLE_KEY'),
  cronSecret: () => req('CRON_SECRET'),
  vapidPublic: () => opt('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
  vapidPrivate: () => opt('VAPID_PRIVATE_KEY'),
  vapidSubject: () => opt('VAPID_SUBJECT') ?? 'mailto:admin@kilorin.app',
  anthropicKey: () => opt('ANTHROPIC_API_KEY'),
  coingeckoKey: () => opt('COINGECKO_API_KEY'),
  appUrl: () => opt('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
};
