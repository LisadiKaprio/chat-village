const tmi = require("tmi.js");
const fs = require("fs");
import Db from "./Db";
require("dotenv").config();

//= = = my own variables = = =
// CHANNEL NAME
const channelName = "LisadiKaprio";
// is bot active?
let botActive = true;

const COMMANDS = {
  //start bot
  botStart: "start",
  //end bot
  botEnd: "exit",
  //clear users in this session
  clearUsers: "clearUsers",
  deleteUser: "deleteUser",
  deleteEveryUser: "deleteEveryUser",
  messageCount: "messages",
};

// = = = construction: users database in data/users = = =
const USER_ALLOW_LIST = [];
const DATA_DIR = "./data";
const USER_DATA_DIR = DATA_DIR + "/users";

const users = loadUsers();
let activeUsers = [];
let newEmotes = [];
let newMessages = {};

function loadUsers() {
  const users = {};
  const files = fs.readdirSync(USER_DATA_DIR);
  for (const file of files) {
    const user = JSON.parse(fs.readFileSync(`${USER_DATA_DIR}/${file}`));
    if (USER_ALLOW_LIST.length === 0 || USER_ALLOW_LIST.includes(user.name)) {
      users[user.name] = user;
    }
  }
  return users;
}

function userFile(username) {
  return `${USER_DATA_DIR}/${username}.json`;
}

function deleteUser(username) {
  delete users[username];
  fs.rmSync(userFile(username));
}

function deleteEveryUser() {
  const usernames = Object.keys(users);
  for (const username of usernames) {
    deleteUser(username);
  }
}


function saveUser(username) {
  fs.writeFileSync(userFile(username), JSON.stringify(users[username]));
}

function putUserIntoObject(_object, tags) {
  // WHAT's IN THE USER?
  return {
    name: tags.username,
    displayName: tags["display-name"],
    messageCount: 0,
    color: tags.color,
    xp: 0,
  };
}

function searchUser(query) {
  if (query.startsWith("@")) {
    query = query.replace("@", "");
  }
  let user = users[query];
  if (!user) {
    for (const [username, userTags] of Object.entries(users)) {
      if (userTags.displayName == query) {
        return username;
      }
    }
  } else {
    return query;
  }
}

// = = = tmi = = =
// tmi client options
const options = {
  options: {
    debug: true,
  },
  connection: {
    cluster: "aws",
    reconnect: true,
  },
  channels: [channelName],
};

// insert options to client
const client = new tmi.client(options);

// connect the client to the chat
client.connect();

// when client is connected to chat
client.on("connected", (address, port) => {
  console.log("Connected to chat!" + address + port);
});

