import Db from './Db'

export async function getChannelId(db: Db, channelUsername: string): Promise<number|null> {
    const row = await db._get(`
    select
        cv.channels.id
    from
        cv.channels
    where
        cv.channels.channel_username = $1
    `, [channelUsername])
    return row.id
}