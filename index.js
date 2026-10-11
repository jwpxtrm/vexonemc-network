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
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} from "discord.js";
import express from "express";

process.on("unhandledRejection", (error) => {
  console.error("Error no manejado:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Excepcion no capturada:", error);
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
  console.log("Bot conectado como " + client.user?.tag);
  for (const guild of client.guilds.cache.values()) {
    try {
      const firstInvites = await guild.invites.fetch();
      const guildInvites = new Map();
      firstInvites.forEach(invite => guildInvites.set(invite.code, invite.uses || 0));
      invitesCache.set(guild.id, guildInvites);
    } catch (error) {
      console.error("Error cargando invites:", error);
    }
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild;
    const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
    if (welcomeChannel) {
      await welcomeChannel.send("¡Bienvenid@ " + member.toString() + " a VexoneMc Network!");
    }
  } catch (error) {
    console.error("Error en guildMemberAdd:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "ip") {
      await interaction.reply({ 
        content: "IP Java: VexoneMC.aternos.me \nIP Bedrock: VexoneMC.aternos.me : 25704", 
        ephemeral: true 
      });
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Falta el token de Discord en las variables.");
}

client.login(token);

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("¡El bot está activo!");
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log("Servidor web listo en puerto " + PORT);
});
