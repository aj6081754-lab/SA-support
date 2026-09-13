const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// ==================================================
// CONFIGURACIÓN
// ==================================================

const LOG_CHANNEL_ID =
  "1544542614836215888";

// ==================================================
// FORMATO DE FECHA
// ==================================================

function formatDate(date) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(date);
}

// ==================================================
// OBTENER CANAL DE LOGS
// ==================================================

function getLogChannel(guild) {
  const channel =
    guild.channels.cache.get(
      LOG_CHANNEL_ID
    );

  if (!channel) {
    console.error(
      `❌ No se encontró el canal de logs en ${guild.name}.`
    );

    return null;
  }

  return channel;
}

// ==================================================
// BOTONES DE LOG
// ==================================================

function createLogButtons(
  executorId,
  messageUrl = null
) {
  const buttons = [
    new ButtonBuilder()
      .setCustomId(
        `log_executor_${executorId}`
      )
      .setLabel(
        "Id del responsable"
      )
      .setStyle(
        ButtonStyle.Secondary
      ),
  ];

  if (messageUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel(
          "Ir al mensaje"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          messageUrl
        )
    );
  }

  return [
    new ActionRowBuilder()
      .addComponents(buttons),
  ];
}

// ==================================================
// ENVIAR LOG
// ==================================================

async function sendLog(
  guild,
  {
    executor = null,
    location = "Desconocido",
    action = "Acción desconocida",
    details = null,
    color = 0x5865f2,
    messageUrl = null,
  }
) {
  try {
    const channel =
      getLogChannel(guild);

    if (!channel) return;

    const embed =
      new EmbedBuilder()
        .setColor(color)
        .setTitle("Registro de acción")
        .addFields(
          {
            name: "Fecha y hora",
            value: `\`${formatDate(new Date())}\``,
            inline: false,
          },
          {
            name: "Quién lo hizo",
            value: executor
              ? `${executor}`
              : "Desconocido",
            inline: true,
          },
          {
            name: "ID",
            value: executor
              ? `\`${executor.id}\``
              : "`Desconocido`",
            inline: true,
          },
          {
            name: "Dónde pasó",
            value: location,
            inline: false,
          },
          {
            name: "Acción",
            value: action,
            inline: false,
          }
        );

    if (details) {
      embed.addFields({
        name: "Detalles",
        value: details,
        inline: false,
      });
    }

    const components =
      executor
        ? createLogButtons(
            executor.id,
            messageUrl
          )
        : [];

    await channel.send({
      embeds: [embed],
      components,
    });

  } catch (error) {
    console.error(
      "❌ Error enviando log:",
      error
    );
  }
}

// ==================================================
// INTERACCIONES DE BOTONES
// ==================================================

async function handleLogButtonInteraction(
  interaction
) {
  if (
    !interaction.isButton()
  ) {
    return false;
  }

  if (
    !interaction.customId.startsWith(
      "log_executor_"
    )
  ) {
    return false;
  }

  const executorId =
    interaction.customId.replace(
      "log_executor_",
      ""
    );

  await interaction.reply({
    content:
      `🆔 **ID del responsable:** \`${executorId}\``,
    ephemeral: true,
  });

  return true;
}

// ==================================================
// EXPORTAR
// ==================================================

module.exports = {
  sendLog,
  getLogChannel,
  formatDate,
  handleLogButtonInteraction,
};