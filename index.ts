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
const invitesCache = new Map<string, Map<string, number>>();

client.on("ready", async () => {
  console.log(`¡Bot conectado como ${client.user?.tag}!`);
  for (const guild of client.guilds.cache.values()) {
    try {
      const firstInvites = await guild.invites.fetch();
      const guildInvites = new Map<string, number>();
      firstInvites.forEach(invite => guildInvites.set(invite.code, invite.uses || 0));
      invitesCache.set(guild.id, guildInvites);
    } catch (error) {
      console.error(`Error cargando invites en ${guild.name}:`, error);
    }
  }
});

client.on("inviteCreate", async (invite) => {
  if (!invite.guild) return;
  const guildInvites = invitesCache.get(invite.guild.id) || new Map<string, number>();
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
    const welcomeChannel = guild.channels.cache.get(welcomeChannelId) as TextChannel;
    const inviteChannel = guild.channels.cache.get(inviteChannelId) as TextChannel;

    const oldInvites = invitesCache.get(guild.id) || new Map<string, number>();
    const newInvites = await guild.invites.fetch();
    let usedInvite: any = null;

    for (const [code, newInvite] of newInvites.entries()) {
      if ((newInvite.uses ?? 0) > (oldInvites.get(code) || 0)) {
        usedInvite = newInvite;
        break;
      }
    }

    const guildInvites = new Map<string, number>();
    newInvites.forEach(invite => guildInvites.set(invite.code, invite.uses || 0));
    invitesCache.set(guild.id, guildInvites);

    if (welcomeChannel) {
      const welcomeText = `# __BIENVENIDO A VEXONeMC NETWORK__\n\n¡Bienvenid@ ${member.toString()} a **VexoneMc Network**! Gracias por unirte al servidor, esperamos que te diviertas.\n\n> Ve a <#1499823398317195455> para conocer las reglas del servidor.\n> Si tienes alguna duda, abre un ticket en <#1499837719004577973>.\n\n**INFORMACIÓN DEL SERVIDOR**\n\n**IP Java:** \`VexoneMC.aternos.me\`\n**IP Bedrock:** \`VexomeMC.aternos.me\` : \`25704\`\n**Tienda:** Próximamente ...`;
      await welcomeChannel.send({ content: welcomeText });
    }

    if (inviteChannel) {
      const inviterText = usedInvite?.inviter ? `<@${usedInvite.inviter.id}> (${usedInvite.inviter.tag})` : "Desconocido / Enlace personalizado";
      const inviteEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📊 NUEVA INVITACIÓN REGISTRADA")
        .setDescription(`El usuario **${member.user.tag}** se ha unido al servidor.`)
        .addFields({ name: "👤 Invitado por", value: inviterText, inline: false })
        .setTimestamp()
        .setFooter({ text: "VexoneMC Network • Sistema de Invites" });
      await inviteChannel.send({ embeds: [inviteEmbed] });
    }
  } catch (error) {
    console.error("Error en guildMemberAdd:", error);
  }
});

function createTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle("SOPORTE DE VEXONEMC NETWORK")
    .setDescription(
      "Bienvenido al sistema de tickets.\n\n" +
      "**¿Cómo creo un ticket?** 👀\n\n" +
      "Selecciona la categoría que mejor describa tu problema.\n\n" +
      "¡Recuerda tener paciencia!\n" +
      "Un miembro del staff te atenderá lo más pronto posible.\n\n" +
      "**CATEGORÍAS**\n" +
      "<:tuerca:1541181087345021089> Soporte\n" +
      "<:tienda:1541084511931076778> Tienda\n" +
      "<:warn:1541085710642319430> Reportar Jugador\n" +
      "<:justicia:1541181002842374174> Apelaciones\n" +
      "<a:ez:1534532975125987399> Reporte al Staff\n" +
      "<:estrella:1541084604356624486> Media\n" +
      "<:cmd:1541181198334828705> Unregister\n" +
      "<:mantenimiento:1541181053773815839> Reporte de Bugs"
    )
    .setColor(0xF1C40F);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("ticket_category_select")
    .setPlaceholder("Selecciona una categoría...")
    .addOptions([
      { label: "Soporte", description: "Ayuda general del servidor", value: "soporte", emoji: "1541181087345021089" },
      { label: "Tienda", description: "Problemas con rangos o pagos", value: "tienda", emoji: "1541084511931076778" },
      { label: "Reportar Jugador", description: "Reporta a un usuario tramposo", value: "reportar_jugador", emoji: "1541085710642319430" },
      { label: "Apelaciones", description: "Solicita desbaneo o desmuteo", value: "apelaciones", emoji: "1541181002842374174" },
      { label: "Reporte al Staff", description: "Reporte hacia un equipo", value: "reporte_staff", emoji: "1534532975125987399" },
      { label: "Media", description: "Solicita rango Youtuber o Streamer", value: "media", emoji: "1541084604356624486" },
      { label: "Unregister", description: "Solicitud de unregister/reset", value: "unregister", emoji: "1541181198334828705" },
      { label: "Reporte de Bugs", description: "Informa sobre fallos del servidor", value: "reporte_bugs", emoji: "1541181053773815839" },
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

const modalFieldsConfig: Record<string, { label: string; style: TextInputStyle; required: boolean }[]> = {
  soporte: [
    { label: "Nick de Minecraft", style: TextInputStyle.Short, required: true },
    { label: "Modalidad", style: TextInputStyle.Short, required: true },
    { label: "¿Eres Bedrock?", style: TextInputStyle.Short, required: true },
    { label: "¿Cuál es tu problema?", style: TextInputStyle.Paragraph, required: true },
    { label: "Información adicional", style: TextInputStyle.Short, required: false }
  ],
  tienda: [
    { label: "Nick", style: TextInputStyle.Short, required: true },
    { label: "Producto que quieres comprar", style: TextInputStyle.Short, required: true },
    { label: "Método de pago", style: TextInputStyle.Short, required: true },
    { label: "Detalles de la compra", style: TextInputStyle.Paragraph, required: true }
  ],
  reportar_jugador: [
    { label: "Nick del jugador", style: TextInputStyle.Short, required: true },
    { label: "Modalidad", style: TextInputStyle.Short, required: true },
    { label: "Motivo del reporte", style: TextInputStyle.Short, required: true },
    { label: "Evidencias", style: TextInputStyle.Short, required: true },
    { label: "Explicación", style: TextInputStyle.Paragraph, required: true }
  ],
  apelaciones: [
    { label: "Nick", style: TextInputStyle.Short, required: true },
    { label: "¿Qué sanción recibiste?", style: TextInputStyle.Short, required: true },
    { label: "¿Cuándo recibiste la sanción?", style: TextInputStyle.Short, required: true },
    { label: "Evidencia", style: TextInputStyle.Short, required: false }
  ],
  reporte_bugs: [
    { label: "Nick", style: TextInputStyle.Short, required: true },
    { label: "Modalidad", style: TextInputStyle.Short, required: true },
    { label: "¿Qué bug encontraste?", style: TextInputStyle.Short, required: true },
    { label: "¿Cómo reproducirlo?", style: TextInputStyle.Paragraph, required: true },
    { label: "Evidencia", style: TextInputStyle.Short, required: false }
  ],
  media: [
    { label: "Nick de Minecraft", style: TextInputStyle.Short, required: true },
    { label: "Plataforma y Seguidores", style: TextInputStyle.Short, required: true },
    { label: "¿Qué contenido haces?", style: TextInputStyle.Paragraph, required: true },
    { label: "Link de tu canal o perfil", style: TextInputStyle.Short, required: true }
  ],
  reporte_staff: [
    { label: "Tu nick", style: TextInputStyle.Short, required: true },
    { label: "Nick del Staff reportado", style: TextInputStyle.Short, required: true },
    { label: "Modalidad", style: TextInputStyle.Short, required: true },
    { label: "Explica el problema", style: TextInputStyle.Paragraph, required: true }
  ],
  unregister: [
    { label: "Tu nick", style: TextInputStyle.Short, required: true },
    { label: "Modalidad", style: TextInputStyle.Short, required: true },
    { label: "Motivo del unregister", style: TextInputStyle.Short, required: true },
    { label: "Pruebas", style: TextInputStyle.Short, required: true }
  ]
};

function isTicketChannel(channel: TextChannel): boolean {
  return channel.name.startsWith("ticket-");
}

async function closeTicket(channel: TextChannel, executorTag: string, ticketOwnerId?: string) {
  try {
    const guild = channel.guild;
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = Array.from(messages.values()).reverse();
    
    let transcriptText = `=== TRANSCRIPT DEL TICKET: ${channel.name} ===\n`;
    transcriptText += `Servidor: VexoneMc Network\n`;
    transcriptText += `Cerrado por: ${executorTag}\n`;
    transcriptText += `Fecha: ${new Date().toUTCString()}\n\n`;

    sortedMessages.forEach(m => {
      const time = m.createdAt.toISOString();
      transcriptText += `[${time}] ${m.author.tag}:${m.content}\n`;
      if (m.embeds.length > 0) {
        m.embeds.forEach(emb => {
          transcriptText += ` [Embed: ${emb.title \vert{}\vert{} 'Sin título'} - ${emb.description || 'Sin descripción'}]\n`;
          emb.fields.forEach(f => {
            transcriptText += `   - ${f.name}:${f.value}\n`;
          });
        });
      }
    });

    const buffer = Buffer.from(transcriptText, "utf-8");
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

    let ticketCategory = guild.channels.cache.find(
      c => c.name.toLowerCase() === "tickets usuarios" && c.type === ChannelType.GuildCategory
    ) as CategoryChannel | undefined;

    if (!ticketCategory) {
      ticketCategory = await guild.channels.create({ name: "Tickets Usuarios", type: ChannelType.GuildCategory });
    }

    let transcriptsChannel = guild.channels.cache.find(
      c => c.name.toLowerCase() === "transcripts" && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!transcriptsChannel) {
      transcriptsChannel = await guild.channels.create({
        name: "transcripts",
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: client.user!.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });
    }

    const logMsg = await transcriptsChannel.send({
      content: `📁 **Transcript del ticket \`${channel.name}\`** (Cerrado por **${executorTag}**):`,
      files: [attachment]
    });

    const previewText = transcriptText.length > 1900 ? transcriptText.substring(0, 1900) + "..." : transcriptText;
    await transcriptsChannel.send({
      content: `📜 **Vista previa del contenido:**\n\`\`\`txt\n${previewText}\n\`\`\``
    });

    if (ticketOwnerId) {
      try {
        const ownerUser = await client.users.fetch(ticketOwnerId);
        if (ownerUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("🔒 VexoneMc Network — Ticket Cerrado")
            .setColor(0xF1C40F)
            .setDescription(`Tu ticket \`${channel.name}\` en **VexoneMc Network** ha sido cerrado correctamente.`)
            .addFields(
              { name: "🏰 Servidor", value: "VexoneMc Network", inline: true },
              { name: "👤 Cerrado por", value: executorTag, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: "VexoneMc Network • Sistema de Soporte" });

          const rowDm = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Ver Transcript")
              .setStyle(ButtonStyle.Link)
              .setURL(logMsg.attachments.first()?.url || "https://discord.com")
          );

          await ownerUser.send({
            content: `Hola 👋, aquí tienes el registro de tu ticket en **VexoneMc Network**:`,
            embeds: [dmEmbed],
            components: [rowDm]
          });
        }
      } catch (dmErr) {
        console.log("No se pudo enviar DM al usuario.");
      }
    }

    await channel.send("🔒 Este canal se cerrará permanentemente en 5 segundos...");
    setTimeout(async () => {
      try { await channel.delete(); } catch (e) { console.error(e); }
    }, 5000);
  } catch (error) {
    console.error("Error generando transcript:", error);
    try { await channel.delete(); } catch (e) {}
  }
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel" || interaction.commandName === "ticket-setup") {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({ content: "No tienes permisos.", ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.channel as TextChannel;
      if (channel) await channel.send(createTicketPanel());
      return await interaction.editReply({ content: "Panel enviado con éxito." });
    }

    if (interaction.commandName === "close") {
      const channel = interaction.channel as TextChannel;
      if (!channel || !isTicketChannel(channel)) return await interaction.reply({ content: "Usa esto en un canal de tickets.", ephemeral: true });
      await interaction.reply({ content: "⏳ Generando transcript y cerrando...", ephemeral: true });
      let ownerId = "";
      if (channel.topic && channel.topic.includes("owner:")) {
        const match = channel.topic.match(/owner:(\d+)/);
        if (match) ownerId = match[1];
      }
      return await closeTicket(channel, interaction.user.tag, ownerId);
    }

    if (interaction.commandName === "ip") {
      return await interaction.reply({ 
        content: "**IP Java:** `VexoneMC.aternos.me`\n**IP Bedrock:** `VexoneMC.aternos.me` : `25704`", 
        ephemeral: true 
      });
    }

    if (interaction.commandName === "rename") {
      const channel = interaction.channel as TextChannel;
      if (!channel || !isTicketChannel(channel)) {
        return await interaction.reply({ content: "Usa este comando dentro de un canal de tickets.", ephemeral: true });
      }
      
      const nuevoNombre = interaction.options.getString("nombre", true);
      try {
        await channel.setName(`ticket-${nuevoNombre}`);
        return await interaction.reply({ content: `✅ Canal renombrado a: \`ticket-${nuevoNombre}\``, ephemeral: true });
      } catch (error) {
        console.error(error);
        return await interaction.reply({ content: "❌ No pude renombrar el canal.", ephemeral: true });
      }
    }

    if (interaction.commandName === "compra") {
      const rank = interaction.options.getString("rank") || "No especificado";
      const usuario = interaction.options.getString("usuario") || interaction.user.username;

      const embedCompra = new EmbedBuilder()
        .setTitle("🛒 Detalle de Compra - VexoneMc Network")
        .setColor(0x2ECC71)
        .addFields(
          { name: "Rango", value: `\`${rank}\``, inline: true },
          { name: "Usuario", value: `\`${usuario}\``, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "VexoneMc Network • Sistema de Tienda" });

      return await interaction.reply({ 
        content: `**rank:** ${rank}\n**usuario:** ${usuario}`,
        embeds: [embedCompra] 
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
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));
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
      let ticketCategory = guild.channels.cache.find(
        c => c.name.toLowerCase() === "tickets usuarios" && c.type === ChannelType.GuildCategory
      ) as CategoryChannel | undefined;

      if (!ticketCategory) {
        ticketCategory = await guild.channels.create({ name: "Tickets Usuarios", type: ChannelType.GuildCategory });
      }

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        topic: `owner:${interaction.user.id}|claimed:false`, 
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket de ${catType.toUpperCase()}`)
        .setColor(0xF1C40F)
        .setDescription(`Ticket abierto por <@${interaction.user.id}>`)
        .addFields({ name: "Estado del Staff", value: "🟡 No reclamado", inline: false })
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

      const btnClaim = new ButtonBuilder()
        .setCustomId("claim_ticket_btn")
        .setLabel("Reclamar Ticket")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🙋‍♂️");

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btnClaim, btnCerrar);

      const staffRole = guild.roles.cache.find(r => r.name === "Staff-Team");
      const staffMention = staffRole ? `<@&${staffRole.id}>` : "@Staff-Team";

      await ticketChannel.send({
        content: `${staffMention} | <@${interaction.user.id}> ¡Ticket creado con éxito! Un miembro del staff te atenderá pronto.`,
        embeds: [embed],
        components: [row],
      });

      return await interaction.editReply({ content: `✅ ¡Ticket creado correctamente en <#${ticketChannel.id}>!` });
    } catch (error) {
      console.error(error);
      return await interaction.editReply({ content: "❌ Ocurrió un error al crear el canal." });
    }
  }

  if (interaction.isButton()) {
    const channel = interaction.channel as TextChannel;
    if (!channel || !isTicketChannel(channel)) return;

    if (interaction.customId === "close_ticket_btn") {
      let ownerId = "";
      if (channel.topic && channel.topic.includes("owner:")) {
        const match = channel.topic.match(/owner:(\d+)/);
        if (match) ownerId = match[1];
      }
      await interaction.reply({ content: "⏳ Generando transcript y cerrando ticket..." });
      await closeTicket(channel, interaction.user.tag, ownerId);
    }

    if (interaction.customId === "claim_ticket_btn") {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        const staffRole = interaction.guild?.roles.cache.find(r => r.name === "Staff-Team");
        const hasRole = staffRole && (interaction.member?.roles as any)?.cache?.has(staffRole.id);
        if (!hasRole) {
          return await interaction.reply({ content: "❌ Solo lo puede usar el Staff.", ephemeral: true });
        }
      }

      if (channel.topic && channel.topic.includes("claimed:true")) {
        return await interaction.reply({ content: "⚠️ Este ticket ya ha sido reclamado.", ephemeral: true });
      }

      if (channel.topic) {
        const newTopic = channel.topic.replace("claimed:false", "claimed:true");
        await channel.setTopic(newTopic).catch(() => {});
      }

      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessage = messages.find(m => m.author.id === client.user?.id && m.embeds.length > 0 && m.components.length > 0);

      if (botMessage) {
        const oldEmbed = botMessage.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed);

        const fields = newEmbed.data.fields || [];
        const stateFieldIndex = fields.findIndex(f => f.name === "Estado del Staff");
        
        const staffInfoVal = `🟢 Reclamado por <@${interaction.user.id}> (${interaction.user.tag})`;

        if (stateFieldIndex !== -1) {
          fields[stateFieldIndex].value = staffInfoVal;
        } else {
          fields.push({ name: "Estado del Staff", value: staffInfoVal, inline: false });
        }

        newEmbed.setFields(fields);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("claim_ticket_btn")
            .setLabel(`Reclamado por ${interaction.user.username}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
            .setEmoji("✅"),
          new ButtonBuilder()
            .setCustomId("close_ticket_btn")
            .setLabel("Cerrar Ticket")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🔒")
        );

        await botMessage.edit({ embeds: [newEmbed], components: [row] }).catch(() => {});
      }
      return await interaction.reply({ content: `✅ Has reclamado este ticket exitosamente. **Staff a cargo:** <@${interaction.user.id}>`, ephemeral: true });
    }
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("DISCORD_TOKEN no está configurado.");
}

client.login(token);

const app = express();

app.get("/", (req, res) => {
  res.send("¡El bot está activo!");
});

app.listen(3000, () => {
  console.log("Servidor web listo en el puerto 3000");
});
