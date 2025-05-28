import { Hono } from "hono";
import { discordAuth } from '@hono/oauth-providers/discord';
import { env } from "cloudflare:workers";
import { cors } from "hono/cors";
const app = new Hono<{ Bindings: typeof env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

app.use(
    '/discord',
    discordAuth({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        client_secret: import.meta.env.VITE_DISCORD_CLIENT_SECRET,
        redirect_uri: import.meta.env.VITE_DISCORD_REDIRECT_URI,
        scope: ['identify', 'email', 'guilds'],
    })
)

app.get('/discord', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const grantedScopes = c.get('granted-scopes')
    const user = c.get('user-discord')
  
    return c.json({
      token,
      refreshToken,
      grantedScopes,
      user,
      env: env,
      meta: import.meta.env,
    })
})

app.get('/discord/callback', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const grantedScopes = c.get('granted-scopes')
    const user = c.get('user-discord')
  
    return c.json({
      token,
      refreshToken,
      grantedScopes,
      user,
      env: env,
      meta: import.meta.env,
    })
})

app.use('*', cors({ origin: import.meta.env.VITE_ALLOWED_ORIGINS }))

export default app;
