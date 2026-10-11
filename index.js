import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import express from "express";

process.on("unhandledRejection", (error) => {
  console.error("⚠️ Error no manejado:", error);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Excepción no capturada:", error);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
});

// ================== CONFIGURACIÓN ==================
const welcomeChannelId = "1558703082001670196";
const inviteChannelId = "1558703902512381972";

// Canales que se mencionan en el mensaje de bienvenida
// CAMBIA estos dos por los IDs de tus canales actuales
const rulesChannelId = "1499823398317195455";
const ticketsChannelId = "1499837719004577973";

// ID del rol Founder
const founderRoleId = "1558704220465791007";

// ID del rol del staff (ve los tickets, se le menciona y puede reclamar)
const staffRoleId = "1558704312539021333";

// OPCIONAL: si quieres, pon aquí los IDs exactos.
// Si los dejas vacíos, el bot busca la categoría "tickets" y el canal
// "transcript" (dentro de la categoría "transcript-private") por nombre.
const ticketsCategoryId = "";
const transcriptChannelId = "";
// ===================================================

const invitesCache = new Map();

// ================== CATEGORÍAS DE TICKETS ==================
// Máximo 5 campos por categoría (límite de Discord)
const S = TextInputStyle.Short;
const P = TextInputStyle.Paragraph;

const ticketCategories = {
  soporte: {
    label: "Soporte",
    desc: "Ayuda general del servidor.",
    emojiId: "1541181087345021089",
    fields: [
      { label: "Nick de Minecraft", style: S, required: true },
      { label: "Modalidad", style: S, required: true },
      { label: "¿Eres Bedrock?", style: S, required: true },
      { label: "¿Cuál es tu problema?", style: P, required: true },
      { label: "Información adicional", style: S, required: false },
    ],
  },
  tienda: {
    label: "Tienda",
    desc: "Problemas con rangos o pagos.",
    emojiId: "1541084511931076778",
    fields: [
      { label: "Nick", style: S, required: true },
      { label: "Producto que quieres comprar", style: S, required: true },
      { label: "Método de pago", style: S, required: true },
      { label: "Detalles de la compra", style: P, required: true },
    ],
  },
  reportar_jugador: {
    label: "Reportar Jugador",
    desc: "Reporta a un usuario tramposo.",
    emojiId: "1541085710642319430",
    fields: [
      { label: "Nick del jugador", style: S, required: true },
      { label: "Modalidad", style: S, required: true },
      { label: "Motivo del reporte", style: S, required: true },
      { label: "Evidencias", style: S, required: true },
      { label: "Explicación", style: P, required: true },
    ],
  },
  apelaciones: {
    label: "Apelaciones",
    desc: "Solicita desbaneo o desmuteo.",
    emojiId: "1541181002842374174",
    fields: [
      { label: "Nick", style: S, required: true },
      { label: "¿Qué sanción recibiste?", style: S, required: true },
      { label: "¿Cuándo recibiste la sanción?", style: S, required: true },
      { label: "Evidencia", style: S, required: false },
    ],
  },
  reporte_staff: {
    label: "Reporte al Staff",
    desc: "Reporte hacia un miembro del equipo.",
    emojiId: "1534532975125987399",
    fields: [
      { label: "Tu nick", style: S, required: true },
      { label: "Nick del Staff reportado", style: S, required: true },
      { label: "Modalidad", style: S, required: true },
      { label: "Explica el problema", style: P, required: true },
    ],
  },
  media: {
    label: "Media",
    desc: "Solicita rango Youtuber o Streamer.",
    emojiId: "1541084604356624486",
    fields: [
      { label: "Nick de Minecraft", style: S, required: true },
      { label: "Plataforma y Seguidores", style: S, required: true },
      { label: "¿Qué contenido haces?", style: P, required: true },
      { label: "Link de tu canal o perfil", style: S, required: true },
    ],
  },
  unregister: {
    label: "Unregister",
    desc: "Solicitud de unregister/reset.",
    emojiId: "1541181198334828705",
    fields: [
      { label: "Tu nick", style: S, required: true },
      { label: "Modalidad", style: S, required: true },
      { label: "Motivo del unregister", style: S, required: true },
      { label: "Pruebas", style: S, required: true },
    ],
  },
  reporte_bugs: {
    label: "Reporte de Bugs",
    desc: "Informa sobre fallos del servidor.",
    emojiId: "1541181053773815839",
    fields: [
      { label: "Nick", style: S, required: true },
      { label: "Modalidad", style: S, required: true },
      { label: "¿Qué bug encontraste?", style: S, required: true },
      { label: "¿Cómo reproducirlo?", style: P, required: true },
      { label: "Evidencia", style: S, required: false },
    ],
  },
  devolucion: {
    label: "Devolución",
    desc: "Solicita devolución de inventario o items por una muerte injusta.",
    emojiId: null,
    fields: [
      { label: "Nick de Minecraft", style: S, required: true },
      { label: "Modalidad", style: S, required: true },
      { label: "¿Qué items perdiste?", style: P, required: true },
      { label: "¿Cómo ocurrió la muerte?", style: P, required: true },
    ],
  },
};
// ===========================================================

