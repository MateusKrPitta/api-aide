"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class CreateContasPagarSchema extends Schema {
  up() {
    this.create("contas_pagar", (table) => {
      table.increments();

      // Dados básicos
      table.string("nome", 255).notNullable();

      // Tipo de custo (Fixo ou Variável)
      table.boolean("custo_fixo").defaultTo(false);
      table.boolean("custo_variavel").defaultTo(false);

      // Relacionamento com prestador (opcional)
      table
        .integer("prestador_id")
        .unsigned()
        .references("id")
        .inTable("prestadores")
        .onDelete("SET NULL");

      table
        .integer("categoria_id")
        .unsigned()
        .references("id")
        .inTable("categorias")
        .onDelete("SET NULL");

      // Datas (data_fim só é obrigatória se for custo_fixo)
      table.date("data_inicio").notNullable();
      table.date("data_fim").nullable();

      // Status: 1-pendente, 2-andamento, 3-pago
      table.integer("status_geral").unsigned().defaultTo(1);

      // Valores
      table.decimal("valor_mensal", 15, 2).nullable(); // Para custos fixos
      table.decimal("valor_total", 15, 2).notNullable();

      table.timestamps();
    });
  }

  down() {
    this.drop("contas_pagar");
  }
}

module.exports = CreateContasPagarSchema;
