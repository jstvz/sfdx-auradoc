sfdx-auradoc
============

![Sample output](https://raw.githubusercontent.com/jstvz/sfdx-auradoc/master/doc/sample.png)

Aura documentation plugin for SFDX, currently in alpha.

```sh-session
$ sfdx plugins:link .
$ sfdx auradoc:graph --help
USAGE
  $ sfdx auradoc:graph

OPTIONS
  -a, --includeaura                               include the aura namespace

  -c, --component=component                       [default: PROJECT_PATH] path to specific
                                                  component directory to graph (accepts globs)

  -f, --includeforce                              include the force namespace

  -l, --includelightning                          include the lightning namespace

  -o, --output=output                             [default: out.svg] graph filename, defaults to
                                                  'out.svg'

  -u, --includeui                                 include the ui namespace

  --json                                          format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLE
  $ sfdx auradoc:graph

...
```

