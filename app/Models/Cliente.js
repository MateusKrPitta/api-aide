"use strict";

const Model = use("Model");

class Cliente extends Model {
  static get table() {
    return "clientes";
  }

  static get hidden() {
    return ["created_at", "updated_at"];
  }

  static get fillable() {
    return [
      "nome",
      "telefone",
      "cpf_cnpj",
      "email",
      "estado",
      "cidade",
      "endereco",
      "numero",
      "complemento",
      "responsavel",
      "ativo",
      "cep",
    ];
  }
}

module.exports = Cliente;
