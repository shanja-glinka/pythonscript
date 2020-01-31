const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";

function isNativeObject(object) {
    return Object.prototype.toString.call(object) === '[object Object]';
}




class pythonscript_controller {
    constructor(default_params) {
        this.PS_conf = new pythonscript_configuration();

        if (!default_params)
            return;

        if (!isNativeObject(default_params) || typeof default_params.PS_configuration == "undefined")
            throw ("Parameters must be NULL or pythonscript_configuration");

        this.PS_conf
    }

    run(code_block) {
        var ps_core = new pythonscript_core();

        ps_core.load_conf(this.PS_conf);
        ps_core.run(code_block);

    }
}


if (__RUN_MODE__ == "__NODE__") {
    try {
        navigator.userAgent
        var its_a_trap = 1;
    } catch (ex) { }
    if (its_a_trap)
        throw ("You are pusy? Why did you run this code in a browser? Сomment the __NODE__ line and uncomment __HTML__");

    var py_std_function = require("./py_std_function.js").py_std_function;
    var py_std_operators = require("./py_std_operators.js").py_std_operators;
    var pythonscript_configuration = require("./pythonscript_configuration.js").pythonscript_configuration;
    var pythonscript_core = require("./pythonscript_core.js").pythonscript_core;
    var pythonscript_run = require("./pythonscript_run.js").pythonscript_run;


    module.exports.pythonscript_controller = pythonscript_controller;
    module.exports.py_std_operators = py_std_operators;
    module.exports.pythonscript_core = pythonscript_core;
    module.exports.pythonscript_configuration = pythonscript_configuration;
    module.exports.__RUN_MODE__ = __RUN_MODE__;
}

if (__RUN_MODE__ == "__HTML__") {
    console.log("loh");
}
