export enum PlayerState {
    OFFLINE = 'offline',
    LURKING = 'lurking',
    ACTIVE = 'active',
    FISHING = 'fishing',
    RACING = 'racing',
  }

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
