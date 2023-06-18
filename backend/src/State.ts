import Db from './Db'
import { EmoteReceived,  MessagesToChannel, Chatter, Chatters, Player, Players, PlayerState, OFFLINE_MINUTES, MINUTE, FrontendCommandsToChannel } from '../../common/src/Types'

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

	async init (
		db: Db,
	) {
		await this.refresh(db)
	}

	clearFrontendRelevantData (channelUsername: string) {
		this.newEmotes = this.newEmotes.filter(emote => emote.channel !== channelUsername)
		this.allNewMessages[channelUsername] = []
		this.allFrontendCommands[channelUsername] = []
	}

	async refresh (
		db: Db,
	): Promise<void> {
		this.chatters = await loadChatters(db)
		this.players = await loadAndProcessPlayers(db, this)
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
