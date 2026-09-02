const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// ==================================================
// CONFIGURACIÓN
// ==================================================

const DATA_DIR = "/data";
const TRANSCRIPTS_DIR = path.join(
  DATA_DIR,
  "transcripts"
);

const ASSETS_DIR = path.join(
  DATA_DIR,
  "transcript-assets"
);

fs.mkdirSync(TRANSCRIPTS_DIR, {
  recursive: true,
});

fs.mkdirSync(ASSETS_DIR, {
  recursive: true,
});

// ==================================================
// UTILIDADES
// ==================================================

function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeFileName(name) {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 150);
}

function safeId(id) {
  return String(id || "").replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );
}

// ==================================================
// MENCIONES
// ==================================================

function formatMentions(
  content,
  guild
) {
  if (!content) {
    return "";
  }

  let text = escapeHTML(content);

  // @everyone
  text = text.replace(
    /@everyone/g,
    `<span class="mention">@everyone</span>`
  );

  // @here
  text = text.replace(
    /@here/g,
    `<span class="mention">@here</span>`
  );

  // Usuarios
  text = text.replace(
    /&lt;@!?(\d+)&gt;/g,
    (match, userId) => {
      const member =
        guild?.members?.cache?.get(
          userId
        );

      const user =
        member?.user ||
        guild?.client?.users?.cache?.get(
          userId
        );

      const name =
        member?.displayName ||
        user?.username ||
        userId;

      return `
        <span
          class="mention"
          title="${escapeHTML(userId)}"
        >
          @${escapeHTML(name)}
        </span>
      `;
    }
  );

  // Roles
  text = text.replace(
    /&lt;@&amp;(\d+)&gt;/g,
    (match, roleId) => {
      const role =
        guild?.roles?.cache?.get(
          roleId
        );

      const name =
        role?.name ||
        roleId;

      return `
        <span
          class="mention"
          title="${escapeHTML(roleId)}"
        >
          @${escapeHTML(name)}
        </span>
      `;
    }
  );

  // Canales
  text = text.replace(
    /&lt;#(\d+)&gt;/g,
    (match, channelId) => {
      const channel =
        guild?.channels?.cache?.get(
          channelId
        );

      const name =
        channel?.name ||
        channelId;

      return `
        <span
          class="channel-mention"
          title="${escapeHTML(channelId)}"
        >
          #${escapeHTML(name)}
        </span>
      `;
    }
  );

  return text;
}

// ==================================================
// EMOJIS PERSONALIZADOS
// ==================================================

function formatCustomEmojis(
  content
) {
  if (!content) {
    return "";
  }

  return content.replace(
    /&lt;(a?):([a-zA-Z0-9_]+):(\d+)&gt;/g,
    (match, animated, name, id) => {
      const extension =
        animated === "a"
          ? "gif"
          : "png";

      const url =
        `https://cdn.discordapp.com/emojis/${id}.${extension}?size=32`;

      return `
        <img
          class="custom-emoji"
          src="${url}"
          alt=":${escapeHTML(name)}:"
          title=":${escapeHTML(name)}:"
        >
      `;
    }
  );
}

// ==================================================
// CONTENIDO DEL MENSAJE
// ==================================================

function formatContent(
  content,
  guild
) {
  if (!content) {
    return "";
  }

  let result =
    formatMentions(
      content,
      guild
    );

  // Links
  result = result.replace(
    /(?<!["'=])(https?:\/\/[^\s<]+)/gi,
    (url) => {
      const cleanUrl =
        url.replace(
          /[),.!?]+$/g,
          ""
        );

      return `
        <a
          href="${cleanUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${cleanUrl}
        </a>
      `;
    }
  );

  result =
    formatCustomEmojis(
      result
    );

  return result;
}

// ==================================================
// DESCARGAR ARCHIVO
// ==================================================

async function downloadFile(
  url,
  destination
) {
  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    fs.writeFileSync(
      destination,
      buffer
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Error descargando archivo:",
      error
    );

    return false;
  }
}

// ==================================================
// GUARDAR ADJUNTOS
// ==================================================

