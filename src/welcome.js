const {
  Events,
} = require("discord.js");

const WELCOME_CHANNEL_ID =
  "1544905730560106527";

module.exports = function setupWelcome(client) {
  client.on(
    Events.GuildMemberAdd,
    async (member) => {
      try {
        // Ignorar bots
        if (member.user.bot) {
          return;
        }

        const channel =
          member.guild.channels.cache.get(
            WELCOME_CHANNEL_ID
          );

        if (!channel) {
          console.error(
            "❌ No se encontró el canal de bienvenida."
          );
          return;
        }

        const memberCount =
          member.guild.memberCount;

        const message =
          `**Bienvenido ${member} <a:reclamar:1544543654583205958>**\n\n` +
          `bienvenido a **${member.guild.name}**, contigo somos **${memberCount}** <:miembros:1545270887241220137>\n\n` +
          `**Canales Importantes**\n\n` +
          `<a:flecha2:1545272010299670530> Tickets <a:ticket:1545272556867686421>\n` +
          `https://discord.com/channels/1544127376387219516/1544167144009375784\n\n` +
          `<a:flecha2:1545272010299670530> FAQ <a:faq:1545274588873883748>\n` +
          `https://discord.com/channels/1544127376387219516/1544166563152920597\n\n` +
          `<a:flecha2:1545272010299670530> Links <a:link:1545274145338818642>\n` +
          `https://discord.com/channels/1544127376387219516/1544166702294630431\n\n` +
          `<a:flecha2:1545272010299670530> Reglas <:reglas:1545272464328757304>\n` +
          `https://discord.com/channels/1544127376387219516/1544166456458092665`;

        await channel.send({
          content: message,
        });

        console.log(
          `👋 Bienvenida enviada para ${member.user.tag}`
        );
      } catch (error) {
        console.error(
          "❌ Error enviando bienvenida:",
          error
        );
      }
    }
  );
};