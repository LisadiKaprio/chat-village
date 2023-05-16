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
