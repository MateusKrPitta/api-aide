"use strict";

const Schema = use("Schema");

class ParcelasServicosSchema extends Schema {
  up() {
    this.create("parcelas_servicos", (table) => {
      table.increments();
      table
        .integer("orcamento_servico_id")
        .unsigned()
        .references("id")
        .inTable("orcamento_servicos")
        .onDelete("CASCADE");

      table.integer("numero_parcela").notNullable(); // Ex: 1, 2, 3...
      table.date("data_pagamento").notNullable();

      table.decimal("valor_parcela", 10, 2).notNullable();
      table.decimal("valor_prestador", 10, 2).notNullable();
      table.decimal("valor_comissao", 10, 2).notNullable();

      table.boolean("pago").defaultTo(false);
      table.timestamps();
    });
  }

  down() {
    this.drop("parcelas_servicos");
  }
}

module.exports = ParcelasServicosSchema;
