import { Chance } from 'chance'
import { BackendBoatAvatar, MINUTE, PlayerState, Race, Races, RaceStatus } from '../../common/src/Types'
import Db from './Db'
import { updateManyPlayerState } from './functions'
import Twitch from './Twitch'


export default class RaceConstructor {
	private chance = new Chance()
    
	public MIN_PARTICIPANTS = 2
	public MAX_PARTICIPANTS = 3

	public WAIT_MINUTES_FEW_PLAYERS = 1
	public WAIT_MINUTES_ENOUGH_PLAYERS = 1
	public WAIT_SECONDS_FULL_LOBBY = 10
	public WARNING_MINUTES = 1

	public SECONDS_WAIT_RANDOM_EVENT = 15

	public BASE_BET = 10

	// public DISTANCE = 100
	public BASE_SPEED = 0.5 //race should last around 45 seconds
	public MAX_SPEED_RANDOMIZER = 0.01 // maximum degree to which to change speed
	public MIN_SPEED_RANDOMIZER = -0.01 // maximum degree to which to change speed
	public SPEED_DECIMAL_DIGITS = 5
    
	public races: Races = {}

	public createRace(channelUsername: string, bet?: number) {
		this.races[channelUsername] = {
			status: RaceStatus.STARTING,
			participants: {},
			currentBet: bet ?? this.BASE_BET,
			warningOccurred: false,
			dateInit: Date.now(),
			minutesToWait: this.WAIT_MINUTES_FEW_PLAYERS,
		}
	}

	public async update(db: Db) {
		for(const [_channel, race] of Object.entries(this.races)) {
			if (race.dateInit === 0) return

			const timePassedSinceInit = Date.now() - race.dateInit
			console.log(timePassedSinceInit + ' ' + race.minutesToWait * MINUTE)
			if (timePassedSinceInit >= race.minutesToWait * MINUTE) {
				await this.startRace(db, race)
			}
		}
	}

	setBeginningSpeed(race: Race) {
		for (const [_playerId, participantData] of Object.entries(race.participants)){
			participantData.speed = this.BASE_SPEED + this.chance.floating({ min: this.MIN_SPEED_RANDOMIZER, max: this.MAX_SPEED_RANDOMIZER, fixed: this.SPEED_DECIMAL_DIGITS })
		}
	}

	async startRace(db: Db, race: Race) {
		race.status = RaceStatus.RACING
		race.dateInit = 0
		await updateManyPlayerState(db, Object.values(race.participants).map(p => p.id), PlayerState.RACING)
		this.setBeginningSpeed(race)
	}

	async handleFinish(channelName: string, boatAvatars: BackendBoatAvatar[], twitch: Twitch) {
		await twitch.sayRaceFinishMessage(channelName, boatAvatars, this.races[channelName].currentBet)
		delete this.races[channelName]
		console.log('race finished')
		console.log(JSON.stringify(boatAvatars))
	}
}