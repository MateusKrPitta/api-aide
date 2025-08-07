"use strict";

const Schema = use("Schema");

class ParcelaPalestraCursosSchema extends Schema {
  up() {
    this.create("parcela_palestra_cursos", (table) => {
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
      table.enu("status_pagamento", [1, 2]).defaultTo(2); // 1 = Pago, 2 = Pendente
      table.timestamps();
    });
  }

  down() {
    this.drop("parcela_palestra_cursos");
  }
}

module.exports = ParcelaPalestraCursosSchema;
