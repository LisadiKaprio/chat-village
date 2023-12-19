import Db from './Db'
(async () => {
	const db = new Db('postgresql://lisastaging:lisa@[2a01:4f8:1c17:5bd8::1]:5432/chatvillagestaging', '')
	await db.connect()
	console.log('it works')
})()