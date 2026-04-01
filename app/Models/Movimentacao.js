"use strict";

const Model = use("Model");

class Movimentacao extends Model {
  static get table() {
    return "movimentacoes";
  }

  categoria() {
    return this.belongsTo("App/Models/Categoria", "categoria_id", "id");
  }
}

module.exports = Movimentacao;
