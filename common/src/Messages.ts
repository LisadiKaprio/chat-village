import { CommandTrigger } from "./Types"
import { getRandom } from "./Util"

const EMPTY_MESSAGE = 'Instructions unclear'

export enum SimpleMessages {
    VOLCANO = "GlitchLit A devastating eruption engulfs the avatars, leaving only ash and memories behind. The chat village mourns, yearning for new faces to fill its void."
}

export const MessageInteraction = (chatterName: string, targetName: string, price: number, command: CommandTrigger): string => {
    if (command === CommandTrigger.BONK) {
        return getRandom([
            `💥 ${chatterName} delivers a powerful bonk to ${targetName} Jebaited ${price} seastars well spent!`,
            `💥 With a resounding bonk, ${chatterName} unleashes their might upon ${targetName}! 💥 The crowd gasps in awe NotLikeThis ${price} seastars well spent!`,
            `💥 In a surprising turn of events, ${chatterName} bonks ${targetName} with great force BOP ${price} seastars well spent!`,
            `💥 The atmosphere crackles with anticipation as ${chatterName} lands a solid bonk on ${targetName} Poooound ${price} seastars well spent!`,
            `💥 With a mighty swing, ${chatterName} delivers a bonk upon ${targetName} that echoes through the realm! WholeWheat ${price} seastars well spent!`
        ])
    } else if (command === CommandTrigger.HUG) {
        return getRandom([
            `💙 ${chatterName} embraces ${targetName}, their hearts intertwining in a warm, heartfelt hug Kreygasm ${price} seastars well spent!`,
            `💙 Wrapped in a tender embrace, ${chatterName} and ${targetName} share a moment of genuine connection SeemsGood ${price} seastars well spent!`,
            `💙 With open arms, ${chatterName} pulls ${targetName} close, offering comfort and compassion VirtualHug ${price} seastars well spent!`,
            `💙 In a sweet embrace, ${chatterName} and ${targetName} share a heartfelt moment :) ${price} seastars well spent!`,
            `💙 The air fills with warmth as ${chatterName} wraps their arms around ${targetName}, pouring their heart into a tight hug Kreygasm ${price} seastars well spent!`
        ])
    } else return EMPTY_MESSAGE
}

export const MessageInteractionFailed = (chatterName: string, command: CommandTrigger): string => {
    if (command === CommandTrigger.BONK) {
        return `💥 Uh-oh! ${chatterName}'s bonk attempt falls flat as they're short on seastars. Engage in more chat conversations to gather seastars for a mighty bonk! Keepo`
    } else if (command === CommandTrigger.HUG) {
        return `💔 Hugs require seastars, and ${chatterName} didn't have enough. Keep participating in conversations to gather seastars for heartwarming embraces! MingLee`
    } else return EMPTY_MESSAGE
}

export const MessageInteractionEmpty = (chatterName: string, command: CommandTrigger): string => {
    if (command === CommandTrigger.BONK) {
        return `🔨 Fueled by the thrill of the moment, ${chatterName} swings their weapon... but alas, the empty air provides no resistance. Their eager bonk misses its target, leaving them feeling bewildered and disheartened.`
    } else if (command === CommandTrigger.HUG) {
        return `BibleThump ${chatterName} extends their arms for a warm embrace, but... nobody's home! FeelsLonelyMan`
    } else return EMPTY_MESSAGE
}

