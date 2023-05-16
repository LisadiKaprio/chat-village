import { World } from "./World.js";
import { assertExists } from "./Helpers.js";
export { UPDATE_PERIOD };
const UPDATE_PERIOD: number = 1000;
let world: World;

async function main() {
  const gameContainer = document.querySelector(".game-container");
  assertExists(gameContainer);
  // create a new World instance
  world = new World(gameContainer);

  async function fetchUsers() {
    // fetch the users, emotes and messages from the server.
    try {
      const resp = await fetch("/users");
      let { users, emotes, messages } = (await resp.json()) as ServerResponse;

      // update the world with the data from the server.
      world.feedNewData(users, emotes, messages);
    } catch (error: unknown) {
      if (
        error instanceof TypeError &&
        error.message.startsWith("NetworkError")
      ) {
        // TODO: a disconnect icon or loading message.
        console.error("Server didn't respond!");
      } else {
        throw error;
      }
    }

    // queue the next server request
    setTimeout(fetchUsers, UPDATE_PERIOD);
  }

  function step(timestep: number) {
    world.update(timestep);
    requestAnimationFrame(step);
  }

  await fetchUsers();

  requestAnimationFrame(step);
}

main();

export interface ServerResponse {
  users: ServerUsers;
  emotes: ServerEmote[];
  messages: ServerMessages;
}

export interface ServerUsers {
  [nickname: string]: ServerUser;
}

type Command = {
  command: string;
  args: string;
  argUsers: string[];
};

export interface ServerUser {
  unhandledCommands: Command[];
  name: string;
  display_name: string;
  messageCount: number;
  color: string;
  xp: number;
}

export interface ServerMessages {
  [nickname: string]: string[];
}

export type ServerEmote = {
  name: string;
  id: number;
};