// ================== COMANDOS ==================
const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Envía el panel de tickets"),
  new SlashCommandBuilder()
    .setName("close")
    .setDescription("Cierra el ticket actual"),
  new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Muestra la IP del servidor"),
  new SlashCommandBuilder()
    .setName("compra")
    .setDescription("Registra la compra de un rango")
    .addStringOption((o) =>
      o.setName("rank").setDescription("Rango comprado").setRequired(true)
    )
    .addUserOption((o) =>
      o.setName("usuario").setDescription("Usuario que lo compró").setRequired(true)
    ),
].map((c) => c.toJSON());
// ==============================================

// ================== AYUDAS DE ROLES ==================
function getRoleIds(member) {
  if (!member?.roles) return [];
  if (Array.isArray(member.roles)) return member.roles;
  return [...member.roles.cache.keys()];
}

function hasRole(member, roleId) {
  return !!roleId && getRoleIds(member).includes(roleId);
}

function isAdmin(interaction) {
  return !!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
}

// Founder: por ID, por nombre del rol, o administrador del servidor
function isFounder(interaction) {
  const member = interaction.member;
  if (hasRole(member, founderRoleId)) return true;
  if (member?.roles?.cache?.some((r) => r.name.toLowerCase().includes("founder"))) return true;
  return isAdmin(interaction);
}

// Staff: por rol de staff o administrador
function isStaff(interaction) {
  return hasRole(interaction.member, staffRoleId) || isAdmin(interaction);
}
// =====================================================

// ================== BÚSQUEDA DE CANALES ==================
function norm(text) {
  return String(text ?? "").normalize("NFKC").toLowerCase();
}

function findTicketsCategory(guild) {
  if (ticketsCategoryId) return guild.channels.cache.get(ticketsCategoryId) ?? null;
  return (
    guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && norm(c.name).includes("tickets")
    ) ?? null
  );
}

function findTranscriptChannel(guild) {
  if (transcriptChannelId) return guild.channels.cache.get(transcriptChannelId) ?? null;

  const textChannels = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildText && norm(c.name).includes("transcript")
  );

  return (
    textChannels.find((c) => norm(c.parent?.name).includes("transcript")) ??
    textChannels.find((c) => !c.name.startsWith("ticket-")) ??
    null
  );
}
// =========================================================

// ================== TRANSCRIPT ==================
function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveMentions(text, guild) {
  return String(text ?? "")
    .replace(/<@!?(\d+)>/g, (_, id) => {
      const member = guild.members.cache.get(id);
      return `@${member ? member.user.tag : id}`;
    })
    .replace(/<@&(\d+)>/g, (_, id) => {
      const role = guild.roles.cache.get(id);
      return `@${role ? role.name : id}`;
    })
    .replace(/<#(\d+)>/g, (_, id) => {
      const ch = guild.channels.cache.get(id);
      return `#${ch ? ch.name : id}`;
    });
}

function toHtml(text, guild) {
  return escapeHtml(resolveMentions(text, guild)).replace(/\n/g, "<br>");
}

