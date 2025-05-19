import * as Sentry from "@sentry/node";
import { RewriteFrames } from "@sentry/integrations";

const sentryOptions: Sentry.NodeOptions = {
  dsn: process.env.SENTRY_DISCORD_DSN,
  integrations: [
    new RewriteFrames({
      root: global.__dirname,
    }) as any, // ✅ Acceptable in practice, though a minor type workaround
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
  release: "discord-bot@1.0.0",
};

Sentry.init(sentryOptions);

export default Sentry;
