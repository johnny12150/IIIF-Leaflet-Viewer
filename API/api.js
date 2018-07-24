(function ($) {
    $.fn.work = function () {
        // console.log(this);
        var API_domain;
        //alert('change success');
        var _this = this;
        var colorArray = ['aqua', 'fuchsia', 'lime', 'maroon', 'navy', 'olive', 'orange', 'purple', 'red', 'silver', 'gray', 'teal', 'white', 'yellow', 'green'];
        var manifest = {};
        var href = window.location.href;
        var manifestarr = URLToArray(href);
        var url = manifestarr['manifest'];
        _this.attr('id', 'main');
        var elem = '#main';
        var map;
        var viewer_offset;
        var data = GetJSON(url);
        var zoomtemp;
        var div = $('<div id ="mapid" class="mapid"></div>');
        $(elem).append(div);
        manifest.data = data;
        manifest.element = elem;
        manifest.canvasArray = [];
        manifest.annolist = [];
        // index 為設定起始的頁面(第幾個canvas)
        manifest.index = 1;
        manifest.canvasArray = data.sequences[0].canvases;
        manifest.currenCanvas = manifest.canvasArray[manifest.index - 1];
        manifest.currenRotation = 0;
        manifest.countCreatAnnotation = 0;
        manifest.canvasSize = {height: manifest.currenCanvas.height, width: manifest.currenCanvas.width};
        manifest.leaflet = leafletMap();
        manifest.drawnItems;
        manifest.annoArray;
        // new layers
        manifest.drawnItems2;

        // var obj3 = $('#manifest3');
        // console.log(obj3[0].baseURI);
        var checkbox03 = $('#manifest3').parent();

        // 存所有path的id
        var path_order = [];
        for (let n = 0; n < $('path').length; n++)
            path_order.push(($('path')[n].id));
        console.log(path_order);


        /*create leaflet map*/
        function leafletMap() {
            var canvas = manifest.currenCanvas;
            viewer_offset = $(_this).offset();
            var winSize = {y: $('#mapid')[0].clientHeight, x: $('#mapid')[0].clientWidth};
            let url = canvas.images[0].resource.service['@id'] + '/info.json';
            var data = GetJSON(url);

            var rotation = manifest.currenRotation;
            manifest.annoArray = [];
            for (zoomtemp = 0; zoomtemp < 18; zoomtemp += 1) {
                if (Math.max(canvas.height, canvas.width) < 256 * Math.pow(2, zoomtemp)) {
                    break;
                }
            }
            console.log("project zoom value:" + zoomtemp);

            map = L.map('mapid', {
                crs: L.CRS.Simple,
                center: [0, 0],
                zoom: 18,
                attributionControl: false, //leaflet logo cancel
                zoomControl: true,
                zoomSnap: 0.001
            });

            backgroundLabel();
            clickEventLabel();

            L.tileLayer.iiif(url, {
                setMaxBounds: true,
                rotation: manifest.currenRotation
            }).addTo(map);

            manifest.drawnItems = L.featureGroup().addTo(map);
            manifest.drawnItems2 = L.featureGroup().addTo(map);

            // 控制顯示分層的選項
            var overlay = {
                'fetch anno': manifest.drawnItems,
                'newly add': manifest.drawnItems2,
                // '<div id="manifest3" style="display:inline-block;">manifest03</div>': manifest.drawnItems2
            };

            // control layers
            L.control.layers({}, overlay, {
                position: 'topleft',//'topleft', 'topright', 'bottomleft' or 'bottomright'
                collapsed: false
            }).addTo(map);

            // L.control.layers({}, {'drawlayer': manifest.drawnItems}, {
            //     position: 'topleft',//'topleft', 'topright', 'bottomleft' or 'bottomright'
            //     collapsed: false
            // }).addTo(map);


            if (canvas.otherContent !== undefined) {
                var otherContent_url = canvas.otherContent[0]['@id'];
                if ((otherContent_url != 'undefined') && (otherContent_url != "")) {
                    var annotationlist = GetJSON(otherContent_url);
                    annotation(annotationlist.resources);
                }
            }

            // control the type of annotations
            map.addControl(new L.Control.Draw({
                edit: {
                    // 選擇要控制的featuregroup, 只能有一個不能是多個
                    // 因此每個layer都必須盡到這個manifest.drawnItems (layer可以存在多個manifest.drawnItems)
                    featureGroup: manifest.drawnItems,
                    poly: {
                        allowIntersection: false
                    }
                },
                draw: {
                    polygon: {
                        allowIntersection: false,
                        showArea: false
                    },
                    polygon: false,
                    rectangle: true,
                    polyline: false,
                    circle: false,
                    marker: false,
                    circlemarker: false
                }
            }));
            map.on({
                overlayadd: function (e) {
                    manifest.annoArray.map(function (e) {
                        e.overlay = 'add';
                    });

                },
                overlayremove: function (e) {
                    manifest.annoArray.map(function (e) {
                        e.overlay = 'remove';
                    });

                }
            });
            /*繪圖開始*/
            add_chose_button();
            add_rotation_button();
            add_info_button();

            map.on(L.Draw.Event.DRAWSTART, function (event) {
                $(document).mousemove(function (event) {
                });
                $("#annotation_cancel").unbind("click");
                $("#annotation_save").unbind("click");
            });
            /*為annotation添增mousemove事件*/
            map.on('mousemove', function (e) {
                mousemoveOnMap(e)
            });

            /*繪畫完成，記錄形狀儲存的點與其資訊*/
            map.on(L.Draw.Event.CREATED, function (event) {
                var layer = event.layer;
                manifest.drawnItems.addLayer(layer);
                manifest.drawnItems2.addLayer(layer);

                $('#confirmOverlay').show();
                var box = $('#confirmBox');
                var overlay = $('#confirmOverlay');

                if (y + box.height() >= overlay.height()) {
                    if (x + box.width() >= overlay.width()) {
                        box.css('left', x - box.width());
                        box.css('top', y - box.height());
                    } else {
                        box.css('left', x);
                        box.css('top', y - box.height());
                    }
                } else if (x + box.width() >= overlay.width()) {
                    if (y + box.height() >= overlay.height()) {
                        box.css('left', x - box.width());
                        box.css('top', y - box.height());
                    } else {
                        box.css('left', x - box.width());
                        box.css('top', y);
                    }
                } else {
                    $('#confirmBox')
                        .css('left', x)
                        .css('top', y);
                }

                $('#annotation_save').click(function (e) {
                    manifest.countCreatAnnotation++;
                    var chars = formateStr(tinyMCE.activeEditor.getContent());
                    var zoom = manifest.leaflet.getZoom();
                    var point = strToPoint([layer._pxBounds.min.x, layer._pxBounds.min.y, layer._pxBounds.max.x - layer._pxBounds.min.x, layer._pxBounds.max.y - layer._pxBounds.min.y]);

                    var annoData = {
                        'bounds': layer.getBounds(),
                        'point': {'min': layer._latlngs[0][1], 'max': layer._latlngs[0][3]},
                        'metadata': '',
                        'chars': chars,
                        '_leaflet_id': layer._leaflet_id,
                        'preMouseStatus': '',
                        'color': colorArray[layer._leaflet_id % 15],
                        'area': (layer._latlngs[0][3].lat * layer._latlngs[0][3].lat - layer._latlngs[0][1].lat * layer._latlngs[0][1].lat) * (layer._latlngs[0][3].lng * layer._latlngs[0][3].lng - layer._latlngs[0][1].lng * layer._latlngs[0][1].lng),
                        'target': '',
                        'overlay': 'add',
                        'exist': true
                    };

                    // console.log(point);
                    // console.log(annoData.point);

                    console.log("anno created");
                    console.log(annoData);

                    manifest.drawnItems.addLayer(layer);
                    manifest.drawnItems2.addLayer(layer);
                    // annoArray會根據 leaflet_id 把資料放進去
                    // manifest.annoArray[layer._leaflet_id] = annoData;
                    // layer._path.id = layer._leaflet_id;
                    // labelBinding(layer, chars);
                    // 處理on 的xywh
                    // 做anno 座標edit的話 可能也需要
                    var p = convert_latlng_SVG(annoData.point);
                    var xywh = formatFloat(p[0].x, 2) + ',' + formatFloat(p[0].y, 2) + ',' + formatFloat((p[1].x - p[0].x), 2) + ',' + formatFloat((p[1].y - p[0].y), 2);
                    console.log([layer._pxBounds.min.x, layer._pxBounds.min.y, layer._pxBounds.max.x - layer._pxBounds.min.x, layer._pxBounds.max.y - layer._pxBounds.min.y]);
                    console.log(xywh);
                    var json = {
                        "@id": "default",
                        "@type": "oa:Annotation",
                        "motivation": "sc:painting",
                        "metadata": [
                            {
                                "label": "Author",
                                "value": "luluyen"
                            },
                            {
                                "label": "Published",
                                "value": [
                                    {
                                        "@value": "Academia Sinica Center for Digital Cultures",
                                        "@language": "en"
                                    },
                                    {
                                        "@value": "數位文化中心",
                                        "@language": "zh-TW"
                                    }
                                ]
                            }
                        ],
                        "resource": {
                            "@id": "https://cyberisland.teldap.tw/album/zHxo/annotation/body_mmNltghrjZwmgrmTIbelETIkeYjSihbw_0",
                            "@type": "dctypes:Text",
                            "format": "text/plain",
                            "chars": chars,
                            "language": navigator.language
                        },
                        "on": manifest.currenCanvas["@id"] + "#xywh=" + xywh
                    };
                    // console.log(json);
                    console.log("anno create count:" + manifest.countCreatAnnotation);
                    var c_index = manifest.index - 1;
                    console.log("canvas_index: " + c_index);

                    var full_mid = manifest.data['@id'];
                    var cut = full_mid.split("/GET/").pop();
                    var mId = cut.split("/manifest")[0];

                    // var url = 'http://172.16.100.20:3033/api/POST/anno/mongo';
                    var url_mysql = 'http://172.16.100.20:3033/api/POST/anno/mysql';
                    var new_anno_index;
                    // fetch to save anno
                    fetch(url_mysql, {
                        method: "POST",
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            anno_data: json.resource.chars,
                            anno_place: json.on,
                            other_content: canvas.otherContent[0]['@id'],
                            // for mongo
                            // mId:manifest.data['_id'],
                            // for mysql
                            mId: mId,
                            canvas_index: c_index
                        })
                    })
                    // 修好顯示response
                    // .then(res=>res.json())
                        .then(function (res) {
                            // console.log(res);
                            return res.json();
                        })
                        // .then(text=>{
                        .then(function (text) {
                            // console.log("回傳:" + JSON.stringify(text));
                            if (text.text == 'add new one') {
                                console.log("no need to update otherContent url");
                                // console.log("anno_index為"+text.num);
                                manifest.annoArray[layer._leaflet_id] = annoData;
                                // 處理刪除bug (新增後要馬上可以刪除的)
                                // 1. 從fetch回來的response把資料給過去
                                // 要server resopnose 創好的 resource @id 可以得知new_anno_index
                                new_anno_index = text.num;
                                // 2. annoArray送他anno_index
                                manifest.annoArray[layer._leaflet_id].anno_index = new_anno_index;
                                json.resource['@id'] = text.resources_id;
                                console.log(text.resources_id);
                                json.anno_index = new_anno_index;
                                // 取代原本 @id 是 default
                                json['@id'] = canvas.otherContent[0]['@id'];
                                manifest.annolist.push(json);
                                // console.log("新增之後的annolist:"+ JSON.stringify(manifest.annolist));
                                // annoArray會根據 leaflet_id 把資料放進去

                                layer._path.id = layer._leaflet_id;
                                labelBinding(layer, chars, json);

                                // todo 目前測試結果這樣可以讓剛新增的可以馬上編輯, 也不會造成其他已存在的無法暫存舊的註記
                                $(".annoClickChars").unbind('dblclick');
                                $(".annoClickChars").dblclick(function (e) {
                                    e.preventDefault();
                                    map.off('mousemove');
                                    textEditorOnDblclick(e);
                                });

                                for (let n = path_order.length; n < $('path').length; n++)
                                    path_order.push(($('path')[n].id));
                                console.log(path_order);
                            }
                            else if (text.text == 'things go sideways' || text.text == 'not an auth action') {
                                // console.log(text.text);
                                alert("You don't have the permission to create an annotation.");
                                manifest.drawnItems.removeLayer(layer);
                                manifest.drawnItems2.removeLayer(layer);
                            }
                            else {
                                // 處理新增的bug
                                // 1. 剛新增好要更新client端的otherContent URL, 不然換頁依舊不會顯示註記(這個canvas第一次註記的話)
                                console.log("updated otherContent Url: " + text.text);
                                manifest.annoArray[layer._leaflet_id] = annoData;
                                canvas.otherContent[0]['@id'] = text.text;
                                new_anno_index = text.num;
                                manifest.annoArray[layer._leaflet_id].anno_index = new_anno_index;
                                json.resource['@id'] = text.resources_id;
                                json.anno_index = new_anno_index;
                                json['@id'] = canvas.otherContent[0]['@id'];
                                manifest.annolist.push(json);
                                // console.log("新增之後的annolist:"+ JSON.stringify(manifest.annolist));

                                layer._path.id = layer._leaflet_id;
                                labelBinding(layer, chars, json);

                                for (let n = path_order.length; n < $('path').length; n++)
                                    path_order.push(($('path')[n].id));
                                console.log(path_order);

                                // 新增後馬上註記
                                $(".annoClickChars").unbind('dblclick');
                                $(".annoClickChars").dblclick(function (e) {
                                    e.preventDefault();
                                    map.off('mousemove');
                                    textEditorOnDblclick(e);
                                });
                            }
                        })

                        // .then(function(response) {
                        //     //處理 response
                        //     var res_data;
                        //     console.log('fetch to save anno is done !');
                        //     // fail for unknown reason
                        //     // res_data = response.text();
                        //     // console.log("回傳:"+ res_data);
                        //     // console.log("回傳:"+ JSON.stringify(response.body));
                        //     // console.log("回傳:"+  response.text());
                        //     if (res_data== 'add new one') {
                        //         // otherContent url 沒有變的
                        //     }else {
                        //         // 處理新增的bug
                        //         // 1. 剛新增好要更新client端的otherContent URL, 不然換頁依舊不會顯示註記(這個canvas第一次註記的話)
                        //         // canvas.otherContent[0]['@id']=res_data;
                        //     }
                        //     // 處理新增的bug
                        //     // 1. 剛新增好要更新client端的otherContent URL, 不然換頁依舊不會顯示註記(這個canvas第一次註記的話)
                        //     // 直接更新 otherContent url 不管是不是第一次新增
                        //     var new_data_url = 'http://172.16.100.20:3033/api/GET/manifest/'+manifest.data['_id'];
                        //     var new_data = GetJSON(new_data_url);
                        //     console.log("otherContent Url " + new_data.sequences[0].canvases[manifest.index-1].otherContent[0]['@id']);
                        //     canvas.otherContent[0]['@id'] = new_data.sequences[0].canvases[manifest.index-1].otherContent[0]['@id'];
                        // })
                        .catch(function (err) {
                            // Error :(
                            console.log(err);
                        })
                    // end

                    // IE 11 可能不支援fetch需改成ajax
                    // $.ajax({
                    //     type: 'POST',
                    //     url: url,
                    //     crossDomain: true,
                    //     data: { id: annoData._leaflet_id}, //passing data to server
                    //     success: function(response) {
                    //         console.log('done!');
                    //     }
                    // });


                    $('#confirmOverlay').hide();
                    tinyMCE.activeEditor.setContent('');

                });
                $('#annotation_cancel').click(function (e) {
                    manifest.drawnItems.removeLayer(layer);
                    manifest.drawnItems2.removeLayer(layer);
                    tinyMCE.activeEditor.setContent('');
                    $('#confirmOverlay').hide();
                });

            });
            // 註解位置update
            map.on('draw:edited', function (e) {
                var layers = e.layers;
                var new_On_Url;
                var edit_resources_id_index;
                layers.eachLayer(function (layer) {
                    var tmp_bounds, tmp_point, tmp_area, leaflet_id;
                    manifest.annoArray.map(function (anno) {
                        if (anno._leaflet_id == layer._leaflet_id) {
                            // save old data
                            tmp_bounds = manifest.annoArray[anno._leaflet_id].bounds;
                            tmp_point = manifest.annoArray[anno._leaflet_id].point;
                            tmp_area = manifest.annoArray[anno._leaflet_id].area; // should be the same as the new ones
                            leaflet_id = layer._leaflet_id;
                            console.log(manifest.annoArray[anno._leaflet_id]);

                            // update to new data
                            manifest.annoArray[anno._leaflet_id].bounds = layer.getBounds();
                            var point = {
                                min: {lat: layer._bounds._northEast.lat, lng: layer._bounds._southWest.lng},
                                max: {lat: layer._bounds._southWest.lat, lng: layer._bounds._northEast.lng}
                            };
                            manifest.annoArray[anno._leaflet_id].point = point;
                            manifest.annoArray[anno._leaflet_id].area = (point.max.lat * point.max.lat - point.min.lat * point.min.lat) * (point.max.lng * point.max.lng - point.min.lng * point.min.lng);

                            // console.log("edited annotation info");
                            // console.log(manifest.annoArray[anno._leaflet_id]);
                            edit_resources_id_index = manifest.annoArray[anno._leaflet_id].anno_index;

                            // 處理xywh 後把他加到on 的URL 並update到 anno 資料庫
                            var p = convert_latlng_SVG(manifest.annoArray[anno._leaflet_id].point);
                            var xywh = formatFloat(p[0].x, 2) + ',' + formatFloat(p[0].y, 2) + ',' + formatFloat((p[1].x - p[0].x), 2) + ',' + formatFloat((p[1].y - p[0].y), 2);
                            console.log("after edit: " + xywh);
                            new_On_Url = manifest.currenCanvas["@id"] + "#xywh=" + xywh;
                            console.log("新的註記位置URL: " + new_On_Url);
                        }
                    });
                    //do whatever you want; most likely save back to db
                    // 透過index 來取得resources的@id
                    var edit_resources_id = manifest.annolist.find(x => x.anno_index === edit_resources_id_index)
                        ['@id'];
                    console.log("被更新的註記的resources @id: " + edit_resources_id);

                    // 處理一下要給過去的anno id
                    // 直接用第一個annolist的是因為同一筆的annoId都一樣
                    var pass_aId = manifest.annolist[0]['@id'].split("body_").pop();
                    var the_aId = pass_aId.split("_");

                    // fetch to save the change of OnUrl
                    // var updateOn_url = 'http://172.16.100.20:3033/api/PUT/anno/mongo';
                    // mysql version url
                    var updateOn_url_mysql = 'http://172.16.100.20:3033/api/PUT/anno/on/mysql';

                    fetch(updateOn_url_mysql, {
                        method: "PUT",
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            OnUrl: new_On_Url,
                            anno_source_id: edit_resources_id,
                            aId: the_aId[0]
                        })
                    })
                        .then(function (response) {
                            //處理 response
                            //console.log('fetch to save anno is done !');
                            //console.log(response);
                            return response.text();
                        })
                        .then(function (text) {
                            if (text == 'not an auth action') {
                                alert('You don\'t have the right to move it.');
                                console.log(manifest.annoArray[leaflet_id]);
                                // console.log(layer);
                                manifest.drawnItems.removeLayer(layer);
                                // manifest.annoArray[leaflet_id].bounds = tmp_bounds;
                                manifest.annoArray[leaflet_id].point = tmp_point;
                                // console.log(layer);
                                var latLng = L.latLngBounds(manifest.annoArray[leaflet_id].point.min, manifest.annoArray[leaflet_id].point.max);
                                layer = L.rectangle(latLng);
                                manifest.drawnItems.addLayer(layer);
                                layer._path.id = leaflet_id;
                                console.log('revert');
                                console.log(manifest.annoArray[leaflet_id]);
                            }
                            else {
                                console.log(text);
                            }
                        })
                        .catch(function (err) {
                            // Error :(
                            console.log(err);
                        })
                    // end of fetch

                });
            });
            map.on('draw:deleted', function (e) {
                var anno_that_got_deleted;
                var layers = e.layers;
                var tmp_layers = e.layers['_layers'];
                // console.log(tmp_layers);
                // 目前API只支援一次刪除一筆
                layers.eachLayer(function (layer) {
                    var tmp_anno_data, leaflet_id;
                    manifest.annoArray.map(function (anno) {
                        if (anno._leaflet_id == layer._leaflet_id) {
                            // console.log("delete annotation info");
                            // console.log(manifest.annoArray[anno._leaflet_id]);
                            // 要被刪除的註記的index
                            anno_that_got_deleted = manifest.annoArray[anno._leaflet_id].anno_index;
                            // console.log("要被刪除的註記的index: " + anno_that_got_deleted);
                            console.log(layer);

                            // save some data incase we need to revert
                            tmp_anno_data = manifest.annoArray[anno._leaflet_id];
                            leaflet_id = anno._leaflet_id;

                            manifest.annoArray[anno._leaflet_id].exist = false;

                        }
                    });
                    //do whatever you want; most likely save back to db
                    // 把知道要被刪除的註記index 轉換成@id
                    // 讓mongodb可以透過此@id知道要移除哪一筆註記

                    // 從array找 anno_index符合要被刪除的anno_index 的物件的@id
                    // https://stackoverflow.com/questions/7364150/find-object-by-id-in-an-array-of-javascript-objects?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
                    var delete_data_source_id = manifest.annolist.find(x => x.anno_index === anno_that_got_deleted).resource
                        ['@id'];
                    console.log("被刪除的註記的source @id : " + delete_data_source_id);

                    // [problem 02]
                    // 這裡都錯的原因還未知
                    // manifest.annolist.map(function(anno){
                    //     if(anno_that_got_deleted == anno.anno_index){
                    //         // 要被刪除的註記的source @id
                    //         delete_data_source_id = manifest.annolist[anno.anno_index]['@id'];
                    //         // 這裡取到的index是最後一個非要被刪的
                    //         // 造成更新也會有問題
                    //         // 問題same
                    //         console.log(manifest.annolist[anno_that_got_deleted]);
                    //          console.log("被刪除的註記的source @id : "+delete_data_source_id);
                    //     }
                    // });


                    // 處理一下要給過去的anno id
                    // 直接用第一個annolist的是因為同一筆的annoId都一樣
                    var pass_aId = manifest.annolist[0]['@id'].split("body_").pop();
                    var the_aId = pass_aId.split("_");

                    // fetch 要刪除的資訊到anno API
                    // var delete_url = 'http://172.16.100.20:3033/api/DELETE/anno/mongo';
                    var delete_url_mysql = 'http://172.16.100.20:3033/api/DELETE/anno/mysql';
                    fetch(delete_url_mysql, {
                        method: "DELETE",
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            resource_id: delete_data_source_id,
                            aId: the_aId[0]
                        })
                    })
                        .then(function (response) {
                            //處理 response
                            //console.log('fetch to save anno is done !');
                            //console.log(response);
                            return response.text();
                        })
                        .then(function (text) {
                            console.log(text);
                            // revert to the old situation
                            if (text == 'things go sideways' || text == 'not an auth action') {
                                alert('fail to delete the anno');

                                // won't work for deleting for than 1 annotations at once
                                // manifest.leaflet.remove();
                                // manifest.currenRotation = 0;
                                // manifest.leaflet = leafletMap();

                                // alternative way
                                manifest.drawnItems.addLayer(layer);
                                layer._path.id = layer._leaflet_id;

                                // var anno_id = '#anno' + leaflet_id;
                                // $(anno_id).remove();
                                // labelBinding(layer, tmp_anno_data.chars);

                                manifest.annoArray[leaflet_id].exist = true;

                                // map.off('mousemove');
                                // map.on('mousemove', function (e) {
                                //     mousemoveOnMap(e);
                                // });
                            }
                            else {
                                console.log('');
                            }
                        })
                        .catch(function (err) {
                            // Error :(
                            console.log(err);
                        })
                    // end of fetch
                });
            });
            map.on('click', function (event) {
                var latLng = event.latlng;
                var anno_latLng_array_IDs = [];
                annoMousemove(latLng, anno_latLng_array_IDs, 'click');
            });

            // 當checkbox被點擊時會觸發
            map.on('overlayremove', function (e) {
                console.log(e.layer);
                console.log(manifest.annoArray);
                console.log(manifest.annolist);

                // 存leaflet id 的array
                var leaflet_ids = Object.keys(e.layer._layers);

                // for (let i = 0; i< $('path').length;i++)
                //     $('path')[i].id = Object.keys(e.layer._layers)[i];
            });

            // todo: 確認10筆以上註記會不會有問題
            // 當layer被add回來
            map.on('overlayadd ', function (e) {
                console.log(e.layer);

                // 存leaflet id 的array
                var leaflet_ids = Object.keys(e.layer._layers);

                // 全部layer都被清掉的情況
                // for (let i = 0; i< $('path').length;i++)
                //     $('path')[i].id = Object.keys(e.layer._layers)[i];

                for (let i = 0; i < $('path').length; i++)
                    $('path')[i].id = path_order[i];

            });


            // todo: 還要再測試
            // 從下面移上來的優點未知, 可能有利於reset的
            $(".annoClickChars").dblclick(function (e) {
                e.preventDefault();
                map.off('mousemove');
                // console.log('double click run');
                // $(".annoClickChars").unbind('dblclick');
                textEditorOnDblclick(e);
            });

            return map;
        }

        function mousemoveOnMap(e) {
            $('.annoClickOuter').hide();
            $('#clickEventLabel').hide();
            var anno_latLng_array_IDs = [];
            annoMousemove(e.latlng, anno_latLng_array_IDs);
            annoShowByArea(manifest.annoArray);
            backgroundLabelSwitch(anno_latLng_array_IDs.length);
            LabelPosition(map.latLngToContainerPoint(e.latlng));
        }

        function formatFloat(num, pos) {
            var size = Math.pow(10, pos);
            return Math.round(num * size) / size;
        }

        /**將經緯度轉成正常的pixel*/
        function convert_latlng_SVG(points) {
            var array = [];
            $.each(points, function (i, value) {
                var temp = manifest.leaflet.project(value, zoomtemp);
                temp.x = temp.x * 100 / 100;
                temp.y = temp.y * 100 / 100;
                array.push(temp);
            });
            return array;
        }

        function backgroundLabelSwitch(l) {
            if (l != 0) {
                $('#labelClose').click(function () {
                    $('#backgroundLabel').hide();
                });
                $('#backgroundLabel').show();
            } else {
                $('#backgroundLabel').hide();
            }
        }

        /*annotation*/
        function annotation(resources) {
            $.each(resources, function (i, value) {
                // 為了避免以後編輯註記跟刪除會有問題
                // 多存個可以判定是哪個註記的 anno_id 到annolist
                // ex: 取@id 最後面的num
                var anno_sid = value['@id'];
                // console.log(value['@id']);
                var anno_cut = anno_sid.split("_").pop();
                var anno_index = anno_cut.split("_").pop();
                // 從string 轉成int
                var index = parseInt(anno_index);
                // 將anno的index 放到value 這個物件裡
                value.anno_index = index;

                manifest.annolist.push(value);
                // console.log(JSON.stringify(manifest.annolist));

                var layer, shape;
                shape = 'rectangle';
                var point = strToPoint(/xywh=(.*)/.exec(value.on)[1].split(','));
                var chars = formateStr(value.resource.chars);

                var metadata = value.metadata;
                var area = (point.max.lat * point.max.lat - point.min.lat * point.min.lat) * (point.max.lng * point.max.lng - point.min.lng * point.min.lng);
                var padding = 0.5;
                manifest.annoArray.forEach(function (val) {
                    if (point.min.lat == val.point.min.lat && point.min.lng == val.point.min.lng && point.max.lat == val.point.max.lat && point.max.lng == val.point.max.lng) {
                        point.min.lat -= padding;
                        point.min.lng += padding;
                        point.max.lat -= padding;
                        point.max.lng += padding;
                    }
                });
                var latLng = L.latLngBounds(point.min, point.max);
                layer = L.rectangle(latLng);

                // todo : set layergroup by user
                set_layerGroup();
                manifest.drawnItems.addLayer(layer);

                // 透過id讓path知道框該變甚麼顏色
                $('path')[$('path').length - 1].id = layer._leaflet_id;

                labelBinding(layer, chars, value);

                var annoData = {
                    'bounds': layer.getBounds(),
                    'point': point,
                    'metadata': value.metadata,
                    'chars': chars,
                    '_leaflet_id': layer._leaflet_id,
                    'preMouseStatus': '',
                    'color': colorArray[layer._leaflet_id % 15],
                    'area': area,
                    'target': '',
                    'overlay': 'add',
                    'exist': true,
                    // 把自己給定的anno_index也放到annoArray裡方便之後對應是哪筆註記
                    'anno_index': value.anno_index
                };
                manifest.annoArray[layer._leaflet_id] = annoData;
            });
        }

        function labelBinding(layer, chars, value) {
            var titleChars = titlize(chars);
            var htmlTag = '<div id="anno' + layer._leaflet_id + '" class="tipbox"><a class="tip" style="background-color:' + colorArray[layer._leaflet_id % 15] + ';"></a><a class="tipTitle">' + titleChars + '</a></div>';
            var annolabel = $(htmlTag);
            $('#backgroundLabel').append(annolabel);
            var annoClickStr = '<div id="annoClick' + layer._leaflet_id + '" class="annoClickOuter"><div class="blankLine"></div>' +
                '<div class="annoClickInnerUp" style="background-color:' + colorArray[layer._leaflet_id % 15] + ';"></div>' +
                '<div class="annoClickInnerDown">' +
                '<div class="annoClickChars">' + chars + '</div>' +
                '<div class="annoClickMetadata">' + ((value) ? value.metadata[0].value : '') + '</div>' +
                '<div class="annoClickMetadata">' + ((value) ? value.metadata[1].value[1]['@value'] : '') + '</div>' +
                '</div>' +
                '</div>';
            var clickEventPane = $(annoClickStr);
            $('#clickEventLabel').append(clickEventPane);
            // $(".annoClickChars").dblclick(function(e){
            //     e.preventDefault();
            //     map.off('mousemove');
            //     // console.log('double click run');
            //     // $(".annoClickChars").unbind('dblclick');
            //     textEditorOnDblclick(e);
            // });
            $('#anno' + layer._leaflet_id).click(function () {
                annoLableClick(manifest.annoArray[layer._leaflet_id]);
            });
        }

        // $(".annoClickChars").dblclick(function (e) {
        //     e.preventDefault();
        //     map.off('mousemove');
        //     // console.log('double click run');
        //     // $(".annoClickChars").unbind('dblclick');
        //     textEditorOnDblclick(e);
        // });

        function textEditorOnDblclick(e) {
            let oldText = e.target.innerText;
            // console.log(e.target);
            $(e.target).empty();
            let editor = $('<textarea class="newTextEditor" rows="2" cols="24">' + oldText + '</textarea>');
            console.log("oldText: " + oldText);
            $(e.target).append(editor);
            // auto focus
            $('.newTextEditor').focus();
            // handle ESC
            $('.newTextEditor').keyup(function (e) {
                if (e.keyCode === 27) {
                    // when hitting ESC then hide the label
                    var myNode = e.target.parentElement;
                    while (myNode.firstChild) {
                        myNode.removeChild(myNode.firstChild);
                    }
                    myNode.innerHTML = oldText;
                    map.on('mousemove', function (e) {
                        mousemoveOnMap(e);
                    });
                }
            });
            $('.newTextEditor').keypress(function (e) {
                process(e, this);
            });

        }

        // 處理雙擊label後的編輯註記
        function process(e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if (code == 13) { //Enter keycode
                var annoid = e.target.parentElement.parentElement.parentElement.id;
                var newText = e.target.value;
                var myNode = e.target.parentElement;
                // avoid empty input
                if (newText === '')
                    newText = '無描述';

                // while (myNode.firstChild) {
                //     myNode.removeChild(myNode.firstChild);
                // }
                // myNode.innerHTML = newText;

                // 這個annoid就是 _leaflet_id
                annoid = annoid.replace(/[A-Z]|[a-z]/g, "");
                // 取舊的chars
                console.log("old anno: " + document.getElementById("anno" + annoid).children[1].text);
                var old_anno = document.getElementById("anno" + annoid).children[1].text;

                // document.getElementById("anno"+annoid).children[1].text = newText;
                // map.on('mousemove', function(e){mousemoveOnMap(e)});

                // 按下enter可以結束編輯
                // 修改註記的後端動作放以下
                // newText 是修改後取得新的text方式
                console.log("_leaflet_id " + annoid);
                console.log("new anno text: " + newText);
                // 嘗試與annoArray連接

                // [problem 01]
                // array 前面會出現一堆null
                console.log(JSON.stringify(manifest.annoArray));

                // 修改的註記的index
                var source_id_prefix;
                var source_id_index;
                manifest.annoArray.map(function (anno) {
                    if (anno._leaflet_id == annoid) {
                        console.log("修改的anno的index: " + manifest.annoArray[anno._leaflet_id].anno_index);
                        source_id_index = manifest.annoArray[anno._leaflet_id].anno_index;
                    }
                });

                source_id_prefix = manifest.annolist.find(x => x.anno_index === source_id_index).resource
                    ['@id'];

                // [problem 02]
                // 錯的跟刪除的錯誤一樣原因尚不知道
                // manifest.annolist.map(function(anno){
                //     if(source_id_index == anno.anno_index){
                //         // 要被update的註記的source @id
                //         source_id_prefix = manifest.annolist[anno.anno_index]['@id'];
                //     }
                // });

                // fetch to update
                var cut_id = source_id_prefix.split("body_").pop();
                var anno_objID = cut_id.split("_");
                // anno_objID[0]才是 註記的obj ID
                var update_url = "http://172.16.100.20:3033/api/PUT/anno/mongo/" + anno_objID[0];
                var update_url_mysql = "http://172.16.100.20:3033/api/PUT/anno/mysql/" + anno_objID[0];
                fetch(update_url_mysql, {
                    method: "PUT",
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        resource_id: source_id_prefix,
                        text: newText
                    })
                })
                    .then(function (response) {
                        //處理 response
                        //console.log('fetch to save anno is done !');
                        // console.log(response);
                        return response.text();
                    })
                    .then(function (text) {
                        console.log(text);
                        if (text == 'things go sideways' || text == 'not an auth action') {
                            alert('Something going wrong, failed to update the annotation.');
                            while (myNode.firstChild) {
                                myNode.removeChild(myNode.firstChild);
                            }
                            myNode.innerHTML = old_anno;
                            map.on('mousemove', function (e) {
                                mousemoveOnMap(e);
                            });
                        }
                        else {
                            while (myNode.firstChild) {
                                myNode.removeChild(myNode.firstChild);
                            }
                            myNode.innerHTML = newText;
                            document.getElementById("anno" + annoid).children[1].text = newText;
                            map.on('mousemove', function (e) {
                                mousemoveOnMap(e)
                            });
                        }
                    })
                    .catch(function (err) {
                        // Error :(
                        console.log(err);
                    })
                // end of fetch

            }
        }

        /*str to rotation point*/
        function strToPoint(str) {
            var canvasSize = manifest.canvasSize;
            var rotation = manifest.currenRotation;
            var minPoint = L.point(str[0], str[1]);
            var maxPoint = L.point(parseInt(str[0]) + parseInt(str[2]), parseInt(str[1]) + parseInt(str[3]));
            var x = minPoint.x, y = minPoint.y;

            switch (rotation) {
                case 0:
                    break;
                case 90:
                    minPoint.x = canvasSize.height - maxPoint.y;
                    minPoint.y = maxPoint.x;
                    maxPoint.x = canvasSize.height - y;
                    maxPoint.y = x;
                    break;
                case 180:
                    minPoint.x = canvasSize.width - maxPoint.x;
                    minPoint.y = canvasSize.height - maxPoint.y;
                    maxPoint.x = canvasSize.width - x;
                    maxPoint.y = canvasSize.height - y;
                    break;
                case 270:
                    minPoint.x = maxPoint.y;
                    minPoint.y = canvasSize.width - maxPoint.x;
                    maxPoint.x = y;
                    maxPoint.y = canvasSize.width - x;
                    break;
            }

            // unproject: pixel postition to CRS (coordinates)
            var min = map.unproject(minPoint, zoomtemp);
            var max = map.unproject(maxPoint, zoomtemp);
            var point = {'min': min, 'max': max};

            return point;
        }

        /*RegEx url to array*/
        function URLToArray(url) {
            var request = {};
            var pairs = url.substring(url.indexOf('?') + 1).split('&');
            for (var i = 0; i < pairs.length; i++) {
                if (!pairs[i])
                    continue;
                var pair = pairs[i].split('=');
                request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return request;
        }

        /*change page function*/
        function change() {
            //  leaflet remove 似乎與Uncaught TypeError: Cannot read property '_leaflet_pos' of undefined 錯誤有關
            manifest.leaflet.remove();
            // 換頁功能也正常 但跟上面的remove有一樣的錯誤訊息
            // map.remove();

            manifest.currenCanvas = manifest.canvasArray[manifest.index - 1];
            manifest.leaflet = leafletMap();
        }

        function add_rotation_button() {
            var div = $('<div class= "leaflet-control-layers leaflet-control" style="padding-top: 5px;"></div>');
            var reset = $('<div class="leaflet-control-layers-base reset canvasBtn" aria-hidden="true"><span class="fa fa-home fa-2x"></span></div>');
            var rotationL = $('<div class="leaflet-control-layers-base rotation canvasBtn" aria-hidden="true"><span class="fa fa-undo fa-2x"  value="270"></span></div>');
            var rotationR = $('<div class="leaflet-control-layers-base rotation canvasBtn" aria-hidden="true"><span class="fa fa-repeat fa-2x" value="90" ></span></div>');
            var separatorL = $('<div class="vertical_separator" ></div>');
            var separatorR = $('<div class="vertical_separator"></div>');
            div.append(rotationL, separatorL, reset, separatorR, rotationR);
            $($('.leaflet-top.leaflet-left')[0]).prepend(div);
            $('.reset').click(function () {
                manifest.leaflet.remove();
                manifest.currenRotation = 0;
                manifest.leaflet = leafletMap();
                // $(".annoClickChars").dblclick(function (e) {
                //     e.preventDefault();
                //
                //     // disable leaflet map mousemove
                //     map.off('mousemove');
                //
                //     textEditorOnDblclick(e);
                // });
            });
            $('.rotation').click(function (e) {
                manifest.leaflet.remove();
                manifest.currenRotation += parseInt(e.target.getAttribute("value"));
                manifest.currenRotation = (manifest.currenRotation >= 360) ? manifest.currenRotation - 360 : manifest.currenRotation;
                manifest.leaflet = leafletMap();

            });
        }

        /*page change right/left button*/
        function add_chose_button() {
            var div = $('<div class= "leaflet-control-layers leaflet-control" style="padding-top: 5px;"></div>');
            var left = $('<div class="leaflet-control-layers-base canvasBtn" ><span class="fa fa-chevron-left fa-2x" aria-hidden="true"> </span></div>');
            var input = $('<div class="leaflet-control-layers-base canvasPage"><span></span></div>');
            var right = $('<div class="leaflet-control-layers-base canvasBtn" ><span class="fa fa-chevron-right fa-2x" aria-hidden="true"> </span></div>');
            var separatorL = $('<div class="vertical_separator" ></div>');
            var separatorR = $('<div class="vertical_separator"></div>');
            div.append(left, separatorL, input, separatorR, right);
            $($('.leaflet-bottom.leaflet-right')[0]).prepend(div);
            $($(input)[0]).html(manifest.index + '/' + manifest.canvasArray.length);
            right.click(function (e) {
                elemid = e.target.parentElement.parentElement.id;
                if (manifest.index + 1 <= manifest.canvasArray.length) {
                    manifest.index = manifest.index + 1;
                    change();
                    if (manifest.leftclick === false) {
                        manifest.leftclick = true;
                        left.show();
                    }
                } else {
                    alert('Out of Range');
                    right.hide();
                    manifest.rightclick = false;
                }

            });
            left.click(function (e) {
                elemid = e.target.parentElement.parentElement.id;
                if (manifest.index - 1 >= 1) {
                    manifest.index = manifest.index - 1;
                    change();
                    if (manifest.rightclick === false) {
                        manifest.rightclick = true;
                        right.show();
                    }

                } else {
                    alert('Out of Range');
                    left.hide();
                    manifest.leftclick = false;
                }
            });

        };

        /*get json by url*/
        function GetJSON(url) {
            var data;
            $.ajax({
                url: url,
                method: "GET",
                async: false,
                dataType: "JSON",
                success: function (response) {
                    // console.log(response);
                    data = response;
                },
                error: function (xhr, status, error) {
                    console.log("xhr:" + xhr + '\n' + "status:" + status + '\n' + "error:" + error);
                }
            });
            return data;
        }

        /* rotation for mouse moving   */
        function enterorleave(latLng, i) {
            if (manifest.currenRotation === 0 || manifest.currenRotation === 180) {
                return (latLng.lat < manifest.annoArray[i].point.min.lat) && (latLng.lat > manifest.annoArray[i].point.max.lat)
                    && (latLng.lng > manifest.annoArray[i].point.min.lng) && (latLng.lng < manifest.annoArray[i].point.max.lng);
            } else if (manifest.currenRotation === 90) {
                return (latLng.lat > manifest.annoArray[i].point.min.lat) && (latLng.lat < manifest.annoArray[i].point.max.lat)
                    && (latLng.lng > manifest.annoArray[i].point.min.lng) && (latLng.lng < manifest.annoArray[i].point.max.lng);
            } else if (manifest.currenRotation === 270) {
                return (latLng.lat < manifest.annoArray[i].point.min.lat) && (latLng.lat > manifest.annoArray[i].point.max.lat)
                    && (latLng.lng < manifest.annoArray[i].point.min.lng) && (latLng.lng > manifest.annoArray[i].point.max.lng);
            }
        }

        /*check mouse on annotation*/
        function annoMousemove(latLng, anno_latLng_array_IDs, clicked) {
            manifest.annoArray.map(function (anno) {
                if (anno) {
                    var i = anno._leaflet_id;
                    //console.log(latLng);
                    if (enterorleave(latLng, i)) {

                        if (manifest.annoArray[i].preMouseStatus != 'mouseenter') {
                            manifest.annoArray[i].preMouseStatus = 'mouseenter';

                            // console.log("現在指標指到_leaflet_id 為 "+ i + " 的註記");
                            // console.log("指到的註記的annoArray為 " + JSON.stringify(manifest.annoArray[i]));
                            // console.log("指到的註記的index為 " + manifest.annoArray[i].anno_index);
                            // console.log("整個annoArray為 "+ JSON.stringify(manifest.annoArray));
                        }
                        if (clicked === 'click' && manifest.annoArray[i].target === 'target') {
                            $('#backgroundLabel').hide();
                            $('#clickEventLabel').show();
                            $('#annoClick' + manifest.annoArray[i]._leaflet_id).show();
                            // console.log("anno clicked");
                            // console.log(manifest.annoArray[i]);
                        }
                        anno_latLng_array_IDs.push(i);

                    } else {
                        if (manifest.annoArray[i].preMouseStatus != 'mouseleave') {
                            manifest.annoArray[i].preMouseStatus = 'mouseleave';
                        }
                    }
                }

            });
        }

        /**backgroundLabel*/
        function backgroundLabel() {
            $('#backgroundLabel').remove();
            var backgroundLabel = $('<div id = "backgroundLabel" ></div>');
            $('body').append(backgroundLabel);
            $('#backgroundLabel').hide();
        }

        function clickEventLabel() {
            $('#clickEventLabel').remove();
            var clickEventLabel = $('<div id = "clickEventLabel" ></div>');
            $('body').append(clickEventLabel);
            $('#clickEventLabel').hide();
        }

        function annoShowByArea(arr) {
            var array = [];
            var prems = '';
            manifest.annoArray.map(function (anno) {
                var i = anno._leaflet_id;
                prems = arr[i].preMouseStatus;
                if (prems === 'mouseenter') {
                    array.push(arr[i]);
                }
            });

            var elem = (manifest.currenRotation === 90 || manifest.currenRotation === 270) ? Math.max.apply(Math, array.map(function (o) {
                return o.area;
            })) : Math.min.apply(Math, array.map(function (o) {
                return o.area;
            }));
            var minelem;
            array.forEach(function (e) {
                if (e.area === elem) {
                    minelem = e;
                }
            });
            manifest.annoArray.map(function (anno) {
                var i = anno._leaflet_id;
                $('#anno' + i).hide();
                manifest.annoArray[i].target = '';
                d3.select($('path#' + i)[0])
                    .transition()
                    .duration(350)
                    .attr({
                        stroke: '#3388ff'
                    })
            });
            manifest.annoArray.map(function (anno) {
                var i = anno._leaflet_id;
                if (typeof minelem != 'undefined') {
                    if (minelem.area === arr[i].area && minelem.overlay === 'add' && minelem.exist) {
                        $('#anno' + i).show();
                        d3.select($('path#' + i)[0])
                            .transition()
                            .duration(100)
                            .attr({
                                stroke: arr[i].color
                            })
                        manifest.annoArray[i].target = 'target';
                    }
                }
            });

        }

        /*show manifest info button*/
        function add_info_button() {
            var data1 = manifest.data;
            var metadata = data1.metadata;
            var p;
            // metadata.forEach((val) => {
            //     if (typeof val.value == 'object') {
            //         val.value.forEach((lan)=>{
            //             if(lan['@language'] == window.navigator.language){
            //                 p = lan['@value'];
            //             }
            //         })
            //     }
            // })
            for (let index = 0; index < metadata.length; index++) {
                const val = metadata[index];
                if (typeof val.value === 'object') {
                    for (let index = 0; index < val.value.length; index++) {
                        const lan = val.value[index];
                        if (lan['@language'] === window.navigator.language) {
                            p = lan['@value'];
                        }
                    }
                }
            }
            var div = $('<div class="leaflet-control-layers leaflet-control "></div>');
            var icon = $('<i id="infoBtn" class="fa fa-info-circle fa-3x" aria-hidden="true"></i>');
            icon.click(function () {
                $('#info').show();
                map.scrollWheelZoom.disable();
                icon.hide();
            });
            var info = $('<div id="info" class="list-group">' +
                '<div class="scrollbar" id="style-1"><div class="force-overflow">' +
                '<span id="infoClose" > X </span>' +
                '<dl><dt>manifest URI</dt><dd><a href="' + manifest.data['@id'] + '">' + manifest.data['@id'] + '</a></dd></dl>' +
                '<dl><dt>Label</dt><dd>' + data1.label + '</dd></dl>' +
                '<dl><dt>Description</dt><dd>' + data1.description + '</dd></dl>' + '<dl><dt>Attribution</dt><dd>' + data1.attribution + '</dd></dl>' +
                '<dl><dt>License</dt><dd>' + data1.license + '</dd></dl>' +
                '<dl><dt>Logo</dt><dd>' + data1.logo['@id'] + '</dd></dl>' +
                '<dl><dt>Viewing Direction</dt><dd>' + data1.viewingDirection + '</dd></dl>' +
                '<dl><dt>Viewing Hint</dt><dd>' + data1.viewingHint + '</dd></dl>' +
                '<dl><dt>' + data1.metadata[0].label + '</dt><dd>' + data1.metadata[0].value + '</dd></dl>' +
                '<dl><dt>' + data1.metadata[1].label + '</dt><dd>' + p + '</dd></dl>' +
                '<dl><dt>' + data1.metadata[2].label + '</dt><dd>' + data1.metadata[2].value + '</dd></dl>' +
                '</div></div>' +
                '</div>');
            div.append(icon, info);
            $(info[0]).find('a').attr("target", "_parent");
            $($('.leaflet-top.leaflet-right')[0]).prepend(div);
            $('#infoClose').click(function () {
                $('#info').hide();
                map.scrollWheelZoom.enable();
                $("#infoBtn").show();
            });


        }

        /*Label position*/
        function LabelPosition(point) {
            x = point.x + viewer_offset.left;
            y = point.y + viewer_offset.top;
            $('#backgroundLabel').css({'left': x, 'top': y});
            $('#clickEventLabel').css({'left': x, 'top': y});
        }

        /*formate string to html innerHTML*/
        function formateStr(str) {
            var div = document.createElement("div");
            if (str != null) {
                div.innerHTML = str;
            }
            if (div.innerText === '')
                return '無描述';
            return div.innerText;
        }

        /*titlize chars*/
        function titlize(str) {
            if (str === '')
                return '無描述';

            return str;//str.substring(0, 9) + '...';
        }

        function annoLableClick(arr) {
            $('#backgroundLabel').hide();
            $('#clickEventLabel').show();
            $('#annoClick' + arr._leaflet_id).show();
        }

        function set_layerGroup() {

        }
    }
})(jQuery);
