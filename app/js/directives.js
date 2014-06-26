'use strict';

/* Directives */

var draw_circle = function(context, $scope) {
    var paramd = {
        fillStyle: "#000000",
        strokeStyle: "#CCCCCC",
        textColor: "#666666",
        text: "",
        lineWidth: 8,
        centerX: 24,
        centerY: 24,
        radius: 20
    }

    if ($scope && $scope.attribute && $scope.state) {
        var reading_key = $scope.attribute._reading
        var type = $scope.attribute._type
        var visualizer = js.visualizers[type]
        if (!visualizer) {
            paramd.fillStyle = "#FFFFFF"
        } else {
            var vd = visualizer({
                value: $scope.state[reading_key],
                type: type
            })

            if (vd.color) {
                paramd.fillStyle = vd.color
            }
            if (vd.text) {
                paramd.text = vd.text
            }
            if (vd.textColor) {
                paramd.textColor = vd.textColor
            }
        }
    }

    var startPoint = (Math.PI/180)*0;
    var endPoint = (Math.PI/180)*360;
    
    context.fillStyle = paramd.fillStyle
    context.strokeStyle = paramd.strokeStyle
    context.lineWidth = paramd.lineWidth;

    context.beginPath();
    context.arc(paramd.centerX,paramd.centerY,paramd.radius,startPoint,endPoint,true);
    context.stroke();
    context.fill();
    context.closePath();

    if (paramd.text) {
        context.fillStyle = paramd.textColor
        context.font = "14px Helvetica Neue";
        context.textAlign = 'center';
        context.fillText(paramd.text, 24, 29, 48);
    }
}

angular.module('myApp.directives', [])
    .directive('attributeDisplay', function() {
      return {
        scope: false,
        restrict: 'AE',
        replace: true,
        template: '<a class="control" ng-click="edit(endpoint,attribute,state)"><canvas width="48" height="48"></canvas></a>',
        link: function($scope, j_a, attrs) {
            var e_canvas = j_a.find("canvas")[0]
            var context = e_canvas.getContext('2d');

            draw_circle(context, $scope)

            $scope.$watch('state', function() {
                draw_circle(context, $scope)
            })
        }
      };
    })
    ;
