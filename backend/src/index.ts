import tmi from 'tmi.js'
import { Player, Players, PlayerState, Message } from '../../common/src/Types'
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
    const display_name = tags['display-name']

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
            console.log(`@${username} bonked someone, spending ${BONK_PRICE}! What a shame! >:c`)
          }
        } else if (command == HUG_COMMAND) {
          if (currentPlayer.points >= HUG_PRICE) {
            await deductPointsFromPlayer(currentPlayer.points, HUG_PRICE, currentPlayer.id)
            pointsSpent = true
            console.log(`@${username} hugged someone, spending ${HUG_PRICE}! What a deal! :)`)
          }
        } else {
          pointsSpent = true
        }
        if(pointsSpent) { // Pass (paid) commands to frontend
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
    await db.update('cv.players', { state: state }, { id: playerId })    
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
    for (const [username, userTags] of Object.entries(players)) {
      if (userTags.username === query || userTags.display_name === query){
        return username
      }
    }
  }
}
main()
