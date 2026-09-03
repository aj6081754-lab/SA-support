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
  StringSelectMenuBuilder,
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

db.prepare(`
  CREATE TABLE IF NOT EXISTS saved_embeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
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
// OBTENER MENSAJE DEL BUILDER
// ==================================================

async function getBuilderMessage(
  client,
  builder
) {
  try {
    if (
      !builder.guildId ||
      !builder.channelId ||
      !builder.messageId
    ) {
      return null;
    }

    const guild =
      client.guilds.cache.get(
        builder.guildId
      );

    if (!guild) {
      return null;
    }

    const channel =
      guild.channels.cache.get(
        builder.channelId
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return null;
    }

    const message =
      await channel.messages.fetch(
        builder.messageId
      );

    return message;
  } catch (error) {
    console.error(
      "❌ No se pudo obtener el mensaje del builder:",
      error
    );

    return null;
  }
}

// ==================================================
// ACTUALIZAR BUILDER
// ==================================================

async function updateBuilderMessage(
  interaction,
  builder
) {
  try {
    const message =
      await getBuilderMessage(
        interaction.client,
        builder
      );

    if (!message) {
      return false;
    }

    if (
      builder.type === "message"
    ) {
      await message.edit({
        embeds: [
          createMessageBuilder(
            builder.content
          ),
        ],
        components: [
          createMessageBuilderButtons(),
        ],
      });

      return true;
    }

    if (
      builder.type === "embed"
    ) {
      await message.edit({
        embeds: [
          createEmbedBuilderEmbed(
            builder.data
          ),
        ],
        components: [
          createEmbedBuilderButtons(),
        ],
        content: null,
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error(
      "❌ Error actualizando el builder:",
      error
    );

    return false;
  }
}

// ==================================================
// MESSAGE BUILDER
// ==================================================

function createMessageBuilder(
  content = ""
) {
  const preview =
    content.trim() ||
    "Sin contenido";

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(
      "MESSAGE BUILDER"
    )
    .setDescription(
      "**Contenido**\n" +
        `> ${
          content.trim() ||
          "Sin contenido"
        }\n\n` +
        "**Vista previa**\n" +
        "```text\n" +
        preview +
        "\n```"
    );
}

// ==================================================
// BOTONES MESSAGE BUILDER
// ==================================================

function createMessageBuilderButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        "message_edit_content"
      )
      .setLabel(
        "Editar contenido"
      )
      .setStyle(
        ButtonStyle.Primary
      ),

    new ButtonBuilder()
      .setCustomId(
        "message_save"
      )
      .setLabel(
        "Guardar"
      )
      .setStyle(
        ButtonStyle.Success
      ),

    new ButtonBuilder()
      .setCustomId(
        "message_cancel"
      )
      .setLabel(
        "Cancelar"
      )
      .setStyle(
        ButtonStyle.Danger
      )
  );
}

// ==================================================
// DATOS DEFAULT DEL EMBED
// ==================================================

function createDefaultEmbedData() {
  return {
    title: "",
    description: "",
    color: "#5865F2",

    author: {
      name: "",
      iconURL: "",
      url: "",
    },

    footer: {
      text: "",
      iconURL: "",
    },

    image: "",
    thumbnail: "",
    timestamp: false,
    fields: [],
  };
}

// ==================================================
// CREAR EMBED REAL
// ==================================================

function buildDiscordEmbed(
  data
) {
  const embed =
    new EmbedBuilder();

  // COLOR
  if (
    data.color &&
    /^#[0-9A-Fa-f]{6}$/.test(
      data.color
    )
  ) {
    embed.setColor(
      data.color
    );
  } else {
    embed.setColor(
      0x5865f2
    );
  }

  // TÍTULO
  if (
    data.title?.trim()
  ) {
    embed.setTitle(
      data.title.trim()
    );
  }

  // DESCRIPCIÓN
  if (
    data.description?.trim()
  ) {
    embed.setDescription(
      data.description.trim()
    );
  }

  // AUTOR
  if (
    data.author?.name?.trim()
  ) {
    const author = {
      name:
        data.author.name.trim(),
    };

    if (
      data.author.url?.trim()
    ) {
      author.url =
        data.author.url.trim();
    }

    if (
      data.author.iconURL?.trim()
    ) {
      author.iconURL =
        data.author.iconURL.trim();
    }

    embed.setAuthor(
      author
    );
  }

  // FOOTER
  if (
    data.footer?.text?.trim()
  ) {
    const footer = {
      text:
        data.footer.text.trim(),
    };

    if (
      data.footer.iconURL?.trim()
    ) {
      footer.iconURL =
        data.footer.iconURL.trim();
    }

    embed.setFooter(
      footer
    );
  }

  // IMAGEN
  if (
    data.image?.trim()
  ) {
    try {
      embed.setImage(
        data.image.trim()
      );
    } catch {}
  }

  // THUMBNAIL
  if (
    data.thumbnail?.trim()
  ) {
    try {
      embed.setThumbnail(
        data.thumbnail.trim()
      );
    } catch {}
  }

  // TIMESTAMP
  if (
    data.timestamp
  ) {
    embed.setTimestamp();
  }

  // CAMPOS
  if (
    Array.isArray(
      data.fields
    ) &&
    data.fields.length > 0
  ) {
    for (
      const field of data.fields
    ) {
      if (
        field.name?.trim() &&
        field.value?.trim()
      ) {
        embed.addFields({
          name:
            field.name.trim(),
          value:
            field.value.trim(),
          inline:
            Boolean(field.inline),
        });
      }
    }
  }

  return embed;
}

