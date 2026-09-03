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

const builders = new Map();

function createMessageBuilder() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("MESSAGE BUILDER")
    .setDescription(
      "**Contenido**\n> Sin contenido\n\n" +
      "**Vista previa**\n" +
      "```text\nSin contenido\n```"
    );
}

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

const messageCommand = new SlashCommandBuilder()
  .setName("message")
  .setDescription("Abre el constructor de mensajes.")
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages.toString()
  );

async function handleMessageCommand(interaction) {
  if (!interaction.isChatInputCommand()) return false;

  if (interaction.commandName !== "message") {
    return false;
  }

  builders.set(interaction.user.id, {
    content: "",
  });

  await interaction.reply({
    embeds: [createMessageBuilder()],
    components: [createBuilderButtons()],
    flags: MessageFlags.Ephemeral,
  });

  return true;
}

async function handleMessageInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isModalSubmit()) {
    return false;
  }

  if (
    interaction.customId !== "message_edit_content" &&
    interaction.customId !== "message_save" &&
    interaction.customId !== "message_cancel" &&
    interaction.customId !== "message_content_modal"
  ) {
    return false;
  }

  const builder = builders.get(interaction.user.id);

  if (!builder) {
    await interaction.reply({
      content: "❌ Este constructor ya no está disponible.",
      flags: MessageFlags.Ephemeral,
    });

    return true;
  }

  if (interaction.customId === "message_edit_content") {
    const modal = new ModalBuilder()
      .setCustomId("message_content_modal")
      .setTitle("Editar contenido");

    const contentInput = new TextInputBuilder()
      .setCustomId("message_content")
      .setLabel("Contenido")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder("Escribe el contenido del mensaje...")
      .setValue(builder.content || "");

    modal.addComponents(
      new ActionRowBuilder().addComponents(contentInput)
    );

    await interaction.showModal(modal);

    return true;
  }

  if (interaction.customId === "message_content_modal") {
    builder.content =
      interaction.fields.getTextInputValue("message_content");

    const preview =
      builder.content.trim() || "Sin contenido";

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("MESSAGE BUILDER")
      .setDescription(
        `**Contenido**\n> ${
          builder.content.trim() || "Sin contenido"
        }\n\n` +
        `**Vista previa**\n` +
        "```text\n" +
        preview +
        "\n```"
      );

    await interaction.update({
      embeds: [embed],
      components: [createBuilderButtons()],
    });

    return true;
  }

  if (interaction.customId === "message_save") {
    const modal = new ModalBuilder()
      .setCustomId("message_name_modal")
      .setTitle("Guardar mensaje");

    const nameInput = new TextInputBuilder()
      .setCustomId("message_name")
      .setLabel("Nombre del mensaje")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder("Ej: bienvenida");

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput)
    );

    await interaction.showModal(modal);

    return true;
  }

  if (interaction.customId === "message_cancel") {
    builders.delete(interaction.user.id);

    await interaction.update({
      embeds: [],
      components: [],
      content: "❌ Constructor cancelado.",
    });

    return true;
  }

  return true;
}

module.exports = {
  messageCommand,
  handleMessageCommand,
  handleMessageInteraction,
};