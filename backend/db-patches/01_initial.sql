CREATE SCHEMA cv;

CREATE TABLE cv.channels (
  id SERIAL PRIMARY KEY,
  channel_username TEXT NOT NULL UNIQUE,
  channel_display_name TEXT NOT NULL,
  created TIMESTAMP NOT NULL
);

CREATE TABLE cv.chatters (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT
);

CREATE TABLE cv.players (
  id SERIAL PRIMARY KEY,
  chatter_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0
);
