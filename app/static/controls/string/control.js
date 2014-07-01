var visualizer = function(paramd) {
    return {
        color: "#F9F9F9",
        text: paramd.value
    }
}

try {
    js.visualizers['iot-js:string'] = visualizer;
} catch (x) {
}
