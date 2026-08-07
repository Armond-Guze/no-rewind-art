#target photoshop

// Applies the corrected one-pixel opening to the user's currently open mockup.
// It preserves the old locked frame layer as a hidden fallback, does not save,
// and does not close anything.
(function () {
    var TARGET_LAYER = "FRAME + INNER SHADOW - KEEP ON";
    var ART_LAYER = "YOUR ARTWORK - DOUBLE-CLICK ME";
    var ORIGINAL_LAYER = "ORIGINAL PHOTO - BACKUP (HIDDEN)";
    var targetDocument = null;
    var frameLayer = null;
    var artworkLayer = null;
    var originalLayer = null;

    function pathPoint(anchorX, anchorY, leftX, leftY, rightX, rightY) {
        var point = new PathPointInfo();
        point.anchor = [anchorX, anchorY];
        point.leftDirection = [leftX, leftY];
        point.rightDirection = [rightX, rightY];
        point.kind = PointKind.SMOOTHPOINT;
        return point;
    }

    function selectCorrectedOpening(document) {
        // Exact Photoshop pixel-edge coordinates measured from the source:
        // left stays fixed; top, right, and bottom extend outward one pixel.
        var left = 121;
        var top = 166;
        var right = 809;
        var bottom = 1042;
        var radius = 4;
        var pointScale = 72 / document.resolution;

        left *= pointScale;
        top *= pointScale;
        right *= pointScale;
        bottom *= pointScale;
        radius *= pointScale;

        var handle = radius * 0.5522847498307936;
        var points = [];
        points.push(pathPoint(left + radius, top, left + radius - handle, top, left + radius, top));
        points.push(pathPoint(right - radius, top, right - radius, top, right - radius + handle, top));
        points.push(pathPoint(right, top + radius, right, top + radius - handle, right, top + radius));
        points.push(pathPoint(right, bottom - radius, right, bottom - radius, right, bottom - radius + handle));
        points.push(pathPoint(right - radius, bottom, right - radius + handle, bottom, right - radius, bottom));
        points.push(pathPoint(left + radius, bottom, left + radius, bottom, left + radius - handle, bottom));
        points.push(pathPoint(left, bottom - radius, left, bottom - radius + handle, left, bottom - radius));
        points.push(pathPoint(left, top + radius, left, top + radius, left, top + radius - handle));

        var subPath = new SubPathInfo();
        subPath.closed = true;
        subPath.operation = ShapeOperation.SHAPEADD;
        subPath.entireSubPath = points;

        var tempPath = document.pathItems.add("__corrected_canvas_opening__", [subPath]);
        tempPath.makeSelection(0, true, SelectionType.REPLACE);
        tempPath.remove();
    }

    for (var i = 0; i < app.documents.length; i += 1) {
        var candidate = app.documents[i];
        try {
            frameLayer = candidate.layers.getByName(TARGET_LAYER);
            artworkLayer = candidate.layers.getByName(ART_LAYER);
            originalLayer = candidate.layers.getByName(ORIGINAL_LAYER);
            targetDocument = candidate;
            break;
        } catch (ignored) {
            frameLayer = null;
            artworkLayer = null;
            originalLayer = null;
        }
    }

    if (!targetDocument || !frameLayer || !artworkLayer || !originalLayer) {
        throw new Error("The open framed-canvas mockup was not found. No document was changed.");
    }

    var oldRulerUnits = app.preferences.rulerUnits;
    var oldDialogs = app.displayDialogs;
    try {
        app.displayDialogs = DialogModes.NO;
        app.preferences.rulerUnits = Units.PIXELS;
        app.activeDocument = targetDocument;

        // Photoshop cannot unlock the fully locked overlay reliably after a PSDT is opened.
        // Copy the pristine backup pixels into a new unlocked layer instead, then keep the
        // original frame hidden for a completely reversible repair.
        var originalWasVisible = originalLayer.visible;
        originalLayer.visible = true;
        targetDocument.activeLayer = originalLayer;
        targetDocument.selection.selectAll();
        targetDocument.selection.copy();
        targetDocument.selection.deselect();
        var correctedFrame = targetDocument.paste();
        correctedFrame.name = "FRAME + INNER SHADOW - CORRECTED";

        targetDocument.activeLayer = correctedFrame;
        selectCorrectedOpening(targetDocument);
        targetDocument.selection.clear();
        targetDocument.selection.deselect();

        correctedFrame.move(targetDocument.layers[0], ElementPlacement.PLACEBEFORE);
        frameLayer.name = "FRAME + INNER SHADOW - ORIGINAL MASK (OFF)";
        frameLayer.visible = false;
        correctedFrame.name = TARGET_LAYER;
        originalLayer.visible = originalWasVisible;
        targetDocument.activeLayer = artworkLayer;
        app.activeDocument = targetDocument;
    } finally {
        app.preferences.rulerUnits = oldRulerUnits;
        app.displayDialogs = oldDialogs;
    }
}());
