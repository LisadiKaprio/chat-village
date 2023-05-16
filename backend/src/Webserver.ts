import { Players } from '../../common/src/Types'
import Db from './Db'
import { getChannelId } from './functions'
import State from './State'

const express = require('express')

export default class Webserver {
  init(
    db: Db,
    state: State,
  ) {
    // COMMUNICATION WITH THE FRONTEND
    const app = express()
    const port = 2501
    // frontend
    app.use(express.static('../frontend/dist'))

    // localhost:2501

    // dbg page
    app.get('/dbg', (_req: any, res: any) => {
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

    // send over the info inside the users variable
    app.get('/users/:channel', async (req: any, res: any) => {
      // need to keep the ServerUser interface in frontend synced with this right here
      const filteredPlayers: Players = {}
      for (const name of state.activePlayers) {
        if (state.players[name].channel_id === req.params.channel) {
          filteredPlayers[name] = state.players[name]
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
      
      const channelId = await getChannelId(db, req.params.channel)
      if(channelId){
        state.clearFrontendRelevantData(db, req.params.channel, channelId)
      } else {
        console.log('No channel id found! State could not be clear frontend data! D:')
      }
    })

    // (:
    app.listen(port, () => {
      console.log(`Web-Avatars listening on http://localhost:${port}`)
    })
  }
}
