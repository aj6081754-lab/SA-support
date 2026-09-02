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

// ==================================================
// MEMORIA DE TICKETS
// ==================================================

const tickets = new Map();

// ==================================================
// UTILIDADES
// ==================================================

function getTicketId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getCategoryInfo(type) {
  const categories = {
    general_support: {
      name: "General Support",
      emoji: config.emojis.generalSupport,
    },

    report_bugs: {
      name: "Report Bugs",
      emoji: config.emojis.reportBugs,
    },

    get_help: {
      name: "Get Help",
      emoji: config.emojis.getHelp,
    },

    other: {
      name: "Other",
      emoji: config.emojis.other,
    },
  };

  return categories[type];
}

function isStaff(interaction) {
  return (
    interaction.member?.roles?.cache?.has(
      config.roles.staff
    ) || false
  );
}

// ==================================================
// PANEL PRINCIPAL
// ==================================================

async function sendTicketsPanel(client) {
  const channel = await client.channels.fetch(
    config.channels.ticketsPanel
  );

  if (!channel) {
    throw new Error(
      "No se encontró el canal del panel de tickets."
    );
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_category")
    .setPlaceholder("Select a ticket type")
    .addOptions(
      {
        label: "General Support",
        description: "Get support from the staff team",
        value: "general_support",
        emoji: config.emojis.generalSupport,
      },
      {
        label: "Report Bugs",
        description: "Report a bug",
        value: "report_bugs",
        emoji: config.emojis.reportBugs,
      },
      {
        label: "Get Help",
        description: "Get help and answers",
        value: "get_help",
        emoji: config.emojis.getHelp,
      },
      {
        label: "Other",
        description: "Other problems or requests",
        value: "other",
        emoji: config.emojis.other,
      }
    );

  const row = new ActionRowBuilder().addComponents(
    menu
  );

  // ==================================================
  // COMPONENTS V2
  // ==================================================

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# SA Support tickets ${config.emojis.getHelp}`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**${config.emojis.generalSupport} General Support**\n` +
          `Get Support from the staff team\n` +
          `-# questions about the bot goes in get help\n\n` +

          `**${config.emojis.reportBugs} Report Bugs**\n` +
          `Report bot, server or support bot bugs\n\n` +

          `**${config.emojis.getHelp} Get Help**\n` +
          `Get help to config bot, answer your questions and other things related\n\n` +

          `**${config.emojis.other} Other**\n` +
          `any panel describes your problem? Open this ticket tu get support\n\n` +

          `-# Joke tickets can be Sanctioned ${config.emojis.reportBugs}`
      )
    )
    .addActionRowComponents(row);

  const messages = await channel.messages.fetch({
    limit: 50,
  });

  const existing = messages.find(
    (message) =>
      message.author.id === client.user.id &&
      message.flags.has(MessageFlags.IsComponentsV2) &&
      message.components.some((component) =>
        component.type === 17
      )
  );

  if (existing) {
    return existing;
  }

  return await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

// ==================================================
// PREGUNTA GENERAL SUPPORT
// ==================================================

async function showGeneralSupportModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("ticket_general_support_modal")
    .setTitle("General Support");

  const input = new TextInputBuilder()
    .setCustomId("ticket_question")
    .setLabel("¿Que necesitas?")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      "Describe lo que necesitas..."
    )
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  await interaction.showModal(modal);
}

// ==================================================
// PREGUNTA GET HELP
// ==================================================

async function showGetHelpModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("ticket_get_help_modal")
    .setTitle("Get Help");

  const input = new TextInputBuilder()
    .setCustomId("ticket_question")
    .setLabel("¿Cuál es tu duda?")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      "Escribe tu pregunta..."
    )
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  await interaction.showModal(modal);
}

// ==================================================
// REPORT BUGS
// ==================================================

