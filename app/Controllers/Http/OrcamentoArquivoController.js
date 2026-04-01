"use strict";

const OrcamentoArquivo = use("App/Models/OrcamentoArquivo");
const Helpers = use("Helpers");

class OrcamentoArquivoController {
  async index({ params, response }) {
    const arquivos = await OrcamentoArquivo.query()
      .where("orcamento_id", params.orcamento_id)
      .fetch();

    return response.json(arquivos);
  }

  async download({ params, response }) {
    const arquivo = await OrcamentoArquivo.findOrFail(params.id);
    const filePath = Helpers.tmpPath(
      `uploads/orcamentos/${arquivo.caminho_arquivo}`,
    );

    return response.download(filePath, arquivo.nome_arquivo);
  }

  async destroy({ params, response }) {
    const arquivo = await OrcamentoArquivo.findOrFail(params.id);
    const fs = Helpers.promisify(require("fs"));

    try {
      const filePath = Helpers.tmpPath(
        `uploads/orcamentos/${arquivo.caminho_arquivo}`,
      );
      await fs.unlink(filePath);
      await arquivo.delete();

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
