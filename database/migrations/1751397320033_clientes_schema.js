"use strict";

const Schema = use("Schema");

class CreateClientesTable extends Schema {
  up() {
    this.create("clientes", (table) => {
      table.increments();
      table.string("nome", 80).notNullable();
      table.string("telefone", 20).notNullable();
      table.string("cpf_cnpj", 18).notNullable().unique();
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
    this.drop("clientes");
  }
}

module.exports = CreateClientesTable;
