"use strict";

const Model = use("Model");

class TipoPalestra extends Model {
  static get table() {
    return "tipo_palestras";
  }

  static get hidden() {
    return ["created_at", "updated_at"];
  }
}

module.exports = TipoPalestra;
