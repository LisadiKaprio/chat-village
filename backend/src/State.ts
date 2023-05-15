import Db from './Db'
import { Emote, Chatters, Player, Players, MessagesToChannel } from './Types'

async function loadChatters(
  db: Db,
): Promise<Chatters> {
  const chatters: Chatters = {}

  const dbChatters = await db._getMany(`
  select
    cv.chatters.id as chatter_id,
    cv.chatters.username as username,
    cv.chatters.displayname as displayName,
    cv.chatters.color as color
  from
    cv.chatters
  `)
  for (const chatter of dbChatters) {
    const user = JSON.parse(chatter) as Player // is json parse needed here?
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
    cv.chatters.id as chatter_id,
    cv.chatters.username as username,
    cv.chatters.displayname as displayname,
    cv.chatters.color as color,
    cv.players.points as points
  from
    cv.players
    inner join cv.chatters on cv.chatters.id = cv.players.chatter_id
    inner join cv.channels on cv.channels.id = cv.players.channel_id
  `)
  for (const player of dbPlayers) {
    const user = JSON.parse(player) as Player // is json parse needed here?
    players[user.username] = user
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
    cv.chatters.username as username,
    cv.chatters.displayname as displayname,
    cv.chatters.color as color,
    cv.players.points as points
  from
    cv.players
    inner join cv.chatters on cv.chatters.id = cv.players.chatter_id
    inner join cv.channels on cv.channels.id = cv.players.channel_id
  where
    cv.channels.username = ${channelUsername}
  `)
  for (const player of dbPlayers) {
    const user = JSON.parse(player) as Player // is json parse needed here?
    players[user.username] = user
  }
  return players
}

export async function clearUnhandledCommands(
  db: Db,
  channelId: number,
): Promise<void> {
  db.update('cv.players', { unhandled_commands: {} }, {channel_id: channelId})
}

export default class State {
  public chatters: Chatters = {}
  public players: Players = {}
  public activePlayers: string[] = []
  public newEmotes: Emote[] = []
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
  }

  async refresh (
    db: Db,
  ) {
    this.chatters = await loadChatters(db)
    this.players = await loadPlayers(db)
  }
}
