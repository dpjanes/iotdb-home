var editor = function(paramd) {
    /*
    paramd.modal = false
    paramd.on_change({
        value: paramd.value ? false : true
    })
    */
}

var visualizer = function(paramd) {
    console.log(paramd)
    var d = {
        color: "#F9F9F9",
        text: "",
        guage: paramd.value
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
