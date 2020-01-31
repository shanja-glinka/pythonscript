const __RUN_MODE__ = "__NODE__";
//const __RUN_MODE__ = "__HTML__";



function isNativeObject(object) {
    return Object.prototype.toString.call(object) === '[object Object]';
}

class py_container {
    constructor() {
        this.container = {};
    }

    add_new(variable_name, value) {
        if (typeof this.container[variable_name] == "function" || typeof this.container[variable_name] == "object")
            throw ("Function / object cannot be declared");

        this.container.variable_name = value;
    }

    delete(variable_name) {
        delete this.container.variable_name;
    }
}

class pythonscript_core {
    constructor() {
        //this.py_opertators = new py_std_operators();
        this.py_opertators = new py_std_operators();
        this.py_configuration = new pythonscript_configuration();
        this.py_runner = new pythonscript_run();
        this.py_values = new py_container();
        this.py_functions = new py_container();
    }

    load_conf(configuration) {
        if (!isNativeObject(configuration) || typeof configuration.PS_configuration == "undefined")
            throw ("Parameters must be NULL or pythonscript_configuration");

        this.py_configuration = configuration;
        return 1;
    }

    run(code_block) {
        this.code_block = code_block;
        code_block = "";

        this.formatter();
        return -1;
    }

    formatter() {
        var find_substr = (find) => {
            if (!this.code_block.indexOf(find) + 1)
                return -1;

            let begin = this.code_block.indexOf(find);
            let end = -1;
            let find_len = find.length();

            for (let i = this.code_block.indexOf(find) + 1; i < this.code_block.length; i++) {
                let if_buf = "";

                for (let j = i; j < i + find_len; j++)
                    if_buf += this.code_block[j];

                if (if_buf == find) {
                    end = i;
                    break;
                }
            }

            return result;
        }
//TODO: я здесь закончил. нужно подумать как разобрать строку и комментарии с ''' или """ где их больше чем один
        this.none_format_positions = {
            ignored0: find_substr("'''"),
            ignored1: find_substr('"""'),
            comment: find_substr('#')
        }
        console.log(this.none_format_positions);
        let code_buffer = this.code_block;

        for (let i = 0; i < this.code_block.length; i++) {
            if (this.none_format_positions.ignored0 != -1 && i == this.none_format_positions.ignored0.start) {
                i = this.none_format_positions.ignored0.finish - this.none_format_positions.ignored0.start + 1;
            }
            if (this.none_format_positions.ignored1 != -1 && i == this.none_format_positions.ignored1.start) {
                i = this.none_format_positions.ignored1.finish - this.none_format_positions.ignored1.start + 1;
            }
            if (this.none_format_positions.comment != -1 && i == this.none_format_positions.comment.start) {
                i = this.none_format_positions.comment.finish - this.none_format_positions.comment.start + 1;
            }
        }

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