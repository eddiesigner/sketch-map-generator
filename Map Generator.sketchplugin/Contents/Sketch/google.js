@import "common.js";

function GoogleMap () {}

GoogleMap.prototype.apiKey     = 'AIzaSyBPSS1dILXvLs3Bp189PrCP7OMoD94RXmw';
GoogleMap.prototype.service    = 'google';
GoogleMap.prototype.minZoom    = 1;
GoogleMap.prototype.maxZoom    = 20;
GoogleMap.prototype.zoomLevels = [];
GoogleMap.prototype.mapTypes   = [
  'roadmap',
  'satellite',
  'hybrid',
  'terrain'
];

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

      var viewElements = [];
      var dialog = this.buildDialog(context, viewElements);
      var settings = handleAlertResponse(dialog, viewElements, this.service, dialog.runModal());

      if (!checkSettings(settings, dialog)) {
        return;
      }

      var layer = context.selection[0];
      var layerSizes = layer.frame();
      var imageUrl = 'https://maps.googleapis.com/maps/api/staticmap?center=' + encodeURIComponent(settings.address) + '&zoom=' + settings.zoom + '&size=' + parseInt([layerSizes width]) + 'x' + parseInt([layerSizes height]) + '&maptype=' + settings.type + '&scale=2' + this.parseStyle(settings.style, context) + '&key=' + this.apiKey;

      fillLayerWithImage(imageUrl, layer, context);
    }
  }
};

/**
 * Builds the Google Maps window.
 * @param  {Sketch context} context      
 * @param  {Array} viewElements 
 * @return {COSAlertWindow}              
 */
GoogleMap.prototype.buildDialog = function (context, viewElements) {
  var remember = getOption('remember', 0, this.service);
  var dialogWindow = COSAlertWindow.new();

  dialogWindow.setMessageText('Maps Generator (Google Maps)');
  dialogWindow.setInformativeText('Write an address and choose a zoom option.');
  dialogWindow.addTextLabelWithValue('Enter an address or a place');
  dialogWindow.addTextFieldWithValue(remember == 0 ? '' : getOption('address', '', this.service));
  dialogWindow.addTextLabelWithValue(' ');
  dialogWindow.addTextLabelWithValue('Please choose a zoom level');
  dialogWindow.addTextLabelWithValue('(A higher value increases the zoom level)');

  var zoomSelect = createSelect(this.zoomLevels, remember == 0 ? 15 : getOption('zoom', 15, this.service));
  dialogWindow.addAccessoryView(zoomSelect);
  dialogWindow.addTextLabelWithValue(' ');
  dialogWindow.addTextLabelWithValue('You can choose a map type as well');

  var typeSelect = createSelect(this.mapTypes, remember == 0 ? 0 : getOption('type', 0, this.service));
  dialogWindow.addAccessoryView(typeSelect);
  dialogWindow.addTextLabelWithValue(' ');
  dialogWindow.addTextLabelWithValue('(Optional) Paste a Snazzy Maps style code');

  var styleField = NSTextField.alloc().initWithFrame(NSMakeRect(0,0,300,150));
  styleField.setStringValue(remember == 0 ? '' : getOption('style', '', this.service));

  dialogWindow.addAccessoryView(styleField);
  dialogWindow.addTextLabelWithValue(' ');

  var addressTextBox = dialogWindow.viewAtIndex(1);
  var styleTextBox = dialogWindow.viewAtIndex(11);

  dialogWindow.alert().window().setInitialFirstResponder(addressTextBox);
  addressTextBox.setNextKeyView(zoomSelect);
  zoomSelect.setNextKeyView(typeSelect);
  typeSelect.setNextKeyView(styleTextBox);

  var checkbox = createCheck('Remember my options', remember);
  dialogWindow.addAccessoryView(checkbox);

  dialogWindow.addButtonWithTitle('OK');
  dialogWindow.addButtonWithTitle('Cancel');

  dialogWindow.setIcon(NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("logo@2x.png").path()));

  viewElements.push({
    key: 'address',
    index: 1,
    type: 'input'
  });
  viewElements.push({
    key: 'zoom',
    index: 5,
    type: 'select'
  });
  viewElements.push({
    key: 'type',
    index: 8,
    type: 'select'
  });
  viewElements.push({
    key: 'style',
    index: 11,
    type: 'input'
  });
  viewElements.push({
    key: 'remember',
    index: 13,
    type: 'input'
  });

  return dialogWindow;
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
  var parameters = '';

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