'use strict';

/* Directives */

var draw_circle = function(e_canvas, context, $scope) {
    var drawd = {
        fillStyle: "#000000",
        strokeStyle: "#CCCCCC",
        textColor: "#666666",
        text: "",
        symbol: "",
        lineWidth: 8,
        centerX: 30,
        centerY: 30,
        radius: 26,
        guageColor: "#666666",
        guage: null
    }

    e_canvas.width = drawd.centerX * 2
    e_canvas.height = drawd.centerY * 2

    if ($scope && $scope.attribute && $scope.state) {
        var reading_key = $scope.attribute._reading
        var type = $scope.attribute._type
        var visualizer = js.visualizers[type]
        if (!visualizer) {
            drawd.fillStyle = "#FFFFFF"
        } else {
            var pd = {}
            for (var key in $scope.attribute) {
                pd[key] = $scope.attribute[key]
            }
            pd.value = $scope.state[reading_key]
            pd.purpose = $scope.attribute._purpose
            pd.type = type
            var vd = visualizer(pd)

            if (vd.color) {
                drawd.fillStyle = vd.color
            }
            if (vd.text) {
                drawd.text = vd.text
            }
            if (vd.symbol) {
                drawd.symbol = vd.symbol
            }
            if (vd.textColor) {
                drawd.textColor = vd.textColor
            }
            if (vd.guage) {
                drawd.guage = vd.guage
            }
            if (vd.guageColor) {
                drawd.guageColor = vd.guageColor
            }
        }
    }

    var startPoint = (Math.PI/180)*0;
    var endPoint = (Math.PI/180)*360;
    
    context.fillStyle = drawd.fillStyle
    context.strokeStyle = drawd.strokeStyle
    context.lineWidth = drawd.lineWidth;

    context.clearRect(0, 0, drawd.centerX * 2, drawd.centerY * 2)

    context.beginPath();
    context.arc(drawd.centerX,drawd.centerY,drawd.radius,startPoint,endPoint,true);
    context.stroke();
    context.fill();
    context.closePath();
    /*
    */

    if (drawd.guage !== null) {
        var endPoint = (Math.PI/180)*135
        var startPoint = (Math.PI/180)*(135+270*drawd.guage)
        context.strokeStyle = drawd.guageColor;
        
        context.beginPath();
        context.arc(drawd.centerX,drawd.centerY,drawd.radius,startPoint,endPoint,true);
        context.stroke();
        context.fill();
    }

    var startPoint = (Math.PI/180)*0;
    var endPoint = (Math.PI/180)*360;
    context.beginPath();
    context.arc(drawd.centerX,drawd.centerY,drawd.radius,startPoint,endPoint,true);
    context.fill();
    context.closePath();
    /*
    */

    if (drawd.text) {
        var text = drawd.text
        if (drawd.symbol) {
            text += drawd.symbol
        }

        context.fillStyle = drawd.textColor
        context.font = "14px Helvetica Neue";
        context.textAlign = 'center';
        context.fillText(text, drawd.centerX, drawd.centerY + 5, drawd.centerX * 2);
    }
}

angular.module('myApp.directives', [])
    .directive('attributeDisplay', function() {
      return {
        scope: false,
        restrict: 'AE',
        replace: true,
        template: '<a class="control" ng-click="edit(thing,attribute,state)"><canvas width="48" height="48"></canvas></a>',
        link: function($scope, j_a, attrs) {
            var e_canvas = j_a.find("canvas")[0]
            var context = e_canvas.getContext('2d');

            draw_circle(e_canvas, context, $scope)

            $scope.$watch('state', function() {
                draw_circle(e_canvas, context, $scope)
            })
        }
      };
    })
    ;
