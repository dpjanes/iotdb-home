var editor = function(paramd) {
    /*
    paramd.modal = false
    paramd.on_change({
        value: paramd.value ? false : true
    })
    */
}

var visualizer = function(paramd) {
    console.log("HERE:ABC", paramd)
    var d = {
        color: "#F9F9F9",
        text: ""
    }

    if (paramd.unit == "iot-unit::math.fraction.unit") {
        d.guage = paramd.value
    } else if ((paramd.minimum !== undefined) && (paramd.maximum !== undefined)) {
    }

    try {
        d.text = paramd.value.toFixed(2)
    }
    catch (x) {
    }

    return d
}

try {
    js.editors['iot-js:number'] = editor
    js.visualizers['iot-js:number'] = visualizer;
} catch (x) {
}
