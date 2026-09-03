const {
  REST,
  Routes,
} = require("discord.js");

const {
  messageCommand,
  embedCommand,
  sendCommand,
  editMessageCommand,
  editEmbedCommand,
} = require("./messages");

// ==================================================
// COMANDOS
// ==================================================

const commands = [
  messageCommand.toJSON(),
  embedCommand.toJSON(),
  sendCommand.toJSON(),
  editMessageCommand.toJSON(),
  editEmbedCommand.toJSON(),
];

// ==================================================
// REST
// ==================================================

const rest = new REST({
  version: "10",
}).setToken(
  process.env.DISCORD_TOKEN
);

// ==================================================
// REGISTRAR COMANDOS
// ==================================================

async function deployCommands() {
  try {
    console.log(
      "🔄 Registrando comandos..."
    );

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands,
      }
    );

    console.log(
      "✅ Comandos registrados correctamente."
    );

    console.log(
      "📋 Comandos registrados:"
    );

    console.log(
      "   /message"
    );

    console.log(
      "   /embed"
    );

    console.log(
      "   /send"
    );

    console.log(
      "   /edit-message"
    );
    console.log(
      "   /edit-embed"
    );
    
  } catch (error) {
    console.error(
      "❌ Error registrando comandos:",
      error
    );
  }
}

deployCommands();