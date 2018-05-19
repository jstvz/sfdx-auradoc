const builtins = require('./builtins.json');

const DEFAULT_OPTIONS = {
  include_lightning: false,
  include_aura: false,
  include_ui: false,
  include_force: false,
}
module.exports = class ComponentFilter {
  constructor(options) {
    this.set_options(options);
    this.load_keys();
    this.add_exclusions();
  }

  set_options({
                include_lightning = false,
                include_aura = false,
                include_ui = false,
                include_force = false
              } = {}) {
    this.options = {
      lightning: include_lightning,
      aura: include_aura,
      ui: include_ui,
      force: include_force
    };
  }

  load_keys() {
    this.always_ignore = new Set(builtins.alwaysIgnore);
    this.bad_keys = new Set(builtins.alwaysIgnore);

    let all = builtins.lightningKeys
      .concat(builtins.auraKeys)
      .concat(builtins.uiKeys)
      .concat(builtins.forceKeys);
    for (let k of all) {
      this.bad_keys.add(k);
    }
  }

  add_exclusions() {
    if (this.options.lightning) {
      this.remove_keys(builtins.lightningKeys);
    }
    if (this.options.aura) {
      this.remove_keys(builtins.auraKeys);
    }
    if (this.options.ui) {
      this.remove_keys(builtins.uiKeys);
    }
    if (this.options.force) {
      this.remove_keys(builtins.forceKeys);
    }
  }

  remove_keys(keys_to_include) {
    keys_to_include.forEach(x => this.bad_keys.delete(x));
  }

  isAlwaysIgnored(key) {
    return this.always_ignore.has(key.toLowerCase());
  }

  isIgnored(key) {
    return this.bad_keys.has(key.toLowerCase()) || !key.includes(':');
  }
}
