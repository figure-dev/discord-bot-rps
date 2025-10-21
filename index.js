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
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import playdl from "play-dl";

dotenv.config();

// --- Servidor Express para mantener el bot activo ---
const app = express();
app.get("/", (req, res) => res.send("✅ Bot activo y funcionando correctamente"));
app.listen(3000, () => console.log("🌐 Servidor web encendido en el puerto 3000"));

// --- Inicializar cliente Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// --- Variables para música ---
const queue = new Map(); // guildId => { songs: [], player, connection }

// --- Evento ready ---
client.once(Events.ClientReady, () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
});

// --- Interacciones ---
client.on(Events.InteractionCreate, async (interaction) => {
  // --- 🎮 PIEDRA PAPEL TIJERA (tu código original, sin tocar) ---
  if (!interaction.isChatInputCommand() || interaction.commandName !== "rps") return;

  const modo = interaction.options.getString("modo");
  const jugador1 = interaction.user;
  const jugador2 = interaction.options.getUser("oponente");

  // --- modo contra el bot ---
  if (modo === "bot") {
    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("piedra")
        .setLabel("🗿 Piedra")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("papel")
        .setLabel("📄 Papel")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("tijera")
        .setLabel("✂️ Tijera")
        .setStyle(ButtonStyle.Danger)
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
        return btnInteraction.reply({
          content: "❌ No estás jugando",
          ephemeral: true,
        });
      }

      await btnInteraction.deferUpdate();

      const eleccionUsuario = btnInteraction.customId;
      const opciones = ["piedra", "papel", "tijera"];
      const eleccionBot = opciones[Math.floor(Math.random() * opciones.length)];
      const resultado = determinarGanador(
        jugador1,
        client.user,
        eleccionUsuario,
        eleccionBot
      );

      collector.stop();
      await interaction.editReply({
        content: `🗿📄✂️ **Resultados:**\n\n**${jugador1.username}** eligió **${eleccionUsuario}**.\n**${client.user.username}** eligió **${eleccionBot}**.\n\n${resultado}`,
        components: [],
      });
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "messageDelete" && reason !== "limit") {
        await interaction.editReply({
          content: "⏰ Se acabó el tiempo",
          components: [],
        });
      }
    });
    return;
  }

  // --- modo contra otro usuario ---
  if (!jugador2) {
    return interaction.reply(
      "⚠️ Debes mencionar un oponente si eliges jugar contra un usuario"
    );
  }
  if (jugador2.bot) return interaction.reply("❌ No puedes retar a un bot");
  if (jugador1.id === jugador2.id)
    return interaction.reply("❌ No puedes jugar contra ti mismo");

  const botones = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("piedra")
      .setLabel("🗿 Piedra")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("papel")
      .setLabel("📄 Papel")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("tijera")
      .setLabel("✂️ Tijera")
      .setStyle(ButtonStyle.Danger)
  );

  const msg = await interaction.reply({
    content: `🎮 **${jugador1.username}** ha retado a **${jugador2.username}** a Piedra, Papel o Tijera!\n\n Elijan la jugada rapidito a poder ser`,
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
      return btnInteraction.reply({
        content: "❌ No participas en esta partida, tontito",
        ephemeral: true,
      });
    }

    if (elecciones.has(jugador.id)) {
      return btnInteraction.reply({
        content: "⚠️ Ya elegiste",
        ephemeral: true,
      });
    }

    await btnInteraction.deferUpdate();
    elecciones.set(jugador.id, btnInteraction.customId);

    await btnInteraction.followUp({
      content: `✅ Has elegido **${btnInteraction.customId}**`,
      ephemeral: true,
    });

    if (elecciones.size === 2) collector.stop("completado");
  });

  collector.on("end", async (_, reason) => {
    if (reason !== "completado") {
      return interaction.editReply({
        content: "⏰ El tiempo se acabó",
        components: [],
      });
    }

    const eleccion1 = elecciones.get(jugador1.id);
    const eleccion2 = elecciones.get(jugador2.id);
    const resultado = determinarGanador(
      jugador1,
      jugador2,
      eleccion1,
      eleccion2
    );

    await interaction.editReply({
      content: `🗿📄✂️ **Resultados:**\n\n**${jugador1.username}** eligió **${eleccion1}**.\n**${jugador2.username}** eligió **${eleccion2}**.\n\n${resultado}`,
      components: [],
    });
  });
});

