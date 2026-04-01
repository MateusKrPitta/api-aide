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
    return this.hasMany("App/Models/OrcamentoArquivo");
  }
  relatorios() {
    return this.hasMany("App/Models/OrcamentoRelatorio");
  }
}

module.exports = Orcamento;
