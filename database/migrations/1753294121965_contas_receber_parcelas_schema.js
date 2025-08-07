"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class ContasReceberParcelasSchema extends Schema {
  up() {
    this.create("contas_receber_parcelas", (table) => {
      table.increments();
      table
        .integer("conta_receber_id")
        .unsigned()
        .references("id")
        .inTable("contas_receber")
        .onDelete("CASCADE");
      table.string("descricao").notNullable();
      table.date("data_vencimento").notNullable();
      table.date("data_pagamento").nullable();
      table.integer("status").defaultTo(1); // 1 = pendente, 2 = pago
      table.integer("status_pagamento").defaultTo(1); // 1 = pendente, 2 = pago (pode ser redundante com status)
      table
        .enum("forma_pagamento", ["1", "2", "3", "4", "5"])
        .nullable()
        .comment("1 = pix, 2 = dinheiro, 3 = crédito, 4 = débito, 5 = cheque");
      table.decimal("valor", 10, 2).notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop("contas_receber_parcelas");
  }
}

module.exports = ContasReceberParcelasSchema;
