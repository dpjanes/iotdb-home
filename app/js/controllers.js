'use strict';

var mqtt_js = {
    client_when: 0,
    client: null,
    $rootScope: null,

    init : function($rootScope) {
        mqtt_js.$rootScope = $rootScope
        mqtt_js.client = new Messaging.Client(
            js.settingsd.mqttd.mqtt_host, 
            js.settingsd.mqttd.mqtt_websocket,
            "home" + ("" + Math.random()).substring(2)
        );
        mqtt_js.client.onConnectionLost = mqtt_js.onConnectionLost;
        mqtt_js.client.onMessageArrived = mqtt_js.onMessageArrived;

        var connectd = {
            timeout: 3,
            keepAliveInterval: 60,
            cleanSession: true,
            useSSL: false,

            onSuccess:mqtt_js.onConnect,
            onFailure:mqtt_js.onFailure
        }

        console.log("- mqtt_js.init", "calling websocket connect", 
            js.settingsd.mqttd.mqtt_host, 
            js.settingsd.mqttd.mqtt_websocket)
        mqtt_js.client_when = new Date().getTime();
        mqtt_js.client.connect(connectd);
    },

    reconnect : function() {
        /*
         *  Don't rush reconnects
         */
        var delta = new Date().getTime() - mqtt_js.client_when;
        var min = ( 10 * 1000 ) - delta;
        if (min > 0) {
            console.log("- mqtt_js.reconnect", "will reconnect", "when=", min);
            setTimeout(mqtt_js.init, min);
        } else {
            console.log("- mqtt_js.reconnect", "will reconnect now");
            mqtt_js.init();
        }
    },

    onFailure : function(reason) {
        console.log("# mqtt_js.onFailure", reason);
        mqtt_js.reconnect();
    },

    onConnect : function() {
        var topic = js.settingsd.mqttd.prefix + "/api/#"
        console.log("- mqtt_js.onConnect", topic);
        mqtt_js.client.subscribe(topic)
    },

    onConnectionLost : function(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("# mqtt_js.onConnectionLost", responseObject.errorMessage);
        }
        mqtt_js.reconnect();
    },

    onMessageArrived : function(message) {
        console.log("- mqtt_js.onMessageArrived");
        console.log("- mqtt_js.onMessageArrived", 
            "payload=", message.payloadString, "topic=", message.destinationName);

        try {
            mqtt_js.$rootScope.$broadcast("mqtt", {
                topic: message.destinationName.substring(js.settingsd.mqttd.prefix.length),
                payload: message.payloadString
            })
        }
        catch (x) {
            console.log("# unexpected exception", x)
        }
    },	

    end : 0
};

var safe_apply = function(scope, fn) {
    (scope.$$phase || scope.$root.$$phase) ? fn() : scope.$apply(fn);
}


angular.module('myApp.controllers', [])
    .controller('RoomsController', [
        '$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
        mqtt_js.init($rootScope)
        $http
            .get('/api/rooms')
            .success(function(data) {
                var rooms = data.rooms;
                $scope.rooms = data.rooms;
            })
            .error(function() {
            });

  }])
  .controller('ThingController', ['$scope', '$http', function($scope, $http) {
        $http
            .get($scope.api_thing)
            .success(function(data) {
                $scope.thing = data
            })
            .error(function() {
            });
        $scope.$on("clear-checkbox", function(x0) {
            safe_apply($scope, function() {
                $scope.selected = false
            })
        })

        $scope.selected = false
  }])
  .controller('AttributesController', [
    '$scope', '$http', '$window', '$rootScope',
    function($scope, $http, $window, $rootScope) {
        $http
            .get($scope.thing.api_thing_state)
            .success(function(data) {
                $scope.state = data
            })
            .error(function() {
            });
        $http
            .get($scope.thing.api_thing_attributes)
            .success(function(data) {
                $scope.attributes = data.attributes
            })
            .error(function() {
            });

        $scope.$on("mqtt", function(x0, paramd) {
            if ($scope.thing.api_thing_state != paramd.topic) {
                return
            }

            $http
                .get($scope.thing.api_thing_state)
                .success(function(data) {
                    safe_apply($scope, function() {
                        $scope.state = data
                    })
                })
                .error(function() {
                });
        })

        $scope.$on("update-value", function(x0, thing, attribute, value) {
            if (thing === $scope.thing) {
                return
            }
            if (!$scope.$parent.selected) {
                return
            }

            for (var tai in $scope.attributes) {
                var tattribute = $scope.attributes[tai]
                /*
                if (!tattribute._control) {
                    continue
                }
                */

                if (attribute._purpose != tattribute._purpose) {
                    continue
                }

                $scope.change($scope.thing, tattribute, value)
            }
        })

        // update a value via REST call
        $scope.change = function(thing, attribute, value) {
            var base = thing.api_thing_state 
            var url = base
                + "?" + attribute._code 
                + "=" + encodeURIComponent(value)

            $http
                .get(url)
                .success(function(data) {
                    $scope.state = data
                })
        }

        // edit a value
        $scope.edit = function(thing, attribute, state) {
            if (!attribute._control) {
                return
            }
            var js = $window.js
            var editor = js.editors[attribute._type]
            if (!editor) {
                alert("# no editor found attribute: " + attribute._type)
                return
            }

            var e_control = $('div[control-type="' + attribute._type + '"].control-prototype')
            e_control = e_control.clone()
            e_control.removeClass("control-prototype")
            e_control.addClass("control-active")

            $("#id_control_modal .modal-body")
                .empty()
                .append(e_control)

            var paramd = {
                modal: true,
                value: state[attribute._reading],
                base: thing.api_thing_state,
                on_change: function(paramd) {
                    $rootScope.$broadcast("update-value", thing, attribute, paramd.value)
                    $scope.change(thing, attribute, paramd.value)
                }
            }
            try {
                editor(paramd)
            } catch (x) {
                console.log("# unexpected editor exception", x)
                paramd.modal = false
            }

            if (paramd.modal) {
                $('#id_control_modal')
                    .modal({})
                    .on('hidden.bs.modal', function() {
                        $rootScope.$broadcast("clear-checkbox")
                    })
            } else {
                $rootScope.$broadcast("clear-checkbox")
            }
        }
  }])
  ;
