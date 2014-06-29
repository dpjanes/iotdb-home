/*
 *  mqtt_server.js
 *
 *  David Janes
 *  IOTDB
 *  2014-06-21
 *
 *  A simple MQTT server with a WebSockets
 *  bridge. 
 *
 *  XXX this server / bridge code isn't working
 *  just yet so we're using IOTDB's MQTT server
 */

"use strict";

var mqtt = require('mqtt');
var util = require('util');
var url = require('url');
var mqtt_ws = require('./mqtt-ws')

/**
 *  Create an MQTT server
 */
exports.create_server = function(mqttd) {
    if (!mqttd.local) {
        console.log("- home_mqtt.create_server: not local, so not doing this")
        return
    }

    mqttd.verbose = 1
    mqtt.createServer(function(client) {
      var self = this;

      if (!self.clients) self.clients = {};

      client.on('connect', function(packet) {
        if (mqttd.verbose) console.log('- create_server.connect')
        client.connack({returnCode: 0});
        client.id = packet.clientId;
        self.clients[client.id] = client;
      });

      client.on('publish', function(packet) {
        if (mqttd.verbose) console.log('- create_server.publish')
        for (var k in self.clients) {
          self.clients[k].publish({topic: packet.topic, payload: packet.payload});
        }
      });

      client.on('subscribe', function(packet) {
        if (mqttd.verbose) console.log('- create_server.subscribe')
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
          granted.push(packet.subscriptions[i].qos);
        }

        client.suback({granted: granted, messageId: packet.messageId});
      });

      client.on('pingreq', function(packet) {
        if (mqttd.verbose) console.log('- create_server.pingreq')
        client.pingresp();
      });

      client.on('disconnect', function(packet) {
        if (mqttd.verbose) console.log('- create_server.disconnect')
        client.stream.end();
      });

      client.on('close', function(err) {
        if (mqttd.verbose) console.log('- create_server.close')
        delete self.clients[client.id];
      });

      client.on('error', function(err) {
        if (mqttd.verbose) console.log('- create_server.error')
        client.stream.end();
        console.log('# create_server.error', err)
      });
    }).listen(mqttd.mqtt_port);

}

/**
 *  Create an MQTT WebSockets bridge
 */
exports.create_bridge = function(mqttd) {
    if (!mqttd.local) {
        console.log("- home_mqtt.create_bridge: not local, so not doing this")
        return
    }

    var bridge = mqtt_ws.createBridge({
        mqtt: {
            host: "localhost",
            port: mqttd.mqtt_port,
        },
        websocket: {
            port: mqttd.mqtt_websocket,
        }
    })

    // Create our bridge
    console.log("Listening for incoming WebSocket connections on port %d",
        bridge.port);

    // Set up error handling
    bridge.on('error', function(err) {
        consolog.log("# create_bridge", err, "WebSocket Error");
    });

    // Handle incoming WS connection
    bridge.on('connection', function(ws) {
        // URL-decode the URL, and use the URI part as the subscription topic
        console.log("- create_bridge: WebSocket connection from %s received", ws.connectString);

        var self = this;

        ws.on('error', function(err) {
            consolog.log("# create_bridge:", err, util.format("WebSocket error in client %s", ws.connectString));
        });

        // Parse the URL
        var parsed = url.parse(ws.upgradeReq.url, true);

        // Connect to the MQTT server using the URL query as options
        var mqtt_client = bridge.connectMqtt(parsed.query);
        mqtt_client.topic = decodeURIComponent(parsed.pathname.substring(1));
        mqtt_client.isWildcardTopic = (mqtt_client.topic.match(/[\+#]/) != null);

        ws.on('close', function() {
            console.log("- create_bridge: WebSocket client %s closed", ws.connectString);
            mqtt_client.end();
        });

        ws.on('message', function(message) {
            console.log("- create_bridge: WebSocket client %s publishing '%s' to %s",
                ws.connectString, message, mqtt_client.topic);
            mqtt_client.publish(mqtt_client.topic, message, mqtt_client.options);
        });

        mqtt_client.on('error', function(err) {
            consolog.log("# create_bridge", err, "MQTT error");
        });

        mqtt_client.on('connect', function() {
            console.log("- create_bridge: Connected to MQTT server at %s:%d", 
                mqtt_client.host, mqtt_client.port);
            console.log("- create_bridge: WebSocket client %s subscribing to '%s'", 
                ws.connectString, mqtt_client.topic);
            mqtt_client.subscribe(mqtt_client.topic);
        });

        mqtt_client.on('close', function() {
            console.log("- create_bridge: MQTT connection for client %s closed",
                ws.connectString);
            ws.terminate();
        });

        mqtt_client.on('message', function(topic, message, packet) {
            if (mqtt_client.isWildcardTopic) {
                ws.send(util.format("%s: %s", topic, message), self.options);
            } else {
                ws.send(message, self.options);
            }
        });
    });
}

var client = null

/**
 *  Publish an MQTT message
 */
exports.publish = function(mqttd, topic, data) {
    if (client == null) {
        console.log("- mqtt_home.publish", "connecting", mqttd.mqtt_port, mqttd.mqtt_host)
        client = mqtt.createClient(mqttd.mqtt_port, mqttd.mqtt_host)
        client.on('error', function() {
            console.log("# mqtt_home.publish/error", "unexpected", arguments)
        })
        client.on('clone', function() {
            console.log("# mqtt_home.publish/error", "unexpected", arguments)
        })
    }

    client.publish(topic, data)

    console.log("- home_mqtt.publish", topic, data)
}
