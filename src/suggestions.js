const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("./config");
// ==================================================
// PANEL DE SUGERENCIAS
// ==================================================
async function sendSuggestionsPanel(client) {
  const channel = await client.channels.fetch(
    config.channels.suggestionsPanel
  );
  if (!channel) {
    console.error(
      "❌ No se encontró el canal del panel de sugerencias."
    );
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle(`${config.emojis.suggestion} Sugerencias`)
    .setDescription(
      "¿Tienes una idea para mejorar Staff Analytics?\n\n" +
      "Presiona el botón de abajo para enviar tu sugerencia."
    )
    .setFooter({
      text: "Staff Support • Sistema de sugerencias",
    });
  const button = new ButtonBuilder()
    .setCustomId("suggestion_create")
    .setLabel("Enviar sugerencia")
    .setEmoji(config.emojis.suggestion)
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder().addComponents(button);
  await channel.send({
    embeds: [embed],
    components: [row],
  });
  console.log("✅ Panel de sugerencias enviado.");
}
// ==================================================
// MODAL DE SUGERENCIA
// ==================================================
async function showSuggestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("suggestion_modal")
    .setTitle("Nueva sugerencia");
  const input = new TextInputBuilder()
    .setCustomId("suggestion_text")
    .setLabel("¿Cuál es tu sugerencia?")
    .setPlaceholder(
      "Escribe aquí tu idea para mejorar Staff Analytics..."
    )
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(5)
    .setMaxLength(1000);
  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);
  await interaction.showModal(modal);
}
// ==================================================
// CREAR SUGERENCIA
// ==================================================
async function createSuggestion(interaction) {
  const suggestion =
    interaction.fields.getTextInputValue(
      "suggestion_text"
    );
  const channel = await interaction.client.channels.fetch(
    config.channels.suggestions
  );
  if (!channel) {
    await interaction.reply({
      content:
        "❌ No se encontró el canal de sugerencias.",
      ephemeral: true,
    });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle(
      `${config.emojis.suggestion} Nueva sugerencia`
    )
    .setDescription(suggestion)
    .addFields({
      name: "👤 Usuario",
      value: `<@${interaction.user.id}>`,
      inline: true,
    })
    .setFooter({
      text: "Staff Analytics • Sugerencia pendiente",
    })
    .setTimestamp();
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("suggestion_like")
      .setEmoji(config.emojis.like)
      .setLabel("0")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("suggestion_dislike")
      .setEmoji(config.emojis.dislike)
      .setLabel("0")
      .setStyle(ButtonStyle.Secondary)
  );
  await channel.send({
    embeds: [embed],
    components: [buttons],
  });
  await interaction.reply({
    content:
      "✅ Tu sugerencia fue enviada correctamente.",
    ephemeral: true,
  });
  console.log(
    `💡 Nueva sugerencia de ${interaction.user.tag}`
  );
}
// ==================================================
// MANEJAR INTERACCIONES
// ==================================================
async function handleSuggestionInteraction(interaction) {
  if (
    interaction.isButton() &&
    interaction.customId === "suggestion_create"
  ) {
    await showSuggestionModal(interaction);
    return true;
  }
  if (
    interaction.isModalSubmit() &&
    interaction.customId === "suggestion_modal"
  ) {
    await createSuggestion(interaction);
    return true;
  }
  return false;
}
module.exports = {
  sendSuggestionsPanel,
  handleSuggestionInteraction,
};