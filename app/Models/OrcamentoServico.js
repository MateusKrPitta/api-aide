"use strict";

const Model = use("Model");
const ParcelasServico = use("App/Models/ParcelasServico");
const moment = require("moment");

class OrcamentoServico extends Model {
  static get table() {
    return "orcamento_servicos";
  }

  static boot() {
    super.boot();

    // Hook para gerar parcelas automaticamente
    // this.addHook("afterCreate", async (servicoInstance) => {
    //   const {
    //     numero_parcelas,
    //     valor_total,
    //     valor_prestador,
    //     comissao,
    //     data_pagamento,
    //   } = servicoInstance;

    //   const totalParcelas = numero_parcelas || 1;
    //   const valorParcela = parseFloat(valor_total) / totalParcelas;
    //   const valorPrestadorParcela = parseFloat(valor_prestador) / totalParcelas;
    //   const valorComissaoParcela = parseFloat(comissao) / totalParcelas;

    //   for (let i = 0; i < totalParcelas; i++) {
    //     await ParcelasServico.create({
    //       orcamento_servico_id: servicoInstance.id,
    //       numero_parcela: i + 1,
    //       data_pagamento: moment(data_pagamento)
    //         .add(i, "months")
    //         .format("YYYY-MM-DD"),
    //       valor_parcela: valorParcela.toFixed(2),
    //       valor_prestador: valorPrestadorParcela.toFixed(2),
    //       valor_comissao: valorComissaoParcela.toFixed(2),
    //     });
    //   }
    // });
  }

  // Relacionamento com orcamento_prestadores
  orcamentoPrestador() {
    return this.belongsTo("App/Models/OrcamentoPrestador");
  }

  // Relacionamento com servico
  servico() {
    return this.belongsTo("App/Models/Servico");
  }

  // Relacionamento com parcelas
  parcelas() {
    return this.hasMany(
      "App/Models/ParcelasServico",
      "id",
      "orcamento_servico_id"
    );
  }
}

module.exports = OrcamentoServico;
