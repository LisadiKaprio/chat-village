import { BackendBoatAvatar, Players, PlayerState, RaceStatus, UserInfo, WebsocketMessageType } from '../../common/src/Types'
import Db from './Db'
import { getChannelId, updatePlayerState } from './functions'
import RaceConstructor from './Race'
import State from './State'
import WebSocket, { RawData, WebSocketServer } from 'ws'
import Twitch from './Twitch'
const express = require('express')

function buildUsersInfo(
	channelName: string,
	channelId: number,
	state: State,
) {
	// why doesn't this work??? T_T

	// const filteredPlayers = await getPlayersInChannel(db, channelName)
	// console.log('filteredPlayers is ' + JSON.stringify(filteredPlayers))

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
	// console.log(JSON.stringify(state.allFishPlayers[channelName]))

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

			const sendUsersInfo = () => {
				const usersInfo = buildUsersInfo(channelName, channelId, state)
				this.notifyOne(socket, WebsocketMessageType.USER_INFO, usersInfo)
				state.clearFrontendRelevantData(channelName)
				timeoutUsersInfo = setTimeout(sendUsersInfo, 2000)
			}
			sendUsersInfo()

			const sendRaceInfo = () => {
				const raceInfo = buildRaceInfo(raceConstructor, channelName)
				this.notifyOne(socket, WebsocketMessageType.BACKEND_RACE_INFO, raceInfo)
				timeoutRaceInfo = setTimeout(sendRaceInfo, 500)
			}
			sendRaceInfo()
      
			socket.on('message', async (rawData: RawData, _isBinary: boolean) => {
				const { type, data } = JSON.parse(`${rawData}`)
				if (type === WebsocketMessageType.FRONTEND_RACE_INFO && raceConstructor.races[channelName] && raceConstructor.races[channelName].status !== RaceStatus.OFF ) {
					console.log('received frontend race info')
					raceConstructor.races[channelName].status = RaceStatus.OFF
					const { boatAvatars }: { boatAvatars: BackendBoatAvatar[] } = data
					await raceConstructor.handleFinish(db, state, channelName, boatAvatars, twitch) 
				} else if (type === WebsocketMessageType.FRONTEND_FISH_CATCHING_INFO) {
					const { avatarIds }: { avatarIds: number[] } = data
					for (const id of avatarIds) {
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

		app.listen(portExpress, () => {
			console.log(`Web-Avatars listening on http://localhost:${portExpress}`)
		})

		app.use('/api', apiRouter)
	}
}
