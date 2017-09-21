var pluginIdentifier = "io.craftbot.sketch.map-generator";
var app              = NSApplication.sharedApplication();

/**
 * Checks if there is something selected.
 * @param  {Sketch context} context 
 * @return {Boolean}         
 */
function checkCount (context) {
  if (context.selection.count() != 1) {
    app.displayDialog_withTitle("You have to select 1 shape layer.", "Wrong shape layer selection");
    return false;
  }

  return true;
}

/**
 * Checks if the item selected is a shape layer or not.
 * @param  {Sketch context} context 
 * @return {Boolean}         
 */
function checkLayerType (context) {
  var layer = context.selection[0];

  if ([layer class] != MSShapeGroup) {
    app.displayDialog_withTitle("Your selection was a “" + [layer name] + "”, that is not a shape layer. Please select a shape layer.", "Shape layer only");
    return false;
  }

  return true;
}

/**
 * Checks if there are valid settings and if the user wrote an address.
 * @param  {Object} settings 
 * @param  {COSAlertWindow} dialog   
 * @return {Boolean}          
 */
function checkSettings (settings, dialog) {
  if (!settings) {
    return false;
  }

  if (settings.address.length() === 0) {
    app.displayDialog_withTitle('Please enter a valid address.', 'Invalid address');
    dialog.runModal();
    return false;
  }

  return true;
}

/**
 * Creates a select box with options.
 * @param  {Array} options       
 * @param  {Integer} selectedIndex 
 * @param  {Integer} width         
 * @return {NSPopUpButton}               
 */
function createSelect (options, selectedIndex, width) {
  var selectedItemIndex = selectedIndex || 0;
  var select = NSPopUpButton.alloc().initWithFrame(NSMakeRect(0, 0, width || 100, 28));

  if (options) {
    select.addItemsWithTitles(options);
    select.selectItemAtIndex(selectedItemIndex);
  }

  return select;
}

/**
 * Creates a checkbox.
 * @param  {String} title   
 * @param  {Integer} checked 
 * @return {NSButton}         
 */
function createCheck (title, checked) {
  var checkbox = NSButton.alloc().initWithFrame(NSMakeRect(0,0,200,23));

  checkbox.setButtonType(NSSwitchButton);
  checkbox.setBezelStyle(NSRoundedBezelStyle);
  checkbox.setTitle(title);
  checkbox.setState(checked == 0 ? NSOffState : NSOnState);

  return checkbox;
}

/**
 * Fills the zoom level arrays with the data passed.
 * @param  {Array} zoomLevels 
 * @param  {Integer} minZoom    
 * @param  {Integer} maxZoom     
 */
function makeZoomLevels (zoomLevels, minZoom, maxZoom) {
  if (zoomLevels.length > 0) {
    return;
  }

  for (var x = minZoom; x <= maxZoom; x++) {
    zoomLevels.push(x.toString());
  }
}

/**
 * Gets all the settings values.
 * @param  {COSAlertWindow} dialog       
 * @param  {Array} viewElements 
 * @param  {String} service      
 * @param  {String} responseCode 
 * @return {Object}              
 */
function handleAlertResponse (dialog, viewElements, service, responseCode) {
  saveData(dialog, viewElements, service);

  if (responseCode == "1000") {
    var result = {};

    for (var x = 0; x < viewElements.length; x++) {
      if (viewElements[x].type === 'select') {
        result[viewElements[x].key] = dialog.viewAtIndex(viewElements[x].index).titleOfSelectedItem();
      } else if (viewElements[x].type === 'input') {
        result[viewElements[x].key] = dialog.viewAtIndex(viewElements[x].index).stringValue();
      }
    }

    return result;
  }

  return null;
}

/**
 * Fills a shape layer with a static map.
 * @param  {String} imageUrl 
 * @param  {MSShapeGroup} layer    
 * @param  {Sketch context} context  
 */
