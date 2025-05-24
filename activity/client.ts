declare const DiscordSDK: any;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await DiscordSDK.ready();
    const user = await DiscordSDK.commands.getCurrentUser();
    const el = document.getElementById('user-info');
    if (el && user) {
      el.textContent = `Welcome, ${user.username}#${user.discriminator}`;
    }
  } catch (err) {
    console.error('Failed to load Discord SDK:', err);
  }
});
