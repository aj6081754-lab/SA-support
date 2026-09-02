const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require("discord.js");

const config = require("./config");

const {
  saveTranscript,
} = require("./transcripts");

// ==================================================
// TICKETS ACTIVOS
// ==================================================

const tickets = new Map();

// ==================================================
// CATEGORÍAS
// ==================================================

const TICKET_TYPES = {
  general_support: {
    label: "General Support",
    emoji:
      config.emojis.generalSupport,
  },

  report_bugs: {
    label: "Report Bugs",
    emoji:
      config.emojis.reportBugs,
  },

  get_help: {
    label: "Get Help",
    emoji:
      config.emojis.getHelp,
  },

  other: {
    label: "Other",
    emoji:
      config.emojis.other,
  },
};

// ==================================================
// CREAR PANEL
// ==================================================

async function sendTicketsPanel(
  client
) {
  const channel =
    await client.channels.fetch(
      config.channels.ticketsPanel
    );

  if (!channel) {
    throw new Error(
      "No se encontró el canal del panel de tickets."
    );
  }

  const container =
    new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# 🎫 Staff Support\n\n" +
        "¿Necesitas ayuda?\n\n" +
        "Selecciona una categoría en el menú inferior para abrir un ticket."
    )
  );

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "ticket_category"
      )
      .setPlaceholder(
        "Selecciona una categoría"
      )
      .addOptions(
        {
          label:
            "General Support",
          description:
            "Ayuda general",
          value:
            "general_support",
          emoji:
            config.emojis
              .generalSupport,
        },
        {
          label:
            "Report Bugs",
          description:
            "Reporta un error o bug",
          value:
            "report_bugs",
          emoji:
            config.emojis
              .reportBugs,
        },
        {
          label:
            "Get Help",
          description:
            "Necesitas ayuda con algo",
          value:
            "get_help",
          emoji:
            config.emojis
              .getHelp,
        },
        {
          label:
            "Other",
          description:
            "Otro tipo de solicitud",
          value:
            "other",
          emoji:
            config.emojis
              .other,
        }
      );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      menu
    )
  );

  await channel.send({
    components: [container],

    flags:
      MessageFlags.IsComponentsV2,
  });

  console.log(
    "🎫 Panel de tickets enviado."
  );
}

// ==================================================
// MODAL GENERAL
// ==================================================

async function showGeneralSupportModal(
  interaction
) {
  const modal =
    new ModalBuilder()
      .setCustomId(
        "ticket_modal_general"
      )
      .setTitle(
        "General Support"
      );

  const input =
    new TextInputBuilder()
      .setCustomId(
        "ticket_reason"
      )
      .setLabel(
        "¿En qué podemos ayudarte?"
      )
      .setStyle(
        TextInputStyle.Paragraph
      )
      .setRequired(true)
      .setPlaceholder(
        "Describe tu problema..."
      )
      .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      input
    )
  );

  await interaction.showModal(
    modal
  );
}

// ==================================================
// MODAL GET HELP
// ==================================================

async function showGetHelpModal(
  interaction
) {
  const modal =
    new ModalBuilder()
      .setCustomId(
        "ticket_modal_help"
      )
      .setTitle(
        "Get Help"
      );

  const input =
    new TextInputBuilder()
      .setCustomId(
        "ticket_reason"
      )
      .setLabel(
        "¿Qué necesitas?"
      )
      .setStyle(
        TextInputStyle.Paragraph
      )
      .setRequired(true)
      .setPlaceholder(
        "Explica lo que necesitas..."
      )
      .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      input
    )
  );

  await interaction.showModal(
    modal
  );
}

// ==================================================
// MENÚ REPORT BUGS
// ==================================================

async function showBugMenu(
  interaction
) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "ticket_bug_type"
      )
      .setPlaceholder(
        "Selecciona el tipo de bug"
      )
      .addOptions(
        {
          label:
            "Discord Bot",
          description:
            "Problema relacionado con el bot",
          value:
            "discord_bot",
        },
        {
          label:
            "Website",
          description:
            "Problema relacionado con la web",
          value:
            "website",
        },
        {
          label:
            "Other",
          description:
            "Otro problema",
          value:
            "other",
        }
      );

  await interaction.reply({
    content:
      "Selecciona el tipo de bug:",
    components: [
      new ActionRowBuilder().addComponents(
        menu
      ),
    ],
    flags:
      MessageFlags.Ephemeral,
  });
}

