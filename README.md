# IIIF-Leaflet-Viewer

### Doc
This include three major versions:
* `IE`: Support IE usage, but having less functionality.
* `Show`: Support viewing image and annotations with IIIF Image API style
* `API`: This is the front-end project of the Annotation-Server, providing the functionality of creating, updating and deleting annotations on the viewer

### Usage
#### CSS requirement
```
    <link rel="stylesheet" href="../leaflet/leaflet.zoomhome.css"/>
    <link rel="stylesheet" href="../leaflet/leaflet.label.css">
    <link rel="stylesheet" href="../leaflet/leaflet.css"/>
    <link rel="stylesheet" href="../leaflet/leaflet.draw.css"/>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css"/>
    <link rel="stylesheet" href="../css/popout.css">
    <link rel="stylesheet" href="api.css">
```
#### JS requirement
``` javascript
    <script src="../leaflet/leaflet.js"></script>
    <script src="../leaflet/leaflet.draw.js"></script>
    <script src="../leaflet/leaflet-iiif.js"></script>
    <script src="../leaflet/leaflet.label.js"></script>
    <script src="../leaflet/leaflet.zoomhome.min.js"></script>
    <script src="//cdn.tinymce.com/4/tinymce.min.js"></script>
    <script>tinymce.init({ selector:'textarea'  ,
        toolbar_items_size: 'small',
        menubar: false,
        toolbar: [
            'undo redo | styleselect | bold italic | link image |alignleft aligncenter alignright'
        ]
    });</script>
    <script src="../d3/d3.min.js"></script>
    <script src="../d3/d3.min.js"></script>
    <!--external plugim-->
    <script src="../js/jquery-3.1.0.js"></script>
    <script src="api.js"></script>
```

#### Div section for viewer
```
<div  class="iiif-viewer"></div>

<div id="confirmOverlay" style="display: none;">
    <div id="confirmBox">
        <textarea name="editor" id="editor" cols="30" rows="10" placeholder="123"></textarea>
        <div id="confirmButtons">
            <a id='annotation_save' class="button blue" >save<span></span></a>
            <a id='annotation_cancel' class="button gray" >cancel<span></span></a>
        </div>
    </div>
</div>
```

#### To init plugin
```
<script>$('.iiif-viewer').work();</script>
```

### Gallery
![photo1](./gallery/photo1.PNG)

#### © ascdc all rights reserved
Special thanks: EustaceCheng <fbi0258zzz@gmail.com>