async function saveAttachment(
  attachment,
  ticketId,
  index
) {
  const ticketDir =
    path.join(
      ASSETS_DIR,
      safeId(ticketId)
    );

  fs.mkdirSync(
    ticketDir,
    {
      recursive: true,
    }
  );

  const originalName =
    safeFileName(
      attachment.name ||
        `file-${index}`
    );

  const fileName =
    `${index}-${originalName}`;

  const filePath =
    path.join(
      ticketDir,
      fileName
    );

  const success =
    await downloadFile(
      attachment.url,
      filePath
    );

  if (!success) {
    return {
      type: "link",
      url: attachment.url,
      name:
        attachment.name ||
        "Archivo",
    };
  }

  return {
    type:
      attachment.contentType?.startsWith(
        "image/"
      )
        ? "image"
        : "file",

    file:
      `/transcript-assets/${safeId(
        ticketId
      )}/${encodeURIComponent(
        fileName
      )}`,

    name:
      attachment.name ||
      fileName,

    contentType:
      attachment.contentType ||
      "",
  };
}

// ==================================================
// GUARDAR DATOS DE MENSAJES
// ==================================================

async function prepareMessages(
  messages,
  ticket,
  guild
) {
  const result = [];

  let attachmentIndex = 0;

  for (
    const message of messages
  ) {
    const attachments = [];

    if (
      message.attachments &&
      message.attachments.size > 0
    ) {
      for (
        const attachment of message.attachments.values()
      ) {
        attachmentIndex++;

        const saved =
          await saveAttachment(
            attachment,
            ticket.id,
            attachmentIndex
          );

        attachments.push(
          saved
        );
      }
    }

    const embeds =
      [];

    if (
      message.embeds &&
      message.embeds.length > 0
    ) {
      for (
        const embed of message.embeds
      ) {
        let image = null;

        if (
          embed.image?.url
        ) {
          image =
            embed.image.url;
        }

        let thumbnail = null;

        if (
          embed.thumbnail?.url
        ) {
          thumbnail =
            embed.thumbnail.url;
        }

        embeds.push({
          title:
            embed.title ||
            "",

          description:
            embed.description ||
            "",

          url:
            embed.url ||
            null,

          image,

          thumbnail,

          color:
            embed.color ||
            null,
        });
      }
    }

    let sticker = null;

    if (
      message.stickers &&
      message.stickers.size > 0
    ) {
      const firstSticker =
        message.stickers.first();

      if (firstSticker) {
        sticker = {
          name:
            firstSticker.name ||
            "Sticker",

          url:
            firstSticker.url ||
            null,
        };
      }
    }

    let reply = null;

    if (
      message.reference?.messageId
    ) {
      const referenced =
        messages.find(
          (item) =>
            item.id ===
            message.reference
              .messageId
        );

      if (referenced) {
        reply = {
          author:
            referenced.member
              ?.displayName ||
            referenced.author
              ?.username ||
            "Usuario",

          content:
            referenced.content ||
            "[Sin contenido]",
        };
      }
    }

    const author =
      message.member
        ?.displayName ||
      message.author
        ?.username ||
      "Usuario";

    const avatar =
      message.author?.displayAvatarURL
        ? message.author.displayAvatarURL({
            extension: "png",
            size: 128,
          })
        : null;

    result.push({
      id:
        message.id,

      author,

      authorId:
        message.author?.id ||
        null,

      avatar,

      content:
        message.content ||
        "",

      createdTimestamp:
        message.createdTimestamp,

      bot:
        Boolean(
          message.author?.bot
        ),

      attachments,

      embeds,

      sticker,

      reply,

      guildId:
        guild?.id ||
        null,
    });
  }

  return result;
}

// ==================================================
// CREAR HTML
// ==================================================

