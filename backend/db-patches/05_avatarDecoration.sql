ALTER TABLE cv.players ADD avatar_decoration text;
ALTER TABLE cv.players ADD inventory json NOT NULL DEFAULT '[]';