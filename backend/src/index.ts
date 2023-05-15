const tmi = require('tmi.js')
import Db from './Db'
import { getChannelId } from './functions'
import State, { getPlayersInChannel } from './State'
import { Message, Player, Players, PlayerState } from './Types'
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
    channels: await channelUsernames(),
  }

  const client = new tmi.client(options)
  client.connect()

  client.on('connected', (address: any, port: number) => {
    console.log('Connected to chat!' + address + port)
  })

  client.on('message', async (channel: any, tags: any, message: any) => {
    const { username } = tags
    const displayName = tags['display-name']

    const currentChannelUsername = channel.match(/^#([\w]+)($|\s.*)/)[1]
    const currentChannelId = await getChannelId(db, currentChannelUsername)
    const playersInChannel = await getPlayersInChannel(db, currentChannelUsername)

    if (IS_BOT_ACTIVE) {
      if(!(username in state.chatters)) {
        console.log(`${username} not found among chatters: creating new chatter...`)
        await createNewChatter(username, displayName, tags.color)
      }

      const chatterId = await getChatterId(username)

      if (!(username in playersInChannel)) {
        console.log(`${username} not found among ${currentChannelUsername} players: creating new player...`)
        await createNewPlayer(chatterId, currentChannelId)
      }

      const currentPlayer = await getPlayer(currentChannelId, chatterId)
      
      if(playersInChannel[username].state !== PlayerState.ACTIVE){
        await updatePlayerState(currentPlayer.id, PlayerState.ACTIVE)
      }

      if (!(username in state.activePlayers)) {
        state.activePlayers.push(username)
      }

      // todo: command doesn't necessarily have an `!` infront?..
      const detectedCommand = message.match(/^!([\w]+)($|\s.*)/)
      if (detectedCommand) {
        const command = detectedCommand[1]
        const args = detectedCommand[2].split(/\s+/)
        const argUsers = args
          .map((arg: any) => {
            const username = searchUser(arg, playersInChannel)
            return username
          })
          .filter((user: any) => user != undefined) as string[]

        let pointsSpent = false
        if (command == BONK_COMMAND) {
          if (currentPlayer.points >= BONK_PRICE) {
            await deductPointsFromPlayer(currentPlayer.points, BONK_PRICE, currentPlayer.id)
            pointsSpent = true
          }
        } else if (command == HUG_COMMAND) {
          if (currentPlayer.points >= HUG_PRICE) {
            await deductPointsFromPlayer(currentPlayer.points, HUG_PRICE, currentPlayer.id)
            pointsSpent = true
          }
        } else {
          pointsSpent = true
        }
        // Pass commands to frontend
        if(pointsSpent) {
          currentPlayer.unhandled_commands.push({
            command: command,
            args: args,
            argUsers: argUsers,
          })
          await db.update('cv.players', { unhandled_commands: currentPlayer.unhandled_commands })
        }
      } else { // No command detected -> Pass messages and emotes to frontend
        await addPointsToPlayer(currentPlayer.points, IDLE_GAIN, currentPlayer.id)
        if (!tags.emotes) {
          if (state.allNewMessages[currentChannelUsername][username]) {
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
          for (const [emote, charPositions] of Object.entries(tags.emotes)) {
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
  })

  const webserver = new Webserver()
  webserver.init(db, state)

  // ============= functions ================

  async function getChatterId(username: string): Promise<number> {
    return await db._get(`
      select
        cv.chatters.id
      from
        cv.chatters
      where
        cv.chatters.username = ${username}
      `)   
  }

  async function getPlayer(channelId: number, chatterId: number): Promise<Player> {
    return await db._get(`
      select
        cv.players
      where
        cv.players.channel_id = ${channelId}
        and cv.players.chatter_id = ${chatterId}
      `)
  }

  async function createNewChatter(username: string, displayName: string, color: string): Promise<void> {
    await db.insert('cv.chatters', {
      username: username,
      displayname: displayName,
      color: color,
    })    
  }

  async function createNewPlayer(chatterId: number, currentChannelId: number): Promise<void> {
    await db.insert('cv.players', {
      chatter_id: chatterId,
      channel_id: currentChannelId,
      state: 'active',
    })  
  }

  async function updatePlayerState(playerId: number, state: PlayerState): Promise<void> {
    db.update('cv.players', { state: state }, { id: playerId })    
  }

  async function addPointsToPlayer(currentPoints: number, pointsToAdd: number, playerId: number): Promise<void> {
    await db.update('cv.players', { points: currentPoints + pointsToAdd }, { id: playerId })
  }

  async function deductPointsFromPlayer(currentPoints: number, pointsToDeduct: number, playerId: number): Promise<void> {
    await db.update('cv.players', { points: currentPoints - pointsToDeduct }, { id: playerId })
  }

  function searchUser(query: string, players: Players): string | undefined {
    if (query.startsWith('@')) {
      query = query.replace('@', '')
    }
    const _player = players[query]

    // const user = users[query]
    if (!_player) {
      for (const [username, userTags] of Object.entries(players)) {
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
