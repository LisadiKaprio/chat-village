
export type NonEmptyArray<T> = [T, ...T[]]

export enum PlayerState {
    OFFLINE = 'offline',
    LURKING = 'lurking',
    ACTIVE = 'active',
    FISHING = 'fishing',
    RACING = 'racing',
  }

export const MINUTE = 60_000 
export const OFFLINE_MINUTES = 10

export type UnhandledCommand = {
  command: string;
  args: string[];
  argUsers: string[];
};
export type Chatter = {
  chatter_id: number;
  username: string;
  display_name: string;
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
  last_chatted: string; // json date
};
export type Players = {
  [id: number]: Player;
};
export type RaceParticipant = Player & {
  speed?: number;
  bet?: number;
}
export type RaceParticipants = {
  [id: number]: RaceParticipant;
};
export type EmoteReceived = {
  name: string;
  id: number;
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
