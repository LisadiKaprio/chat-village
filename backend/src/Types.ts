export const enum COMMANDS {
  //start bot
  botStart = 'start',
  //end bot
  botEnd = 'exit',
  //clear users in this session
  clearUsers = 'clearUsers',
  deleteUser = 'deleteUser',
  deleteEveryUser = 'deleteEveryUser',
  messageCount = 'messages',
}

// // = = = construction: users database in data/users = = =
// const USER_ALLOW_LIST: string[] = []
// const DATA_DIR = './data'
// const USER_DATA_DIR = DATA_DIR + '/users'

export type UnhandledCommand = {
  command: string;
  args: string[];
  argUsers: string[];
};
export type Chatter = {
  chatter_id: number;
  username: string;
  displayName: string;
  color: string;
}
export type Chatters = {
  [name: string]: Chatter;
}
export type Player = Chatter & {
  id: number;
  channel_id: number;
  points: number;
  state: PlayerState;
  unhandled_commands: UnhandledCommand[];
};
export type Players = {
  [name: string]: Player;
};
export type Emote = {
  name: string;
  id: string;
  channel: string;
};
export type MessagesToChannel = {
  [channel: string]: Message[];
}
export type Message = {
  name: string;
  text: string;
  channel: string;
}

export enum PlayerState {
  OFFLINE = 'offline',
  LURKING = 'lurking',
  ACTIVE = 'active',
  FISHING = 'fishing',
  RACING = 'racing',
}
