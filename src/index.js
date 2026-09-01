const {
  Client,
  GatewayIntentBits,
  Events,
} = require("discord.js");

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
});

client.login(process.env.DISCORD_TOKEN);