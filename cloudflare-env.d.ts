interface CloudflareEnv {
  DB: D1Database;
  /** The PIN you type to log in. Set with: npx wrangler secret put APP_PIN */
  APP_PIN: string;
  /** Long random string used to sign the login cookie. npx wrangler secret put AUTH_SECRET */
  AUTH_SECRET: string;
  ASSETS: Fetcher;
}
