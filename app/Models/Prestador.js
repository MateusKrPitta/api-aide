"use strict";

const Model = use("Model");

class Prestador extends Model {
  static get table() {
    return "prestadores";
  }

  static get hidden() {
    return ["created_at", "updated_at"];
  }

  servicos() {
    return this.belongsToMany(
      "App/Models/Servico",
      "prestador_id",
      "servico_id",
      "id",
      "id"
    ).pivotTable("prestador_servico");
  }
}

module.exports = Prestador;
