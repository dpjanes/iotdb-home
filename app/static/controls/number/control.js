var editor = function(paramd) {
    /*
    paramd.modal = false
    paramd.on_change({
        value: paramd.value ? false : true
    })
    */
}

var visualizer = function(paramd) {
    var d = {
        color: "#F9F9F9",
        text: ""
    }

    if (paramd['iot:unit'] == "iot-unit:math.fraction.unit") {
        d.guage = paramd.value
    } else if (paramd['iot:unit'] == "iot-unit:math.fraction.percent") {
        d.guage = paramd.value / 100
        d.symbol = "%"
    } else if (paramd['iot:unit'] == "iot-unit:temperature.si.celsius") {
        d.symbol = "°C"
    } else if (paramd['iot:unit'] == "iot-unit:temperature.imperial.fahrenheit") {
        d.symbol = "°F"
    } else if ((paramd.minimum !== undefined) && (paramd.maximum !== undefined)) {
    }

    /*j
    if (d.guage !== undefined) {
        d.guage = Math.max(0, d.guage)
        d.guage = Math.min(1, d.guage)
    }
    */

    var precision = 3
    try {
        if (paramd["iot:arithmetic-precision"] !== undefined) {
            precision = parseInt(paramd["iot:arithmetic-precision"])
        }
    }
    catch (x) {
    }
    try {
        d.text = paramd.value.toFixed(precision)
    }
    catch (x) {
    }

    console.log(paramd, d)
    return d
}

try {
    js.editors['iot-js:number'] = editor
    js.visualizers['iot-js:number'] = visualizer;
} catch (x) {
}