// ==================================================
// VISTA DEL EMBED BUILDER
// ==================================================

function createEmbedBuilderEmbed(
  data
) {
  const embed =
    buildDiscordEmbed(
      data
    );

  /*
   * Solo mostramos EMBED BUILDER
   * cuando el embed está completamente
   * vacío.
   */

  const isEmpty =
    !data.title?.trim() &&
    !data.description?.trim() &&
    !data.author?.name?.trim() &&
    !data.footer?.text?.trim() &&
    !data.image?.trim() &&
    !data.thumbnail?.trim() &&
    !data.fields?.length &&
    !data.timestamp;

  if (isEmpty) {
    embed.setTitle(
      "EMBED BUILDER"
    );

    embed.setDescription(
      "Usa el botón **Editar** para comenzar a crear tu embed."
    );
  }

  return embed;
}

// ==================================================
// BOTONES EMBED BUILDER
// ==================================================

function createEmbedBuilderButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        "embed_edit"
      )
      .setLabel(
        "Editar"
      )
      .setStyle(
        ButtonStyle.Primary
      ),

    new ButtonBuilder()
      .setCustomId(
        "embed_save"
      )
      .setLabel(
        "Guardar"
      )
      .setStyle(
        ButtonStyle.Success
      ),

    new ButtonBuilder()
      .setCustomId(
        "embed_cancel"
      )
      .setLabel(
        "Cancelar"
      )
      .setStyle(
        ButtonStyle.Danger
      )
  );
}

// ==================================================
// MENÚ PRINCIPAL DE EDICIÓN
// ==================================================

function createEmbedEditMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(
        "embed_edit_property"
      )
      .setPlaceholder(
        "Selecciona qué quieres editar"
      )
      .addOptions([
        {
          label: "Título",
          value: "title",
          description:
            "Editar el título del embed",
        },
        {
          label: "Descripción",
          value: "description",
          description:
            "Editar la descripción",
        },
        {
          label: "Color",
          value: "color",
          description:
            "Cambiar el color",
        },
        {
          label: "Autor",
          value: "author",
          description:
            "Editar el autor",
        },
        {
          label: "Footer",
          value: "footer",
          description:
            "Editar el footer",
        },
        {
          label: "Imagen",
          value: "image",
          description:
            "Agregar o cambiar la imagen",
        },
        {
          label: "Thumbnail",
          value: "thumbnail",
          description:
            "Agregar o cambiar el thumbnail",
        },
        {
          label: "Timestamp",
          value: "timestamp",
          description:
            "Activar o desactivar la fecha",
        },
        {
          label: "Campos",
          value: "fields",
          description:
            "Agregar, editar o eliminar campos",
        },
      ])
  );
}

// ==================================================
// MENÚ DE CAMPOS
// ==================================================

function createFieldsMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(
        "embed_fields_action"
      )
      .setPlaceholder(
        "Selecciona una acción"
      )
      .addOptions([
        {
          label:
            "Agregar campo",
          value: "add",
          description:
            "Agregar un nuevo campo",
        },
        {
          label:
            "Editar campo",
          value: "edit",
          description:
            "Editar un campo existente",
        },
        {
          label:
            "Eliminar campo",
          value: "delete",
          description:
            "Eliminar un campo",
        },
      ])
  );
}

// ==================================================
// COMANDOS
// ==================================================

const messageCommand =
  new SlashCommandBuilder()
    .setName("message")
    .setDescription(
      "Abre el constructor de mensajes."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages.toString()
    );

const embedCommand =
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription(
      "Abre el constructor de embeds."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages.toString()
    );

// ==================================================
// COMANDOS
// ==================================================

async function handleMessageCommand(
  interaction
) {
  if (
    !interaction.isChatInputCommand()
  ) {
    return false;
  }

  // ==================================================
  // /MESSAGE
  // ==================================================

  if (
    interaction.commandName ===
    "message"
  ) {
    const builder = {
      type: "message",
      guildId:
        interaction.guildId,
      channelId:
        interaction.channelId,
      messageId: null,
      content: "",
    };

    builders.set(
      interaction.user.id,
      builder
    );

    await interaction.reply({
      embeds: [
        createMessageBuilder(),
      ],
      components: [
        createMessageBuilderButtons(),
      ],
    });

    const message =
      await interaction.fetchReply();

    builder.messageId =
      message.id;

    return true;
  }

  // ==================================================
  // /EMBED
  // ==================================================

  if (
    interaction.commandName ===
    "embed"
  ) {
    const data =
      createDefaultEmbedData();

    const builder = {
      type: "embed",
      guildId:
        interaction.guildId,
      channelId:
        interaction.channelId,
      messageId: null,
      data,
    };

    builders.set(
      interaction.user.id,
      builder
    );

    await interaction.reply({
      embeds: [
        createEmbedBuilderEmbed(
          data
        ),
      ],
      components: [
        createEmbedBuilderButtons(),
      ],
    });

    const message =
      await interaction.fetchReply();

    builder.messageId =
      message.id;

    return true;
  }

  return false;
}

