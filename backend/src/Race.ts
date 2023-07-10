import { Chance } from 'chance'
import { BackendBoatAvatar, MINUTE, PlayerState, Race, Races, RaceStatus } from '../../common/src/Types'
import Db from './Db'
import { updateManyPlayerState } from './functions'
import State from './State'
import Twitch, { addPointsToPlayer } from './Twitch'


export default class RaceConstructor {
	private chance = new Chance()
    
	public MIN_PARTICIPANTS = 2
	public MAX_PARTICIPANTS = 4

	public WAIT_MINUTES_FEW_PLAYERS = 1
	public WAIT_MINUTES_ENOUGH_PLAYERS = 0.5
	public WAIT_SECONDS_FULL_LOBBY = 10
	public WARNING_MINUTES = 0.5

	public SECONDS_WAIT_RANDOM_EVENT = 15

	public BASE_BET = 5

	// public DISTANCE = 100
	public BASE_SPEED = 0.075 //race should last around 45 seconds
	public MAX_SPEED_RANDOMIZER = 0.075 // maximum degree to which to change speed
	public MIN_SPEED_RANDOMIZER = -0.05 // maximum degree to which to change speed
	public SPEED_CHANGE_LIKELIHOOD = 60 // in percents
	public SPEED_DECIMAL_DIGITS = 3
    
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

	public async update(db: Db, twitch: Twitch, state: State) {
		for(const [channel, race] of Object.entries(this.races)) {
			if (race.status === RaceStatus.STARTING) {
				const timePassedSinceInit = Date.now() - race.dateInit
				console.log(timePassedSinceInit + ' ' + race.minutesToWait * MINUTE)
				const whenToWarn = (race.minutesToWait - this.WARNING_MINUTES) * MINUTE
				if ((timePassedSinceInit >= whenToWarn) && !race.warningOccurred) {
					const morePlayersNeeded = this.MIN_PARTICIPANTS - Object.keys(race.participants).length
					await twitch.sayRaceWarningMessage(channel, morePlayersNeeded)
					race.warningOccurred = true
				}
				if (timePassedSinceInit >= race.minutesToWait * MINUTE) {
					if(Object.keys(race.participants).length >= this.MIN_PARTICIPANTS) {
						await this.startRace(db, state, race, channel, twitch)
					} else {
						await twitch.sayRaceTooFewParticipantsMessage(channel, (this.MIN_PARTICIPANTS - Object.keys(race.participants).length))
						for (const participant of Object.values(race.participants)){
							const currentPlayer = Object.values(state.players).find(player => player.username === participant.username)
							if (!currentPlayer) {
								console.log('Trying to add point back to player: could not be done, no player found.')
								break
							}
							await addPointsToPlayer(db, currentPlayer.points, race.currentBet, participant.id)
						}
						delete this.races[channel]
					}
				}
			} else if (race.status === RaceStatus.RACING) {
				for(const [_playerId, participant] of Object.entries(race.participants)){
					if (this.chance.bool({ likelihood: this.SPEED_CHANGE_LIKELIHOOD })) {
						participant.speed = this.chance.floating({ min: this.MIN_SPEED_RANDOMIZER + this.BASE_SPEED, max: this.MAX_SPEED_RANDOMIZER + this.BASE_SPEED, fixed: this.SPEED_DECIMAL_DIGITS })
					}
				}
			}
		}
	}

	setBeginningSpeed(race: Race) {
		for (const [_playerId, participantData] of Object.entries(race.participants)){
			participantData.speed = this.BASE_SPEED + this.chance.floating({ min: this.MIN_SPEED_RANDOMIZER, max: this.MAX_SPEED_RANDOMIZER, fixed: this.SPEED_DECIMAL_DIGITS })
		}
	}

	async startRace(db: Db, state: State, race: Race, channelName: string, twitch: Twitch) {
		race.status = RaceStatus.RACING
		race.dateInit = 0
		for(const participant of Object.values(race.participants)) {
			if (!state.allFishPlayers[channelName] || !state.allFishPlayers[channelName][participant.username]) continue
			await state.stopFishing(db, participant.username, channelName)
		}
		await updateManyPlayerState(db, Object.values(race.participants).map(p => p.id), PlayerState.RACING)
		this.setBeginningSpeed(race)
		await twitch.sayRaceStartMessage(channelName)
	}

	async handleFinish(db: Db, state: State, channelName: string, boatAvatars: BackendBoatAvatar[], twitch: Twitch) {
		const winnerAvatar = Object.values(boatAvatars).find(a => a.finishTimeMs !== 0)
		if (!winnerAvatar) {
			console.log('Error: No winner avatar!')
			return
		}
		const winnerPlayer = Object.values(state.players).find(p => p.username === winnerAvatar.name)
		if (!winnerPlayer) {
			console.log('Error: No winner player in state!')
			return
		}
		await addPointsToPlayer(db, winnerPlayer.points, this.races[channelName].currentBet * boatAvatars.length, winnerPlayer.id)
		await twitch.sayRaceFinishMessage(channelName, winnerAvatar.name, this.races[channelName].currentBet * boatAvatars.length, this.races[channelName].currentBet)
		await updateManyPlayerState(db, Object.values(this.races[channelName].participants).map(p => p.id), PlayerState.ACTIVE)
		delete this.races[channelName]
		console.log('race finished')
	}
}