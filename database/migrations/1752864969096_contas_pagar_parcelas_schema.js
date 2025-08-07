"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class CreateContasPagarParcelasSchema extends Schema {
  up() {
    this.create("contas_pagar_parcelas", (table) => {
      table.increments();

      // Relacionamento com a conta principal
      table
        .integer("conta_pagar_id")
        .unsigned()
        .references("id")
        .inTable("contas_pagar")
        .onDelete("CASCADE");

      // Identificação da parcela (ex: "Parcela 01/2025")
      table.string("descricao", 100).notNullable();

      // Datas de vencimento e pagamento
      table.date("data_vencimento").notNullable();
      table.date("data_pagamento").nullable();

      // Status: 1-pendente, 2-andamento, 3-pago
      table.integer("status").unsigned().defaultTo(1);

      // Forma de pagamento: 1-crédito, 2-débito, 3-cheque, 4-pix, 5-dinheiro
      table.integer("forma_pagamento").unsigned().nullable();

      // Valor da parcela
      table.decimal("valor", 15, 2).notNullable();

      table.timestamps();
    });
  }

  down() {
    this.drop("contas_pagar_parcelas");
  }
}

module.exports = CreateContasPagarParcelasSchema;
