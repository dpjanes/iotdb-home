var editor = function(paramd) {
    $('div[control-type="iot-js:color"].control-active .picker')
        .minicolors("destroy")
        .minicolors({
            inline: true,
            theme: 'bootstrap',
        })
        .minicolors('value', paramd.value)
        .minicolors('settings', {
            change: function(hex, opacity) {
                paramd.on_change({
                    value: hex
                })
            }
        })
}
var visualizer = function(paramd) {
    return {
        color: paramd.value
    }
}
try {
    js.editors['iot-js:color'] = editor;
    js.visualizers['iot-js:color'] = visualizer;
} catch (x) {
}
