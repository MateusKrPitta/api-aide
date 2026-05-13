"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class AddOrcamentoIdToFinancialTablesSchema extends Schema {
  up() {
    this.table("contas_receber", (table) => {
      table
        .integer("orcamento_id")
        .unsigned()
        .references("id")
        .inTable("orcamentos")
        .onDelete("CASCADE");
    });

    this.table("contas_pagar", (table) => {
      table
        .integer("orcamento_id")
        .unsigned()
        .references("id")
        .inTable("orcamentos")
        .onDelete("CASCADE");
    });
  }

  down() {
    this.table("contas_receber", (table) => {
      table.dropColumn("orcamento_id");
    });

    this.table("contas_pagar", (table) => {
      table.dropColumn("orcamento_id");
    });
  }
}

module.exports = AddOrcamentoIdToFinancialTablesSchema;
