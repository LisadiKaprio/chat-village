import tmi from 'tmi.js'
import { getChannelId, searchPlayerOfExistingPlayer, searchUsernameOfExistingPlayer, updatePlayerState } from './functions'
import { Player, PlayerState, Message, CommandTrigger, NonEmptyArray, MINUTE, SkinId, BackendBoatAvatar, RaceStatus } from '../../common/src/Types'
import { SimpleMessages, MessageInteraction, MessageInteractionEmpty, MessageInteractionFailed, MessageInteractionRandom, MessageInventory, MessageFailedInitBet, MessageFailedRaiseBet, MessageInitBet, MessageRaiseBet, MessageFailedRaceJoin, MessageRaceFinish, MessageRaceTooFewParticipants, MessageWarningRaceStart, MessageGiftedPoints, MessageFailedGifting } from '../../common/src/Messages'
import { CommandParser } from './CommandParser'
import { getRandom } from '../../common/src/Util'
import Db from './Db'
import State, { getPlayersInChannel } from './State'
import RaceConstructor from './Race'
      
const BONK_PRICE = 10
const HUG_PRICE = 5
const IDLE_GAIN = 1
    
export async function addPointsToPlayer(db: Db, currentPoints: number, pointsToAdd: number, playerId: number): Promise<void> {
	await db.update('cv.players', { points: currentPoints + pointsToAdd }, { id: playerId })
}

