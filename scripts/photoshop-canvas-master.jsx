#target photoshop

/*
 * Builds a reusable, front-facing canvas mockup from the currently open source.
 * The original PNG is never modified: Photoshop duplicates it and saves a PSD.
 */

(function () {
  var EXPECTED_SOURCE = "C:/Users/Armon/projects/no-rewind-art/dist/artwork/life-has-no-rewind/enjoy every moment mockup.png";
  var oldRulerUnits = app.preferences.rulerUnits;
  var source = null;
  var master = null;

  function normalizedPath(file) {
    return file.fsName.replace(/\\/g, "/").toLowerCase();
  }

  function findSourceDocument() {
    var expected = EXPECTED_SOURCE.toLowerCase();
    for (var i = 0; i < app.documents.length; i += 1) {
      try {
        if (normalizedPath(app.documents[i].fullName) === expected) {
          return app.documents[i];
        }
      } catch (ignored) {}
    }
    return null;
  }

  function px(value) {
    return value.as("px");
  }

  function color(hex) {
    var clean = hex.replace("#", "");
    var result = new SolidColor();
    result.rgb.red = parseInt(clean.substring(0, 2), 16);
    result.rgb.green = parseInt(clean.substring(2, 4), 16);
    result.rgb.blue = parseInt(clean.substring(4, 6), 16);
    return result;
  }

  function selectPolygon(doc, points) {
    doc.selection.select(points);
  }

  function fillPolygon(doc, layer, points, fillColor) {
    doc.activeLayer = layer;
    selectPolygon(doc, points);
    doc.selection.fill(fillColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
  }

  function fillRect(doc, layer, left, top, right, bottom, fillColor) {
    fillPolygon(doc, layer, [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom]
    ], fillColor);
  }

  function addInside(doc, group, name) {
    var layer = doc.artLayers.add();
    layer.name = name;
    layer.move(group, ElementPlacement.INSIDE);
    doc.activeLayer = layer;
    return layer;
  }

  function addBlurredRect(doc, group, name, bounds, blur, opacity) {
    var layer = addInside(doc, group, name);
    fillRect(doc, layer, bounds[0], bounds[1], bounds[2], bounds[3], color("#000000"));
    layer.applyGaussianBlur(blur);
    layer.blendMode = BlendMode.MULTIPLY;
    layer.opacity = opacity;
    return layer;
  }

  function uniqueFile(folder, baseName, extension) {
    var candidate = new File(folder.fsName + "/" + baseName + extension);
    var version = 2;
    while (candidate.exists) {
      candidate = new File(folder.fsName + "/" + baseName + " v" + version + extension);
      version += 1;
    }
    return candidate;
  }

  function stripExtension(name) {
    return name.replace(/\.[^\.]+$/, "");
  }

  function buildMaster(doc) {
    var artwork = doc.activeLayer;

    executeAction(stringIDToTypeID("newPlacedLayer"), new ActionDescriptor(), DialogModes.NO);
    artwork = doc.activeLayer;
    artwork.name = "01 - ARTWORK - DOUBLE-CLICK TO REPLACE";

    var bounds = artwork.bounds;
    var left = px(bounds[0]);
    var top = px(bounds[1]);
    var right = px(bounds[2]);
    var bottom = px(bounds[3]);
    var width = right - left;
    var scale = width / 1800;

    var depthX = 14 * scale;
    var depthY = 8 * scale;
    var lipX = 4 * scale;
    var lipY = 2 * scale;
    var bevel = 10 * scale;

    var group = doc.layerSets.add();
    group.name = "REALISTIC CANVAS - MASTER EFFECTS";

    // Optional white preview background. It remains off in the saved PSD.
    var previewBackground = addInside(doc, group, "00 - OPTIONAL WHITE BACKGROUND (OFF)");
    fillRect(doc, previewBackground, 0, 0, px(doc.width), px(doc.height), color("#F8F8F6"));
    previewBackground.visible = false;

    // Broad room shadow, followed by a tighter contact shadow.
    addBlurredRect(
      doc,
      group,
      "02A - SHADOW - SOFT CAST",
      [left + 22 * scale, top + 28 * scale, right + 30 * scale, bottom + 34 * scale],
      42 * scale,
      27
    );

    addBlurredRect(
      doc,
      group,
      "02B - SHADOW - CONTACT",
      [left + 9 * scale, top + 11 * scale, right + 16 * scale, bottom + 17 * scale],
      10 * scale,
      24
    );

    // Smart Object copies stay linked to the replaceable front artwork.
    doc.activeLayer = artwork;
    var body = artwork.duplicate();
    body.name = "03A - THICKNESS - WRAPPED BODY (LINKED)";
    body.translate(depthX, depthY);
    body.move(group, ElementPlacement.INSIDE);

    var bodyShade = addInside(doc, group, "03B - THICKNESS - BODY SHADE");
    fillPolygon(doc, bodyShade, [
      [right, top],
      [right + depthX, top + depthY],
      [right + depthX, bottom + depthY],
      [right, bottom]
    ], color("#111317"));
    fillPolygon(doc, bodyShade, [
      [left, bottom],
      [right, bottom],
      [right + depthX, bottom + depthY],
      [left + depthX, bottom + depthY]
    ], color("#090B0E"));
    bodyShade.blendMode = BlendMode.MULTIPLY;
    bodyShade.opacity = 46;

    doc.activeLayer = artwork;
    var lip = artwork.duplicate();
    lip.name = "03C - THICKNESS - LIGHT LIP (LINKED)";
    lip.translate(lipX, lipY);
    lip.move(group, ElementPlacement.INSIDE);

    var lipShade = addInside(doc, group, "03D - THICKNESS - LIP SHADE");
    fillPolygon(doc, lipShade, [
      [right, top],
      [right + lipX, top + lipY],
      [right + lipX, bottom + lipY],
      [right, bottom]
    ], color("#12161A"));
    fillPolygon(doc, lipShade, [
      [left, bottom],
      [right, bottom],
      [right + lipX, bottom + lipY],
      [left + lipX, bottom + lipY]
    ], color("#0B0E12"));
    lipShade.blendMode = BlendMode.MULTIPLY;
    lipShade.opacity = 22;

    artwork.move(group, ElementPlacement.INSIDE);

    // A soft inner rim adds depth without changing the artwork colors heavily.
    var innerRim = addInside(doc, group, "04A - BEZEL - SOFT INNER RIM");
    fillRect(doc, innerRim, left, top, right, bottom, color("#05070A"));
    selectPolygon(doc, [
      [left + 18 * scale, top + 18 * scale],
      [right - 18 * scale, top + 18 * scale],
      [right - 18 * scale, bottom - 18 * scale],
      [left + 18 * scale, bottom - 18 * scale]
    ]);
    doc.selection.clear();
    doc.selection.deselect();
    innerRim.applyGaussianBlur(8 * scale);
    innerRim.blendMode = BlendMode.MULTIPLY;
    innerRim.opacity = 12;

    // Inward bezel: top/left catch light; bottom/right fall into shade.
    var bezelShade = addInside(doc, group, "04B - BEZEL - BOTTOM RIGHT SHADE");
    fillPolygon(doc, bezelShade, [
      [left, bottom],
      [right, bottom],
      [right - bevel, bottom - bevel],
      [left + bevel, bottom - bevel]
    ], color("#07090C"));
    fillPolygon(doc, bezelShade, [
      [right, top],
      [right, bottom],
      [right - bevel, bottom - bevel],
      [right - bevel, top + bevel]
    ], color("#0A0D11"));
    bezelShade.applyGaussianBlur(1.5 * scale);
    bezelShade.blendMode = BlendMode.MULTIPLY;
    bezelShade.opacity = 25;

    var bezelLight = addInside(doc, group, "04C - BEZEL - TOP LEFT HIGHLIGHT");
    fillPolygon(doc, bezelLight, [
      [left, top],
      [right, top],
      [right - bevel, top + bevel],
      [left + bevel, top + bevel]
    ], color("#FFF5E8"));
    fillPolygon(doc, bezelLight, [
      [left, top],
      [left + bevel, top + bevel],
      [left + bevel, bottom - bevel],
      [left, bottom]
    ], color("#FFF8ED"));
    bezelLight.applyGaussianBlur(1.2 * scale);
    bezelLight.blendMode = BlendMode.SCREEN;
    bezelLight.opacity = 18;

    // Included for smoother artwork; off because this cassette already has texture.
    var texture = addInside(doc, group, "05 - OPTIONAL CANVAS WEAVE - TURN ON FOR SMOOTH ART");
    fillRect(doc, texture, left, top, right, bottom, color("#808080"));
    texture.applyAddNoise(2.4, NoiseDistribution.GAUSSIAN, true);
    texture.blendMode = BlendMode.SOFTLIGHT;
    texture.opacity = 6;
    texture.visible = false;

    doc.activeLayer = artwork;
    return {
      artwork: artwork,
      background: previewBackground,
      group: group
    };
  }

  try {
    if (app.documents.length === 0) {
      throw new Error("No Photoshop document is open.");
    }

    source = findSourceDocument();
    if (!source) {
      throw new Error("The expected source PNG is not open in Photoshop.");
    }

    app.activeDocument = source;
    app.preferences.rulerUnits = Units.PIXELS;

    var baseName = stripExtension(source.name);
    master = source.duplicate(baseName + " - REALISTIC CANVAS MASTER", false);
    app.activeDocument = master;
    master.activeLayer = master.layers[0];

    var built = buildMaster(master);
    var outputFile = uniqueFile(source.path, baseName + " - REALISTIC CANVAS MASTER", ".psd");
    var psdOptions = new PhotoshopSaveOptions();
    psdOptions.layers = true;
    psdOptions.embedColorProfile = true;
    psdOptions.alphaChannels = true;
    psdOptions.annotations = true;
    psdOptions.spotColors = true;

    master.saveAs(outputFile, psdOptions, false, Extension.LOWERCASE);

    // Export a white-background QA preview without changing the saved template.
    var previewFile = new File(Folder.temp.fsName + "/codex-realistic-canvas-preview.png");
    built.background.visible = true;
    var pngOptions = new PNGSaveOptions();
    pngOptions.interlaced = false;
    master.saveAs(previewFile, pngOptions, true, Extension.LOWERCASE);
    built.background.visible = false;
    master.activeLayer = built.artwork;
    master.save();

    app.preferences.rulerUnits = oldRulerUnits;
    outputFile.fsName + "|" + previewFile.fsName;
  } catch (error) {
    app.preferences.rulerUnits = oldRulerUnits;
    if (master) {
      try {
        master.close(SaveOptions.DONOTSAVECHANGES);
      } catch (ignoredClose) {}
    }
    throw error;
  }
}());

