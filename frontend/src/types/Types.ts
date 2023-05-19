import { EmoteReceived, Message, Players } from '../../../common/src/Types'

export const SECOND = 1000
export const UPDATE_PERIOD = 1000
export const FRAMERATE = 60

export interface ServerResponse {
    users: Players;
    emotes: EmoteReceived[];
    messages: Message[];
  }
  
export type Command = {
    command: string;
    args: string;
    argUsers: string[];
};

export interface PlayerMessages {
    [username: string]: Message[];
}

export type ServerEmote = {
    name: string;
    id: number;
};