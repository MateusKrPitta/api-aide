const Database = use("Database");

async function check() {
  try {
    const id = 64;
    console.log(`Checking Orcamento ID: ${id}`);

    const crParcelas = await Database.table('contas_receber_parcelas')
      .join('contas_receber', 'contas_receber_parcelas.conta_receber_id', 'contas_receber.id')
      .where('contas_receber.orcamento_id', id)
      .select('contas_receber_parcelas.id', 'contas_receber_parcelas.status', 'contas_receber_parcelas.status_pagamento');
    
    console.log('--- Contas Receber Parcelas ---');
    console.log(JSON.stringify(crParcelas, null, 2));

    const cpParcelas = await Database.table('contas_pagar_parcelas')
      .join('contas_pagar', 'contas_pagar_parcelas.conta_pagar_id', 'contas_pagar.id')
      .where('contas_pagar.orcamento_id', id)
      .select('contas_pagar_parcelas.id', 'contas_pagar_parcelas.status');
    
    console.log('--- Contas Pagar Parcelas ---');
    console.log(JSON.stringify(cpParcelas, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
