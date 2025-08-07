"use strict";

const Schema = use("Schema");

class CreateOrcamentoServicosTable extends Schema {
  up() {
    this.create("orcamento_servicos", (table) => {
      table.increments();
      table
        .integer("orcamento_prestador_id")
        .unsigned()
        .references("id")
        .inTable("orcamento_prestadores")
        .onDelete("CASCADE");
      table
        .integer("servico_id")
        .unsigned()
        .references("id")
        .inTable("servicos")
        .onDelete("CASCADE");
      table.integer("tipo_pagamento").notNullable(); // 1 à vista, 2 parcelado
      table.integer("metodo_pagamento").notNullable(); // 1 dinheiro, 2 pix, 3 débito, 4 crédito, 5 cheque
      table.integer("numero_parcelas").defaultTo(1);
      table.decimal("valor_total", 10, 2).notNullable();
      table.decimal("valor_parcela", 10, 2);
      table.decimal("comissao", 10, 2);
      table.decimal("valor_prestador", 10, 2);
      table.date("data_inicio").notNullable();
      table.date("data_entrega").notNullable();
      table.date("data_pagamento").notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop("orcamento_servicos");
  }
}

module.exports = CreateOrcamentoServicosTable;
