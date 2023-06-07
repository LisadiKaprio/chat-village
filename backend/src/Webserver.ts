import { Players, RaceStatus } from '../../common/src/Types'
import Db from './Db'
import { getChannelId } from './functions'
import RaceConstructor from './Race'
import State from './State'
import WebSocket, { WebSocketServer } from 'ws'
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

  return {
    users: filteredPlayers,
    emotes: filteredEmotes,
    messages: state.allNewMessages[channelName],
    commands: state.allFrontendCommands[channelName],
  }
}


export default class Webserver {
  channelSockets: Record<string, WebSocket[]> = {}

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
  ) {
    // COMMUNICATION WITH THE FRONTEND
    const app = express()
    const apiRouter = express.Router()
    const portExpress = 2501

    const portWebsocket = 2502
    const server = new WebSocketServer({
      host: 'localhost',
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

      let timeout: NodeJS.Timeout | null = null
      const sendUsersInfo = () => {
        const usersInfo = buildUsersInfo(channelName, channelId, state)
        this.notifyOne(socket, 'users_info', usersInfo)
        state.clearFrontendRelevantData(channelName)
        timeout = setTimeout(sendUsersInfo, 2000)
      }
      sendUsersInfo()

      socket.on('close', () => {
        if (timeout) {
          clearTimeout(timeout)
        }
        this.channelSockets[channelName] = this.channelSockets[channelName].filter(s => s !== socket)
        console.log(`${this.channelSockets[channelName].length} widgets are connected`)
      })
    })

    apiRouter.get('/race/:channel', async (req: any, res: any) => {
      if(!raceConstructor.races[req.params.channel]) {
        console.log(raceConstructor.races)
        res.send({
          status: RaceStatus.OFF,
          participants: {},
        })
      } else {
        res.send({
          status: raceConstructor.races[req.params.channel].status,
          participants: raceConstructor.races[req.params.channel].participants,
        })
      }
    })

    app.listen(portExpress, () => {
      console.log(`Web-Avatars listening on http://localhost:${portExpress}`)
    })

    app.use('/api', apiRouter)
  }
}