// --- 🎵 COMANDOS ADICIONALES ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  // DADOS
  if (interaction.commandName === "roll") {
    const sides = interaction.options.getInteger("lados") || 6;
    const resultado = Math.floor(Math.random() * sides) + 1;
    return interaction.reply(
      `🎲 Has tirado un dado de ${sides} caras y ha salido: **${resultado}**`
    );
  }

  // ENCUESTA
  if (interaction.commandName === "poll") {
    const pregunta = interaction.options.getString("pregunta");
    const msg = await interaction.reply({
      content: `📊 **Encuesta:** ${pregunta}`,
      fetchReply: true,
    });
    await msg.react("👍");
    await msg.react("👎");
    return;
  }

  // EMOJI QUIZ
  if (interaction.commandName === "emojiquiz") {
    const emojis = ["🐍🍎", "👑💤", "🧙‍♂️⚡"];
    const respuestas = ["python", "sleeping king", "harry potter"];
    const index = Math.floor(Math.random() * emojis.length);
    const msg = await interaction.reply({
      content: `❓ Adivina la palabra: ${emojis[index]}`,
      fetchReply: true,
    });

    const filter = (m) =>
      m.content.toLowerCase() === respuestas[index] && !m.author.bot;

    interaction.channel
      .awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] })
      .then((collected) =>
        interaction.followUp(
          `${collected.first().author} ¡acertó! 🎉 La respuesta era **${respuestas[index]}**`
        )
      )
      .catch(() =>
        interaction.followUp(
          `⏰ Se acabó el tiempo! La respuesta era: **${respuestas[index]}**`
        )
      );
    return;
  }

  // PLAY MUSIC
  if (interaction.commandName === "play") {
    const query = interaction.options.getString("cancion");
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel)
      return interaction.reply("🚫 Debes estar en un canal de voz");

    let serverQueue = queue.get(guildId);
    if (!serverQueue) {
      serverQueue = {
        songs: [],
        player: createAudioPlayer(),
        connection: null,
      };
      queue.set(guildId, serverQueue);
    }

    let info;
    if (playdl.yt_validate(query) === "video") {
      info = await playdl.video_info(query);
    } else {
      const results = await playdl.search(query, { limit: 1 });
      if (!results.length) return interaction.reply("❌ No encontré la canción");
      info = await playdl.video_info(results[0].url);
    }

    const song = {
      title: info.video_details.title,
      url: info.video_details.url,
    };
    serverQueue.songs.push(song);

    if (!serverQueue.connection) {
      serverQueue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      playSong(guildId);
    }

    return interaction.reply(`🎶 Añadida a la cola: **${song.title}**`);
  }

  // SKIP
  if (interaction.commandName === "skip") {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || !serverQueue.songs.length)
      return interaction.reply("🚫 No hay canciones en la cola");
    serverQueue.player.stop();
    return interaction.reply("⏭ Canción saltada");
  }

  // STOP
  if (interaction.commandName === "stop") {
    const serverQueue = queue.get(guildId);
    if (!serverQueue)
      return interaction.reply("🚫 No estoy reproduciendo nada");
    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queue.delete(guildId);
    return interaction.reply("⏹ Música detenida y desconectado");
  }
});

// --- Función para decidir el ganador ---
function determinarGanador(j1, j2, e1, e2) {
  if (e1 === e2) return "😐 ¡Empate! A ver si espabilamos";
  const gana = { piedra: "tijera", tijera: "papel", papel: "piedra" };
  return gana[e1] === e2
    ? `🎉 **${j1.username} gana! oleole 🏆** ${j2.username} espabila que te come la vida`
    : `🎉 **${j2.username} gana! oleole 🏆** ${j1.username} espabila que te come la vida`;
}

// --- Función para reproducir música ---
async function playSong(guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue.songs.length) {
    serverQueue.connection.destroy();
    queue.delete(guildId);
    return;
  }

  const song = serverQueue.songs[0];
  const stream = await playdl.stream(song.url);
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
  });

  serverQueue.player.play(resource);
  serverQueue.connection.subscribe(serverQueue.player);

  serverQueue.player.once(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    playSong(guildId);
  });
}

// --- Login ---
client.login(process.env.DISCORD_TOKEN);
