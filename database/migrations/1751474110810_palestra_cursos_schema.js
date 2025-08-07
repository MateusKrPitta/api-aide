"use strict";

const Schema = use("Schema");

class PalestraCursosSchema extends Schema {
  up() {
    this.create("palestra_cursos", (table) => {
      table.increments();
      table.string("nome", 100).notNullable();
      table
        .integer("tipo_palestra_id")
        .unsigned()
        .references("id")
        .inTable("tipo_palestras")
        .onDelete("CASCADE")
        .notNullable();
      table
        .integer("cliente_id")
        .unsigned()
        .references("id")
        .inTable("clientes")
        .onDelete("CASCADE")
        .notNullable();
      table.string("endereco", 255).notNullable();
      table.date("data").notNullable();
      table.time("horario").notNullable();
      table.integer("secoes").notNullable();
      table.decimal("valor", 10, 2).notNullable();
      table.enu("status_pagamento", [1, 2, 3]).defaultTo(1);
      table.enu("tipo_pagamento", [1, 2]).notNullable();
      table.enu("forma_pagamento", [1, 2, 3, 4, 5]).notNullable();
      table.integer("qtd_parcelas").defaultTo(1);
      table.decimal("valor_parcela", 10, 2).defaultTo(0);
      table.date("primeira_data_parcela");
      table.boolean("ativo").defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop("palestra_cursos");
  }
}

module.exports = PalestraCursosSchema;
