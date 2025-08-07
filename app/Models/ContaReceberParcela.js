"use strict";

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use("Model");

class ContaReceberParcela extends Model {
  static get table() {
    return "contas_receber_parcelas"; // precisa bater com o nome da tabela no banco
  }
  conta() {
    return this.belongsTo("App/Models/ContaReceber", "conta_receber_id", "id");
  }
}

module.exports = ContaReceberParcela;
