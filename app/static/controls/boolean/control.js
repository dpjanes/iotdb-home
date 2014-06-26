var editor = function(paramd) {
    paramd.modal = false
    paramd.on_change({
        value: paramd.value ? false : true
    })
    /*
    $('div[control-type="iot-js:boolean"].control-active .picker')
        .off()
        .prop("checked", paramd.value)
        .click(function() {
            var value = this.checked
            paramd.on_change({
                value: value
            })
        })
        .onoff()
    */
}

var visualizer = function(paramd) {
    var options = [ "off", "on" ]
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
