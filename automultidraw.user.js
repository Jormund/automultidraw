// ==UserScript==
// @id             iitc-plugin-automultidraw@Jormund
// @name           IITC plugin: Automultidraw
// @category       Layer
// @version        0.1.9.20181031.1930
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/Jormund/automultidraw/master/automultidraw.meta.js
// @downloadURL    https://raw.githubusercontent.com/Jormund/automultidraw/master/automultidraw.user.js
// @description    [2018-10-31-1930] Autodraw for multilayered fields
// @include        https://ingress.com/intel*
// @include        http://ingress.com/intel*
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @include        https://intel.ingress.com/*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==
//Changelog
//0.1.9: activate on intel.ingress.com, changed download url to github
//0.1.8: allow choosing between polygons and polylines
//0.1.7: display number of fields (layers)
//0.1.6: display cumulated area
//0.1.5: checkbox to clear draw and dropdownlist to choose mode
//0.1.3: guess the 3 sets of portals from bookmark folders when there are 3

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.automultidraw = function () { };
    window.plugin.automultidraw.KEY_STORAGE = 'automultidraw-storage';
    window.plugin.automultidraw.FIELD_MODE = { BALANCED: 'BALANCED', STACKED: 'STACKED', DEFAULT: 'BALANCED' };
    //window.plugin.automultidraw.DEFAULT_FIELD_MODE = window.plugin.automultidraw.FIELD_MODE.BALANCED;
    window.plugin.automultidraw.DRAWN_ITEM_TYPE = {
        ONE_LINE_PER_LINK: 'ONE_LINE_PER_LINK',
        TWO_LINES_PER_FIELD: 'TWO_LINES_PER_FIELD',
        ONE_POLYLINE_PER_FIELD: 'ONE_POLYLINE_PER_FIELD',
        ONE_POLYGON_PER_FIELD: 'ONE_POLYGON_PER_FIELD',
        DEFAULT: 'ONE_LINE_PER_LINK'
    };
    //window.plugin.automultidraw.DEFAULT_DRAWN_ITEM_TYPE = window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_LINE_PER_LINK;
    window.plugin.automultidraw.DEFAULT_CLEAR_BEFORE_DRAW = true;
    window.plugin.automultidraw.storage = {
        clearBeforeDraw: window.plugin.automultidraw.DEFAULT_CLEAR_BEFORE_DRAW,
        fieldMode: window.plugin.automultidraw.FIELD_MODE.DEFAULT,
        drawnItemType: window.plugin.automultidraw.DRAWN_ITEM_TYPE.DEFAULT
    };
    window.plugin.automultidraw.debug = false;
    window.plugin.automultidraw.isSmart = undefined; //will be true on smartphones after setup

    // update the localStorage datas
    window.plugin.automultidraw.saveStorage = function () {
        localStorage[window.plugin.automultidraw.KEY_STORAGE] = JSON.stringify(window.plugin.automultidraw.storage);
    };

    // load the localStorage datas
    window.plugin.automultidraw.loadStorage = function () {
        if (typeof localStorage[window.plugin.automultidraw.KEY_STORAGE] != "undefined") {
            try {
                window.plugin.automultidraw.storage = JSON.parse(localStorage[window.plugin.automultidraw.KEY_STORAGE]);
            } catch (err) {
                window.plugin.automultidraw.log(err.stack, true);
                window.plugin.automultidraw.storage = {};
            }
        }

        //ensure default values are always set
        if (typeof window.plugin.automultidraw.storage.clearBeforeDraw == "undefined") {
            window.plugin.automultidraw.storage.clearBeforeDraw = true;
        }
        if (typeof window.plugin.automultidraw.storage.fieldMode == "undefined") {
            window.plugin.automultidraw.storage.fieldMode = window.plugin.automultidraw.FIELD_MODE.DEFAULT;
        }
        if (typeof window.plugin.automultidraw.storage.drawnItemType == "undefined") {
            window.plugin.automultidraw.storage.drawnItemType = window.plugin.automultidraw.DRAWN_ITEM_TYPE.DEFAULT;
        }
        //conversion from old value
        if (window.plugin.automultidraw.storage.fieldMode == 'FIELD_MODE_BALANCED') window.plugin.automultidraw.storage.fieldMode = window.plugin.automultidraw.FIELD_MODE.BALANCED;
        if (window.plugin.automultidraw.storage.fieldMode == 'FIELD_MODE_STACKED') window.plugin.automultidraw.storage.fieldMode = window.plugin.automultidraw.FIELD_MODE.STACKED;
    };
    /***************************************************************************************************************************************************************/
    /** OPTIONS **************************************************************************************************************************************************/
    /***************************************************************************************************************************************************************/
    window.plugin.automultidraw.resetOpt = function () {
        //window.plugin.automultidraw.storage.fieldMode = window.plugin.automultidraw.DEFAULT_FIELD_MODE;
        window.plugin.automultidraw.storage.drawnItemType = window.plugin.automultidraw.DRAWN_ITEM_TYPE.DEFAULT;
        window.plugin.automultidraw.storage.clearBeforeDraw = window.plugin.automultidraw.DEFAULT_CLEAR_BEFORE_DRAW;

        window.plugin.automultidraw.saveStorage();
        window.plugin.automultidraw.openOptDialog();
    }
    window.plugin.automultidraw.saveOpt = function () {
        //window.plugin.automultidraw.storage.fieldMode = $('#automultidraw-fieldMode').val();
        window.plugin.automultidraw.storage.drawnItemType = $('#automultidraw-drawnItemType').val();
        window.plugin.automultidraw.storage.clearBeforeDraw = $("#automultidraw-clearBeforeDraw").is(":checked");

        window.plugin.automultidraw.saveStorage();
    }
    window.plugin.automultidraw.openOptDialog = function () {
        var html =
		'<div>' +
			'<table>';
        html +=
			'<tr>' +
				'<td>' +
					'Clear before draw' +
				'</td>' +
				'<td>' +
					'<input id="automultidraw-clearBeforeDraw" type="checkbox" ' +
						(window.plugin.automultidraw.storage.clearBeforeDraw ? 'checked="checked" ' : '') +
						'/>' +
				'</td>' +
			'</tr>';
        html +=
			'<tr>' +
				'<td>' +
					'Draw type' +
				'</td>' +
				'<td>' +
					'<select id="automultidraw-drawnItemType" >' +
                        '<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_LINE_PER_LINK + '">1 line per link</option>' +
                        '<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.TWO_LINES_PER_FIELD + '">2 lines per field</option>' +
                        '<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYLINE_PER_FIELD + '">1 polyline per field</option>' +
                        '<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYGON_PER_FIELD + '">1 polygon per field</option>' +
				    '</select>' +
                '</td>' +
			'</tr>';
        html +=
			'</table>' +
		'</div>';

        ;
        var d = dialog({
            html: html,
            id: 'automultidraw_opt',
            title: 'Automultidraw preferences',
            width: 'auto',
            buttons: {
                'Reset': function () {
                    window.plugin.automultidraw.resetOpt();
                },
                'Save': function () {
                    window.plugin.automultidraw.saveOpt();
                    $(this).dialog('close');
                }
            }
        });
        $('#automultidraw-drawnItemType').val(window.plugin.automultidraw.storage.drawnItemType);
		var dialogId = d.data('id'); //dialog-bookmarkUnderDraw_opt
        $("#" + dialogId + "").parent().find(".ui-dialog-buttonpane .ui-button .ui-button-text:contains('OK')").parent().hide(); //remove the default OK button
    }
    window.plugin.automultidraw.optClicked = function () {
        window.plugin.automultidraw.openOptDialog();
    }
    /***************************************************************************************************************************************************************/
    /** DRAW **************************************************************************************************************************************************/
    /***************************************************************************************************************************************************************/
    window.plugin.automultidraw.dialogDrawer = function () {
        //no portal selection, we use them all
        window.plugin.automultidraw.drawMultilayeredField();
    }

    window.plugin.automultidraw.resetDraw = function () {
        //similar to window.plugin.drawTools.optReset but without confirmation
        delete localStorage['plugin-draw-tools-layer'];
        window.plugin.drawTools.drawnItems.clearLayers();
        window.plugin.drawTools.load();
        runHooks('pluginDrawTools', { event: 'clear' });
    };

    //convert latlng string from Bookmarks to array of numbers (for Leaflet)
    window.plugin.automultidraw.latlngToLatLngArr = function (latlngstring) {
        var arr = latlngstring.split(',');
        if (arr.length != 2) return null;
        arr[0] = parseFloat(arr[0]);
        arr[1] = parseFloat(arr[1]);
        if (isNaN(arr[0]) || isNaN(arr[1])) return null;
        return arr;
    }

    window.plugin.automultidraw.areaToReadable = function (areaInSquareMeters) {
        if (areaInSquareMeters > 100000) {
            var areaInSquareKilometers = areaInSquareMeters / 1000000;
            if (areaInSquareKilometers < 1000)
                return areaInSquareKilometers.toFixed(2) + 'km&sup2;';
            else
                return areaInSquareKilometers.toFixed(0) + 'km&sup2;';
        }
        else {
            if (areaInSquareMeters < 1000)
                return areaInSquareMeters.toFixed(2) + 'm&sup2;';
            else
                return areaInSquareMeters.toFixed(0) + 'm&sup2;';
        }
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
    window.plugin.automultidraw.drawPolygon = function (latlngs) {
        var layer;
        var layerType = 'polygon';
        layer = L.geodesicPolygon(latlngs, window.plugin.drawTools.polygonOptions);
        map.fire('draw:created', {
            layer: layer,
            layerType: layerType
        });
        return layer;
    }



    window.plugin.automultidraw.drawClicked = function () {
        //save field mode
        window.plugin.automultidraw.storage.fieldMode = $('#automultidraw-fieldMode').val();

        window.plugin.automultidraw.saveStorage();
        if (window.plugin.automultidraw.storage.clearBeforeDraw) {
            window.plugin.automultidraw.resetDraw();
        }

        var options = {
            fieldMode: window.plugin.automultidraw.storage.fieldMode,
            drawnItemType: window.plugin.automultidraw.storage.drawnItemType
        }
        window.plugin.automultidraw.drawMultilayeredField(options);
    }

    window.plugin.automultidraw.drawMultilayeredField = function (options) {
        if (typeof options == 'undefined') options = {
            fieldMode: window.plugin.automultidraw.FIELD_MODE.DEFAULT,
            drawnItemType: window.plugin.automultidraw.DRAWN_ITEM_TYPE.DEFAULT
        };

        try {
            var msg = '';

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
            allDirs.nextIndex = function (index) {
                if (index < allDirs.length - 1) return index + 1;
                else return 0;
            };
            allDirs.prevIndex = function (index) {
                if (index > 0) return index - 1;
                else return allDirs.length - 1;
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

            //window.plugin.bookmarks.KEY_OTHER_BKMRK => "idOthers", le dossier racine

            //$('#mobileinfo').html('Starting automultidraw'); //debug
            window.plugin.automultidraw.log('Starting automultidraw');
            // var bkmrkObj = {};
            var bkmrkArr = [];
            var folders = {};
            if (typeof window.plugin.bookmarks.bkmrksObj != 'undefined'
		            && window.plugin.bookmarks.bkmrksObj.portals != 'undefined') {
                $.each(window.plugin.bookmarks.bkmrksObj.portals, function (folderId, folder) {
                    if (typeof folder.bkmrk != 'undefined') {
                        $.each(folder.bkmrk, function (bookmarkId, bookmarkOri) {
                            var bookmark = {}; //new object so as to not interfere
                            bookmark.folderId = folderId;
                            bookmark.globalIndex = bkmrkArr.length;
                            bookmark.latLngArr = window.plugin.automultidraw.latlngToLatLngArr(bookmarkOri.latlng);
                            bookmark.latLng = L.latLng(bookmark.latLngArr);
                            bkmrkArr.push(bookmark);

                            if (typeof folders[folderId] == 'undefined') folders[folderId] = {};
                            folders[folderId].hasBookmarks = true;
                        });
                    }
                });
            }

            if (bkmrkArr.length < 3) {
                msg = bkmrkArr.length + ' bookmark(s) found (requires minimum 3 to field)';
                //window.plugin.automultidraw.log(msg);
                alert(msg);
                return;
            } //when less than 3 bookmarks, do nothing
            //$('#mobileinfo').html(bkmrkArr.length + ' portals found'); //debug
            window.plugin.automultidraw.log(bkmrkArr.length + ' portals found');

            $.each(allDirs, function (i, dir) {
                //bkmrksPerDir[dir] = [];
                dir.bkmrks = [];
            });
            var folderCount = Object.keys(folders).length; //no need to check 'hasBookmarks' because we created only objects for used folders
            if (folderCount == 3) {//when there are exactly 3 folders containing bookmarks, we trust the user's folders
                window.plugin.automultidraw.log('Spliting by folders');
                var currentDirection = dirA;
                $.each(folders, function (folderId, folder) {//assign direction to each folder
                    folder.direction = currentDirection;
                    currentDirection = allDirs.next(currentDirection);
                });
                //currentDirection = null;
                $.each(bkmrkArr, function (index, bkmrk) {//assign direction to bookmarks of each folder
                    currentDirection = folders[bkmrk.folderId].direction;
                    bkmrk.direction = currentDirection;
                    bkmrk.dirIndex = currentDirection.bkmrks.length;
                    currentDirection.bkmrks.push(bkmrk);
                });
            }
            else {
                //compute distance between following bookmarks
                //MAYBE?: use directions to handle max1 and max2 ?
                var maxDistanceBkmrk1 = { distanceToPreviousBookmark: -1 }, maxDistanceBkmrk2 = { distanceToPreviousBookmark: -2 };
                $.each(bkmrkArr, function (index, bkmrk) {
                    if (index > 0) {
                        var previousBkrmk = bkmrkArr[index - 1];
                        var distance = bkmrk.latLng.distanceTo(previousBkrmk.latLng);
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
                $.each(bkmrkArr, function (index, bkmrk) {
                    if (bkmrk == maxDistanceBkmrk1 || bkmrk == maxDistanceBkmrk2) {
                        currentDirection = allDirs.next(currentDirection);
                    }
                    bkmrk.direction = currentDirection;
                    bkmrk.dirIndex = currentDirection.bkmrks.length;
                    currentDirection.bkmrks.push(bkmrk);
                });
            }
            window.plugin.automultidraw.log('Portals sorted in directions');

            var portalCount = bkmrkArr.length;
            var fieldCount = portalCount - 2;
            if (dirA.bkmrks.length + dirB.bkmrks.length + dirC.bkmrks.length != portalCount) {
                msg = 'Direction lengths and total length dont match';
                //window.plugin.automultidraw.log('Direction lengths and total length dont match');
                alert(msg);
                return;
            }

            //$('#mobileinfo').html('A:' + dirA.bkmrks.length + ',B:' + dirB.bkmrks.length + ',C:' + dirC.bkmrks.length);//debug
            window.plugin.automultidraw.log('A:' + dirA.bkmrks.length + ',B:' + dirB.bkmrks.length + ',C:' + dirC.bkmrks.length);

            var fields = [];
            window.plugin.automultidraw.fields = fields; //debug
            var latLngs = [];
            //link first field
            var curField = [];
            $.each(allDirs, function (i, dir) {
                dir.curBkmrk = dir.bkmrks[0]; //current portals of the loop
                curField.push(dir.curBkmrk);
                dir.consecutiveLayers = 1; //used in the loop
            });
            fields.push(curField);

            for (var f = 2; f <= fieldCount; f++) {
                var prevField = curField;
                curField = [];
                //find the portal that changes
                var changeDir = null;
                var testDirs = allDirs.slice(0);

                if (options.fieldMode == window.plugin.automultidraw.FIELD_MODE.BALANCED) {//balanced
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
                } //end of balanced
                else {//stacked
                    $.each(allDirs, function (i, dir) {
                        dir.remainingPortalCount = (dir.bkmrks.length - (dir.curBkmrk.dirIndex + 1));
                        if (dir.remainingPortalCount > 0) {
                            changeDir = dir;
                            return false; //breaking the loop makes us change only one portal
                        }
                    });
                } //end of stacked
                if (changeDir != null) {
                    window.plugin.automultidraw.log('changeDir:' + changeDir.index);
                    window.plugin.automultidraw.log('changeDir.remainingPortalCount:' + changeDir.remainingPortalCount);
                    window.plugin.automultidraw.log('changeDir.remainingPortalRatio:' + changeDir.remainingPortalRatio);
                    window.plugin.automultidraw.log('changeDir.consecutiveLayers:' + changeDir.consecutiveLayers);
                }
                //link the portal
                if (changeDir != null
                    && changeDir.curBkmrk.dirIndex < (changeDir.bkmrks.length - 1)) {//test that we are not already on last portal just to be sure, but that should never happen
                    window.plugin.automultidraw.log('Portal added in direction:' + changeDir.index);

                    changeDir.curBkmrk = changeDir.bkmrks[changeDir.curBkmrk.dirIndex + 1];

                    //add field to the list
                    $.each(allDirs, function (i, dir) {
                        if (i == changeDir.index) {
                            curField[i] = changeDir.curBkmrk;
                        }
                        else {
                            curField[i] = prevField[i];
                        }
                    });
                    fields.push(curField);
                }
                else {
                    //should never happen
                    if (changeDir == null)
                        window.plugin.automultidraw.log('Fail changeDir is null');
                    else
                        window.plugin.automultidraw.log('Fail, changeDir.curBkmrk.dirIndex:' + changeDir.curBkmrk.dirIndex + '<br/>changeDir.bkmrks.length-1:' + (changeDir.bkmrks.length - 1));
                }
            }
            //draw based on fields
            var cumulatedArea = 0;
            var prevField = [];
            if (options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_LINE_PER_LINK
                || options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYLINE_PER_FIELD
                || options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.TWO_LINES_PER_FIELD) {
                $.each(fields, function (fieldIndex, curField) {
                    window.plugin.automultidraw.log('fieldIndex:' + fieldIndex); //debug

                    //draw
                    var changeIndex = -1;
                    if (fieldIndex != 0) {
                        for (var i = 0; i < 3; i++) {
                            if (curField[i] != prevField[i]) {
                                changeIndex = i;
                                break;
                            }
                        }
                    }
                    if (options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_LINE_PER_LINK) {
                        if (fieldIndex == 0) {
                            latLngs = [curField[0].latLng, curField[1].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                            latLngs = [curField[1].latLng, curField[2].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                            latLngs = [curField[2].latLng, curField[0].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                        }
                        else {
                            latLngs = [curField[changeIndex].latLng, curField[allDirs.nextIndex(changeIndex)].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                            latLngs = [curField[changeIndex].latLng, curField[allDirs.prevIndex(changeIndex)].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                        }
                    }
                    else if (options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYLINE_PER_FIELD) {
                        latLngs = [curField[0].latLng, curField[1].latLng, curField[2].latLng, curField[0].latLng];
                        window.plugin.automultidraw.drawLine(latLngs);
                    }
                    else if (options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.TWO_LINES_PER_FIELD) {
                        if (fieldIndex == 0) {
                            latLngs = [curField[0].latLng, curField[1].latLng, curField[2].latLng, curField[0].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                        }
                        else {
                            latLngs = [curField[allDirs.prevIndex(changeIndex)].latLng, curField[changeIndex].latLng, curField[allDirs.nextIndex(changeIndex)].latLng];
                            window.plugin.automultidraw.drawLine(latLngs);
                        }
                    }

                    prevField = curField;
                });
            }
            else if (options.drawnItemType == window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYGON_PER_FIELD) {
                for (var fieldIndex = fields.length - 1; fieldIndex >= 0; fieldIndex--) {//start from the bigger field so the small one is drawn on top
                    var curField = fields[fieldIndex];
                    latLngs = [curField[0].latLng, curField[1].latLng, curField[2].latLng];
                    window.plugin.automultidraw.drawPolygon(latLngs);
                }
            }

            //compute area
            $.each(fields, function (fieldIndex, curField) {
                window.plugin.automultidraw.log('fieldIndex:' + fieldIndex); //debug

                var latLngs = [];
                $.each(curField, function (bkmrkIndex, bkmrk) {
                    latLngs.push(bkmrk.latLng);
                });
                var area = L.GeometryUtil.geodesicArea(latLngs);
                cumulatedArea += area;
            });

            //TODO: user pref for showmap ?
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

            msg = 'Area: ' + window.plugin.automultidraw.areaToReadable(cumulatedArea);
            msg += ', Layers:' + fieldCount;
            window.plugin.automultidraw.setMessage(msg);
        }
        catch (err) {
            //$('#mobileinfo').html(err.message); //debug
            //window.debug.console.error(err.message);
            //window.plugin.automultidraw.log('Message:'+err.message);
            if (window.plugin.automultidraw.isSmart)
                window.plugin.automultidraw.log(err.stack, true);
            else
                throw err;
        }
    }
    /***************************************************************************************************************************************************************/
    window.plugin.automultidraw.setMessage = function (text) {
        $('#automultidraw-message').html(text);
    }
    window.plugin.automultidraw.addMessage = function (text) {
        if ($('#automultidraw-message').html() == '')
            $('#automultidraw-message').html(text);
        else
            $('#automultidraw-message').append('<br/>' + text);
    }

    window.plugin.automultidraw.log = function (text, isError) {
        if (window.plugin.automultidraw.debug || isError) {
            if (window.plugin.automultidraw.isSmart) {
                $('#automultidraw-log').prepend(text + '<br/>');
            }
            else {
                console.log(text);
            }
        }
    }

    //window.plugin.automultidraw.setupContent = function () {
    //plugin.automultidraw.htmlCalldrawBox = '<a onclick="window.plugin.automultidraw.dialogDrawer();return false;" '
    //								+ 'accesskey="q" title="Draw multilayered field between bookmarked portals [q]">Automultidraw</a>';
    //plugin.automultidraw.htmlToolBox = '<div id="automultidraw-toolbox" style="padding:3px;"></div>';
    //}

    /***************************************************************************************************************************************************************/

    var setup = function () {
        if (!window.plugin.bookmarks) {
            alert('Bookmarks plugin required');
            return false;
        }
        if (!window.plugin.drawTools) {
            alert('Draw tools plugin required');
            return false;
        }
        window.plugin.automultidraw.isSmart = window.isSmartphone();

        window.plugin.automultidraw.loadStorage();
        //window.plugin.automultidraw.setupContent();
        // window.plugin.automultidraw.setupCSS();

        //$('#toolbox').append(window.plugin.automultidraw.htmlCalldrawBox);

        // toolbox menu
        $('#toolbox').after('<div id="automultidraw-toolbox" style="padding:3px;"></div>');
        var amdToolbox = $('#automultidraw-toolbox');
        amdToolbox.append(' <strong>Automultidraw : </strong>');
        amdToolbox.append('<a onclick="window.plugin.automultidraw.drawClicked()" title="Draw multilayered field between bookmarked portals">Draw</a>&nbsp;&nbsp;');
        amdToolbox.append('<select id="automultidraw-fieldMode" ></select>&nbsp;'); //onchange="window.plugin.automultidraw.fieldModeChanged()"
        $('#automultidraw-fieldMode').append('<option value="' + window.plugin.automultidraw.FIELD_MODE.BALANCED + '">Balanced</option>')
									.append('<option value="' + window.plugin.automultidraw.FIELD_MODE.STACKED + '">Stacked</option>')
									;
        amdToolbox.append('<a onclick="window.plugin.automultidraw.optClicked()" title="Preferences">Opt</a>&nbsp;&nbsp;');
        //        amdToolbox.append('<select id="automultidraw-drawnItemType" ></select>'); //onchange="window.plugin.automultidraw.drawnItemTypeChanged()"
        //        $('#automultidraw-drawnItemType').append('<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_LINE_PER_LINK + '">1 line per link</option>')
        //                                    .append('<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.TWO_LINES_PER_FIELD + '">2 lines per field</option>')
        //                                    .append('<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYLINE_PER_FIELD + '">1 polyline per field</option>')
        //									.append('<option value="' + window.plugin.automultidraw.DRAWN_ITEM_TYPE.ONE_POLYGON_PER_FIELD + '">1 polygon per field</option>')
        //									;
        //        amdToolbox.append(' <br /><input id="automultidraw-clearBeforeDraw" type="checkbox"/>'); // onclick="window.plugin.automultidraw.clearBeforeDrawClicked()" 
        //        amdToolbox.append('<label for="automultidraw-clearBeforeDraw">Clear before draw</label>');

        //        $('#automultidraw-clearBeforeDraw').prop('checked', window.plugin.automultidraw.storage.clearBeforeDraw);
        $('#automultidraw-fieldMode').val(window.plugin.automultidraw.storage.fieldMode);
        //        $('#automultidraw-drawnItemType').val(window.plugin.automultidraw.storage.drawnItemType);

        $('#automultidraw-toolbox').append('<div id="automultidraw-message"></div>');

        if (window.plugin.automultidraw.isSmart) {
            $('#automultidraw-toolbox').append('<div id="automultidraw-log"></div>');
        }

        //alert('end of Automultidraw setup');
        //TODO: android Pane
        //if(window.useAndroidPanes())
        //android.addPane("plugin-bookmarks", "Bookmarks", "ic_action_star");
        //window.addHook('paneChanged', window.plugin.bookmarks.onPaneChanged);
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
