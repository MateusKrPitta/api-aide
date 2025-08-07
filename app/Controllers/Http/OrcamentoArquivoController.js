"use strict";

const OrcamentoArquivo = use("App/Models/OrcamentoArquivo");
const Helpers = use("Helpers");

class OrcamentoArquivoController {
  // Listar arquivos de um orçamento
  async index({ params, response }) {
    const arquivos = await OrcamentoArquivo.query()
      .where("orcamento_id", params.orcamento_id)
      .fetch();

    return response.json(arquivos);
  }

  // Download de um arquivo específico
  async download({ params, response }) {
    const arquivo = await OrcamentoArquivo.findOrFail(params.id);
    const filePath = Helpers.tmpPath(
      `uploads/orcamentos/${arquivo.caminho_arquivo}`
    );

    return response.download(filePath, arquivo.nome_arquivo);
  }

  // Deletar um arquivo
  async destroy({ params, response }) {
    const arquivo = await OrcamentoArquivo.findOrFail(params.id);
    const fs = Helpers.promisify(require("fs"));

    try {
      const filePath = Helpers.tmpPath(
        `uploads/orcamentos/${arquivo.caminho_arquivo}`
      );
      await fs.unlink(filePath); // Remove o arquivo físico
      await arquivo.delete(); // Remove do banco de dados

      return response.json({ success: true, message: "Arquivo removido" });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: "Erro ao remover arquivo",
        error: error.message,
      });
    }
  }
}

module.exports = OrcamentoArquivoController;
