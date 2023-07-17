import { BackendBoatAvatar, Players, PlayerState, RaceStatus, UserInfo, WebsocketMessageType, WidgetName } from '../../common/src/Types'
import Db from './Db'
import { getChannelId, getChannelUsernameByCookie, getWidgetId, updatePlayerState } from './functions'
import RaceConstructor from './Race'
import State from './State'
import WebSocket, { RawData, WebSocketServer } from 'ws'
import Twitch from './Twitch'
import { Chance } from 'chance'
import express from 'express'
import cookieParser from 'cookie-parser'

const COOKIE_LIFETIME_MS = 356 * 24 * 60 * 60 * 1000

async function createChannelEntryForUser (db: Db, _chance: Chance.Chance, channelUsername: string, channelDisplayName: string) {
	await db.insert('cv.channels', { channel_username: channelUsername, channel_display_name: channelDisplayName })
}

async function createSessionForUser (db: Db, chance: Chance.Chance, channelUsername: string): Promise<string> {
	const sessionId = chance.string({ length: 20, casing: 'lower', alpha: true, numeric: true })
	
	await db.insert('cv.user_sessions', { channel_username: channelUsername, session_token: sessionId })
	
	return sessionId
}

async function getAccessTokenByCode (code: string, clientId: string, clientSecret: string, clientRedirectUri: string) {
	const queryString = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		code,
		grant_type: 'authorization_code',
		redirect_uri: clientRedirectUri,
	})
	const tokenResponse: null|Response = await fetch('https://id.twitch.tv/oauth2/token?' + queryString , {
		method: 'POST',
	})
	const tokenData = await tokenResponse.json()
	if (!tokenData) return 'no_access_token'
	const accessToken = tokenData.access_token
	return accessToken
}

async function getUserByAccessToken (accessToken: string, clientId: string) {
	const usersResponse = await fetch('https://api.twitch.tv/helix/users', {
		method: 'GET',
		headers: {
			Authorization: 'Bearer ' + accessToken,
			'Client-Id': clientId,
		},
	})
	const usersData: any = await usersResponse.json()
	if (!usersData) return 'no_user_data'
	const user = await usersData.data[0]
	return user
}

function buildUsersInfo(channelName: string, channelId: number, state: State) {
	const filteredPlayers: Players = {}
	for (const id of state.activePlayers) {
		if (state.players[id]) {
			if (state.players[id].channel_id === channelId) {
				filteredPlayers[id] = state.players[id]
			}
		}
	}

	const filteredEmotes: any = []
	for (const emote of state.newEmotes) {
		if (emote.channel === channelName) {
			filteredEmotes.push(emote)
		}
	}

	const allFishPlayers = state.allFishPlayers[channelName] ?? []

	return {
		users: filteredPlayers,
		fishPlayers: allFishPlayers,
		emotes: filteredEmotes,
		messages: state.allNewMessages[channelName],
		commands: state.allFrontendCommands[channelName],
	} as UserInfo
}

function buildRaceInfo(raceConstructor: RaceConstructor, channelName: string) {
	if(!raceConstructor.races[channelName]) {
		return {
			status: RaceStatus.OFF,
			participants: {},
		}
	} else {
		return{
			bet: raceConstructor.races[channelName].currentBet,
			status: raceConstructor.races[channelName].status,
			participants: raceConstructor.races[channelName].participants,
		}
	}
}


export default class Webserver {
	chance = new Chance()
	channelSockets: Record<string, WebSocket[]> = {}
	ws_host: string = ''

	notify(channel: string, type: string, data: any) {
		for (const socket of this.channelSockets[channel] || []) {
			this.notifyOne(socket, type, data)
		}
	}

	notifyOne(socket: WebSocket, type: string, data: any) {
		socket.send(JSON.stringify({ type, data }))
	}

