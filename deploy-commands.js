import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
  // Piedra, papel o tijera
  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Juega piedra, papel o tijera")
    .addStringOption((opt) =>
      opt
        .setName("modo")
        .setDescription("Elige modo: bot o jugador")
        .setRequired(true)
        .addChoices(
          { name: "bot", value: "bot" },
          { name: "jugador", value: "jugador" }
        )
    )
    .addUserOption((opt) =>
      opt.setName("oponente").setDescription("Tu oponente (solo si eliges jugador)")
    ),

  // Tirar dados
  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Tira un dado")
    .addIntegerOption((opt) =>
      opt.setName("lados").setDescription("Número de caras del dado")
    ),

  // Encuesta
  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Crea una encuesta rápida 👍👎")
    .addStringOption((opt) =>
      opt.setName("pregunta").setDescription("La pregunta de la encuesta").setRequired(true)
    ),

  // Emoji Quiz
  new SlashCommandBuilder()
    .setName("emojiquiz")
    .setDescription("Adivina la palabra a partir de emojis"),

  // Música
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce música desde YouTube")
    .addStringOption((opt) =>
      opt.setName("cancion").setDescription("Nombre o enlace de YouTube").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Salta la canción actual"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Detiene la música y desconecta al bot"),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados correctamente.");
  } catch (error) {
    console.error(error);
  }
})();