export async function deductPointsFromPlayer(db: Db, currentPoints: number, pointsToDeduct: number, playerId: number): Promise<void> {
	await db.update('cv.players', { points: currentPoints - pointsToDeduct }, { id: playerId })
}

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
						await handleBetCommand(channel, this.#client, currentPlayer, args)
					} else if (command === CommandTrigger.GIFT) {
						await handleGiftingStars(channel, this.#client, currentPlayer, args, argUsers, currentChannelUsername)
					} else if (command === CommandTrigger.DEBUG_ID) {
						void this.#client.say(channel, `@${currentPlayer.display_name} Your player ID is ${currentPlayer.id}`)
					}
				} else { // No command detected -> Pass messages and emotes to frontend
					await addPointsToPlayer(db, currentPlayer.points, IDLE_GAIN, currentPlayer.id)
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
    
		async function setAllChannelPlayersOffline(channelId: number): Promise<void> {
			await db.update('cv.players', { state: PlayerState.OFFLINE }, { channel_id: channelId })
			state.activePlayers = []
			state.newEmotes = []
		}
    
		async function setTimeLastChatted(playerId: number): Promise<void> {
			await db.update('cv.players', { last_chatted: JSON.stringify(new Date()) }, { id: playerId })
		}

		async function handleInteractionCommand(channel: any, client: tmi.Client, currentPlayer: Player, command: CommandTrigger, argUsers: string[], currentChannelId: number) {
			const currentChannelUsername = channel.startsWith('#') ? channel.substr(1) : channel
			let price = 0
			if (command === CommandTrigger.BONK) {
				price = BONK_PRICE
			} else if (command === CommandTrigger.HUG) {
				price = HUG_PRICE
			}

			if (currentPlayer.points <= price) {
				void client.say(channel, MessageInteractionFailed(currentPlayer.display_name, command))
				return
			}

			await deductPointsFromPlayer(db, currentPlayer.points, price, currentPlayer.id)
			const potentialTargets = Object.values(state.players).filter(p => p.state === PlayerState.ACTIVE && p.channel_id === currentChannelId && p.username !== currentPlayer.username)
			if (potentialTargets.length === 0){
				void client.say(channel, MessageInteractionEmpty(currentPlayer.display_name, command))
				return
			}

			let targetPlayerUsername = argUsers[0]
			if (!targetPlayerUsername) {
				targetPlayerUsername = getRandom([...potentialTargets] as NonEmptyArray<Player>).username
			}
			console.log('targetPlayerUsername is ' + targetPlayerUsername)
			if (!argUsers[0]){
				argUsers.push(targetPlayerUsername)
				void client.say(channel, MessageInteractionRandom(currentPlayer.display_name, targetPlayerUsername, price, command))
			} else {
				void client.say(channel, MessageInteraction(currentPlayer.display_name, targetPlayerUsername, price, command))
			}
			if (state.allFrontendCommands[currentChannelUsername]) { // TODO: maybe i can create a util function for that kind of situation?
				state.allFrontendCommands[currentChannelUsername].push({
					command: command,
					args: [],
					argPlayerUsernames: argUsers,
					playerUsername: currentPlayer.username,
				})
			} else {
				state.allFrontendCommands[currentChannelUsername] = [{
					command: command,
					args: [],
					argPlayerUsernames: argUsers,
					playerUsername: currentPlayer.username,
				}]
			}
		}

		async function handleBetCommand(channel: any, client: tmi.Client, currentPlayer: Player, args: string[]) {
			const currentChannelUsername = channel.startsWith('#') ? channel.substr(1) : channel
			let currentBet = raceConstructor.BASE_BET
			if (!raceConstructor.races[currentChannelUsername]) { // initiate race
				if(+args[0] >= raceConstructor.BASE_BET) currentBet = +args[0]
				raceConstructor.createRace(currentChannelUsername, currentBet)
			}
			const currentRace = raceConstructor.races[currentChannelUsername]
			currentBet = currentRace.currentBet

			if (currentRace.status === RaceStatus.RACING || currentRace.status === RaceStatus.FINISHING) { // race is already going
				void client.say(channel, SimpleMessages.RACE_GOING)
				return
			}

			if (Object.keys(currentRace.participants).length < raceConstructor.MIN_PARTICIPANTS && Object.keys(currentRace.participants).length !== 0) { // add time to wait for race
				currentRace.minutesToWait = (((Date.now() - currentRace.dateInit) + (raceConstructor.WAIT_MINUTES_FEW_PLAYERS * MINUTE)) / MINUTE)
			}

			if (currentRace.participants[currentPlayer.id]) { // already joined race
				void client.say(channel, MessageFailedRaceJoin(currentPlayer.display_name))
				return
			}
			
			if (currentPlayer.points < currentBet) { // not enough points
				void client.say(channel, MessageFailedInitBet(currentPlayer.display_name, currentBet))
				delete raceConstructor.races[currentChannelUsername]
				return
			}
			
			currentRace.participants[currentPlayer.id] = {
				...currentPlayer,
				speed: 0,
			}
			void client.say(channel, MessageInitBet(currentPlayer.display_name, currentBet, raceConstructor.MIN_PARTICIPANTS - Object.values(currentRace.participants).length))
			await deductPointsFromPlayer(db, currentPlayer.points, currentBet, currentPlayer.id)		
		}

		async function handleGiftingStars(channel: any, client: tmi.Client, currentPlayer: Player, args: string[], argUsers: string[], channelName: string) {
			let pointsToGift = 1
			if(+args[0] >= 2) {
				pointsToGift = +args[0]
			} else if(+args[1] >= 2) {
				pointsToGift = +args[1]
			}

			if (currentPlayer.points < pointsToGift) {
				void client.say(channel, MessageFailedGifting(currentPlayer.display_name, pointsToGift))
			}
			
			const targetPlayer = await determinePlayerObject(argUsers, channelName, currentPlayer.username)
			if (!targetPlayer) {
				console.log('Error: No target player for gifting stars could be determined.')
				return
			}
			console.log(JSON.stringify(targetPlayer))
			
			await deductPointsFromPlayer(db, currentPlayer.points, pointsToGift, currentPlayer.id)
			console.log(`targetPlayer.points is ${targetPlayer.points}`)
			console.log(`pointsToGift is ${pointsToGift}`)
			console.log(`targetPlayer.id is ${targetPlayer.id}`)
			await addPointsToPlayer(db, targetPlayer.points, pointsToGift, targetPlayer.id)
			void client.say(channel, MessageGiftedPoints(currentPlayer.display_name, targetPlayer.display_name, pointsToGift))
		}

		async function determinePlayerObject(argUsers: string[], channelName: string, playerUsername: string): Promise<Player | undefined> {
			const channelPlayersObject = await getPlayersInChannel(db, channelName)
			const players = Object.values(channelPlayersObject).filter(p => p.username !== playerUsername)
			if(!argUsers || !argUsers[0]) {
				return getRandom([...Object.values(players)] as NonEmptyArray<Player>)
			}
			return searchPlayerOfExistingPlayer(argUsers[0], players)
		}
	}

	async sayRaceFinishMessage(channelName: string, winnerName: string, pointsAdded: number, pointsDeducted: number) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageRaceFinish(winnerName, pointsAdded, pointsDeducted))
	}

	async sayRaceTooFewParticipantsMessage(channelName: string, participantsAmount: number) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageRaceTooFewParticipants(participantsAmount))
	}

	async sayRaceWarningMessage(channelName: string, morePlayersNeeded: number) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageWarningRaceStart(morePlayersNeeded))
	}
}