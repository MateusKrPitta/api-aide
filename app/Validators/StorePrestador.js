"use strict";

class StorePrestador {
  get rules() {
    return {
      nome: "required|string",
      telefone: "required|string",
      cpf: "required|string|unique:prestadores",
      email: "required|email|unique:prestadores",
      servicos: "array",
      // ... adicione outras regras conforme necessário
    };
  }

  get messages() {
    return {
      "nome.required": "O nome é obrigatório",
      "cpf.unique": "CPF já cadastrado",
      // ... mensagens customizadas
    };
  }
}

module.exports = StorePrestador;
