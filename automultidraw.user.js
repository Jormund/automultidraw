// ==UserScript==
// @id             iitc-plugin-automultidraw@Jormund
// @name           IITC plugin: Automultidraw
// @category       Layer
// @version        0.1.2.20160628.1542
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/Jormund/automultidraw/master/automultidraw.user.js
// @description    [2016-06-28-1542] Autodraw for multilayered fields
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @include        https://www.ingress.com/mission/*
// @include        http://www.ingress.com/mission/*
// @match          https://www.ingress.com/mission/*
// @match          http://www.ingress.com/mission/*
// @grant          none 
// ==/UserScript==

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.automultidraw = function () { };

    window.plugin.automultidraw.debug = false;
    window.plugin.automultidraw.isSmart = undefined;
    // window.plugin.automultidraw.isAndroid = function() {
    // if(typeof android !== 'undefined' && android) {
    // return true;
    // }
    // return false;
    // }

    /***************************************************************************************************************************************************************/
    /** AUTO DRAW **************************************************************************************************************************************************/
    /***************************************************************************************************************************************************************/
    window.plugin.automultidraw.dialogDrawer = function () {
        //$('#mobileinfo').html('Beta: no dialog'); //debug
        window.plugin.automultidraw.log('Beta: no dialog'); //debug
        // dialog({
        // html:window.plugin.automultidraw.dialogLoadList,
        // dialogClass:'ui-dialog-autodrawer',
        // title:'Bookmarks - Auto Draw',
        // buttons:{
        // 'DRAW': function() {
        // window.plugin.automultidraw.draw(0);
        // },
        // 'DRAW&VIEW': function() {
        // window.plugin.automultidraw.draw(1);
        // }
        // }
        // });
        // window.plugin.automultidraw.autoDrawOnSelect();

        //version beta, on prend tous les portails
        window.plugin.automultidraw.drawMultilayeredField();
    }

    window.plugin.automultidraw.latlngToLatLngArr = function (latlngstring) {
        var arr = latlngstring.split(',');
        if (arr.length != 2) return null;
        arr[0] = parseFloat(arr[0]);
        arr[1] = parseFloat(arr[1]);
        if (isNaN(arr[0]) || isNaN(arr[1])) return null;
        return arr;
    }

    window.plugin.automultidraw.drawLine = function (latlngs) {
        var layer;
        var layerType = 'polyline';
        layer = L.geodesicPolyline(latlngs, window.plugin.drawTools.lineOptions);
        map.fire('draw:created', {
            layer: layer,
            layerType: layerType
        });
        return layer;
    }


    window.plugin.automultidraw.drawMultilayeredField = function () {
        try {
            var msg = '';
            //var nbDir = 3;
            var dirA = { index: 0 };
            var dirB = { index: 1 };
            var dirC = { index: 2 };
            var allDirs = [dirA, dirB, dirC];
            allDirs.next = function (dir) {
                if (dir.index < allDirs.length - 1) return allDirs[dir.index + 1];
                else return allDirs[0];
            };
            allDirs.prev = function (dir) {
                if (dir.index > 0) return allDirs[dir.index - 1];
                else return allDirs[allDirs.length - 1];
            };
            //            directions will have the following attributes:
            //              bkmrks : bookmarks of the direction
            //              bkmrks.length : number of portals in the direction
            //            temp attributes in the loop:
            //              curBkmrk : current bookmark in the loop
            //              remainingPortalRatio : ratio of portals not used yet in the direction over total number of portals in the direction
            //              remainingPortalCount : number of portals not used yet in the direction
            //              consecutiveLayers : number of fields where the current bookmark is used


            //            local bookmark will have the following attributes:
            //              globalIndex : index in the global array bkmrkArr
            //              dirIndex : index in the direction, from in to out
            //              distanceToPreviousBookmark : distance to the portal that has previous index in bkmrkArr
            //              direction : considering an ABC triangle, values can be dirA, dirB or dirC

            //$('#mobileinfo').html('Starting automultidraw'); //debug
            window.plugin.automultidraw.log('Starting automultidraw');
            // var bkmrkObj = {};
            var bkmrkArr = [];
            if (typeof window.plugin.bookmarks.bkmrksObj != 'undefined'
		            && window.plugin.bookmarks.bkmrksObj.portals != 'undefined') {
                for (folderId in window.plugin.bookmarks.bkmrksObj.portals) {
                    var folder = window.plugin.bookmarks.bkmrksObj.portals[folderId];
                    if (typeof folder.bkmrk != 'undefined') {
                        for (bookmarkId in folder.bkmrk) {
                            var bookmarkOri = folder.bkmrk[bookmarkId];
                            // bkmrkList[bookmarkId] = bookmark;
                            var bookmark = {}; //new object so as to not interfere
                            bookmark.globalIndex = bkmrkArr.length;
                            bookmark.latLng = window.plugin.automultidraw.latlngToLatLngArr(bookmarkOri.latlng);
                            bkmrkArr.push(bookmark);
                        }
                    }
                }
            }
            if (bkmrkArr.length < 3) {
                msg = bkmrkArr.length + ' bookmark(s) found (requires minimum 3 to field)';
                //window.plugin.automultidraw.log(msg);
                alert(msg);
                return;
            } //when less than 3 bookmarks, do nothing
            //$('#mobileinfo').html(bkmrkArr.length + ' portals found'); //debug
            window.plugin.automultidraw.log(bkmrkArr.length + ' portals found');

            //compute distance between following bookmarks
            //MAYBE?: use directions to handle max1 and max2 ?
            var maxDistanceBkmrk1 = { distanceToPreviousBookmark: -1 }, maxDistanceBkmrk2 = { distanceToPreviousBookmark: -2 };
            $.each(bkmrkArr, function (index, bkmrk) {
                if (index > 0) {
                    var previousBkrmk = bkmrkArr[index - 1];
                    var distance = L.latLng(bkmrk.latLng).distanceTo(previousBkrmk.latLng);
                    bkmrk.distanceToPreviousBookmark = distance;
                    if (distance > maxDistanceBkmrk1.distanceToPreviousBookmark) {
                        maxDistanceBkmrk2 = maxDistanceBkmrk1;
                        maxDistanceBkmrk1 = bkmrk;
                    }
                    else if (distance > maxDistanceBkmrk2.distanceToPreviousBookmark) {
                        maxDistanceBkmrk2 = bkmrk;
                    }
                }
            });

            if (maxDistanceBkmrk1.distanceToPreviousBookmark == -1 || maxDistanceBkmrk2.distanceToPreviousBookmark == -1) {
                msg = 'No max distance found between bookmarks';
                //window.plugin.automultidraw.log('No max distance found between bookmarks');
                alert(msg);
                return;
            } //should not be possible with valid distinct bookmarks
            else {
                //$('#mobileinfo').html('Split found by distance'); //debug
                window.plugin.automultidraw.log('Split found by distance');
            }

            //we suppose direction changes with the 2 max distances
            var currentDirection = dirA;
            //var bkmrksPerDir = {};
            $.each(allDirs, function (i, dir) {
                //bkmrksPerDir[dir] = [];
                dir.bkmrks = [];
            });
            $.each(bkmrkArr, function (index, bkmrk) {
                if (bkmrk == maxDistanceBkmrk1 || bkmrk == maxDistanceBkmrk2) {
                    currentDirection = allDirs.next(currentDirection);
                }
                bkmrk.direction = currentDirection;
                bkmrk.dirIndex = currentDirection.bkmrks.length;
                currentDirection.bkmrks.push(bkmrk);
            });
            window.plugin.automultidraw.log('Portals sorted in directions');

            var portalCount = bkmrkArr.length;
            var fieldCount = portalCount - 2;
            if (dirA.bkmrks.length + dirB.bkmrks.length + dirC.bkmrks.length != portalCount) {
                msg = 'Direction lengths and total length dont match';
                //window.plugin.automultidraw.log('Direction lengths and total length dont match');
                alert(msg);
                return;
            }
            //$('#mobileinfo').html('A:' + pCountA + ',B:' + pCountB + ',C:' + pCountC);
            //$('#mobileinfo').html('A:' + dirA.bkmrks.length + ',B:' + dirB.bkmrks.length + ',C:' + dirC.bkmrks.length);//debug
            window.plugin.automultidraw.log('A:' + dirA.bkmrks.length + ',B:' + dirB.bkmrks.length + ',C:' + dirC.bkmrks.length);

            //current portals of the loop
            //var curBkmrk = {};
            $.each(allDirs, function (i, dir) {
                //curBkmrk[dir] = bkmrksPerDir[dir][0];
                dir.curBkmrk = dir.bkmrks[0];
            });

            var latLngs = [];
            //link first field
            $.each(allDirs, function (i, dir) {
                latLngs = [dir.curBkmrk.latLng, allDirs.next(dir).curBkmrk.latLng];
                window.plugin.automultidraw.drawLine(latLngs);
                dir.consecutiveLayers = 1; //used in the loop
            });

            for (var f = 2; f <= fieldCount; f++) {
                //find the portal that changes
                var changeDir = null;
                var testDirs = allDirs.slice(0);

                //Remaining portals ratio
                if (testDirs.length > 1) {
                    var maxRemainingPortalRatio = -Infinity;
                    $.each(testDirs, function (i, dir) {
                        //Count ratio between remaining portals and past portals to give priority to max.
                        dir.remainingPortalCount = (dir.bkmrks.length - (dir.curBkmrk.dirIndex + 1));
                        dir.remainingPortalRatio = dir.remainingPortalCount / dir.bkmrks.length;
                        if (dir.remainingPortalRatio > maxRemainingPortalRatio)
                            maxRemainingPortalRatio = dir.remainingPortalRatio;
                    });

                    //Is max of ratio ?
                    if (testDirs.length > 1) {
                        testDirs = $.grep(testDirs, function (dir, i) {
                            if (dir.remainingPortalRatio < maxRemainingPortalRatio) return false;
                            else return true;
                        });
                        window.plugin.automultidraw.log('After max ratio: testDirs.length=' + testDirs.length);
                        //Has most remaining portals ?
                        if (testDirs.length > 1) {
                            var maxPortals = -Infinity;
                            $.each(testDirs, function (i, dir) {
                                if (dir.remainingPortalCount > maxPortals)
                                    maxPortals = dir.remainingPortalCount;
                                //                                if (dir.bkmrks.length > maxPortals)
                                //                                    maxPortals = dir.bkmrks.length;
                            });
                            testDirs = $.grep(testDirs, function (dir, i) {
                                //if (dir.bkmrks.length < maxPortals) return false;
                                if (dir.remainingPortalCount < maxPortals) return false;
                                else return true;
                            });
                            window.plugin.automultidraw.log('After max portals: testDirs.length=' + testDirs.length);

                            //Is max of consecutive layers ?
                            if (testDirs.length > 1) {
                                var maxConsecutiveLayers = -Infinity;
                                $.each(testDirs, function (i, dir) {
                                    if (dir.consecutiveLayers > maxConsecutiveLayers)
                                        maxConsecutiveLayers = dir.consecutiveLayers;
                                });
                                testDirs = $.grep(testDirs, function (dir, i) {
                                    if (dir.consecutiveLayers < maxConsecutiveLayers) return false;
                                    else return true;
                                });
                            }
                        }
                    }
                }
                //Arbitrary ensure only one result (A before B before C when same priority)
                //(thus with a balanced plan, A will always be chosen before B and B before C)
                window.plugin.automultidraw.log('Before arbitrary: testDirs.length=' + testDirs.length);
                if (testDirs.length == 1) {
                    changeDir = testDirs[0]; //one result, we take it
                }
                else if (testDirs.length > 1) {
                    changeDir = testDirs[0]; //multiple result, arbitrary take the first one 
                }
                else {//testDirs.length = 0;
                    //should never happen because algorithm is based on max
                }
                $.each(allDirs, function (i, dir) {
                    if (changeDir == dir)
                        changeDir.consecutiveLayers = 1;
                    else
                        dir.consecutiveLayers++;
                });
                if (changeDir != null) {
                    window.plugin.automultidraw.log('changeDir:' + changeDir.index);
                    window.plugin.automultidraw.log('changeDir.remainingPortalRatio:' + changeDir.remainingPortalRatio);
                    window.plugin.automultidraw.log('changeDir.consecutiveLayers:' + changeDir.consecutiveLayers);
                }
                //link the portal
                if (changeDir != null
                    && changeDir.curBkmrk.dirIndex < (changeDir.bkmrks.length - 1)) {//test that we are not already on last portal just to be sure, but that should never happen
                    window.plugin.automultidraw.log('Portal added in direction:' + changeDir.index);

                    changeDir.curBkmrk = changeDir.bkmrks[changeDir.curBkmrk.dirIndex + 1];
                    latLngs = [changeDir.curBkmrk.latLng, allDirs.next(changeDir).curBkmrk.latLng];
                    window.plugin.automultidraw.drawLine(latLngs);
                    latLngs = [changeDir.curBkmrk.latLng, allDirs.prev(changeDir).curBkmrk.latLng];
                    window.plugin.automultidraw.drawLine(latLngs);
                }
                else {
                    //should never happen
                    if (changeDir == null)
                        window.plugin.automultidraw.log('Fail changeDir is null');
                    else
                        window.plugin.automultidraw.log('Fail, changeDir.curBkmrk.dirIndex:' + changeDir.curBkmrk.dirIndex + '<br/>changeDir.bkmrks.length-1:' + (changeDir.bkmrks.length - 1));
                }
            }

            if (window.plugin.automultidraw.isSmart) {
                window.show('map');
            }

            // Shown the layer if it is hidden
            if (!map.hasLayer(window.plugin.drawTools.drawnItems)) {
                map.addLayer(window.plugin.drawTools.drawnItems);
            }

            var view = window.plugin.automultidraw.isSmart;
            if (view) {
                latLngs = [];
                $.each(allDirs, function (i, dir) {
                    latLngs.push(dir.curBkmrk.latLng);
                });
                layer = L.geodesicPolygon(latLngs, window.plugin.drawTools.polygonOptions); //not drawn, only used for to get bounds for fitBounds
                layerType = 'polygon';
                map.fitBounds(layer.getBounds());
            }
        }
        catch (err) {
            //$('#mobileinfo').html(err.message); //debug
            //window.debug.console.error(err.message);
            //window.plugin.automultidraw.log('Message:'+err.message);
            window.plugin.automultidraw.log(err.stack, true);
        }
    }
    /***************************************************************************************************************************************************************/

    window.plugin.automultidraw.log = function (text, overridedebug) {
        if (window.plugin.automultidraw.debug || overridedebug) {
			if (window.plugin.automultidraw.isSmart) {
                $('#automultidraw-toolbox').html(text + '<br/>' + $('#automultidraw-toolbox').html());
            }
            else {
                console.log(text);
            }
		}
    }

    window.plugin.automultidraw.setupContent = function () {
        plugin.automultidraw.htmlCalldrawBox = '<a onclick="window.plugin.automultidraw.dialogDrawer();return false;" '
										+ 'accesskey="q" title="Draw multilayered field between bookmarked portals [q]">Automultidraw</a>';
    }

    /***************************************************************************************************************************************************************/

    var setup = function () {
        if (!window.plugin.bookmarks) {
            alert('Bookmarks plugin required');
            return false;
        }
        window.plugin.automultidraw.isSmart = window.isSmartphone();

        // Fired when a bookmarks/folder is removed, added or sorted, also when a folder is opened/closed.
        window.plugin.automultidraw.setupContent();
        // window.plugin.automultidraw.setupCSS();

        $('#toolbox').append(window.plugin.automultidraw.htmlCalldrawBox);

        if (window.plugin.automultidraw.isSmart) {
            $('#toolbox').after('<div id="automultidraw-toolbox"></div>');
        }
    }

    // PLUGIN END //////////////////////////////////////////////////////////


    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
