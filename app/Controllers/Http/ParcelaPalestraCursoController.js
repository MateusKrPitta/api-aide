"use strict";

const ParcelaPalestraCurso = use("App/Models/ParcelaPalestraCurso");

class ParcelaPalestraCursoController {
  async updateStatus({ params, request, response }) {
    try {
      const { id } = params;
      const { status_pagamento } = request.only(["status_pagamento"]);

      // Validação do status
      if (![1, 2].includes(Number(status_pagamento))) {
        return response.status(400).json({
          success: false,
          message: "Status inválido. Use 1 para Pago ou 2 para Pendente.",
        });
      }

      const parcela = await ParcelaPalestraCurso.findOrFail(id);

      // Atualiza apenas o status
      parcela.status_pagamento = status_pagamento;
      await parcela.save();

      return response.status(200).json({
        success: true,
        message: "Status da parcela atualizado com sucesso.",
        data: parcela,
      });
    } catch (error) {
      return response.status(error.status || 500).json({
        success: false,
        message: "Erro ao atualizar status da parcela.",
        error: error.message,
      });
    }
  }
}

module.exports = ParcelaPalestraCursoController;
