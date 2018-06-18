const Viz = require("viz.js/viz");
const cli = require("heroku-cli-util");
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const xml = require("xml2js");

export class Grapher {
  filter: ComponentFilter;
  targetdir: string;
  output_filename: string;

  constructor(path: string, svg_name: string, filter: ComponentFilter) {
    this.targetdir = path;
    this.output_filename = svg_name;
    this.filter = filter;
  }

  public async saveGraph(): Promise<string[]> {
    console.log("mapping nodes...");
    let svg = await this.createProjectGraph();
    let fileResult = await fs.writeFile(this.output_filename, svg);
    cli.open(this.output_filename);
    return [this.output_filename, svg];
  }

  private async createProjectGraph(): Promise<string> {
    let graphs: string[] = await this.createSubGraphArray();
    let joined: string = `digraph G {${graphs.join(" ")}}`;
    let svg = Viz(joined, { format: "svg", engine: "dot" });
    return svg;
  }

  private async createSubGraphArray(): Promise<string[]> {
    let graphs: string[] = [];
    let paths: string[] = glob.sync(this.targetdir);
    for (let filename of paths) {
      try {
        let grapher: AuraComponentGraph = new AuraComponentGraph(
          filename,
          this.filter
        );
        let subgraph: string = await grapher.run();
        graphs.push(subgraph);
      } catch (e) {
        if (e.code && e.code === "EISDIR") {
          // We inadvertently attempted to read a directory
        } else {
          console.error(e);
        }
      }
    }
    return graphs;
  }
}

export class AuraComponentGraph {
  public NAMESPACE: string;

  private CHILD_KEY: string;
  private XML_OPTIONS: any;
  private aura_path: string;
  private keyFilter: ComponentFilter;
  private name: string;
  private nodes: any;
  private options: any;

  // TODO: pass component filter instead of the options class, you dummy
  constructor(component_path: string, filter: ComponentFilter) {
    this.aura_path = component_path;
    this.NAMESPACE = "c"; // TODO: probably need to rethink this
    this.name = "";
    this.nodes = new Set();
    this.keyFilter = filter;
    this.CHILD_KEY = "children";
    this.XML_OPTIONS = {
      explicitChildren: true,
      childkey: this.CHILD_KEY
    };
  }

  /**
   * Parse an aura component or application XML dependencies into DOT graph.
   *
   * @this {AuraComponentGraph}
   * @return {string} an graph in DOT format
   */
  public async run(): Promise<string> {
    let fname = await this.getFilepath();
    await this.parseXml(fname);
    let graph = this.createDigraph(this.nodes);
    return graph;
  }

  private async getFilepath(): Promise<string> {
    let target = "";
    this.name = `${this.NAMESPACE}:${path.basename(this.aura_path)}`;
    let result = await fs.readdir(this.aura_path);
    for (let fname of result) {
      if (fname.endsWith(".cmp") || fname.endsWith(".app")) {
        target = fname;
        break;
      }
    }
    return path.join(this.aura_path, target);
  }

  private async parseXml(filename): Promise<void> {
    let xml_string = await fs.readFile(filename, "utf8");
    xml.parseString(xml_string, this.XML_OPTIONS, (err, result) => {
      // I forgot what this is doing
      let root_key = result.hasOwnProperty("aura:component")
        ? "aura:component"
        : "aura:application";
      let root_cmp = result[root_key];
      // extract apex controller from root and create child element
      // adopt apex: namespace for tagging controllers
      if(root_cmp.hasOwnProperty('$') && root_cmp.$.hasOwnProperty('controller')){
        root_cmp[this.CHILD_KEY]['apex:'+root_cmp.$.controller] = [{}];
      }
      if (root_cmp.hasOwnProperty(this.CHILD_KEY)) {
        let cmp = root_cmp[this.CHILD_KEY];
        
        // processes aura:dependency tags
        cmp = this.promoteExplicitDependencies(cmp);
        // process aura:registerEvent and aura:handleEvent to determine event dependencies
        cmp = this.promoteEvents(cmp);
        let child_keys = this.filterKeys(Object.keys(cmp));
        this.linkToChildNodes(root_key, child_keys);
        for (let key of Object.keys(cmp)) {
          this.walk(cmp, key);
        }
      }
    });
  }

  // Extracted method to contain future logic around nested graphs for namespaces
  createDigraph(nodes: string[]): string {
    return Array.from(nodes).join("\n");
  }

  private filterKeys(child_keys): string[] {
    let out = [];
    child_keys.forEach((key) => {
      if (!this.keyFilter.isAlwaysIgnored(key)) {
        out.push(key);
      }
    });
    return out;
  }

  // for event references contained in aura:registerEvent, creates nodes for the event Type so it shows as first-level citizen
  // TODO: figure out how to tag registering an event vs handling an event, color coding maybe??
  private promoteEvents(comp): any {
    Object.keys(comp).forEach((key) => {
      if (key == 'aura:registerEvent' || key == 'aura:handler') {
        comp[key].forEach((value) => {
          let eType = '';
          if(value.$.type != undefined){
            // register event
            eType = value.$.type;
          } else if (value.$.event != undefined){
            // handle custom event
            eType = value.$.event;
          }
          if(eType != ''){
            comp['event:'+eType] = [{}];
          }
        });
      }
    });
    return comp;
  }

