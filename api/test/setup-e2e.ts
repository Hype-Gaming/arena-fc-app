process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
// BillingModule reads these at construction time (config.getOrThrow). The whole
// e2e suite now boots AppModule, so provide defaults; the webhook spec overrides
// LASTLINK_WEBHOOK_SECRET with its own value before building the module.
process.env.LASTLINK_WEBHOOK_SECRET =
  process.env.LASTLINK_WEBHOOK_SECRET ?? 'lastlink_e2e_secret';
process.env.PAYT_WEBHOOK_TOKEN = process.env.PAYT_WEBHOOK_TOKEN ?? 'payt_e2e_token';
