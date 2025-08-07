"use strict";

module.exports = {
  disk: "local", // Disco padrão (pode ser 's3' para AWS)

  disks: {
    local: {
      driver: "local",
      root: "uploads", // Pasta onde os arquivos serão salvos
      visibility: "public", // Permissão pública
    },

    // Opcional: Configuração AWS S3 (descomente se for usar)
    // s3: {
    //   driver: 's3',
    //   key: process.env.AWS_S3_KEY,
    //   secret: process.env.AWS_S3_SECRET,
    //   region: process.env.AWS_S3_REGION,
    //   bucket: process.env.AWS_S3_BUCKET,
    // }
  },
};
