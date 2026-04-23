require("dotenv").config();

const {
Client,
GatewayIntentBits,
Partials,
PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

// Error handling
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.DirectMessages,
GatewayIntentBits.MessageContent
],
partials: [Partials.Channel]
});

const activeTickets = new Map();

client.once("ready", function () {
console.log("Bot is online!");
});

client.on("messageCreate", async function (message) {
try {
if (message.author.bot) return;

```
// =========================
// DM → CREATE / SEND TICKET
// =========================
if (!message.guild) {
  const guild = await client.guilds.fetch(config.guildId);
  const category = guild.channels.cache.get(config.categoryId);

  if (!category) {
    console.log("Category not found");
    return;
  }

  // If ticket exists
  if (activeTickets.has(message.author.id)) {
    const channelId = activeTickets.get(message.author.id);
    const channel = guild.channels.cache.get(channelId);

    if (channel) {
      channel.send(message.author.tag + ": " + message.content);
      return;
    }
  }

  // Create ticket channel
  const channel = await guild.channels.create({
    name: "ticket-" + message.author.username,
    type: 0,
    parent: config.categoryId,
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

  await channel.send("New ticket from <@" + message.author.id + ">");
  await channel.send("Message: " + message.content);

  await message.reply("Your message has been sent to support!");

  return;
}

// =========================
// STAFF → USER DM
// =========================
if (message.channel.parentId === config.categoryId) {
  let userId = null;

  for (const entry of activeTickets.entries()) {
    if (entry[1] === message.channel.id) {
      userId = entry[0];
    }
  }

  if (!userId) return;

  const user = await client.users.fetch(userId);
  if (!user) return;

  if (message.content === "!close") {
    await message.channel.send("Ticket closed.");
    activeTickets.delete(userId);

    setTimeout(function () {
      message.channel.delete().catch(function () {});
    }, 3000);

    return;
  }

  await user.send("Staff: " + message.content);
}
```

} catch (err) {
console.error("ERROR:", err);
}
});

client.login(process.env.TOKEN);
