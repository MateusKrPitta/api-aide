"use strict";

const Model = use("Model");

class ContaPagarParcela extends Model {
  static get table() {
    return "contas_pagar_parcelas";
  }

  static get foreignKey() {
    return "conta_pagar_id";
  }

  conta() {
    return this.belongsTo("App/Models/ContaPagar");
  }

  static get computed() {
    return ["status_pagamento"];
  }

  getStatusPagamento({ status }) {
    return status;
  }
}

module.exports = ContaPagarParcela;
