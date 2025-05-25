import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { fetchRoster } from '../utils/api';

type Player = {
  gamertag: string;
  role: string;
};

type RosterData = {
  players: Player[];
};

export default {
  data: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Show team roster')
    .addStringOption(opt =>
      opt.setName('team_name')
         .setDescription('The name of the team')
         .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const team = interaction.options.getString('team_name', true);
    await interaction.deferReply();
    try {
      const data: RosterData = await fetchRoster(team);
      const embed = new EmbedBuilder()
        .setTitle(`${team} Roster`)
        .setColor('Blue');

      data.players.forEach((p) =>
        embed.addFields({ name: p.gamertag, value: p.role, inline: false })
      );

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('⚠️ Team not found.');
    }
  }
};
