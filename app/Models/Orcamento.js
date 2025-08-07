// app/Models/Orcamento.js

"use strict";

const Model = use("Model");

class Orcamento extends Model {
  cliente() {
    return this.belongsTo("App/Models/Cliente");
  }

  prestadores() {
    return this.hasMany("App/Models/OrcamentoPrestador");
  }

  arquivos() {
    return this.hasMany("App/Models/OrcamentoArquivo"); // ⬅ Aqui está o que falta
  }
  relatorios() {
    return this.hasMany("App/Models/OrcamentoRelatorio");
  }
}

module.exports = Orcamento;
