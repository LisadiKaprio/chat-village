import Db from './Db'
import State from './State'
import Webserver from './Webserver'
import RaceConstructor from './Race'
import Twitch from './Twitch'

require('dotenv').config()

async function main() {
	// COMMUNICATION WITH THE DATABASE
	let dbConnectStr = ''
	let dbPatchesDir = ''

	if(process.env.DB_CONNECT_STR && process.env.DB_PATCHES_DIR) {
		dbConnectStr = process.env.DB_CONNECT_STR
		dbPatchesDir = process.env.DB_PATCHES_DIR
	} else {
		console.log('Warning: define the database path in an env file to be able to connect!')
	}

	const db = new Db(dbConnectStr, dbPatchesDir)
	await db.connect()
	await db.patch()
	console.log('Connected to database.')

	const state = new State()
	await state.init(db)

	const raceConstructor = new RaceConstructor()

	// = = = tmi = = =
	// tmi client options

	const channelUsernames = async (): Promise<string[]> => {
		const rows = await db.getMany('cv.channels')
		return rows.map(row => row.channel_username)
	}

	const options = {
		options: {
			debug: true,
		},
		connection: {
			cluster: 'aws',
			reconnect: true,
		},
		identity: {
			username: process.env.TWITCH_BOT_USERNAME,
			password: process.env.TWITCH_OAUTH_TOKEN,
		},
		channels: await channelUsernames(),
	}

	const twitch = new Twitch(options)
	await twitch.init(db, state, raceConstructor)

	const webserver = new Webserver()
	webserver.ws_host = process.env.WS_HOST ?? 'localhost'
	webserver.init(db, state, raceConstructor, twitch)

	setInterval(async () => {
		await state.refresh(db)
		await raceConstructor.update(db)
	}, 2 * 1000) // check every two seconds
}
void main()
