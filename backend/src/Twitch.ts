import tmi from 'tmi.js'
import { getChannelId, updatePlayerState } from './functions'
import { Player, PlayerState, Message, CommandTrigger, NonEmptyArray, MINUTE, SkinId } from '../../common/src/Types'
import { SimpleMessages, MessageInteraction, MessageInteractionEmpty, MessageInteractionFailed, MessageInteractionRandom, MessageInventory, MessageFailedInitBet, MessageFailedRaiseBet, MessageInitBet, MessageRaiseBet, MessageFailedRaceJoin } from '../../common/src/Messages'
import { CommandParser } from './CommandParser'
import { getRandom } from '../../common/src/Util'
import Db from './Db'
import State, { getPlayersInChannel } from './State'
import RaceConstructor from './Race'
      
const BONK_PRICE = 10
const HUG_PRICE = 5
const IDLE_GAIN = 1

export default class Twitch {
    #client: tmi.Client
    commandParser: CommandParser
    IS_BOT_ACTIVE: boolean

    constructor(options: any) {
        this.#client = new tmi.client(options)
        this.commandParser = new CommandParser()

        this.IS_BOT_ACTIVE = true
    }

    async init(db: Db, state: State, raceConstructor: RaceConstructor) {
        void this.#client.connect()
      
        await initActivePlayers()
      
        this.#client.on('connected', (address: any, port: number) => {
          console.log('Connected to chat!' + address + port)
        })
      
        this.#client.on('message', async (channel: any, tags: any, message: any) => {
          const { username } = tags
          const displayName = tags['display-name']
      
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
      
          if (message === `${process.env.BOT_STATUS_COMMAND}` && (tags.mod || tags.badges?.broadcaster)) {
            this.IS_BOT_ACTIVE = !this.IS_BOT_ACTIVE
            void this.#client.say(channel, `Ok, bot is now set to ${this.IS_BOT_ACTIVE}.`)
            return
          }
      
          if (this.IS_BOT_ACTIVE) {
            if(!(username in state.chatters)) {
              console.log(`${username} not found among chatters: creating chatter...`)
              await createNewChatter(username, displayName, tags.color)
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
              await updatePlayerState(db, currentPlayer.id, PlayerState.ACTIVE)
            }
      
            if (!state.activePlayers.includes(currentPlayer.id)) {
              state.activePlayers.push(currentPlayer.id)
            }
      
            // todo: command doesn't necessarily have an `!` infront?..
            const detectedCommand = this.commandParser.parse(message, playersInChannel)
            if (detectedCommand) {
              const command = detectedCommand.command
              const args = detectedCommand.args
              const argUsers = detectedCommand.argPlayerUsernames
              // let argUsername: string|undefined
              // if(argUsers[0]){
              //   argUsername = state.players[+argUsers[0]].username
              // }
      
              if (tags.mod || tags.badges?.broadcaster) { // mod commands
                if (command === CommandTrigger.VOLCANO){
                  void this.#client.say(channel, SimpleMessages.VOLCANO)
                  await setAllChannelPlayersOffline(currentChannelId)
                  return
                } else if (command === process.env.BOT_STATUS_COMMAND){
                  this.IS_BOT_ACTIVE = !this.IS_BOT_ACTIVE
                  void this.#client.say(channel, `Ok, bot is now set to ${this.IS_BOT_ACTIVE}.`)
                }
              }
              if (command === CommandTrigger.INVENTORY || command === CommandTrigger.INV_SHORT) {
                void this.#client.say(channel, MessageInventory(displayName, currentPlayer.points))
              }
              if (command == CommandTrigger.BONK) { // player commands
                await handleInteractionCommand(channel, this.#client, currentPlayer, command, argUsers, currentChannelId)
              } else if (command == CommandTrigger.HUG) {
                await handleInteractionCommand(channel, this.#client, currentPlayer, command, argUsers, currentChannelId)
              } else if (command === CommandTrigger.BET) {
                let currentBet = raceConstructor.BASE_BET
                if(+args[0] >= raceConstructor.BASE_BET) currentBet = +args[0]
                if (!raceConstructor.races[currentChannelUsername]) {
                  raceConstructor.createRace(currentChannelUsername, currentBet)
                }
                const currentRace = raceConstructor.races[currentChannelUsername]
      
                if (Object.keys(currentRace.participants).length < raceConstructor.MIN_PARTICIPANTS 
                && Object.keys(currentRace.participants).length !== 0) {
                  currentRace.minutesToWait = (((Date.now() - currentRace.dateInit) + (raceConstructor.WAIT_MINUTES_FEW_PLAYERS * MINUTE)) / MINUTE)
                }
                
                if (!currentRace.participants[currentPlayer.id]) { // is initial race entry
                  if (currentPlayer.points < currentBet) {
                    void this.#client.say(channel, MessageFailedInitBet(displayName, currentBet))
                  } else {
                    void this.#client.say(channel, MessageInitBet(displayName, currentBet, 0))
                    currentRace.participants[currentPlayer.id] = {
                      ...currentPlayer,
                      speed: 0,
                    }
                  }
                } else {
                  if (Object.keys(currentRace.participants).length !== 1) {
                    void this.#client.say(channel, MessageFailedRaceJoin(displayName))
                  } else { // add more to bet
                    if (currentPlayer.points < currentBet) {
                        void this.#client.say(channel, MessageFailedRaiseBet(displayName, currentBet))
                    } else {
                      currentRace.currentBet += currentBet
                      void this.#client.say(channel, MessageRaiseBet(displayName, currentBet, currentRace.currentBet))
                    }
                  }
                }
              }
            } else { // No command detected -> Pass messages and emotes to frontend
              await addPointsToPlayer(currentPlayer.points, IDLE_GAIN, currentPlayer.id)
              console.log(`${username} gets ${IDLE_GAIN} stars for chatting idly!`)
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
        })

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
              c.skin,
              p.id as id,
              p.chatter_id,
              p.channel_id,
              p.points,
              p.state
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
            skin: getRandom(Object.values(SkinId) as NonEmptyArray<SkinId>),
          })    
        }
      
        async function createNewPlayer(chatterId: number, currentChannelId: number): Promise<void> {
          await db.insert('cv.players', {
            chatter_id: chatterId,
            channel_id: currentChannelId,
            state: PlayerState.ACTIVE,
          })  
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

        async function handleInteractionCommand(channel: any, client: tmi.Client, currentPlayer: Player, command: CommandTrigger, argUsers: string[], currentChannelId: number) {
            let price = 0
            if (command === CommandTrigger.BONK) {
                price = BONK_PRICE
            } else if (command === CommandTrigger.HUG) {
                price = HUG_PRICE
            }

            if (currentPlayer.points >= price) {
                await deductPointsFromPlayer(currentPlayer.points, price, currentPlayer.id)
                const potentialTargets = Object.values(state.players).filter(p => p.state === PlayerState.ACTIVE && p.channel_id === currentChannelId && p.username !== currentPlayer.username)
                if (potentialTargets.length > 0){
                    let targetPlayerUsername = argUsers[0]
                    if (!targetPlayerUsername) {
                        targetPlayerUsername = getRandom([...potentialTargets] as NonEmptyArray<Player>).username
                    }
                    console.log('targetPlayerUsername is ' + targetPlayerUsername)
                    if (!argUsers[0]){
                      argUsers.push(targetPlayerUsername)
                      void client.say(channel, MessageInteractionRandom(currentPlayer.display_name, targetPlayerUsername, price, command))
                      if (state.allFrontendCommands[channel]) { // TODO: maybe i can create a util function for that kind of situation?
                        state.allFrontendCommands[channel].push({
                            command: command,
                            args: [],
                            argPlayerUsernames: argUsers,
                            playerUsername: currentPlayer.username,
                          })
                      } else {
                        state.allFrontendCommands[channel] = [{
                          command: command,
                          args: [],
                          argPlayerUsernames: argUsers,
                          playerUsername: currentPlayer.username,
                        }]
                      }
                    } else {
                      void client.say(channel, MessageInteraction(currentPlayer.display_name, targetPlayerUsername, price, command))
                      if (state.allFrontendCommands[channel]) { // TODO: maybe i can create a util function for that kind of situation?
                        state.allFrontendCommands[channel].push({
                            command: command,
                            args: [],
                            argPlayerUsernames: argUsers,
                            playerUsername: currentPlayer.username,
                          })
                      } else {
                        state.allFrontendCommands[channel] = [{
                          command: command,
                          args: [],
                          argPlayerUsernames: argUsers,
                          playerUsername: currentPlayer.username,
                        }]
                      }
                    }
                } else {
                    void client.say(channel, MessageInteractionEmpty(currentPlayer.display_name, command))
                }
                } else {
                void client.say(channel, MessageInteractionFailed(currentPlayer.display_name, command))
                }
        }
      
    }
}