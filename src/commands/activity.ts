import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, ChannelType } from 'discord.js';
// import { config } from 'dotenv'; // dotenv config usually handled in main.ts or at process start

// config(); // Ensure .env is loaded if not done globally

export const data = new SlashCommandBuilder()
  .setName('activity')
  .setDescription('Starts the Bodega Standings activity in your current voice channel.');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({
      content: 'You need to be in a voice channel to start this activity!',
      ephemeral: true,
    });
    return;
  }

  if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
    await interaction.reply({
      content: 'This activity can only be started in a voice or stage channel.',
      ephemeral: true,
    });
    return;
  }

  try {
    // The target_application_id will be the bot's own client ID.
    // Discord uses the "Activity URL" configured in the Developer Portal for this application.
    const invite = await voiceChannel.createInvite({
      targetType: 2, // 2 corresponds to an EMBEDDED_APPLICATION
      targetApplication: interaction.client.application.id,
      // You can add other invite options here if needed, like maxAge or maxUses
    });

    await interaction.reply({
      content: `Click here to start the Bodega Standings activity in ${voiceChannel.name}: ${invite.url}`,
      ephemeral: true, // Keep it ephemeral or make it public as you prefer
    });
  } catch (error) {
    console.error('Failed to create activity invite:', error);
    await interaction.reply({
      content: 'Sorry, I was unable to start the activity. Please ensure I have permission to create invites in your voice channel.',
      ephemeral: true,
    });
  }
}
