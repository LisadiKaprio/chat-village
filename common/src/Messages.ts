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

export const MessageBonk = (bonkerName: string, bonkeeName: string, price: number): string => {
    return getRandom([
        `${bonkerName} delivers a powerful bonk to ${bonkeeName}! 💥 The impact echoes through the air as ${bonkeeName} sacrifices ${price} seastars for the strike Jebaited`,
        `With a resounding bonk, ${bonkerName} unleashes their might upon ${bonkeeName}! 💥 The crowd gasps in awe as ${bonkeeName} pays a hefty price of ${price} seastars for this epic attack NotLikeThis`,
        `In a surprising turn of events, ${bonkerName} bonks ${bonkeeName} with great force! 💥 The sound of impact resonates as ${bonkerName} willingly spends ${price} seastars for this daring move SabaPing`,
        `The atmosphere crackles with anticipation as ${bonkerName} lands a solid bonk on ${bonkeeName}! 💥 The crowd erupts in excitement, witnessing ${bonkerName}'s sacrifice of ${price} seastars for this memorable strike. Poooound`,
        `With a mighty swing, ${bonkerName} delivers a bonk upon ${bonkeeName} that echoes through the realm! 💥 The sight of ${bonkerName} spending ${price} seastars for this decisive strike leaves everyone in awe WholeWheat`
    ])
}

export const MessageFailedBonk = (bonkerName: string, bonkeeName?: string): string => {
    return `💥 Uh-oh! ${bonkerName}'s bonk attempt falls flat as they're short on seastars. They must engage in more chat conversations to gather seastars for a mighty bonk BibleThump`
}

export const MessageInventory = (displayName: string, seastarCount?: number): string => {
    return `🌟 ${displayName} has gathered ${seastarCount} seastars so far! For every message you write, you'll discover a new seastar twinkling in your collection!`
}

export const MessageFailedBet = (displayName: string, price: number): string => {
    return `Oh no, @${displayName}! 😮 You don't have enough seastars (${price}) to join the boat race!`
}


