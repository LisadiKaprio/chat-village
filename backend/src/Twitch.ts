import tmi from 'tmi.js'
import { Chance } from 'chance'
import { getChannelId, searchPlayerOfExistingPlayer, updatePlayerState } from './functions'
import { Player, PlayerState, Message, CommandTrigger, NonEmptyArray, MINUTE, SkinId, RaceStatus, FrontendCommand } from '../../common/src/Types'
import { SimpleMessages, MessageInteraction, MessageInteractionEmpty, MessageInteractionFailed, MessageInteractionRandom, MessageSeastars, MessageFailedInitBet, MessageInitBet, MessageFailedRaceJoin, MessageRaceFinish, MessageRaceTooFewParticipants, MessageWarningRaceStart, MessageGiftedStars, MessageFailedGiftingStars, MessageDailyShop, MessageBuyingFailedPrice, MessageBuyingSuccessEquipped, MessageBuyingSuccessInventory, MessageEquipFailedEmptyInventory, MessageEquipSuccess, MessageBuyingFailedDuplicate, MessageInventory, MessageFishFailRace, MessageFishTooEarly, MessageFishCatchLate, MessageFishCatchStandard, MessageFishCatchFailed, MessageFishCatchTreasure, MessageGiftedItem, MessageNooneGiftingItem, MessageInventoryFull } from '../../common/src/Messages'
import { CommandParser } from './CommandParser'
import { getRandom } from '../../common/src/Util'
import Db from './Db'
import State, { getPlayersInChannel } from './State'
import RaceConstructor from './Race'
import { AvatarDecoration, AvatarDecorationId, AVATAR_DECORATIONS } from '../../common/src/Visuals'
      
const BONK_PRICE = 10
const HUG_PRICE = 5
const IDLE_GAIN = 1
const DAILY_ITEMS_AMOUNT = 3
const MAX_INVENTORY_ITEMS = 3
const MAX_FISH_PLAYERS = 6
const MIN_FISH_WAIT_TIME_MS = 0.4 * MINUTE
const MAX_FISH_WAIT_TIME_MS = 0.7 * MINUTE
const FISH_WAIT_TIME_DECIMALS = 2
    
export async function addPointsToPlayer(db: Db, currentPoints: number, pointsToAdd: number, playerId: number): Promise<void> {
	await db.update('cv.players', { points: currentPoints + pointsToAdd }, { id: playerId })
}

export async function deductPointsFromPlayer(db: Db, currentPoints: number, pointsToDeduct: number, playerId: number): Promise<void> {
	await db.update('cv.players', { points: currentPoints - pointsToDeduct }, { id: playerId })
}

export async function equipNewAvatarDecorationToPlayer(db: Db, deco: AvatarDecorationId, playerId: number): Promise<void> {
	await db.update('cv.players', { avatar_decoration: deco }, { id: playerId })
}

export async function equipAvatarDecorationFromPlayerInventory(db: Db, previousEquip: AvatarDecorationId, newEquip: AvatarDecorationId, playerId: number): Promise<void> {
	await equipNewAvatarDecorationToPlayer(db, newEquip, playerId)

	const row = await db._get(`
    select
        cv.players.inventory
    from
        cv.players
    where
        cv.players.id = $1
    `, [playerId])
	const currentInventory: AvatarDecorationId[] = row.inventory
	const updatedInventory: AvatarDecorationId[] = currentInventory.filter(id => id !== newEquip).concat(previousEquip)
	if (!updatedInventory) {
		console.log(`Could not update inventory of player ${playerId}!`)
		return
	}
	await db.update('cv.players', { inventory: JSON.stringify(updatedInventory) }, { id: playerId })
}