function createTranscriptHTML(
  ticket,
  preparedMessages,
  threads,
  guild
) {
  const category =
    String(
      ticket.type ||
        "support"
    )
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );

  const claimedBy =
    ticket.claimedBy
      ? escapeHTML(
          ticket.claimedBy
        )
      : "No reclamado";

  const createdAt =
    ticket.createdAt
      ? new Date(
          ticket.createdAt
        ).toLocaleDateString(
          "es-MX",
          {
            dateStyle:
              "medium",
          }
        )
      : "Desconocido";

  const user =
    guild?.members?.cache?.get(
      ticket.userId
    );

  const userName =
    user?.displayName ||
    user?.user?.username ||
    ticket.userId ||
    "Desconocido";

  // ==================================================
  // MENSAJES
  // ==================================================

  const messagesHTML =
    preparedMessages
      .map(
        (message) => {
          const content =
            formatContent(
              message.content,
              guild
            );

          const replyHTML =
            message.reply
              ? `
                <div class="reply">
                  <div class="reply-line"></div>

                  <div class="reply-content">
                    <div class="reply-author">
                      ${escapeHTML(
                        message.reply.author
                      )}
                    </div>

                    <div class="reply-text">
                      ${formatContent(
                        message.reply.content,
                        guild
                      )}
                    </div>
                  </div>
                </div>
              `
              : "";

          const attachmentsHTML =
            message.attachments
              .map(
                (attachment) => {
                  if (
                    attachment.type ===
                    "image"
                  ) {
                    return `
                      <div class="attachment">
                        <a
                          href="${attachment.file}"
                          target="_blank"
                        >
                          <img
                            class="attachment-image"
                            src="${attachment.file}"
                            alt="${escapeHTML(
                              attachment.name
                            )}"
                          >
                        </a>
                      </div>
                    `;
                  }

                  return `
                    <div class="file">
                      <span class="file-icon">
                        📎
                      </span>

                      <a
                        href="${attachment.file || attachment.url}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ${escapeHTML(
                          attachment.name
                        )}
                      </a>
                    </div>
                  `;
                }
              )
              .join("");

          const embedsHTML =
            message.embeds
              .map(
                (embed) => `
                  <div
                    class="discord-embed"
                    ${
                      embed.color
                        ? `style="border-left-color:#${embed.color
                            .toString(16)
                            .padStart(
                              6,
                              "0"
                            )}"`
                        : ""
                    }
                  >

                    ${
                      embed.title
                        ? `
                          <div class="embed-title">
                            ${
                              embed.url
                                ? `
                                  <a
                                    href="${escapeHTML(
                                      embed.url
                                    )}"
                                    target="_blank"
                                  >
                                    ${escapeHTML(
                                      embed.title
                                    )}
                                  </a>
                                `
                                : escapeHTML(
                                    embed.title
                                  )
                            }
                          </div>
                        `
                        : ""
                    }

                    ${
                      embed.description
                        ? `
                          <div class="embed-description">
                            ${formatContent(
                              embed.description,
                              guild
                            )}
                          </div>
                        `
                        : ""
                    }

                    ${
                      embed.image
                        ? `
                          <img
                            class="embed-image"
                            src="${escapeHTML(
                              embed.image
                            )}"
                            alt="Embed"
                          >
                        `
                        : ""
                    }

                  </div>
                `
              )
              .join("");

          const stickerHTML =
            message.sticker?.url
              ? `
                <div class="sticker">
                  <img
                    src="${escapeHTML(
                      message.sticker.url
                    )}"
                    alt="${escapeHTML(
                      message.sticker.name
                    )}"
                  >
                </div>
              `
              : "";

          return `
            <div
              class="message"
              id="message-${escapeHTML(
                message.id
              )}"
            >

              ${
                message.avatar
                  ? `
                    <img
                      class="avatar"
                      src="${message.avatar}"
                      alt=""
                    >
                  `
                  : `
                    <div class="avatar placeholder">
                      ?
                    </div>
                  `
              }

              <div class="message-body">

                <div class="message-header">

                  <span class="username">
                    ${escapeHTML(
                      message.author
                    )}
                  </span>

                  ${
                    message.bot
                      ? `
                        <span class="bot-tag">
                          BOT
                        </span>
                      `
                      : ""
                  }

                </div>

                ${replyHTML}

                ${
                  content
                    ? `
                      <div class="content">
                        ${content}
                      </div>
                    `
                    : ""
                }

                ${attachmentsHTML}

                ${embedsHTML}

                ${stickerHTML}

              </div>

            </div>
          `;
        }
      )
      .join("");

  // ==================================================
  // HILOS
  // ==================================================

  const threadsHTML =
    threads
      .map(
        (thread, index) => {
          const threadMessages =
            thread.messages
              .map(
                (message) => {
                  const content =
                    formatContent(
                      message.content,
                      guild
                    );

                  return `
                    <div class="thread-message">

                      ${
                        message.avatar
                          ? `
                            <img
                              class="thread-avatar"
                              src="${message.avatar}"
                              alt=""
                            >
                          `
                          : ""
                      }

                      <div>
                        <div class="thread-author">
                          ${escapeHTML(
                            message.author
                          )}
                        </div>

                        <div class="thread-content">
                          ${
                            content ||
                            "[Sin contenido]"
                          }
                        </div>
                      </div>

                    </div>
                  `;
                }
              )
              .join("");

          return `
            <div
              class="thread-card"
              onclick="openThread(${index})"
            >

              <div class="thread-card-icon">
                🧵
              </div>

              <div class="thread-card-content">

                <div class="thread-name">
                  ${escapeHTML(
                    thread.name ||
                      "Hilo"
                  )}
                </div>

                <div class="thread-meta">
                  ${
                    thread.messages.length
                  }
                  ${
                    thread.messages.length ===
                    1
                      ? "mensaje"
                      : "mensajes"
                  }
                </div>

              </div>

              <div class="thread-arrow">
                ›
              </div>

            </div>

            <div
              class="thread-view"
              id="thread-${index}"
            >

              <div class="thread-topbar">

                <button
                  class="back-button"
                  onclick="closeThread(event, ${index})"
                >
                  ←
                  <span>
                    Salir del hilo
                  </span>
                </button>

                <div class="thread-title">
                  🧵
                  ${escapeHTML(
                    thread.name ||
                      "Hilo"
                  )}
                </div>

              </div>

              <div class="thread-messages">

                ${threadMessages}

              </div>

            </div>
          `;
        }
      )
      .join("");

  // ==================================================
  // HTML FINAL
  // ==================================================

  return `
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
  Ticket ${escapeHTML(
    ticket.id
  )}
