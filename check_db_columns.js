"use strict";

const Database = use("Database");

async function checkTable() {
  try {
    const columns = await Database.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'orcamento_servicos'");
    console.log("Colunas encontradas:", columns.rows.map(r => r.column_name));
    process.exit(0);
  } catch (error) {
    console.error("Erro ao verificar tabela:", error);
    process.exit(1);
  }
}

checkTable();
