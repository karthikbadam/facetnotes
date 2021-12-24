function APPTHEME () {
    var _self = this;

    //default options!
    _self.fillColor = "#74add1";
    _self.backgroundFillColor = "#666";
    _self.strokeColor = "#74add1";
    _self.strokeSize = "1.5px";
    _self.selection = "#f4a582";

}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

APPTHEME.prototype.convertHexToRGB = function (color, opacity) {
    var converted = hexToRgb(color);
    if (opacity) {
        return "rgba(" + converted.r + "," + converted.g + "," + converted.b + "," + opacity + ")";
    } else {
        return "rgb(" + converted.r + "," + converted.g + "," + converted.b + ")";
    }
}

APPTHEME.prototype.convertRGBToHex = function (color) {
    return rgbToHex(color.r, color.g, color.b);
}

