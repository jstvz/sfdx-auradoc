'use strict';

const glob = require('glob');
const path = require('path');
const process = require('process');
const cli = require('heroku-cli-util');
const Viz = require('viz.js');
const fs = require('fs-extra');
const AuraComponentGraph = require('./AuraComponentGraph');


const DEFAULT_OPTIONS = {
  include_lightning: false,
  include_aura: false,
  include_ui: false,
  include_force: false,
  return_full_graph: false
}

exports.hello = (name, filename) => {
  console.log(process.cwd());
  cli.log(`hello ${name} from ${filename}!`);
}

// if (_path.includes('*')) {
//   console.log(graphs);

async function createSubGraphArray(_path) {
  let graphs = new Array();
  let paths = glob.sync(_path);
  for (let fname of paths) {
    try {
      let grapher = new AuraComponentGraph(fname, DEFAULT_OPTIONS);
      let subgraph = await grapher.run();
      graphs.push(subgraph);
    } catch (error) {
     // console.error(error);
    }
  }
  return graphs;
}


async function createProjectGraph() {
  const _path = `${process.cwd()}/**/aura/*`;
  let graphs = await createSubGraphArray(_path);
  let joined = `digraph G {${graphs.join(' ')}}`;
  let svg = Viz(joined, {format: "svg", engine: "dot"});
  return svg;
}
async function saveGraph() {
  let svg = await createProjectGraph();
  console.log(svg);
  let filename = path.join(process.cwd(), 'out.svg');
  let fileResult = await fs.writeFile(filename, svg);
  cli.open(filename);
}
saveGraph();