async function fetchAllMessages(channel, max = 2000) {
  const all = [];
  let lastId;

  while (all.length < max) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    all.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  return all.reverse(); // del más antiguo al más nuevo
}

function buildTranscriptHtml(channel, messages) {
  const guild = channel.guild;

  const rows = messages
    .map((m) => {
      const time = m.createdAt.toISOString().replace("T", " ").slice(0, 19) + " UTC";
      let body = "";

      if (m.cleanContent) {
        body += `<div class="content">${toHtml(m.content, guild)}</div>`;
      }

      for (const e of m.embeds) {
        let eh = "";
        if (e.title) eh += `<div class="etitle">${toHtml(e.title, guild)}</div>`;
        if (e.description) eh += `<div class="edesc">${toHtml(e.description, guild)}</div>`;
        for (const f of e.fields ?? []) {
          eh += `<div class="efield"><b>${toHtml(f.name, guild)}</b><br>${toHtml(f.value, guild)}</div>`;
        }
        if (eh) body += `<div class="embed">${eh}</div>`;
      }

      for (const a of m.attachments.values()) {
        body += `<div class="att">📎 <a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a></div>`;
      }

      return `<div class="msg"><div class="head"><span class="author">${escapeHtml(
        m.author?.tag ?? "Desconocido"
      )}</span> <span class="time">${time}</span></div>${body}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Transcript ${escapeHtml(channel.name)}</title>
<style>
  body { background:#1e1f22; color:#dbdee1; font-family: Arial, sans-serif; margin:0; padding:16px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:#949ba4; font-size:13px; margin-bottom:16px; }
  .msg { padding:8px 0; border-bottom:1px solid #2b2d31; }
  .author { font-weight:bold; color:#fff; }
  .time { color:#949ba4; font-size:12px; margin-left:6px; }
  .content { margin-top:4px; word-wrap:break-word; }
  .embed { margin-top:6px; background:#2b2d31; border-left:4px solid #1abc9c; padding:8px 10px; border-radius:4px; }
  .etitle { font-weight:bold; margin-bottom:4px; }
  .efield { margin-top:6px; }
  .att { margin-top:4px; }
  a { color:#00a8fc; }
</style>
</head>
<body>
<h1>Transcript de #${escapeHtml(channel.name)}</h1>
<div class="sub">${escapeHtml(guild.name)} · ${messages.length} mensajes</div>
${rows}
</body>
</html>`;
}

async function closeTicket(channel, closer) {
  try {
    await channel.send("🔒 Guardando el transcript y cerrando el ticket...");

    const guild = channel.guild;
    const messages = await fetchAllMessages(channel);

    const topic = channel.topic ?? "";
    const openerId = topic.match(/ID:\s*(\d+)/)?.[1];
    const categoryName = topic.match(/Categoría:\s*(.+)$/)?.[1] ?? "Desconocida";

    // Staff a cargo (se lee del embed del ticket)
    let staffText = "Sin reclamar";
    for (const m of messages) {
      const description = m.embeds?.[0]?.description;
      if (description && description.includes("Staff a cargo:")) {
        const found = description.match(/Staff a cargo:\*\*\s*(.+)/);
        if (found) staffText = found[1].trim();
        break;
      }
    }

    const html = buildTranscriptHtml(channel, messages);
    const buffer = Buffer.from(html, "utf-8");
    const fileName = `transcript-${channel.name}.html`;

    // 1) Enviar al canal de transcripts
    const transcriptChannel = findTranscriptChannel(guild);
    if (transcriptChannel) {
      try {
        const logEmbed = new EmbedBuilder()
          .setTitle("📄 Transcript de ticket")
          .setColor(0x1abc9c)
          .addFields(
            { name: "🎫 Ticket", value: channel.name, inline: true },
            { name: "📂 Categoría", value: categoryName, inline: true },
            { name: "💬 Mensajes", value: String(messages.length), inline: true },
            { name: "👤 Abierto por", value: openerId ? `<@${openerId}>` : "Desconocido", inline: true },
            { name: "🛡️ Staff a cargo", value: staffText, inline: true },
            { name: "🔒 Cerrado por", value: `<@${closer.id}>`, inline: true }
          )
          .setTimestamp();

        await transcriptChannel.send({
          embeds: [logEmbed],
          files: [new AttachmentBuilder(buffer, { name: fileName })],
        });
      } catch (error) {
        console.error("Error enviando transcript al canal:", error);
      }
    } else {
      console.warn("No encontré el canal de transcripts (categoría transcript-private > transcript).");
    }

    // 2) Enviar por MD a quien abrió el ticket
    if (openerId) {
      try {
        const opener = await client.users.fetch(openerId);
        await opener.send({
          content: `📄 Aquí tienes el transcript de tu ticket **${channel.name}** en **${guild.name}**.`,
          files: [new AttachmentBuilder(buffer, { name: fileName })],
        });
      } catch (error) {
        console.error("No pude enviar el transcript por MD:", error.message);
      }
    }
  } catch (error) {
    console.error("Error generando el transcript:", error);
  }

  setTimeout(async () => {
    try {
      await channel.delete();
    } catch (e) {}
  }, 3000);
}
// ================================================

client.on("ready", async () => {
  console.log(`¡Bot conectado como ${client.user?.tag}!`);

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(commands);
      console.log(`Comandos registrados en ${guild.name}`);
    } catch (error) {
      console.error(`Error registrando comandos en ${guild.name}:`, error);
    }

    try {
      const firstInvites = await guild.invites.fetch();
      const guildInvites = new Map();
      firstInvites.forEach((invite) =>
        guildInvites.set(invite.code, invite.uses || 0)
      );
      invitesCache.set(guild.id, guildInvites);
    } catch (error) {
      console.error(`Error cargando invites en ${guild.name}:`, error);
    }
  }
});

