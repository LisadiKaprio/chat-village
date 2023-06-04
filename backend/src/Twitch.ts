
import tmi from 'tmi.js'

export default class Twitch {
    #client: tmi.Client

    constructor(options: any) {
        this.#client = new tmi.Client(options)
    }

    init() {
        this.#client.connect()
    }
}