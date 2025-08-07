"use strict";

const Schema = use("Schema");

class AdicionarPagamentoStatusParcelaSchema extends Schema {
  up() {
    this.table("parcelas_servicos", (table) => {
      table.integer("status_pagamento_prestador").defaultTo(1); // 1 = Pendente, 2 = Pago
      table.integer("status_pagamento_comissao").defaultTo(1);
    });
  }

  down() {
    this.table("parcelas_servicos", (table) => {
      // Remove os campos se a migration for revertida
      table.dropColumn("status_pagamento_prestador");
      table.dropColumn("status_pagamento_comissao");
    });
  }
}

module.exports = AdicionarPagamentoStatusParcelaSchema;
