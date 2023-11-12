//
// Storage manager
//

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join, dirname } = require("path");

var storages = {};
var storagesLocation = undefined;

module.exports = {
  getStorage(path, storageDefaults = {}, customPath = false) {
    if (!customPath)
      path = join(storagesLocation, path);

    if (!path.endsWith(".json") && !customPath)
      path += ".json";

    if (path in storages)
      return storages[path];

    let storage = { load, save, drop };

    function load(loadDeafults = {}) {
      console.log(`Loading storage: ${path}`);

      for (const key in storage)
        delete storage[key];

      Object.assign(storage, storageDefaults, loadDeafults, JSON.parse(safeReadFileSync(path)));
      storage.load = load;
      storage.save = save;
      storage.drop = drop;
    }

    function save() {
      console.log(`Saving storage: ${path}`);
      safeWriteFileSync(path, storage);
    }

    function drop(save = true) {
      module.exports.dropStorage(path, save);
    }

    function safeReadFileSync(path) {
      try {
        return readFileSync(path, { encoding: "utf-8" });
      }
      catch {
        return "{}";
      }
    }

    function safeWriteFileSync(path, data) {
      const stageDir = dirname(path);
      if (!existsSync(stageDir))
        mkdirSync(stageDir, { recursive: true });

      try {
        return writeFileSync(path, JSON.stringify(data, null, 4), { encoding: "utf-8" });
      }
      catch {}
    }

    storages[path] = storage;
    return storage;
  },

  dropStorage(path, save = true) {
    if (path in storages) {
      console.log(`Dropping storage: ${path}`);
      if (save)
        storages[path].save();
      delete storages[path];
    }
  },

  init(ctx) {
    storagesLocation = join(ctx.appRoot, "storage");
  }
}