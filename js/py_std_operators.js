const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";


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

    py_logic_equall(val_left, val_right) {
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


if (__RUN_MODE__ == "__NODE__") {
    try {
        navigator.userAgent
        var its_a_trap = 1;
    } catch (ex) { }
    if (its_a_trap)
        throw ("You are pusy? Why did you run this code in a browser? Сomment the __NODE__ line and uncomment __HTML__");

    module.exports.py_std_operators = py_std_operators;
}