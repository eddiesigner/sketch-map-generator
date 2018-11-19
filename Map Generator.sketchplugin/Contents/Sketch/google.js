@import 'common.js';

function GoogleMap () {}

GoogleMap.prototype.apiKey = 'AIzaSyBPSS1dILXvLs3Bp189PrCP7OMoD94RXmw';
GoogleMap.prototype.service = 'google';
GoogleMap.prototype.minZoom = 1;
GoogleMap.prototype.maxZoom = 20;
GoogleMap.prototype.zoomLevels = [];
GoogleMap.prototype.mapTypes = [
  'roadmap',
  'satellite',
  'hybrid',
  'terrain'
];
GoogleMap.prototype.webView = null;
GoogleMap.prototype.windowSize = 800;
GoogleMap.prototype.spacing = 40;
GoogleMap.prototype.columnWidth = 340;

/**
 * Creates the Google Maps service provider.
 * @param  {Sketch context} context 
 */
GoogleMap.prototype.create = function (context) {
  if (!checkCount(context)) {
    return;
  } else {
    if (!checkLayerType(context)) {
      return;
    } else {
      makeZoomLevels(this.zoomLevels, this.minZoom, this.maxZoom);

      var window = buildWindow(this.windowSize, 'Map Generator (Google Maps)');
      this.buildInterface(window, context);

      [NSApp run];
    }
  }
};

/**
 * Builds the whole user interface.
 * @param {NSWindow} window
 * @param {Sketch context} context
 */
GoogleMap.prototype.buildInterface = function (window, context) {
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

  var stylesLabel = createLabel(
    '(Optional) Paste a Snazzy Maps style code:',
    {
      left: 420,
      top: this.windowSize - 50,
      width: this.columnWidth,
      height: 20
    }
  );
  view.addSubview(stylesLabel);

  var styleField = createField(
    {
      left: 420,
      top: this.windowSize - 215,
      width: this.columnWidth,
      height: 150
    },
    remember == 0 ? '' : getOption('style', '', this.service)
  );
  view.addSubview(styleField);
  viewElements.push({
    key: 'style',
    type: 'input',
    component: styleField
  });

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
  [typeSelect setNextKeyView: styleField];
  [styleField setNextKeyView: checkbox];
}

/**
 * Generates the map image.
 * @param {Object} values
 * @param {Sketch context} context
 * @param {NSWindow} window
 */
GoogleMap.prototype.generateMap = function (values, context, window) {
  var layer = context.selection[0];
  var layerSizes = layer.frame();
  var imageUrl = 'https://maps.googleapis.com/maps/api/staticmap?center=' + encodeURIComponent(values.address) + '&zoom=' + values.zoom + '&size=' + parseInt([layerSizes width]) + 'x' + parseInt([layerSizes height]) + '&maptype=' + values.type + '&scale=2' + this.parseStyle(values.style, context) + '&key=' + this.apiKey;

  fillLayerWithImage(imageUrl, layer, context);
  this.previewMap(values, context);
  window.close();
}

/**
 * Generates the map preview.
 * @param {Object} values
 * @param {Sketch context} context
 */
GoogleMap.prototype.previewMap = function (values, context) {
  createMapJavascriptFile(this.service, values, context);
  this.webView.reload(nil);
}

/**
 * Checks if an item style is a color or not.
 * @param  {String}  value 
 * @return {Boolean}       
 */
GoogleMap.prototype.isColor = function (value) {
  return /^#[0-9a-f]{6}$/i.test(value.toString());
}

/**
 * Transforms a color to a hex code color.
 * @param  {String} value 
 * @return {String}       
 */
GoogleMap.prototype.toColor = function (value) {
  return '0x' + value.slice(1);
}

/**
 * Transforms a Snazzy Maps json object to a url string.
 * Thanks to: http://jsfiddle.net/s6Dyp/ :)
 * @param  {String} jsonString 
 * @param  {Sketch context} context
 * @return {String}            
 */
GoogleMap.prototype.parseStyle = function (jsonString, context) {
  var json;
  var items = [];
  var separator = '%7C';

  try {
    json = JSON.parse(jsonString);
  } catch (e) {
    context.document.showMessage('The style cannot be applied');

    return '';
  }

  items.length = 0;

  for (var i = 0; i < json.length; i++) {
    var item = json[i];
    var hasFeature = item.hasOwnProperty('featureType');
    var hasElement = item.hasOwnProperty('elementType');
    var stylers = item.stylers;
    var target = '';
    var style = '';

    if (!hasFeature && !hasElement) {
      target = 'feature:all';
    } else {
      if (hasFeature) {
        target = 'feature:' + item.featureType;
      }
      if (hasElement) {
        target = (target) ? target + separator : '';
        target += 'element:' + item.elementType;
      }
    }

    for (var s = 0; s < stylers.length; s++) {
      var styleItem = stylers[s];
      var key = Object.keys(styleItem)[0];

      style = (style) ? style + separator : '';
      style += key + ':' + (this.isColor(styleItem[key]) ? this.toColor(styleItem[key]) : styleItem[key]);
    }

    items.push(target + separator + style);
  }

  return '&style=' + items.join('&style=');
}
