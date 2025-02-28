const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const RIOT_CDN = "https://ddragon.leagueoflegends.com/cdn/14.5.1";
const RIOT_API_URL = `${RIOT_CDN}/data/en_US`;

// Set timeout to 60 seconds (default is 15s on Render)
app.use((req, res, next) => {
    req.setTimeout(60000, () => {
        console.log("Request timed out.");
        res.status(408).json({ error: "Request Timeout. Please try again." });
    });
    next();
});

async function getRandomBuild(req, res) {
    try {
        const championData = await axios.get(`${RIOT_API_URL}/champion.json`);
        const itemData = await axios.get(`${RIOT_API_URL}/item.json`);
        const runeData = await axios.get(`${RIOT_API_URL}/runesReforged.json`);
        const summonerSpellsData = await axios.get(`${RIOT_API_URL}/summoner.json`);

        const champions = Object.keys(championData.data.data);
        const items = Object.keys(itemData.data.data);
        const summonerSpells = Object.keys(summonerSpellsData.data.data);
        const runes = runeData.data;

        let { champion, items: lockedItems } = req.query;
        lockedItems = lockedItems ? lockedItems.split(",") : [];
        lockedItems = lockedItems.filter(item => items.includes(item));

        const randomChampion = champion && champions.includes(champion) ? champion : champions[Math.floor(Math.random() * champions.length)];
        const randomItems = [...lockedItems, ...items.filter(i => !lockedItems.includes(i)).sort(() => 0.5 - Math.random()).slice(0, 6 - lockedItems.length)];
        const randomRunes = runes[Math.floor(Math.random() * runes.length)];
        const randomKeystone = randomRunes.slots[0].runes[Math.floor(Math.random() * randomRunes.slots[0].runes.length)];
        const randomSummonerSpells = [
            summonerSpells[Math.floor(Math.random() * summonerSpells.length)],
            summonerSpells[Math.floor(Math.random() * summonerSpells.length)]
        ];

        return res.json({
            champion: { name: randomChampion, image: `${RIOT_CDN}/img/champion/${randomChampion}.png` },
            items: randomItems.map(item => ({
                name: itemData.data.data[item].name,
                image: `${RIOT_CDN}/img/item/${item}.png`,
                description: itemData.data.data[item].description.replace(/<[^>]*>/g, '') // Remove HTML tags
            })),
            runes: {
                primary: randomRunes.name,
                primaryImage: `${RIOT_CDN}/img/${randomRunes.icon}`,
                keystone: randomKeystone.name,
                keystoneImage: `${RIOT_CDN}/img/${randomKeystone.icon}`
            },
            summonerSpells: randomSummonerSpells.map(spell => ({
                name: spell,
                image: `${RIOT_CDN}/img/spell/${spell}.png`
            }))
        });

    } catch (error) {
        console.error("API Error:", error.response?.data || error.message);

        if (error.response && error.response.status === 429) {
            return res.status(429).json({ error: "Riot API Rate Limit Exceeded. Please try again later." });
        }

        return res.status(500).json({ error: "Failed to fetch build. Please try again." });
    }
}

// API Endpoint
app.get("/random-build", getRandomBuild);

// Ensure the correct port is used on Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
