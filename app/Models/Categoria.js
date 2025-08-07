"use strict";

const Model = use("Model"); // Esta linha está faltando!

class Categoria extends Model {
  static get hidden() {
    return ["created_at", "updated_at"];
  }

  static get rules() {
    return {
      nome: "required|min:3|max:50|unique:categorias",
      ativo: "boolean",
    };
  }
}

module.exports = Categoria;
