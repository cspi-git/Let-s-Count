(async()=>{
    "use strict";

    require("dotenv").config()

    // Dependencies
    const { Client, Intents, MessageEmbed, Permissions } = require("discord.js")
    const { MongoClient } = require("mongodb")
    const hashJS = require("hash.js")
    
    // Variables
    const bCommands = require("./commands.json")
    const bot = new Client({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES ] })

    const client = new MongoClient(process.env.MONGODB_URL)
    const db = client.db("core")
    const countings = db.collection("letsCount.countings")

    // Functions
    const toSHA512 = (string)=>{return hashJS.sha512().update(string).digest("hex")}
    
    // Main
    console.log("Connecting to the database, please wait...")
    await client.connect()
    console.log("Successfully connected to the database.")

    bot.on("ready", ()=>{
        bot.guilds.cache.forEach((guild)=>{guild.commands.set([])})
        bot.guilds.cache.forEach((guild)=>{guild.commands.cache.forEach((command)=>{guild.commands.delete(command)})})
    
        const commands = bot.application?.commands
        for( const command of bCommands ) commands?.create(command)
    
        bot.user.setActivity("Best counting Discord bot.")
        console.log("Let's Count is running.")
    })

    bot.on("message", async(message)=>{
        if(!message.guild) return
        if(message.author.bot) return

        const serverID = toSHA512(message.guild.id)
        const exists = await countings.findOne({ serverID: serverID, channelID: toSHA512(message.channel.id) })

        if(exists && !isNaN(message.content) && message.content && !exists.blockedUsers.includes(toSHA512(message.author.id))){
            const number = +message.content

            if(number == exists.count+1 && exists.lastUser !== toSHA512(message.author.id)){
                await countings.updateOne({ serverID: serverID }, { $set: { count: exists.count+1, lastUser: toSHA512(message.author.id) } })
                message.react("✅")
            }else{
                await countings.updateOne({ serverID: serverID }, { $set: { count: 0, lastUser: null } })
                message.react("❌")
                message.channel.send(`<@${message.author.id}> WHY DID YOU RUIN IT AT **${exists.count}**! Now we are back to **0**.`)
            }
        }
    })
    
    bot.on("interactionCreate", async(interaction)=>{
        if(!interaction.isCommand()) return
    
        if(interaction.commandName === "help"){
            const embed = new MessageEmbed()
            .setTitle("Let's Count | Help")
            .setDescription(`**Setup:**
1. Create a channel where you would want to count.
2. Do \`/setchannel\` in that channel (You must have MANAGE CHANNELS permissions).
3. Start counting starting from **1**.

**Rules:**
1. One person can't count in a row.
2. Bot's won't work.
3. If you break the count, the count will be reset back to the beginning.`)
            .setColor("AQUA")
            .setFooter("Brought to you by CSPI.")

            await interaction.reply({ embeds: [embed], ephemeral: true })
        }else if(interaction.commandName === "status"){
            if(!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return await interaction.reply({ content: "No permission to update.", ephemeral: true })

            const serverID = toSHA512(interaction.guild.id)
            const exists = await countings.findOne({ serverID: serverID })

            if(exists){
                const embed = new MessageEmbed()
                .setTitle("Let's Count | Status")
                .addFields(
                    { name: "Server Name:", value: interaction.guild.name },
                    { name: "Place:", value: `${await countings.countDocuments({ serverID: serverID })}th` },
                    { name: "Counts:", value: exists.count.toString() }
                )
                .setColor("AQUA")
                .setFooter("Brought to you by CSPI.")
    
                await interaction.reply({ embeds: [embed], ephemeral: true })
            }else{
                await interaction.reply({ content: "Unable to find this server in the database.", ephemeral: true })
            }
        }else if(interaction.commandName === "leaderboard"){
            const top10 = await countings.find({ count: -1 }).limit(10).toArray()

            if(!top10.length) return await interaction.reply("There are no top 10 Discord servers with the highest count to display yet.")

            const data = []

            for( const t10D in top10 ){
                const d = top10[t10D]

                data.push(`${t10D+1}. **${s.name}** with ${d.count} counts.`)
            }

            const embed = new MessageEmbed()
            .setTitle("Let's Count | Leaderboard")
            .setDescription(data.join("\n"))
            .setColor("AQUA")
            .setFooter("Brought to you by CSPI.")

            await interaction.reply({ embeds: [embed] })
        }else if(interaction.commandName === "setchannel"){
            if(!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return await interaction.reply({ content: "No permission to set the counting channel.", ephemeral: true })

            const channel = interaction.options.getChannel("channel", true)
            const serverID = toSHA512(interaction.guild.id)
            const channelID = toSHA512(channel.id)

            const exists = await countings.findOne({ serverID: serverID })

            if(exists){
                await countings.updateOne({ serverID: serverID }, { $set: { channelID: channelID } })
                await interaction.reply({ content: "Counting channel successfully changed.", ephemeral: true })
            }else{
                await countings.insertOne({ serverName: interaction.guild.name, serverID: serverID, channelID: channelID, count: 0, lastUser: null, blockedUsers: [] })
                await interaction.reply({ content: "Counting channel successfully added.", ephemeral: true })
            }
        }else if(interaction.commandName === "blockuser"){
            if(!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return await interaction.reply({ content: "No permission to block the user.", ephemeral: true })

            const user = toSHA512(interaction.options.getUser("user", true).id)
            const serverID = toSHA512(interaction.guild.id)
            const exists = await countings.findOne({ serverID: serverID })

            if(exists && exists.blockedUsers.includes(user)){
                await interaction.reply({ content: "User is already blocked.", ephemeral: true })
            }else{
                await countings.updateOne({ serverID: serverID }, { $push: { blockedUsers: user } }, { new: true })
                await interaction.reply({ content: "User successfully blocked.", ephemeral: true })
            }
        }else if(interaction.commandName === "unblockuser"){
            if(!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return await interaction.reply({ content: "No permission to unblock the user.", ephemeral: true })

            const user = toSHA512(interaction.options.getUser("user", true).id)
            const serverID = toSHA512(interaction.guild.id)
            const exists = await countings.findOne({ serverID: serverID })

            if(exists && exists.blockedUsers.includes(user)){
                await countings.updateOne({ serverID: serverID }, { $pull: { blockedUsers: user } }, { new: true })
                await interaction.reply({ content: "User successfully unblocked.", ephemeral: true })
            }else{
                await interaction.reply({ content: "User is not blocked.", ephemeral: true })
            }
        }else if(interaction.commandName === "update"){
            if(!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return await interaction.reply({ content: "No permission to update.", ephemeral: true })

            const serverID = toSHA512(interaction.guild.id)
            const exists = await countings.findOne({ serverID: serverID })

            if(exists){
                await countings.updateOne({ serverID: serverID }, { $set: { serverName: interaction.guild.name } }, { new: true })
                await interaction.reply({ content: "Server information in database successfully updated.", ephemeral: true })
            }else{
                await interaction.reply({ content: "Unable to find this server in the database.", ephemeral: true })
            }
        }
    })
    
    bot.login(process.env.DISCORD_TOKEN)
})()