async function showBugMenu(interaction) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_bug_type")
    .setPlaceholder("Select the type of bug")
    .addOptions(
      {
        label: "Server bugs",
        value: "Server bugs",
        description: "Report a server bug",
      },
      {
        label: "Bot bugs",
        value: "Bot bugs",
        description: "Report a bot bug",
      },
      {
        label: "Web bugs",
        value: "Web bugs",
        description: "Report a web bug",
      },
      {
        label: "Support bot bugs",
        value: "Support bot bugs",
        description: "Report a support bot bug",
      },
      {
        label: "Other bugs",
        value: "Other bugs",
        description: "Report another type of bug",
      }
    );

  const row = new ActionRowBuilder().addComponents(
    menu
  );

  await interaction.reply({
    content:
      "Select the type of bug you want to report.",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ==================================================
// CREAR TICKET
// ==================================================

async function createTicket(
  interaction,
  type,
  question = null,
  bugType = null
) {
  const guild = interaction.guild;

  if (!guild) {
    return;
  }

  // ==================================================
  // COMPROBAR SI YA TIENE TICKET
  // ==================================================

  const existingTicket = [...tickets.values()].find(
    (ticket) =>
      ticket.userId === interaction.user.id &&
      ticket.status === "open"
  );

  if (existingTicket) {
    await interaction.reply({
      content:
        `Ya tienes un ticket abierto: <#${existingTicket.channelId}>`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const category = getCategoryInfo(type);

  const ticketId = getTicketId();

  const channelName =
    `${type.replace(/_/g, "-")}-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 90);

  const staffRole =
    guild.roles.cache.get(
      config.roles.staff
    );

  // ==================================================
  // PERMISOS INICIALES
  // ==================================================

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },

    // CREADOR
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },

    // BOT
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  // STAFF
  if (staffRole) {
    permissionOverwrites.push({
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  // ==================================================
  // CREAR CANAL
  // ==================================================

  const channel =
    await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
    });

  // ==================================================
  // GUARDAR TICKET
  // ==================================================

  const ticket = {
    id: ticketId,
    channelId: channel.id,
    userId: interaction.user.id,
    claimedBy: null,
    type,
    question,
    bugType,
    status: "open",
    createdAt: Date.now(),
    messages: [],
  };

  tickets.set(ticketId, ticket);

  // ==================================================
  // EMBED DEL TICKET
  // ==================================================

  const embed = new EmbedBuilder()
    .setTitle(
      `SA Support tickets ${config.emojis.getHelp}`
    )
    .setDescription(
      `**Selected panel:** ${category.emoji} ${category.name}\n\n` +

        `**User info:**\n` +
        `user: <@${interaction.user.id}>\n` +
        `id: \`${interaction.user.id}\`\n\n` +

        `**Questions:**\n` +
        (
          question
            ? `**1.** ${
                type === "get_help"
                  ? "¿Cuál es tu duda?"
                  : "¿Que necesitas?"
              }\n` +
              `> ${question}`
            : bugType
              ? `**1.** Bug type\n` +
                `> ${bugType}`
              : `> No questions provided.`
        )
    )
    .setColor(0xffd700)
    .setTimestamp();

  // ==================================================
  // BOTONES
  // ==================================================

  const buttons =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `ticket_claim:${ticketId}`
        )
        .setLabel("Reclamar ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji(config.emojis.claim),

      new ButtonBuilder()
        .setCustomId(
          `ticket_close:${ticketId}`
        )
        .setLabel("Cerrar ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(config.emojis.close)
    );

  // ==================================================
  // MENSAJE PRINCIPAL
  // STAFF + CREADOR + EMBED EN EL MISMO MENSAJE
  // ==================================================

  const mentions =
    staffRole
      ? `<@&${staffRole.id}> <@${interaction.user.id}>`
      : `<@${interaction.user.id}>`;

  await channel.send({
    content: mentions,

    embeds: [embed],

    components: [buttons],

    allowedMentions: {
      roles: staffRole
        ? [staffRole.id]
        : [],
      users: [
        interaction.user.id,
      ],
    },
  });

  // ==================================================
  // RESPUESTA AL USUARIO
  // ==================================================

  if (
    interaction.isRepliable() &&
    !interaction.replied &&
    !interaction.deferred
  ) {
    await interaction.reply({
      content:
        `${category.emoji} Tu ticket fue creado: <#${channel.id}>`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ==================================================
// RECLAMAR TICKET
// ==================================================

async function claimTicket(
  interaction,
  ticketId
) {
  const ticket = tickets.get(ticketId);

  if (!ticket) {
    await interaction.reply({
      content:
        "Este ticket ya no existe.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ==================================================
  // SOLO STAFF PUEDE RECLAMAR
  // ==================================================

  if (!isStaff(interaction)) {
    await interaction.reply({
      content:
        "No tienes permiso para reclamar tickets.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ==================================================
  // COMPROBAR SI YA ESTÁ RECLAMADO
  // ==================================================

  if (ticket.claimedBy) {
    await interaction.reply({
      content:
        `Este ticket ya fue reclamado por <@${ticket.claimedBy}>.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  ticket.claimedBy =
    interaction.user.id;

  const channel =
    interaction.channel;

  // ==================================================
  // QUITAR ACCESO AL STAFF GENERAL
  // ==================================================

  await channel.permissionOverwrites.edit(
    config.roles.staff,
    {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    }
  );

  // ==================================================
  // CREADOR
  // ==================================================

  await channel.permissionOverwrites.edit(
    ticket.userId,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }
  );

  // ==================================================
  // STAFF QUE RECLAMÓ
  // ==================================================

  await channel.permissionOverwrites.edit(
    interaction.user.id,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }
  );

  // ==================================================
  // EMBED DE TICKET RECLAMADO
  // ==================================================

  const embed = new EmbedBuilder()
    .setTitle(
      `ticket reclamado ${config.emojis.claim}`
    )
    .setDescription(
      `ahora <@${interaction.user.id}> sera el encargado de atenderte, por favor se paciente y trátalo con respeto`
    )
    .setColor(0xffd700)
    .setTimestamp();

  // ==================================================
  // CREATOR PING + EMBED EN EL MISMO MENSAJE
  // ==================================================

  await channel.send({
    content: `<@${ticket.userId}>`,
    embeds: [embed],

    allowedMentions: {
      users: [
        ticket.userId,
      ],
    },
  });

  // ==================================================
  // RESPUESTA AL STAFF
  // ==================================================

  await interaction.reply({
    content:
      `${config.emojis.claim} Ticket reclamado correctamente.`,
    flags: MessageFlags.Ephemeral,
  });
}

// ==================================================
// CERRAR TICKET
// ==================================================

async function closeTicket(
  interaction,
  ticketId
) {
  const ticket = tickets.get(ticketId);

  if (!ticket) {
    await interaction.reply({
      content:
        "Este ticket ya no existe.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ==================================================
  // SOLO STAFF PUEDE CERRAR
  // ==================================================

  if (!isStaff(interaction)) {
    await interaction.reply({
      content:
        "❌ Solo el Staff puede cerrar tickets.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(
      "¿Seguro que quieres borrar este ticket?"
    )
    .setColor(0xffd700);

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `ticket_confirm_close:${ticketId}`
        )
        .setLabel("Sí, guardar y cerrar")
        .setStyle(ButtonStyle.Success)
        .setEmoji(config.emojis.accept),

      new ButtonBuilder()
        .setCustomId(
          `ticket_cancel_close:${ticketId}`
        )
        .setLabel("No, cancelar proceso")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(config.emojis.deny)
    );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
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
      "El cierre del ticket fue cancelado.",
    embeds: [],
    components: [],
  });
}

// ==================================================
// CERRAR DEFINITIVAMENTE
// ==================================================

async function confirmClose(
  interaction,
  ticketId
) {
  const ticket = tickets.get(ticketId);

  if (!ticket) {
    await interaction.update({
      content:
        "Este ticket ya no existe.",
      embeds: [],
      components: [],
    });

    return;
  }

  // ==================================================
  // SEGURIDAD:
  // VOLVER A COMPROBAR STAFF
  // ==================================================

  if (!isStaff(interaction)) {
    await interaction.update({
      content:
        "❌ Solo el Staff puede cerrar tickets.",
      embeds: [],
      components: [],
    });

    return;
  }

  ticket.status = "closed";

  await interaction.update({
    content:
      "💾 Guardando ticket y preparando el cierre...",
    embeds: [],
    components: [],
  });

  // ==================================================
  // LOG
  // ==================================================

  await sendTicketLog(
    interaction.client,
    ticket
  );

  tickets.delete(ticketId);

  // ==================================================
  // ELIMINAR CANAL
  // ==================================================

  setTimeout(async () => {
    try {
      await interaction.channel.delete(
        "Ticket cerrado"
      );
    } catch (error) {
      console.error(
        "❌ Error eliminando ticket:",
        error
      );
    }
  }, 1500);
}

// ==================================================
// LOG
// ==================================================

async function sendTicketLog(
  client,
  ticket
) {
  try {
    const channel =
      await client.channels.fetch(
        config.channels.ticketLogs
      );

    if (!channel) {
      return;
    }

    const category =
      getCategoryInfo(ticket.type);

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket cerrado")
      .setColor(0xed4245)
      .addFields(
        {
          name: "Ticket ID",
          value: `\`${ticket.id}\``,
          inline: true,
        },
        {
          name: "Usuario",
          value: `<@${ticket.userId}>`,
          inline: true,
        },
        {
          name: "Categoría",
          value: `${category.emoji} ${category.name}`,
          inline: true,
        },
        {
          name: "Staff",
          value: ticket.claimedBy
            ? `<@${ticket.claimedBy}>`
            : "No reclamado",
          inline: true,
        }
      )
      .setTimestamp();

    await channel.send({
      embeds: [embed],
    });
  } catch (error) {
    console.error(
      "❌ Error enviando log de ticket:",
      error
    );
  }
}

// ==================================================
// MANEJADOR PRINCIPAL
// ==================================================

async function handleTicketInteraction(
  interaction
) {
  // ==================================================
  // SELECTOR PRINCIPAL
  // ==================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      "ticket_category"
  ) {
    const type =
      interaction.values[0];

    if (type === "general_support") {
      await showGeneralSupportModal(
        interaction
      );

      return true;
    }

    if (type === "report_bugs") {
      await showBugMenu(
        interaction
      );

      return true;
    }

    if (type === "get_help") {
      await showGetHelpModal(
        interaction
      );

      return true;
    }

    if (type === "other") {
      await createTicket(
        interaction,
        "other"
      );

      return true;
    }
  }

  // ==================================================
  // MODAL GENERAL SUPPORT
  // ==================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId ===
      "ticket_general_support_modal"
  ) {
    const question =
      interaction.fields.getTextInputValue(
        "ticket_question"
      );

    await createTicket(
      interaction,
      "general_support",
      question
    );

    return true;
  }

  // ==================================================
  // MODAL GET HELP
  // ==================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId ===
      "ticket_get_help_modal"
  ) {
    const question =
      interaction.fields.getTextInputValue(
        "ticket_question"
      );

    await createTicket(
      interaction,
      "get_help",
      question
    );

    return true;
  }

  // ==================================================
  // SELECTOR DE BUGS
  // ==================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      "ticket_bug_type"
  ) {
    const bugType =
      interaction.values[0];

    await createTicket(
      interaction,
      "report_bugs",
      null,
      bugType
    );

    return true;
  }

  // ==================================================
  // RECLAMAR
  // ==================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "ticket_claim:"
    )
  ) {
    const ticketId =
      interaction.customId.split(":")[1];

    await claimTicket(
      interaction,
      ticketId
    );

    return true;
  }

  // ==================================================
  // CERRAR
  // ==================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "ticket_close:"
    )
  ) {
    const ticketId =
      interaction.customId.split(":")[1];

    await closeTicket(
      interaction,
      ticketId
    );

    return true;
  }

  // ==================================================
  // CONFIRMAR CIERRE
  // ==================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "ticket_confirm_close:"
    )
  ) {
    const ticketId =
      interaction.customId.split(":")[1];

    await confirmClose(
      interaction,
      ticketId
    );

    return true;
  }

  // ==================================================
  // CANCELAR CIERRE
  // ==================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      "ticket_cancel_close:"
    )
  ) {
    await cancelClose(
      interaction
    );

    return true;
  }

  return false;
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  sendTicketsPanel,
  handleTicketInteraction,
};