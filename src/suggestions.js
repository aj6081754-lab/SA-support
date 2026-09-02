const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

const config = require("./config");

// ======================================================
// MEMORIA TEMPORAL
// ======================================================

let suggestionCounter = 0;

const pendingSuggestions = new Map();
const suggestions = new Map();

// ======================================================
// EMOJIS
// ======================================================

const EMOJIS = config.emojis;

// ======================================================
// UTILIDADES
// ======================================================

function getSuggestionId() {
  suggestionCounter++;

  return `${Date.now()}-${suggestionCounter}`;
}

async function sendUserDM(user, message) {
  try {
    await user.send(message);
  } catch (error) {
    console.log(
      `⚠️ No se pudo enviar DM a ${user.tag}.`
    );
  }
}

// ======================================================
// PANEL DE SUGERENCIAS
// ======================================================

async function sendSuggestionsPanel(client) {
  const channel = await client.channels.fetch(
    config.channels.suggestionsPanel
  );

  if (!channel) {
    throw new Error(
      "No se encontró el canal del panel de sugerencias."
    );
  }

  const messages = await channel.messages.fetch({
    limit: 50,
  });

  const existingPanel = messages.find(
    (message) =>
      message.author.id === client.user.id &&
      message.components.some((row) =>
        row.components.some(
          (component) =>
            component.customId === "suggestion_create"
        )
      )
  );

  if (existingPanel) {
    console.log(
      "ℹ️ El panel de sugerencias ya existe."
    );

    return existingPanel;
  }

  const embed = new EmbedBuilder()
    .setTitle("💡 Sugerencias")
    .setDescription(
      "¿Tienes una idea para mejorar el servidor?\n\n" +
        "Pulsa el botón de abajo para enviar una sugerencia."
    )
    .setColor(0xffd700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("suggestion_create")
      .setLabel("Enviar sugerencia")
      .setStyle(ButtonStyle.Primary)
      .setEmoji(EMOJIS.suggestion)
  );

  return await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ======================================================
// MODAL
// ======================================================

async function showSuggestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("suggestion_modal")
    .setTitle("Nueva sugerencia");

  const input = new TextInputBuilder()
    .setCustomId("suggestion_text")
    .setLabel("Escribe tu sugerencia")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      "Explica tu idea de la forma más clara posible..."
    )
    .setMinLength(5)
    .setMaxLength(1000)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(
    input
  );

  modal.addComponents(row);

  await interaction.showModal(modal);
}

// ======================================================
// CONFIRMACIÓN
// ======================================================

