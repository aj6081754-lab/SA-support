const {
  EmbedBuilder,
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

    await channel.send({
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
// EXPORTAR
// ==================================================

module.exports = {
  sendLog,
  getLogChannel,
  formatDate,
};