function fillLayerWithImage (imageUrl, layer, context) {
  var imageData = getImage(imageUrl);

  if (!imageData) {
    context.document.showMessage('There was a problem, please check your Internet connection or the address settings.');
    return;
  }

  var result = NSString.alloc().initWithData_encoding(imageData, NSUTF8StringEncoding);

  if (result) {
    context.document.showMessage('There was a problem, please check the address settings.');
    return;
  }

  var imageFile = NSImage.alloc().initWithData(imageData);
  var fill = layer.style().fills().firstObject();

  fill.setFillType(4);
  fill.setImage(MSImageData.alloc().initWithImage_convertColorSpace(imageFile, false));
  fill.setPatternFillType(1);

  context.document.showMessage("Map generated!");
}

/**
 * Gets the image data from a url.
 * @param  {String} url 
 * @return {Response}     
 */
function getImage (url) {
  var request = NSURLRequest.requestWithURL(NSURL.URLWithString(url));
  var response = NSURLConnection.sendSynchronousRequest_returningResponse_error(request, null, null);

  return response;
}

/**
 * Gets the coordinates from a location.
 * @param  {String} address 
 * @return {Object}         
 */
function getGeoCode (address) {
  var url = 'https://maps.google.com/maps/api/geocode/json?address=' + address;
  var request = NSMutableURLRequest.new();

  [request setHTTPMethod:@"GET"];
  [request setURL:[NSURL URLWithString:url]];

  var error = NSError.new();
  var responseCode = null;
  var oResponseData = [NSURLConnection sendSynchronousRequest:request returningResponse:responseCode error:error];
  var dataString = [[NSString alloc] initWithData:oResponseData encoding:NSUTF8StringEncoding];
  var dataParsed = JSON.parse(dataString);

  return {
    lat: dataParsed.results[0].geometry.location.lat,
    lon: dataParsed.results[0].geometry.location.lng
  };
}

/**
 * Saves the address settings.
 * @param  {COSAlertWindow} dialog       
 * @param  {Array} viewElements 
 * @param  {String} service      
 */
function saveData (dialog, viewElements, service) {
  for (var x = 0; x < viewElements.length; x++) {
    if (viewElements[x].type === 'select') {
      setPreferences(service + '.' + viewElements[x].key, dialog.viewAtIndex(viewElements[x].index).indexOfSelectedItem());
    } else if (viewElements[x].type === 'input') {
      setPreferences(service + '.' + viewElements[x].key, dialog.viewAtIndex(viewElements[x].index).stringValue());
    }
  }
}

/**
 * Gets the an option value.
 * @param  {String} key          
 * @param  {String | Integer} defaultValue 
 * @param  {String} service      
 * @return {String}              
 */
function getOption(key, defaultValue, service) {
  return getPreferences(service + '.' + key, defaultValue);
}

/**
 * Gets an address setting from the user preferences.
 * @param  {String} key          
 * @param  {String | Integer} defaultValue 
 * @return {String}              
 */
function getPreferences(key, defaultValue) {
  var userDefaults = NSUserDefaults.standardUserDefaults();

  if (!userDefaults.dictionaryForKey(pluginIdentifier)) {
    var defaultPreferences = NSMutableDictionary.alloc().init();

    userDefaults.setObject_forKey(defaultPreferences, pluginIdentifier);
    userDefaults.synchronize();
  }

  var value = userDefaults.dictionaryForKey(pluginIdentifier).objectForKey(key);

  return (value === null) ? defaultValue : value;
}

/**
 * Saves an address setting to the user preferences.
 * @param {String} key   
 * @param {String} value 
 */
function setPreferences(key, value) {
  var userDefaults = NSUserDefaults.standardUserDefaults();
  var preferences;

  if (!userDefaults.dictionaryForKey(pluginIdentifier)) {
    preferences = NSMutableDictionary.alloc().init();
  } else {
    preferences = NSMutableDictionary.dictionaryWithDictionary(userDefaults.dictionaryForKey(pluginIdentifier));
  }

  preferences.setObject_forKey(value, key);

  userDefaults.setObject_forKey(preferences, pluginIdentifier);
  userDefaults.synchronize();
}