client.on("inviteCreate", async (invite) => {
  if (!invite.guild) return;
  const guildInvites = invitesCache.get(invite.guild.id) || new Map();
  guildInvites.set(invite.code, invite.uses || 0);
  invitesCache.set(invite.guild.id, guildInvites);
});

client.on("inviteDelete", async (invite) => {
  if (!invite.guild) return;
  const guildInvites = invitesCache.get(invite.guild.id);
  if (guildInvites) guildInvites.delete(invite.code);
});

client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild;
    const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
    const inviteChannel = guild.channels.cache.get(inviteChannelId);

    const oldInvites = invitesCache.get(guild.id) || new Map();
    const newInvites = await guild.invites.fetch();
    let usedInvite = null;

    for (const [code, newInvite] of newInvites.entries()) {
      if ((newInvite.uses ?? 0) > (oldInvites.get(code) || 0)) {
        usedInvite = newInvite;
        break;
      }
    }

    const guildInvites = new Map();
    newInvites.forEach((invite) =>
      guildInvites.set(invite.code, invite.uses || 0)
    );
    invitesCache.set(guild.id, guildInvites);

    if (welcomeChannel) {
      const welcomeText = `# __BIENVENIDO A VEXONeMC NETWORK__\n\n¡Bienvenid@ ${member.toString()} a **VexoneMc Network**! Gracias por unirte.\n\n> Ve a <#${rulesChannelId}> para las reglas.\n> Abre un ticket en <#${ticketsChannelId}> si necesitas ayuda.\n\n**IP Java:** \`VexoneMC.aternos.me\`\n**IP Bedrock:** \`VexoneMC.aternos.me\` : \`25704\``;
      await welcomeChannel.send({ content: welcomeText });
    }

    if (inviteChannel) {
      const inviterText = usedInvite?.inviter
        ? `<@${usedInvite.inviter.id}>`
        : "Desconocido / Enlace personalizado";
      const inviteEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📊 NUEVA INVITACIÓN")
        .setDescription(`El usuario **${member.user.tag}** se ha unido al servidor.`)
        .addFields({ name: "👤 Invitado por", value: inviterText, inline: false })
        .setTimestamp();
      await inviteChannel.send({ embeds: [inviteEmbed] });
    }
  } catch (error) {
    console.error("Error en guildMemberAdd:", error);
  }
});

