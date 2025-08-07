"use strict";

const Model = use("Model");

class ContaPagar extends Model {
  static get table() {
    return "contas_pagar"; // Nome exato da tabela no banco
  }
  prestador() {
    return this.belongsTo("App/Models/Prestador");
  }

  // Relacionamento com Parcelas (1 conta tem muitas parcelas)
  parcelas() {
    return this.hasMany("App/Models/ContaPagarParcela");
  }

  categoria() {
    return this.belongsTo("App/Models/Categoria");
  }
}

module.exports = ContaPagar;
