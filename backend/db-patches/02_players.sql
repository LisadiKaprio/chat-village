ALTER TABLE cv.players ADD state text NOT NULL DEFAULT 'offline';

ALTER TABLE cv.channels ADD bot_active INTEGER NOT NULL DEFAULT 1;
