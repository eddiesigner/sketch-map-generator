@import 'common.js';

function MapboxMap () {}

MapboxMap.prototype.service    = 'mapbox';
MapboxMap.prototype.minZoom    = 0;
MapboxMap.prototype.maxZoom    = 20;
MapboxMap.prototype.zoomLevels = [];
MapboxMap.prototype.mapTypes   = [
  'streets-v11',
  'outdoors-v11',
  'light-v10',
  'dark-v10',
  'satellite-v9',
  'satellite-streets-v11',
  'navigation-preview-day-v4',
  'navigation-preview-night-v4',
  'navigation-guidance-day-v4',
  'navigation-guidance-night-v4'
];
MapboxMap.prototype.webView = null;
MapboxMap.prototype.windowSize = 800;
MapboxMap.prototype.spacing = 40;
MapboxMap.prototype.columnWidth = 340;

/**
 * Creates the Mapbox service provider.
 * @param  {Sketch context} context 
 */
MapboxMap.prototype.create = function (context) {
  if (!checkCount(context)) {
    return;
  } else {
    if (!checkLayerType(context)) {
      return;
    } else {
      makeZoomLevels(this.zoomLevels, this.minZoom, this.maxZoom);

      var tokenMessage = '';
      var token = getOption('token', '', this.service);

      if (!token || token.length() === 0) {
        tokenMessage = ' (Unregistered token)';
      }

      var window = buildWindow(this.windowSize, 'Map Generator - Mapbox' + tokenMessage);
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
MapboxMap.prototype.buildInterface = function (window, context) {
  var remember = getOption('remember', 0, this.service);
  var token = getOption('token', '', this.service);
  var username = getOption('username', '', this.service);
  var ownStyles = [];
  var view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, this.windowSize, this.windowSize));
  var viewElements = [];
  var self = this;

  if (token && username) {
    ownStyles = this.getOwnStyles(token, username);

    if (ownStyles.length > 0) {
      for (let i = 0; i < ownStyles.length; i++) {
        this.mapTypes.unshift(ownStyles[i]);
      }
    }
  }

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
    'You can choose a style as well. Here you will see your own custom styles if you saved your Mapbox token and your Mapbox username previously.',
    {
      left: 420,
      top: this.windowSize - 90,
      width: this.columnWidth,
      height: 60
    }
  );
  view.addSubview(typeLabel);

  var typeSelect = createSelect(
    this.mapTypes,
    remember == 0 ? 0 : getOption('type', 0, this.service),
    {
      left: 420,
      top: this.windowSize - 130,
      width: 250,
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

/**
 * Generates the map image.
 * @param {Object} values
 * @param {Sketch context} context
 * @param {NSWindow} window
 */
MapboxMap.prototype.generateMap = function (values, context, window) {
  var token = getOption('token', '', this.service);
  
  if (!token || token.length() === 0) {
    context.document.showMessage('⚠️ Please save your Mapbox token first.');
    return;
  }

  var layer = context.selection[0];
  var layerSizes = layer.frame();
  var ownUsername = getOption('username', '', this.service);
  var username = 'mapbox';
  var style = values.type;
  var position = this.getGeoCode(token, encodeURIComponent(values.address), context);

  if (values.type.includes(' - ')) {
    username = ownUsername;
    style = values.type.split(' - ')[1];
  }

  var imageUrl = 'https://api.mapbox.com/styles/v1/' + username + '/' + style + '/static/' + position.lon + ',' + position.lat + ',' + values.zoom + ',0,0/' + parseInt([layerSizes width]) + 'x' + parseInt([layerSizes height]) + '@2x?access_token=' + token;

  fillLayerWithImage(imageUrl, layer, context, this.service);
  setLayerName(layer, values.address, values.zoom);
  this.previewMap(values, context);
  window.close();
}

/**
 * Generates the map preview.
 * @param {Object} values
 * @param {Sketch context} context
 */
MapboxMap.prototype.previewMap = function (values, context) {
  createMapJavascriptFile(this.service, values, context);
  this.webView.reload(nil);
}

/**
 * Gets the coordinates from a given location.
 * @param  {String} token
 * @param  {String} address 
 * @param  {Sketch context} context
 * @return {Object}         
 */
MapboxMap.prototype.getGeoCode = function (token, address, context) {
  var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + address + '.json?access_token=' + token + '&limit=1';
  var dataString = makeRequest(url);

  try {
    dataParsed = JSON.parse(dataString);

    if (dataParsed.features.length === 0) {
      context.document.showMessage('ℹ️ Address not found, please try another one.');
      return;
    }

    return {
      lat: dataParsed.features[0].center[1],
      lon: dataParsed.features[0].center[0]
    };
  } catch (error) {
    return;
  }
}

/**
 * Opens the window where users can save their own token and username.
*/
MapboxMap.prototype.openTokenWindow = function () {
  var dialog = this.buildTokenWindow();
  var response = this.handleTokenAlertResponse(dialog, dialog.runModal());
}

/**
 * Builds the window where users can save their own token and username.
 */
MapboxMap.prototype.buildTokenWindow = function () {
  var token = getOption('token', '', this.service);
  var username = getOption('username', '', this.service);
  var dialogWindow = COSAlertWindow.new();

  dialogWindow.setMessageText('Map Generator (Mapbox)');
  dialogWindow.setInformativeText('Enter your Mapbox token and username to generate maps and to load your own styles.');

  var link = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 180, 20)));
  link.setTitle('How to create a valid token');
  link.setBezelStyle(NSInlineBezelStyle);

  link.setCOSJSTargetFunction(function () {
    var url = NSURL.URLWithString(@"https://github.com/eddiesigner/sketch-map-generator/wiki/How-to-create-a-token-to-use-your-own-Mapbox-styles");

    if (!NSWorkspace.sharedWorkspace().openURL(url)) {
      log(@"Failed to open url:" + url.description());
    }
  });

  dialogWindow.addAccessoryView(link);
  
  dialogWindow.addTextLabelWithValue('Enter your token:');
  dialogWindow.addTextFieldWithValue(token);
  dialogWindow.addTextLabelWithValue('Enter your username:');
  dialogWindow.addTextFieldWithValue(username);

  var tokenTextBox = dialogWindow.viewAtIndex(2);
  var usernameTextBox = dialogWindow.viewAtIndex(4);

  dialogWindow.alert().window().setInitialFirstResponder(tokenTextBox);
  tokenTextBox.setNextKeyView(usernameTextBox);

  dialogWindow.addButtonWithTitle('Save');
  dialogWindow.addButtonWithTitle('Cancel');

  return dialogWindow;
}

/**
 * Get the user input from the dialog window
 * @param {COSAlertWindow} dialog
 * @param {Int} responseCode
 * @return {Object}
 */
MapboxMap.prototype.handleTokenAlertResponse = function (dialog, responseCode) {
  if (responseCode == "1000") {
    var tokenValue = dialog.viewAtIndex(2).stringValue();
    var usernameValue = dialog.viewAtIndex(4).stringValue();

    setPreferences(this.service + '.token', tokenValue);
    setPreferences(this.service + '.username', usernameValue);

    return true;
  } else {
    return false;
  }
}

/**
 * Get user's own styles.
 * @param {String} token
 * @param {Strin} username
 */
MapboxMap.prototype.getOwnStyles = function (token, username) {
  var url = 'https://api.mapbox.com/styles/v1/' + username + '?access_token=' + token;
  var dataString = makeRequest(url);

  try {
    var dataParsed = JSON.parse(dataString);

    if (!dataParsed.message) {
      var styles = dataParsed.map(function (style) {
        return style.name + ' - ' + style.id
      });

      return styles;
    }

    return [];
  } catch (error) {
    return [];
  }
}
