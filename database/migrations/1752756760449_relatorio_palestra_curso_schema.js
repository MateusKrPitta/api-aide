"use strict";

const Schema = use("Schema");

class RelatorioPalestraCursoSchema extends Schema {
  up() {
    this.create("relatorio_palestra_cursos", (table) => {
      table.increments();
      table
        .integer("palestra_curso_id")
        .unsigned()
        .references("id")
        .inTable("palestra_cursos")
        .onDelete("CASCADE")
        .notNullable();
      table.integer("numero_parcela").notNullable();
      table.decimal("valor", 10, 2).notNullable();
      table.date("data_vencimento").notNullable();
      table.date("data_pagamento").nullable();
      table.enu("status_pagamento", [1, 2, 3]).defaultTo(2); // 1=Pago, 2=Pendente, 3=Atrasado
      table.string("comprovante_path").nullable();
      table.text("observacoes").nullable();
      table.timestamps();
    });
  }

  down() {
    this.drop("relatorio_palestra_cursos");
  }
}

module.exports = RelatorioPalestraCursoSchema;
