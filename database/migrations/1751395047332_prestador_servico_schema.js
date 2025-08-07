"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class CreatePrestadorServicoTable extends Schema {
  up() {
    this.create("prestador_servico", (table) => {
      table.increments();
      table
        .integer("prestador_id")
        .unsigned()
        .references("id")
        .inTable("prestadores")
        .onDelete("CASCADE");
      table
        .integer("servico_id")
        .unsigned()
        .references("id")
        .inTable("servicos")
        .onDelete("CASCADE");
      table.timestamps();
    });
  }

  down() {
    this.drop("prestador_servico");
  }
}

module.exports = CreatePrestadorServicoTable;
