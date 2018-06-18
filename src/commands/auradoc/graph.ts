import { flags } from "@oclif/command";
import { join } from "path";
import { SfdxCommand } from "@salesforce/command";
import { Project, Messages } from "@salesforce/core";
import { Grapher, ComponentFilter } from "../../lib/AuraComponentGraph";

const path = require("path");
const os = require("os");

Messages.importMessagesDirectory(join(__dirname, "..", "..", ".."));
const messages = Messages.loadMessages("sfdx-auradoc", "graph");

export default class Graph extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [`$ sfdx auradoc:graph`];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    component: flags.string({
      char: "c",
      description: messages.getMessage("componentFlagDescription"),
      default: `PROJECT_PATH`
    }),
    output: flags.string({
      char: "o",
      description: messages.getMessage("outputFlagDescription"),
      default: path.join(os.tmpdir(),"out.svg")
    }),
    includelightning: flags.boolean({
      char: "l",
      description: messages.getMessage("lightningFlagDescription")
    }),
    includeaura: flags.boolean({
      char: "a",
      description: messages.getMessage("auraFlagDescription")
    }),
    includeui: flags.boolean({
      char: "u",
      description: messages.getMessage("uiFlagDescription")
    }),
    includeforce: flags.boolean({
      char: "f",
      description: messages.getMessage("forceFlagDescription")
    }),
    includeapexcontroller: flags.boolean({
      char: "p",
      description: messages.getMessage("apexFlagDescription")
    }),
    includeevents: flags.boolean({
      char: "e",
      description: messages.getMessage("eventFlagDescription")
    })
  };

  // This command requires a project workspace
  protected static requiresProject = true;

  public async run(): Promise<any> {
    let component_path: string = this.flags.component;

    // if the path to the component is not specified, then use the project path.
    if (component_path === "PROJECT_PATH") {
      const project = await Project.resolve();
      component_path = join(project.getPath(), "**", "aura", "*");
    }

    this.ux.startSpinner(`Getting all components in ${component_path}`);

    let options = {
      include_lightning: this.flags.includelightning,
      include_aura: this.flags.includeaura,
      include_ui: this.flags.includeui,
      include_force: this.flags.includeforce,
      include_apex: this.flags.includeapexcontroller,
      include_events: this.flags.includeevents,
      return_full_graph: false
    };

    let cmpFilter: ComponentFilter = new ComponentFilter(options);
    let grapher: Grapher = new Grapher(
      component_path,
      this.flags.output,
      cmpFilter
    );

    if (this.flags.includelightning) {
      this.ux.log(`Including lightning namespace...`);
    }

    this.ux.log("Generating Graph...");

    let [output_filepath, svg_string]: string[] = await grapher.saveGraph();

    this.ux.stopSpinner(`Wrote svg to ${output_filepath}.`);

    return { outputfile: output_filepath, svg: svg_string };
  }
}
