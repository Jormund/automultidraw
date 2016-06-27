// ==UserScript==
// @id             iitc-plugin-automultidraw@Jormund
// @name           IITC plugin: Autodraw for multilayered fields
// @category       Layer
// @version        0.1.1.20160627.1040
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/Jormund/automultidraw/master/automultidraw.user.js
// @description    [2016-06-27-1040] Autodraw for multilayered fields
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
    /***********************************************************************

    HOOKS:
    - pluginBkmrksEdit: fired when a bookmarks/folder is removed, added or sorted, also when a folder is opened/closed;
    - pluginBkmrksOpenOpt: fired when the "Bookmarks Options" panel is opened (you can add new options);
    - pluginBkmrksSyncEnd: fired when the sync is finished;

    ***********************************************************************/
    ////////////////////////////////////////////////////////////////////////

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
            //              curBkmrk : current bookmark in the loop


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
                window.plugin.automultidraw.log(bkmrkArr.length + ' bookmarks found (require 3 to field)');
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
                window.plugin.automultidraw.log('No max distance found between bookmarks');
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
                window.plugin.automultidraw.log('Direction lengths and total length dont match');
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
                if(view) {
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

    // window.plugin.automultidraw.setupCSS = function() {
    // $('<style>').prop('type', 'text/css').html('/* hide when printing */\n@media print {\n	#bkmrksTrigger { display: none !important; }\n}\n\n\n#bookmarksBox *{\n	display:block;\n	padding:0;\n	margin:0;\n	width:auto;\n	height:auto;\n	font-family:Verdana,Geneva,sans-serif;\n	font-size:13px;\n	line-height:22px;\n	text-indent:0;\n	text-decoration:none;\n	-webkit-box-sizing:border-box;\n	-moz-box-sizing:border-box;\n	box-sizing:border-box;\n}\n\n#bookmarksBox{\n	display:block;\n	position:absolute !important;\n	z-index:4001;\n	top:100px;\n	left:100px;\n	width:231px;\n	height:auto;\n	overflow:hidden;\n}\n#bookmarksBox .addForm,\n#bookmarksBox #bookmarksTypeBar,\n#bookmarksBox h5{\n	height:28px;\n	overflow:hidden;\n	color:#fff;\n	font-size:14px;\n}\n#bookmarksBox #topBar{\n	height:15px !important;\n}\n#bookmarksBox #topBar *{\n	height: 14px !important;\n}\n#bookmarksBox #topBar *{\n	float:left !important;\n}\n#bookmarksBox .handle{\n	width:80%;\n	text-align:center;\n	color:#fff;\n	line-height:6px;\n	cursor:move;\n}\n#bookmarksBox #topBar .btn{\n	display:block;\n	width:10%;\n	cursor:pointer;\n	color:#20a8b1;\n\n	font-weight:bold;\n	text-align:center;\n	line-height:13px;\n	font-size:18px;\n}\n\n#bookmarksBox #topBar #bookmarksDel{\n	overflow:hidden;\n	text-indent:-999px;\n	background:#B42E2E;\n}\n\n#bookmarksBox #topBar #bookmarksMin:hover{\n	color:#ffce00;\n}\n#bookmarksBox #bookmarksTypeBar{\n	clear:both;\n}\n#bookmarksBox h5{\n	padding:4px 0 23px;\n	width:50%;\n	height:93px !important;\n	text-align:center;\n	color:#788;\n}\n#bookmarksBox h5.current{\n	cursor:default;\n	background:0;\n	color:#fff !important;\n}\n#bookmarksBox h5:hover{\n	color:#ffce00;\n	background:rgba(0,0,0,0);\n}\n#bookmarksBox #topBar,\n#bookmarksBox .addForm,\n#bookmarksBox #bookmarksTypeBar,\n#bookmarksBox .bookmarkList li.bookmarksEmpty,\n#bookmarksBox .bookmarkList li.bkmrk a,\n#bookmarksBox .bookmarkList li.bkmrk:hover{\n	background-color:rgba(8,48,78,.85);\n}\n#bookmarksBox h5,\n#bookmarksBox .bookmarkList li.bkmrk:hover .bookmarksLink,\n#bookmarksBox .addForm *{\n	background:rgba(0,0,0,.3);\n}\n#bookmarksBox .addForm *{\n	display:block;\n	float:left;\n	height:28px !important;\n}\n#bookmarksBox .addForm a{\n	cursor:pointer;\n	color:#20a8b1;\n	font-size:12px;\n	width:35%;\n	text-align:center;\n	line-height:20px;\n	padding:4px 0 23px;\n}\n#bookmarksBox .addForm a:hover{\n	background:#ffce00;\n	color:#000;\n	text-decoration:none;\n}\n#bookmarksBox .addForm input{\n	font-size:11px !important;\n	color:#ffce00;\n	height:28px;\n	padding:4px 8px 1px;\n	line-height:12px;\n	font-size:12px;\n}\n#bookmarksBox #bkmrk_portals .addForm input{\n	width:65%;\n}\n#bookmarksBox #bkmrk_maps .addForm input{\n	width:42%;\n}\n#bookmarksBox #bkmrk_maps .addForm a{\n	width:29%;\n}\n#bookmarksBox .addForm input:hover,\n#bookmarksBox .addForm input:focus{\n	outline:0;\n	background:rgba(0,0,0,.6);\n}\n#bookmarksBox .bookmarkList > ul{\n	clear:both;\n	list-style-type:none;\n	color:#fff;\n	overflow:hidden;\n	overflow-y:auto;\n	max-height:580px;\n}\n#bookmarksBox .sortable-placeholder{\n	background:rgba(8,48,78,.55);\n	box-shadow:inset 1px 0 0 #20a8b1;\n}\n#bookmarksBox .ui-sortable-helper{\n	border-top-width:1px;\n}\n#bookmarksBox .bookmarkList{\n	display:none;\n}\n#bookmarksBox .bookmarkList.current{\n	display:block;\n}\n#bookmarksBox h5,\n#bookmarksBox .addForm *,\n#bookmarksBox ul li.bkmrk,\n#bookmarksBox ul li.bkmrk a{\n	height:22px;\n}\n#bookmarksBox h5,\n#bookmarksBox ul li.bkmrk a{\n	overflow:hidden;\n	cursor:pointer;\n	float:left;\n}\n#bookmarksBox ul .bookmarksEmpty{\n	text-indent:27px;\n	color:#eee;\n}\n#bookmarksBox ul .bookmarksRemoveFrom{\n	width:10%;\n	text-align:center;\n	color:#fff;\n}\n#bookmarksBox ul .bookmarksLink{\n	width:90%;\n	padding:0 10px 0 8px;\n	color:#ffce00;\n}\n#bookmarksBox ul .bookmarksLink.selected{\n	color:#03fe03;\n}\n#bookmarksBox ul .othersBookmarks .bookmarksLink{\n	width:90%;\n}\n#bookmarksBox ul .bookmarksLink:hover{\n	color:#03fe03;\n}\n#bookmarksBox ul .bookmarksRemoveFrom:hover{\n	color:#fff;\n	background:#e22 !important;\n}\n\n/*---- UI border -----*/\n#bookmarksBox,\n#bookmarksBox *{\n	border-color:#20a8b1;\n	border-style:solid;\n	border-width:0;\n}\n#bookmarksBox #topBar,\n#bookmarksBox ul .bookmarkFolder{\n	border-top-width:1px;\n}\n\n#bookmarksBox #topBar,\n#bookmarksBox #bookmarksTypeBar,\n#bookmarksBox .addForm,\n#bookmarksBox ul .bookmarkFolder .folderLabel,\n#bookmarksBox ul li.bkmrk a {\n	border-bottom-width:1px;\n}\n#bookmarksBox ul .bookmarkFolder{\n	border-right-width:1px;\n	border-left-width:1px;\n}\n#bookmarksBox #topBar *,\n#bookmarksBox #bookmarksTypeBar *,\n#bookmarksBox .addForm *,\n#bookmarksBox ul li.bkmrk{\n	border-left-width:1px;\n}\n#bookmarksBox #topBar,\n#bookmarksBox #bookmarksTypeBar,\n#bookmarksBox .addForm,\n#bookmarksBox ul .bookmarksRemoveFrom{\n	border-right-width:1px;\n}\n#bookmarksBox ul .bookmarkFolder.othersBookmarks li.bkmrk,\n#bookmarksBox ul .bookmarkFolder .folderLabel .bookmarksRemoveFrom{\n	border-left-width:0;\n}\n#bkmrksTrigger{\n	display:block;\n	position:absolute;\n	overflow:hidden;\n	top:0;\n	left:277px;\n	width:47px;\n	margin-top:-36px;\n	height:64px;\n	height:0;\n	cursor:pointer;\n	z-index:2999;\n	background-position:center bottom;\n	background-repeat:no-repeat;\n	transition:margin-top 100ms ease-in-out;\n	text-indent:-100%;\n	text-decoration:none;\n	text-align:center;\n}\n#bkmrksTrigger:hover{\n	margin-top:0;\n}\n#sidebar #portaldetails h3.title{\n	width:auto;\n}\n.portal-list-bookmark span {\n	display:inline-block;\n	margin: -3px;\n	width:16px;\n	height:15px;\n	overflow:hidden;\n	background-repeat:no-repeat;\n	cursor:pointer;\n}\n#bkmrksTrigger, .bkmrksStar span, .portal-list-bookmark span {\n	background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC8AAABPCAMAAABMDWzEAAAANlBMVEX/////zgD/zgD///////8Aru7/zgAAru4TtPAAAADA7PtAwvLk9/6b3/n///8Aru510/b/zgDZKp6YAAAACnRSTlOAxo5FtDw9mPoA9GJiegAAAklJREFUeF6dle26ozAIhFO1NkK+vP+b3WbBJRwM7dn5lad9BweoaThI63Z42hfmLn4rLv84d8WvpWxe+fNcFL+VUtzy57kLv67lrbDOqu/nW8tfQ1i3MmjbfrKPc9BjCYfiy2qjjNoDZRfcaBnxnl8Mm8KN4bFzv6q6lVT/P369+DBZFmsZ+LAmWbHllz7XB/OBwDDhF1rVIvwFhHt+vw4dqbViKdC0wHySSsE3e/FxpHPpAo+vUehUSCk7PBuYTpCUw/JsAIoipzlfUTHimPGNMujQ7LA86sSqm2x4BFXbOjTPSWJFxtgpbRTFd+VITdPGQG3b8hArCbm7n9vVefqZxT8I0G2Y+Yi4XFNy+Jqpn695WlP6ksdWSJB9PmJrkMqolADyjIdyrzSrD1Pc8lND8vrNFvfnkw3u8NYAn+ev+M/7iorPH3n8Jd9+mT+b8fg8EBZb+o4n+n0gx4yPMp5MZ3LkW77XJAaZZkdmPtv7JGG9EfLLrnkS3DjiRWseej6OrnXd0ub/hQbftIPHCnfzjDz6sXjy3seKoBqXG97yqiCgmFv198uNYy7XptHlr8aHcbk8NW5veMtrg+A1Ojy3oCeLDs9zgfEHEi2vu03INu4Y/fk3OVOo6N2f8u5IqDs+NvMaYOJQaHj5rut1vGIda/zk5dmdfh7H8XypUJpP0luNne56xnEdildRRPyIfMMDSnGWhEJQvEQZittQwoONYkP946OOMnsERuZNFKMXOYiXkXsO4U0UL1QwffqPCH4Us4xgovih/gBs1LqNE0afwAAAAABJRU5ErkJggg==);\n}\n.bkmrksStar span{\n	display:inline-block;\n	float:left;\n	margin:3px 1px 0 4px;\n	width:16px;\n	height:15px;\n	overflow:hidden;\n	background-repeat:no-repeat;\n}\n.bkmrksStar span, .bkmrksStar.favorite:focus span{\n	background-position:left top;\n}\n.bkmrksStar:focus span, .bkmrksStar.favorite span, .portal-list-bookmark.favorite span{\n	background-position:right top;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder{\n	overflow:hidden;\n	margin-top:-1px;\n	height:auto;\n	background:rgba(8,58,78,.7);\n}\n#bookmarksBox .bookmarkList ul li.sortable-placeholder{\n	box-shadow:inset -1px 0 0 #20a8b1,inset 1px 0 0 #20a8b1,0 -1px 0 #20a8b1;\n	background:rgba(8,58,78,.9);\n}\n#bookmarksBox .bookmarkList .bkmrk.ui-sortable-helper{\n	border-right-width:1px;\n	border-left-width:1px !important;\n}\n#bookmarksBox .bookmarkList ul li ul li.sortable-placeholder{\n	height:23px;\n	box-shadow:inset 0 -1px 0 #20a8b1,inset 1px 0 0 #20a8b1;\n}\n\n#bookmarksBox .bookmarkList ul li.bookmarkFolder.ui-sortable-helper,\n#bookmarksBox .bookmarkList ul li.othersBookmarks ul li.sortable-placeholder{\n	box-shadow:inset 0 -1px 0 #20a8b1;\n}\n\n#bookmarksBox #topBar #bookmarksDel,\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel:hover .bookmarksRemoveFrom,\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel:hover .bookmarksAnchor{\n	border-bottom-width:1px;\n}\n\n/*---------*/\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span,\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span,\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span > span,\n#bookmarksBox .bookmarkList .triangle{\n	width:0;\n	height:0;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel{\n	overflow:visible;\n	height:25px;\n	cursor:pointer;\n	background:#069;\n	text-indent:0;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > *{\n	height:25px;\n	float:left;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor{\n	line-height:25px;\n	color:#fff;\n	width:90%;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span{\n	float:left;\n	border-width:5px 0 5px 7px;\n	border-color:transparent transparent transparent white;\n	margin:7px 7px 0 6px;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel .bookmarksAnchor span{\n	margin:9px 5px 0 5px;\n	border-width:7px 5px 0 5px;\n	border-color:white transparent transparent transparent;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span,\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span > span{\n	display:none;\n	border-width:0 12px 10px 0;\n	border-color:transparent #20a8b1 transparent transparent;\n	margin:-20px 0 0;\n	position:relative;\n	top:21px;\n	left:219px;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span > span{\n	top:18px;\n	left:0;\n	border-width:0 10px 9px 0;\n	border-color:transparent #069 transparent transparent;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel > span,\n#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel > span > span{\n	display:block;\n	display:none;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel:hover > span > span{\n	border-color:transparent #036 transparent transparent;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel:hover .bookmarksAnchor{\n	background:#036;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder ul{\n	display:none;\n	margin-left:10%;\n}\n#bookmarksBox .bookmarkList .bookmarkFolder.open ul{\n	display:block;\n	min-height:22px;\n}\n#bookmarksBox .bookmarkFolder.othersBookmarks ul{\n	margin-left:0;\n}\n\n/*---- Width for deleteMode -----*/\n#bookmarksBox .bookmarksRemoveFrom{\n	display:none !important;\n}\n#bookmarksBox.deleteMode .bookmarksRemoveFrom{\n	display:block !important;\n}\n\n#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor,\n#bookmarksBox ul .bookmarksLink,\n#bookmarksBox ul .othersBookmarks .bookmarksLink{\n	width:100% !important;\n}\n\n#bookmarksBox.deleteMode .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor,\n#bookmarksBox.deleteMode ul .bookmarksLink,\n#bookmarksBox.deleteMode ul .othersBookmarks .bookmarksLink{\n	width:90% !important;\n}\n\n/**********************************************\n	MOBILE\n**********************************************/\n#bookmarksBox.mobile{\n	position:absolute !important;\n	width: 100% !important;\n	height: 100% !important;\n	top: 0 !important;\n	left: 0 !important;\n	margin: 0 !important;\n	padding: 0 !important;\n	border: 0 !important;\n	background: transparent !important;\n	overflow:auto !important;\n}\n#bookmarksBox.mobile .bookmarkList ul,\n#bookmarksBox.mobile .bookmarkList ul li,\n#bookmarksBox.mobile .bookmarkList.current,\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder.open ul{\n	width:100% !important;\n	display:block !important;\n}\n#bookmarksBox.mobile *{\n	box-shadow:none !important;\n	border-width:0 !important;\n}\n#bookmarksBox.mobile #topBar #bookmarksMin,\n#bookmarksBox.mobile #topBar .handle{\n	display:none !important;\n}\n\n#bookmarksBox.mobile #bookmarksTypeBar h5{\n	cursor:pointer;\n	text-align:center;\n	float:left;\n	width:50%;\n	height:auto !important;\n	padding:7px 0;\n}\n#bookmarksBox.mobile #bookmarksTypeBar h5.current{\n	cursor:default;\n	color:#fff;\n}\n#bookmarksBox.mobile #bookmarksTypeBar,\n#bookmarksBox.mobile .bookmarkList .addForm{\n	border-bottom:1px solid #20a8b1 !important;\n}\n#bookmarksBox.mobile .bookmarkList ul li ul li.bkmrk,\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder .folderLabel{\n	height:36px !important;\n	clear:both;\n}\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder .folderLabel a,\n#bookmarksBox.mobile .bookmarkList ul li ul li.bkmrk a{\n	background:none;\n	padding:7px 0;\n	height:auto;\n	box-shadow:inset 0 1px 0 #20a8b1 !important;\n}\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder a.bookmarksRemoveFrom,\n#bookmarksBox.mobile .bookmarkList li.bkmrk a.bookmarksRemoveFrom{\n	box-shadow:inset 0 1px 0 #20a8b1,inset -1px 0 0 #20a8b1 !important;\n	width:10%;\n	background:none !important;\n}\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder a.bookmarksAnchor,\n#bookmarksBox.mobile .bookmarkList li.bkmrk a.bookmarksLink{\n	text-indent:10px;\n	height:36px;\n	line-height:24px;\n	overflow:hidden;\n}\n#bookmarksBox.mobile .bookmarkList ul li.bookmarkFolder ul{\n	margin-left:0 !important;\n}\n#bookmarksBox.mobile .bookmarkList > ul{\n	border-bottom:1px solid #20a8b1 !important;\n}\n\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder.othersBookmarks  ul{\n	border-top:5px solid #20a8b1 !important;\n}\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder,\n#bookmarksBox.mobile .bookmarkList li.bkmrk{\n	box-shadow:inset 0 1px 0 #20a8b1, 1px 0 0 #20a8b1, -1px 1px 0 #20a8b1 !important;\n}\n#bookmarksBox.mobile .bookmarkList > ul{\n	max-height:none;\n/*	width:85% !important;*/\n}\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder .folderLabel{\n	box-shadow:0 1px 0 #20a8b1 !important;\n}\n#bookmarksBox.mobile .bookmarkList ul li.bookmarkFolder ul{\n	width:90% !important;\n	margin-left:10% !important;\n}\n#bookmarksBox.mobile .bookmarkList ul li.bookmarkFolder.othersBookmarks ul{\n	width:100% !important;\n	margin-left:0% !important;\n}\n#bookmarksBox.mobile{\n	margin-bottom:5px !important;\n}\n#bookmarksBox.mobile #bookmarksTypeBar{\n	height:auto;\n}\n#bookmarksBox.mobile .addForm,\n#bookmarksBox.mobile .addForm *{\n	height:35px !important;\n	padding:0;\n}\n#bookmarksBox.mobile .addForm a{\n	line-height:37px;\n}\n\n#bookmarksBox.mobile .addForm a{\n/*	width:25% !important;*/\n}\n#bookmarksBox.mobile .addForm input{\n/*	width:50% !important;*/\n	text-indent:10px;\n}\n#bookmarksBox.mobile #bkmrk_portals .addForm input{\n/*	width:75% !important;*/\n}\n#bookmarksBox.mobile #bookmarksTypeBar h5,\n#bookmarksBox.mobile .bookmarkList .addForm a{\n	box-shadow:-1px 0 0 #20a8b1 !important;\n}\n#bookmarksBox.mobile .bookmarkList li.bookmarkFolder ul{\n	display:none !important;\n	min-height:37px !important;\n}\n#updatestatus .bkmrksStar{\n	float:left;\n	margin:-19px 0 0 -5px;\n	padding:0 3px 1px 4px;\n	background:#262c32;\n}\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span,\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span,\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span > span,\n#bookmarksBox.mobile .bookmarkList .triangle{\n	width:0 !important;\n	height:0 !important;\n}\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span{\n	float:left !important;\n	border-width:5px 0 5px 7px !important;\n	border-color:transparent transparent transparent white !important;\n	margin:7px 3px 0 13px !important;\n}\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder.open .folderLabel .bookmarksAnchor span{\n	margin:9px 1px 0 12px !important;\n	border-width:7px 5px 0 5px !important;\n	border-color:white transparent transparent transparent !important;\n}\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span,\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span > span{\n	display:none !important;\n	border-width:0 12px 10px 0 !important;\n	border-color:transparent #20a8b1 transparent transparent !important;\n	margin:-20px 0 0 100% !important;\n	position:relative !important;\n	top:21px !important;\n	left:-10px !important;\n}\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span > span{\n	top:18px !important;\n	left:0 !important;\n	border-width:0 10px 9px 0 !important;\n	border-color:transparent #069 transparent transparent !important;\n}\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder.open .folderLabel > span,\n#bookmarksBox.mobile .bookmarkList .bookmarkFolder.open .folderLabel > span > span{\n	display:block !important;\n}\n\n/**********************************************\n	DIALOG BOX\n**********************************************/\n/*---- Auto Drawer -----*/\n#bkmrksAutoDrawer,\n#bkmrksAutoDrawer p,\n#bkmrksAutoDrawer a{\n	display:block;\n	padding:0;\n	margin:0;\n}\n#bkmrksAutoDrawer .bookmarkFolder{\n	margin-bottom:4px;\n	border:1px solid #20a8b1;\n}\n#bkmrksAutoDrawer .folderLabel{\n	background:#069;\n	padding:4px 0;\n	color:#fff;\n}\n#bkmrksAutoDrawer .bookmarkFolder div{\n	border-top:1px solid #20a8b1;\n	padding:6px 0;\n	background:rgba(0,0,0,0.3);\n}\n#bkmrksAutoDrawer .bookmarkFolder#idOthers .folderLabel{\n	display:none;\n}\n#bkmrksAutoDrawer .bookmarkFolder#idOthers div{\n	display:block;\n	border-top:none;\n}\n#bkmrksAutoDrawer a{\n	text-indent:10px;\n	padding:2px 0;\n}\n#bkmrksAutoDrawer .longdistance {\n	color: #FFCC00;\n	font-weight: bold;\n	border-bottom: 1px dashed currentColor;\n}\n#bkmrksAutoDrawer .bookmarkFolder div {\n	display:none;\n}\n#bkmrksAutoDrawer a.bkmrk.selected{\n	color:#03dc03;\n}\n\n/*---- Options panel -----*/\n#bkmrksSetbox a{\n	display:block;\n	color:#ffce00;\n	border:1px solid #ffce00;\n	padding:3px 0;\n	margin:10px auto;\n	width:80%;\n	text-align:center;\n	background:rgba(8,48,78,.9);\n}\n#bkmrksSetbox a.disabled,\n#bkmrksSetbox a.disabled:hover{\n	color:#666;\n	border-color:#666;\n	text-decoration:none;\n}\n/*---- Opt panel - copy -----*/\n.ui-dialog-bkmrksSet-copy textarea{\n	width:96%;\n	height:120px;\n	resize:vertical;\n}\n\n\n/*--- Other Opt css ---*/\n#bookmarksBox.mobile a.bookmarksMoveIn{\n	display:none !important;\n}\n\n#bookmarksBox.mobile .bookmarkList ul li ul li.bkmrk a.bookmarksMoveIn{\n	background:none !important;\n	text-align:center;\n	color:#fff;\n	box-shadow: inset 0 1px 0 #20A8B1,inset -1px 0 0 #20A8B1 !important;\n	width:10%;\n}\n\n#bookmarksBox.mobile.moveMode a.bookmarksMoveIn{\n	display:block !important;\n}\n\n#bookmarksBox.moveMode ul .bookmarksLink,\n#bookmarksBox.moveMode ul .othersBookmarks .bookmarksLink{\n	width:90% !important;\n}\n.bookmarksDialog h3{\n	text-transform:capitalize;margin-top:10px;\n}\n.bookmarksDialog .bookmarkFolder{\n	margin-bottom:4px;\n	border:1px solid #20a8b1;\n	background:#069;\n	padding:4px 10px;\n	color:#fff;\n	cursor:pointer;\n}\n.bookmarksDialog .bookmarkFolder:hover{\n	text-decoration:underline;\n}\n\n#bookmarksBox.mobile #topBar .btn{\n	width:100%;height:45px !important;\n	font-size:13px;\n	color:#fff;\n	font-weight:normal;\n	padding-top:17px;\n	text-indent:0 !important;\n}\n#bookmarksBox.mobile .btn{\n	width:50% !important;\n	background:#222;\n}\n#bookmarksBox.mobile .btn.left{\n	border-right:1px solid #20a8b1 !important;\n}\n#bookmarksBox.mobile .btn#bookmarksMove{\n	background:#B42E2E;\n}\n#bkmrksSetbox{\n	text-align:center;\n}\n').appendTo('head');
    // }

    window.plugin.automultidraw.log = function (text, overridebug) {
        if (window.plugin.automultidraw.debug || overridebug) {
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


