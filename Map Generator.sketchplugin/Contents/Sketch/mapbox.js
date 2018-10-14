@import "common.js";

function MapboxMap () {}

MapboxMap.prototype.apiKey     = 'pk.eyJ1IjoiY3JhZnRib3QiLCJhIjoiY2o2ZmRucDVzMmg2MjMzbHZqMzJtZTY2bSJ9.Hc2FEbzqKBnyWRK7mHtCAQ';
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

      var viewElements = [];
      var dialog = this.buildDialog(context, viewElements);
      var settings = handleAlertResponse(dialog, viewElements, this.service, dialog.runModal());

      if (!checkSettings(settings, dialog)) {
        return;
      }

      var layer = context.selection[0];
      var layerSizes = layer.frame();
      var position = getGeoCode(encodeURIComponent(settings.address), context);
      var imageUrl = 'https://api.mapbox.com/styles/v1/mapbox/' + settings.type + '/static/' + position.lon + ',' + position.lat + ',' + settings.zoom + ',0,0/' + parseInt([layerSizes width]) + 'x' + parseInt([layerSizes height]) + '@2x?access_token=' + this.apiKey;

      fillLayerWithImage(imageUrl, layer, context);
    }
  }
};

/**
 * Builds the Mapbox window.
 * @param  {Sketch context} context      
 * @param  {Array} viewElements 
 * @return {COSAlertWindow}              
 */
MapboxMap.prototype.buildDialog = function (context, viewElements) {
  var remember = getOption('remember', 0, this.service);
  var dialogWindow = COSAlertWindow.new();

  dialogWindow.setMessageText('Maps Generator (Mapbox)');
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

  var typeSelect = createSelect(this.mapTypes, remember == 0 ? 0 : getOption('type', 0, this.service), 200);
  dialogWindow.addAccessoryView(typeSelect);
  dialogWindow.addTextLabelWithValue(' ');

  var addressTextBox = dialogWindow.viewAtIndex(1);

  dialogWindow.alert().window().setInitialFirstResponder(addressTextBox);
  addressTextBox.setNextKeyView(zoomSelect);
  zoomSelect.setNextKeyView(typeSelect);

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
    key: 'remember',
    index: 10,
    type: 'input'
  });

  return dialogWindow;
}