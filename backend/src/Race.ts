import { Chance } from 'chance'
import { RaceParticipants } from '../../common/src/Types'


export default class Race {

    private chance = new Chance()
    
    public minParticipants = 2
    public maxParticipants = 3

    public minutesWaitBeforeStart = 3
    public secondsWaitBeforeRandomEvent = 10

    public baseBet = 10

    public distance = 100
    public baseSpeed = 5 //race should last around 20 seconds
    public maxSpeedRandomizer = 1 // maximum degree to which to change speed
    public minSpeedRandomizer = -1 // maximum degree to which to change speed
    public speedDecimalDigits = 1

    public participants: RaceParticipants = {}

    setBeginningSpeed(){
        for (const [_playerId, participantData] of Object.entries(this.participants)){
            participantData.speed = this.baseSpeed + this.chance.floating({ min: this.minSpeedRandomizer, max: this.maxSpeedRandomizer, fixed: this.speedDecimalDigits })
        }
    }



}