async function handleSuggestionModal(interaction) {
  const suggestionText =
    interaction.fields.getTextInputValue(
      "suggestion_text"
    );

  const pendingId = getSuggestionId();

  pendingSuggestions.set(pendingId, {
    userId: interaction.user.id,
    text: suggestionText,
    createdAt: Date.now(),
  });

  const embed = new EmbedBuilder()
    .setTitle("Confirmar sugerencia")
    .setDescription(
      `${EMOJIS.suggestion} **¿Quieres enviar esta sugerencia?**\n\n` +
        `> ${suggestionText.replace(/\n/g, "\n> ")}`
    )
    .setColor(0xffd700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `suggestion_confirm:${pendingId}`
      )
      .setLabel("Enviar")
      .setStyle(ButtonStyle.Success)
      .setEmoji(EMOJIS.accept),

    new ButtonBuilder()
      .setCustomId(
        `suggestion_cancel:${pendingId}`
      )
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji(EMOJIS.deny)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// ENVIAR A REVISIÓN INICIAL
// ======================================================

async function sendToInitialReview(
  interaction,
  pendingId
) {
  const pending = pendingSuggestions.get(
    pendingId
  );

  if (!pending) {
    await interaction.update({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya no está disponible.`,
      embeds: [],
      components: [],
    });

    return;
  }

  if (pending.userId !== interaction.user.id) {
    return;
  }

  pendingSuggestions.delete(pendingId);

  const suggestionId = getSuggestionId();

  const suggestionData = {
    id: suggestionId,

    userId: interaction.user.id,
    username: interaction.user.tag,

    text: pending.text,

    status: "initial_review",

    votes: {
      like: new Set(),
      dislike: new Set(),
    },

    initialReviewMessageId: null,
    publicMessageId: null,
    finalReviewMessageId: null,

    createdAt: Date.now(),
  };

  suggestions.set(
    suggestionId,
    suggestionData
  );

  const reviewChannel =
    await interaction.client.channels.fetch(
      config.channels.suggestionsReview
    );

  if (!reviewChannel) {
    throw new Error(
      "No se encontró el canal de revisión inicial."
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("💡 Nueva sugerencia")
    .setDescription(
      `**Sugerencia:**\n${pending.text}`
    )
    .addFields(
      {
        name: "👤 Usuario",
        value: `<@${interaction.user.id}>`,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${suggestionId}\``,
        inline: true,
      },
      {
        name: "📊 Estado",
        value: "Pendiente de revisión",
        inline: true,
      }
    )
    .setColor(0xffd700)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `suggestion_initial_accept:${suggestionId}`
      )
      .setLabel("Aceptar")
      .setStyle(ButtonStyle.Success)
      .setEmoji(EMOJIS.accept),

    new ButtonBuilder()
      .setCustomId(
        `suggestion_initial_deny:${suggestionId}`
      )
      .setLabel("Denegar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji(EMOJIS.deny)
  );

  const message = await reviewChannel.send({
    embeds: [embed],
    components: [row],
  });

  suggestionData.initialReviewMessageId =
    message.id;

  await interaction.update({
    content:
      `${EMOJIS.suggestion} Tu sugerencia fue recibida y está en revisión.`,
    embeds: [],
    components: [],
  });

  await sendUserDM(
    interaction.user,
    `${EMOJIS.suggestion} Tu sugerencia fue recibida y está en revisión.`
  );
}

// ======================================================
// ACEPTAR REVISIÓN INICIAL
// ======================================================

async function acceptInitialSuggestion(
  interaction,
  suggestionId
) {
  const suggestion =
    suggestions.get(suggestionId);

  if (!suggestion) {
    await interaction.reply({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya no está disponible.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (suggestion.status !== "initial_review") {
    await interaction.reply({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya fue procesada.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  suggestion.status = "voting";

  // ------------------------------------------
  // ACTUALIZAR REVISIÓN INICIAL
  // ------------------------------------------

  const initialEmbed = new EmbedBuilder()
    .setTitle("💡 Sugerencia aceptada")
    .setDescription(
      `**Sugerencia:**\n${suggestion.text}`
    )
    .addFields(
      {
        name: "👤 Usuario",
        value: `<@${suggestion.userId}>`,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${suggestion.id}\``,
        inline: true,
      },
      {
        name: "📊 Estado",
        value: "Aceptada — enviada a votación",
        inline: true,
      }
    )
    .setColor(0x57f287)
    .setTimestamp();

  const initialMessage =
    await interaction.channel.messages.fetch(
      suggestion.initialReviewMessageId
    );

  await initialMessage.edit({
    embeds: [initialEmbed],
    components: [],
  });

  // ------------------------------------------
  // PUBLICAR EN VOTACIÓN
  // ------------------------------------------

  const votingChannel =
    await interaction.client.channels.fetch(
      config.channels.suggestions
    );

  if (!votingChannel) {
    throw new Error(
      "No se encontró el canal público de sugerencias."
    );
  }

  const votingEmbed = new EmbedBuilder()
    .setTitle("💡 Nueva sugerencia")
    .setDescription(
      `${suggestion.text}\n\n` +
        `Sugerencia enviada por <@${suggestion.userId}>`
    )
    .addFields(
      {
        name: EMOJIS.like,
        value: "0 votos",
        inline: true,
      },
      {
        name: EMOJIS.dislike,
        value: "0 votos",
        inline: true,
      }
    )
    .setFooter({
      text: `ID: ${suggestion.id}`,
    })
    .setColor(0xffd700)
    .setTimestamp();

  const votingRow =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `suggestion_like:${suggestion.id}`
        )
        .setLabel("Me gusta")
        .setStyle(ButtonStyle.Success)
        .setEmoji(EMOJIS.like),

      new ButtonBuilder()
        .setCustomId(
          `suggestion_dislike:${suggestion.id}`
        )
        .setLabel("No me gusta")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(EMOJIS.dislike)
    );

  const votingMessage =
    await votingChannel.send({
      embeds: [votingEmbed],
      components: [votingRow],
    });

  suggestion.publicMessageId =
    votingMessage.id;

  // ------------------------------------------
  // CREAR REVISIÓN FINAL INMEDIATAMENTE
  // ------------------------------------------

  await createFinalReview(
    interaction.client,
    suggestion
  );

  // ------------------------------------------
  // AVISAR AL USUARIO
  // ------------------------------------------

  const user =
    await interaction.client.users.fetch(
      suggestion.userId
    );

  await sendUserDM(
    user,
    `${EMOJIS.suggestion} Tu sugerencia fue aceptada, pronto puede ser añadida.`
  );

  await interaction.reply({
    content:
      `${EMOJIS.suggestion} La sugerencia fue aceptada y enviada inmediatamente al canal de votación.`,
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// CREAR REVISIÓN FINAL
// ======================================================

async function createFinalReview(
  client,
  suggestion
) {
  const finalChannel =
    await client.channels.fetch(
      config.channels.suggestionsFinal
    );

  if (!finalChannel) {
    throw new Error(
      "No se encontró el canal de revisión final."
    );
  }

  const embed =
    createFinalReviewEmbed(suggestion);

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `suggestion_final_accept:${suggestion.id}`
        )
        .setLabel("Aceptar sugerencia")
        .setStyle(ButtonStyle.Success)
        .setEmoji(EMOJIS.accept),

      new ButtonBuilder()
        .setCustomId(
          `suggestion_final_deny:${suggestion.id}`
        )
        .setLabel("Denegar sugerencia")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(EMOJIS.deny)
    );

  const message =
    await finalChannel.send({
      embeds: [embed],
      components: [row],
    });

  suggestion.finalReviewMessageId =
    message.id;
}

// ======================================================
// EMBED REVISIÓN FINAL
// ======================================================

function createFinalReviewEmbed(
  suggestion
) {
  const likes =
    suggestion.votes.like.size;

  const dislikes =
    suggestion.votes.dislike.size;

  return new EmbedBuilder()
    .setTitle(
      "💡 Revisión final de sugerencia"
    )
    .setDescription(
      `**Sugerencia:**\n${suggestion.text}`
    )
    .addFields(
      {
        name: "👤 Usuario",
        value: `<@${suggestion.userId}>`,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${suggestion.id}\``,
        inline: true,
      },
      {
        name: "📊 Estado",
        value: "En votación",
        inline: true,
      },
      {
        name: EMOJIS.like,
        value: `${likes} votos`,
        inline: true,
      },
      {
        name: EMOJIS.dislike,
        value: `${dislikes} votos`,
        inline: true,
      },
      {
        name: "📈 Total",
        value: `${likes + dislikes} votos`,
        inline: true,
      }
    )
    .setColor(0xffd700)
    .setTimestamp();
}

// ======================================================
// VOTACIÓN
// ======================================================

async function vote(
  interaction,
  suggestionId,
  type
) {
  const suggestion =
    suggestions.get(suggestionId);

  if (!suggestion) {
    await interaction.reply({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya no está disponible.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (suggestion.status !== "voting") {
    await interaction.reply({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya no está disponible para votar.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const userId =
    interaction.user.id;

  // Quitar voto anterior
  suggestion.votes.like.delete(userId);
  suggestion.votes.dislike.delete(userId);

  // Agregar nuevo voto
  if (type === "like") {
    suggestion.votes.like.add(userId);
  } else {
    suggestion.votes.dislike.add(userId);
  }

  await updateVotingMessage(
    interaction.client,
    suggestion
  );

  await updateFinalReview(
    interaction.client,
    suggestion
  );

  await interaction.reply({
    content:
      `${EMOJIS.suggestion} Tu voto fue registrado correctamente.`,
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// ACTUALIZAR VOTACIÓN
// ======================================================

async function updateVotingMessage(
  client,
  suggestion
) {
  if (!suggestion.publicMessageId) {
    return;
  }

  try {
    const channel =
      await client.channels.fetch(
        config.channels.suggestions
      );

    const message =
      await channel.messages.fetch(
        suggestion.publicMessageId
      );

    const embed = new EmbedBuilder()
      .setTitle("💡 Nueva sugerencia")
      .setDescription(
        `${suggestion.text}\n\n` +
          `Sugerencia enviada por <@${suggestion.userId}>`
      )
      .addFields(
        {
          name: EMOJIS.like,
          value: `${suggestion.votes.like.size} votos`,
          inline: true,
        },
        {
          name: EMOJIS.dislike,
          value: `${suggestion.votes.dislike.size} votos`,
          inline: true,
        }
      )
      .setFooter({
        text: `ID: ${suggestion.id}`,
      })
      .setColor(0xffd700)
      .setTimestamp();

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `suggestion_like:${suggestion.id}`
          )
          .setLabel("Me gusta")
          .setStyle(ButtonStyle.Success)
          .setEmoji(EMOJIS.like),

        new ButtonBuilder()
          .setCustomId(
            `suggestion_dislike:${suggestion.id}`
          )
          .setLabel("No me gusta")
          .setStyle(ButtonStyle.Danger)
          .setEmoji(EMOJIS.dislike)
      );

    await message.edit({
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error(
      "❌ Error actualizando votación:",
      error
    );
  }
}

// ======================================================
// ACTUALIZAR REVISIÓN FINAL
// ======================================================

async function updateFinalReview(
  client,
  suggestion
) {
  if (!suggestion.finalReviewMessageId) {
    return;
  }

  try {
    const channel =
      await client.channels.fetch(
        config.channels.suggestionsFinal
      );

    const message =
      await channel.messages.fetch(
        suggestion.finalReviewMessageId
      );

    const embed =
      createFinalReviewEmbed(
        suggestion
      );

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `suggestion_final_accept:${suggestion.id}`
          )
          .setLabel("Aceptar sugerencia")
          .setStyle(ButtonStyle.Success)
          .setEmoji(EMOJIS.accept),

        new ButtonBuilder()
          .setCustomId(
            `suggestion_final_deny:${suggestion.id}`
          )
          .setLabel("Denegar sugerencia")
          .setStyle(ButtonStyle.Danger)
          .setEmoji(EMOJIS.deny)
      );

    await message.edit({
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error(
      "❌ Error actualizando revisión final:",
      error
    );
  }
}

// ======================================================
// DECISIÓN FINAL
// ======================================================

async function finalDecision(
  interaction,
  suggestionId,
  accepted
) {
  const suggestion =
    suggestions.get(suggestionId);

  if (!suggestion) {
    await interaction.reply({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya no está disponible.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (suggestion.status !== "voting") {
    await interaction.reply({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya fue procesada.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  suggestion.status =
    accepted
      ? "accepted"
      : "denied";

  // ------------------------------------------
  // ACTUALIZAR REVISIÓN FINAL
  // ------------------------------------------

  const finalEmbed =
    new EmbedBuilder()
      .setTitle(
        accepted
          ? "💡 Sugerencia aceptada"
          : "💡 Sugerencia denegada"
      )
      .setDescription(
        `**Sugerencia:**\n${suggestion.text}`
      )
      .addFields(
        {
          name: "👤 Usuario",
          value: `<@${suggestion.userId}>`,
          inline: true,
        },
        {
          name: "🆔 ID",
          value: `\`${suggestion.id}\``,
          inline: true,
        },
        {
          name: "📊 Estado",
          value: accepted
            ? "Aceptada"
            : "Denegada",
          inline: true,
        },
        {
          name: EMOJIS.like,
          value: `${suggestion.votes.like.size} votos`,
          inline: true,
        },
        {
          name: EMOJIS.dislike,
          value: `${suggestion.votes.dislike.size} votos`,
          inline: true,
        }
      )
      .setColor(
        accepted
          ? 0x57f287
          : 0xed4245
      )
      .setTimestamp();

  const finalMessage =
    await interaction.channel.messages.fetch(
      suggestion.finalReviewMessageId
    );

  await finalMessage.edit({
    embeds: [finalEmbed],
    components: [],
  });

  // ------------------------------------------
  // DESACTIVAR VOTACIÓN
  // ------------------------------------------

  await disableVotingMessage(
    interaction.client,
    suggestion
  );

  // ------------------------------------------
  // AVISAR AL USUARIO
  // ------------------------------------------

  const user =
    await interaction.client.users.fetch(
      suggestion.userId
    );

  await sendUserDM(
    user,
    accepted
      ? `${EMOJIS.suggestion} Tu sugerencia fue aceptada, pronto puede ser añadida.`
      : `${EMOJIS.suggestion} Tu sugerencia fue denegada.`
  );

  await interaction.reply({
    content:
      accepted
        ? `${EMOJIS.suggestion} La sugerencia fue aceptada definitivamente.`
        : `${EMOJIS.suggestion} La sugerencia fue denegada definitivamente.`,
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// DESACTIVAR VOTACIÓN
// ======================================================

async function disableVotingMessage(
  client,
  suggestion
) {
  if (!suggestion.publicMessageId) {
    return;
  }

  try {
    const channel =
      await client.channels.fetch(
        config.channels.suggestions
      );

    const message =
      await channel.messages.fetch(
        suggestion.publicMessageId
      );

    const accepted =
      suggestion.status === "accepted";

    const embed =
      new EmbedBuilder()
        .setTitle(
          accepted
            ? "💡 Sugerencia aceptada"
            : "💡 Sugerencia denegada"
        )
        .setDescription(
          `${suggestion.text}\n\n` +
            `Sugerencia enviada por <@${suggestion.userId}>`
        )
        .addFields(
          {
            name: EMOJIS.like,
            value: `${suggestion.votes.like.size} votos`,
            inline: true,
          },
          {
            name: EMOJIS.dislike,
            value: `${suggestion.votes.dislike.size} votos`,
            inline: true,
          },
          {
            name: "📊 Estado",
            value: accepted
              ? "Aceptada"
              : "Denegada",
            inline: true,
          }
        )
        .setFooter({
          text: `ID: ${suggestion.id}`,
        })
        .setColor(
          accepted
            ? 0x57f287
            : 0xed4245
        )
        .setTimestamp();

    await message.edit({
      embeds: [embed],
      components: [],
    });
  } catch (error) {
    console.error(
      "❌ Error desactivando votación:",
      error
    );
  }
}

// ======================================================
// CANCELAR
// ======================================================

async function cancelSuggestion(
  interaction,
  pendingId
) {
  const pending =
    pendingSuggestions.get(
      pendingId
    );

  if (!pending) {
    await interaction.update({
      content:
        `${EMOJIS.suggestion} Esta sugerencia ya no está disponible.`,
      embeds: [],
      components: [],
    });

    return;
  }

  if (
    pending.userId !==
    interaction.user.id
  ) {
    return;
  }

  pendingSuggestions.delete(
    pendingId
  );

  await interaction.update({
    content:
      `${EMOJIS.suggestion} Tu sugerencia fue cancelada.`,
    embeds: [],
    components: [],
  });
}

// ======================================================
// MANEJADOR PRINCIPAL
// ======================================================

async function handleSuggestionInteraction(
  interaction
) {
  // ------------------------------------------
  // ABRIR MODAL
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId ===
      "suggestion_create"
  ) {
    await showSuggestionModal(
      interaction
    );

    return true;
  }

  // ------------------------------------------
  // MODAL
  // ------------------------------------------

  if (
    interaction.isModalSubmit() &&
    interaction.customId ===
      "suggestion_modal"
  ) {
    await handleSuggestionModal(
      interaction
    );

    return true;
  }

  // ------------------------------------------
  // CONFIRMAR
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_confirm:"
    )
  ) {
    const pendingId =
      interaction.customId.split(":")[1];

    await sendToInitialReview(
      interaction,
      pendingId
    );

    return true;
  }

  // ------------------------------------------
  // CANCELAR
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_cancel:"
    )
  ) {
    const pendingId =
      interaction.customId.split(":")[1];

    await cancelSuggestion(
      interaction,
      pendingId
    );

    return true;
  }

  // ------------------------------------------
  // ACEPTAR REVISIÓN INICIAL
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_initial_accept:"
    )
  ) {
    const suggestionId =
      interaction.customId.split(":")[1];

    await acceptInitialSuggestion(
      interaction,
      suggestionId
    );

    return true;
  }

  // ------------------------------------------
  // DENEGAR REVISIÓN INICIAL
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_initial_deny:"
    )
  ) {
    const suggestionId =
      interaction.customId.split(":")[1];

    const suggestion =
      suggestions.get(
        suggestionId
      );

    if (!suggestion) {
      await interaction.reply({
        content:
          `${EMOJIS.suggestion} Esta sugerencia ya no está disponible.`,
        flags: MessageFlags.Ephemeral,
      });

      return true;
    }

    if (
      suggestion.status !==
      "initial_review"
    ) {
      await interaction.reply({
        content:
          `${EMOJIS.suggestion} Esta sugerencia ya fue procesada.`,
        flags: MessageFlags.Ephemeral,
      });

      return true;
    }

    suggestion.status = "denied";

    const embed =
      new EmbedBuilder()
        .setTitle(
          "💡 Sugerencia denegada"
        )
        .setDescription(
          `**Sugerencia:**\n${suggestion.text}`
        )
        .addFields(
          {
            name: "👤 Usuario",
            value: `<@${suggestion.userId}>`,
            inline: true,
          },
          {
            name: "🆔 ID",
            value: `\`${suggestion.id}\``,
            inline: true,
          },
          {
            name: "📊 Estado",
            value: "Denegada",
            inline: true,
          }
        )
        .setColor(0xed4245)
        .setTimestamp();

    const message =
      await interaction.channel.messages.fetch(
        suggestion.initialReviewMessageId
      );

    await message.edit({
      embeds: [embed],
      components: [],
    });

    const user =
      await interaction.client.users.fetch(
        suggestion.userId
      );

    await sendUserDM(
      user,
      `${EMOJIS.suggestion} Tu sugerencia fue denegada.`
    );

    await interaction.reply({
      content:
        `${EMOJIS.suggestion} La sugerencia fue denegada.`,
      flags: MessageFlags.Ephemeral,
    });

    return true;
  }

  // ------------------------------------------
  // LIKE
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_like:"
    )
  ) {
    const suggestionId =
      interaction.customId.split(":")[1];

    await vote(
      interaction,
      suggestionId,
      "like"
    );

    return true;
  }

  // ------------------------------------------
  // DISLIKE
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_dislike:"
    )
  ) {
    const suggestionId =
      interaction.customId.split(":")[1];

    await vote(
      interaction,
      suggestionId,
      "dislike"
    );

    return true;
  }

  // ------------------------------------------
  // ACEPTAR FINAL
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_final_accept:"
    )
  ) {
    const suggestionId =
      interaction.customId.split(":")[1];

    await finalDecision(
      interaction,
      suggestionId,
      true
    );

    return true;
  }

  // ------------------------------------------
  // DENEGAR FINAL
  // ------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "suggestion_final_deny:"
    )
  ) {
    const suggestionId =
      interaction.customId.split(":")[1];

    await finalDecision(
      interaction,
      suggestionId,
      false
    );

    return true;
  }

  return false;
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  sendSuggestionsPanel,
  handleSuggestionInteraction,
};