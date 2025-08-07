"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class UserSchema extends Schema {
  up() {
    this.create("users", (table) => {
      table.increments();
      table.string("nome", 100).notNullable();
      table.string("username", 80).notNullable().unique();
      table.string("email", 254).notNullable().unique();
      table.string("password", 60).notNullable();
      table.string("telefone", 20);
      table.integer("permissao").unsigned().defaultTo(1);
      table.boolean("ativo").defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop("users");
  }
}

module.exports = UserSchema;
