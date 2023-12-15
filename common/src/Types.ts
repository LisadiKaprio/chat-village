import { AvatarDecorationId } from "./Visuals";

export type NonEmptyArray<T> = [T, ...T[]]

export enum WebsocketMessageType {
  USER_INFO = 'user-info',
  BACKEND_RACE_INFO = 'backend-race-info',
  FRONTEND_RACE_INFO = 'frontend-race-info',
  BACKEND_FISH_WAIT_TIME_INFO = 'backend-fish-wait-time-info',
  FRONTEND_FISH_CATCHING_INFO = 'frontend-fish-catching-info',
}

export enum WidgetName {
  WALK = 'walk',
  EVENT = 'event',
  FISH = 'fish',
}

export enum SkinId {
  BUNNY = 'bunny',
  CAT = 'cat',
  DOG = 'dog',
  BEAR = 'bear',
  PANDA = 'panda'
}

export interface Skin {
  id: SkinId,
  avatarSource: any,
  boatSource: any,
}

export enum PlayerState {
    OFFLINE = 'offline',
    LURKING = 'lurking',
    ACTIVE = 'active',
    FISHING = 'fishing',
    CATCHING = 'CATCHING',
    RACING = 'racing',
  }

export enum CommandTrigger {
  VOLCANO = '!volcano',
  REVIVE = '!revive',
  BONK = '!bonk',
  HUG = '!hug',
  INVENTORY = '!inventory',
  INV_SHORT = '!inv',
  SEASTARS = '!seastars',
  STARS = '!stars',
  BET = '!join',
  DEBUG_ID = 'myid',
  GIFT = '!gift',
  SHOP = '!shop',
  BUY = '!buy',
  EQUIP = '!equip',
  FISH = 'fish',
  FISH_EXCL = '!fish',
  DANCE = '!dance'
}

export enum RaceStatus {
  OFF = 'off',
  STARTING = 'starting',
  RACING = 'racing',
  FINISHING = 'finishing',
}

export enum FishAvatarStatus {
  FISHING = 'fishing',
  CATCHING = 'catching',
  WAITING_FOR_CATCH = 'waiting-for-catch',
  SUCCESS = 'success'
}

export const MINUTE = 60_000 
export const OFFLINE_MINUTES = 10
export const FISH_WAIT_MINUTES = 0.3
export const BASE_DANCE_PRICE = 100

export type UserInfo = {
  users: Players;
  fishPlayers: FishPlayers;
  emotes: any;
  messages: Message[];
  commands: FrontendCommand[];
}

export type Chatter = {
  chatter_id: number;
  username: string;
  display_name: string;
  color: string;
  skin: SkinId;
}
export type Chatters = {
  [name: string]: Chatter;
}
export type Player = Chatter & {
  id: number;
  channel_id: number;
  points: number;
  state: PlayerState;
  avatar_decoration: AvatarDecorationId;
  inventory: AvatarDecorationId[];
  // currentBoatDecoration: BoatDecoration;
  last_chatted: string; // json date
}
export type Players = {
  [id: number]: Player;
}
export type RaceParticipant = Player & {
  speed: number;
  // bet: number;
}
export type RaceParticipants = {
  [id: number]: RaceParticipant;
}
export type Race = {
  status: RaceStatus
  participants: RaceParticipants
  currentBet: number
  warningOccurred: boolean
  dateInit: number
  minutesToWait: number
}
export type Races = {
  [channel: string]: Race;
}
export type EmoteReceived = {
  name: string;
  id: number;
  channel: string;
}
export type MessagesToChannel = {
  [channel: string]: Message[];
}
export type Message = {
  name: string;
  text: string;
  channel: string;
}
export type Command = {
  command: CommandTrigger;
  args: string[];
  argPlayerUsernames: string[];
}
export type FrontendCommand = Command & {
  playerUsername: string;
}
export type FrontendCommandsToChannel = {
  [channelUsername: string]: FrontendCommand[];
}
export interface BackendBoatAvatar {
  name: string;
  finishTimeMs: number;
}
export type FishPlayer = Player & {
  fishWaitTime: number;
  catchStartDate: number;
  hasCaught: boolean;
}
export type FishPlayers = {
  [username: string]: FishPlayer
}
export type FishPlayersToChannel = {
  [channelUsername: string]: FishPlayers;
}