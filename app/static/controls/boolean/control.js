var editor = function(paramd) {
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
}

try {
    js.editors['iot-js:boolean'] = editor
} catch (x) {
}