</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  background: #313338;
  color: #dbdee1;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}

/* ==========================================
   PANEL
   ========================================== */

.top-panel {
  max-width: 1100px;
  margin: 20px auto 0;
  padding: 0 16px;
}

.info-panel {
  background: #2b2d31;

  border:
    1px solid
    #1e1f22;

  border-radius: 10px;

  padding: 20px;

  box-shadow:
    0 4px 12px
    rgba(0,0,0,.25);
}

.info-title {
  font-size: 20px;
  font-weight: 700;

  color: #f2f3f5;

  margin-bottom: 5px;
}

.info-category {
  color: #949ba4;
  font-size: 14px;

  margin-bottom: 18px;
}

.info-grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(
        160px,
        1fr
      )
    );

  gap: 10px;
}

.info-item {
  background: #1e1f22;

  border-radius: 8px;

  padding: 12px;
}

.info-label {
  display: block;

  color: #949ba4;

  font-size: 11px;

  font-weight: 700;

  text-transform:
    uppercase;

  margin-bottom: 5px;
}

.info-value {
  color: #f2f3f5;

  font-size: 13px;

  font-weight: 600;

  overflow-wrap:
    anywhere;
}

/* ==========================================
   CANAL
   ========================================== */

.channel-wrapper {
  max-width: 1100px;

  margin: 18px auto 0;

  padding:
    0 16px 40px;
}

.channel {
  background: #313338;

  border-radius: 10px;

  overflow: hidden;

  min-height: 500px;

  box-shadow:
    0 4px 12px
    rgba(0,0,0,.18);
}

.channel-header {
  height: 52px;

  display: flex;

  align-items: center;

  padding:
    0 18px;

  background: #2b2d31;

  border-bottom:
    1px solid
    #1e1f22;

  font-weight: 700;
}

.channel-icon {
  color: #949ba4;

  font-size: 24px;

  margin-right: 8px;
}

.channel-name {
  color: #f2f3f5;

  font-size: 15px;
}

/* ==========================================
   MENSAJES
   ========================================== */

.messages {
  padding:
    16px 8px 25px;
}

