const tmi = require('tmi.js')
const fs = require('fs')
import Db from './Db'
require('dotenv').config()



const enum COMMANDS {
  //start bot
  botStart = 'start',
  //end bot
  botEnd = 'exit',
  //clear users in this session
  clearUsers = 'clearUsers',
  deleteUser = 'deleteUser',
  deleteEveryUser = 'deleteEveryUser',
  messageCount = 'messages',
}

// // = = = construction: users database in data/users = = =
// const USER_ALLOW_LIST: string[] = []
// const DATA_DIR = './data'
// const USER_DATA_DIR = DATA_DIR + '/users'

type UnhandledCommand = {
  command: string;
  args: string[];
  argUsers: string[];
};
type Player = {
  username: string;
  displayName: string;
  color: string;
  points: number;
  unhandledCommands?: UnhandledCommand[];
};
type Players = {
  [name: string]: Player;
};
type Emote = {
  name: string;
  id: string;
};
type Messages = {
  [name: string]: string[];
};


async function main() {
  // COMMUNICATION WITH THE DATABASE
  let db: Db
  if(process.env.DB_CONNECT_STR && process.env.DB_PATCHES_DIR) {
    db = new Db(process.env.DB_CONNECT_STR, process.env.DB_PATCHES_DIR)
    await db.connect()
    await db.patch()
    console.log('Connected to database.')
  } else {
    console.log('Warning: define the database path in an env file to be able to connect!')
  }

  
  const players: Players = await loadPlayers()
  const activeUsers: string[] = []
  let newEmotes: Emote[] = []
  let newMessages: Messages = {}

  const botActive = true

  // = = = tmi = = =
  // tmi client options

  const channelUsernames = async (): Promise<string[]> => {
    const rows = await db.getMany('cv.channels')
    return rows.map(row => row.channel_username)
  }

  const options = {
    options: {
      debug: true,
    },
    connection: {
      cluster: 'aws',
      reconnect: true,
    },
    channels: await channelUsernames(),
  }
  
  // insert options to client
  const client = new tmi.client(options)
  
  // connect the client to the chat
  client.connect()
  
  // when client is connected to chat
  client.on('connected', (address: any, port: number) => {
    console.log('Connected to chat!' + address + port)
  })
  
  // when client recieves a normal chat message
  client.on('message', (_channel: any, tags: any, message: any) => {
    const { username } = tags
    const displayName = tags['display-name']
  
    // blacklist a chatter: 
    // if (USER_ALLOW_LIST.length > 0 && !USER_ALLOW_LIST.includes(username)) {
    //   return
    // }
  
    if (botActive) {
      // detect user chatting as a participator of the game
      // first, save the user in the db if they weren't yet

      // db-todo: check if username in list of users,
      // if no -> save one with their color and username
      // then -> create player for user with assigned channel
      if (!(username in users)) {
        users[username] = putUserIntoObject(users, tags)
      }
      users[username].displayName = displayName
  
      // same, but for new users in current session aka current stream
      // db-todo: set user's state as "active"
      if (!(username in activeUsers)) {
        activeUsers.push(username)
      }
  
      // todo: command doesn't necessarily have an `!` infront?..
      const detectedCommand = message.match(/^!([\w]+)($|\s.*)/)
      if (detectedCommand) {
        const command = detectedCommand[1]
        const args = detectedCommand[2].split(/\s+/)
        const argUsers = args
          .map((arg: any) => {
            const username = searchUser(arg)
            return username
          })
          .filter((user: any) => user != undefined) as string[]
          
        // pay the price for the command;
        let payed = false
        if (command == 'bonk') {
          // db-todo: currency is fish. get fish amount from db, save new fish amount to db
          if (users[username].xp >= 60) {
            users[username].xp -= 60
            payed = true
          }
        } else if (command == 'hug') {
          if (users[username].xp >= 30) {
            users[username].xp -= 30
            payed = true
          }
        } else {
          // pass through the unknown commands
          payed = true
        }
        // Pass all the unknown commands (starting with ! ) to the frontend
        // in hopes that it knows what to do with them.
        if (!users[username].unhandledCommands && payed) {
          users[username].unhandledCommands = [
            {
              command: command,
              args: args,
              argUsers: argUsers,
            },
          ]
        } else if (payed) {
          users[username].unhandledCommands.push({
            command: command,
            args: args,
            argUsers: argUsers,
          })
        }
      } else {
        // no command detected
        // db-todo: increment 1 fish for a message to specific player
        users[username].xp += 15
        if (!tags.emotes) {
          // NOT A COMMAND
          if (newMessages[username]) {
            newMessages[username].push(message)
          } else {
            newMessages[username] = [message]
          }
        } else {
          for (const [emote, charPositions] of Object.entries(tags.emotes)) {
            for (let i = 0; i < charPositions.length; i++) {
              newEmotes.push({
                name: username,
                id: emote,
              })
            }
          }
        }
      }
      // save that as a json file then
      // db-todo: player full update goes here?
      saveUser(username)
    }
  })
  
  
  // COMMUNICATION WITH THE FRONTEND
  const express = require('express')
  const app = express()
  const port = 2501
  // frontend
  app.use(express.static('../frontend/dist'))
  
  // localhost:2501
  
  // dbg page
  app.get('/dbg', (_req: any, res: any) => {
    const filteredUsers: any = {}
    for (const name of activeUsers) {
      filteredUsers[name] = users[name]
    }
    res.send(
      JSON.stringify({
        users: users,
        active: activeUsers,
        filtered: filteredUsers,
      }),
    )
  })
  
  // send over the info inside the users variable
  app.get('/users/:channel', (req: any, res: any) => {

    const currentChannel = req.params.channel.match(/^#([\w]+)($|\s.*)/)[1]

    // need to keep the ServerUser interface in frontend synced with this right here
    const currentPlayers = async (): Promise<string[]> => {
      const rows = await db.getMany('cv.players', { channel_username: currentChannel })
      return rows 
      //.map(row => row.chatter_displayname)
    }

    const filteredUsers: any = {}
    for (const name of activeUsers) {
      filteredUsers[name] = users[name]
    }
    res.send({
      users: currentPlayers,
      emotes: newEmotes,
      messages: newMessages,
    })
    for (const user of activeUsers) {
      users[user].unhandledCommands = []
    }
    newEmotes = []
    newMessages = {}
  })
  
  // (:
  app.listen(port, () => {
    console.log(`Web-Avatars listening on http://localhost:${port}`)
  })


  async function loadPlayers(): Promise<Players> {
    const players: Players = {}
    
    const dbPlayers = await db._getMany(`
    select
      cv.chatters.username as username,
      cv.chatters.displayname as displayname,
      cv.chatters.color as color,
      cv.players.points as points
    from
      cv.players
      inner join cv.chatters on cv.chatters.id = cv.players.chatter_id
      inner join cv.channels on cv.channels.id = cv.players.channel_id
    where
      cv.channels.bot_active = 1
    `)
    for (const player of dbPlayers) {
      const user = JSON.parse(player) as Player // is json parse needed here?
      players[user.username] = user
    }
    return players
  }
  
  function saveUser(username: string) {
    fs.writeFileSync(userFile(username), JSON.stringify(users[username]))
  }
  
  function putUserIntoObject(_object: any, tags: any) {
    // WHAT's IN THE USER?
    return {
      name: tags.username,
      displayName: tags['display-name'],
      messageCount: 0,
      color: tags.color,
      xp: 0,
    }
  }
  
  // db-todo: search through chatter-player join table instead
  function searchUser(query: string): string | undefined {
    if (query.startsWith('@')) {
      query = query.replace('@', '')
    }
    const player = users

    // const user = users[query]
    if (!user) {
      for (const [username, userTags] of Object.entries(users)) {
        if (userTags.displayName == query) {
          return username
        }
      }
    } else {
      return query
    }
  }
}
main()
