"use strict";

const Schema = use("Schema");

class AddMissingToMovimentacoesSchema extends Schema {
  async up() {
    const hasDataVencimentoMov = await this.hasColumn("movimentacoes", "data_vencimento");
    if (!hasDataVencimentoMov) {
      this.table("movimentacoes", (table) => {
        table.date("data_vencimento").nullable();
      });
    }

    const hasStatusMov = await this.hasColumn("movimentacoes", "status");
    if (!hasStatusMov) {
      this.table("movimentacoes", (table) => {
        table.integer("status").unsigned().defaultTo(1);
      });
    }

    const hasDataPagamentoMov = await this.hasColumn("movimentacoes", "data_pagamento");
    if (!hasDataPagamentoMov) {
      this.table("movimentacoes", (table) => {
        table.date("data_pagamento").nullable();
      });
    }
  }

  down() {
  }
}

module.exports = AddMissingToMovimentacoesSchema;