  private promoteExplicitDependencies(comp): any {
      if (comp.hasOwnProperty('aura:dependency')) {
        comp['aura:dependency'].forEach((value) => {
          if(value.hasOwnProperty('$') && value.$.resource != undefined && value.$.resource.length > 0){
            let c = value.$.resource.trim();
            // if component doesn't already have a reference to this object
            // we wouldn't want to get rid of valuable information
            if(!comp.hasOwnProperty(c)){
              comp[c] = [{}];
            }
          }
        });
      }
    return comp;
  }

  // TODO: Refactor this method to be more efficient
  private linkToChildNodes(root_key, child_keys): void {
    let ignoreRoot = this.keyFilter.isIgnored(root_key);
    let node = ignoreRoot ? this.name : root_key;
    for (let key of child_keys) {
      if (!this.keyFilter.isIgnored(key)) {
        this.addEdge(node, key);
      } else if (!ignoreRoot) {
        this.addEdge(this.name, node);
      }
    }
  }

  private walk(obj, key): void {
    let cmp = AuraComponentGraph.getChildComponent(obj, key);
    for (let child of cmp) {
      if (child.hasOwnProperty(this.CHILD_KEY)) {
        let grandchildren = child[this.CHILD_KEY];
        let child_keys = this.filterKeys(Object.keys(grandchildren));
        this.linkToChildNodes(key, child_keys);
        Object.keys(grandchildren).forEach((child_key) => this.walk(grandchildren, child_key));
      }
    }
  }

  private addEdge(nodeA: string, nodeB: string): void {
    let attributes = '';
    if (nodeA !== nodeB) {
      // TODO: build way to define namespace tagging for attributes
      if(nodeB.indexOf('apex:') > -1){
        attributes = ' [color=blue]';
      }
      if(nodeB.indexOf('event:') > -1){
        attributes = ' [color=red]';
      }
      this.nodes.add(`"${nodeA}" -> "${nodeB}" ${attributes};`.padStart(4, " "));
    }
  }

  static getChildComponent(obj: any, key: string): any {
    let cmp;
    if (obj.hasOwnProperty(key)) {
      cmp = obj[key];
    } else {
      cmp = obj;
    }
    return cmp;
  }
}

export class ComponentFilter {
  options: any;
  always_ignore: any;
  bad_keys: any;

  static LIGHTNING_NS: string = "lightning";
  static FORCE_NS: string = "force";
  static UI_NS: string = "ui";
  static AURA_NS: string = "aura";
  static APEX_NS: string = "apex";
  static EVENT_NS: string = "event";
  static IGNORE_ALWAYS: string[] = [
    "aura:component",
    "aura:handler",
    "aura:application",
    "aura:registerevent",
    "aura:attribute",
    "aura:id",
    "aura:set",
    "aura:if",
    "aura:expression",
    "ltng:require"
  ];

  constructor(options) {
    this.setOptions(options);
    this.loadKeys();
    this.addExclusions();
  }

  private setOptions({
    include_lightning = false,
    include_aura = false,
    include_ui = false,
    include_force = false,
    include_apex = false,
    include_events = false
  } = {}): void {
    this.options = {
      lightning: include_lightning,
      aura: include_aura,
      ui: include_ui,
      force: include_force,
      apex: include_apex,
      event: include_events
    };
  }

  private loadKeys(): void {
    this.bad_keys = new Set([
      ComponentFilter.LIGHTNING_NS,
      ComponentFilter.FORCE_NS,
      ComponentFilter.UI_NS,
      ComponentFilter.AURA_NS,
      ComponentFilter.APEX_NS,
      ComponentFilter.EVENT_NS
    ]);

    // because ComponentFilter.IGNORE_ALWAYS.values() doesn't work on node
    this.always_ignore = new Set();
    for (let keyToIgnore of ComponentFilter.IGNORE_ALWAYS) {
      this.always_ignore.add(keyToIgnore);
      this.bad_keys.add(keyToIgnore);
    }
  }

  private addExclusions(): void {
    if (this.options.lightning) {
      this.bad_keys.delete(ComponentFilter.LIGHTNING_NS);
    }
    if (this.options.aura) {
      this.bad_keys.delete(ComponentFilter.AURA_NS);
    }
    if (this.options.ui) {
      this.bad_keys.delete(ComponentFilter.UI_NS);
    }
    if (this.options.force) {
      this.bad_keys.delete(ComponentFilter.FORCE_NS);
    }
    if (this.options.apex) {
      this.bad_keys.delete(ComponentFilter.APEX_NS);
    }
    if (this.options.event) {
      this.bad_keys.delete(ComponentFilter.EVENT_NS);
    }
  }

  private getNamespace(key: string): string {
    return key.toLowerCase().split(":")[0];
  }

  public isAlwaysIgnored(key: string): boolean {
    return !key.includes(":") || this.always_ignore.has(key);
  }

  public isIgnored(key: string): boolean {
    return !key.includes(":") || this.bad_keys.has(this.getNamespace(key));
  }
}