export async function addAvatarDecorationToPlayerInventory(db: Db, deco: AvatarDecorationId, playerId: number): Promise<void> {
	const row = await db._get(`
    select
        cv.players.inventory
    from
        cv.players
    where
        cv.players.id = $1
    `, [playerId])
	const currentInventory: AvatarDecorationId[] = row.inventory
	const updatedInventory: AvatarDecorationId[] = currentInventory.concat(deco)
	if (!updatedInventory) {
		console.log(`Could not update inventory of player ${playerId}!`)
		return
	}
	await db.update('cv.players', { inventory: JSON.stringify(updatedInventory) }, { id: playerId })
}

export async function removeAvatarDecorationFromPlayerInventory(db: Db, deco: AvatarDecorationId, playerId: number): Promise<void> {
	const row = await db._get(`
    select
        cv.players.inventory
    from
        cv.players
    where
        cv.players.id = $1
    `, [playerId])
	const currentInventory: AvatarDecorationId[] = row.inventory
	const updatedInventory: AvatarDecorationId[] = currentInventory.filter(id => id !== deco)
	if (!updatedInventory) {
		console.log(`Could not update inventory of player ${playerId}!`)
		return
	}
	await db.update('cv.players', { inventory: JSON.stringify(updatedInventory) }, { id: playerId })
}

export async function removeAvatarDecorationFromPlayerEquipment(db: Db, playerId: number): Promise<void> {
	// await db.run('cv.players', { avatar_decoration: null }, { id: playerId })
	await db.run('UPDATE cv.players SET avatar_decoration = NULL WHERE id = $1', [playerId])
}

export default class Twitch {
	chance: Chance.Chance
	#client: tmi.Client
	commandParser: CommandParser
	IS_BOT_ACTIVE: boolean

