(function($) {
    $.fn.work = function() {
        //alert('change success');
        var _this = this;
        var colorArray = ['aqua', 'fuchsia',  'lime', 'maroon', 'navy', 'olive', 'orange', 'purple', 'red', 'silver','gray', 'teal', 'white', 'yellow', 'green'];
        var manifest = {};
        var href = window.location.href;
        var manifestarr = URLToArray(href);
        var url = manifestarr['manifest'];
        _this.attr('id','main');
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
        manifest.annolist=[];
        // index 為設定起始的頁面(第幾個canvas)
        manifest.index = 1;
        manifest.canvasArray = data.sequences[0].canvases;
        manifest.currenCanvas = manifest.canvasArray[manifest.index-1];
        manifest.currenRotation = 0;
        manifest.countCreatAnnotation = 0;
        manifest.canvasSize ={height:manifest.currenCanvas.height,width:manifest.currenCanvas.width};
        manifest.leaflet = leafletMap();
        manifest.drawnItems;
        manifest.annoArray;
        /*create leaflet map*/
        function leafletMap() {
            var canvas = manifest.currenCanvas;
            viewer_offset = $(_this).offset();
            var winSize = {y:$('#mapid')[0].clientHeight,x:$('#mapid')[0].clientWidth};
            let url = canvas.images[0].resource.service['@id'] + '/info.json';
            var data = GetJSON(url);

            var rotation = manifest.currenRotation;
            manifest.annoArray = [];
            for (zoomtemp = 0; zoomtemp < 18; zoomtemp+=1) {
                if (Math.max(canvas.height, canvas.width) < 256 * Math.pow(2, zoomtemp)) {
                    break;
                }
            }
            console.log("project zoom value:"+zoomtemp);

            map = L.map('mapid', {
                crs: L.CRS.Simple,
                center: [0, 0],
                zoom: 18,
                attributionControl:false, //leaflet logo cancel
                zoomControl: true,
                zoomSnap:0.001
            });

            backgroundLabel();
            clickEventLabel();
            L.tileLayer.iiif(url,{
                setMaxBounds:true,
                rotation:manifest.currenRotation
            }).addTo(map);
            manifest.drawnItems = L.featureGroup().addTo(map);
            // 控制layer的顯示
            L.control.layers({},{'drawlayer': manifest.drawnItems}, {
                position: 'topleft',//'topleft', 'topright', 'bottomleft' or 'bottomright'
                collapsed: false
            }).addTo(map);


            if(canvas.otherContent !== undefined){
                var otherContent_url = canvas.otherContent[0]['@id'];
                if ((otherContent_url != 'undefined')&&(otherContent_url != "") ){
                    var annotationlist = GetJSON(otherContent_url);
                    annotation(annotationlist.resources);
                }
            }

            map.on({
                overlayadd: function(e) {
                    manifest.annoArray.map(function(e){e.overlay='add';});

                },
                overlayremove: function(e) {
                    manifest.annoArray.map(function(e){e.overlay='remove';});

                }
            });
            /*繪圖開始*/
            add_chose_button();
            add_rotation_button();
            add_info_button();

            /*為annotation添增mousemove事件*/
            map.on('mousemove', function(e){mousemoveOnMap(e)});

            map.on('click',function(event){
                var latLng = event.latlng;
                var anno_latLng_array_IDs = [];
                annoMousemove(latLng, anno_latLng_array_IDs,'click');
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

        function backgroundLabelSwitch(l){
            if (l != 0) {
                $('#labelClose').click(function() {
                    $('#backgroundLabel').hide();
                });
                $('#backgroundLabel').show();
            } else {
                $('#backgroundLabel').hide();
            }
        }
        /*annotation*/
        function annotation(resources) {
            $.each(resources, function(i,value) {
                manifest.annolist.push(value);

                var layer, shape;
                shape = 'rectangle';
                var point = strToPoint(/xywh=(.*)/.exec(value.on)[1].split(','));
                var chars = formateStr(value.resource.chars);

                var metadata = value.metadata;
                var area = ( point.max.lat * point.max.lat - point.min.lat * point.min.lat ) * ( point.max.lng * point.max.lng - point.min.lng * point.min.lng );
                var padding = 0.5;
                manifest.annoArray.forEach(function(val){
                    if(point.min.lat == val.point.min.lat&&point.min.lng == val.point.min.lng&&point.max.lat == val.point.max.lat&&point.max.lng == val.point.max.lng){
                        point.min.lat -= padding;
                        point.min.lng += padding;
                        point.max.lat -= padding;
                        point.max.lng += padding;
                    }
                });
                var latLng = L.latLngBounds(point.min, point.max);
                layer = L.rectangle(latLng);
                manifest.drawnItems.addLayer(layer);
                $('path')[$('path').length-1].id = layer._leaflet_id;

                labelBinding(layer,chars,value);

                var annoData = {
                    'bounds': layer.getBounds(),
                    'point': point,
                    'metadata': value.metadata,
                    'chars': chars,
                    '_leaflet_id': layer._leaflet_id,
                    'preMouseStatus': '',
                    'color': colorArray[layer._leaflet_id%15],
                    'area':area,
                    'target':'',
                    'overlay':'add',
                    'exist':true,
                };
                manifest.annoArray[layer._leaflet_id] = annoData;
            });
        }

        function labelBinding(layer,chars,value){
            var titleChars = titlize(chars);
            var htmlTag = '<div id="anno' + layer._leaflet_id + '" class="tipbox"><a class="tip" style="background-color:' + colorArray[layer._leaflet_id%15] + ';"></a><a class="tipTitle">' + titleChars + '</a></div>';
            var annolabel = $(htmlTag);
            $('#backgroundLabel').append(annolabel);
            var annoClickStr = '<div id="annoClick'+layer._leaflet_id+'" class="annoClickOuter"><div class="blankLine"></div>'+
                '<div class="annoClickInnerUp" style="background-color:' + colorArray[layer._leaflet_id%15] + ';"></div>'+
                '<div class="annoClickInnerDown">'+
                '<div class="annoClickChars">'+chars+'</div>'+
                '<div class="annoClickMetadata">'+((value)?value.metadata[0].value:'')+'</div>'+
                '<div class="annoClickMetadata">'+((value)?value.metadata[1].value[1]['@value']:'')+'</div>'+
                '</div>'+
                '</div>';
            var clickEventPane = $(annoClickStr);
            $('#clickEventLabel').append(clickEventPane);
            $('#anno' + layer._leaflet_id).click(function() {annoLableClick(manifest.annoArray[layer._leaflet_id]);});
        }
        $(".annoClickChars").dblclick(function(e){
            e.preventDefault();
            map.off('mousemove');
        });

        /*str to rotation point*/
        function strToPoint(str) {
            var canvasSize = manifest.canvasSize
            var rotation = manifest.currenRotation;
            var minPoint = L.point(str[0], str[1]);
            var maxPoint = L.point(parseInt(str[0]) + parseInt(str[2]), parseInt(str[1]) + parseInt(str[3]));
            var x = minPoint.x, y = minPoint.y;
            switch(rotation){
                case 0:
                    break;
                case 90:
                    minPoint.x = canvasSize.height - maxPoint.y ;
                    minPoint.y = maxPoint.x ;
                    maxPoint.x = canvasSize.height - y;
                    maxPoint.y = x;
                    break;
                case 180:
                    minPoint.x = canvasSize.width - maxPoint.x ;
                    minPoint.y = canvasSize.height - maxPoint.y ;
                    maxPoint.x = canvasSize.width - x;
                    maxPoint.y = canvasSize.height - y;
                    break;
                case 270:
                    minPoint.x = maxPoint.y ;
                    minPoint.y = canvasSize.width - maxPoint.x ;
                    maxPoint.x = y;
                    maxPoint.y = canvasSize.width - x;
                    break;
            }

            var min = map.unproject(minPoint, zoomtemp);
            var max = map.unproject(maxPoint, zoomtemp);
            var point = {'min': min,'max': max};
            return point;
        }

        /*RegEx url to array*/
        function URLToArray(url) {
            var request = {};
            var pairs = url.substring(url.indexOf('?') + 1).split('&');
            for (var i = 0; i < pairs.length; i++) {
                if(!pairs[i])
                    continue;
                var pair = pairs[i].split('=');
                request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return request;
        }
        /*change page function*/
        function change() {
             manifest.leaflet.remove();
            manifest.currenCanvas = manifest.canvasArray[manifest.index - 1];
            manifest.leaflet = leafletMap();
        }
        function add_rotation_button(){
            var div =$('<div class= "leaflet-control-layers leaflet-control" style="padding-top: 5px;"></div>');
            var reset = $('<div class="leaflet-control-layers-base reset canvasBtn" aria-hidden="true"><span class="fa fa-home fa-2x"></span></div>');
            var rotationL =$('<div class="leaflet-control-layers-base rotation canvasBtn" aria-hidden="true"><span class="fa fa-undo fa-2x"  value="270"></span></div>');
            var rotationR =$('<div class="leaflet-control-layers-base rotation canvasBtn" aria-hidden="true"><span class="fa fa-repeat fa-2x" value="90" ></span></div>');
            var separatorL = $('<div class="vertical_separator" ></div>');
            var separatorR = $('<div class="vertical_separator"></div>');
            div.append(rotationL,separatorL,reset,separatorR,rotationR);
            $($('.leaflet-top.leaflet-left')[0]).prepend(div);
            $('.reset').click(function(){
                manifest.leaflet.remove();
                manifest.currenRotation = 0;
                manifest.leaflet = leafletMap();
            });
            $('.rotation').click(function(e){
                manifest.leaflet.remove();
                manifest.currenRotation+=parseInt(e.target.getAttribute("value"));
                manifest.currenRotation=(manifest.currenRotation>=360)?manifest.currenRotation-360:manifest.currenRotation;
                manifest.leaflet = leafletMap();

            });
        }
        /*page change right/left button*/
        function add_chose_button() {
            var div = $('<div class= "leaflet-control-layers leaflet-control" style="padding-top: 5px;"></div>');
            var left = $('<div class="leaflet-control-layers-base canvasBtn" ><span class="fa fa-chevron-left fa-2x" aria-hidden="true"> </span></div>');
            var input =  $('<div class="leaflet-control-layers-base canvasPage"><span></span></div>');
            var right = $('<div class="leaflet-control-layers-base canvasBtn" ><span class="fa fa-chevron-right fa-2x" aria-hidden="true"> </span></div>');
            var separatorL = $('<div class="vertical_separator" ></div>');
            var separatorR = $('<div class="vertical_separator"></div>');
            div.append(left,separatorL,input,separatorR,right);
            $($('.leaflet-bottom.leaflet-right')[0]).prepend(div);
            $($(input)[0]).html(manifest.index + '/'+ manifest.canvasArray.length );
            right.click(function(e) {
                elemid = e.target.parentElement.parentElement.id;
                if (manifest.index + 1 <= manifest.canvasArray.length) {
                    manifest.index = manifest.index + 1;
                    change();
                    if(manifest.leftclick == false){
                        manifest.leftclick = true;
                        left.show();
                    }
                } else {
                    alert('Out of Range');
                    right.hide();
                    manifest.rightclick = false;
                }

            });
            left.click(function(e) {
                elemid = e.target.parentElement.parentElement.id;
                if (manifest.index - 1 >= 1) {
                    manifest.index = manifest.index - 1;
                    change();
                    if(manifest.rightclick == false){
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
                success: function(response) {
                   // console.log(response);
                    data = response;
                },
                error: function(xhr, status, error) {
                    console.log("xhr:" + xhr + '\n' + "status:" + status + '\n' + "error:" + error);
                }
            });
            return data;
        }

        /* rotation for mouse moving   */
        function enterorleave(latLng,i){
            if(manifest.currenRotation==0||manifest.currenRotation==180){
                return (latLng.lat < manifest.annoArray[i].point.min.lat) && (latLng.lat > manifest.annoArray[i].point.max.lat)
                    && (latLng.lng > manifest.annoArray[i].point.min.lng) && (latLng.lng < manifest.annoArray[i].point.max.lng);
            }else if(manifest.currenRotation==90){
                return (latLng.lat > manifest.annoArray[i].point.min.lat) && (latLng.lat < manifest.annoArray[i].point.max.lat)
                    && (latLng.lng > manifest.annoArray[i].point.min.lng) && (latLng.lng < manifest.annoArray[i].point.max.lng);
            }else if(manifest.currenRotation==270){
                return (latLng.lat < manifest.annoArray[i].point.min.lat) && (latLng.lat > manifest.annoArray[i].point.max.lat)
                    && (latLng.lng < manifest.annoArray[i].point.min.lng) && (latLng.lng > manifest.annoArray[i].point.max.lng);
            }
        }
        /*check mouse on annotation*/
        function annoMousemove(latLng, anno_latLng_array_IDs,clicked) {
            manifest.annoArray.map(function(anno) {
                if(anno){
                    var i = anno._leaflet_id;
                    //console.log(latLng);
                    if (enterorleave(latLng,i)) {

                        if (manifest.annoArray[i].preMouseStatus != 'mouseenter') {
                            manifest.annoArray[i].preMouseStatus = 'mouseenter';
                        }
                        if(clicked == 'click' && manifest.annoArray[i].target == 'target'){
                            $('#backgroundLabel').hide();
                            $('#clickEventLabel').show();
                            $('#annoClick'+manifest.annoArray[i]._leaflet_id).show();
                            console.log("anno clicked");
                            console.log(manifest.annoArray[i]);
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
        function backgroundLabel(){
            $('#backgroundLabel').remove();
            var backgroundLabel = $('<div id = "backgroundLabel" ></div>');
            $('body').append(backgroundLabel);
            $('#backgroundLabel').hide();
        }
        function clickEventLabel(){
            $('#clickEventLabel').remove();
            var clickEventLabel = $('<div id = "clickEventLabel" ></div>');
            $('body').append(clickEventLabel);
            $('#clickEventLabel').hide();
        }
        function annoShowByArea(arr){
            var array = [];
            var prems = '';
            manifest.annoArray.map(function(anno){
                var i = anno._leaflet_id;
                prems = arr[i].preMouseStatus;
                if(prems == 'mouseenter'){array.push(arr[i]);}
            });

            var elem = (manifest.currenRotation==90||manifest.currenRotation==270)?Math.max.apply(Math,array.map(function(o){return o.area;})): Math.min.apply(Math,array.map(function(o){return o.area;}));
            var minelem;
            array.forEach(function(e) {
                if(e.area == elem){
                    minelem = e ;
                }
            });
            manifest.annoArray.map(function(anno){
                var i = anno._leaflet_id;
                $('#anno'+i).hide();
                manifest.annoArray[i].target = '';
                d3.select($('path#'+i)[0])
                    .transition()
                    .duration(350)
                    .attr({
                        stroke: '#3388ff'
                    })
            });
            manifest.annoArray.map(function(anno){
                var i = anno._leaflet_id;
                if ( typeof minelem != 'undefined'){
                    if( minelem.area == arr[i].area && minelem.overlay=='add' && minelem.exist){
                        $('#anno'+i).show();
                        d3.select($('path#'+i)[0])
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
                if (typeof val.value == 'object') {
                    for (let index = 0; index < val.value.length; index++) {
                        const lan = val.value[index];
                        if(lan['@language'] == window.navigator.language) {
                            p = lan['@value'];
                        }
                    }
                }
            }
            var div = $('<div class="leaflet-control-layers leaflet-control "></div>');
            var icon = $('<i id="infoBtn" class="fa fa-info-circle fa-3x" aria-hidden="true"></i>');
            icon.click(function() {
                $('#info').show();
                map.scrollWheelZoom.disable();
                icon.hide();
            });
            var info = $('<div id="info" class="list-group">' +
                '<div class="scrollbar" id="style-1"><div class="force-overflow">'+
                '<span id="infoClose" > X </span>' +
                '<dl><dt>manifest URI</dt><dd><a href="'+manifest.id+'">' + manifest.id + '</a></dd></dl>' +
                '<dl><dt>Label</dt><dd>' + data1.label + '</dd></dl>' +
                '<dl><dt>Description</dt><dd>' + data1.description + '</dd></dl>' + '<dl><dt>Attribution</dt><dd>' + data1.attribution + '</dd></dl>' +
                '<dl><dt>License</dt><dd>' + data1.license + '</dd></dl>' +
                '<dl><dt>Logo</dt><dd>' + data1.logo['@id'] + '</dd></dl>' +
                '<dl><dt>Viewing Direction</dt><dd>' + data1.viewingDirection + '</dd></dl>' +
                '<dl><dt>Viewing Hint</dt><dd>' + data1.viewingHint + '</dd></dl>' +
                '<dl><dt>' + data1.metadata[0].label + '</dt><dd>' + data1.metadata[0].value + '</dd></dl>' +
                '<dl><dt>' + data1.metadata[1].label + '</dt><dd>' + p + '</dd></dl>' +
                '<dl><dt>' + data1.metadata[2].label + '</dt><dd>' + data1.metadata[2].value + '</dd></dl>' +
                '</div></div>'+
                '</div>');
            div.append(icon,info);
            $(info[0]).find('a').attr("target","_parent");
            $($('.leaflet-top.leaflet-right')[0]).prepend(div);
            $('#infoClose').click(function() {
                $('#info').hide();
                map.scrollWheelZoom.enable();
                $("#infoBtn").show();
            });


        }
        /*Label position*/
        function LabelPosition(point) {
            x = point.x + viewer_offset.left;
            y = point.y + viewer_offset.top;
            $('#backgroundLabel').css({'left': x,'top': y});
            $('#clickEventLabel').css({'left': x,'top': y});
        }
        /*formate string to html innerHTML*/
        function formateStr(str) {
            var div = document.createElement("div");
            if (str != null) {
                div.innerHTML = str;
            }
            if(div.innerText == '')
                return '無描述';
            return div.innerText;
        }
        /*titlize chars*/
        function titlize(str) {
            if(str == '')
                return '無描述';

            return str;//str.substring(0, 9) + '...';
        }
        function annoLableClick(arr) {
            $('#backgroundLabel').hide();
            $('#clickEventLabel').show();
            $('#annoClick'+arr._leaflet_id).show();
        }
    }
})(jQuery);