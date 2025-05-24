import { DiscordSDK } from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(process.env.CLIENT_ID!);

window.addEventListener('DOMContentLoaded', async () => {
  await discordSdk.ready();
  const button = document.getElementById('open-link');
  if (button) {
    button.addEventListener('click', () => {
      discordSdk.commands.openExternalLink({
        url: "https://docker-image-production-6e4e.up.railway.app/category/news"
      });
    });
  }
});
