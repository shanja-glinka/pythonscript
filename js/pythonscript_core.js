const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";



function isNativeObject(object) {
    return Object.prototype.toString.call(object) === '[object Object]';
}


class pythonscript_core {
    constructor() {
        this.py_opertators = new py_std_operators();
        this.py_opertators = new py_std_operators();
        this.py_configuration = new pythonscript_configuration();
        this.py_runner = new pythonscript_run();
    }

    load_conf(configuration) {
        if (!isNativeObject(configuration) || typeof configuration.PS_configuration == "undefined")
            throw ("Parameters must be NULL or pythonscript_configuration");

        this.py_configuration = configuration;
        return 1;
    }

    run(code_block) {
        return -1;
    }
}


if (__RUN_MODE__ == "__NODE__") {
    try {
        navigator.userAgent
        var its_a_trap = 1;
    } catch (ex) { }
    if (its_a_trap)
        throw ("You are pusy? Why did you run this code in a browser? Сomment the __NODE__ line and uncomment __HTML__");

    module.exports.pythonscript_core = pythonscript_core;

    var py_std_function = require("./py_std_function.js").py_std_function;
    var py_std_operators = require("./py_std_operators.js").py_std_operators;
    var pythonscript_run = require("./pythonscript_run.js").pythonscript_run;
    var pythonscript_configuration = require("./pythonscript_configuration.js").pythonscript_configuration;
}