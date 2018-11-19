@import 'common.js';

function MapboxMap () {}

MapboxMap.prototype.apiKey = 'pk.eyJ1IjoiZWRkaWVzaWduZXIiLCJhIjoiY2pvbzZodWIyMWVrdjNrbzhkZmJ6MTFlYSJ9.VIDcCZrVo7y6pXCKOSwnBQ';
MapboxMap.prototype.service    = 'mapbox';
MapboxMap.prototype.minZoom    = 0;
MapboxMap.prototype.maxZoom    = 20;
MapboxMap.prototype.zoomLevels = [];
MapboxMap.prototype.mapTypes   = [
  'streets-v10',
  'outdoors-v10',
  'light-v9',
  'dark-v9',
  'satellite-v9',
  'satellite-streets-v10',
  'traffic-day-v2',
  'traffic-night-v2'
];
MapboxMap.prototype.webView = null;
MapboxMap.prototype.windowSize = 800;
MapboxMap.prototype.spacing = 40;
MapboxMap.prototype.columnWidth = 340;

MapboxMap.prototype.create = function (context) {
  if (!checkCount(context)) {
    return;
  } else {
    if (!checkLayerType(context)) {
      return;
    } else {
      makeZoomLevels(this.zoomLevels, this.minZoom, this.maxZoom);

      var window = buildWindow(this.windowSize, 'Map Generator (Mapbox)');
      this.buildInterface(window, context);

      [NSApp run];
    }
  }
};

MapboxMap.prototype.buildInterface = function (window, context) {
  var remember = getOption('remember', 0, this.service);
  var view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, this.windowSize, this.windowSize));
  var viewElements = [];
  var self = this;

  var addressLabel = createLabel(
    'Enter an address or a place:',
    {
      left: this.spacing,
      top: this.windowSize - 50,
      width: this.columnWidth,
      height: 20
    }
  );
  view.addSubview(addressLabel);

  var addressField = createField({
    left: this.spacing,
    top: this.windowSize - 90,
    width: this.columnWidth,
    height: 25
  },
    remember == 0 ? '' : getOption('address', '', this.service)
  );
  view.addSubview(addressField);
  viewElements.push({
    key: 'address',
    type: 'input',
    component: addressField
  });

  var zoomLabel = createLabel(
    'Please choose a zoom level (a higher value increases the zoom):',
    {
      left: this.spacing,
      top: this.windowSize - 155,
      width: this.columnWidth,
      height: 40
    }
  );
  view.addSubview(zoomLabel);

  var zoomSelect = createSelect(
    this.zoomLevels,
    remember == 0 ? 15 : getOption('zoom', 15, this.service),
    {
      left: this.spacing,
      top: this.windowSize - 190,
      width: 200,
      height: 25
    }
  );
  view.addSubview(zoomSelect);
  viewElements.push({
    key: 'zoom',
    type: 'select',
    component: zoomSelect
  });

  var typeLabel = createLabel(
    'You can choose a map type as well:',
    {
      left: this.spacing,
      top: this.windowSize - 235,
      width: this.columnWidth,
      height: 20
    }
  );
  view.addSubview(typeLabel);

  var typeSelect = createSelect(
    this.mapTypes,
    remember == 0 ? 0 : getOption('type', 0, this.service),
    {
      left: this.spacing,
      top: this.windowSize - 270,
      width: 200,
      height: 25
    }
  );
  view.addSubview(typeSelect);
  viewElements.push({
    key: 'type',
    type: 'select',
    component: typeSelect
  });

  var mapLabel = createLabel(
    'Preview or pick a location directly from the map:',
    {
      left: this.spacing,
      top: this.windowSize - 315,
      width: this.columnWidth,
      height: 20
    }
  );
  view.addSubview(mapLabel);

  var checkbox = createCheck(
    'Remember my options',
    remember,
    {
      left: 420,
      top: this.windowSize - 265,
      width: this.columnWidth,
      height: 25
    }
  );
  view.addSubview(checkbox);
  viewElements.push({
    key: 'remember',
    type: 'input',
    component: checkbox
  });

  var previewButton = createButton(
    'Preview',
    {
      left: 415,
      top: this.windowSize - 315,
      width: 100,
      height: 25
    }
  );
  [previewButton setCOSJSTargetFunction: function (sender) {
    var values = handleButtonAction(viewElements, self.service, false);

    if (values) {
      self.previewMap(values, context);
    }
  }];
  view.addSubview(previewButton);

  var generateButton = createButton(
    'Generate',
    {
      left: 525,
      top: this.windowSize - 315,
      width: 100,
      height: 25
    }
  );
  [generateButton setCOSJSTargetFunction: function (sender) {
    var values = handleButtonAction(viewElements, self.service, true);

    if (values) {
      self.generateMap(values, context, window);
    }
  }];
  view.addSubview(generateButton);
  [window setDefaultButtonCell: [generateButton cell]];

  this.webView = createWebView(this.service, context, viewElements);
  view.addSubview(this.webView);

  [[window contentView] addSubview: view];

  [addressField setNextKeyView: zoomSelect];
  [zoomSelect setNextKeyView: typeSelect];
  [typeSelect setNextKeyView: checkbox];
}

MapboxMap.prototype.generateMap = function (values, context, window) {
  var layer = context.selection[0];
  var layerSizes = layer.frame();
  var position = getGeoCode(encodeURIComponent(values.address), context);
  var imageUrl = 'https://api.mapbox.com/styles/v1/mapbox/' + values.type + '/static/' + position.lon + ',' + position.lat + ',' + values.zoom + ',0,0/' + parseInt([layerSizes width]) + 'x' + parseInt([layerSizes height]) + '@2x?access_token=' + this.apiKey;

  fillLayerWithImage(imageUrl, layer, context);
  this.previewMap(values, context);
  window.close();
}

MapboxMap.prototype.previewMap = function (values, context) {
  createMapJavascriptFile(this.service, values, context);
  this.webView.reload(nil);
}
