const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const Database = require("better-sqlite3");

// ==================================================
// BASE DE DATOS
// ==================================================

const db = new Database("/data/staff-support.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS saved_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(guild_id, name)
  )
`).run();

// ==================================================
// BUILDERS ACTIVOS
// ==================================================

const builders = new Map();

// ==================================================
// CREAR VISTA DEL BUILDER
// ==================================================

function createMessageBuilder(content = "") {
  const preview = content.trim() || "Sin contenido";

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("MESSAGE BUILDER")
    .setDescription(
      "**Contenido**\n" +
        `> ${content.trim() || "Sin contenido"}\n\n` +
        "**Vista previa**\n" +
        "```text\n" +
        preview +
        "\n```"
    );
}

// ==================================================
// BOTONES DEL BUILDER
// ==================================================

function createBuilderButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("message_edit_content")
      .setLabel("Editar contenido")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("message_save")
      .setLabel("Guardar")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("message_cancel")
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger)
  );
}

// ==================================================
// COMANDO /MESSAGE
// ==================================================

const messageCommand = new SlashCommandBuilder()
  .setName("message")
  .setDescription("Abre el constructor de mensajes.")
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages.toString()
  );

// ==================================================
// EJECUTAR /MESSAGE
// ==================================================

async function handleMessageCommand(interaction) {
  if (!interaction.isChatInputCommand()) {
    return false;
  }

  if (interaction.commandName !== "message") {
    return false;
  }

  builders.set(interaction.user.id, {
    guildId: interaction.guildId,
    content: "",
  });

  await interaction.reply({
    embeds: [
      createMessageBuilder(),
    ],
    components: [
      createBuilderButtons(),
    ],
  });

  return true;
}

// ==================================================
// INTERACCIONES DEL BUILDER
// ==================================================

async function handleMessageInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isModalSubmit()) {
    return false;
  }

  const validIds = [
    "message_edit_content",
    "message_save",
    "message_cancel",
    "message_content_modal",
    "message_name_modal",
  ];

  if (!validIds.includes(interaction.customId)) {
    return false;
  }

  const builder = builders.get(interaction.user.id);

  if (!builder) {
    await interaction.reply({
      content:
        "❌ Este constructor ya no está disponible.",
      flags: MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // EDITAR CONTENIDO
  // ==================================================

  if (
    interaction.customId ===
    "message_edit_content"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("message_content_modal")
      .setTitle("Editar contenido");

    const contentInput =
      new TextInputBuilder()
        .setCustomId("message_content")
        .setLabel("Contenido")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder(
          "Escribe el contenido del mensaje..."
        )
        .setValue(
          builder.content || ""
        )
        .setMaxLength(4000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        contentInput
      )
    );

    await interaction.showModal(modal);

    return true;
  }

  // ==================================================
  // GUARDAR CONTENIDO DEL MODAL
  // ==================================================

  if (
    interaction.customId ===
    "message_content_modal"
  ) {
    builder.content =
      interaction.fields.getTextInputValue(
        "message_content"
      );

    await interaction.update({
      embeds: [
        createMessageBuilder(
          builder.content
        ),
      ],
      components: [
        createBuilderButtons(),
      ],
    });

    return true;
  }

  // ==================================================
  // ABRIR MODAL PARA NOMBRE
  // ==================================================

  if (
    interaction.customId ===
    "message_save"
  ) {
    if (!builder.content.trim()) {
      await interaction.reply({
        content:
          "❌ No puedes guardar un mensaje vacío.",
        flags: MessageFlags.Ephemeral,
      });

      return true;
    }

    const modal = new ModalBuilder()
      .setCustomId("message_name_modal")
      .setTitle("Guardar mensaje");

    const nameInput =
      new TextInputBuilder()
        .setCustomId("message_name")
        .setLabel("Nombre del mensaje")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder(
          "Ej: bienvenida"
        );

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        nameInput
      )
    );

    await interaction.showModal(modal);

    return true;
  }

  // ==================================================
  // GUARDAR EN BASE DE DATOS
  // ==================================================

  if (
    interaction.customId ===
    "message_name_modal"
  ) {
    const name =
      interaction.fields
        .getTextInputValue(
          "message_name"
        )
        .trim();

    if (!name) {
      await interaction.reply({
        content:
          "❌ Debes introducir un nombre.",
        flags: MessageFlags.Ephemeral,
      });

      return true;
    }

    const now = Date.now();

    try {
      const existing =
        db.prepare(`
          SELECT id
          FROM saved_messages
          WHERE guild_id = ?
          AND name = ?
        `).get(
          builder.guildId,
          name
        );

      if (existing) {
        await interaction.reply({
          content:
            `❌ Ya existe un mensaje guardado con el nombre \`${name}\`.`,
          flags: MessageFlags.Ephemeral,
        });

        return true;
      }

      db.prepare(`
        INSERT INTO saved_messages (
          guild_id,
          user_id,
          name,
          content,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        builder.guildId,
        interaction.user.id,
        name,
        builder.content,
        now,
        now
      );

      builders.delete(
        interaction.user.id
      );

      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("MESSAGE BUILDER")
            .setDescription(
              `**Mensaje guardado correctamente.**\n\n` +
                `**Nombre:** \`${name}\`\n\n` +
                `El mensaje está listo para utilizarse con \`/send\`.`
            ),
        ],
        components: [],
      });

      console.log(
        `💾 Mensaje guardado: ${name} | Servidor: ${builder.guildId} | Usuario: ${interaction.user.tag}`
      );

      return true;
    } catch (error) {
      console.error(
        "❌ Error guardando mensaje:",
        error
      );

      await interaction.reply({
        content:
          "❌ Ocurrió un error al guardar el mensaje.",
        flags: MessageFlags.Ephemeral,
      });

      return true;
    }
  }

  // ==================================================
  // CANCELAR
  // ==================================================

  if (
    interaction.customId ===
    "message_cancel"
  ) {
    builders.delete(
      interaction.user.id
    );

    await interaction.update({
      embeds: [],
      components: [],
      content:
        "❌ Constructor cancelado.",
    });

    return true;
  }

  return true;
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  messageCommand,
  handleMessageCommand,
  handleMessageInteraction,
};