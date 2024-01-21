const { Client, Events, IntentsBitField, Partials, Collection , Routes } = require('discord.js');
const { token , guildID } = require('./config.json');
const { REST } = require('@discordjs/rest');
const csv = require('fast-csv');
const fs = require("node:fs")

const client = new Client({
    intents: [Object.values(IntentsBitField.Flags).reduce((acc, p) => acc | p, 0)],
    partials: [Object.values(Partials).reduce((acc, p) => acc | p, 0)],
})
module.exports = client

client.slashCommands = new Collection();

if(!fs.existsSync('database.csv')) {
    const writeStream = fs.createWriteStream('database.csv');
    csv.writeToStream(writeStream, [], { headers: true })
}


let total = 0;
client.commands = []
const commandsFiles = fs.readdirSync('./command').filter((file) => file.endsWith(".js"));
for (const file of commandsFiles) {
    const command = require(`./command/${file}`);
    client.commands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command)
    total = Number(total) + 1
}

console.info(`A total of ${Number(total)} SlashCommand have been loaded`)

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.once(Events.ClientReady, async () => {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildID),
			{ body: client.commands },
        );
        const gulid = await client.guilds.fetch(guildID);
        console.info(`Command transmission is complete. | put server : ${gulid.name}`)
    } catch (error) {
        return console.error(`A problem occurred while refreshing the application | \x1b[31m${error}\x1b[37m`);
    }

    return console.info(`successfully ${client.user.username} bot login success`)
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isCommand()) {
        if (!interaction.client.slashCommands.has(interaction.commandName)) return;
        const command = interaction.client.slashCommands.get(interaction.commandName);
        try {
            await command.execute(interaction, interaction.client)
        } catch (error) {
            return console.log(error)
        }
    } else {
        return
    }
});

client.login(token);