require("dotenv").config();

const {
Client,
GatewayIntentBits,
Partials,
PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

// 🔥 Error logging (VERY IMPORTANT)
process.on("unhandledRejection", (err) => {
console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
console.error("UNCAUGHT EXCEPTION:", err);
});

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.DirectMessages,
GatewayIntentBits.MessageContent
],
partials: [Partials.Channel]
});

const activeTickets = new Map(); // userId -> channelId

client.once("ready", () => {
console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
try {
if (message.author.bot) return;

```
// =========================
// 📩 DM → CREATE / SEND TICKET
// =========================
if (!message.guild) {
  const guild = await client.guilds.fetch(config.guildId);
  const category = guild.channels.cache.get(config.categoryId);

  if (!category) {
    console.error("❌ Category not found");
    return;
  }

  // If ticket already exists
  if (activeTickets.has(message.author.id)) {
    const channelId = activeTickets.get(message.author.id);
    const channel = guild.channels.cache.get(channelId);

    if (channel) {
      channel.send(`📩 **${message.author.tag}:** ${message.content}`);
      return;
    }
  }

  // Create new ticket channel
  const channel = await guild.channels.create({
    name: `ticket-${message.author.username}`,
    type: 0,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: config.modRoleId,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });

  activeTickets.set(message.author.id, channel.id);

  await channel.send(message.author.tag + ": " + message.content);
  await channel.send(`**Message:** ${message.content}`);

  await message.reply("✅ Your message has been sent to support!");

  return;
}

// =========================
// 💬 STAFF → USER DM
// =========================
if (message.channel.parentId === config.categoryId) {
  const entry = [...activeTickets.entries()].find(
    ([_, chId]) => chId === message.channel.id
  );

  if (!entry) return;

  const userId = entry[0];
  const user = await client.users.fetch(userId);

  if (!user) return;

  // Close ticket
  if (message.content === "!close") {
    await message.channel.send("🔒 Ticket closed.");
    activeTickets.delete(userId);

    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 3000);

    return;
  }

  await user.send(`💬 **Staff:** ${message.content}`);
}
```

} catch (err) {
console.error("❌ ERROR:", err);
}
});

client.login(process.env.TOKEN);
