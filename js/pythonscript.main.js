const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";

function isNativeObject(object) {
    return Object.prototype.toString.call(object) === '[object Object]';
}

//runner = 1 (js compiled in js) || 0 (work as native),
class pythonscript_configuration {
    constructor() {
        this.PS_configuration = 1;
    }

    set_default_params() {
        this.runner = 0;
    }

    get_runner() {
        return this.runner;
    }

    set_runner(type) {
        this.runner = (type == 1 || type == 0) ? type : -1;
        if (this.runner == -1)
            throw ("Runner must be native - 0 or compiled - 1")
    }
}

class pythonscript_core { }

class pythonscript_controller {
    constructor(default_params) {
        if (!default_params) {
            this.PS_conf = new pythonscript_configuration();
            this.PS_conf.set_default_params();
            return;
        }

        if (!isNativeObject(default_params) || typeof default_params.PS_configuration == "undefined")
            throw ("Parameters must be NULL or pythonscript_configuration");

        this.PS_runner = new pythonscript_core();

        this.runner
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

    module.exports.pythonscript_controller = pythonscript_controller;
    module.exports.pythonscript_core = pythonscript_core;
    module.exports.pythonscript_configuration = pythonscript_configuration;
    module.exports.__RUN_MODE__ = __RUN_MODE__
    console.log("piska");
}

if (__RUN_MODE__ == "__HTML__") {
    console.log("loh");
}