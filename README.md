# Let's Count
Best privacy-focused counting Discord bot.

## Installation
Github:
```
git clone https://github.com/cspi-git/Let-s-Count
```

NpmJS:
```
npm i dotenv discord.js@13.3.1 mongodb hash.js
```

## Setup
1. Make an environment file and add a variable called MONGODB_URL, there you must put your MongoDB url database.
2. In your MongoDB make a database called **core** and a collection called **letsCount.countings**.
3. Put your Discord bot token on the environment file **DISCORD_TOKEN** variable.

## Usage
```
node index.js
```

## Security
**Information stored in the database:**
- Server Name: [Not hashed] This isn't hashed because it's just use for leaderboard.
- Server ID: [Hashed using SHA512] This one is obvious, to get the server counting channel ID.
- Channel ID: [Hashed using SHA512] Channel Id where you can only count.
- Blocked Users: [Hashed using SHA512] Block users on the server so they can't count.
- Last User: [Hashed using SHA512] Avoid the same user from counting.
- Count: [Not hashed] How many count the server has.

## License
MIT © CSPI