"use strict";

const Model = use("Model");

class ContaPagar extends Model {
  static get table() {
    return "contas_pagar";
  }

  static boot() {
    super.boot();

    this.addHook("beforeSave", async (contaInstance) => {
      if (contaInstance.custo_variavel && contaInstance.status_pagamento) {
        contaInstance.status_geral = contaInstance.status_pagamento;
      }
    });
  }

  static get fillable() {
    return [
      "nome",
      "custo_fixo",
      "custo_variavel",
      "prestador_id",
      "data_inicio",
      "data_fim",
      "valor_mensal",
      "valor_total",
      "status_geral",
      "categoria_id",
      "status_pagamento",
      "data_pagamento",
      "forma_pagamento",
    ];
  }

  static get casts() {
    return {
      custo_fixo: "boolean",
      custo_variavel: "boolean",
      status_geral: "integer",
      status_pagamento: "integer",
      valor_mensal: "number",
      valor_total: "number",
    };
  }

  prestador() {
    return this.belongsTo("App/Models/Prestador");
  }

  parcelas() {
    return this.hasMany("App/Models/ContaPagarParcela");
  }

  categoria() {
    return this.belongsTo("App/Models/Categoria");
  }
}

module.exports = ContaPagar;
