var editor = function(paramd) {
    paramd.modal = false
    paramd.on_change({
        value: paramd.value ? false : true
    })
}

var visualizer = function(paramd) {
    var options = [ "0", "1" ]
    if (paramd.purpose == "iot-attribute:on") {
        options = [ "off", "on" ]
    } else if (paramd.purpose == "iot-attribute:open") {
        options = [ "⟫|⟪", "⟪|⟫" ]
    }

    return {
        color: paramd.value ? "#FFFF00" : "#F9F9F9",
        text: paramd.value ? options[1] : options[0]
    }
}

try {
    js.editors['iot-js:boolean'] = editor
    js.visualizers['iot-js:boolean'] = visualizer;
} catch (x) {
}
