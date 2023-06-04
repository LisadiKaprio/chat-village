import { Players, RaceStatus } from '../../common/src/Types'
import Db from './Db'
import { getChannelId } from './functions'
import RaceConstructor from './Race'
import State from './State'
import { WebSocketServer } from 'ws'
const express = require('express')

export default class Webserver {
  init(
    db: Db,
    state: State,
    raceConstructor: RaceConstructor,
  ) {
    // COMMUNICATION WITH THE FRONTEND
    const app = express()
    const apiRouter = express.Router()
    const portExpress = 2501

    // const portWebsocket = 2502
    // const server = new WebSocketServer({
    //   host: 'localhost',
    //   port: portWebsocket,
    // })
    // server.on('connection', (socket: any, _request: any) => {
    //     setInterval(() => {
    //         socket.send('hi')
    //     }, 5000)
    // })

    apiRouter.get('/dbg', (_req: any, res: any) => {
      const filteredUsers: any = {}
      for (const name of state.activePlayers) {
        filteredUsers[name] = state.players[name]
      }
      res.send(
        JSON.stringify({
          players: state.players,
          active: state.activePlayers,
          filtered: filteredUsers,
        }),
      )
    })

    apiRouter.get('/users/:channel', async (req: any, res: any) => {
      const channelId = await getChannelId(db, req.params.channel)
      if(!channelId) {
        console.log('No channel id found! Fetching not possible.')
        return
      }
      const filteredPlayers: Players = {}
      for (const id of state.activePlayers) {
        if (state.players[id].channel_id === channelId) {
          filteredPlayers[id] = state.players[id]
        }
      }

      const filteredEmotes: any = []
      for (const emote of state.newEmotes) {
        if (emote.channel === req.params.channel) {
          filteredEmotes.push(emote)
        }
      }

      res.send({
        users: filteredPlayers,
        emotes: filteredEmotes,
        messages: state.allNewMessages[req.params.channel],
      })

      state.clearFrontendRelevantData(db, req.params.channel, channelId)
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
