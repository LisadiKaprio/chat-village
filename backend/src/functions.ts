import Db from './Db'

export async function getChannelId(db: Db, channelUsername: string): Promise<number> {
    return await db._get(`
    select
        cv.channels.id
    from
        cv.channels
    where
        cv.channels.username = ${channelUsername}
    `)
}