	init(
		db: Db,
		state: State,
		raceConstructor: RaceConstructor,
		twitch: Twitch,
	) {
		// COMMUNICATION WITH THE FRONTEND
		const app = express()
		app.use(cookieParser())
		const apiRouter = express.Router()
		const portExpress = 2501

		const portWebsocket = 2502
		const server = new WebSocketServer({
			host: this.ws_host,
			port: portWebsocket,
		})
		server.on('connection', async (socket: WebSocket, req: any) => {
			const channelName = req.url.startsWith('/') ? req.url.substring(1).toLowerCase() : req.url.toLowerCase()
			const channelId = await getChannelId(db, channelName)

			// TODO: on disconnect remove the socket from the array
			this.channelSockets[channelName] = this.channelSockets[channelName] || []
			this.channelSockets[channelName].push(socket)

			console.log(`${this.channelSockets[channelName].length} widgets are connected`)

			if(!channelId) {
				console.log('No channel id found! Fetching not possible.')
				socket.close()
				return
			}

			let timeoutUsersInfo: NodeJS.Timeout | null = null
			let timeoutRaceInfo: NodeJS.Timeout | null = null

			const sendUsersInfo = async () => {
				const usersInfo = buildUsersInfo(channelName, channelId, state)
				this.notifyOne(socket, WebsocketMessageType.USER_INFO, usersInfo)
				await state.clearFrontendRelevantData(db, channelName)
				timeoutUsersInfo = setTimeout(sendUsersInfo, 2000)
			}
			await sendUsersInfo()

			const sendRaceInfo = () => {
				const raceInfo = buildRaceInfo(raceConstructor, channelName)
				this.notifyOne(socket, WebsocketMessageType.BACKEND_RACE_INFO, raceInfo)
				timeoutRaceInfo = setTimeout(sendRaceInfo, 500)
			}
			sendRaceInfo()
      
			socket.on('message', async (rawData: RawData, _isBinary: boolean) => {
				const { type, data } = JSON.parse(`${rawData}`)
				if (type === WebsocketMessageType.FRONTEND_RACE_INFO && raceConstructor.races[channelName] && raceConstructor.races[channelName].status !== RaceStatus.OFF ) {
					raceConstructor.races[channelName].status = RaceStatus.OFF
					const { boatAvatars }: { boatAvatars: BackendBoatAvatar[] } = data
					await raceConstructor.handleFinish(db, state, channelName, boatAvatars, twitch) 
				} else if (type === WebsocketMessageType.FRONTEND_FISH_CATCHING_INFO) {
					const { avatarIds }: { avatarIds: number[] } = data
					for (const id of avatarIds) {
						if (state.players[id].state !== PlayerState.FISHING) break
						
						const fishPlayer = Object.values(state.allFishPlayers[channelName]).find(player => player.id === id)
						if (fishPlayer) fishPlayer.catchStartDate = Date.now()

						state.players[id].state = PlayerState.CATCHING
						await updatePlayerState(db, id, PlayerState.CATCHING)
					}
				}
			})

			socket.on('close', () => {
				if (timeoutUsersInfo) clearTimeout(timeoutUsersInfo)
				if (timeoutRaceInfo) clearTimeout(timeoutRaceInfo)
				this.channelSockets[channelName] = this.channelSockets[channelName].filter(s => s !== socket)
				console.log(`${this.channelSockets[channelName].length} widgets are connected`)
			})
		})

		app.get('/api/verify-widget-id/:widgetName/:channel/:id', async (req: any, res: any) => {
			const channelWidgetId = await getWidgetId(db, req.params.channel, req.params.widgetName)
			const isIdCorrect = req.params.id === channelWidgetId
			if (isIdCorrect) {
				res.status(200).send()
			} else {
				res.status(404).send()
			}
		})

		app.get('/twitch/redirect_uri', async (req: any, res: any) => {
			const clientId = process.env.CLIENT_ID ?? ''
			const clientSecret = process.env.CLIENT_SECRET ?? ''
			const clientRedirectUri = process.env.CLIENT_REDIRECT_URI ?? ''
			if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.CLIENT_REDIRECT_URI) {
				console.log('LOGIN WARNING: client id, client secret or client redirect uri is missing from the env file')
				return
			}

			const code = req.query.code || ''
			const accessToken = await getAccessTokenByCode(code, clientId, clientSecret, clientRedirectUri)
			const user = await getUserByAccessToken(accessToken, clientId)
		
			const userLogin = user.login
			const userDisplayName = user.display_name
			const sessionId = await createSessionForUser(db, this.chance, userLogin)

			const channelEntryId = await getChannelId(db, userLogin)
			console.log(`Channel with id ${channelEntryId} and username ${userLogin} is attempting to log in...`)
			if (!channelEntryId) await createChannelEntryForUser(db, this.chance, userLogin, userDisplayName)
			
			// add cookie to the user response
			const cookieName = 'auth'
			res.cookie(cookieName, sessionId, { maxAge: COOKIE_LIFETIME_MS, httpOnly: true })
		
			// redirect user to the startpage
			res.redirect('/settings')
		})

		app.get('/api/cookie', async (req: any, res: any) => {
			const authCookie = req.cookies ? req.cookies['auth'] || null : null
			const channelUsername = await getChannelUsernameByCookie(db, authCookie)
			if (!channelUsername) {
				res.status(401).send()
			} else {
				const channelWalkWidgetId = await getWidgetId(db, channelUsername, WidgetName.WALK) 
				const channelEventWidgetId = await getWidgetId(db, channelUsername, WidgetName.EVENT) 
				const channelFishWidgetId = await getWidgetId(db, channelUsername, WidgetName.FISH)
				res.send({
					channelUsername: channelUsername,
					walkWidgetId: channelWalkWidgetId,
					eventWidgetId: channelEventWidgetId,
					fishWidgetId: channelFishWidgetId,
				})
			}
		})

		app.listen(portExpress, () => {
			console.log(`Web-Avatars listening on http://localhost:${portExpress}`)
		})

		if(process.env.PUB_DIR){
			app.use('/', express.static(process.env.PUB_DIR))
			app.all('*', (req: any, res) => {
				if(!process.env.INDEX_HTML) return
				res.sendFile(process.env.INDEX_HTML)
			})
		} else {
			console.log(`PUB_DIR for frontend build needed in env file`)
			app.use('/', apiRouter)
		}
	}
}
