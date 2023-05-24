import tmi from 'tmi.js'
import { Player, Players, PlayerState, Message } from '../../common/src/Types'
import { SimpleBotMessages, BotMessageHug, BotMessageBonk, BotMessageFailedBonk, BotMessageFailedHug, BotMessageInventory } from '../../common/src/Messages'
import Db from './Db'
import { getChannelId } from './functions'
import State, { getPlayersInChannel } from './State'
import Webserver from './Webserver'

require('dotenv').config()

async function main() {
  // COMMUNICATION WITH THE DATABASE
  let dbConnectStr = ''
  let dbPatchesDir = ''

  if(process.env.DB_CONNECT_STR && process.env.DB_PATCHES_DIR) {
    dbConnectStr = process.env.DB_CONNECT_STR
    dbPatchesDir = process.env.DB_PATCHES_DIR
  } else {
    console.log('Warning: define the database path in an env file to be able to connect!')
  }

  const db = new Db(dbConnectStr, dbPatchesDir)
  await db.connect()
  await db.patch()
  console.log('Connected to database.')

  const state = new State()
  await state.init(db)

  const IS_BOT_ACTIVE = true
  const BONK_COMMAND = 'bonk'
  const HUG_COMMAND = 'hug'
  const INVENTORY_COMMAND = 'inventory'
  const INV_SHORT_COMMAND = 'inv'
  const BONK_PRICE = 10
  const HUG_PRICE = 5
  const IDLE_GAIN = 1

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
    identity: {
      username: process.env.TWITCH_BOT_USERNAME,
      password: process.env.TWITCH_OAUTH_TOKEN,
    },
    channels: await channelUsernames(),
  }

  const client = new tmi.client(options)
  client.connect()

  await initActivePlayers()

  client.on('connected', (address: any, port: number) => {
    console.log('Connected to chat!' + address + port)
  })

  client.on('message', async (channel: any, tags: any, message: any) => {
    const { username } = tags
    const display_name = tags['display-name']

    // don't do anything if message comes from ChatVillageBot
    if(process.env.TWITCH_BOT_USERNAME && username.toLowerCase() === process.env.TWITCH_BOT_USERNAME.toLowerCase()) {
      return
    }

    const currentChannelUsername = channel.startsWith('#') ? channel.substr(1) : channel
    const currentChannelId = await getChannelId(db, currentChannelUsername)
    if (!currentChannelId) {
      console.log(`Channel with id ${currentChannelId} not found in db!`)
      return
    }
    const playersInChannel = await getPlayersInChannel(db, currentChannelUsername)

    if (IS_BOT_ACTIVE) {
      if(!(username in state.chatters)) {
        console.log(`${username} not found among chatters: creating chatter...`)
        await createNewChatter(username, display_name, tags.color)
        console.log(`Chatter ${username} created!`)
      }

      const chatterId = await getChatterId(username)
      if (!chatterId) return

      let currentPlayer = await getPlayer(currentChannelId ?? 0, chatterId ?? 0)
      if(!currentPlayer) {
        console.log(`${username} not found among ${currentChannelUsername} players: creating player...`)
        await createNewPlayer(chatterId, currentChannelId)
        console.log(`Player ${username} created!`)
        currentPlayer = await getPlayer(currentChannelId ?? 0, chatterId ?? 0)
        if(!currentPlayer) {
          console.log(`Player ${username} on ${currentChannelUsername} channel could not be found or created!`)
          return
        }
      }
      await setTimeLastChatted(currentPlayer.id)

      if(currentPlayer.state !== PlayerState.ACTIVE){
        await updatePlayerState(currentPlayer.id, PlayerState.ACTIVE)
      }

      if (!state.activePlayers.includes(currentPlayer.id)) {
        state.activePlayers.push(currentPlayer.id)
      }

      // todo: command doesn't necessarily have an `!` infront?..
      const detectedCommand = message.match(/^!([\w]+)($|\s.*)/)
      if (detectedCommand) {
        const command = detectedCommand[1]
        const args = detectedCommand[2].split(/\s+/)
        const argUsers = args.map((arg: any) => {
            const playerId = searchUser(arg, playersInChannel)
            return playerId
          }).filter((user: any) => user != undefined) as string[]
        let argUsername: string|undefined
        if(argUsers[0]){
          argUsername = state.players[+argUsers[0]].username
        }

        let passCommandToFrontend = false

        if (tags.mod || tags.badges?.broadcaster) { // mod commands
          if (command === 'volcano'){
            client.say(channel, SimpleBotMessages.VOLCANO)
            await setAllChannelPlayersOffline(currentChannelId)
            return
          }
        }
        if (command === INVENTORY_COMMAND || command === INV_SHORT_COMMAND) {
          client.say(channel, BotMessageInventory(username, currentPlayer.points))
        }
        if (command == BONK_COMMAND && argUsername) { // player commands
          if (currentPlayer.points >= BONK_PRICE) {
            await deductPointsFromPlayer(currentPlayer.points, BONK_PRICE, currentPlayer.id)
            passCommandToFrontend = true
            client.say(channel, BotMessageBonk(username, argUsername))
          } else {
            client.say(channel, BotMessageFailedBonk(username, argUsername))
          }
        } else if (command == HUG_COMMAND && argUsername) {
          if (currentPlayer.points >= HUG_PRICE) {
            await deductPointsFromPlayer(currentPlayer.points, HUG_PRICE, currentPlayer.id)
            passCommandToFrontend = true
            client.say(channel, BotMessageHug(username, argUsername))
          } else {
            client.say(channel, BotMessageFailedHug(username, argUsername))
          }
        } else {
          passCommandToFrontend = true
        }
        if(passCommandToFrontend) { // Pass (paid) commands to frontend
          currentPlayer.unhandled_commands.push({
            command: command,
            args: args,
            argUsers: argUsers,
          })
          await db.update('cv.players', { 
            unhandled_commands: JSON.stringify(currentPlayer.unhandled_commands),
          }, { id: currentPlayer.id })
        }
      } else { // No command detected -> Pass messages and emotes to frontend
        await addPointsToPlayer(currentPlayer.points, IDLE_GAIN, currentPlayer.id)
        console.log(`${username} gets ${IDLE_GAIN} fish(es) for chatting idly!`)
        if (!tags.emotes) {
          if (state.allNewMessages[currentChannelUsername] && state.allNewMessages[currentChannelUsername][username]) {
            state.allNewMessages[currentChannelUsername].push({
              name: username,
              text: message,
              channel: currentChannelUsername,
            } as Message)
          } else {
            state.allNewMessages[currentChannelUsername] = [{
              name: username,
              text: message,
              channel: currentChannelUsername,
            } as Message]
          }
        } else {
          for (const [emote, charPositions] of Object.entries(tags.emotes) as [string, any]) {
            for (let i = 0; i < charPositions.length; i++) {
              state.newEmotes.push({
                name: username,
                id: emote,
                channel: currentChannelUsername,
              })
            }
          }
        }
      }
    }
    state.refresh(db)
  })

  const webserver = new Webserver()
  webserver.init(db, state)

  // ============= functions ================

  async function initActivePlayers(): Promise<void> {
    const rows = await db._getMany(`
      select
        cv.players.id
      from
        cv.players
      where
        cv.players.state = $1
    `, [PlayerState.ACTIVE])
    for(const row of rows){
      state.activePlayers.push(row.id)
    }
  }

  async function getChatterId(username: string): Promise<number|null> {
    const row = await db._get(`
      select
        cv.chatters.id
      from
        cv.chatters
      where
        cv.chatters.username = $1
      `, [username]) 
    return row.id  
  }

  async function getPlayer(channelId: number, chatterId: number): Promise<Player|null> {
    return await db._get(`
      select
        c.username,
        c.display_name,
        c.color,
        p.id as id,
        p.chatter_id,
        p.channel_id,
        p.points,
        p.state,
        p.unhandled_commands
      from cv.chatters c
      inner join cv.players p on p.chatter_id = c.id
      where
        p.channel_id = $1
        and p.chatter_id = $2
      `, [channelId, chatterId])
  }

  async function createNewChatter(username: string, display_name: string, color: string): Promise<void> {
    await db.insert('cv.chatters', {
      username: username,
      display_name: display_name,
      color: color,
    })    
  }

  async function createNewPlayer(chatterId: number, currentChannelId: number): Promise<void> {
    await db.insert('cv.players', {
      chatter_id: chatterId,
      channel_id: currentChannelId,
      state: PlayerState.ACTIVE,
    })  
  }

  async function updatePlayerState(playerId: number, state: PlayerState): Promise<void> {
    console.log(`setting player ${state}: ${playerId}`)
    await db.update('cv.players', { state: state }, { id: playerId })    
  }

  async function addPointsToPlayer(currentPoints: number, pointsToAdd: number, playerId: number): Promise<void> {
    await db.update('cv.players', { points: currentPoints + pointsToAdd }, { id: playerId })
  }

  async function deductPointsFromPlayer(currentPoints: number, pointsToDeduct: number, playerId: number): Promise<void> {
    await db.update('cv.players', { points: currentPoints - pointsToDeduct }, { id: playerId })
  }

  async function setAllChannelPlayersOffline(channelId: number): Promise<void> {
    await db.update('cv.players', { state: PlayerState.OFFLINE }, { channel_id: channelId })
    state.activePlayers = []
    state.newEmotes = []
  }

  async function setTimeLastChatted(playerId: number): Promise<void> {
    await db.update('cv.players', { last_chatted: JSON.stringify(new Date()) }, { id: playerId })
  }

  function searchUser(query: string, players: Players): string | undefined {
    if (query.startsWith('@')) {
      query = query.replace('@', '')
    }
    for (const [playerId, userTags] of Object.entries(players)) {
      if (userTags.username === query || userTags.display_name === query){
        return playerId
      }
    }
  }
}
main()
