"use strict";

const Model = use("Model");

class ParcelasServico extends Model {
  static get fillable() {
    return [
      "id",
      "orcamento_servico_id",
      "numero_parcela",
      "data_pagamento",
      "valor_parcela",
      "valor_prestador",
      "valor_comissao",
      "status_pagamento_prestador",
      "status_pagamento_comissao",
    ];
  }

  orcamentoServico() {
    return this.belongsTo(
      "App/Models/OrcamentoServico",
      "orcamento_servico_id",
      "id",
    );
  }
}

module.exports = ParcelasServico;
