@import 'common.js';

function GenericMap () {}

GenericMap.prototype.generateLastMap = function (context) {
  if (!checkCount(context)) {
    return;
  } else {
    if (!checkLayerType(context)) {
      return;
    } else {
      var layer = context.selection[0];
      var layerSizes = layer.frame();
      var lastService = getPreferences('lastservice', '');
      var lastUrl = getPreferences('lasturl', '');
      var lastAddress = getPreferences('lastaddress', '');
      var lastZoom = getPreferences('lastzoom', '');
      var lastWidth = getPreferences('lastwidth', '');
      var lastHeight = getPreferences('lastheight', '');

      if (lastWidth && lastHeight) {
        lastUrl = lastUrl.replace(lastWidth + 'x' + lastHeight, parseInt([layerSizes width]) + 'x' + parseInt([layerSizes height]));
      }

      if (lastService && lastUrl && lastAddress && lastZoom) {
        fillLayerWithImage(lastUrl, layer, context, lastService);
        setLayerName(layer, lastAddress, lastZoom);
      } else {
        context.document.showMessage('⚠️ Please generate a map first.');
      }
    }
  }
};
