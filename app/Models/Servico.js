"use strict";

const Model = use("Model");

class Servico extends Model {
  categoria() {
    return this.belongsTo("App/Models/Categoria");
  }
}

module.exports = Servico;