// ==================================================
// INTERACCIONES
// ==================================================

async function handleMessageInteraction(
  interaction
) {
  if (
    !interaction.isButton() &&
    !interaction.isModalSubmit() &&
    !interaction.isStringSelectMenu()
  ) {
    return false;
  }

  const validIds = [
    // MESSAGE
    "message_edit_content",
    "message_save",
    "message_cancel",
    "message_content_modal",
    "message_name_modal",

    // EMBED
    "embed_edit",
    "embed_save",
    "embed_cancel",
    "embed_edit_property",
    "embed_fields_action",

    "embed_title_modal",
    "embed_description_modal",
    "embed_color_modal",
    "embed_author_modal",
    "embed_footer_modal",
    "embed_image_modal",
    "embed_thumbnail_modal",

    "embed_field_add_modal",
    "embed_field_edit_select",
    "embed_field_edit_modal",
    "embed_field_delete_select",

    "embed_name_modal",
  ];

  if (
    !validIds.includes(
      interaction.customId
    )
  ) {
    return false;
  }

  const builder =
    builders.get(
      interaction.user.id
    );

  if (!builder) {
    await interaction.reply({
      content:
        "❌ Este constructor ya no está disponible.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // MESSAGE - EDITAR CONTENIDO
  // ==================================================

  if (
    interaction.customId ===
    "message_edit_content"
  ) {
    const modal =
      new ModalBuilder()
        .setCustomId(
          "message_content_modal"
        )
        .setTitle(
          "Editar contenido"
        );

    const input =
      new TextInputBuilder()
        .setCustomId(
          "message_content"
        )
        .setLabel(
          "Contenido"
        )
        .setStyle(
          TextInputStyle.Paragraph
        )
        .setRequired(false)
        .setMaxLength(4000)
        .setPlaceholder(
          "Escribe el contenido..."
        )
        .setValue(
          builder.content || ""
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

  // ==================================================
  // MESSAGE - MODAL CONTENIDO
  // ==================================================

  if (
    interaction.customId ===
    "message_content_modal"
  ) {
    builder.content =
      interaction.fields
        .getTextInputValue(
          "message_content"
        );

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Contenido actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // MESSAGE - GUARDAR
  // ==================================================

  if (
    interaction.customId ===
    "message_save"
  ) {
    if (
      !builder.content.trim()
    ) {
      await interaction.reply({
        content:
          "❌ No puedes guardar un mensaje vacío.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    const modal =
      new ModalBuilder()
        .setCustomId(
          "message_name_modal"
        )
        .setTitle(
          "Guardar mensaje"
        );

    const input =
      new TextInputBuilder()
        .setCustomId(
          "message_name"
        )
        .setLabel(
          "Nombre del mensaje"
        )
        .setStyle(
          TextInputStyle.Short
        )
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder(
          "Ej: bienvenida"
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

  // ==================================================
  // MESSAGE - GUARDAR NOMBRE
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
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

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
            `❌ Ya existe un mensaje llamado \`${name}\`.`,
          flags:
            MessageFlags.Ephemeral,
        });

        return true;
      }

      const now =
        Date.now();

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

      const message =
        await getBuilderMessage(
          interaction.client,
          builder
        );

      if (message) {
        await message.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(
                0x57f287
              )
              .setTitle(
                "MESSAGE BUILDER"
              )
              .setDescription(
                "**Mensaje guardado correctamente.**\n\n" +
                  `**Nombre:** \`${name}\`\n\n` +
                  "El mensaje está listo para utilizarse con `/send`."
              ),
          ],
          components: [],
        });
      }

      builders.delete(
        interaction.user.id
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
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }
  }

  // ==================================================
  // MESSAGE - CANCELAR
  // ==================================================

  if (
    interaction.customId ===
    "message_cancel"
  ) {
    const message =
      await getBuilderMessage(
        interaction.client,
        builder
      );

    if (message) {
      await message.edit({
        embeds: [],
        components: [],
        content:
          "❌ Constructor cancelado.",
      });
    }

    builders.delete(
      interaction.user.id
    );

    await interaction.deferUpdate();

    return true;
  }

  // ==================================================
  // EMBED - EDITAR
  // ==================================================

  if (
    interaction.customId ===
    "embed_edit"
  ) {
    const message =
      await getBuilderMessage(
        interaction.client,
        builder
      );

    if (message) {
      await message.edit({
        embeds: [
          createEmbedBuilderEmbed(
            builder.data
          ),
        ],
        components: [
          createEmbedEditMenu(),
        ],
      });
    }

    await interaction.deferUpdate();

    return true;
  }

  // ==================================================
  // EMBED - SELECCIONAR PROPIEDAD
  // ==================================================

  if (
    interaction.customId ===
    "embed_edit_property"
  ) {
    const property =
      interaction.values[0];

    // ==================================================
    // TIMESTAMP
    // ==================================================

    if (
      property === "timestamp"
    ) {
      builder.data.timestamp =
        !builder.data.timestamp;

      await updateBuilderMessage(
        interaction,
        builder
      );

      await interaction.deferUpdate();

      return true;
    }

    // ==================================================
    // CAMPOS
    // ==================================================

    if (
      property === "fields"
    ) {
      const message =
        await getBuilderMessage(
          interaction.client,
          builder
        );

      if (message) {
        await message.edit({
          embeds: [
            createEmbedBuilderEmbed(
              builder.data
            ),
          ],
          components: [
            createFieldsMenu(),
          ],
        });
      }

      await interaction.deferUpdate();

      return true;
    }

    // ==================================================
    // MODALES
    // ==================================================

    const modalMap = {
      title: {
        id:
          "embed_title_modal",
        title:
          "Editar título",
        label:
          "Título",
        customId:
          "embed_title",
        style:
          TextInputStyle.Short,
        max:
          256,
        placeholder:
          "Título del embed",
        value:
          builder.data.title,
      },

      description: {
        id:
          "embed_description_modal",
        title:
          "Editar descripción",
        label:
          "Descripción",
        customId:
          "embed_description",
        style:
          TextInputStyle.Paragraph,
        max:
          4000,
        placeholder:
          "Descripción del embed",
        value:
          builder.data.description,
      },

      color: {
        id:
          "embed_color_modal",
        title:
          "Editar color",
        label:
          "Color HEX",
        customId:
          "embed_color",
        style:
          TextInputStyle.Short,
        max:
          7,
        placeholder:
          "#5865F2",
        value:
          builder.data.color,
      },

      image: {
        id:
          "embed_image_modal",
        title:
          "Editar imagen",
        label:
          "URL de la imagen",
        customId:
          "embed_image",
        style:
          TextInputStyle.Short,
        max:
          2048,
        placeholder:
          "https://ejemplo.com/imagen.png",
        value:
          builder.data.image,
      },

      thumbnail: {
        id:
          "embed_thumbnail_modal",
        title:
          "Editar thumbnail",
        label:
          "URL del thumbnail",
        customId:
          "embed_thumbnail",
        style:
          TextInputStyle.Short,
        max:
          2048,
        placeholder:
          "https://ejemplo.com/imagen.png",
        value:
          builder.data.thumbnail,
      },
    };

    const modalConfig =
      modalMap[property];

    if (modalConfig) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            modalConfig.id
          )
          .setTitle(
            modalConfig.title
          );

      const input =
        new TextInputBuilder()
          .setCustomId(
            modalConfig.customId
          )
          .setLabel(
            modalConfig.label
          )
          .setStyle(
            modalConfig.style
          )
          .setRequired(false)
          .setMaxLength(
            modalConfig.max
          )
          .setPlaceholder(
            modalConfig.placeholder
          )
          .setValue(
            modalConfig.value || ""
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

    // ==================================================
    // AUTOR
    // ==================================================

    if (
      property === "author"
    ) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "embed_author_modal"
          )
          .setTitle(
            "Editar autor"
          );

      const name =
        new TextInputBuilder()
          .setCustomId(
            "author_name"
          )
          .setLabel(
            "Nombre del autor"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(false)
          .setMaxLength(256)
          .setValue(
            builder.data.author
              .name || ""
          );

      const icon =
        new TextInputBuilder()
          .setCustomId(
            "author_icon"
          )
          .setLabel(
            "URL del icono"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(false)
          .setMaxLength(2048)
          .setValue(
            builder.data.author
              .iconURL || ""
          );

      const url =
        new TextInputBuilder()
          .setCustomId(
            "author_url"
          )
          .setLabel(
            "URL del autor"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(false)
          .setMaxLength(2048)
          .setValue(
            builder.data.author
              .url || ""
          );

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          name
        ),
        new ActionRowBuilder().addComponents(
          icon
        ),
        new ActionRowBuilder().addComponents(
          url
        )
      );

      await interaction.showModal(
        modal
      );

      return true;
    }

    // ==================================================
    // FOOTER
    // ==================================================

    if (
      property === "footer"
    ) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "embed_footer_modal"
          )
          .setTitle(
            "Editar footer"
          );

      const text =
        new TextInputBuilder()
          .setCustomId(
            "footer_text"
          )
          .setLabel(
            "Texto del footer"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(false)
          .setMaxLength(2048)
          .setValue(
            builder.data.footer
              .text || ""
          );

      const icon =
        new TextInputBuilder()
          .setCustomId(
            "footer_icon"
          )
          .setLabel(
            "URL del icono"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(false)
          .setMaxLength(2048)
          .setValue(
            builder.data.footer
              .iconURL || ""
          );

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          text
        ),
        new ActionRowBuilder().addComponents(
          icon
        )
      );

      await interaction.showModal(
        modal
      );

      return true;
    }
  }

  // ==================================================
  // EMBED - ACCIONES DE CAMPOS
  // ==================================================

  if (
    interaction.customId ===
    "embed_fields_action"
  ) {
    const action =
      interaction.values[0];

    // AGREGAR
    if (
      action === "add"
    ) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "embed_field_add_modal"
          )
          .setTitle(
            "Agregar campo"
          );

      const name =
        new TextInputBuilder()
          .setCustomId(
            "field_name"
          )
          .setLabel(
            "Nombre"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true)
          .setMaxLength(256);

      const value =
        new TextInputBuilder()
          .setCustomId(
            "field_value"
          )
          .setLabel(
            "Valor"
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1024);

      const inline =
        new TextInputBuilder()
          .setCustomId(
            "field_inline"
          )
          .setLabel(
            "Inline: sí o no"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(false)
          .setMaxLength(3)
          .setPlaceholder(
            "sí / no"
          );

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          name
        ),
        new ActionRowBuilder().addComponents(
          value
        ),
        new ActionRowBuilder().addComponents(
          inline
        )
      );

      await interaction.showModal(
        modal
      );

      return true;
    }

    // EDITAR
    if (
      action === "edit"
    ) {
      if (
        builder.data.fields.length ===
        0
      ) {
        await interaction.reply({
          content:
            "❌ No hay campos para editar.",
          flags:
            MessageFlags.Ephemeral,
        });

        return true;
      }

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(
            "embed_field_edit_select"
          )
          .setPlaceholder(
            "Selecciona un campo"
          )
          .addOptions(
            builder.data.fields.map(
              (
                field,
                index
              ) => ({
                label:
                  `${index + 1}. ${field.name}`.slice(
                    0,
                    100
                  ),
                value:
                  String(index),
                description:
                  field.value.slice(
                    0,
                    100
                  ),
              })
            )
          );

      const message =
        await getBuilderMessage(
          interaction.client,
          builder
        );

      if (message) {
        await message.edit({
          embeds: [
            createEmbedBuilderEmbed(
              builder.data
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              menu
            ),
          ],
        });
      }

      await interaction.deferUpdate();

      return true;
    }

    // ELIMINAR
    if (
      action === "delete"
    ) {
      if (
        builder.data.fields.length ===
        0
      ) {
        await interaction.reply({
          content:
            "❌ No hay campos para eliminar.",
          flags:
            MessageFlags.Ephemeral,
        });

        return true;
      }

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(
            "embed_field_delete_select"
          )
          .setPlaceholder(
            "Selecciona un campo"
          )
          .addOptions(
            builder.data.fields.map(
              (
                field,
                index
              ) => ({
                label:
                  `${index + 1}. ${field.name}`.slice(
                    0,
                    100
                  ),
                value:
                  String(index),
              })
            )
          );

      const message =
        await getBuilderMessage(
          interaction.client,
          builder
        );

      if (message) {
        await message.edit({
          embeds: [
            createEmbedBuilderEmbed(
              builder.data
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              menu
            ),
          ],
        });
      }

      await interaction.deferUpdate();

      return true;
    }
  }

  // ==================================================
  // EDITAR CAMPO - SELECCIÓN
  // ==================================================

  if (
    interaction.customId ===
    "embed_field_edit_select"
  ) {
    const index =
      Number(
        interaction.values[0]
      );

    const field =
      builder.data.fields[index];

    if (!field) {
      await interaction.reply({
        content:
          "❌ Ese campo ya no existe.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    builder.editingField =
      index;

    const modal =
      new ModalBuilder()
        .setCustomId(
          "embed_field_edit_modal"
        )
        .setTitle(
          `Editar campo ${index + 1}`
        );

    const name =
      new TextInputBuilder()
        .setCustomId(
          "field_name"
        )
        .setLabel(
          "Nombre"
        )
        .setStyle(
          TextInputStyle.Short
        )
        .setRequired(true)
        .setMaxLength(256)
        .setValue(
          field.name
        );

    const value =
      new TextInputBuilder()
        .setCustomId(
          "field_value"
        )
        .setLabel(
          "Valor"
        )
        .setStyle(
          TextInputStyle.Paragraph
        )
        .setRequired(true)
        .setMaxLength(1024)
        .setValue(
          field.value
        );

    const inline =
      new TextInputBuilder()
        .setCustomId(
          "field_inline"
        )
        .setLabel(
          "Inline: sí o no"
        )
        .setStyle(
          TextInputStyle.Short
        )
        .setRequired(false)
        .setMaxLength(3)
        .setValue(
          field.inline
            ? "sí"
            : "no"
        );

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        name
      ),
      new ActionRowBuilder().addComponents(
        value
      ),
      new ActionRowBuilder().addComponents(
        inline
      )
    );

    await interaction.showModal(
      modal
    );

    return true;
  }

  // ==================================================
  // ELIMINAR CAMPO - SELECCIÓN
  // ==================================================

  if (
    interaction.customId ===
    "embed_field_delete_select"
  ) {
    const index =
      Number(
        interaction.values[0]
      );

    if (
      !builder.data.fields[index]
    ) {
      await interaction.reply({
        content:
          "❌ Ese campo ya no existe.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    builder.data.fields.splice(
      index,
      1
    );

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.deferUpdate();

    return true;
  }

  // ==================================================
  // TÍTULO
  // ==================================================

  if (
    interaction.customId ===
    "embed_title_modal"
  ) {
    builder.data.title =
      interaction.fields
        .getTextInputValue(
          "embed_title"
        )
        .trim();

    const updated =
      await updateBuilderMessage(
        interaction,
        builder
      );

    if (!updated) {
      await interaction.reply({
        content:
          "❌ No pude encontrar el mensaje del builder.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    await interaction.reply({
      content:
        "✅ Título actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // DESCRIPCIÓN
  // ==================================================

  if (
    interaction.customId ===
    "embed_description_modal"
  ) {
    builder.data.description =
      interaction.fields
        .getTextInputValue(
          "embed_description"
        )
        .trim();

    const updated =
      await updateBuilderMessage(
        interaction,
        builder
      );

    if (!updated) {
      await interaction.reply({
        content:
          "❌ No pude encontrar el mensaje del builder.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    await interaction.reply({
      content:
        "✅ Descripción actualizada.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // COLOR
  // ==================================================

  if (
    interaction.customId ===
    "embed_color_modal"
  ) {
    const color =
      interaction.fields
        .getTextInputValue(
          "embed_color"
        )
        .trim();

    if (
      !/^#[0-9A-Fa-f]{6}$/.test(
        color
      )
    ) {
      await interaction.reply({
        content:
          "❌ El color debe tener el formato `#5865F2`.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    builder.data.color =
      color.toUpperCase();

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Color actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // AUTOR
  // ==================================================

  if (
    interaction.customId ===
    "embed_author_modal"
  ) {
    builder.data.author.name =
      interaction.fields
        .getTextInputValue(
          "author_name"
        )
        .trim();

    builder.data.author.iconURL =
      interaction.fields
        .getTextInputValue(
          "author_icon"
        )
        .trim();

    builder.data.author.url =
      interaction.fields
        .getTextInputValue(
          "author_url"
        )
        .trim();

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Autor actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // FOOTER
  // ==================================================

  if (
    interaction.customId ===
    "embed_footer_modal"
  ) {
    builder.data.footer.text =
      interaction.fields
        .getTextInputValue(
          "footer_text"
        )
        .trim();

    builder.data.footer.iconURL =
      interaction.fields
        .getTextInputValue(
          "footer_icon"
        )
        .trim();

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Footer actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // IMAGEN
  // ==================================================

  if (
    interaction.customId ===
    "embed_image_modal"
  ) {
    builder.data.image =
      interaction.fields
        .getTextInputValue(
          "embed_image"
        )
        .trim();

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Imagen actualizada.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // THUMBNAIL
  // ==================================================

  if (
    interaction.customId ===
    "embed_thumbnail_modal"
  ) {
    builder.data.thumbnail =
      interaction.fields
        .getTextInputValue(
          "embed_thumbnail"
        )
        .trim();

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Thumbnail actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // AGREGAR CAMPO
  // ==================================================

  if (
    interaction.customId ===
    "embed_field_add_modal"
  ) {
    const name =
      interaction.fields
        .getTextInputValue(
          "field_name"
        )
        .trim();

    const value =
      interaction.fields
        .getTextInputValue(
          "field_value"
        )
        .trim();

    const inlineText =
      interaction.fields
        .getTextInputValue(
          "field_inline"
        )
        .trim()
        .toLowerCase();

    builder.data.fields.push({
      name,
      value,
      inline:
        inlineText === "sí" ||
        inlineText === "si" ||
        inlineText === "yes",
    });

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Campo agregado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // EDITAR CAMPO
  // ==================================================

  if (
    interaction.customId ===
    "embed_field_edit_modal"
  ) {
    const index =
      builder.editingField;

    if (
      typeof index !==
        "number" ||
      !builder.data.fields[index]
    ) {
      await interaction.reply({
        content:
          "❌ No se encontró el campo.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    builder.data.fields[
      index
    ] = {
      name:
        interaction.fields
          .getTextInputValue(
            "field_name"
          )
          .trim(),

      value:
        interaction.fields
          .getTextInputValue(
            "field_value"
          )
          .trim(),

      inline:
        ["sí", "si", "yes"].includes(
          interaction.fields
            .getTextInputValue(
              "field_inline"
            )
            .trim()
            .toLowerCase()
        ),
    };

    delete builder.editingField;

    await updateBuilderMessage(
      interaction,
      builder
    );

    await interaction.reply({
      content:
        "✅ Campo actualizado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // EMBED - GUARDAR
  // ==================================================

  if (
    interaction.customId ===
    "embed_save"
  ) {
    const modal =
      new ModalBuilder()
        .setCustomId(
          "embed_name_modal"
        )
        .setTitle(
          "Guardar embed"
        );

    const input =
      new TextInputBuilder()
        .setCustomId(
          "embed_name"
        )
        .setLabel(
          "Nombre del embed"
        )
        .setStyle(
          TextInputStyle.Short
        )
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder(
          "Ej: anuncio"
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

  // ==================================================
  // EMBED - GUARDAR NOMBRE
  // ==================================================

  if (
    interaction.customId ===
    "embed_name_modal"
  ) {
    const name =
      interaction.fields
        .getTextInputValue(
          "embed_name"
        )
        .trim();

    if (!name) {
      await interaction.reply({
        content:
          "❌ Debes introducir un nombre.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }

    try {
      const existing =
        db.prepare(`
          SELECT id
          FROM saved_embeds
          WHERE guild_id = ?
          AND name = ?
        `).get(
          builder.guildId,
          name
        );

      if (existing) {
        await interaction.reply({
          content:
            `❌ Ya existe un embed llamado \`${name}\`.`,
          flags:
            MessageFlags.Ephemeral,
        });

        return true;
      }

      const now =
        Date.now();

      db.prepare(`
        INSERT INTO saved_embeds (
          guild_id,
          user_id,
          name,
          data,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        builder.guildId,
        interaction.user.id,
        name,
        JSON.stringify(
          builder.data
        ),
        now,
        now
      );

      const message =
        await getBuilderMessage(
          interaction.client,
          builder
        );

      if (message) {
        await message.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(
                0x57f287
              )
              .setTitle(
                "EMBED BUILDER"
              )
              .setDescription(
                "**Embed guardado correctamente.**\n\n" +
                  `**Nombre:** \`${name}\`\n\n` +
                  "El embed está listo para utilizarse con `/send`."
              ),
          ],
          components: [],
        });
      }

      builders.delete(
        interaction.user.id
      );

      return true;
    } catch (error) {
      console.error(
        "❌ Error guardando embed:",
        error
      );

      await interaction.reply({
        content:
          "❌ Ocurrió un error al guardar el embed.",
        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }
  }

  // ==================================================
  // EMBED - CANCELAR
  // ==================================================

  if (
    interaction.customId ===
    "embed_cancel"
  ) {
    const message =
      await getBuilderMessage(
        interaction.client,
        builder
      );

    if (message) {
      await message.edit({
        embeds: [],
        components: [],
        content:
          "❌ Constructor cancelado.",
      });
    }

    builders.delete(
      interaction.user.id
    );

    await interaction.deferUpdate();

    return true;
  }

  return true;
}

// ==================================================
// SEND COMMAND
// ==================================================

const sendCommand =
  new SlashCommandBuilder()
    .setName("send")
    .setDescription(
      "Envía un mensaje o embed guardado."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages.toString()
    )
    .addStringOption(
      (option) =>
        option
          .setName("tipo")
          .setDescription(
            "Selecciona qué quieres enviar."
          )
          .setRequired(true)
          .addChoices(
            {
              name: "Mensaje",
              value: "message",
            },
            {
              name: "Embed",
              value: "embed",
            }
          )
    )
    .addStringOption(
      (option) =>
        option
          .setName("contenido")
          .setDescription(
            "Selecciona el mensaje o embed guardado."
          )
          .setRequired(true)
          .setAutocomplete(true)
    )
    .addChannelOption(
      (option) =>
        option
          .setName("canal")
          .setDescription(
            "Canal donde se enviará."
          )
          .setRequired(true)
          .addChannelTypes(0)
    )
    .addStringOption(
      (option) =>
        option
          .setName("mention")
          .setDescription(
            "Mención opcional."
          )
          .setRequired(false)
          .setAutocomplete(true)
    );

// ==================================================
// AUTOCOMPLETADO DE /SEND
// ==================================================

async function handleSendAutocomplete(
  interaction
) {
  if (
    !interaction.isAutocomplete()
  ) {
    return false;
  }

  if (
    interaction.commandName !==
    "send"
  ) {
    return false;
  }

  const focused =
    interaction.options.getFocused(true);

  // ==================================================
  // CONTENIDO
  // ==================================================

  if (
    focused.name ===
    "contenido"
  ) {
    const tipo =
      interaction.options.getString(
        "tipo"
      );

    if (!tipo) {
      await interaction.respond([]);
      return true;
    }

    const search =
      focused.value
        .toLowerCase();

    let results = [];

    if (
      tipo === "message"
    ) {
      results =
        db.prepare(`
          SELECT id, name
          FROM saved_messages
          WHERE guild_id = ?
          AND LOWER(name) LIKE ?
          ORDER BY name ASC
          LIMIT 25
        `).all(
          interaction.guildId,
          `%${search}%`
        );

      await interaction.respond(
        results.map(
          (item) => ({
            name:
              item.name.slice(
                0,
                100
              ),
            value:
              `message:${item.id}`,
          })
        )
      );

      return true;
    }

    if (
      tipo === "embed"
    ) {
      results =
        db.prepare(`
          SELECT id, name
          FROM saved_embeds
          WHERE guild_id = ?
          AND LOWER(name) LIKE ?
          ORDER BY name ASC
          LIMIT 25
        `).all(
          interaction.guildId,
          `%${search}%`
        );

      await interaction.respond(
        results.map(
          (item) => ({
            name:
              item.name.slice(
                0,
                100
              ),
            value:
              `embed:${item.id}`,
          })
        )
      );

      return true;
    }

    await interaction.respond([]);
    return true;
  }

  // ==================================================
  // MENTION
  // ==================================================

  if (
    focused.name ===
    "mention"
  ) {
    const search =
      focused.value
        .toLowerCase();

    const choices = [];

    // @everyone
    if (
      "everyone".includes(
        search
      ) ||
      search === ""
    ) {
      choices.push({
        name: "@everyone",
        value:
          "everyone",
      });
    }

    // @here
    if (
      "here".includes(
        search
      ) ||
      search === ""
    ) {
      choices.push({
        name: "@here",
        value:
          "here",
      });
    }

    // ROLES
    const roles =
      interaction.guild.roles.cache
        .filter(
          (role) =>
            role.id !==
              interaction.guild.id &&
            role.name
              .toLowerCase()
              .includes(search)
        )
        .sort(
          (a, b) =>
            b.position -
            a.position
        )
        .first(23);

    for (
      const role of roles
    ) {
      choices.push({
        name:
          `@${role.name}`.slice(
            0,
            100
          ),
        value:
          role.id,
      });
    }

    await interaction.respond(
      choices.slice(0, 25)
    );

    return true;
  }

  return false;
}

// ==================================================
// MANEJAR /SEND
// ==================================================

async function handleSendInteraction(
  interaction
) {
  if (
    !interaction.isChatInputCommand()
  ) {
    return false;
  }

  if (
    interaction.commandName !==
    "send"
  ) {
    return false;
  }

  const tipo =
    interaction.options.getString(
      "tipo"
    );

  const contenido =
    interaction.options.getString(
      "contenido"
    );

  const canal =
    interaction.options.getChannel(
      "canal"
    );

  const mention =
    interaction.options.getString(
      "mention"
    );

  // ==================================================
  // VALIDAR CANAL
  // ==================================================

  if (
    !canal ||
    !canal.isTextBased()
  ) {
    await interaction.reply({
      content:
        "❌ El canal seleccionado no es válido.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

  // ==================================================
  // OBTENER CONTENIDO
  // ==================================================

  let saved = null;

  if (
    tipo === "message"
  ) {
    const id =
      contenido.replace(
        "message:",
        ""
      );

    saved =
      db.prepare(`
        SELECT *
        FROM saved_messages
        WHERE id = ?
        AND guild_id = ?
      `).get(
        id,
        interaction.guildId
      );
  }

  if (
    tipo === "embed"
  ) {
    const id =
      contenido.replace(
        "embed:",
        ""
      );

    saved =
      db.prepare(`
        SELECT *
        FROM saved_embeds
        WHERE id = ?
        AND guild_id = ?
      `).get(
        id,
        interaction.guildId
      );
  }

  if (!saved) {
    await interaction.reply({
      content:
        "❌ No se encontró el contenido guardado.",
      flags:
        MessageFlags.Ephemeral,
    });

    return true;
  }

    // ==================================================
    // CREAR MENCIÓN
    // ==================================================

    let mentionText = "";

    if (
      mention ===
      "everyone"
    ) {
      mentionText =
        "@everyone";
    }

    else if (
      mention ===
      "here"
    ) {
      mentionText =
        "@here";
    }

    else if (
      mention
    ) {
      const role =
        interaction.guild.roles.cache.get(
          mention
        );

      if (role) {
        mentionText =
          `<@&${role.id}>`;
      }
    }

    // ==================================================
    // ENVIAR
    // ==================================================

    try {
      // MENSAJE
      if (
        tipo === "message"
      ) {
        await canal.send({
          content:
            mentionText
              ? `${mentionText}\n${saved.content}`
              : saved.content,

          allowedMentions: {
            parse: [
              "roles",
              "users",
              "everyone",
            ],
          },
        });
      }

      // EMBED
      if (
        tipo === "embed"
      ) {
        const data =
          JSON.parse(
            saved.data
          );

        await canal.send({
          content:
            mentionText ||
            undefined,

          embeds: [
            buildDiscordEmbed(
              data
            ),
          ],

          allowedMentions: {
            parse: [
              "roles",
              "users",
              "everyone",
            ],
          },
        });
      }

      await interaction.reply({
        content:
          `✅ ${
            tipo === "message"
              ? "Mensaje"
              : "Embed"
          } enviado correctamente en ${canal}.`,

        flags:
          MessageFlags.Ephemeral,
      });

      return true;

    } catch (error) {
      console.error(
        "❌ Error enviando contenido:",
        error
      );

      await interaction.reply({
        content:
          "❌ No pude enviar el contenido en ese canal. Comprueba los permisos del bot.",

        flags:
          MessageFlags.Ephemeral,
      });

      return true;
    }
  }

  // ==================================================
  // EXPORTS
  // ==================================================

  module.exports = {
    messageCommand,
    embedCommand,
    sendCommand,
    handleMessageCommand,
    handleMessageInteraction,
    handleSendInteraction,
    handleSendAutocomplete,
  };