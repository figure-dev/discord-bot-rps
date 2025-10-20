// index.js
import express from "express";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ComponentType,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// --- Servidor Express para mantener el bot activo ---
const app = express();
app.get("/", (req, res) => res.send("✅ El bot está activo y funcionando correctamente."));
app.listen(3000, () => console.log("🌐 Servidor web encendido en el puerto 3000."));

// --- Inicializar el cliente de Discord ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "rps") return;

  const modo = interaction.options.getString("modo");
  const jugador1 = interaction.user;
  const jugador2 = interaction.options.getUser("oponente");

  // --- MODO CONTRA EL BOT ---
  if (modo === "bot") {
    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("piedra").setLabel("🗿 Piedra").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("papel").setLabel("📄 Papel").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("tijera").setLabel("✂️ Tijera").setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({
      content: `🎮 **${jugador1.username}**, elige tu jugada contra mí, parguelon`,
      components: [botones],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== jugador1.id) {
        return btnInteraction.reply({ content: "❌ No estás jugando.", ephemeral: true });
      }

      await btnInteraction.deferUpdate();

      const eleccionUsuario = btnInteraction.customId;
      const opciones = ["piedra", "papel", "tijera"];
      const eleccionBot = opciones[Math.floor(Math.random() * opciones.length)];
      const resultado = determinarGanador(jugador1, client.user, eleccionUsuario, eleccionBot);

      collector.stop();
      await interaction.editReply({
        content: `🗿📄✂️ **Resultados:**\n\n**${jugador1.username}** eligió **${eleccionUsuario}**.\n**${client.user.username}** eligió **${eleccionBot}**.\n\n${resultado}`,
        components: [],
      });
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "messageDelete" && reason !== "limit") {
        await interaction.editReply({ content: "⏰ Se acabó el tiempo.", components: [] });
      }
    });
    return;
  }

  // --- MODO CONTRA OTRO USUARIO ---
  if (!jugador2) {
    return interaction.reply("⚠️ Debes mencionar un oponente si eliges jugar contra un usuario.");
  }
  if (jugador2.bot) return interaction.reply("🚫 No puedes retar a un bot.");
  if (jugador1.id === jugador2.id) return interaction.reply("❌ No puedes jugar contra ti mismo.");

  const botones = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("piedra").setLabel("🗿 Piedra").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("papel").setLabel("📄 Papel").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("tijera").setLabel("✂️ Tijera").setStyle(ButtonStyle.Danger)
  );

  const msg = await interaction.reply({
    content: `🎮 **${jugador1.username}** ha retado a **${jugador2.username}** a Piedra, Papel o Tijera!\n\n Elijan la jugada rapidito a poder ser.`,
    components: [botones],
    fetchReply: true,
  });

  const elecciones = new Map();

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
  });

  collector.on("collect", async (btnInteraction) => {
    const jugador = btnInteraction.user;

    if (![jugador1.id, jugador2.id].includes(jugador.id)) {
      return btnInteraction.reply({ content: "❌ No participas en esta partida, tontito.", ephemeral: true });
    }

    if (elecciones.has(jugador.id)) {
      return btnInteraction.reply({ content: "⚠️ Ya elegiste.", ephemeral: true });
    }

    await btnInteraction.deferUpdate();
    elecciones.set(jugador.id, btnInteraction.customId);

    await btnInteraction.followUp({
      content: `✅ Has elegido **${btnInteraction.customId}**.`,
      ephemeral: true,
    });

    if (elecciones.size === 2) collector.stop("completado");
  });

  collector.on("end", async (_, reason) => {
    if (reason !== "completado") {
      return interaction.editReply({ content: "⏰ El tiempo se acabó.", components: [] });
    }

    const eleccion1 = elecciones.get(jugador1.id);
    const eleccion2 = elecciones.get(jugador2.id);
    const resultado = determinarGanador(jugador1, jugador2, eleccion1, eleccion2);

    await interaction.editReply({
      content: `🗿📄✂️ **Resultados:**\n\n**${jugador1.username}** eligió **${eleccion1}**.\n**${jugador2.username}** eligió **${eleccion2}**.\n\n${resultado}`,
      components: [],
    });
  });
});

// --- Función para decidir ganador ---
function determinarGanador(j1, j2, e1, e2) {
  if (e1 === e2) return "😐 ¡Empate! A ver si espabilais";
  const gana = { piedra: "tijera", tijera: "papel", papel: "piedra" };
  return gana[e1] === e2
    ? `🎉 **${j1.username} gana! oleole 🏆** ${j2.username} espabila que te come la vida`
    : `🎉 **${j2.username} gana! oleole 🏆** ${j1.username} espabila que te come la vida`;
}

client.login(process.env.DISCORD_TOKEN);
