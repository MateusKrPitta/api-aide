"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class CreatePrestadoresTable extends Schema {
  up() {
    this.create("prestadores", (table) => {
      table.increments();
      table.string("nome", 80).notNullable();
      table.string("telefone", 20).notNullable();
      table.string("cpf", 14).notNullable().unique();
      table.string("email", 254).notNullable().unique();
      table.string("estado", 2).notNullable();
      table.string("cidade", 50).notNullable();
      table.string("endereco", 255).notNullable();
      table.string("numero", 10).notNullable();
      table.string("complemento", 100);
      table.boolean("ativo").defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop("prestadores");
  }
}

module.exports = CreatePrestadoresTable;
