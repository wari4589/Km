const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const csv = require('fast-csv');
const fs = require('fs');

const allCharactersRegex = /^[a-zA-Z가-힣0-9_]+$/ 


async function checkAndEditReply(interaction, content) {
    if (!allCharactersRegex.test(content)) {
        await interaction.editReply({ content: "고유 이름엔 숫자, 영어, 한글 만 들어갈 수 있습니다." });
        return false;
    }
    return true;
}

async function writeToCSV(file, data) {
    const writeStream = fs.createWriteStream(file);
    return new Promise((resolve) => {
        csv.writeToStream(writeStream, data, { headers: true })
            .on('end', () => resolve());
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("등록")
        .setDescription("유저 마일리지를 등록해요!")
        .addStringOption(option => option.setName('대상').setDescription('등록 유저 이름을 입력해 주세요!').setRequired(true)),
    /**
     * @param {import("discord.js").CommandInteraction} interaction
     * @param {import("discord.js").Client} client
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const userName = interaction.options.getString('대상');

        if (!interaction.member.roles.cache.has(require('../config.json').role)) return await interaction.editReply({ content: "명령어를 사용할 권한이 없습니다" })

        if (!(await checkAndEditReply(interaction, userName))) {
            return;
        }

        const readStream = fs.createReadStream('database.csv');
        const data = [];

        csv.parseStream(readStream, { headers: true })
            .on('data', row => data.push(row))
            .on('end', async () => {
                const isAlreadyRegistered = data.some(item => item.user === userName);

                if (isAlreadyRegistered) {
                    return await interaction.editReply({ content: "이미 등록되어 있는 고유 이름입니다." });
                }

                const existingData = await new Promise(resolve => {
                    const existingData = [];
                    const readStream = fs.createReadStream('database.csv');
                    csv.parseStream(readStream, { headers: true })
                        .on('data', row => existingData.push(row))
                        .on('end', () => resolve(existingData));
                });

                const updatedData = [...existingData, { user: userName, mileage: 0, fly: 0 }];


                writeToCSV('database.csv', updatedData);

                const embed = new EmbedBuilder()
                    .setTitle('고유 유저가 등록되었습니다!')
                    .addFields(
                        { name: '이름', value: userName, inline: true },
                        { name: '마일리지', value: '0', inline: true },
                        { name: '총 비행 횟수', value: "0", inline: true }
                    )
                    .setColor("Green")
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return await interaction.client.channels.cache.get(require('../config.json').log).send({ content: `${interaction.user.username}님이 ${userName}을 등록했습니다.` });
            });
    },
};