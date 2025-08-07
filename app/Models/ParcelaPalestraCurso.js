"use strict";

const Model = use("Model");

class ParcelaPalestraCurso extends Model {
  static boot() {
    super.boot();

    // Validação antes de salvar
    this.addHook("beforeSave", async (parcelaInstance) => {
      if (
        parcelaInstance.status_pagamento &&
        ![1, 2].includes(parcelaInstance.status_pagamento)
      ) {
        throw new Error(
          "Status de pagamento inválido. Use 1 (Pago) ou 2 (Pendente)."
        );
      }
    });
  }

  static get table() {
    return "parcela_palestra_cursos";
  }

  palestraCurso() {
    return this.belongsTo(
      "App/Models/PalestraCurso",
      "palestra_curso_id",
      "id"
    );
  }
}

module.exports = ParcelaPalestraCurso;
