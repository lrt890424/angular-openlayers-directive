angular.module('openlayers-directive').directive('olPath', ["$log", "$q", "olMapDefaults", "olHelpers", function ($log, $q, olMapDefaults, olHelpers) {
    var getPathDefaults = function () {
        return {
            projection: 'EPSG:4326',
            type: 'Polygon',
            coords: []
        };
    };

    var pathLayerManager = (function () {
        var mapDict = [];

        function getMapIndex(map) {
            return mapDict.map(function (record) {
                return record.map;
            }).indexOf(map);
        }

        return {
            getInst: function getPathLayerInst(scope, map) {
                var mapIndex = getMapIndex(map);

                if (mapIndex === -1) {
                    var pathLayer = olHelpers.createVectorLayer();
                    pathLayer.set('paths', true);
                    map.addOverlay(pathLayer);
                    mapDict.push({
                        map: map,
                        pathLayer: pathLayer,
                        instScopes: []
                    });
                    mapIndex = mapDict.length - 1;
                }

                mapDict[mapIndex].instScopes.push(scope);

                return mapDict[mapIndex].pathLayer;
            },
            deregisterScope: function deregisterScope(scope, map) {
                var mapIndex = getMapIndex(map);
                if (mapIndex === -1) {
                    throw Error('This map has no paths');
                }

                var scopes = mapDict[mapIndex].instScopes;
                var scopeIndex = scopes.indexOf(scope);
                if (scopeIndex === -1) {
                    throw Error('Scope wan\'t registered');
                }

                scopes.splice(scopeIndex, 1);

                if (!scopes.length) {
                    map.removeLayer(mapDict[mapIndex].pathLayer);
                    delete mapDict[mapIndex].pathLayer;
                    delete mapDict[mapIndex];
                }
            }
        }
    })();

    return {
        restrict: 'E',
        scope: {
            properties: '=olGeomProperties',
            style: '=olStyle',
            pathCoords: '=pathCoords'
        },
        transclude: true,
        require: '^openlayers',
        replace: true,
        template: '<div class="popup-label path">'
        + '<div ng-bind-html="message"></div>'
        + '<ng-transclude></ng-transclude>'
        + '</div>',

        link: function (scope, element, attrs, controller) {
            var isDefined = olHelpers.isDefined;
            var olScope = controller.getOpenlayersScope();
            var createFeature = olHelpers.createFeature;
            var createOverlay = olHelpers.createOverlay;

            var hasTranscluded = element.find('ng-transclude').children().length > 0;

            var createVectorLayer = olHelpers.createVectorLayer;
            var insertLayer = olHelpers.insertLayer;
            var removeLayer = olHelpers.removeLayer;

            olScope.getMap().then(function (map) {
                var pathLayer = pathLayerManager.getInst(scope, map);
                var data = getPathDefaults();

                var mapDefaults = olMapDefaults.getDefaults(olScope);
                var viewProjection = mapDefaults.view.projection;
                var label;
                var path;

                scope.$on('$destroy', function () {
                    pathLayer.getSource().removeFeature(path);
                    if (isDefined(label)) {
                        map.removeOverlay(label);
                    }
                    pathLayerManager.deregisterScope(scope, map);
                });

                scope.$watch('properties', function (properties) {

                    properties.removeAllOverlays = function (evt) {
                        angular.forEach(map.getOverlays(), function (value) {
                            map.removeOverlay(value);
                        });
                        evt.preventDefault();
                    };

                    if (!isDefined(path)) {
                        data.projection = properties.projection ? properties.projection : data.projection;
                        data.coords = properties.coords ? properties.coords : data.coords;
                        if (isDefined(properties.style)) {
                            data.style = properties.style;
                        } else {
                            data.style = mapDefaults.styles.path;
                        }

                        path=createFeature(data,viewProjection);
                        if (!isDefined(path)) {
                            $log.error('[AngularJS - Openlayers] Received invalid data on ' +
                                'the path.');
                        }
                        // Add a link between the feature and the path properties
                        path.set('path', properties);
                        pathLayer.getSource().addFeature(path);
                    }else{
                        pathLayer.getSource().removeFeature(path);
                        if (isDefined(label)) {
                            map.removeOverlay(label);
                        }
                        data.projection = properties.projection ? properties.projection : data.projection;
                        data.coords = properties.coords ? properties.coords : data.coords;
                        if (isDefined(properties.style)) {
                            data.style = properties.style;
                        } else {
                            data.style = mapDefaults.styles.path;
                        }

                        path=createFeature(data,viewProjection);
                        if (!isDefined(path)) {
                            $log.error('[AngularJS - Openlayers] Received invalid data on ' +
                                'the path.');
                        }
                        // Add a link between the feature and the path properties
                        path.set('path', properties);
                        pathLayer.getSource().addFeature(path);
                    }
                }, true);
            });
        }
    };
}]);
