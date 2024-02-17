//
// Daria: Plugin manager
// Illia Yavdoshchuk @ 2023
//

var plugins = {}
var coverage = {}

const emptyPluginMeta = {
  id: undefined,
  name: undefined,
  description: undefined,
  author: undefined,
  version: undefined,
  coverage: undefined,
  dependencies: []
}

function makeQueue(name = undefined) {
  let queue = {
    isRunning: false,
    items: [],
    done: () => { },
    processNext: () => {
      console.log(`Processing queue${name ? " " + name : ""}: ${queue.items.length} item(s) left`);
      queue.isRunning = true;
      let task = queue.items.shift();
      if (task)
        task(queue.processNext);
      else {
        queue.done();
        queue.isRunning = false;
      }
    },
    beginProcess: () => {
      if (queue.isRunning) return;
      console.log(`Begin process queue${name ? ": " + name : ""}`);
      queue.processNext();
    }
  };

  return queue;
}

function resolveDependencies() {
  let unresolvedPlugins = {};
  let loadOrder = [];
  let queue = makeQueue("Dependency resolution");

  function process(item) {
    if (item && item.dependencies == 0) {

      // In case plugin is already in load order, but has multiple coverages
      if (unresolvedPlugins[item.id]) {
        const plugin = plugins[item.id];
        loadOrder.push(plugin.id);
        delete unresolvedPlugins[plugin.id];
        if (plugin.plugins)
          for (const id of plugin.plugins)
            delete unresolvedPlugins[id];
      }

      for (const id of item.dependats) {
        if (id in unresolvedPlugins) {
          unresolvedPlugins[id].dependencies--;
          queue.items.push(next => {
            process(unresolvedPlugins[id]);
            next();
          });
        }
      }
    }
  }

  for (const id in plugins)
    unresolvedPlugins[id] = {
      id: id,
      dependats: [],
      dependencies: plugins[id].dependencies.length
    };

  for (const id in plugins) {
    if (plugins[id].dependencies.length > 0) {
      for (const dep of plugins[id].dependencies) {
        if (dep in coverage)
          unresolvedPlugins[coverage[dep].id].dependats.push(id);
        else
          console.warn(`Missing dependency ${dep} for plugin ${id}`);
      }
    }
    else
      queue.items.push(next => {
        process(unresolvedPlugins[id]);
        next();
      });
  }

  queue.beginProcess();

  unresolvedPlugins = Object.keys(unresolvedPlugins)
  if (unresolvedPlugins.length > 0) {
    console.warn(`Failed to resolve load order for plugins: ${unresolvedPlugins.join(", ")}`)
  }

  return loadOrder;
}

function discoverPlugins(appRoot) {
  const fs = require("fs");
  const { join } = require("path");

  const pluginsPath = join(appRoot, "plugins");

  for (const candidate of fs.readdirSync(pluginsPath, { withFileTypes: true })) {
    if (candidate.isDirectory()) {
      const root = join(pluginsPath, candidate.name)

      const metaPath = join(root, "plugin.json");
      const metaFile = fs.statSync(metaPath, { throwIfNoEntry: false });

      if (metaFile && metaFile.isFile()) {
        let meta = Object.assign({}, emptyPluginMeta, require(metaPath));

        if (!meta.id) {
          console.warn(`Plugin in folder ${candidate.name} has no ID`);
          continue;
        }

        if (meta.id in plugins) {
          console.log(`Plugin with ID ${meta.id} is already discovered, possible ID collision in folder ${candidate.name}?`);
          continue;
        }

        const entryPath = meta.entry 
          ? join(root, meta.entry) 
          : join(root, "api", "index.js");
        const entryFile = fs.statSync(entryPath, { throwIfNoEntry: false });

        if (entryFile && (entryFile.isFile() || entryFile.isDirectory() && fs.existsSync(join(entryPath, "package.json"))))
          meta.entry = entryPath;
        else {
          delete meta.entry;
          console.error(`Plugin ${meta.id} has no entry file`);
        }

        plugins[meta.id] = meta;

        coverage[meta.id] = meta;
        if (meta.coverage) {
          if (!Array.isArray(meta.coverage))
            meta.coverage = [meta.coverage];
          for (const id of meta.coverage)
            coverage[id] = meta;
        }

        console.log(`Plugin ${meta.id} is discovered in folder ${candidate.name}`);
      }
      else {
        console.warn(`Plugin in folder ${candidate.name} has no metadata`);
      }
    }
    else
      console.warn(`Invalid file ${candidate.name} in plugins folder`);
  }
}

module.exports = {
  init(ctx) {
    console.log("Discovering plugins...");
    discoverPlugins(ctx.appRoot);
    console.log("Resolving load order...");
    const loadOrder = resolveDependencies();
    console.log("Load order is " + loadOrder.join(", "))
    console.log("Loading plugins...");
    for (const id of loadOrder) {
      if (id in plugins) {
        if (plugins[id].entry) {
          try {
            plugins[id].lib = require(plugins[id].entry);
          } 
          catch {}

          if (plugins[id].lib) {
            if ("init" in plugins[id].lib
            && typeof(plugins[id].lib.init) == "function") {
              let pluginCtx = {
                app: ctx.app,
                koa: ctx.koa,
                pluginManager: this,
                appRoot: ctx.appRoot,
                eventBus: ctx.eventBus
              };

              plugins[id].lib.init(pluginCtx);

              if ("router" in pluginCtx)
                ctx.router
                  .use(pluginCtx.router.routes())
                  .use(pluginCtx.router.allowedMethods());
            }
            else
              console.error(`Plugin ${id} has no entry point`);
          }
          else
            console.error(`Plugin ${id} failed to load`);
        }
      }
      else
        console.error(`Failed to load unregistered plugin ${id}`);
    }
    console.log("Plugins loaded");
    ctx.eventBus.fire("plugins-loaded");
  },

  getPluginList() {
    return plugins;
  },

  getPluginCoverageList() {
    return coverage;
  },

  getPluginById(id) {
    return plugins[id];
  },

  getPluginByCoverageId(id) {
    return coverage[id];
  },

  // Shortcut directly to module object
  getPlugin(id) {
    return this.getPluginByCoverageId(id)?.lib;
  }
}