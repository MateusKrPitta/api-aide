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
    return this.hasMany(
      "App/Models/ContaReceberParcela",
      "id",
      "conta_receber_id"
    );
  }

  static get createdAtColumn() {
    return null; // Se não usar timestamps
  }

  static get updatedAtColumn() {
    return null; // Se não usar timestamps
  }

  prestador() {
    return this.belongsTo("App/Models/Prestador");
  }
}

module.exports = ContaReceber;
