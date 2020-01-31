const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";


class py_std_function {

}


if (__RUN_MODE__ == "__NODE__") {
    try {
        navigator.userAgent
        var its_a_trap = 1;
    } catch (ex) { }
    if (its_a_trap)
        throw ("You are pusy? Why did you run this code in a browser? Сomment the __NODE__ line and uncomment __HTML__");

    module.exports.py_std_function = py_std_function;
}