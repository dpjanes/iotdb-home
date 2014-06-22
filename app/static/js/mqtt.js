js = {
    init : function() {
        js.mqtt.init();
    },

    mqtt : {
        client_when : 0,
        client : null,

        init : function() {
            var locationd = {
                hostname: playground.mqtt_server,
                port: playground.mqtt_websocket,
                clientid: "iot-" + ("" + Math.random()).substring(2)
            };
            js.mqtt.client = new Messaging.Client(
                locationd.hostname, 
                locationd.port,
                locationd.clientid
            );
            js.mqtt.client.onConnectionLost = js.mqtt.onConnectionLost;
            js.mqtt.client.onMessageArrived = js.mqtt.onMessageArrived;

            var connectd = {
                timeout: 3,
                keepAliveInterval: 60,
                cleanSession: true,
                useSSL: false,

                onSuccess:js.mqtt.onConnect,
                onFailure:js.mqtt.onFailure
            }
            js.mqtt.client_when = new Date().getTime();
            js.mqtt.client.connect(connectd);
        },

        reconnect : function() {
            /*
             *  Don't rush reconnects
             */
            var delta = new Date().getTime() - js.mqtt.client_when;
            var min = ( 30 * 1000 ) - delta;
            if (min > 0) {
                console.log("js.mqtt.reconnect", "will reconnect", "when=", min);
                setTimeout(js.mqtt.init, min);
            } else {
                console.log("js.mqtt.reconnect", "will reconnect now");
                js.mqtt.init();
            }
        },

        onFailure : function(reason) {
            console.log("failure", reason);
            js.mqtt.reconnect();
        },

        onConnect : function() {
          console.log("onConnect");
          js.mqtt.client.subscribe("iot/#");

          var message = new Messaging.Message(JSON.stringify("Connection @"+ (new Date())));
          message.destinationName = "iot/connection";
          js.mqtt.client.send(message); 
        },

        onConnectionLost : function(responseObject) {
            if (responseObject.errorCode !== 0) {
                console.log("onConnectionLost:"+responseObject.errorMessage);
            }
            js.mqtt.reconnect();
        },

        onMessageArrived : function(message) {
            console.log("onMessageArrived");
            console.log("onMessageArrived", "payload=", message.payloadString, "topic=", message.destinationName);

            if (message.payloadString.length == 0) {
                return;
            }

            try {
                var value = $.parseJSON(message.payloadString);

                js.ui.update_html(message.destinationName, value);
                js.ui.update_state(message.destinationName, value);
            } catch (x) {
                console.log("onMessageArrived", "unexpected exception", x);
                return;
            }
        },	

        end : 0,
    },

    end : 0
};
$(document).ready(js.init);
