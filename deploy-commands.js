// deploy-commands.js
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Juega Piedra, Papel o Tijera contra el bot o contra otro usuario")
    .addStringOption(option =>
      option
        .setName("modo")
        .setDescription("Elige el modo de juego")
        .setRequired(true)
        .addChoices(
          { name: "Contra el bot", value: "bot" },
          { name: "Contra un usuario", value: "usuario" }
        )
    )
    .addUserOption(option =>
      option
        .setName("oponente")
        .setDescription("El usuario al que quieres retar (solo si eliges 'usuario')")
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔁 Registrando comando /rps globalmente...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Comando /rps registrado globalmente con éxito");
  } catch (error) {
    console.error("❌ Error al registrar el comando:", error);
  }
})();
