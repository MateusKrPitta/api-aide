"use strict";

const Model = use("Model");

class OrcamentoArquivo extends Model {
  orcamento() {
    return this.belongsTo("App/Models/Orcamento");
  }

  static get computed() {
    return ["url"];
  }

  getUrl({ id }) {
    return `/orcamentos/arquivos/${id}/download`;
  }
}

module.exports = OrcamentoArquivo;
