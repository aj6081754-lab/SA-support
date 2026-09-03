const {
  REST,
  Routes,
} = require("discord.js");

const {
  messageCommand,
  embedCommand,
} = require("./messages");

const commands = [
  messageCommand.toJSON(),
  embedCommand.toJSON(),
];

const rest = new REST({
  version: "10",
}).setToken(
  process.env.DISCORD_TOKEN
);

async function deployCommands() {
  try {
    console.log("🔄 Registrando comandos...");

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
  } catch (error) {
    console.error(
      "❌ Error registrando comandos:",
      error
    );
  }
}

deployCommands();