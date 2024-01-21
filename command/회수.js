const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const csv = require('fast-csv');
const fs = require('fs');

async function readCSVData(filePath) {
    const data = [];
    return new Promise((resolve) => {
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(csv.parse({ headers: true }))
            .on('data', row => data.push(row))
            .on('end', () => resolve(data));
    });
}

async function writeCSVData(filePath, data) {
    return new Promise((resolve) => {
        const writeStream = fs.createWriteStream(filePath);
        csv.writeToStream(writeStream, data, { headers: true })
            .on('finish', resolve);
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("회수")
        .setDescription("유저에게 마일리지를 회수해요!")
        .addStringOption(option => option.setName('대상').setDescription('마일리지를 회수할 유저 이름을 입력해 주세요!').setRequired(true))
        .addNumberOption(option => option.setName('마일리지').setDescription('회수할 마일리지를 적어주세요!').setRequired(true))
        .addNumberOption(option => option.setName('비행').setDescription('지급할 비행을 적어주세요!').setRequired(true)),
    /**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {import("discord.js").Client} client
 */
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });

        const username = interaction.options.getString('대상');
        const mileageToDeduct = interaction.options.getNumber('마일리지');
        const flyAdd = interaction.options.getNumber('비행');

        if (!interaction.member.roles.cache.has(require('../config.json').role)) return await interaction.editReply({ content: "명령어를 사용할 권한이 없습니다" })

        if (mileageToDeduct < 0 || isNaN(mileageToDeduct)) {
            return await interaction.editReply({ content: "지급할 마일리지는 정수로 적어주세요!" })
        }

        if (flyAdd < 0 || isNaN(flyAdd)) {
            return await interaction.editReply({ content: "지급할 비행은 정수로 적어주세요!" })
        }

        const data = await readCSVData('database.csv');
        const userRecord = data.find(item => item.user === username);

        if (!userRecord) {
            return await interaction.editReply({ content: "등록되어 있지 않은 고유 유저 이름입니다." });
        }

        if (userRecord.mileage < mileageToDeduct) {
            return await interaction.editReply({ content: `유저에게 회수할 마일리지가 부족합니다. 유저의 마일리지는 ${userRecord.mileage || 0} 입니다.` });
        }

        if (userRecord.fly < flyAdd) {
            return await interaction.editReply({ content: `유저에게 회수할 비행이 부족합니다. 유저의 마일리지는 ${userRecord.fly || 0} 입니다.` });
        }

        userRecord.mileage -= mileageToDeduct;
        userRecord.fly -= flyAdd;

        await writeCSVData('database.csv', data);

        const embed = new EmbedBuilder()
            .setTitle("마일리지 회수 완료!")
            .addFields(
                { name: '이름', value: username, inline: true },
                { name: '마일리지', value: `${userRecord.mileage.toLocaleString()} (-${mileageToDeduct.toLocaleString()})`, inline: true },
                { name: '총 비행 횟수', value: `${userRecord.fly.toLocaleString()} (+${flyAdd.toLocaleString()})`, inline: true }
            )
            .setColor("Green")
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return await client.channels.cache.get(require('../config.json').log).send({ content: `${interaction.user.username}님이 ${username} 에게 마일리지 ${mileageToDeduct.toLocaleString()}, 비행 ${flyAdd.toLocaleString()}을 회수했습니다` });
    },
};

