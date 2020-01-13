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
      var lastService = getPreferences('lastservice', '');
      var lastUrl = getPreferences('lasturl', '');
      var lastAddress = getPreferences('lastaddress', '');
      var lastZoom = getPreferences('lastzoom', '');

      if (lastService && lastUrl && lastAddress && lastZoom) {
        fillLayerWithImage(lastUrl, layer, context, lastService);
        setLayerName(layer, lastAddress, lastZoom);
      } else {
        context.document.showMessage('⚠️ Please generate a map first.');
      }
    }
  }
};
