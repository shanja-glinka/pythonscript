const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";




class test_me_right_now {
    constructor() {
        this.bruh = "bruh";
    }

    test_py_operators() {
        let py_opertators = new py_std_operators();
        if (py_opertators.detect_operator("+")) {
            console.log(py_opertators.run_opertor("+", 7, 3));
        }
        if (py_opertators.detect_operator("-")) {
            console.log(py_opertators.run_opertor("-", 7, 3));
        }
        if (py_opertators.detect_operator("*")) {
            console.log(py_opertators.run_opertor("*", 7, 3));
        }
        if (py_opertators.detect_operator("**")) {
            console.log(py_opertators.run_opertor("**", 7, 3));
        }
        if (py_opertators.detect_operator("/")) {
            console.log(py_opertators.run_opertor("/", 7, 3));
        }
        if (py_opertators.detect_operator("//")) {
            console.log(py_opertators.run_opertor("//", 7, 3));
        }
        if (py_opertators.detect_operator(">")) {
            console.log(py_opertators.run_opertor(">", 7, 3));
        }
        if (py_opertators.detect_operator("<")) {
            console.log(py_opertators.run_opertor("<", 7, 3));
        }
        if (py_opertators.detect_operator("==")) {
            console.log(py_opertators.run_opertor("==", 7, 3));
        }
        if (py_opertators.detect_operator(">=")) {
            console.log(py_opertators.run_opertor(">=", 7, 3));
        }
        if (py_opertators.detect_operator("<=")) {
            console.log(py_opertators.run_opertor("<=", 7, 3));
        }
    }
}

if (__RUN_MODE__ == "__NODE__") {
    try {
        navigator.userAgent
        var its_a_trap = 1;
    } catch (ex) { }
    if (its_a_trap)
        throw ("You are pusy? Why did you run this code in a browser? Сomment the __NODE__ line and uncomment __HTML__");

    module.exports.test_me_right_now = test_me_right_now;

    var py_std_operators = require("./py_std_operators.js").py_std_operators;
}

var tests = new test_me_right_now();
//tests.test_py_operators();
