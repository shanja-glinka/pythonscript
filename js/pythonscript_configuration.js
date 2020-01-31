const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";

/**
* runner: 1 - compiled in js
*         0 - work as native
* spaces: tab size
**/
class pythonscript_configuration {
    constructor() {
        this.PS_configuration = 1;
        this.set_default_params();
    }

    set_default_params() {
        this.runner = 0;
        this.spaces = 2;
    }

    get_spaces() {
        return this.spaces;
    }

    set_spaces(number) {
        this.spaces = (number > 0 && number < 9) ? number : -1;
        if (this.spaces == -1)
            throw ("Tab size must be 1...8")
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


if (__RUN_MODE__ == "__NODE__") {
    try {
        navigator.userAgent
        var its_a_trap = 1;
    } catch (ex) { }
    if (its_a_trap)
        throw ("You are pusy? Why did you run this code in a browser? Сomment the __NODE__ line and uncomment __HTML__");

    module.exports.pythonscript_configuration = pythonscript_configuration;
}