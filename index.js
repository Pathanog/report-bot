const express = require("express");
const app = express();

app.get("/", (req, res) => {
res.send("Bot is running");
});

app.listen(3000, () => {
console.log("Web server running");
});

require("dotenv").config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require("discord.js");
const config = require("./config.json");

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
console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
if (message.author.bot) return;

// 📩 DM MESSAGE → CREATE / SEND TO TICKET
if (!message.guild) {
const guild = await client.guilds.fetch(config.guildId);
const category = guild.channels.cache.get(config.categoryId);

```
if (!category) return;

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

channel.send(`📩 New ticket from <@${message.author.id}>`);
channel.send(`**Message:** ${message.content}`);

message.reply("✅ Your message has been sent to support!");

return;
```

}

// 💬 STAFF REPLY → SEND TO USER DM
if (message.channel.parentId === config.categoryId) {
const userId = [...activeTickets.entries()]
.find(([_, chId]) => chId === message.channel.id)?.[0];

```
if (!userId) return;

const user = await client.users.fetch(userId);
if (!user) return;

if (message.content === "!close") {
  await message.channel.send("🔒 Ticket closed.");
  activeTickets.delete(userId);
  setTimeout(() => message.channel.delete(), 3000);
  return;
}

user.send(`💬 **Staff:** ${message.content}`);
```

}
});

client.login(process.env.TOKEN);