export const MessageInteractionRandom = (chatterName: string, targetName: string, price: number, command: CommandTrigger): string => {
    if (command === CommandTrigger.BONK) {
        return getRandom([
            `💥 ${chatterName}'s bonk lands on ${targetName}, selected by the capricious hand of fate Jebaited ${price} seastars well spent!`,
            `💥 ${chatterName}'s bonking weapon swings wildly and fate chooses ${targetName} as its random target! Drama ensues! NotLikeThis ${price} seastars well spent!`,
            `💥 ${chatterName}'s bonking spree takes an unexpected twist as fate picks ${targetName} as the random target! BOP ${price} seastars well spent!`,
            `💥 ${chatterName}'s bonk, meant for anyone, surprisingly finds ${targetName} Poooound ${price} seastars well spent!`,
            `💥 ${chatterName}  takes a chance and bonks a random target, and to everyone's surprise, it's ${targetName} who gets smacked WholeWheat ${price} seastars well spent!`
        ])
    } else if (command === CommandTrigger.HUG) {
        return getRandom([
            `🧡 ${chatterName}'s impulsive urge to hug engulfs ${targetName} in an unexpected embrace Kreygasm ${price} seastars well spent!`,
            `🧡 ${chatterName} surprises everyone by snatching ${targetName} into a spontaneous hug, leaving both of them momentarily stunned SeemsGood ${price} seastars well spent!`,
            `🧡 ${chatterName}'s overwhelming affection compels them to embrace ${targetName} VirtualHug ${price} seastars well spent!`,
            `🧡 ${chatterName} reaches out, eyes closed, and unexpectedly wraps ${targetName} in a tight embrace :) ${price} seastars well spent!`,
            `🧡 With a mischievous glimmer in their eyes, ${chatterName} chooses ${targetName} as the recipient of an impromptu hug Kreygasm ${price} seastars well spent!`
        ])
    } else return EMPTY_MESSAGE
}

export const MessageInventory = (displayName: string, seastarCount?: number): string => {
    return `🌟 ${displayName} has gathered ${seastarCount} seastars so far! For every message you write, you'll discover a new seastar twinkling in your collection!`
}

export const MessageFailedInitBet = (displayName: string, price: number): string => {
    return `Oh no, @${displayName}! BibleThump You don't have enough seastars (${price}) to join the boat race!`
}

export const MessageFailedRaiseBet = (displayName: string, price: number): string => {
    return `Oh no, ${displayName}! CoolStoryBob It seems like you're short on seastars to raise your bet! `
}

export const MessageInitBet = (displayName: string, price: number, playerAmount: number): string => {
    return getRandom([
        `🌊 Huzzah! ${displayName} has courageously wagered ${price} seastars on their trusty boat, ready to embark on the upcoming race! But the excitement lingers as we eagerly await for ${playerAmount} more players to join and set sail! CoolCat`,
        `🌊 Huzzah! ${displayName} puts it all on the line, betting ${price} seastars and joining the race! Just ${playerAmount} more players needed to set sail! PogChamp`,
        `🌊 Huzzah! Tension builds as ${displayName} dives headfirst into the race, risking it all with a bet of ${price} seastars! We're on the edge of our seats, waiting for ${playerAmount} more players to take the plunge! PogBones`
    ])
}

export const MessageFailedRaceJoin = (displayName: string): string => {
    return `ResidentSleeper ${displayName}, you already joined the race. Raising your bet is not possible, sorry!`
}

export const MessageRaiseBet = (displayName: string, plusBetAmount: number, wholeBetAmount: number): string => {
    return getRandom([
        `${displayName} throws caution to the wind, raising the stakes with a daring bet of ${plusBetAmount} seastars! The thrill of the race intensifies as the total bet reaches ${wholeBetAmount}. PogChamp`,
        `With an audacious move, ${displayName} doubles down on their boat, adding ${plusBetAmount} seastars to their wager. The atmosphere crackles with anticipation as the bet reaches a staggering ${wholeBetAmount}. CurseLit`,
        `The tension mounts as ${displayName} goes all-in, placing an additional bet of ${plusBetAmount} seastars on their boat. A collective gasp ripples through the crowd as the total wager skyrockets to ${wholeBetAmount}. SabaPing`
    ])
}

export const MessageWarningRaceStart = (enoughPlayersToStart: boolean, waittime: number): string => {
    if (enoughPlayersToStart) {
        return `🚣‍♂️ The boat race is just 1 minute away! More players can join still! PogChamp`
    } else {
        return `🚣‍♂️ Time is running out! Join the boat race now, or it's cancelled StinkyGlitch Don't let this opportunity to get more seastars pass you by!`
    }
}


