import { describe, it, assert } from 'vitest'
import { Command, CommandTrigger, Players } from '../../common/src/Types'
import { CommandParser } from './CommandParser'


describe('CommandParser.ts', () => {
	describe('splitMessage', () => {
		const testCases: { message: string, expected: { command: string, args: string[] } | null }[] = [
			{
				message: '!bonk',
				expected: {
					command: CommandTrigger.BONK,
					args: [],
				},
			},
		]
		testCases.forEach(({message, expected}) => it('works', () => {
			const actual = (new CommandParser()).splitMessage(message)
			assert.deepStrictEqual(actual, expected)
		}))
	})
	describe('parse', () => {
		const testCases: { message: string, playersInChannel: Players, expected: Command | null }[] = [
			{
				message: '!bonk',
				playersInChannel: {},
				expected: {
					command: CommandTrigger.BONK,
					args: [],
					argPlayerUsernames: [],
				},
			},
			{
				message: '!bet 500',
				playersInChannel: {},
				expected: {
					command: CommandTrigger.BET,
					args: ['500'],
					argPlayerUsernames: [],
				},
			},
		]
		testCases.forEach(({message, playersInChannel, expected}) => it('works', () => {
			const actual = (new CommandParser()).parse(message, playersInChannel)
			assert.deepStrictEqual(actual, expected)
		}))
	})
})