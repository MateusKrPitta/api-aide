"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class AddCategoriaIdToContasPagarSchema extends Schema {
  up() {
    this.table("contas_pagar", (table) => {
      table
        .integer("categoria_id")
        .unsigned()
        .references("id")
        .inTable("categorias")
        .onDelete("SET NULL");
    });
  }

  down() {
    this.table("contas_pagar", (table) => {
      table.dropColumn("categoria_id");
    });
  }
}

module.exports = AddCategoriaIdToContasPagarSchema;
