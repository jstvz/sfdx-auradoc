const xml = require('xml2js');
const fs = require('fs-extra');
const path = require('path');
const ComponentFilter = require('./ComponentFilter');

const CHILD_KEY = 'children'
const XML_OPTIONS = {
  ignoreAttrs: true,
  explicitChildren: true,
  childkey: CHILD_KEY
};

module.exports = class AuraComponentGraph {
  constructor(aura_path, options) {
    this.set_options(options);
    this.aura_path = aura_path;
    this.name = '';
    this.key_set = new Set();
    this.keyFilter = new ComponentFilter(options);
  }

  set_options({
                return_full_graph = true
              } = {}) {
    this.options = {
      returnFull: return_full_graph
    };
  }

  async getFilepath() {
    let target = '';
    this.name = `c:${path.basename(this.aura_path)}`;
    let result = await fs.readdir(this.aura_path);
    for (let fname of result) {
      if (fname.endsWith('.cmp') || fname.endsWith('.app')) {
        target = fname;
        break;
      }
    }
    return path.join(this.aura_path, target);
  }

  async parse_xml(filename) {
    let xml_string = await fs.readFile(filename, 'utf8');
    xml.parseString(xml_string, XML_OPTIONS, (err, result) => {
      let root_key = result.hasOwnProperty('aura:component') ? 'aura:component' : 'aura:application';
      let root_cmp = result[root_key]
      if (root_cmp.hasOwnProperty(CHILD_KEY)) {
        let cmp = root_cmp[CHILD_KEY]
        let child_keys = this.filter_keys(Object.keys(cmp));
        this.link_keys(root_key, child_keys);
        for (let key of child_keys) {
          this.walk(cmp, key);
        }
      }
    });
  }

  async run() {
    let fname = await this.getFilepath();
    await this.parse_xml(fname);
    let graph = this.create_digraph(this.key_set);
    // console.log(graph);
    return graph;
  }

  link_keys(root_key, child_keys) {
    let ignoreRoot = this.keyFilter.isIgnored(root_key);
    let node = ignoreRoot ? this.name : root_key;
    for (let key of child_keys) {
      let keyOk = !this.keyFilter.isIgnored(key);
      if (keyOk) {
        this.key_set.add(`"${node}" -> "${key}"`);
      } else if (!ignoreRoot) {
        this.key_set.add(`"${this.name}" -> "${node}"`);
      }
    }
    //remove circular references
    this.key_set.delete(`"${this.name}" -> "${this.name}"`);
  }

  filter_keys(child_keys) {
    let out = new Array();
    child_keys.forEach((key) => {
      if (!this.keyFilter.isAlwaysIgnored(key)) {
        out.push(key);
      }
    });
    return out;
  }

  walk(obj, key) {
    let cmp = AuraComponentGraph.get_child(obj, key);
    for (let child of cmp) {
      if (child.hasOwnProperty(CHILD_KEY)) {
        let grandchildren = child[CHILD_KEY];
        let child_keys = this.filter_keys(Object.keys(grandchildren));
        this.link_keys(key, child_keys);
        child_keys.forEach((child_key) => this.walk(grandchildren, child_key));
      }
    }
  }

  static get_child(obj, key) {
    let cmp;
    if (obj.hasOwnProperty(key)) {
      cmp = obj[key];
    } else {
      cmp = obj;
    }
    return cmp;
  }

  create_digraph(nodes) {
    let graph = '';
    for (let node of nodes) {
      graph += `    ${node};\n`;
    }
    if (this.options.returnFull) {
      graph = 'digraph G {' + graph + '}';
    }
    return graph;
  }
}
