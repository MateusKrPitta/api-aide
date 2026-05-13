const Database = use("Database");
const ContaPagar = use("App/Models/ContaPagar");

async function dump() {
  try {
    const contas = await Database.table('contas_pagar')
      .where('nome', 'LIKE', '%teste%')
      .select('*');
    
    console.log('--- CONTAS PAGAR ---');
    console.log(JSON.stringify(contas, null, 2));

    const orcamentos = await Database.table('orcamentos')
      .select('*');
    console.log('--- ORCAMENTOS ---');
    console.log(JSON.stringify(orcamentos, null, 2));

    const servicos = await Database.table('orcamento_servicos')
      .select('*');
    console.log('--- ORCAMENTO SERVICOS ---');
    console.log(JSON.stringify(servicos, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

dump();
