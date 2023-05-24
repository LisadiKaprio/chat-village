import { getRandom } from "./Util"

export enum SimpleBotMessages {
    VOLCANO = "GlitchLit A devastating eruption engulfs the avatars, leaving only ash and memories behind. The chat village mourns, yearning for new faces to fill its void."
}

export const BotMessageHug = (huggerUsername: string, huggeeUsername: string): string => {
    return getRandom([
        `Feeling the warmth of friendship, ${huggerUsername} wraps their arms around ${huggeeUsername} in a tight embrace Kreygasm`,
        `${huggerUsername} pulls ${huggeeUsername} into a heartfelt hug, their connection radiating with affection <3`,
        `With open arms, ${huggerUsername} embraces ${huggeeUsername}, creating a moment of pure joy and togetherness VirtualHug`
    ])
}

export const BotMessageFailedHug = (huggerUsername: string, huggeeUsername?: string): string => {
    return `💔 Hugs require seastars, and ${huggerUsername} didn't have enough. Keep participating in conversations to gather seastars for heartwarming embraces! MingLee`
}

export const BotMessageBonk = (bonkerUsername: string, bonkeeUsername: string): string => {
    return getRandom([
        `💥 ${bonkerUsername} bonks ${bonkeeUsername} with a mighty blow! The impact sends ${bonkeeUsername} reeling, stunned and dazed Jebaited`,
        `💥 With a thunderous swing, ${bonkerUsername} delivers a bone-crushing bonk to ${bonkeeUsername}! Their world spins in a whirlwind of confusion and pain NotLikeThis`,
        `💥 ${bonkerUsername} unleashes a furious bonk upon ${bonkeeUsername}, leaving them bewildered and wondering what just happened! Their senses are left in disarray SabaPing`
    ])
}

export const BotMessageFailedBonk = (bonkerUsername: string, bonkeeUsername?: string): string => {
    return `💥 Uh-oh! ${bonkerUsername}'s bonk attempt falls flat as they're short on seastars. They must engage in more chat conversations to gather seastars for a mighty bonk BibleThump`
}

export const BotMessageInventory = (username: string, seastarCount?: number): string => {
    return `🌟 ${username} has gathered ${seastarCount} seastars so far! For every message you write, you'll discover a new seastar twinkling in your collection!`
}


