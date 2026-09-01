const {
  Client,
  GatewayIntentBits,
  Events,
} = require("discord.js");

const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ ${readyClient.user.tag} está conectado.`);
  console.log(`🌐 Servidores: ${readyClient.guilds.cache.size}`);

  const supportGuild =
    readyClient.guilds.cache.get(config.supportGuildId);

  if (!supportGuild) {
    console.error(
      "❌ El bot no está en el servidor de soporte configurado."
    );
    return;
  }

  console.log(
    `🏠 Servidor de soporte: ${supportGuild.name}`
  );

  console.log(
    `💡 Panel de sugerencias: ${config.channels.suggestionsPanel}`
  );

  console.log(
    `🗳️ Canal de sugerencias: ${config.channels.suggestions}`
  );

  console.log(
    `🎫 Panel de tickets: ${config.channels.ticketsPanel}`
  );
});

client.login(process.env.DISCORD_TOKEN);