"use strict";

const Schema = use("Schema");

class CreateOrcamentosTable extends Schema {
  up() {
    this.create("orcamentos", (table) => {
      table.increments();
      table.string("nome", 100).notNullable();
      table
        .integer("cliente_id")
        .unsigned()
        .references("id")
        .inTable("clientes")
        .onDelete("CASCADE");
      table.string("arquivo", 255);
      table.timestamps();
    });
  }

  down() {
    this.drop("orcamentos");
  }
}

module.exports = CreateOrcamentosTable;
