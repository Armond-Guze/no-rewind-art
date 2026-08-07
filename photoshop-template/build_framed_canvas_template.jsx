#target photoshop

(function () {
    var SOURCE = new File("C:/Users/Armon/AppData/Local/Temp/codex-clipboard-4d8dd80a-685d-42f7-b90d-f8afdfea0317.png");
    var OUTPUT = new File("C:/Users/Armon/projects/no-rewind-art/photoshop-template/Framed_Canvas_Smart_Object_Template.psd");
    var BLANK_PREVIEW = new File("C:/Users/Armon/projects/no-rewind-art/photoshop-template/Framed_Canvas_Template_Preview.png");
    var TEST_PREVIEW = new File("C:/Users/Armon/projects/no-rewind-art/photoshop-template/Framed_Canvas_Alignment_Test.png");

    // Measured from the supplied 1003 x 1156 image.
    var OPENING = {
        left: 121,
        top: 167,
        right: 808,
        bottom: 1041,
        radius: 4.0
    };

    var oldDialogs = app.displayDialogs;
    var oldRulerUnits = app.preferences.rulerUnits;
    var previousDocument = app.documents.length ? app.activeDocument : null;
    var workDocument = null;

    function rgb(red, green, blue) {
        var color = new SolidColor();
        color.rgb.red = red;
        color.rgb.green = green;
        color.rgb.blue = blue;
        return color;
    }

    function pathPoint(anchorX, anchorY, leftX, leftY, rightX, rightY) {
        var point = new PathPointInfo();
        point.anchor = [anchorX, anchorY];
        point.leftDirection = [leftX, leftY];
        point.rightDirection = [rightX, rightY];
        point.kind = PointKind.SMOOTHPOINT;
        return point;
    }

    function selectRoundedRectangle(document, left, top, right, bottom, radius) {
        // Photoshop path coordinates are always points, even when ruler units are pixels.
        // Convert the measured pixel edges so the mask stays exact at this file's 96 ppi.
        var pointScale = 72 / document.resolution;
        left *= pointScale;
        top *= pointScale;
        right *= pointScale;
        bottom *= pointScale;
        radius *= pointScale;

        var kappa = 0.5522847498307936;
        var handle = radius * kappa;
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

        var tempPath = document.pathItems.add("__canvas_opening__", [subPath]);
        tempPath.makeSelection(0, true, SelectionType.REPLACE);
        tempPath.remove();
    }

    function clearInsideOpening(document, layer) {
        document.activeLayer = layer;
        selectRoundedRectangle(document, OPENING.left, OPENING.top, OPENING.right, OPENING.bottom, OPENING.radius);
        document.selection.clear();
        document.selection.deselect();
    }

    function keepOnlyOpening(document, layer) {
        document.activeLayer = layer;
        selectRoundedRectangle(document, OPENING.left, OPENING.top, OPENING.right, OPENING.bottom, OPENING.radius);
        document.selection.invert();
        document.selection.clear();
        document.selection.deselect();
    }

    function convertActiveLayerToSmartObject() {
        executeAction(stringIDToTypeID("newPlacedLayer"), undefined, DialogModes.NO);
    }

    function exportPng(document, outputFile) {
        var options = new ExportOptionsSaveForWeb();
        options.format = SaveDocumentType.PNG;
        options.PNG8 = false;
        options.transparency = true;
        options.interlaced = false;
        document.exportDocument(outputFile, ExportType.SAVEFORWEB, options);
    }

    function fillRectangle(document, left, top, right, bottom, color) {
        document.selection.select([
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom]
        ], SelectionType.REPLACE, 0, false);
        document.selection.fill(color, ColorBlendMode.NORMAL, 100, false);
        document.selection.deselect();
    }

    function addAlignmentTestArtwork(mainDocument, smartObjectLayer) {
        mainDocument.activeLayer = smartObjectLayer;
        executeAction(stringIDToTypeID("placedLayerEditContents"), undefined, DialogModes.NO);

        var contents = app.activeDocument;
        var width = contents.width.as("px");
        var height = contents.height.as("px");
        var testLayer = contents.artLayers.add();
        testLayer.name = "ALIGNMENT TEST - NOT SAVED IN TEMPLATE";

        fillRectangle(contents, 0, 0, width, height, rgb(238, 238, 238));
        fillRectangle(contents, 0, 0, width / 2, height / 2, rgb(239, 68, 68));
        fillRectangle(contents, width / 2, 0, width, height / 2, rgb(59, 130, 246));
        fillRectangle(contents, 0, height / 2, width / 2, height, rgb(34, 197, 94));
        fillRectangle(contents, width / 2, height / 2, width, height, rgb(250, 204, 21));

        // Edge bars make even a one-pixel leak or offset visible in the verification image.
        var bar = Math.max(8, Math.round(Math.min(width, height) * 0.025));
        fillRectangle(contents, 0, 0, width, bar, rgb(255, 255, 255));
        fillRectangle(contents, 0, height - bar, width, height, rgb(0, 0, 0));
        fillRectangle(contents, 0, 0, bar, height, rgb(255, 0, 255));
        fillRectangle(contents, width - bar, 0, width, height, rgb(0, 255, 255));

        contents.save();
        contents.close(SaveOptions.SAVECHANGES);
        app.activeDocument = mainDocument;
    }

    try {
        if (!SOURCE.exists) {
            throw new Error("Source image was not found: " + SOURCE.fsName);
        }

        app.displayDialogs = DialogModes.NO;
        app.preferences.rulerUnits = Units.PIXELS;

        workDocument = app.open(SOURCE);
        var document = workDocument;
        var original = document.activeLayer;
        original.name = "ORIGINAL PHOTO - BACKUP (HIDDEN)";

        // The artwork extends slightly under the frame so no white seam can appear.
        var artwork = document.artLayers.add();
        artwork.name = "YOUR ARTWORK - DOUBLE-CLICK ME";
        fillRectangle(document, 119, 164, 810, 1043, rgb(255, 255, 255));
        document.activeLayer = artwork;
        convertActiveLayerToSmartObject();
        artwork = document.activeLayer;
        artwork.name = "YOUR ARTWORK - DOUBLE-CLICK ME";

        var lighting = original.duplicate();
        lighting.name = "CANVAS LIGHTING - KEEP ON";
        keepOnlyOpening(document, lighting);
        document.activeLayer = lighting;
        lighting.desaturate();
        lighting.adjustLevels(70, 235, 1.0, 195, 255);
        lighting.blendMode = BlendMode.MULTIPLY;
        lighting.opacity = 38;
        lighting.move(artwork, ElementPlacement.PLACEBEFORE);

        var texture = original.duplicate();
        texture.name = "CANVAS TEXTURE - KEEP ON";
        keepOnlyOpening(document, texture);
        document.activeLayer = texture;
        texture.desaturate();
        texture.applyHighPass(1.3);
        texture.blendMode = BlendMode.SOFTLIGHT;
        texture.opacity = 58;
        texture.move(lighting, ElementPlacement.PLACEBEFORE);

        var frame = original.duplicate();
        frame.name = "FRAME + INNER SHADOW - KEEP ON";
        clearInsideOpening(document, frame);
        frame.move(texture, ElementPlacement.PLACEBEFORE);

        original.visible = false;
        original.allLocked = true;
        frame.allLocked = true;
        texture.allLocked = true;
        lighting.allLocked = true;
        document.activeLayer = artwork;

        var saveOptions = new PhotoshopSaveOptions();
        saveOptions.layers = true;
        saveOptions.embedColorProfile = true;
        saveOptions.alphaChannels = true;
        saveOptions.annotations = true;
        saveOptions.spotColors = true;
        saveOptions.maximizeCompatibility = true;
        document.saveAs(OUTPUT, saveOptions, false, Extension.LOWERCASE);
        exportPng(document, BLANK_PREVIEW);

        // Verify the mask and alignment with a temporary four-color edge test.
        // The PSD was already saved blank; the test is exported and then discarded.
        addAlignmentTestArtwork(document, artwork);
        exportPng(document, TEST_PREVIEW);

        document.close(SaveOptions.DONOTSAVECHANGES);
        workDocument = null;
        if (previousDocument) {
            app.activeDocument = previousDocument;
        }
    } catch (error) {
        if (workDocument) {
            try {
                workDocument.close(SaveOptions.DONOTSAVECHANGES);
            } catch (closeError) {}
        }
        if (previousDocument) {
            try {
                app.activeDocument = previousDocument;
            } catch (restoreError) {}
        }
        throw error;
    } finally {
        app.preferences.rulerUnits = oldRulerUnits;
        app.displayDialogs = oldDialogs;
    }
}());
