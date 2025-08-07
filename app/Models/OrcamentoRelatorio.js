"use strict";

const Model = use("Model"); // ✅ IMPORTANTE!

class OrcamentoRelatorio extends Model {
  static get table() {
    return "orcamento_relatorios";
  }

  static get createdAtColumn() {
    return "created_at";
  }

  static get updatedAtColumn() {
    return "updated_at";
  }

  static get STATUS() {
    return {
      PAGO: 1,
      PENDENTE: 2,
    };
  }

  orcamento() {
    return this.belongsTo("App/Models/Orcamento");
  }

  static get hidden() {
    return ["created_at", "updated_at"];
  }
}

module.exports = OrcamentoRelatorio;
