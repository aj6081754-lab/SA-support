const {
  Client,
  GatewayIntentBits,
  Events,
} = require("discord.js");

const setupWelcome =
  require("./welcome");

const config = require("./config");

const {
  sendSuggestionsPanel,
  handleSuggestionInteraction,
} = require("./suggestions");

const {
  sendTicketsPanel,
  handleTicketInteraction,
} = require("./tickets");

const {
  startTranscriptServer,
} = require("./transcripts");

const {
  handleMessageCommand,
  handleMessageInteraction,
  handleSendInteraction,
  handleSendAutocomplete,
  handleEditInteraction,
  handleEditAutocomplete,
} = require("./messages");

// ==================================================
// CLIENTE DISCORD
// ==================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==================================================
// SERVIDOR WEB DE TRANSCRIPCIONES
// ==================================================

startTranscriptServer();

// ==================================================
// BOT LISTO
// ==================================================

client.once(
  Events.ClientReady,
  async (readyClient) => {
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

    // ==================================================
    // SUGERENCIAS
    // ==================================================

    console.log(
      `💡 Panel de sugerencias: ${config.channels.suggestionsPanel}`
    );

    console.log(
      `🗳️ Canal de sugerencias: ${config.channels.suggestions}`
    );

    // ==================================================
    // TICKETS
    // ==================================================

    console.log(
      `🎫 Panel de tickets: ${config.channels.ticketsPanel}`
    );

    console.log(
      `📝 Ticket transcripts: ${config.channels.ticketTranscripts}`
    );

    console.log(
      `📋 Ticket logs: ${config.channels.ticketLogs}`
    );

    // ==================================================
    // MESSAGE BUILDER
    // ==================================================

    console.log(
      "💬 Message Builder cargado."
    );

    console.log(
      "📝 Comando disponible: /message"
    );

    // ==================================================
    // ENVIAR PANEL DE SUGERENCIAS
    // ==================================================

    try {
      await sendSuggestionsPanel(
        readyClient
      );
    } catch (error) {
      console.error(
        "❌ Error enviando el panel de sugerencias:",
        error
      );
    }

    // ==================================================
    // ENVIAR PANEL DE TICKETS
    // ==================================================

    try {
      await sendTicketsPanel(
        readyClient
      );
    } catch (error) {
      console.error(
        "❌ Error enviando el panel de tickets:",
        error
      );
    }
  }
);

// ==================================================
// INTERACCIONES
// ==================================================

client.on(
  Events.InteractionCreate,
  async (interaction) => {
    
    try {
      
      // ==================================================
      // AUTOCOMPLETADO DE /EDIT
      // ==================================================

      if (
        interaction.isAutocomplete()
      ) {
        const handled =
          await handleEditAutocomplete(
            interaction
          );

        if (handled) {
          return;
        }
      }

      // ==================================================
      // /EDIT-MESSAGE / /EDIT-EMBED
      // ==================================================
      const editHandled =
        await handleEditInteraction(
          interaction
        );
      if (editHandled) {
        return;
      }
      
      // ==================================================
      // MESSAGE BUILDER
      // ==================================================

      const messageCommandHandled =
        await handleMessageCommand(
          interaction
        );

      if (messageCommandHandled) {
        return;
      }

      const messageInteractionHandled =
        await handleMessageInteraction(
          interaction
        );

      if (messageInteractionHandled) {
        return;
      }

      // ==================================================
      // AUTOCOMPLETADO DE /SEND
      // ==================================================

      if (
        interaction.isAutocomplete()
      ) {
        const handled =
          await handleSendAutocomplete(
            interaction
          );

        if (handled) {
          return;
        }
      }

      // ==================================================
      // /SEND
      // ==================================================

      const sendHandled =
        await handleSendInteraction(
          interaction
        );

      if (sendHandled) {
        return;
      }
      
      // ==================================================
      // SUGERENCIAS
      // ==================================================

      const suggestionHandled =
        await handleSuggestionInteraction(
          interaction
        );

      if (suggestionHandled) {
        return;
      }

      // ==================================================
      // TICKETS
      // ==================================================

      const ticketHandled =
        await handleTicketInteraction(
          interaction
        );

      if (ticketHandled) {
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
        try {
          await interaction.reply({
            content:
              "❌ Ocurrió un error al procesar esta acción.",
            flags: 64,
          });
        } catch (replyError) {
          console.error(
            "❌ No se pudo enviar el mensaje de error:",
            replyError
          );
        }
      }
    }
  }
);

// ==================================================
// LOGIN
// ==================================================

setupWelcome(client);

client.login(
  process.env.DISCORD_TOKEN
);