// when client recieves a normal chat message
client.on("message", (_channel, tags, message) => {
  // extract the username out of the tags?? T_T
  // i don't undewstand how this wowks but ok
  // so like const username = tags.username? or what?

  // kirino's explanation:
  // it extracts what's in {} out of what's on the right
  const { username } = tags;
  const displayName = tags["display-name"];

  if (USER_ALLOW_LIST.length > 0 && !USER_ALLOW_LIST.includes(username)) {
    return;
  }

  if (botActive) {
    // detect user chatting as a participator of the game
    // first, save the user in the db if they weren't yet
    if (!(username in users)) {
      users[username] = putUserIntoObject(users, tags);
    }
    users[username].displayName = displayName;

    // same, but for new users in current session aka current stream
    if (!(username in activeUsers)) {
      activeUsers.push(username);
    }

    const detectedCommand = message.match(/^!([\w]+)($|\s.*)/);
    if (detectedCommand) {
      const command = detectedCommand[1];
      const args = detectedCommand[2].split(/\s+/);
      const argUsers = args
        .map((arg) => {
          const username = searchUser(arg);
          return username;
        })
        .filter((user) => user != undefined);

      let handled = true;
      if (tags.mod || tags.badges?.broadcaster) {
        // MOD/BROADCASTER COMMANDS
        if (command === COMMANDS.clearUsers) {
          activeUsers = [username];
          handled = false;
        } else if (command === COMMANDS.botStart) {
          botActive = true;
        } else if (command === COMMANDS.botEnd) {
          botActive = false;
        } else if (command === COMMANDS.deleteUser) {
          for (const username of argUsers) {
            deleteUser(username);
          }
        } else if (
          command === COMMANDS.deleteEveryUser &&
          displayName === channelName
        ) {
          deleteEveryUser();
        } else if (command === COMMANDS.messageCount) {
          for (const username of argUsers) {
            console.log(
              `${users[username].displayName} has written ${users[username].messageCount} messages`
            );
          }
        } else {
          handled = false;
        }
      } else {
        handled = false;
      }

      // not handled command
      if (!handled) {
        // pay the price for the command;
        let payed = false;
        if (command == "bonk") {
          if (users[username].xp >= 60) {
            users[username].xp -= 60;
            payed = true;
          }
        } else if (command == "hug") {
          if (users[username].xp >= 30) {
            users[username].xp -= 30;
            payed = true;
          }
        } else {
          // pass through the unknown commands
          payed = true;
        }
        // Pass all the unknown commands (starting with ! ) to the frontend
        // in hopes that it knows what to do with them.
        if (!users[username].unhandledCommands && payed) {
          users[username].unhandledCommands = [
            {
              command: command,
              args: args,
              argUsers: argUsers,
            },
          ];
        } else if (payed) {
          users[username].unhandledCommands.push({
            command: command,
            args: args,
            argUsers: argUsers,
          });
        }
      }
    } else {
      // no command detected
      // counts messages written by the user and gives xp
      users[username].messageCount += 1;
      users[username].xp += 15;
      if (!tags.emotes) {
        // NOT A COMMAND
        if (newMessages[username]) {
          newMessages[username].push(message);
        } else {
          newMessages[username] = [message];
        }
      } else {
        for (const [emote, charPositions] of Object.entries(tags.emotes)) {
          for (let i = 0; i < charPositions.length; i++) {
            newEmotes.push({
              name: username,
              id: emote,
            });
          }
        }
        // for each emote in message
        // emote[1] = { who: kirinokirino, id: 65}
        // emote[2] = { who: kirinokirino, id: 65}
        // emote[3] = { who: kirinokirino, id: 46636}
      }
    }
    // save that as a json file then
    saveUser(username);
  }
});

// COMMUNICATION WITH THE DATABASE
async function communicateWithDatabase() {
  const db = new Db(process.env.DB_CONNECT_STR, process.env.DB_PATCHES_DIR);
  await db.connect();
  await db.patch();
  console.log("Connected to database.");
}
communicateWithDatabase();

// COMMUNICATION WITH THE FRONTEND
const express = require("express");
//const { URLSearchParams } = require("url");
const app = express();

// what port do we run on?
const port = 2501;

// what folder will express start up?
// where is our frontend
app.use(express.static("../frontend/dist"));

// what's displayed in localhost:2501
app.get("/dbg", (_req, res) => {
  let filteredUsers = {};
  for (const name of activeUsers) {
    filteredUsers[name] = users[name];
  }
  res.send(
    JSON.stringify({
      users: users,
      active: activeUsers,
      filtered: filteredUsers
    })
  );
});

// send over the info inside the users variable
app.get("/users", (_req, res) => {
  let filteredUsers = {};
  for (const name of activeUsers) {
    filteredUsers[name] = users[name];
  }
  res.send({
    users: filteredUsers,
    emotes: newEmotes,
    messages: newMessages,
  });
  for (const user of activeUsers) {
    users[user].unhandledCommands = [];
  }
  newEmotes = [];
  newMessages = {};
});

// (:
app.listen(port, () => {
  console.log(`Web-Avatars listening on http://localhost:${port}`);
});
