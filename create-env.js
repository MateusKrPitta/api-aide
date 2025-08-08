const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

// Variáveis OBRIGATÓRIAS com fallback explícito
const envConfig = {
  APP_KEY: process.env.APP_KEY || "2fb8656a827a63a89400fb24bbe449d7",
  NODE_ENV: process.env.NODE_ENV || "production",
  DB_CONNECTION: "pg",
  DB_HOST:
    process.env.RAILWAY_PRIVATE_DOMAIN || "containers-us-west-146.railway.app",
  DB_PORT: "5432",
  DB_USER: "postgres",
  DB_PASSWORD:
    process.env.POSTGRES_PASSWORD || "ddMJXlrrubZYwxZNaiMIBmNunCXsQdSX",
  DB_DATABASE: "railway",
  HASH_DRIVER: "bcrypt",
};

// Garante valores não-undefined
let envContent = "";
Object.entries(envConfig).forEach(([key, value]) => {
  envContent += `${key}=${value}\n`;
});

fs.writeFileSync(envPath, envContent);
console.log("✅ .env criado com:", Object.keys(envConfig).join(", "));
