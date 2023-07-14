ALTER TABLE cv.channels ALTER COLUMN created SET DEFAULT now();

ALTER TABLE cv.channels ADD COLUMN walk_widget_id VARCHAR(10) DEFAULT substr(md5(random()::text), 1, 10);
ALTER TABLE cv.channels ADD COLUMN event_widget_id VARCHAR(10) DEFAULT substr(md5(random()::text), 1, 10);
ALTER TABLE cv.channels ADD COLUMN fish_widget_id VARCHAR(10) DEFAULT substr(md5(random()::text), 1, 10);

UPDATE cv.channels SET walk_widget_id = substr(md5(random()::text), 1, 10) WHERE walk_widget_id IS NULL;
UPDATE cv.channels SET event_widget_id = substr(md5(random()::text), 1, 10) WHERE event_widget_id IS NULL;
UPDATE cv.channels SET fish_widget_id = substr(md5(random()::text), 1, 10) WHERE fish_widget_id IS NULL;