.message {
  display: flex;

  padding:
    6px 16px;

  gap: 14px;

  border-radius: 4px;
}

.message:hover {
  background:
    rgba(255,255,255,.02);
}

.avatar {
  width: 40px;
  height: 40px;

  border-radius: 50%;

  object-fit: cover;

  flex-shrink: 0;

  margin-top: 2px;
}

.placeholder {
  background: #5865f2;

  display: flex;

  align-items: center;
  justify-content: center;

  color: white;

  font-weight: 700;
}

.message-body {
  min-width: 0;
  flex: 1;
}

.message-header {
  display: flex;

  align-items: center;

  gap: 7px;

  margin-bottom: 2px;
}

.username {
  color: #f2f3f5;

  font-size: 15px;

  font-weight: 600;
}

.bot-tag {
  background: #5865f2;

  color: white;

  border-radius: 3px;

  padding:
    1px 4px;

  font-size: 9px;

  font-weight: 700;
}

.content {
  color: #dbdee1;

  font-size: 15px;

  line-height: 1.45;

  white-space: pre-wrap;

  overflow-wrap:
    anywhere;
}

.content a {
  color: #00a8fc;

  text-decoration: none;
}

.content a:hover {
  text-decoration: underline;
}

/* ==========================================
   MENCIONES
   ========================================== */

.mention {
  background:
    rgba(88,101,242,.3);

  color: #c9cdfb;

  border-radius: 3px;

  padding:
    0 2px;

  font-weight: 500;
}

.channel-mention {
  background:
    rgba(88,101,242,.3);

  color: #c9cdfb;

  border-radius: 3px;

  padding:
    0 2px;

  font-weight: 500;
}

/* ==========================================
   EMOJIS
   ========================================== */

.custom-emoji {
  width: 22px;
  height: 22px;

  object-fit: contain;

  vertical-align:
    -5px;
}

/* ==========================================
   RESPUESTAS
   ========================================== */

.reply {
  display: flex;

  align-items: center;

  margin:
    4px 0 4px;

  color: #949ba4;
}

.reply-line {
  width: 28px;
  height: 18px;

  border-left:
    2px solid
    #4e5058;

  border-top:
    2px solid
    #4e5058;

  border-radius:
    7px 0 0 0;

  margin-right: 7px;
}

.reply-author {
  font-size: 12px;

  font-weight: 600;

  color: #b5bac1;
}

