import { Players, RaceParticipants } from '../../common/src/Types'
import Db from './Db'
import { getChannelId } from './functions'
import RaceConstructor from './Race'
import State from './State'

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
    const port = 2501
    
    // frontend
    //app.use(express.static('../frontend/dist'))

    // localhost:2501

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
        res.status(400).send({ error: 'no race' })
        return
      }

      res.send({
        participants: raceConstructor.races[req.params.channel].participants,
      })
    })

    // (:
    app.listen(port, () => {
      console.log(`Web-Avatars listening on http://localhost:${port}`)
    })

    app.use('/api', apiRouter)
  }
}