// ==================================================
// CREAR TICKET
// ==================================================

async function createTicket(
  interaction,
  type,
  reason = "Sin descripción"
) {
  const guild =
    interaction.guild;

  if (!guild) {
    return;
  }

  // Evitar varios tickets
  const existing =
    [...tickets.values()]
      .find(
        (ticket) =>
          ticket.guildId ===
            guild.id &&
          ticket.userId ===
            interaction.user.id
      );

  if (existing) {
    return interaction.reply({
      content:
        `❌ Ya tienes un ticket abierto: <#${existing.channelId}>`,
      flags:
        MessageFlags.Ephemeral,
    });
  }

  const category =
    TICKET_TYPES[type] ||
    TICKET_TYPES.other;

  const channel =
    await guild.channels.create({
      name:
        `ticket-${interaction.user.username
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          )
          .slice(0, 18)}`,

      type:
        ChannelType.GuildText,

      permissionOverwrites: [
        {
          id:
            guild.roles.everyone.id,

          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        {
          id:
            interaction.user.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },

        {
          id:
            config.roles.staff,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },

        {
          id:
            guild.members.me.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
      ],
    });

  const ticket = {
    id:
      channel.id,

    channelId:
      channel.id,

    channelName:
      channel.name,

    guildId:
      guild.id,

    userId:
      interaction.user.id,

    type,

    reason,

    claimedBy:
      null,

    createdAt:
      Date.now(),
  };

  tickets.set(
    channel.id,
    ticket
  );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        `${category.emoji} ${category.label}`
      )
      .setDescription(
        `**Usuario:** <@${interaction.user.id}>\n\n` +
          `**Solicitud:**\n${reason}`
      )
      .setFooter({
        text:
          "Staff Support",
      });

  const claimButton =
    new ButtonBuilder()
      .setCustomId(
        "ticket_claim"
      )
      .setLabel(
        "Reclamar"
      )
      .setStyle(
        ButtonStyle.Primary
      )
      .setEmoji(
        config.emojis.claim
      );

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        "ticket_close"
      )
      .setLabel(
        "Cerrar"
      )
      .setStyle(
        ButtonStyle.Danger
      )
      .setEmoji(
        config.emojis.close
      );

  const row =
    new ActionRowBuilder()
      .addComponents(
        claimButton,
        closeButton
      );

  await channel.send({
    content:
      `<@&${config.roles.staff}> <@${interaction.user.id}>`,
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content:
      `✅ Tu ticket ha sido creado: ${channel}`,
    flags:
      MessageFlags.Ephemeral,
  });
}

// ==================================================
// RECOPILAR TODOS LOS MENSAJES
// ==================================================

async function collectTicketMessages(
  channel
) {
  const messages =
    [];

  let lastId = null;

  while (true) {
    const options = {
      limit: 100,
    };

    if (lastId) {
      options.before =
        lastId;
    }

    const batch =
      await channel.messages.fetch(
        options
      );

    if (!batch.size) {
      break;
    }

    messages.push(
      ...batch.values()
    );

    lastId =
      batch.last().id;

    if (
      batch.size < 100
    ) {
      break;
    }
  }

  return messages.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp
  );
}

// ==================================================
// RECOPILAR HILOS
// ==================================================