.reply-text {
  font-size: 12px;

  color: #949ba4;

  max-width: 500px;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

/* ==========================================
   IMÁGENES
   ========================================== */

.attachment {
  margin-top: 8px;
}

.attachment-image {
  display: block;

  max-width: 500px;
  max-height: 450px;

  border-radius: 8px;

  object-fit: contain;

  background: #1e1f22;
}

/* ==========================================
   ARCHIVOS
   ========================================== */

.file {
  display: flex;

  align-items: center;

  gap: 8px;

  width: fit-content;

  max-width: 100%;

  margin-top: 8px;

  padding:
    10px 12px;

  background: #2b2d31;

  border:
    1px solid
    #1e1f22;

  border-radius: 6px;

  overflow-wrap:
    anywhere;
}

.file-icon {
  font-size: 18px;
}

.file a {
  color: #00a8fc;

  text-decoration: none;
}

/* ==========================================
   EMBEDS
   ========================================== */

.discord-embed {
  max-width: 520px;

  margin-top: 8px;

  padding:
    12px;

  background: #2b2d31;

  border-left:
    4px solid
    #5865f2;

  border-radius: 4px;
}

.embed-title {
  color: #f2f3f5;

  font-size: 15px;

  font-weight: 700;

  margin-bottom: 6px;
}

.embed-title a {
  color: #00a8fc;

  text-decoration: none;
}

.embed-description {
  color: #dbdee1;

  font-size: 14px;

  line-height: 1.45;

  white-space: pre-wrap;
}

.embed-image {
  display: block;

  max-width: 100%;

  max-height: 400px;

  margin-top: 10px;

  border-radius: 4px;
}

/* ==========================================
   STICKERS
   ========================================== */

.sticker {
  margin-top: 8px;
}

.sticker img {
  width: 160px;
  height: 160px;

  object-fit: contain;
}

/* ==========================================
   HILOS
   ========================================== */

.thread-card {
  margin:
    10px 16px;

  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    12px 14px;

  background: #2b2d31;

  border:
    1px solid
    #1e1f22;

  border-radius: 8px;

  cursor: pointer;

  transition:
    background .15s ease;
}

.thread-card:hover {
  background: #35373c;
}

.thread-card-icon {
  font-size: 22px;
}

.thread-card-content {
  min-width: 0;

  flex: 1;
}

.thread-name {
  color: #f2f3f5;

  font-size: 14px;

  font-weight: 600;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.thread-meta {
  color: #949ba4;

  font-size: 12px;

  margin-top: 2px;
}

.thread-arrow {
  color: #949ba4;

  font-size: 25px;
}

.thread-view {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 100;

  background: #313338;
}

.thread-view.active {
  display: flex;

  flex-direction: column;
}

.thread-topbar {
  min-height: 54px;

  display: flex;

  align-items: center;

  gap: 15px;

  padding:
    0 18px;

  background: #2b2d31;

  border-bottom:
    1px solid
    #1e1f22;
}

.back-button {
  border: none;

  background: transparent;

  color: #b5bac1;

  font-size: 14px;

  cursor: pointer;

  padding: 7px 10px;

  border-radius: 5px;
}

.back-button:hover {
  background: #404249;

  color: #f2f3f5;
}

.thread-title {
  color: #f2f3f5;

  font-weight: 700;

  font-size: 15px;
}

.thread-messages {
  flex: 1;

  overflow-y: auto;

  padding:
    20px 12px 40px;
}

.thread-message {
  display: flex;

  gap: 10px;

  padding:
    7px 10px;

  margin-bottom: 2px;
}

.thread-avatar {
  width: 36px;
  height: 36px;

  border-radius: 50%;

  object-fit: cover;
}

.thread-author {
  color: #f2f3f5;

  font-size: 14px;

  font-weight: 600;

  margin-bottom: 2px;
}

.thread-content {
  color: #dbdee1;

  font-size: 14px;

  line-height: 1.45;

  white-space: pre-wrap;

  overflow-wrap:
    anywhere;
}

/* ==========================================
   FOOTER
   ========================================== */

.footer {
  text-align: center;

  color: #6d7078;

  font-size: 11px;

  padding:
    25px 10px;
}

/* ==========================================
   MOBILE
   ========================================== */

@media (
  max-width: 650px
) {

  .top-panel {
    margin-top: 10px;

    padding:
      0 8px;
  }

  .info-panel {
    padding: 14px;
  }

  .info-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .channel-wrapper {
    padding:
      0 8px 25px;
  }

  .messages {
    padding-left: 2px;
    padding-right: 2px;
  }

  .message {
    padding:
      6px 8px;

    gap: 9px;
  }

  .avatar {
    width: 36px;
    height: 36px;
  }

  .content {
    font-size: 14px;
  }

  .attachment-image {
    max-width: 100%;

    max-height: 350px;
  }

  .discord-embed {
    max-width: 100%;
  }

  .thread-card {
    margin:
      10px 8px;
  }

}

</style>

</head>

<body>

<!-- ==========================================
     PANEL SUPERIOR
     ========================================== -->

<div class="top-panel">

  <div class="info-panel">

    <div class="info-title">
      Ticket Transcript
    </div>

    <div class="info-category">
      ${escapeHTML(
        category
      )}
    </div>

    <div class="info-grid">

      <div class="info-item">
        <span class="info-label">
          Ticket ID
        </span>

        <span class="info-value">
          ${escapeHTML(
            ticket.id
          )}
        </span>
      </div>

      <div class="info-item">
        <span class="info-label">
          Usuario
        </span>

        <span class="info-value">
          ${escapeHTML(
            userName
          )}
        </span>
      </div>

      <div class="info-item">
        <span class="info-label">
          Categoría
        </span>

        <span class="info-value">
          ${escapeHTML(
            category
          )}
        </span>
      </div>

      <div class="info-item">
        <span class="info-label">
          Staff
        </span>

        <span class="info-value">
          ${claimedBy}
        </span>
      </div>

      <div class="info-item">
        <span class="info-label">
          Creado
        </span>

        <span class="info-value">
          ${escapeHTML(
            createdAt
          )}
        </span>
      </div>

      <div class="info-item">
        <span class="info-label">
          Mensajes
        </span>

        <span class="info-value">
          ${
            preparedMessages.length
          }
        </span>
      </div>

    </div>

  </div>

</div>

<!-- ==========================================
     CANAL
     ========================================== -->

<div class="channel-wrapper">

  <div class="channel">

    <div class="channel-header">

      <span class="channel-icon">
        #
      </span>

      <span class="channel-name">
        ${escapeHTML(
          ticket.channelName ||
            category
        )}
      </span>

    </div>

    <div class="messages">

      ${
        messagesHTML ||
        `
          <div
            style="
              text-align:center;
              padding:40px;
              color:#949ba4;
            "
          >
            No hay mensajes en este ticket.
          </div>
        `
      }

      ${threadsHTML}

    </div>

  </div>

</div>

<div class="footer">
  Staff Support — Ticket Transcript
</div>

<script>

function openThread(index) {
  const thread =
    document.getElementById(
      "thread-" + index
    );

  if (thread) {
    thread.classList.add(
      "active"
    );
  }
}

function closeThread(
  event,
  index
) {
  event.stopPropagation();

  const thread =
    document.getElementById(
      "thread-" + index
    );

  if (thread) {
    thread.classList.remove(
      "active"
    );
  }
}

</script>

</body>

</html>
`;
}

// ==================================================
// GUARDAR TRANSCRIPCIÓN
// ==================================================

async function saveTranscript(
  ticket,
  messages,
  threads = [],
  guild = null
) {
  try {
    const preparedMessages =
      await prepareMessages(
        messages,
        ticket,
        guild
      );

    const preparedThreads =
      [];

    for (
      const thread of threads
    ) {
      const prepared =
        await prepareMessages(
          thread.messages,
          ticket,
          guild
        );

      preparedThreads.push({
        ...thread,
        messages:
          prepared,
      });
    }

    const html =
      createTranscriptHTML(
        ticket,
        preparedMessages,
        preparedThreads,
        guild
      );

    const filePath =
      path.join(
        TRANSCRIPTS_DIR,
        `${safeId(
          ticket.id
        )}.html`
      );

    fs.writeFileSync(
      filePath,
      html,
      "utf8"
    );

    console.log(
      `💾 Transcripción guardada: ${filePath}`
    );

    return ticket.id;

  } catch (error) {
    console.error(
      "❌ Error guardando transcripción:",
      error
    );

    throw error;
  }
}

// ==================================================
// SERVIR ARCHIVOS
// ==================================================

app.use(
  "/transcript-assets",
  express.static(
    ASSETS_DIR
  )
);

// ==================================================
// RUTA DE TRANSCRIPCIÓN
// ==================================================

app.get(
  "/transcript/:id",
  (req, res) => {
    const id =
      safeId(
        req.params.id
      );

    const filePath =
      path.join(
        TRANSCRIPTS_DIR,
        `${id}.html`
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      return res
        .status(404)
        .send(`
          <!DOCTYPE html>

          <html lang="es">

          <head>
            <meta charset="UTF-8">

            <title>
              Transcript not found
            </title>
          </head>

          <body
            style="
              background:#313338;
              color:#dbdee1;
              font-family:Arial;
              text-align:center;
              padding:60px;
            "
          >

            <h1>
              Transcript not found
            </h1>

            <p>
              Esta transcripción no existe
              o fue eliminada.
            </p>

          </body>

          </html>
        `);
    }

    res.sendFile(
      filePath
    );
  }
);

// ==================================================
// SERVIDOR
// ==================================================

function startTranscriptServer() {
  const port =
    process.env.PORT || 3000;

  app.listen(
    port,
    "0.0.0.0",
    () => {
      console.log(
        `🌐 Servidor de transcripciones iniciado en el puerto ${port}.`
      );

      console.log(
        `💾 Archivos: ${DATA_DIR}`
      );
    }
  );
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  saveTranscript,
  startTranscriptServer,
};