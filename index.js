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

async function closeTicket(channel) {
  try {
    await channel.send("🔒 Este canal se cerrará en 5 segundos...");
    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (e) {}
    }, 5000);
  } catch (error) {
    console.error("Error cerrando ticket:", error);
  }
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
      return await closeTicket(channel);
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
        permissionOverwrites: overwrites,
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket de ${cat.label.toUpperCase()}`)
        .setColor(0x1abc9c)
        .setDescription(`Abierto por <@${interaction.user.id}>`)
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

      // La primera línea SIEMPRE es "Staff a cargo" (el botón Reclamar la edita)
      const mention = staffRole ? `<@&${staffRole.id}> | ` : "";
      await ticketChannel.send({
        content: `**Staff a cargo:** Sin reclamar\n\n${mention}<@${interaction.user.id}> ¡Ticket creado con éxito!`,
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

    const lines = interaction.message.content.split("\n");
    lines[0] = `**Staff a cargo:** <@${interaction.user.id}>`;

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
      content: lines.join("\n"),
      components: [new ActionRowBuilder().addComponents(btnReclamado, btnCerrar)],
    });
  }

  // ---------- Botón cerrar ----------
  if (interaction.isButton() && interaction.customId === "close_ticket_btn") {
    const channel = interaction.channel;
    if (!channel || !isTicketChannel(channel)) return;
    await interaction.reply({ content: "⏳ Cerrando ticket..." });
    await closeTicket(channel);
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
