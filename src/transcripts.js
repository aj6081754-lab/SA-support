const express = require("express");

const app = express();

const transcripts = new Map();

// ==================================================
// ESTILOS
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
// CREAR TRANSCRIPCIÓN
// ==================================================

function createTranscript(ticket, messages) {
  const transcriptId = ticket.id;

  const messageList = messages
    .filter((message) => !message.author.bot)
    .sort(
      (a, b) =>
        a.createdTimestamp - b.createdTimestamp
    );

  const messageHTML = messageList
    .map((message) => {
      const username =
        escapeHTML(
          message.member?.displayName ||
          message.author.username
        );

      const avatar =
        message.author.displayAvatarURL({
          extension: "png",
          size: 128,
        });

      const content =
        escapeHTML(
          message.content || "[Sin contenido]"
        );

      const timestamp =
        new Date(
          message.createdTimestamp
        ).toLocaleString("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        });

      return `
        <div class="message">
          <img
            class="avatar"
            src="${avatar}"
            alt="Avatar"
          >

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
          </div>
        </div>
      `;
    })
    .join("");

  const category =
    ticket.type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );

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
    Ticket ${escapeHTML(ticket.id)}
  </title>

  <style>

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #0f1117;
      color: #ffffff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }

    .header {
      background: #171a23;
      border-bottom: 1px solid #292d38;
      padding: 24px;
    }

    .header h1 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    .header p {
      margin: 4px 0;
      color: #aeb4c0;
    }

    .container {
      max-width: 1000px;
      margin: 30px auto;
      padding: 0 20px;
    }

    .info {
      background: #171a23;
      border: 1px solid #292d38;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .info-grid {
      display: grid;
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(200px, 1fr)
        );
      gap: 15px;
    }

    .info-item {
      background: #10131a;
      border-radius: 8px;
      padding: 14px;
    }

    .label {
      display: block;
      color: #858c99;
      font-size: 12px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .value {
      font-size: 15px;
      font-weight: 600;
    }

    .messages {
      background: #171a23;
      border: 1px solid #292d38;
      border-radius: 12px;
      overflow: hidden;
    }

    .messages-title {
      padding: 18px 20px;
      border-bottom: 1px solid #292d38;
      font-size: 18px;
      font-weight: 700;
    }

    .message {
      display: flex;
      gap: 14px;
      padding: 18px 20px;
      border-bottom: 1px solid #222631;
    }

    .message:last-child {
      border-bottom: none;
    }

    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .message-content {
      min-width: 0;
      flex: 1;
    }

    .message-header {
      display: flex;
      gap: 10px;
      align-items: baseline;
      margin-bottom: 5px;
    }

    .username {
      font-weight: 700;
    }

    .timestamp {
      color: #777f8d;
      font-size: 12px;
    }

    .content {
      color: #d9dce2;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.5;
    }

    .empty {
      padding: 30px;
      text-align: center;
      color: #858c99;
    }

    .footer {
      text-align: center;
      color: #646b78;
      padding: 25px;
      font-size: 12px;
    }

  </style>
</head>

<body>

  <div class="header">
    <h1>🎫 Ticket Transcript</h1>

    <p>
      ${escapeHTML(category)}
    </p>
  </div>

  <div class="container">

    <div class="info">

      <div class="info-grid">

        <div class="info-item">
          <span class="label">
            Ticket ID
          </span>

          <span class="value">
            ${escapeHTML(ticket.id)}
          </span>
        </div>

        <div class="info-item">
          <span class="label">
            Usuario
          </span>

          <span class="value">
            ${escapeHTML(
              ticket.userId
            )}
          </span>
        </div>

        <div class="info-item">
          <span class="label">
            Categoría
          </span>

          <span class="value">
            ${escapeHTML(category)}
          </span>
        </div>

        <div class="info-item">
          <span class="label">
            Staff
          </span>

          <span class="value">
            ${
              ticket.claimedBy
                ? escapeHTML(
                    ticket.claimedBy
                  )
                : "No reclamado"
            }
          </span>
        </div>

      </div>

    </div>

    <div class="messages">

      <div class="messages-title">
        Messages
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

  transcripts.set(
    ticket.id,
    {
      html,
      createdAt: Date.now(),
    }
  );

  return ticket.id;
}

// ==================================================
// RUTA WEB
// ==================================================

app.get(
  "/transcript/:id",
  (req, res) => {
    const transcript =
      transcripts.get(
        req.params.id
      );

    if (!transcript) {
      return res
        .status(404)
        .send(`
          <h1>
            Transcript not found
          </h1>
        `);
    }

    res
      .type("html")
      .send(transcript.html);
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