import Db from './Db'
import { Player, Players, PlayerState, WidgetName } from '../../common/src/Types'

export async function updatePlayerState(db: Db, playerId: number, playerState: PlayerState): Promise<void> {
	console.log(`setting player ${playerState}: ${playerId}`)
	await db.update('cv.players', { state: playerState }, { id: playerId })    
}

export async function updateManyPlayerState(db: Db, playerIds: number[], state: PlayerState): Promise<void> {
	await db.update('cv.players', { state: state }, { id: { '$in': playerIds } })    
}

export async function getChannelUsernameByCookie(db: Db, cookie: string): Promise<string|null> {
	const row = await db._get(`
    select
        cv.user_sessions.channel_username
    from
        cv.user_sessions
    where
        cv.user_sessions.session_token = $1
    `, [cookie])
	console.log(JSON.stringify(row))
	if (row && row.channel_username) {
		return row.channel_username
	} else {
		return null
	}
}

export async function getWidgetId(db: Db, channelUsername: string, widgetName: WidgetName): Promise<string> {
	const row = await db._get(`
    select
        cv.channels.${widgetName}_widget_id
	as
		widget_id
    from
        cv.channels
    where
        cv.channels.channel_username = $1
    `, [channelUsername])
	return row.widget_id
}

export async function getChannelId(db: Db, channelUsername: string): Promise<number|null> {
	const row = await db._get(`
    select
        cv.channels.id
    from
        cv.channels
    where
        cv.channels.channel_username = $1
    `, [channelUsername])
	return row.id
}

export function searchUsernameOfExistingPlayer(query: string, players: Players): string | undefined {
	if (query.startsWith('@')) {
		query = query.replace('@', '')
	}
	for (const [_playerId, userTags] of Object.entries(players)) {
		if (userTags.username === query || userTags.display_name === query){
			return userTags.username
		}
	}
}

export function searchPlayerOfExistingPlayer(query: string, players: Players): Player | undefined {
	if (query.startsWith('@')) {
		query = query.replace('@', '')
	}
	for (const [_playerId, userTags] of Object.entries(players)) {
		if (userTags.username === query || userTags.display_name === query){
			return userTags
		}
	}
}