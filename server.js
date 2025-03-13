const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const RIOT_CDN = "https://ddragon.leagueoflegends.com/cdn/15.4.1";
const RIOT_API_URL = `${RIOT_CDN}/data/en_US`;

// Function to filter currently available items in Summoner’s Rift
async function fetchValidItems() {
    try {
        const itemData = await axios.get(`${RIOT_API_URL}/item.json`);
        const items = itemData.data.data;

        let validItems = [];

        for (let itemId in items) {
            let item = items[itemId];

            // Ensure item is purchasable, in-store, and not an event/ARAM-only item
            if (
                item.gold.purchasable === true && 
                (!item.inStore || item.inStore === true) && 
                (!item.maps || item.maps["11"] === true) // 11 = Summoner’s Rift
            ) {
                validItems.push({
                    id: itemId,
                    name: item.name,
                    image: `${RIOT_CDN}/img/item/${itemId}.png`,
                    description: item.description.replace(/<[^>]*>/g, ''), // Remove HTML tags
                });
            }
        }

        return validItems;
    } catch (error) {
        console.error("Error fetching valid items:", error.message);
        return [];
    }
}

// Default Route for Health Check
app.get("/", (req, res) => {
    res.send("League of Legends Random Build API is running! Use /random-build to get a build.");
});

// Function to Fetch and Generate a Random Build
async function getRandomBuild(req, res) {
    try {
        const championData = await axios.get(`${RIOT_API_URL}/champion.json`);
        const runeData = await axios.get(`${RIOT_API_URL}/runesReforged.json`);
        const summonerSpellsData = await axios.get(`${RIOT_API_URL}/summoner.json`);

        const champions = Object.keys(championData.data.data);
        const summonerSpells = Object.keys(summonerSpellsData.data.data);
        const runes = runeData.data;

        let validItems = await fetchValidItems(); // Fetch only valid items
        if (validItems.length === 0) {
            return res.status(500).json({ error: "No valid items found. Try again later." });
        }

        // Randomly select a champion
        let randomChampion = champions[Math.floor(Math.random() * champions.length)];

        // Select 6 unique random items
        let randomItems = [];
        while (randomItems.length < 6) {
            let randomItem = validItems[Math.floor(Math.random() * validItems.length)];
            if (!randomItems.some(i => i.id === randomItem.id)) {
                randomItems.push(randomItem);
            }
        }

        // Select a random rune page
        let randomPrimaryPath = runes[Math.floor(Math.random() * runes.length)];
        let randomKeystone = randomPrimaryPath.slots[0].runes[Math.floor(Math.random() * randomPrimaryPath.slots[0].runes.length)];

        // Select 2 random summoner spells
        let randomSummonerSpells = [
            summonerSpells[Math.floor(Math.random() * summonerSpells.length)],
            summonerSpells[Math.floor(Math.random() * summonerSpells.length)]
        ];

        return res.json({
            champion: { 
                name: randomChampion, 
                image: `${RIOT_CDN}/img/champion/${randomChampion}.png` 
            },
            items: randomItems,
            runes: {
                primary: randomPrimaryPath.name,
                primaryImage: `${RIOT_CDN}/img/${randomPrimaryPath.icon}`,
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
        return res.status(500).json({ error: "Failed to fetch build. Please try again." });
    }
}

// API Endpoint for Random Build
app.get("/random-build", getRandomBuild);

// Start Server
const PORT = process.env.PORT || 500;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
