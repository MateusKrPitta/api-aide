"use strict";

const Model = use("Model");

class Cliente extends Model {
  static get table() {
    return "clientes";
  }

  static get hidden() {
    return ["created_at", "updated_at"];
  }
}

module.exports = Cliente;
