"use strict";

const Schema = use("Schema");

class CreateOrcamentoArquivosTable extends Schema {
  up() {
    this.create("orcamento_arquivos", (table) => {
      table.increments();
      table
        .integer("orcamento_id")
        .unsigned()
        .references("id")
        .inTable("orcamentos")
        .onDelete("CASCADE");
      table.string("nome_arquivo", 255).notNullable();
      table.string("caminho_arquivo", 255).notNullable();
      table.string("mime_type", 100).notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop("orcamento_arquivos");
  }
}

module.exports = CreateOrcamentoArquivosTable;
