sfdx-auradoc
============

![Sample output](https://raw.githubusercontent.com/jstvz/sfdx-auradoc/master/doc/sample.png)

Aura documentation plugin for SFDX, currently in alpha.

<!-- toc -->

<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdx-auradoc
$ sfdx-auradoc COMMAND
running command...
$ sfdx-auradoc (-v|--version|version)
sfdx-auradoc/0.0.0 linux-x64 node-v11.7.0
$ sfdx-auradoc --help [COMMAND]
USAGE
  $ sfdx-auradoc COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx-auradoc auradoc:graph`](#sfdx-auradoc-auradocgraph)

## `sfdx-auradoc auradoc:graph`

Create a dependency graph of aura components.

```
USAGE
  $ sfdx-auradoc auradoc:graph

OPTIONS
  -a, --includeaura                               include the aura namespace

  -c, --component=component                       [default: PROJECT_PATH] path to specific component directory to graph
                                                  (accepts globs)

  -e, --includeevents                             include registered and handled events

  -f, --includeforce                              include the force namespace

  -l, --includelightning                          include the lightning namespace

  -o, --output=output                             [default: /tmp/out.svg] graph filename, defaults to 'out.svg'

  -p, --includeapexcontroller                     include apex controllers

  -u, --includeui                                 include the ui namespace

  --json                                          format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLE
  $ sfdx auradoc:graph
```

_See code: [src/commands/auradoc/graph.ts](https://github.com/jstvz/sfdx-auradoc/blob/v0.0.0/src/commands/auradoc/graph.ts)_
<!-- commandsstop -->
