'use strict'

/*
|--------------------------------------------------------------------------
| DatabaseSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')

class DatabaseSeeder {
  async run () {
    const User = use('App/Models/User')
    const userExists = await User.findBy('username', 'mateus')
    
    if (!userExists) {
      const UserSeeder = use('./UserSeeder')
      await (new UserSeeder()).run()
    } else {
      console.log('Usuário mateus já existe, pulando seed de usuário.')
    }
  }
}

module.exports = DatabaseSeeder
