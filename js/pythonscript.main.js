const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";

function isNativeObject(object) {
    return Object.prototype.toString.call(object) === '[object Object]';
}

/**
* runner: 1 - compiled in js
*         0 - work as native
* spaces: tab size
**/
class pythonscript_configuration {
    constructor() {
        this.PS_configuration = 1;
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

class py_std_function {

}

class py_std_operators {
    constructor() {
        this.py_operators = {
            "+": this.py_plus,
            "-": this.py_minus,
            "*": this.py_mupltyply,
            "**": this.py_exponent,
            "/": this.py_division,
            "//": this.py_division_round,
            "%": this.py_modulo,
            "<<": this.py_undefined_function,
            ">>": this.py_undefined_function,
            "&": this.py_undefined_function,
            "|": this.py_undefined_function,
            "^": this.py_undefined_function,
            "~": this.py_undefined_function,
            "<": this.py_logic_less,
            ">": this.py_logic_more,
            "<=": this.py_logic_less_and_eq,
            ">=": this.py_logic_more_and_eq,
            "==": this.py_logic_equall,
            "!=": this.py_logic_not_eq,
            "not": this.py_logic_not,
            "and": this.py_logic_and,
            "or": this.py_logic_or
        }
    }

    detect_operator(operator) {
        return typeof this.py_operators[operator] !== "undefined";
    }

    run_opertor(operator, val_left, val_right) {
        return this.py_operators[operator](val_left, val_right)
    }

    py_plus(val_left, val_right) {
        try { var result = val_left + val_right; }
        catch { throw ("Operator execution error '+'") }
        return result;
    }

    py_minus(val_left, val_right) {
        try { var result = val_left - val_right; }
        catch { throw ("Operator execution error '-'") }
        return result;
    }

    py_mupltyply(val_left, val_right) {
        try { var result = val_left * val_right; }
        catch { throw ("Operator execution error '*'") }
        return result;
    }

    py_exponent(val_left, val_right) {
        try { var result = Math.pow(val_left, val_right); }
        catch { throw ("Operator execution error '**'") }
        return result;
    }

    py_division(val_left, val_right) {
        try { var result = val_left / val_right; }
        catch { throw ("Operator execution error '/'") }
        return result;
    }

    py_division_round(val_left, val_right) {
        try { var result = (val_left / val_right) > 0 ? Math.floor(val_left / val_right) : Math.ceil(val_left / val_right); }
        catch { throw ("Operator execution error '//'") }
        return result;
    }

    py_modulo(val_left, val_right) {
        try { var result = val_left % val_right; }
        catch { throw ("Operator execution error '%'") }
        return result;
    }

    py_undefined_function(val_left, val_right) {
        throw ("Operator execution error 'undefined operator'")
    }

    py_logic_less(val_left, val_right) {
        try { var result = val_left < val_right; }
        catch { throw ("Operator execution error '<'") }
        return result;
    }

    py_logic_more(val_left, val_right) {
        try { var result = val_left > val_right; }
        catch { throw ("Operator execution error '>'") }
        return result;
    }

    py_logic_less_and_eq(val_left, val_right) {
        try { var result = val_left <= val_right; }
        catch { throw ("Operator execution error '<='") }
        return result;
    }

    py_logic_more_and_eq(val_left, val_right) {
        try { var result = val_left >= val_right; }
        catch { throw ("Operator execution error '>='") }
        return result;
    }

    py_logic_more_and_eq(val_left, val_right) {
        try { var result = val_left == val_right; }
        catch { throw ("Operator execution error '=='") }
        return result;
    }

    py_logic_not(val_left, val_right) {
        try { var result = val_left == false ? true : false; }
        catch { throw ("Operator execution error 'not'") }
        return result;
    }

    py_logic_and(val_left, val_right) {
        try { var result = (val_left == true && val_right == true || val_left == false && val_right == false); }
        catch { throw ("Operator execution error 'and'") }
        return result;
    }

    py_logic_or(val_left, val_right) {
        try { var result = (val_left == true || val_right == false || val_left == false && val_right == true); }
        catch { throw ("Operator execution error 'and'") }
        return result;
    }
}

class pythonscript_core {
    constructor () {
        this.py_opertators = new py_std_operators();
    }
    load_conf() {
        return -1;
    }

    run() {
        return -1;
    }
}

class pythonscript_controller {
    constructor(default_params) {
        this.PS_conf = new pythonscript_configuration();

        if (!default_params) {
            this.PS_conf.set_default_params();
            return;
        }

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

    module.exports.pythonscript_controller = pythonscript_controller;
    module.exports.pythonscript_core = pythonscript_core;
    module.exports.pythonscript_configuration = pythonscript_configuration;
    module.exports.__RUN_MODE__ = __RUN_MODE__
}

if (__RUN_MODE__ == "__HTML__") {
    console.log("loh");
}

py_opertators = new py_std_operators();
if (py_opertators.detect_operator("+")) {
    console.log(py_opertators.run_opertor("//", 7, 3));
}
