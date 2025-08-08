const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

// Mapeamento das variáveis do Railway para o formato do AdonisJS
const envConfig = {
  APP_KEY: process.env.APP_KEY || "sua-chave-aqui-32-caracteres", // Chave obrigatória
  DB_CONNECTION: "pg",
  DB_HOST:
    process.env.PGHOST || process.env.RAILWAY_PRIVATE_DOMAIN || "localhost",
  DB_PORT: process.env.PGPORT || "5432",
  DB_USER: process.env.PGUSER || process.env.POSTGRES_USER || "postgres",
  DB_PASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "",
  DB_DATABASE: process.env.PGDATABASE || process.env.POSTGRES_DB || "railway",
  // Adicione outras variáveis necessárias para sua aplicação
};

// Gera o conteúdo do .env
let envContent = "";
for (const [key, value] of Object.entries(envConfig)) {
  envContent += `${key}=${value}\n`;
}

// Escreve o arquivo .env
fs.writeFileSync(envPath, envContent.trim());

console.log(
  "✅ Arquivo .env criado com sucesso com as seguintes configurações:"
);
console.log(envContent);
