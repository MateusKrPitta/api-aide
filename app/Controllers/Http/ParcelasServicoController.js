"use strict";

const ParcelasServico = use("App/Models/ParcelasServico");

class ParcelasServicoController {
  async update({ params, request, response }) {
    try {
      const parcela = await ParcelasServico.findOrFail(params.id);

      const { status_pagamento_prestador, status_pagamento_comissao } =
        request.only([
          "status_pagamento_prestador",
          "status_pagamento_comissao",
        ]);

      if (status_pagamento_prestador !== undefined) {
        parcela.status_pagamento_prestador = status_pagamento_prestador;
      }

      if (status_pagamento_comissao !== undefined) {
        parcela.status_pagamento_comissao = status_pagamento_comissao;
      }

      await parcela.save();

      return response.status(200).json({
        message: "Parcela atualizada com sucesso",
        data: parcela,
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({
        message: "Erro ao atualizar parcela",
        error: error.message,
      });
    }
  }
}

module.exports = ParcelasServicoController;
