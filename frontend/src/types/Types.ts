import { Players } from '../../../common/src/Types'

export const UPDATE_PERIOD = 1000

export interface ServerResponse {
    users: Players;
    emotes: ServerEmote[];
    messages: ServerMessages;
  }
  
export type Command = {
    command: string;
    args: string;
    argUsers: string[];
};

export interface ServerMessages {
    [nickname: string]: string[];
}

export type ServerEmote = {
    name: string;
    id: number;
};