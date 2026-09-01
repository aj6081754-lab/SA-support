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
// MEMORIA TEMPORAL DE SUGERENCIAS
// ==================================================
const suggestions = new Map();
let suggestionCounter = 0;
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
  const messages = await channel.messages.fetch({
    limit: 50,
  });
  const existingPanel = messages.find(
    (message) =>
      message.author.id === client.user.id &&
      message.embeds.length > 0 &&
      message.components.length > 0 &&
      message.components[0].components.some(
        (component) =>
          component.customId === "suggestion_create"
      )
  );
  if (existingPanel) {
    console.log(
      "✅ El panel de sugerencias ya existe."
    );
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle(
      `${config.emojis.suggestion} Sugerencias`
    )
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
  const row = new ActionRowBuilder().addComponents(
    button
  );
  await channel.send({
    embeds: [embed],
    components: [row],
  });
  console.log(
    "✅ Panel de sugerencias enviado."
  );
}
// ==================================================
// ABRIR MODAL
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
  const row = new ActionRowBuilder().addComponents(
    input
  );
  modal.addComponents(row);
  await interaction.showModal(modal);
}
// ==================================================
// CONFIRMACIÓN
// ==================================================
async function showSuggestionConfirmation(
  interaction
) {
  const suggestion =
    interaction.fields.getTextInputValue(
      "suggestion_text"
    );
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle("Revisar sugerencia")
    .setDescription(
      "Esta es tu sugerencia:\n\n" +
      `> ${suggestion.replace(/\n/g, "\n> ")}\n\n` +
      "¿Quieres enviarla para que el Staff la revise?"
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `suggestion_confirm_${interaction.user.id}`
      )
      .setLabel("Enviar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(
        `suggestion_cancel_${interaction.user.id}`
      )
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger)
  );
  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
  interaction.client.pendingSuggestions ??=
    new Map();
  interaction.client.pendingSuggestions.set(
    interaction.user.id,
    suggestion
  );
}
// ==================================================
// ENVIAR A REVISIÓN INICIAL
// ==================================================
async function sendSuggestionToReview(
  interaction
) {
  const pending =
    interaction.client.pendingSuggestions?.get(
      interaction.user.id
    );
  if (!pending) {
    await interaction.update({
      content:
        "❌ No se encontró tu sugerencia. Intenta nuevamente.",
      embeds: [],
      components: [],
    });
    return;
  }
  interaction.client.pendingSuggestions.delete(
    interaction.user.id
  );
  suggestionCounter++;
  const id = suggestionCounter;
  suggestions.set(id, {
    id,
    userId: interaction.user.id,
    text: pending,
    status: "review",
    likes: new Set(),
    dislikes: new Set(),
    reviewMessageId: null,
    votingMessageId: null,
    finalMessageId: null,
  });
  const channel =
    await interaction.client.channels.fetch(
      config.channels.suggestionsReview
    );
  if (!channel) {
    await interaction.update({
      content:
        "❌ No se encontró el canal de revisión.",
      embeds: [],
      components: [],
    });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle(
      `${config.emojis.suggestion} Sugerencia #${id}`
    )
    .setDescription(pending)
    .addFields(
      {
        name: "👤 Usuario",
        value: `<@${interaction.user.id}>`,
        inline: true,
      },
      {
        name: "Estado",
        value: "🕐 En revisión",
        inline: true,
      }
    )
    .setFooter({
      text: "Staff Support • Revisión inicial",
    })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggestion_initial_accept_${id}`)
      .setLabel("Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`suggestion_initial_deny_${id}`)
      .setLabel("Denegar")
      .setStyle(ButtonStyle.Danger)
  );
  const message = await channel.send({
    embeds: [embed],
    components: [row],
  });
  suggestions.get(id).reviewMessageId =
    message.id;
  await interaction.update({
    content:
      "📨 Tu sugerencia fue recibida y está en revisión.",
    embeds: [],
    components: [],
  });
  try {
    await interaction.user.send(
      "📨 Tu sugerencia fue recibida y está en revisión."
    );
  } catch {
    console.log(
      `⚠️ No se pudo enviar MD a ${interaction.user.tag}.`
    );
  }
}
// ==================================================
// DENEGAR EN REVISIÓN INICIAL
// ==================================================
async function denyInitialSuggestion(
  interaction,
  id
) {
  const data = suggestions.get(id);
  if (!data) {
    await interaction.reply({
      content:
        "❌ Esta sugerencia ya no existe.",
      ephemeral: true,
    });
    return;
  }
  data.status = "denied";
  await interaction.update({
    components: [],
  });
  try {
    const user =
      await interaction.client.users.fetch(
        data.userId
      );
    await user.send(
      "❌ Tu sugerencia fue denegada."
    );
  } catch {
    console.log(
      "⚠️ No se pudo enviar el MD de la sugerencia."
    );
  }
}
// ==================================================
// ACEPTAR EN REVISIÓN INICIAL
// ==================================================
async function acceptInitialSuggestion(
  interaction,
  id
) {
  const data = suggestions.get(id);
  if (!data) {
    await interaction.reply({
      content:
        "❌ Esta sugerencia ya no existe.",
      ephemeral: true,
    });
    return;
  }
  data.status = "voting";
  const channel =
    await interaction.client.channels.fetch(
      config.channels.suggestions
    );
  if (!channel) {
    await interaction.reply({
      content:
        "❌ No se encontró el canal de votación.",
      ephemeral: true,
    });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle(
      `${config.emojis.suggestion} Sugerencia #${id}`
    )
    .setDescription(data.text)
    .addFields({
      name: "👤 Sugerida por",
      value: `<@${data.userId}>`,
    })
    .setFooter({
      text: "Staff Analytics • Votación",
    })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggestion_like_${id}`)
      .setEmoji(config.emojis.like)
      .setLabel("0")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`suggestion_dislike_${id}`)
      .setEmoji(config.emojis.dislike)
      .setLabel("0")
      .setStyle(ButtonStyle.Secondary)
  );
  const message = await channel.send({
    embeds: [embed],
    components: [row],
  });
  data.votingMessageId = message.id;
  await interaction.update({
    components: [],
  });
  try {
    const user =
      await interaction.client.users.fetch(
        data.userId
      );
    await user.send(
      "📢 Tu sugerencia fue enviada correctamente."
    );
  } catch {
    console.log(
      "⚠️ No se pudo enviar el MD de la sugerencia."
    );
  }
}
// ==================================================
// VOTACIÓN
// ==================================================
async function handleVote(
  interaction,
  id,
  type
) {
  const data = suggestions.get(id);
  if (!data || data.status !== "voting") {
    await interaction.reply({
      content:
        "❌ Esta sugerencia ya no está disponible para votar.",
      ephemeral: true,
    });
    return;
  }
  const userId = interaction.user.id;
  if (
    data.likes.has(userId) ||
    data.dislikes.has(userId)
  ) {
    await interaction.reply({
      content:
        "⚠️ Ya has votado en esta sugerencia.",
      ephemeral: true,
    });
    return;
  }
  if (type === "like") {
    data.likes.add(userId);
  } else {
    data.dislikes.add(userId);
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggestion_like_${id}`)
      .setEmoji(config.emojis.like)
      .setLabel(String(data.likes.size))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`suggestion_dislike_${id}`)
      .setEmoji(config.emojis.dislike)
      .setLabel(String(data.dislikes.size))
      .setStyle(ButtonStyle.Secondary)
  );
  await interaction.update({
    components: [row],
  });
}
// ==================================================
// REVISIÓN FINAL
// ==================================================
async function sendFinalReview(
  client,
  id
) {
  const data = suggestions.get(id);
  if (!data) {
    return;
  }
  if (data.status !== "voting") {
    return;
  }
  data.status = "final";
  const channel =
    await client.channels.fetch(
      config.channels.suggestionsFinal
    );
  if (!channel) {
    console.error(
      "❌ No se encontró el canal de revisión final."
    );
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("#F5C542")
    .setTitle(
      `${config.emojis.suggestion} Sugerencia #${id} • Revisión final`
    )
    .setDescription(data.text)
    .addFields(
      {
        name: "👤 Usuario",
        value: `<@${data.userId}>`,
        inline: true,
      },
      {
        name: `${config.emojis.like} Me gusta`,
        value: String(data.likes.size),
        inline: true,
      },
      {
        name: `${config.emojis.dislike} No me gusta`,
        value: String(data.dislikes.size),
        inline: true,
      }
    )
    .setFooter({
      text: "Staff Support • Decisión final",
    })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggestion_final_accept_${id}`)
      .setLabel("Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`suggestion_final_deny_${id}`)
      .setLabel("Denegar")
      .setStyle(ButtonStyle.Danger)
  );
  const message = await channel.send({
    embeds: [embed],
    components: [row],
  });
  data.finalMessageId = message.id;
}
// ==================================================
// DECISIÓN FINAL
// ==================================================
async function finalDecision(
  interaction,
  id,
  accepted
) {
  const data = suggestions.get(id);
  if (!data) {
    await interaction.reply({
      content:
        "❌ Esta sugerencia ya no existe.",
      ephemeral: true,
    });
    return;
  }
  data.status = accepted
    ? "accepted"
    : "denied";
  await interaction.update({
    components: [],
  });
  try {
    const user =
      await interaction.client.users.fetch(
        data.userId
      );
    await user.send(
      accepted
        ? "✅ Tu sugerencia fue aceptada, pronto puede ser añadida."
        : "❌ Tu sugerencia fue denegada."
    );
  } catch {
    console.log(
      "⚠️ No se pudo enviar el MD de la sugerencia."
    );
  }
}
// ==================================================
// MANEJAR INTERACCIONES
// ==================================================
async function handleSuggestionInteraction(
  interaction
) {
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
    await showSuggestionConfirmation(interaction);
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_confirm_"
    )
  ) {
    await sendSuggestionToReview(interaction);
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_cancel_"
    )
  ) {
    interaction.client.pendingSuggestions?.delete(
      interaction.user.id
    );
    await interaction.update({
      content: "❌ Sugerencia cancelada.",
      embeds: [],
      components: [],
    });
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_initial_accept_"
    )
  ) {
    const id = Number(
      interaction.customId.split("_").pop()
    );
    await acceptInitialSuggestion(
      interaction,
      id
    );
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_initial_deny_"
    )
  ) {
    const id = Number(
      interaction.customId.split("_").pop()
    );
    await denyInitialSuggestion(
      interaction,
      id
    );
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_like_"
    )
  ) {
    const id = Number(
      interaction.customId.split("_").pop()
    );
    await handleVote(
      interaction,
      id,
      "like"
    );
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_dislike_"
    )
  ) {
    const id = Number(
      interaction.customId.split("_").pop()
    );
    await handleVote(
      interaction,
      id,
      "dislike"
    );
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_final_accept_"
    )
  ) {
    const id = Number(
      interaction.customId.split("_").pop()
    );
    await finalDecision(
      interaction,
      id,
      true
    );
    return true;
  }
  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_final_deny_"
    )
  ) {
    const id = Number(
      interaction.customId.split("_").pop()
    );
    await finalDecision(
      interaction,
      id,
      false
    );
    return true;
  }
  return false;
}
module.exports = {
  sendSuggestionsPanel,
  handleSuggestionInteraction,
  sendFinalReview,
};