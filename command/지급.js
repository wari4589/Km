const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const csv = require('fast-csv');
const fs = require('fs');

async function readDataFromCSV(filePath) {
    const readStream = fs.createReadStream(filePath);
    const data = [];

    return new Promise((resolve, reject) => {
        csv.parseStream(readStream, { headers: true })
            .on('data', row => data.push(row))
            .on('end', () => resolve(data))
            .on('error', reject);
    });
}

async function writeDataToCSV(filePath, data) {
    const writeStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
        csv.writeToStream(writeStream, data, { headers: true })
            .on('finish', resolve)
            .on('error', reject);
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("지급")
        .setDescription("유저에게 마일리지를 지급해요!")
        .addStringOption(option => option.setName('대상').setDescription('마일리지를 지급할 유저 이름을 입력해 주세요!').setRequired(true))
        .addNumberOption(option => option.setName('마일리지').setDescription('지급할 마일리지를 적어주세요!').setRequired(true))
        .addNumberOption(option => option.setName('비행').setDescription('지급할 비행을 적어주세요!').setRequired(true)),
    /**
     * @param {import("discord.js").CommandInteraction} interaction
     * @param {import("discord.js").Client} client
     */
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });

        const username = interaction.options.getString('대상');
        const mileageToAdd = interaction.options.getNumber('마일리지');
        const flyAdd = interaction.options.getNumber('비행');

        if (!interaction.member.roles.cache.has(require('../config.json').role)) return await interaction.editReply({ content: "명령어를 사용할 권한이 없습니다" })

        if(mileageToAdd < 0 || isNaN(mileageToAdd)) {
            return await interaction.editReply({ content : "지급할 마일리지는 정수로 적어주세요!" })
        }

        if(flyAdd < 0 || isNaN(flyAdd)) {
            return await interaction.editReply({ content : "지급할 비행은 정수로 적어주세요!" })
        }


        const data = await readDataFromCSV('database.csv');
        const userRecord = data.find(item => item.user === username);

        if (userRecord) {
            userRecord.mileage = Number(userRecord.mileage || 0) + mileageToAdd;
            userRecord.fly = Number(userRecord.fly || 0) + flyAdd;
            
            await writeDataToCSV('database.csv', data);

            const embed = new EmbedBuilder()
                .setTitle("마일리지 지급 완료!")
                .addFields(
                    { name: '이름', value: username, inline: true },
                    { name: '마일리지', value: `${userRecord.mileage.toLocaleString()} (+${mileageToAdd.toLocaleString()})`, inline: true },
                    { name: '총 비행 횟수', value: `${userRecord.fly.toLocaleString()} (+${flyAdd.toLocaleString()})`, inline: true }
                )
                .setColor("Green")
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return await client.channels.cache.get(require('../config.json').log).send({ content: `${interaction.user.username}님이 ${username} 에게 마일리지 ${mileageToAdd.toLocaleString()}, 비행 ${flyAdd.toLocaleString()}을 지급했습니다` });
        } else {
            await interaction.editReply({ content: "등록되어 있지 않은 고유 유저 이름입니다." });
        }
    },
};


