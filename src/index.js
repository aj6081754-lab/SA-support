const {
  Client,
  GatewayIntentBits,
  Events,
} = require("discord.js");

const config = require("./config");

const {
  sendSuggestionsPanel,
  handleSuggestionInteraction,
} = require("./suggestions");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==================================================
// BOT LISTO
// ==================================================

client.once(Events.ClientReady, async (readyClient) => {
  console.log(
    `✅ ${readyClient.user.tag} está conectado.`
  );

  console.log(
    `🌐 Servidores: ${readyClient.guilds.cache.size}`
  );

  const supportGuild =
    readyClient.guilds.cache.get(
      config.supportGuildId
    );

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

  // Enviar panel de sugerencias
  try {
    await sendSuggestionsPanel(readyClient);
  } catch (error) {
    console.error(
      "❌ Error enviando el panel de sugerencias:",
      error
    );
  }
});

// ==================================================
// INTERACCIONES
// ==================================================

client.on(
  Events.InteractionCreate,
  async (interaction) => {
    try {
      const handled =
        await handleSuggestionInteraction(
          interaction
        );

      if (handled) {
        return;
      }
    } catch (error) {
      console.error(
        "❌ Error procesando interacción:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Ocurrió un error al procesar esta acción.",
          ephemeral: true,
        });
      }
    }
  }
);

// ==================================================
// LOGIN
// ==================================================

client.login(process.env.DISCORD_TOKEN);