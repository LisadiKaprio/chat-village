import Db from './Db'
import { EmoteReceived,  MessagesToChannel, Chatter, Chatters, Player, Players, PlayerState, OFFLINE_MINUTES, MINUTE, FrontendCommandsToChannel, FishPlayersToChannel, FISH_WAIT_MINUTES, FishPlayer } from '../../common/src/Types'
import { AvatarDecoration, AvatarDecorationId } from './Visuals'
import { updatePlayerState } from './functions'
import { toNamespacedPath } from 'path'
import Twitch from './Twitch'

async function loadChatters(
	db: Db,
): Promise<Chatters> {
	const chatters: Chatters = {}

	const dbChatters = await db._getMany(`
  select
    cv.chatters.id as chatter_id,
    cv.chatters.username,
    cv.chatters.display_name,
    cv.chatters.color,
    cv.chatters.skin
  from
    cv.chatters
  `)
	for (const chatter of dbChatters) {
		const user = chatter as Chatter
		chatters[user.username] = user
	}
	return chatters
}

async function loadAndProcessPlayers(
	db: Db,
	state: State,
): Promise<Players> {
	const players: Players = {}

	const dbPlayers = await db._getMany(`
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
    p.last_chatted,
	p.avatar_decoration,
	p.inventory
  from
    cv.players p
    inner join cv.chatters c on c.id = p.chatter_id
    inner join cv.channels on cv.channels.id = p.channel_id
  `)
	for (const player of dbPlayers) {
		const user = player as Player
		players[user.id] = user

		const currentTime = new Date().getTime()
		const created = new Date(user.last_chatted).getTime()
		if ((currentTime - created > OFFLINE_MINUTES * MINUTE) && user.state === PlayerState.ACTIVE) {
			await state.setPlayerOffline(db, user.id, user.username)
		}
	}
	return players
}

export async function getPlayersInChannel(
	db: Db,
	channelUsername: string,
): Promise<Players> {
	const players: Players = {}

	const dbPlayers = await db._getMany(`
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
    p.last_chatted,
	p.avatar_decoration,
	p.inventory
  from
    cv.players p
    inner join cv.chatters c on c.id = p.chatter_id
    inner join cv.channels on cv.channels.id = p.channel_id
  where
    cv.channels.channel_username = $1
  `, [channelUsername])
	for (const player of dbPlayers) {
		const user = player as Player
		players[user.id] = user
	}
	return players
}

export default class State {
	public chatters: Chatters = {}
	public players: Players = {}
	public activePlayers: number[] = []
	public newEmotes: EmoteReceived[] = []
	public allNewMessages: MessagesToChannel = {}
	public allFrontendCommands: FrontendCommandsToChannel = {}
	public allFishPlayers: FishPlayersToChannel = {}
	public dailyItems: AvatarDecoration[] = []

	async loadChattersAndPlayers (db: Db) {
		this.chatters = await loadChatters(db)
		this.players = await loadAndProcessPlayers(db, this)
	}

	async clearFrontendRelevantData (db: Db, channelUsername: string) {
		this.newEmotes = this.newEmotes.filter(emote => emote.channel !== channelUsername)
		this.allNewMessages[channelUsername] = []
		this.allFrontendCommands[channelUsername] = []
		
		await this.clearFishPlayersWhoCaught(db, channelUsername)
	}

	async clearFishPlayersWhoCaught (db: Db, channelUsername: string) { 
		if (!this.allFishPlayers[channelUsername]) return
		const caughtPlayers = Object.values(this.allFishPlayers[channelUsername]).filter(fishPlayer => fishPlayer.hasCaught === true)
		caughtPlayers.forEach(async (fishPlayer) => {
			// TODO: wait a bit before doing so?..
			await this.stopFishing(db, fishPlayer.username, channelUsername)
		})
	}

	async stopFishing(db: Db, fishPlayerUsername: string, channelUsername: string) {
		const currentChannelUsername = channelUsername.startsWith('#') ? channelUsername.substring(1) : channelUsername
		console.log(currentChannelUsername)

		if (!this.allFishPlayers[currentChannelUsername]) {
			console.log('fish players not found for channel ' + currentChannelUsername)
			return
		}

		const playerId = this.allFishPlayers[currentChannelUsername][fishPlayerUsername].id
		delete this.allFishPlayers[currentChannelUsername][fishPlayerUsername]

		this.players[playerId].state = PlayerState.ACTIVE
		await updatePlayerState(db, playerId, PlayerState.ACTIVE)
	}

	async refresh (
		db: Db,
		_twitch: Twitch,
	): Promise<void> {
		await this.loadChattersAndPlayers(db)

		for (const [channelUsername, _channelFishPlayers] of Object.entries(this.allFishPlayers)) {
			for (const [name, _fishPlayer] of Object.entries(this.allFishPlayers[channelUsername])) {
				if (!this.allFishPlayers[channelUsername][name].catchStartDate) break
				const timePassedSinceStartCatch = Date.now() - this.allFishPlayers[channelUsername][name].catchStartDate
				if (timePassedSinceStartCatch >= FISH_WAIT_MINUTES * MINUTE) {
					// const fishPlayerDisplayName = fishPlayer.display_name
					await this.stopFishing(db, name, channelUsername)
					// await twitch.sayFishCatchLateMessage(channelUsername, fishPlayerDisplayName)
				}
			}
		}
	}
  
	async setPlayerOffline(
		db: Db,
		playerId: number,
		playerUsername: string,
	): Promise<void> {
		console.log(`setting player offline: ${playerId}`)
		await db.update('cv.players', { state: PlayerState.OFFLINE }, { id: playerId })
		this.activePlayers = this.activePlayers.filter(pl => pl !== playerId)
		this.newEmotes = this.newEmotes.filter(em => em.name !== playerUsername)
	}
}
