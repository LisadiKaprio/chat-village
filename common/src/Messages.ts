import { AvatarDecoration, AvatarDecorationId } from "./Visuals"
import { BackendBoatAvatar, CommandTrigger } from "./Types"
import { getRandom } from "./Util"

export enum SimpleMessages {
    VOLCANO = "GlitchLit A devastating eruption engulfs the avatars, leaving only ash and memories behind. The chat village mourns, yearning for new faces to fill its void.",
    RACE_GOING = "ResidentSleeper A race has already started! Let's see how it turns out first",
    INVALID_BUY_REQUEST = "What item did you want to buy? Choose an item from today\'s shop, then use \"!buy A\" or \"!buy bow\" OhMyDog",
    INVALID_EQUIP_REQUEST = "What item did you want to equip? Choose an item from your inventory (!inv), then use \"!equip 1\" or \"!equip bow\" OhMyDog",
    RACE_START = "🎉 Race started!",
    FISHING_FULL = "SabaPing The beach is full! Try again when someone finishes fishing.",
    HUG_BONK_FISHING = "SabaPing You're too busy fishing!",
    EMPTY_MESSAGE = 'Instructions unclear'
}

const randomCompliment = (): string => {
    return getRandom([
        'adorable',
        'fabulous',
        'good',
        'fantastic',
        'marvelous',
        'charming',
        'delightful',
        'lovely',
        'amazing',
        'wonderful',
        'splendid',
    ])
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
    } else return SimpleMessages.EMPTY_MESSAGE
}

export const MessageInteractionFailed = (chatterName: string, command: CommandTrigger): string => {
    if (command === CommandTrigger.BONK) {
        return `:( Uh-oh! ${chatterName}'s bonk attempt falls flat as they're short on seastars. Engage in more chat conversations to gather seastars for a mighty bonk!`
    } else if (command === CommandTrigger.HUG) {
        return `💔 Hugs require seastars, and ${chatterName} didn't have enough. Keep participating in conversations to gather seastars for heartwarming embraces! MingLee`
    } else return SimpleMessages.EMPTY_MESSAGE
}

export const MessageInteractionEmpty = (chatterName: string, command: CommandTrigger): string => {
    if (command === CommandTrigger.BONK) {
        return `🔨 Fueled by the thrill of the moment, ${chatterName} swings their weapon... but alas, the empty air provides no resistance. Their eager bonk misses its target, leaving them feeling bewildered and disheartened.`
    } else if (command === CommandTrigger.HUG) {
        return `BibleThump ${chatterName} extends their arms for a warm embrace, but... nobody's home! FeelsLonelyMan`
    } else return SimpleMessages.EMPTY_MESSAGE
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
    } else return SimpleMessages.EMPTY_MESSAGE
}

export const MessageSeastars = (displayName: string, seastarCount?: number): string => {
    return `🌟 @${displayName} You've got ${seastarCount} seastars so far! For every message you write, you'll discover a new seastar twinkling in your collection!`
}

export const MessageInventory = (displayName: string, inventory: AvatarDecoration[], equipment?: AvatarDecoration): string => {
    if (inventory.length === 0 && equipment) {
        return `🎒 @${displayName} Your inventory is empty! Currently equipped: ${equipment.name}.`
    } else if (inventory.length === 0 && !equipment) {
        return `🎒 @${displayName} Your inventory is empty, and you don't have anything equipped! Check out the "!shop" :)`
    } else if (equipment) {
        const formattedStrings = inventory.map((item, index) => `(${index + 1}) ${item.name}`);
        const inventoryString = formattedStrings.join(' ');
        return `🎒 @${displayName} You've got: ${inventoryString}! Currently equipped: ${equipment?.name}`
    } else if (!equipment) {
        const formattedStrings = inventory.map((item, index) => `(${index + 1}) ${item.name}`);
        const inventoryString = formattedStrings.join(' ');
        return `🎒 @${displayName} You've got: ${inventoryString}! To equip something, use "!equip"`
    }
}

export const MessageFailedInitBet = (displayName: string, price: number): string => {
    return `BibleThump @${displayName} You don't have enough seastars (${price}) to join the boat race!`
}

export const MessageFailedRaiseBet = (displayName: string, price: number): string => {
    return `Oh no, ${displayName}! CoolStoryBob It seems like you're short on seastars to raise your bet! `
}

