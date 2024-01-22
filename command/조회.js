const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const csv = require('fast-csv');
const fs = require('fs');

async function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const data = [];
        const readStream = fs.createReadStream(filePath);

        csv.parseStream(readStream, { headers: true })
            .on('data', row => { data.push(row); })
            .on('end', () => { resolve(data); })
            .on('error', error => { reject(error); });
    });
}

function getUserID(name)
{
    fetch(`https://www.roblox.com/users/profile?username=${name}`)
        .then(r => {
            if (!r.ok) { throw "Invalid response"; }
            return r.url.match(/\d+/)[0];
        })
        .then(id => {
            console.log(id);
        })
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("조회")
        .setDescription("유저 마일리지를 조회해요!")
        .addStringOption(option => option.setName('대상').setDescription('조회할 유저 이름을 입력해 주세요!').setRequired(true)),
    /**
     * @param {import("discord.js").CommandInteraction} interaction
     * @param {import("discord.js").Client} client
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getString('대상');

        try {
            const data = await readCSV('database.csv');

            const filteredData = data.filter(item => item.user === targetUser);

            if (filteredData[0]?.user) {
                getUser(filteredData[0]?.user)

                const embed = new EmbedBuilder()
                    .setTitle('조회결과')
                    .addFields(
                        { name: '이름', value: targetUser, inline: true },
                        { name: '마일리지', value: ((filteredData[0]?.mileage) || 0).toLocaleString(), inline: true },
                        { name: '총 비행 횟수', value:  ((filteredData[0]?.fly) || 0).toLocaleString(), inline: true }
                    )
                    .setColor("Green")
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            } else {
                return await interaction.editReply({ content: "등록되어 있지 않은 고유 유저 이름입니다." });
            }
        } catch (error) {
            console.error(error);
            return await interaction.editReply({ content: "데이터를 읽는 도중 오류가 발생했습니다." });
        }
    },
};

