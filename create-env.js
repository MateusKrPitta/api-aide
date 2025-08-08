const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

// Variáveis prioritárias do Railway
const envConfig = {
  APP_KEY: process.env.APP_KEY || "2fb8656a827a63a89400fb24bbe449d7",
  NODE_ENV: "production",
  DB_CONNECTION: "pg",
  DB_HOST: process.env.PGHOST || "containers-us-west-146.railway.app", // ← Usa PGHOST do Railway
  DB_PORT: process.env.PGPORT || "5432",
  DB_USER: process.env.PGUSER || "postgres",
  DB_PASSWORD: process.env.PGPASSWORD || "ddMJXlrrubZYwxZNaiMIBmNunCXsQdSX",
  DB_DATABASE: process.env.PGDATABASE || "railway", // ← Corrigido typo (DB_DATABASE)
  HASH_DRIVER: "bcrypt",
  SESSION_DRIVER: "cookie",
};

// Filtra valores undefined e gera .env
let envContent = Object.entries(envConfig)
  .filter(([_, value]) => value !== undefined)
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");

fs.writeFileSync(envPath, envContent);
console.log("✅ .env criado com sucesso!");
console.log(envContent); // Mostra o conteúdo gerado