	constructor(options: any) {
		this.chance = new Chance()
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
    
			const currentChannelUsername = channel.startsWith('#') ? channel.substring(1) : channel
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

			if (!this.IS_BOT_ACTIVE) return

			if(!(username in state.chatters)) {
				console.log(`${username} not found among chatters: creating chatter...`)
				await createNewChatter(username, displayName, tags.color)
				console.log(`Chatter ${username} created!`)
			}

			const chatterId = await getChatterId(username)
			if (!chatterId) return

			let currentPlayer = await getPlayer(currentChannelId, chatterId)
			if(!currentPlayer) {
				console.log(`${username} not found among ${currentChannelUsername} players: creating player...`)
				await createNewPlayer(chatterId, currentChannelId)
				console.log(`Player ${username} created!`)
				currentPlayer = await getPlayer(currentChannelId, chatterId)
				if(!currentPlayer) {
					console.log(`Player ${username} on ${currentChannelUsername} channel could not be found or created!`)
					return
				}
			}

			if (tags.color !== currentPlayer.color) {
				await updateChatterColor(tags.color, chatterId)
				console.log(`Color updated for ${currentPlayer.username}!`)
			}

			await setTimeLastChatted(currentPlayer.id)

			if(currentPlayer.state === PlayerState.LURKING || currentPlayer.state === PlayerState.OFFLINE ){
				state.players[currentPlayer.id].state = PlayerState.ACTIVE
				await updatePlayerState(db, currentPlayer.id, PlayerState.ACTIVE)
			}

			if (!state.activePlayers.includes(currentPlayer.id)) {
				state.activePlayers.push(currentPlayer.id)
			}

			const detectedCommand = this.commandParser.parse(message, playersInChannel)
			if (detectedCommand) {
				const command = detectedCommand.command
				const args = detectedCommand.args
				const argUsers = detectedCommand.argPlayerUsernames

				const isPlayerNotFishing: boolean = (currentPlayer.state !== PlayerState.FISHING && currentPlayer.state !== PlayerState.CATCHING) 
				|| !state.allFishPlayers[currentChannelUsername] 
				|| !state.allFishPlayers[currentChannelUsername][currentPlayer.username as any]

				if (tags.mod || tags.badges?.broadcaster) { // mod commands
					if (command === CommandTrigger.VOLCANO){
						void this.#client.say(channel, SimpleMessages.VOLCANO)
						await setAllChannelPlayersOffline(currentChannelId)
						return
					} else if (command === CommandTrigger.REVIVE) {
						if (!argUsers || !argUsers[0]) {
							console.log('Error: What chatter should be revived?')
							return
						}
						const targetPlayer = await getPlayerByUsername(argUsers[0], currentChannelId)
						if (!targetPlayer) {
							console.log('Error: What player should be revived?')
							return
						}
						state.players[targetPlayer.id].state = PlayerState.ACTIVE
						await updatePlayerState(db, targetPlayer.id, PlayerState.ACTIVE)
						await setTimeLastChatted(targetPlayer.id)
						state.activePlayers.push(targetPlayer.id)
					}
				}

				switch (command) {
				case CommandTrigger.SEASTARS:
				case CommandTrigger.STARS: {
					void this.#client.say(channel, MessageSeastars(displayName, currentPlayer.points))
					break
				}
				case CommandTrigger.INV_SHORT:
				case CommandTrigger.INVENTORY: {
					const inventoryItems = currentPlayer.inventory.map(itemId => AVATAR_DECORATIONS.find(deco => deco.id === itemId)) as AvatarDecoration[]
					if (!currentPlayer.avatar_decoration) {
						void this.#client.say(channel, MessageInventory(displayName, inventoryItems))
						break
					} else {
						const toSearch = currentPlayer.avatar_decoration
						const equippedIteam = AVATAR_DECORATIONS.find(deco => deco.id === toSearch)
						void this.#client.say(channel, MessageInventory(displayName, inventoryItems, equippedIteam))
						break
					}
				}
				case CommandTrigger.BONK:
				case CommandTrigger.HUG: {
					await handleInteractionCommand(channel, this.#client, currentPlayer, command, argUsers, currentChannelId, isPlayerNotFishing)
					break
				}
				case CommandTrigger.BET: {
					await handleBetCommand(channel, this.#client, currentPlayer, args)
					break
				}
				case CommandTrigger.GIFT: {
					await handleGiftingCommand(channel, this.#client, currentPlayer, args, argUsers, currentChannelUsername)
					break
				}
				case CommandTrigger.SHOP: {
					await displayDailyShop(channel, this.#client, this.chance)
					break
				}
				case CommandTrigger.BUY: {
					await handleBuyingCommand(channel, this.#client, this.chance, currentPlayer, args)
					break
				}
				case CommandTrigger.EQUIP: {
					await handleEquipCommand(channel, this.#client, currentPlayer, args)
					break
				}
				case CommandTrigger.FISH:
				case CommandTrigger.FISH_EXCL: {
					await handleFishCommand(channel, this.#client, currentPlayer, this.chance, isPlayerNotFishing, argUsers, currentChannelId)
					break
				}
				case CommandTrigger.DEBUG_ID: {
					void this.#client.say(channel, `@${currentPlayer.display_name} Your player ID is ${currentPlayer.id}`)
					break
				}
				default: {
					break
				}
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
            p.state,
			p.avatar_decoration,
			p.inventory
          from cv.chatters c
          inner join cv.players p on p.chatter_id = c.id
          where
            p.channel_id = $1
            and p.chatter_id = $2
          `, [channelId, chatterId])
		}

		async function getPlayerByUsername(username: string, channelId: number): Promise<Player | null> {
			const targetChatterId = await getChatterId(username)
			if (!targetChatterId) {
				console.log('Error: Chatter id not found.')
				return null
			}
			const targetPlayer = await getPlayer(channelId, targetChatterId)
			return targetPlayer
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
    
		async function updateChatterColor(newColor: string, chatterId: number): Promise<void> {
			await db.update('cv.chatters', { color: newColor }, { id: chatterId })
		}

		async function handleInteractionCommand(channel: any, client: tmi.Client, currentPlayer: Player, command: CommandTrigger, argUsers: string[], currentChannelId: number, isPlayerNotFishing: boolean) {
			const currentChannelUsername = channel.startsWith('#') ? channel.substring(1) : channel

			if(!isPlayerNotFishing){
				void client.say(channel, SimpleMessages.HUG_BONK_FISHING)
				return
			}

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
				} as FrontendCommand)
			} else {
				state.allFrontendCommands[currentChannelUsername] = [{
					command: command,
					args: [],
					argPlayerUsernames: argUsers,
					playerUsername: currentPlayer.username,
				} as FrontendCommand]
			}
		}

		async function handleBetCommand(channel: any, client: tmi.Client, currentPlayer: Player, args: string[]) {
			const currentChannelUsername = channel.startsWith('#') ? channel.substring(1) : channel
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
				if (Object.values(currentRace.participants).length <= 0) delete raceConstructor.races[currentChannelUsername]
				return
			}
			
			currentRace.participants[currentPlayer.id] = {
				...currentPlayer,
				speed: 0,
			}
			void client.say(channel, MessageInitBet(currentPlayer.display_name, currentBet, raceConstructor.MIN_PARTICIPANTS - Object.values(currentRace.participants).length))
			await deductPointsFromPlayer(db, currentPlayer.points, currentBet, currentPlayer.id)		
		}

		function checkItemMentionedInCommand(item: AvatarDecoration, args: string[]): boolean {
			if (!item || !item.name) return false
			if(args.join(' ').toLowerCase().includes(item.name.toLowerCase())) return true
			else return false
		}

		function determineItemToGift(args: string[], currentPlayer: Player): AvatarDecoration | undefined {
			let inventoryItems = currentPlayer.inventory.map(itemId => AVATAR_DECORATIONS.find(deco => deco.id === itemId)) as AvatarDecoration[]
			const equipped = AVATAR_DECORATIONS.find(deco => deco.id === currentPlayer.avatar_decoration)
			if (equipped) inventoryItems = inventoryItems.concat(equipped)
			const itemMentionedInCommand = inventoryItems.find(item => checkItemMentionedInCommand(item, args))
			return itemMentionedInCommand
		}

		async function handleGiftingStars (args: string[], currentPlayer: Player, client: tmi.Client, channel: any, argUsers: string[], channelName: string, targetPlayer: Player) {
			let pointsToGift = 1
			if (+args[0] >= 2) {
				pointsToGift = +args[0]
			} else if (+args[1] >= 2) {
				pointsToGift = +args[1]
			}

			if (currentPlayer.points < pointsToGift) {
				void client.say(channel, MessageFailedGiftingStars(currentPlayer.display_name, pointsToGift))
				return
			}
			
			await deductPointsFromPlayer(db, currentPlayer.points, pointsToGift, currentPlayer.id)
			await addPointsToPlayer(db, targetPlayer.points, pointsToGift, targetPlayer.id)
			void client.say(channel, MessageGiftedStars(currentPlayer.display_name, targetPlayer.display_name, pointsToGift))
			
		}

		async function handleGiftingCommand(channel: any, client: tmi.Client, currentPlayer: Player, args: string[], argUsers: string[], channelName: string) {
			const itemToGift = determineItemToGift(args, currentPlayer)
			
			let targetPlayer = await determinePlayerObject(argUsers, channelName, currentPlayer.username, false)
			if (!targetPlayer) {
				console.log('Error: No target player for gifting stars could be determined.')
				return
			}

			if (!itemToGift) {
				await handleGiftingStars (args, currentPlayer, client, channel, argUsers, channelName, targetPlayer)
				return
			}

			const willBeDiscarded = Object.values(state.players).every(player => player.inventory.length >= MAX_INVENTORY_ITEMS)
			if (willBeDiscarded) {
				await removeAvatarDecorationFromPlayerInventory(db, itemToGift.id, currentPlayer.id)
				void client.say(channel, MessageNooneGiftingItem(currentPlayer.display_name))
				return
			}

			if (targetPlayer.inventory.length >= MAX_INVENTORY_ITEMS) {
				targetPlayer = await determinePlayerObject(argUsers, channelName, currentPlayer.username, true)
			}

			if(!targetPlayer){
				void client.say(channel, SimpleMessages.EMPTY_MESSAGE)
				return
			}

			if (itemToGift.id === currentPlayer.avatar_decoration) {
				await removeAvatarDecorationFromPlayerEquipment(db, currentPlayer.id)
			} else {
				await removeAvatarDecorationFromPlayerInventory(db, itemToGift.id, currentPlayer.id)
			}

			if (!targetPlayer.avatar_decoration){
				await equipNewAvatarDecorationToPlayer(db, itemToGift.id, targetPlayer.id)
			} else {
				await addAvatarDecorationToPlayerInventory(db, itemToGift.id, targetPlayer.id)
			}

			void client.say(channel, MessageGiftedItem(currentPlayer.display_name, targetPlayer.display_name, itemToGift.name))
		}

		async function determinePlayerObject(argUsers: string[], channelName: string, playerUsername: string, checkInventorySize: boolean): Promise<Player | undefined> {
			const channelPlayersObject = await getPlayersInChannel(db, channelName)
			let players = Object.values(channelPlayersObject).filter(p => p.username !== playerUsername)
			if (checkInventorySize) {
				players = Object.values(players).filter(p => p.inventory.length < MAX_INVENTORY_ITEMS)
			}
			if(!argUsers || !argUsers[0]) {
				return getRandom([...Object.values(players)] as NonEmptyArray<Player>)
			}
			return searchPlayerOfExistingPlayer(argUsers[0], players)
		}

		async function checkDailyItems(channel: any, client: tmi.Client, chance: Chance.Chance) {
			const now = new Date()

			const row = await db._get('SELECT * FROM cv.daily_shop WHERE DATE(created) = DATE($1) ORDER BY created DESC', [JSON.stringify(now)])
			
			let dailyItemIds: AvatarDecorationId[]
			if (row && row.items) {
				dailyItemIds = row.items
			} else {
				dailyItemIds = chance.pickset(Object.values(AvatarDecorationId), DAILY_ITEMS_AMOUNT)
				await db.insert('cv.daily_shop', {
					items: JSON.stringify(dailyItemIds),
					created: JSON.stringify(now),
				})
			}

			const dailyItems = dailyItemIds.map(itemId => AVATAR_DECORATIONS.find(deco => deco.id === itemId)) as AvatarDecoration[]
			if (!dailyItems) {
				void client.say(channel, 'Error: could not identify items for sale!')
				return []
			}

			state.dailyItems = dailyItems
		}

		async function displayDailyShop(channel: any, client: tmi.Client, chance: Chance.Chance) {
			await checkDailyItems(channel, client, chance)
			void client.say(channel, MessageDailyShop(state.dailyItems))
		}

		async function handleBuyingCommand(channel: any, client: tmi.Client, chance: Chance.Chance, currentPlayer: Player, args: string[]) {
			await checkDailyItems(channel, client, chance)

			let itemToBuy: AvatarDecoration | undefined = undefined
			const itemMentionedInCommand = state.dailyItems.find(item => item.name.toLowerCase() === args.join(' ').toLowerCase())

			if(args.length === 0) {
				void client.say(channel, SimpleMessages.INVALID_BUY_REQUEST)
				return
			}

			if (args[0].toLowerCase() === 'a') {
				itemToBuy = state.dailyItems[0]
			} else if (args[0].toLowerCase() === 'b') {
				itemToBuy = state.dailyItems[1]
			} else if (args[0].toLowerCase() === 'c') {
				itemToBuy = state.dailyItems[2]
			} else if (itemMentionedInCommand) {
				itemToBuy = itemMentionedInCommand
			}

			if (!itemToBuy) {
				void client.say(channel, SimpleMessages.INVALID_BUY_REQUEST)
				return
			}

			if (currentPlayer.inventory.length >= MAX_INVENTORY_ITEMS) {
				void client.say(channel, MessageInventoryFull(currentPlayer.display_name))
				return
			}

			if (currentPlayer.inventory.includes(itemToBuy.id)) {
				void client.say(channel, MessageBuyingFailedDuplicate(currentPlayer.display_name, itemToBuy.name))
				return
			}

			if (currentPlayer.points < itemToBuy.price) {
				void client.say(channel, MessageBuyingFailedPrice(currentPlayer.display_name, itemToBuy.price, itemToBuy.name))
				return
			}
			
			if (!currentPlayer.avatar_decoration) {
				await equipNewAvatarDecorationToPlayer(db, itemToBuy.id, currentPlayer.id)
				void client.say(channel, MessageBuyingSuccessEquipped(currentPlayer.display_name, itemToBuy.name))
			} else {
				await addAvatarDecorationToPlayerInventory(db, itemToBuy.id, currentPlayer.id)
				void client.say(channel, MessageBuyingSuccessInventory(currentPlayer.display_name, itemToBuy.name))
			}
			await deductPointsFromPlayer(db, currentPlayer.points, itemToBuy.price, currentPlayer.id)
		}
		
		async function handleEquipCommand(channel: any, client: tmi.Client, currentPlayer: Player, args: string[]) {
			let itemToEquip: AvatarDecoration | undefined = undefined

			if (currentPlayer.inventory.length === 0) {
				void client.say(channel, MessageEquipFailedEmptyInventory(currentPlayer.display_name))
				return
			}

			const inventoryItems = currentPlayer.inventory.map(itemId => AVATAR_DECORATIONS.find(deco => deco.id === itemId)) as AvatarDecoration[]
			const itemMentionedInCommand = inventoryItems.find(item => item.name.toLowerCase() === args.join(' ').toLowerCase())

			if(args.length === 0) {
				void client.say(channel, SimpleMessages.INVALID_EQUIP_REQUEST)
				return
			}

			const indexMentionedInCommand = +args[0]
			let correctIndex: number | undefined = undefined
			if (indexMentionedInCommand) {
				correctIndex = indexMentionedInCommand - 1
			}

			if (correctIndex !== undefined && inventoryItems[correctIndex]) {
				itemToEquip = inventoryItems[correctIndex]
			} else if (itemMentionedInCommand) {
				itemToEquip = itemMentionedInCommand
			}

			if (!itemToEquip) {
				void client.say(channel, SimpleMessages.INVALID_EQUIP_REQUEST)
				return
			}

			const currentAvatarDecoration = currentPlayer.avatar_decoration

			await equipAvatarDecorationFromPlayerInventory(db, currentAvatarDecoration, itemToEquip.id, currentPlayer.id)
			void client.say(channel, MessageEquipSuccess(currentPlayer.display_name))
		}		

		async function handleFishCommand(channel: any, client: tmi.Client, currentPlayer: Player, chance: Chance.Chance, isPlayerNotFishing: boolean, argUsers: string[], currentChannelId: number) {
			const currentChannelUsername = channel.startsWith('#') ? channel.substring(1) : channel

			if(currentPlayer.state === PlayerState.RACING) { // not possible
				void client.say(channel, MessageFishFailRace(currentPlayer.display_name))
				return
			}

			if(Object.values(state.allFishPlayers).length >= MAX_FISH_PLAYERS && isPlayerNotFishing) {
				void client.say(channel, SimpleMessages.FISHING_FULL)
				return
			}

			if(argUsers && argUsers[0] && isPlayerNotFishing) {
				const fishingPlayer = await getPlayerByUsername(argUsers[0], currentChannelId)
				if (fishingPlayer && fishingPlayer.state === PlayerState.CATCHING) {
					state.allFishPlayers[currentChannelUsername][fishingPlayer.username as any].hasCaught = true
					console.log('setting to hasCaught')
					await pickRewardForFishing(chance, client, currentPlayer, currentChannelUsername)
					return
				}
			}

			if (isPlayerNotFishing) {
				await initiateFishingForPlayer(currentPlayer, currentChannelUsername, chance)
				return
			}
			
			if (currentPlayer.state === PlayerState.FISHING) { // catch too early
				state.players[currentPlayer.id].state = PlayerState.ACTIVE
				await updatePlayerState(db, currentPlayer.id, PlayerState.ACTIVE)

				if (!state.allFishPlayers[currentChannelUsername]) return
				delete state.allFishPlayers[currentChannelUsername][currentPlayer.username as any]
				
				void client.say(channel, MessageFishTooEarly(currentPlayer.display_name))
				return
			} else if (currentPlayer.state === PlayerState.CATCHING) { // catch the fish
				state.allFishPlayers[currentChannelUsername][currentPlayer.username as any].hasCaught = true
				console.log('setting to hasCaught')
				await pickRewardForFishing(chance, client, currentPlayer, currentChannelUsername)
				return
				// todo: how do i communicate with frontend that fish was caught?
			}
		}

		async function initiateFishingForPlayer (currentPlayer: Player, currentChannelUsername: string, chance: Chance.Chance) {
			state.players[currentPlayer.id].state = PlayerState.FISHING
			await updatePlayerState(db, currentPlayer.id, PlayerState.FISHING)

			if (state.allFishPlayers[currentChannelUsername]) { // TODO: maybe i can create a util function for that kind of situation?
				state.allFishPlayers[currentChannelUsername][currentPlayer.username] = {
					...currentPlayer,
					state: PlayerState.FISHING,
					catchStartDate: 0,
					fishWaitTime: chance.floating({ min: MIN_FISH_WAIT_TIME_MS, max: MAX_FISH_WAIT_TIME_MS, fixed: FISH_WAIT_TIME_DECIMALS }),
					hasCaught: false,
				}
			} else {
				state.allFishPlayers[currentChannelUsername] = {
					[currentPlayer.username] : {
						...currentPlayer,
						state: PlayerState.FISHING,
						catchStartDate: 0,
						fishWaitTime: chance.floating({ min: MIN_FISH_WAIT_TIME_MS, max: MAX_FISH_WAIT_TIME_MS, fixed: FISH_WAIT_TIME_DECIMALS }),
						hasCaught: false,
					}}
			}
		}

		async function pickRewardForFishing (chance: Chance.Chance, client: tmi.Client, caughtPlayer: Player, channelUsername: string) {
			const channel = `#${channelUsername}`

			const caughtPoints = chance.weighted([
				0, 
				chance.integer({ min: 1, max: 9 }) * 5, 
				chance.integer({ min: 12, max: 20 }) * 10,
			], [
				12, 
				78, 
				10,
			])

			if (caughtPoints > 0) await addPointsToPlayer(db, state.players[caughtPlayer.id].points, caughtPoints, caughtPlayer.id)
			
			
			if (caughtPoints === 0) {
				await client.say(channel, MessageFishCatchFailed(caughtPlayer.display_name, caughtPoints))
			}
			if (caughtPoints >= 1 && caughtPoints < 99) {
				await client.say(channel, MessageFishCatchStandard(caughtPlayer.display_name, caughtPoints))
			}
			if (caughtPoints >= 99) {
				await client.say(channel, MessageFishCatchTreasure(caughtPlayer.display_name, caughtPoints))
			}
		}
	}

	async sayRaceTooFewParticipantsMessage(channelName: string, participantsAmount: number) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageRaceTooFewParticipants(participantsAmount))
	}

	async sayRaceWarningMessage(channelName: string, morePlayersNeeded: number) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageWarningRaceStart(morePlayersNeeded))
	}

	async sayRaceStartMessage(channelName: string) {
		const channel = `#${channelName}`
		await this.#client.say(channel, SimpleMessages.RACE_START)
	}

	async sayRaceFinishMessage(channelName: string, winnerName: string, pointsAdded: number, pointsDeducted: number) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageRaceFinish(winnerName, pointsAdded, pointsDeducted))
	}

	async sayFishCatchLateMessage(channelName: string, fishPlayerName: string) {
		const channel = `#${channelName}`
		await this.#client.say(channel, MessageFishCatchLate(fishPlayerName))
	}
}