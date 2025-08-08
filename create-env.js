const fs = require("fs");

const envVars = `
APP_NAME=AdonisJs
APP_ENV=production
APP_KEY=adc09a89cd98a6aca5d835d9b0b48e5b8cdce62ac955f5193e742685d9bae075
APP_DEBUG=false
HOST=0.0.0.0
PORT=8080
NODE_ENV=production

DB_CONNECTION=pg
DB_HOST=${process.env.PGHOST || process.env.DB_HOST}
DB_PORT=${process.env.PGPORT || process.env.DB_PORT}
DB_USER=${process.env.PGUSER || process.env.DB_USER}
DB_PASSWORD=${process.env.PGPASSWORD || process.env.DB_PASSWORD}
DB_DATABASE=${process.env.PGDATABASE || process.env.DB_DATABASE}

# Configurações extras para evitar timeout
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

HASH_DRIVER=bcrypt
SESSION_DRIVER=cookie
`;

fs.writeFileSync(".env", envVars.trim());
console.log("✅ .env criado com sucesso!");
