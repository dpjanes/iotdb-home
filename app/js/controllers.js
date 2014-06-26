'use strict';

var mqtt_js = {
    client_when: 0,
    client: null,
    $rootScope: null,

    init : function($rootScope) {
        mqtt_js.$rootScope = $rootScope
        var locationd = {
            xhostname: '127.0.0.1',
            hostname: 'mqtt.iotdb.org',
            port: 8000,
            clientid: "iot-" + ("" + Math.random()).substring(2)
        };
        mqtt_js.client = new Messaging.Client(
            locationd.hostname, 
            locationd.port,
            locationd.clientid
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

        console.log("- mqtt_js.init", "calling connect", locationd)
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
      console.log("- mqtt_js.onConnect");
      mqtt_js.client.subscribe("/api/#");
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
                topic: message.destinationName,
                payload: message.payloadString
            })
        }
        catch (x) {
            console.log("# unexpected exception", x)
        }
    },	

    end : 0
};
var canvas_js = {
    onoff: function(e_canvas) {
        var context = e_canvas.getContext('2d');

        var startPoint = (Math.PI/180)*0;
        var endPoint = (Math.PI/180)*360;
        
        context.fillStyle = "#FFFF00";
        context.strokeStyle = "#CCCCCC";
        context.lineWidth = 8;
        context.beginPath();
        context.arc(24,24,20,startPoint,endPoint,true);
        context.stroke();
        context.fill();
        context.closePath();
        
        context.fillStyle = "#666666";
        context.font="14px Helvetica Neue";
        context.textAlign = 'center';
        context.fillText("off",24,28);
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
  .controller('EndpointController', ['$scope', '$http', function($scope, $http) {
        $http
            .get($scope.api_endpoint)
            .success(function(data) {
                $scope.endpoint = data
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
            .get($scope.endpoint.api_endpoint_state)
            .success(function(data) {
                $scope.state = data
            })
            .error(function() {
            });
        $http
            .get($scope.endpoint.api_endpoint_attributes)
            .success(function(data) {
                $scope.attributes = data.attributes
            })
            .error(function() {
            });

        $scope.$on("mqtt", function(x0, paramd) {
            if ($scope.endpoint.api_endpoint_state != paramd.topic) {
                return
            }

            $http
                .get($scope.endpoint.api_endpoint_state)
                .success(function(data) {
                    safe_apply($scope, function() {
                        $scope.state = data
                    })
                })
                .error(function() {
                });
        })

        $scope.$on("update-value", function(x0, endpoint, attribute, value) {
            if (endpoint === $scope.endpoint) {
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

                $scope.change($scope.endpoint, tattribute, value)
            }
        })

        // update a value via REST call
        $scope.change = function(endpoint, attribute, value) {
            var base = endpoint.api_endpoint_state 
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
        $scope.edit = function(endpoint, attribute, state) {
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
                base: endpoint.api_endpoint_state,
                on_change: function(paramd) {
                    $rootScope.$broadcast("update-value", endpoint, attribute, paramd.value)
                    $scope.change(endpoint, attribute, paramd.value)
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
