"use strict";

const Schema = use("Schema");

class FixMissingColumnsSchema extends Schema {
  async up() {
    // 1. Adicionar CEP em Clientes
    const hasCepClientes = await this.hasColumn("clientes", "cep");
    if (!hasCepClientes) {
      this.table("clientes", (table) => {
        table.string("cep", 9).nullable();
      });
    }

    // 2. Adicionar CEP em Prestadores
    const hasCepPrestadores = await this.hasColumn("prestadores", "cep");
    if (!hasCepPrestadores) {
      this.table("prestadores", (table) => {
        table.string("cep", 9).nullable();
      });
    }

    // 3. Adicionar colunas em Contas a Pagar
    const hasDataPagamentoCP = await this.hasColumn("contas_pagar", "data_pagamento");
    if (!hasDataPagamentoCP) {
      this.table("contas_pagar", (table) => {
        table.date("data_pagamento").nullable();
      });
    }
    const hasFormaPagamentoCP = await this.hasColumn("contas_pagar", "forma_pagamento");
    if (!hasFormaPagamentoCP) {
      this.table("contas_pagar", (table) => {
        table.integer("forma_pagamento").unsigned().nullable();
      });
    }
    const hasQtdParcelasCP = await this.hasColumn("contas_pagar", "quantidade_parcelas");
    if (!hasQtdParcelasCP) {
      this.table("contas_pagar", (table) => {
        table.integer("quantidade_parcelas").unsigned().defaultTo(1);
      });
    }

    // 4. Adicionar colunas em Contas a Receber
    const hasDataPagamentoCR = await this.hasColumn("contas_receber", "data_pagamento");
    if (!hasDataPagamentoCR) {
      this.table("contas_receber", (table) => {
        table.date("data_pagamento").nullable();
      });
    }
    const hasFormaPagamentoCR = await this.hasColumn("contas_receber", "forma_pagamento");
    if (!hasFormaPagamentoCR) {
      this.table("contas_receber", (table) => {
        table.integer("forma_pagamento").unsigned().nullable();
      });
    }
    const hasQtdParcelasCR = await this.hasColumn("contas_receber", "quantidade_parcelas");
    if (!hasQtdParcelasCR) {
      this.table("contas_receber", (table) => {
        table.integer("quantidade_parcelas").unsigned().defaultTo(1);
      });
    }

    // 5. Adicionar colunas em Movimentações
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
    // No down, poderíamos remover, mas como é uma correção de estrutura essencial, 
    // geralmente mantemos para evitar perda de dados em rollback acidental.
  }
}

module.exports = FixMissingColumnsSchema;