async function collectTicketThreads(
  channel
) {
  const threads = [];

  try {
    const active =
      await channel.threads.fetchActive();

    for (
      const thread of active.threads.values()
    ) {
      threads.push(
        thread
      );
    }
  } catch (error) {
    console.error(
      "⚠️ Error obteniendo hilos activos:",
      error
    );
  }

  try {
    const archived =
      await channel.threads.fetchArchived({
        type: "public",
        fetchAll: true,
      });

    for (
      const thread of archived.threads.values()
    ) {
      if (
        !threads.some(
          (item) =>
            item.id ===
            thread.id
        )
      ) {
        threads.push(
          thread
        );
      }
    }
  } catch (error) {
    console.error(
      "⚠️ Error obteniendo hilos archivados:",
      error
    );
  }

  const result = [];

  for (
    const thread of threads
  ) {
    try {
      const messages =
        await collectTicketMessages(
          thread
        );

      result.push({
        id:
          thread.id,

        name:
          thread.name,

        messages,
      });
    } catch (error) {
      console.error(
        `⚠️ Error recopilando hilo ${thread.id}:`,
        error
      );
    }
  }

  return result;
}

// ==================================================
// RECLAMAR TICKET
// ==================================================

async function claimTicket(
  interaction
) {
  const ticket =
    tickets.get(
      interaction.channel.id
    );

  if (!ticket) {
    return interaction.reply({
      content:
        "❌ Este ticket no está registrado.",
      flags:
        MessageFlags.Ephemeral,
    });
  }

  const member =
    interaction.member;

  if (
    !member.roles.cache.has(
      config.roles.staff
    )
  ) {
    return interaction.reply({
      content:
        "❌ Solo el Staff puede reclamar tickets.",
      flags:
        MessageFlags.Ephemeral,
    });
  }

  if (
    ticket.claimedBy
  ) {
    return interaction.reply({
      content:
        `❌ Este ticket ya fue reclamado por <@${ticket.claimedBy}>.`,
      flags:
        MessageFlags.Ephemeral,
    });
  }

  ticket.claimedBy =
    interaction.user.id;

  // Quitar acceso al Staff general
  await interaction.channel.permissionOverwrites.edit(
    config.roles.staff,
    {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    }
  );

  // Mantener acceso al Staff que reclamó
  await interaction.channel.permissionOverwrites.edit(
    interaction.user.id,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    }
  );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setDescription(
        `<@${interaction.user.id}> ha reclamado este ticket.`
      );

  await interaction.channel.send({
    content:
      `<@${ticket.userId}>`,
    embeds: [embed],
  });

  await interaction.reply({
    content:
      "✅ Has reclamado este ticket.",
    flags:
      MessageFlags.Ephemeral,
  });
}

// ==================================================
// CERRAR TICKET
// ==================================================

async function closeTicket(
  interaction
) {
  const ticket =
    tickets.get(
      interaction.channel.id
    );

  if (!ticket) {
    return interaction.reply({
      content:
        "❌ Este ticket no está registrado.",
      flags:
        MessageFlags.Ephemeral,
    });
  }

  // Solo Staff
  if (
    !interaction.member.roles.cache.has(
      config.roles.staff
    ) &&
    interaction.user.id !==
      ticket.claimedBy
  ) {
    return interaction.reply({
      content:
        "❌ Solo el Staff puede cerrar este ticket.",
      flags:
        MessageFlags.Ephemeral,
    });
  }

  const confirm =
    new ButtonBuilder()
      .setCustomId(
        "ticket_confirm_close"
      )
      .setLabel(
        "Confirmar cierre"
      )
      .setStyle(
        ButtonStyle.Danger
      );

  const cancel =
    new ButtonBuilder()
      .setCustomId(
        "ticket_cancel_close"
      )
      .setLabel(
        "Cancelar"
      )
      .setStyle(
        ButtonStyle.Secondary
      );

  const row =
    new ActionRowBuilder()
      .addComponents(
        confirm,
        cancel
      );

  await interaction.reply({
    content:
      "¿Estás seguro de que quieres cerrar este ticket?",
    components: [row],
    flags:
      MessageFlags.Ephemeral,
  });
}

// ==================================================
// CANCELAR CIERRE
// ==================================================

async function cancelClose(
  interaction
) {
  await interaction.update({
    content:
      "❌ Cierre cancelado.",
    components: [],
  });
}

// ==================================================
// CONFIRMAR CIERRE
// ==================================================

