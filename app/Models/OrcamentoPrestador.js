"use strict";

const Model = use("Model");

class OrcamentoPrestador extends Model {
  static get table() {
    return "orcamento_prestadores";
  }

  // Configuração de timestamps (opcional, já que você está usando os nomes padrão)
  static get createdAtColumn() {
    return "created_at";
  }

  static get updatedAtColumn() {
    return "updated_at";
  }

  // Adicione isso para os campos de status
  static get paymentStatus() {
    return {
      PAGO: 1,
      PENDENTE: 2,
    };
  }

  // Relacionamentos
  orcamento() {
    return this.belongsTo("App/Models/Orcamento");
  }

  prestador() {
    return this.belongsTo("App/Models/Prestador");
  }

  servicos() {
    return this.hasMany("App/Models/OrcamentoServico");
  }

  // Método para verificar status (opcional, mas útil)
  isPago(tipo = "prestador") {
    return tipo === "prestador"
      ? this.status_pagamento_prestador === this.constructor.paymentStatus.PAGO
      : this.status_pagamento_comissao === this.constructor.paymentStatus.PAGO;
  }
}

module.exports = OrcamentoPrestador;
