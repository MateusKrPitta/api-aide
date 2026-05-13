"use strict";

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use("Model");

class ContaReceber extends Model {
  static get table() {
    return "contas_receber";
  }

  categoria() {
    return this.belongsTo("App/Models/Categoria");
  }

  parcelas() {
    return this.hasMany("App/Models/ContaReceberParcela");
  }

  static get createdAtColumn() {
    return null;
  }

  static get updatedAtColumn() {
    return null;
  }

  prestador() {
    return this.belongsTo("App/Models/Prestador");
  }

  orcamento() {
    return this.belongsTo("App/Models/Orcamento");
  }

  palestraCurso() {
    return this.belongsTo("App/Models/PalestraCurso");
  }
}

module.exports = ContaReceber;
