var exports = require("./js/pythonscript.main.js");
var pythonscript_configuration = exports.pythonscript_configuration;
var pythonscript_controller = exports.pythonscript_controller;
var pythonscript_core = exports.pythonscript_core;
const __RUN_MODE__ = exports.__RUN_MODE__;

var pythscr_conf = new pythonscript_configuration();
pythscr_conf.set_runner(0);
var pythscr = new pythonscript_controller(pythscr_conf);

pythscr.run(
    `print("hello world")`
)