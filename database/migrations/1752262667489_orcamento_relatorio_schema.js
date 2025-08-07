"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class OrcamentoRelatorioSchema extends Schema {
  up() {
    this.create("orcamento_relatorios", (table) => {
      table.increments();
      table
        .integer("orcamento_id")
        .unsigned()
        .references("id")
        .inTable("orcamentos")
        .onDelete("CASCADE"); // ⬅ Adicione isso para integridade referencial
      table.integer("status_pagamento_prestador").defaultTo(2).notNullable();
      table.integer("status_pagamento_comissao").defaultTo(2).notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop("orcamento_relatorios");
  }
}

module.exports = OrcamentoRelatorioSchema;
