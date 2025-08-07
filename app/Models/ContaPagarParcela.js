"use strict";

const Model = use("Model");

class ContaPagarParcela extends Model {
  static get table() {
    return "contas_pagar_parcelas";
  }

  // Especifique o nome exato da coluna de relacionamento
  static get foreignKey() {
    return "conta_pagar_id"; // ou o nome que está no banco
  }

  conta() {
    return this.belongsTo("App/Models/ContaPagar");
  }

  static get computed() {
    return ["status_pagamento"];
  }

  getStatusPagamento({ status }) {
    return status; // Ou faça um mapeamento se necessário (ex: status 3 → 1)
  }
}

module.exports = ContaPagarParcela;
