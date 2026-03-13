"use strict";

const fs = require("node:fs");
const path = require("node:path");

class JsonFileStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
  }

  save(state) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }
}

module.exports = {
  JsonFileStore
};
