import { getRandom } from "./Util"

export enum SimpleMessages {
    VOLCANO = "GlitchLit A devastating eruption engulfs the avatars, leaving only ash and memories behind. The chat village mourns, yearning for new faces to fill its void."
}

export const MessageHug = (huggerName: string, huggeeName: string, price: number): string => {
    return getRandom([
        `💙 ${huggerName} embraces ${huggeeName}, their hearts intertwining in a warm, heartfelt hug. They sacrifice ${price} seastars to show their affection Kreygasm`,
        `💙 Wrapped in a tender embrace, ${huggerName} and ${huggeeName} share a moment of genuine connection, exchanging ${huggerName}'s ${price} precious seastars as a symbol of their bond SeemsGood`,
        `💙 With open arms, ${huggerName} pulls ${huggeeName} close, offering comfort and compassion. Their kind gesture costs ${huggerName} ${price} seastars, but the warmth of the hug is priceless VirtualHug`,
        `💙 In a sweet embrace, ${huggerName} and ${huggeeName} share a heartfelt moment, spending ${huggerName}'s ${price} seastars to express their care and affection :)`,
        `💙 The air fills with warmth as ${huggerName} wraps their arms around ${huggeeName}, pouring their heart into a tight hug. A sacrifice of ${price} seastars is made, a small price to pay for such a meaningful connection Kreygasm`
    ])
}

export const MessageFailedHug = (huggerName: string, huggeeName?: string): string => {
    return `💔 Hugs require seastars, and ${huggerName} didn't have enough. Keep participating in conversations to gather seastars for heartwarming embraces! MingLee`
}

export const MessageEmptyHug = (huggerName: string): string => {
    return `noone to hug`
}

export const MessageRandomHug = (huggerName: string, huggeeName: string, price: number): string => {
    return `picked at random`
}

export const MessageBonk = (bonkerName: string, bonkeeName: string, price: number): string => {
    return getRandom([
        `${bonkerName} delivers a powerful bonk to ${bonkeeName}! 💥 The impact echoes through the air as ${bonkeeName} sacrifices ${price} seastars for the strike Jebaited`,
        `With a resounding bonk, ${bonkerName} unleashes their might upon ${bonkeeName}! 💥 The crowd gasps in awe as ${bonkeeName} pays a hefty price of ${price} seastars for this epic attack NotLikeThis`,
        `In a surprising turn of events, ${bonkerName} bonks ${bonkeeName} with great force! 💥 The sound of impact resonates as ${bonkerName} willingly spends ${price} seastars for this daring move BOP`,
        `The atmosphere crackles with anticipation as ${bonkerName} lands a solid bonk on ${bonkeeName}! 💥 The crowd erupts in excitement, witnessing ${bonkerName}'s sacrifice of ${price} seastars for this memorable strike. Poooound`,
        `With a mighty swing, ${bonkerName} delivers a bonk upon ${bonkeeName} that echoes through the realm! 💥 The sight of ${bonkerName} spending ${price} seastars for this decisive strike leaves everyone in awe WholeWheat`
    ])
}

export const MessageFailedBonk = (bonkerName: string): string => {
    return `💥 Uh-oh! ${bonkerName}'s bonk attempt falls flat as they're short on seastars. They must engage in more chat conversations to gather seastars for a mighty bonk BibleThump`
}

export const MessageEmptyBonk = (bonkerName: string): string => {
    return `noone to bonk`
}

export const MessageRandomBonk = (bonkerName: string, bonkeeName: string, price: number): string => {
    return `picked at random`
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


