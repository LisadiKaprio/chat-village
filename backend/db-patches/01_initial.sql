CREATE SCHEMA cv;

CREATE TABLE cv.channels (
  id SERIAL PRIMARY KEY,
  channel_username TEXT NOT NULL UNIQUE,
  channel_displayName TEXT NOT NULL,
  created TIMESTAMP NOT NULL
);

CREATE TABLE cv.chatters (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  color TEXT
);

CREATE TABLE cv.players (
  id SERIAL PRIMARY KEY,
  chatter_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0
);
