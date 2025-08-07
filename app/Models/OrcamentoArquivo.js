"use strict";

const Model = use("Model");

class OrcamentoArquivo extends Model {
  // Relação com Orcamento (um arquivo pertence a um orçamento)
  orcamento() {
    return this.belongsTo("App/Models/Orcamento");
  }

  // Método para URL de download (opcional)
  static get computed() {
    return ["url"];
  }

  getUrl({ id }) {
    return `/orcamentos/arquivos/${id}/download`;
  }
}

module.exports = OrcamentoArquivo;
