"use strict";

const Schema = use("Schema");

class CreateOrcamentoPrestadoresTable extends Schema {
  up() {
    this.create("orcamento_prestadores", (table) => {
      table.increments();
      table
        .integer("orcamento_id")
        .unsigned()
        .references("id")
        .inTable("orcamentos")
        .onDelete("CASCADE");
      table
        .integer("prestador_id")
        .unsigned()
        .references("id")
        .inTable("prestadores")
        .onDelete("CASCADE");
      table.timestamps();
    });
  }

  down() {
    this.drop("orcamento_prestadores");
  }
}

module.exports = CreateOrcamentoPrestadoresTable;