// ================== PANEL DE TICKETS (con botones) ==================
function createTicketPanel(useEmojis = true) {
  const container = new ContainerBuilder().setAccentColor(0x1abc9c);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "## Soporte de VexoneMc Network\n¿Necesitas ayuda? Acá estamos.\nAquí podrás abrir un ticket para cualquiera de las siguientes categorías:"
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  for (const [key, cat] of Object.entries(ticketCategories)) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${cat.label}:** ${cat.desc}`)
    );

    const button = new ButtonBuilder()
      .setCustomId(`ticket_open_${key}`)
      .setLabel(cat.label)
      .setStyle(ButtonStyle.Secondary);
    if (useEmojis && cat.emojiId) button.setEmoji({ id: cat.emojiId });

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(button)
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("© 2026 VexoneMc Network.")
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
// ====================================================================

function isTicketChannel(channel) {
  return channel.name.startsWith("ticket-");
}

client.on("interactionCreate", async (interaction) => {
  // ---------- Comandos slash ----------
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {
      if (!isAdmin(interaction)) {
        return await interaction.reply({ content: "No tienes permisos.", ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.channel;
      if (!channel) return await interaction.editReply({ content: "No pude encontrar el canal." });

      try {
        await channel.send(createTicketPanel(true));
        return await interaction.editReply({ content: "Panel enviado con éxito." });
      } catch (error) {
        console.error("Error enviando panel con emojis:", error);
        try {
          await channel.send(createTicketPanel(false));
          return await interaction.editReply({
            content: "Panel enviado sin emojis (el bot no pudo usar los emojis personalizados).",
          });
        } catch (error2) {
          console.error("Error enviando panel:", error2);
          return await interaction.editReply({
            content: `❌ No pude enviar el panel: ${String(error2.message).slice(0, 150)}`,
          });
        }
      }
    }

    if (interaction.commandName === "close") {
      const channel = interaction.channel;
      if (!channel || !isTicketChannel(channel)) {
        return await interaction.reply({ content: "Usa esto en un canal de tickets.", ephemeral: true });
      }
      await interaction.reply({ content: "⏳ Cerrando ticket...", ephemeral: true });
      return await closeTicket(channel, interaction.user);
    }

    if (interaction.commandName === "ip") {
      return await interaction.reply({
        content: "**IP Java:** `VexoneMC.aternos.me`\n**IP Bedrock:** `VexoneMC.aternos.me` : `25704`",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "compra") {
      if (!isFounder(interaction)) {
        const roles = getRoleIds(interaction.member).map(
          (id) => `${interaction.guild?.roles.cache.get(id)?.name} (${id})`
        );
        console.log("/compra rechazado. Roles del usuario:", roles);
        return await interaction.reply({
          content: "❌ Solo los Founder pueden usar este comando.",
          ephemeral: true,
        });
      }

      const rank = interaction.options.getString("rank", true);
      const user = interaction.options.getUser("usuario", true);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🛒 NUEVA COMPRA")
        .addFields(
          { name: "👤 Usuario", value: `<@${user.id}>`, inline: true },
          { name: "🏷️ Rango", value: rank, inline: true }
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    }
  }

  // ---------- Botón de categoría -> abre el formulario ----------
  if (interaction.isButton() && interaction.customId.startsWith("ticket_open_")) {
    const key = interaction.customId.replace("ticket_open_", "");
    const cat = ticketCategories[key];
    if (!cat) return;

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${key}`)
      .setTitle(`Ticket: ${cat.label}`);

    cat.fields.forEach((fieldData, index) => {
      const textInput = new TextInputBuilder()
        .setCustomId(`field_${index}`)
        .setLabel(fieldData.label)
        .setStyle(fieldData.style)
        .setRequired(fieldData.required)
        .setMaxLength(fieldData.style === P ? 1000 : 300);
      modal.addComponents(new ActionRowBuilder().addComponents(textInput));
    });

    return await interaction.showModal(modal);
  }

  // ---------- Envío del formulario -> crea el ticket ----------
  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    if (!guild) return;

    const catType = interaction.customId.replace("ticket_modal_", "");
    const cat = ticketCategories[catType];
    if (!cat) return await interaction.editReply({ content: "❌ Categoría inválida." });

    const channelName = `ticket-${catType}-${interaction.user.username.toLowerCase()}`;

    try {
      // Solo usa el rol de staff si existe en el servidor
      const staffRole = staffRoleId ? guild.roles.cache.get(staffRoleId) : null;

      // Categoría "tickets" donde se crean los tickets
      const ticketsCategory = findTicketsCategory(guild);
      if (!ticketsCategory) {
        console.warn('No encontré la categoría "tickets"; el ticket se crea sin categoría.');
      }

      const overwrites = [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ];

      if (staffRole) {
        overwrites.push({
          id: staffRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        });
      }

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketsCategory ? ticketsCategory.id : undefined,
        // El topic guarda quién abrió el ticket (se usa para el MD del transcript)
        topic: `Ticket de ${interaction.user.tag} | ID: ${interaction.user.id} | Categoría: ${cat.label}`,
        permissionOverwrites: overwrites,
      });

      // "Staff a cargo" va en la primera línea del embed
      const embed = new EmbedBuilder()
        .setTitle(`Ticket de ${cat.label.toUpperCase()}`)
        .setColor(0x1abc9c)
        .setDescription(
          `**Staff a cargo:** Sin reclamar\n**Abierto por:** <@${interaction.user.id}>`
        )
        .setTimestamp();

      cat.fields.forEach((fieldData, index) => {
        const val = interaction.fields.getTextInputValue(`field_${index}`);
        embed.addFields({
          name: fieldData.label,
          value: (val || "No especificado").slice(0, 1024),
          inline: false,
        });
      });

      const btnReclamar = new ButtonBuilder()
        .setCustomId("claim_ticket_btn")
        .setLabel("Reclamar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✋");

      const btnCerrar = new ButtonBuilder()
        .setCustomId("close_ticket_btn")
        .setLabel("Cerrar Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒");

      const row = new ActionRowBuilder().addComponents(btnReclamar, btnCerrar);

      const mention = staffRole ? `<@&${staffRole.id}> | ` : "";
      await ticketChannel.send({
        content: `${mention}<@${interaction.user.id}> ¡Ticket creado con éxito!`,
        embeds: [embed],
        components: [row],
      });

      return await interaction.editReply({ content: `✅ ¡Ticket creado en <#${ticketChannel.id}>!` });
    } catch (error) {
      console.error("Error creando ticket:", error);
      return await interaction.editReply({
        content: `❌ Error al crear el canal: ${String(error.message).slice(0, 150)}`,
      });
    }
  }

  // ---------- Botón reclamar ----------
  if (interaction.isButton() && interaction.customId === "claim_ticket_btn") {
    if (!isStaff(interaction)) {
      return await interaction.reply({
        content: "❌ Solo el staff puede reclamar tickets.",
        ephemeral: true,
      });
    }

    const oldEmbed = interaction.message.embeds[0];
    if (!oldEmbed) return;

    // Cambia la primera línea del embed: "Staff a cargo"
    const lines = (oldEmbed.description ?? "").split("\n");
    lines[0] = `**Staff a cargo:** <@${interaction.user.id}>`;

    const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(lines.join("\n"));

    const btnReclamado = new ButtonBuilder()
      .setCustomId("claim_ticket_btn")
      .setLabel("Reclamado")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✋")
      .setDisabled(true);

    const btnCerrar = new ButtonBuilder()
      .setCustomId("close_ticket_btn")
      .setLabel("Cerrar Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒");

    return await interaction.update({
      embeds: [newEmbed],
      components: [new ActionRowBuilder().addComponents(btnReclamado, btnCerrar)],
    });
  }

  // ---------- Botón cerrar ----------
  if (interaction.isButton() && interaction.customId === "close_ticket_btn") {
    const channel = interaction.channel;
    if (!channel || !isTicketChannel(channel)) return;
    await interaction.reply({ content: "⏳ Cerrando ticket..." });
    await closeTicket(channel, interaction.user);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("DISCORD_TOKEN no configurado.");

client.login(token);

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("¡El bot está activo!");
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Servidor web en puerto ${PORT}`);
});
