'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/rooms', {templateUrl: 'partials/rooms.html', controller: 'RoomsController'});
  $routeProvider.otherwise({redirectTo: '/rooms'});
}]);