export const MessageInitBet = (displayName: string, price: number, playerAmount: number): string => {
    if (playerAmount > 0) {
        return getRandom([
            `🌊 Huzzah! ${displayName} has wagered ${price} seastars on their trusty boat, ready to embark on the upcoming race! Now we await for ${playerAmount} more players to join CoolCat`,
            `🌊 Huzzah! ${displayName} bets ${price} seastars and joins the race! Just ${playerAmount} more players needed to start! PogChamp`,
            `🌊 Huzzah! ${displayName} dives headfirst into the race, betting ${price} seastars! Now waiting for ${playerAmount} more players to take the plunge! PogBones`
        ])
    } else {
        return getRandom([
            `🌊 Huzzah! ${displayName} has wagered ${price} seastars on their trusty boat, ready to embark on the upcoming race CoolCat`,
            `🌊 Huzzah! ${displayName} bets ${price} seastars and joins the race PogChamp`,
            `🌊 Huzzah! ${displayName} dives headfirst into the race, betting ${price} seastars PogBones`
        ])
    }
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

export const MessageWarningRaceStart = (morePlayersNeeded: number): string => {
    if (morePlayersNeeded <= 0) {
        return `🚣‍♂️ The boat race is just 30 seconds away! More players can join still! PogChamp`
    } else {
        return `🚣‍♂️ Time is running out! Join the boat race now, or it's cancelled StinkyGlitch Don't let this opportunity to get more seastars pass you by!`
    }
}

export const MessageRaceFinish = (winnerName: string, pointsAdded: number, pointsDeducted: number): string => {
    return `PartyHat Congrats! ${winnerName} finishes the race in first place and gets ${pointsAdded} seastars, while everyone else loses ${pointsDeducted} seastars Jebaited`
}

export const MessageRaceTooFewParticipants = (participantsAmount: number): string => {
    return `UWot The race was canceled! Come on, people, we only needed ${participantsAmount} more players to join! `
}

export const MessageGiftedStars = (gifterDisplayName: string, targetDisplayName: string, points: number): string => {
    return `GivePLZ ⭐ @${gifterDisplayName} just gifted @${targetDisplayName} ${points} seastars! What a kind soul!`
}

export const MessageGiftedItem = (gifterDisplayName: string, targetDisplayName: string, itemName: string): string => {
    return `GivePLZ ⭐ @${gifterDisplayName} just gifted @${targetDisplayName} their ${itemName.toLowerCase()} ! What a kind soul!`
}

export const MessageFailedGiftingStars = (gifterDisplayName: string, points: number): string => {
    return `BibleThump @${gifterDisplayName} You don't have ${points} seastars yet, so you can't gift that much!`
}

export const MessageNooneGiftingItem = (gifterDisplayName: string): string => {
    return `BibleThump @${gifterDisplayName} There's noone who has space for your item! It was trashed instead.`
}

export const MessageDailyShop = (dailyItems: AvatarDecoration[]): string => {
    if (dailyItems.length<=2) return `PizzaTime Today, you can purchase: ${dailyItems}`
    return `PizzaTime Today, you can buy: (A) ${dailyItems[0].name} (${dailyItems[0].price} seastars); (B) ${dailyItems[1].name} (${dailyItems[1].price} seastars); (C) ${dailyItems[2].name} (${dailyItems[2].price} seastars);`
}

export const MessageBuyingFailedPrice = (displayName: string, price: number, itemName: string): string => {
    return `BibleThump @${displayName} You don't have ${price} seastars to buy ${itemName.toLowerCase()} yet!`
}

export const MessageBuyingFailedDuplicate = (displayName: string, itemName: string): string => {
    return `Kippa @${displayName} You already have the ${itemName.toLowerCase()} in your inventory!`
}

export const MessageBuyingSuccessEquipped = (displayName: string, itemName: string): string => {
    return `SeemsGood @${displayName} Thanks for the purchase! This ${itemName.toLowerCase()} looks ${randomCompliment()} on you!`
}

export const MessageBuyingSuccessInventory = (displayName: string, itemName: string): string => {
    return `SeemsGood @${displayName} Thanks for the purchase! ${itemName} is now in your inventory. Use \"!equip ${itemName.toLowerCase()}\" to put it on!`
}

export const MessageEquipFailedEmptyInventory = (displayName: string): string => {
    return `NinjaGrumpy @${displayName} Your inventory is empty, so there is nothing to equip!`
}

export const MessageEquipSuccess = (displayName: string): string => {
    return `duDudu  @${displayName} Swoosh! You look ${randomCompliment()}~`
}

export const MessageFishFailRace = (displayName: string): string => {
    return `NinjaGrumpy  @${displayName} You can't fish while racing!`
}

export const MessageFishTooEarly = (displayName: string): string => {
    return `HotPokket  @${displayName} swings their fishing pole too early and catches nothing!`
}

export const MessageFishCatchLate = (displayName: string): string => {
    return `🐟💦 @${displayName} The fish flew off the hook!`
}

export const MessageFishCatchFailed = (displayName: string, pointsCaught: number): string => {
    return `🥾 @${displayName} has an empty boot on their hook! What a pointless catch!`
}

export const MessageFishCatchStandard = (displayName: string, pointsCaught: number): string => {
    return `🐟 @${displayName} catches a fish with ${pointsCaught} seastars in its mouth! Good job!`
}

export const MessageFishCatchTreasure = (displayName: string, pointsCaught: number): string => {
    return `HolidayPresent @${displayName} catches a gift box! Inside, there are ${pointsCaught} seastars. Congrats!`
}

export const MessageInventoryFull = (displayName: string): string => {
    return `@${displayName} your inventory is full! Please gift one of your items to make room for more!`
}