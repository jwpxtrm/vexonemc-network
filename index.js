import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionsBitField, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  CategoryChannel,
  AttachmentBuilder
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

const welcomeChannelId = "1499822302454616075"; 
const inviteChannelId = "1499931419277791293";   
const invitesCache = new Map();

client.on("ready", async () => {
  console.log(`¡Bot conectado como ${client.user?.tag}!`);
  for (const guild of client.guilds.cache.values()) {
    try {
      const firstInvites = await guild.invites.fetch();
      const guildInvites = new Map();
      firstInvites.forEach(invite => guildInvites.set(invite.code, invite.uses || 0));
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
    newInvites.forEach(invite => guildInvites.set(invite.code, invite.uses || 0));
    invitesCache.set(guild.id, guildInvites);

    if (welcomeChannel) {
      const welcomeText = `# __BIENVENIDO A VEXONeMC NETWORK__\n\n¡Bienvenid@ ${member.toString()} a **VexoneMc Network**! Gracias por unirte al servidor.\n\n> Ve a <#1499823398317195455> para las reglas.\n> Abre un ticket en <#1499837719004577973> si necesitas ayuda.\n\n**IP Java:** \`VexoneMC.aternos.me\`\n**IP Bedrock:** \`VexoneMC.aternos.me\` : \`25704\``;
      await welcomeChannel.send({ content: welcomeText });
    }

    if (inviteChannel) {
      const inviterText = usedInvite?.inviter ? `<@${usedInvite.inviter.id}>` : "Desconocido / Enlace personalizado";
      const inviteEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
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

function createTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle("SOPORTE DE VEXONEMC NETWORK")
    .setDescription("Selecciona una categoría en el menú de abajo para abrir un ticket de soporte con el staff.")
    .setColor(0xF1C40F);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("ticket_category_select")
    .setPlaceholder("Selecciona una categoría...")
    .addOptions([
      { label: "Soporte", description: "Ayuda general del servidor", value: "soporte" },
      { label: "Tienda", description: "Problemas con rangos o pagos", value: "tienda" },
      { label: "Reportar Jugador", description: "Reporta a un usuario tramposo", value: "reportar_jugador" },
      { label: "Apelaciones", description: "Solicita desbaneo o desmuteo", value: "apelaciones" },
      { label: "Reporte de Bugs", description: "Informa sobre fallos del servidor", value: "reporte_bugs" },
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

const modalFieldsConfig = {
  soporte: [
    { label: "Nick de Minecraft", style: TextInputStyle.Short, required: true },
    { label: "¿Cuál es tu problema?", style: TextInputStyle.Paragraph, required: true }
  ],
  tienda: [
    { label: "Nick", style: TextInputStyle.Short, required: true },
    { label: "Detalles de la compra", style: TextInputStyle.Paragraph, required: true }
  ],
  reportar_jugador: [
    { label: "Nick del tramposo", style: TextInputStyle.Short, required: true },
    { label: "Pruebas / Explicación", style: TextInputStyle.Paragraph, required: true }
  ],
  apelaciones: [
    { label: "Nick", style: TextInputStyle.Short, required: true },
    { label: "¿Por qué debemos desbanearte?", style: TextInputStyle.Paragraph, required: true }
  ],
  reporte_bugs: [
    { label: "Describe el bug", style: TextInputStyle.Paragraph, required: true }
  ]
};

function isTicketChannel(channel) {
  return channel.name.startsWith("ticket-");
}

async function closeTicket(channel, executorTag) {
  try {
    await channel.send("🔒 Este canal se cerrará en 5 segundos...");
    setTimeout(async () => {
      try { await channel.delete(); } catch (e) {}
    }, 5000);
  } catch (error) {
    console.error("Error cerrando ticket:", error);
  }
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel" || interaction.commandName === "ticket-setup") {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({ content: "No tienes permisos.", ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.channel;
      if (channel) await channel.send(createTicketPanel());
      return await interaction.editReply({ content: "Panel enviado con éxito." });
    }

    if (interaction.commandName === "close") {
      const channel = interaction.channel;
      if (!channel || !isTicketChannel(channel)) return await interaction.reply({ content: "Usa esto en un canal de tickets.", ephemeral: true });
      await interaction.reply({ content: "⏳ Cerrando ticket...", ephemeral: true });
      return await closeTicket(channel, interaction.user.tag);
    }

    if (interaction.commandName === "ip") {
      return await interaction.reply({ 
        content: "**IP Java:** `VexoneMC.aternos.me`\n**IP Bedrock:** `VexoneMC.aternos.me` : `25704`", 
        ephemeral: true 
      });
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_category_select") {
    const category = interaction.values[0];
    const fieldsConfig = modalFieldsConfig[category];
    if (!fieldsConfig) return;

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${category}`)
      .setTitle(`Ticket: ${category.toUpperCase()}`);

    fieldsConfig.forEach((fieldData, index) => {
      const inputId = `field_${index}`;
      const textInput = new TextInputBuilder()
        .setCustomId(inputId)
        .setLabel(fieldData.label)
        .setStyle(fieldData.style)
        .setRequired(fieldData.required);
      modal.addComponents(new ActionRowBuilder().addComponents(textInput));
    });

    return await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    if (!guild) return;

    const catType = interaction.customId.replace("ticket_modal_", "");
    const channelName = `ticket-${catType}-${interaction.user.username.toLowerCase()}`;

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket de ${catType.toUpperCase()}`)
        .setColor(0xF1C40F)
        .setDescription(`Abierto por <@${interaction.user.id}>`)
        .setTimestamp();

      const fieldsConfig = modalFieldsConfig[catType];
      if (fieldsConfig) {
        fieldsConfig.forEach((fieldData, index) => {
          const val = interaction.fields.getTextInputValue(`field_${index}`);
          embed.addFields({ name: fieldData.label, value: val || "No especificado", inline: false });
        });
      }

      const btnCerrar = new ButtonBuilder()
        .setCustomId("close_ticket_btn")
        .setLabel("Cerrar Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒");

      const row = new ActionRowBuilder().addComponents(btnCerrar);

      await ticketChannel.send({
        content: `<@&1499837719004577973> | <@${interaction.user.id}> ¡Ticket creado con éxito!`,
        embeds: [embed],
        components: [row],
      });

      return await interaction.editReply({ content: `✅ ¡Ticket creado en <#${ticketChannel.id}>!` });
    } catch (error) {
      console.error(error);
      return await interaction.editReply({ content: "❌ Error al crear el canal." });
    }
  }

  if (interaction.isButton() && interaction.customId === "close_ticket_btn") {
    const channel = interaction.channel;
    if (!channel || !isTicketChannel(channel)) return;
    await interaction.reply({ content: "⏳ Cerrando ticket..." });
    await closeTicket(channel, interaction.user.tag);
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