async function confirmClose(
  interaction
) {
  const channel =
    interaction.channel;

  const ticket =
    tickets.get(
      channel.id
    );

  if (!ticket) {
    return interaction.update({
      content:
        "❌ Este ticket ya no existe.",
      components: [],
    });
  }

  await interaction.update({
    content:
      "⏳ Guardando la transcripción y cerrando el ticket...",
    components: [],
  });

  try {
    // ==============================================
    // OBTENER MENSAJES
    // ==============================================

    const messages =
      await collectTicketMessages(
        channel
      );

    // ==============================================
    // OBTENER HILOS
    // ==============================================

    const threads =
      await collectTicketThreads(
        channel
      );

    // ==============================================
    // GUARDAR TRANSCRIPT
    // ==============================================

    await saveTranscript(
      ticket,
      messages,
      threads,
      interaction.guild
    );

    // ==============================================
    // URL
    // ==============================================

    let domain =
      process.env
        .RAILWAY_PUBLIC_DOMAIN;

    if (!domain) {
      console.error(
        "❌ RAILWAY_PUBLIC_DOMAIN no está configurado."
      );
    }

    if (
      domain &&
      !domain.startsWith(
        "http://"
      ) &&
      !domain.startsWith(
        "https://"
      )
    ) {
      domain =
        `https://${domain}`;
    }

    const transcriptUrl =
      domain
        ? `${domain}/transcript/${ticket.id}`
        : null;

    // ==============================================
    // ENVIAR TRANSCRIPT
    // ==============================================

    const transcriptChannel =
      await interaction.guild.channels.fetch(
        config.channels
          .ticketTranscripts
      );

    if (
      transcriptChannel &&
      transcriptUrl
    ) {
      const embed =
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(
            "📝 Ticket Transcript"
          )
          .setDescription(
            `**Ticket:** \`${ticket.id}\`\n` +
              `**Usuario:** <@${ticket.userId}>\n` +
              `**Categoría:** ${
                TICKET_TYPES[
                  ticket.type
                ]?.label ||
                ticket.type
              }\n` +
              `**Staff:** ${
                ticket.claimedBy
                  ? `<@${ticket.claimedBy}>`
                  : "No reclamado"
              }`
          )
          .addFields({
            name:
              "Transcripción",
            value:
              `[Abrir transcripción](${transcriptUrl})`,
          })
          .setTimestamp();

      await transcriptChannel.send({
        embeds: [embed],
      });
    }

    // ==============================================
    // LOG
    // ==============================================

    await sendTicketLog(
      interaction,
      ticket,
      transcriptUrl
    );

    // ==============================================
    // ELIMINAR REGISTRO
    // ==============================================

    tickets.delete(
      channel.id
    );

    // ==============================================
    // BORRAR CANAL
    // ==============================================

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          2000
        )
    );

    await channel.delete(
      "Ticket cerrado"
    );

  } catch (error) {
    console.error(
      "❌ Error cerrando ticket:",
      error
    );

    try {
      await interaction.followUp({
        content:
          "❌ Ocurrió un error al crear la transcripción. El ticket no fue eliminado.",
        flags:
          MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

// ==================================================
// LOG
// ==================================================

async function sendTicketLog(
  interaction,
  ticket,
  transcriptUrl
) {
  try {
    const logChannel =
      await interaction.guild.channels.fetch(
        config.channels
          .ticketLogs
      );

    if (!logChannel) {
      return;
    }

    const embed =
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(
          "🎫 Ticket cerrado"
        )
        .addFields(
          {
            name:
              "Ticket",
            value:
              `\`${ticket.id}\``,
            inline: true,
          },
          {
            name:
              "Usuario",
            value:
              `<@${ticket.userId}>`,
            inline: true,
          },
          {
            name:
              "Categoría",
            value:
              TICKET_TYPES[
                ticket.type
              ]?.label ||
              ticket.type,
            inline: true,
          },
          {
            name:
              "Staff",
            value:
              ticket.claimedBy
                ? `<@${ticket.claimedBy}>`
                : "No reclamado",
            inline: true,
          }
        )
        .setTimestamp();

    if (transcriptUrl) {
      embed.addFields({
        name:
          "Transcripción",
        value:
          `[Abrir transcript](${transcriptUrl})`,
      });
    }

    await logChannel.send({
      embeds: [embed],
    });

  } catch (error) {
    console.error(
      "❌ Error enviando log:",
      error
    );
  }
}

// ==================================================
// MANEJAR INTERACCIONES
// ==================================================

async function handleTicketInteraction(
  interaction
) {
  // ==============================================
  // SELECTOR PRINCIPAL
  // ==============================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      "ticket_category"
  ) {
    const value =
      interaction.values[0];

    if (
      value ===
      "general_support"
    ) {
      await showGeneralSupportModal(
        interaction
      );

      return true;
    }

    if (
      value ===
      "get_help"
    ) {
      await showGetHelpModal(
        interaction
      );

      return true;
    }

    if (
      value ===
      "report_bugs"
    ) {
      await showBugMenu(
        interaction
      );

      return true;
    }

    if (
      value ===
      "other"
    ) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "ticket_modal_other"
          )
          .setTitle(
            "Other"
          );

      const input =
        new TextInputBuilder()
          .setCustomId(
            "ticket_reason"
          )
          .setLabel(
            "¿En qué podemos ayudarte?"
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(
            1000
          );

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          input
        )
      );

      await interaction.showModal(
        modal
      );

      return true;
    }
  }

  // ==============================================
  // BUG SELECTOR
  // ==============================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      "ticket_bug_type"
  ) {
    const bugType =
      interaction.values[0];

    const modal =
      new ModalBuilder()
        .setCustomId(
          `ticket_modal_bug_${bugType}`
        )
        .setTitle(
          "Report Bugs"
        );

    const input =
      new TextInputBuilder()
        .setCustomId(
          "ticket_reason"
        )
        .setLabel(
          "Describe el bug"
        )
        .setStyle(
          TextInputStyle.Paragraph
        )
        .setRequired(true)
        .setMaxLength(
          1500
        )
        .setPlaceholder(
          "Explica qué ocurrió..."
        );

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        input
      )
    );

    await interaction.showModal(
      modal
    );

    return true;
  }

  // ==============================================
  // MODALES
  // ==============================================

  if (
    interaction.isModalSubmit()
  ) {
    if (
      interaction.customId ===
      "ticket_modal_general"
    ) {
      const reason =
        interaction.fields.getTextInputValue(
          "ticket_reason"
        );

      await createTicket(
        interaction,
        "general_support",
        reason
      );

      return true;
    }

    if (
      interaction.customId ===
      "ticket_modal_help"
    ) {
      const reason =
        interaction.fields.getTextInputValue(
          "ticket_reason"
        );

      await createTicket(
        interaction,
        "get_help",
        reason
      );

      return true;
    }

    if (
      interaction.customId ===
      "ticket_modal_other"
    ) {
      const reason =
        interaction.fields.getTextInputValue(
          "ticket_reason"
        );

      await createTicket(
        interaction,
        "other",
        reason
      );

      return true;
    }

    if (
      interaction.customId.startsWith(
        "ticket_modal_bug_"
      )
    ) {
      const reason =
        interaction.fields.getTextInputValue(
          "ticket_reason"
        );

      await createTicket(
        interaction,
        "report_bugs",
        reason
      );

      return true;
    }
  }

  // ==============================================
  // BOTONES
  // ==============================================

  if (
    interaction.isButton()
  ) {
    if (
      interaction.customId ===
      "ticket_claim"
    ) {
      await claimTicket(
        interaction
      );

      return true;
    }

    if (
      interaction.customId ===
      "ticket_close"
    ) {
      await closeTicket(
        interaction
      );

      return true;
    }

    if (
      interaction.customId ===
      "ticket_cancel_close"
    ) {
      await cancelClose(
        interaction
      );

      return true;
    }

    if (
      interaction.customId ===
      "ticket_confirm_close"
    ) {
      await confirmClose(
        interaction
      );

      return true;
    }
  }

  return false;
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  sendTicketsPanel,
  handleTicketInteraction,
  collectTicketMessages,
  collectTicketThreads,
};