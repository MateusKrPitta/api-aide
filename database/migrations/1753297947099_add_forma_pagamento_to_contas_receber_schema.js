"use strict";

const Schema = use("Schema");

class AddFormaPagamentoToContasReceberSchema extends Schema {
  up() {
    this.table("contas_receber", (table) => {
      table.string("forma_pagamento").nullable();
    });
  }

  down() {
    this.table("contas_receber", (table) => {
      table.dropColumn("forma_pagamento");
    });
  }
}

module.exports = AddFormaPagamentoToContasReceberSchema;
