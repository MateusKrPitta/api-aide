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
  }

  orcamentoPrestador() {
    return this.belongsTo("App/Models/OrcamentoPrestador");
  }

  servico() {
    return this.belongsTo("App/Models/Servico");
  }

  parcelas() {
    return this.hasMany(
      "App/Models/ParcelasServico",
      "id",
      "orcamento_servico_id",
    );
  }
}

module.exports = OrcamentoServico;
