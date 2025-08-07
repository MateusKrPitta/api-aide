"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class AddPaymentStatusToOrcamentoPrestadoresSchema extends Schema {
  up() {
    this.table("orcamento_prestadores", (table) => {
      table.integer("status_pagamento_prestador").defaultTo(2);
      table.integer("status_pagamento_comissao").defaultTo(2);
    });
  }

  down() {
    this.table("orcamento_prestadores", (table) => {
      table.dropColumn("status_pagamento_prestador");
      table.dropColumn("status_pagamento_comissao");
    });
  }
}

module.exports = AddPaymentStatusToOrcamentoPrestadoresSchema;
