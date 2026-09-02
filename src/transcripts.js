const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// ==================================================
// CONFIGURACIÓN
// ==================================================

const TRANSCRIPTS_DIR = "/data/transcripts";

// Crear carpeta si no existe
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, {
    recursive: true,
  });
}

// ==================================================
// SEGURIDAD
// ==================================================

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==================================================
// CONVERTIR LINKS EN LINKS CLICKEABLES
// ==================================================

function formatMessageContent(text) {
  const escaped = escapeHTML(text);

  return escaped.replace(
    /(https?:\/\/[^\s<]+)/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

// ==================================================
// CREAR TRANSCRIPCIÓN
// ==================================================

function createTranscript(ticket, messages) {
  const messageList = messages
    .sort(
      (a, b) =>
        a.createdTimestamp -
        b.createdTimestamp
    );

  const messageHTML = messageList
    .map((message) => {
      const username =
        escapeHTML(
          message.member?.displayName ||
            message.author?.username ||
            "Usuario"
        );

      const avatar =
        message.author?.displayAvatarURL
          ? message.author.displayAvatarURL({
              extension: "png",
              size: 128,
            })
          : "";

      const content =
        formatMessageContent(
          message.content ||
            "[Sin contenido]"
        );

      const timestamp =
        new Date(
          message.createdTimestamp
        ).toLocaleString("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        });

      // ==========================================
      // ARCHIVOS / ADJUNTOS
      // ==========================================

      let attachmentsHTML = "";

      if (
        message.attachments &&
        message.attachments.size > 0
      ) {
        attachmentsHTML = `
          <div class="attachments">
            ${Array.from(
              message.attachments.values()
            )
              .map((attachment) => {
                const url =
                  escapeHTML(
                    attachment.url
                  );

                const name =
                  escapeHTML(
                    attachment.name ||
                      "Archivo"
                  );

                const contentType =
                  attachment.contentType ||
                  "";

                if (
                  contentType.startsWith(
                    "image/"
                  )
                ) {
                  return `
                    <div class="attachment image-attachment">
                      <a
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="${url}"
                          alt="${name}"
                        >
                      </a>
                    </div>
                  `;
                }

                return `
                  <div class="attachment-file">
                    📎
                    <a
                      href="${url}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ${name}
                    </a>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;
      }

      // ==========================================
      // EMBEDS
      // ==========================================

      let embedsHTML = "";

      if (
        message.embeds &&
        message.embeds.length > 0
      ) {
        embedsHTML = `
          <div class="embeds">
            ${message.embeds
              .map((embed) => {
                const title =
                  escapeHTML(
                    embed.title ||
                      ""
                  );

                const description =
                  formatMessageContent(
                    embed.description ||
                      ""
                  );

                const url =
                  embed.url
                    ? escapeHTML(
                        embed.url
                      )
                    : "";

                const image =
                  embed.image?.url
                    ? escapeHTML(
                        embed.image.url
                      )
                    : "";

                return `
                  <div class="embed">

                    ${
                      title
                        ? `
                          <div class="embed-title">
                            ${
                              url
                                ? `
                                  <a
                                    href="${url}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    ${title}
                                  </a>
                                `
                                : title
                            }
                          </div>
                        `
                        : ""
                    }

                    ${
                      description
                        ? `
                          <div class="embed-description">
                            ${description}
                          </div>
                        `
                        : ""
                    }

                    ${
                      image
                        ? `
                          <img
                            class="embed-image"
                            src="${image}"
                            alt="Embed image"
                          >
                        `
                        : ""
                    }

                  </div>
                `;
              })
              .join("")}
          </div>
        `;
      }

      return `
        <div class="message">

          ${
            avatar
              ? `
                <img
                  class="avatar"
                  src="${avatar}"
                  alt="Avatar"
                >
              `
              : `
                <div class="avatar placeholder">
                  ?
                </div>
              `
          }

          <div class="message-content">

            <div class="message-header">

              <span class="username">
                ${username}
              </span>

              <span class="timestamp">
                ${timestamp}
              </span>

            </div>

            <div class="content">
              ${content}
            </div>

            ${attachmentsHTML}

            ${embedsHTML}

          </div>

        </div>
      `;
    })
    .join("");

  // ==================================================
  // INFORMACIÓN DEL TICKET
  // ==================================================

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
        ).toLocaleString(
          "es-MX",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
          }
        )
      : "Desconocido";

  // ==================================================
  // HTML
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

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;

      background:
        radial-gradient(
          circle at top,
          #1c2230 0%,
          #0f1117 45%,
          #090b10 100%
        );

      color: #ffffff;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      min-height: 100vh;
    }

    a {
      color: #6ea8ff;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* ==========================================
       HEADER
       ========================================== */

    .header {
      background: rgba(
        23,
        26,
        35,
        0.92
      );

      backdrop-filter: blur(12px);

      border-bottom:
        1px solid
        #292d38;

      padding: 28px 20px;

      position: sticky;
      top: 0;

      z-index: 10;
    }

    .header-inner {
      max-width: 1100px;

      margin: auto;
    }

    .header h1 {
      margin: 0 0 8px;

      font-size: 25px;
    }

    .header p {
      margin: 4px 0;

      color: #aeb4c0;

      font-size: 14px;
    }

    /* ==========================================
       CONTAINER
       ========================================== */

    .container {
      max-width: 1100px;

      margin: 30px auto;

      padding:
        0 20px 40px;
    }

    /* ==========================================
       INFO
       ========================================== */

    .info {
      background: rgba(
        23,
        26,
        35,
        0.95
      );

      border:
        1px solid
        #292d38;

      border-radius: 14px;

      padding: 20px;

      margin-bottom: 20px;

      box-shadow:
        0 10px 30px
        rgba(0, 0, 0, 0.18);
    }

    .info-grid {
      display: grid;

      grid-template-columns:
        repeat(
          auto-fit,
          minmax(
            190px,
            1fr
          )
        );

      gap: 12px;
    }

    .info-item {
      background: #10131a;

      border:
        1px solid
        #222631;

      border-radius: 10px;

      padding: 15px;
    }

    .label {
      display: block;

      color: #777f8d;

      font-size: 11px;

      margin-bottom: 6px;

      text-transform:
        uppercase;

      letter-spacing:
        0.5px;
    }

    .value {
      font-size: 14px;

      font-weight: 600;

      overflow-wrap:
        anywhere;
    }

    /* ==========================================
       MESSAGES
       ========================================== */

    .messages {
      background: rgba(
        23,
        26,
        35,
        0.95
      );

      border:
        1px solid
        #292d38;

      border-radius: 14px;

      overflow: hidden;

      box-shadow:
        0 10px 30px
        rgba(0, 0, 0, 0.18);
    }

    .messages-title {
      padding: 18px 20px;

      border-bottom:
        1px solid
        #292d38;

      font-size: 18px;

      font-weight: 700;
    }

    .message {
      display: flex;

      gap: 14px;

      padding: 18px 20px;

      border-bottom:
        1px solid
        #222631;
    }

    .message:last-child {
      border-bottom: none;
    }

    .avatar {
      width: 42px;

      height: 42px;

      border-radius: 50%;

      flex-shrink: 0;

      object-fit: cover;
    }

    .placeholder {
      display: flex;

      align-items: center;

      justify-content: center;

      background: #252a35;

      color: #8d95a3;

      font-weight: 700;
    }

    .message-content {
      min-width: 0;

      flex: 1;
    }

    .message-header {
      display: flex;

      gap: 10px;

      align-items: baseline;

      margin-bottom: 6px;

      flex-wrap: wrap;
    }

    .username {
      font-weight: 700;

      font-size: 15px;
    }

    .timestamp {
      color: #777f8d;

      font-size: 11px;
    }

    .content {
      color: #d9dce2;

      white-space: pre-wrap;

      overflow-wrap: anywhere;

      line-height: 1.55;

      font-size: 14px;
    }

    /* ==========================================
       ATTACHMENTS
       ========================================== */

    .attachments {
      margin-top: 10px;

      display: flex;

      flex-direction: column;

      gap: 8px;
    }

    .image-attachment img {
      max-width: 420px;

      width: 100%;

      max-height: 420px;

      object-fit: contain;

      border-radius: 8px;

      border:
        1px solid
        #292d38;

      background: #0b0d12;
    }

    .attachment-file {
      display: inline-block;

      background: #10131a;

      border:
        1px solid
        #292d38;

      border-radius: 8px;

      padding: 9px 12px;

      width: fit-content;

      max-width: 100%;

      overflow-wrap:
        anywhere;
    }

    /* ==========================================
       EMBEDS
       ========================================== */

    .embeds {
      display: flex;

      flex-direction: column;

      gap: 10px;

      margin-top: 10px;
    }

    .embed {
      background: #10131a;

      border-left:
        4px solid
        #5865f2;

      border-radius: 6px;

      padding: 12px;

      max-width: 650px;
    }

    .embed-title {
      font-weight: 700;

      margin-bottom: 7px;
    }

    .embed-description {
      color: #c5c9d1;

      white-space: pre-wrap;

      overflow-wrap:
        anywhere;

      line-height: 1.5;
    }

    .embed-image {
      display: block;

      max-width: 100%;

      max-height: 400px;

      margin-top: 10px;

      border-radius: 6px;
    }

    /* ==========================================
       EMPTY
       ========================================== */

    .empty {
      padding: 35px 20px;

      text-align: center;

      color: #858c99;
    }

    /* ==========================================
       FOOTER
       ========================================== */

    .footer {
      text-align: center;

      color: #646b78;

      padding: 25px 10px;

      font-size: 12px;
    }

    /* ==========================================
       MOBILE
       ========================================== */

    @media (
      max-width: 600px
    ) {

      .header {
        padding: 20px 15px;
      }

      .header h1 {
        font-size: 21px;
      }

      .container {
        margin-top: 20px;

        padding:
          0 10px 30px;
      }

      .message {
        padding:
          15px 12px;

        gap: 10px;
      }

      .avatar {
        width: 36px;

        height: 36px;
      }

      .message-header {
        gap: 6px;
      }

      .username {
        font-size: 14px;
      }

      .timestamp {
        font-size: 10px;
      }

      .content {
        font-size: 13px;
      }

      .image-attachment img {
        max-height: 300px;
      }

    }

  </style>

</head>

<body>

  <div class="header">

    <div class="header-inner">

      <h1>
        Ticket Transcript
      </h1>

      <p>
        ${escapeHTML(
          category
        )}
      </p>

    </div>

  </div>

  <div class="container">

    <div class="info">

      <div class="info-grid">

        <div class="info-item">

          <span class="label">
            Ticket ID
          </span>

          <span class="value">
            ${escapeHTML(
              ticket.id
            )}
          </span>

        </div>

        <div class="info-item">

          <span class="label">
            Usuario
          </span>

          <span class="value">
            ${escapeHTML(
              ticket.userId ||
                "Desconocido"
            )}
          </span>

        </div>

        <div class="info-item">

          <span class="label">
            Categoría
          </span>

          <span class="value">
            ${escapeHTML(
              category
            )}
          </span>

        </div>

        <div class="info-item">

          <span class="label">
            Staff
          </span>

          <span class="value">
            ${claimedBy}
          </span>

        </div>

        <div class="info-item">

          <span class="label">
            Creado
          </span>

          <span class="value">
            ${escapeHTML(
              createdAt
            )}
          </span>

        </div>

        <div class="info-item">

          <span class="label">
            Mensajes
          </span>

          <span class="value">
            ${messageList.length}
          </span>

        </div>

      </div>

    </div>

    <div class="messages">

      <div class="messages-title">
        Mensajes
      </div>

      ${
        messageHTML ||
        `
          <div class="empty">
            No hay mensajes en este ticket.
          </div>
        `
      }

    </div>

    <div class="footer">
      Staff Support — Ticket Transcript
    </div>

  </div>

</body>

</html>
  `;
}

// ==================================================
// GUARDAR TRANSCRIPCIÓN
// ==================================================

function saveTranscript(
  ticket,
  messages
) {
  const html =
    createTranscript(
      ticket,
      messages
    );

  const filePath =
    path.join(
      TRANSCRIPTS_DIR,
      `${ticket.id}.html`
    );

  fs.writeFileSync(
    filePath,
    html,
    "utf8"
  );

  return ticket.id;
}

// ==================================================
// RUTA WEB
// ==================================================

app.get(
  "/transcript/:id",
  (req, res) => {
    const safeId =
      String(
        req.params.id
      ).replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      );

    const filePath =
      path.join(
        TRANSCRIPTS_DIR,
        `${safeId}.html`
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
            <title>Transcript not found</title>
          </head>

          <body
            style="
              background:#0f1117;
              color:white;
              font-family:Arial;
              text-align:center;
              padding:50px;
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
        `💾 Transcripciones guardadas en: ${TRANSCRIPTS_DIR}`
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