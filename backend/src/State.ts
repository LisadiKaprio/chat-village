import Db from './Db'
import { EmoteReceived,  MessagesToChannel, Chatter, Chatters, Player, Players } from '../../common/src/Types'

async function loadChatters(
  db: Db,
): Promise<Chatters> {
  const chatters: Chatters = {}

  const dbChatters = await db._getMany(`
  select
    cv.chatters.id as chatter_id,
    cv.chatters.username,
    cv.chatters.display_name,
    cv.chatters.color
  from
    cv.chatters
  `)
  for (const chatter of dbChatters) {
    const user = chatter as Chatter
    chatters[user.username] = user
  }
  return chatters
}

async function loadPlayers(
  db: Db,
): Promise<Players> {
  const players: Players = {}

  const dbPlayers = await db._getMany(`
  select
    c.username,
    c.display_name,
    c.color,
    p.id as id,
    p.chatter_id,
    p.channel_id,
    p.points,
    p.state,
    p.unhandled_commands
  from
    cv.players p
    inner join cv.chatters c on c.id = p.chatter_id
    inner join cv.channels on cv.channels.id = p.channel_id
  `)
  for (const player of dbPlayers) {
    const user = player as Player
    players[user.id] = user
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
    p.id as id,
    p.chatter_id,
    p.channel_id,
    p.points,
    p.state,
    p.unhandled_commands
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

export async function clearUnhandledCommands(
  db: Db,
  channelId: number,
): Promise<void> {
  db.update('cv.players', { unhandled_commands: JSON.stringify([]) }, {channel_id: channelId})
}

export default class State {
  public chatters: Chatters = {}
  public players: Players = {}
  public activePlayers: number[] = []
  public newEmotes: EmoteReceived[] = []
  public allNewMessages: MessagesToChannel = {}

  async init (
    db: Db,
  ) {
    this.chatters = await loadChatters(db)
    this.players = await loadPlayers(db)
  }

  async clearFrontendRelevantData (
    db: Db,
    channelUsername: string,
    channelId: number,
  ) {
    await clearUnhandledCommands(db, channelId)
    this.newEmotes = this.newEmotes.filter(emote => emote.channel !== channelUsername)
    this.allNewMessages[channelUsername] = []
    await this.refresh(db)
  }

  async refresh (
    db: Db,
  ) {
    this.chatters = await loadChatters(db)
    this.players = await loadPlayers(db)
  }
}
