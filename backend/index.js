"use strict";

const { startServer } = require("./src/server");

const port = Number(process.env.PORT ?? "3001");

startServer(port).then(({ port: activePort }) => {
  process.stdout.write(`backend listening on http://localhost:${activePort}\n`);
});
