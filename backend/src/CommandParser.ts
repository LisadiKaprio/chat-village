import { Command, CommandTrigger, Players } from '../../common/src/Types'
import { searchUser } from './functions'

export class CommandParser {
    public parse(message: string, playersInChannel: Players): Command | null {
        const messageWords = this.splitMessage(message)
        if (!messageWords) return null

        const detectedCommand = this.detectCommand(messageWords.command)
        if (!detectedCommand) return null

        if (!messageWords.args) {
            return {
                command: detectedCommand,
            } as Command
        }

        const currentArgPlayerUsernames = messageWords.args.map((arg) => {
            return searchUser(arg, playersInChannel)
          }).filter((user) => user != undefined) as string[]

        return {
            command: detectedCommand,
            args: messageWords.args,
            argPlayerUsernames: currentArgPlayerUsernames,
        } as Command
    }

    public splitMessage(message: string): { command: string, args: string[] } | null {
        const words = message.split(' ')
        if (!words) return null
        return { command: words[0], args: words.splice(1) }
    }

    public detectCommand(trigger: string): CommandTrigger | null {
        let command: keyof typeof CommandTrigger
        for (command in CommandTrigger) {
            if (trigger === CommandTrigger[command]){
                return CommandTrigger[command]
            }
        }
        return null
        // for (const [key, value] of Object.entries(CommandTrigger)) {
        //     if (message === value){
        //         return CommandTrigger
        //     }
        // }
    }
}