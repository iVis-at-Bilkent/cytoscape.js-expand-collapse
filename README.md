cytoscape-expand-collapse
================================================================================


## Description

This extension provides an interface to expand/collapse nodes for better management of complexity of Cytoscape.js compound graphs. When using this extension, please cite the following paper, on which the ideas are based on:

U. Dogrusoz and B. Genc, "A Multi-Graph Approach to Complexity Management in Interactive Graph Visualization", Computers & Graphics, 30(1), pp. 86-97, 2006.

## API

* Note that compounds are nodes.

`cy.expandCollapse(options)`
To initialize/set options whenever you want.

* Following functions get options parameter to apply during a particular event unlike the function above.

`eles.collapse(options)`
Collapse node(s).

`eles.collapseRecursively(options)`
Collapse node(s) and their child nodes.

`cy.collapseAll(options)`
Collapse all nodes on graph (recursively).

`eles.expand(options)`
Expand node(s).

`eles.expandRecursively(options)`
Expand node(s) and their child compounds.

`cy.expandAll(options)`
Expand all nodes on graph (recursively).

`ele.isExpandable()`
Get whether node is expandable (or is collapsed)

`ele.isCollapsible()`
Get whether node is expandable (or is collapsed).

`eles.expandableNodes()`
Returns expandable nodes from given set of elements.

`eles.collapsibleNodes()`
Returns collapsible nodes from given set of elements.

`cy.expandableNodes()`
Returns expandable nodes from whole graph.

`cy.collapsibleNodes()`
Returns collapsible nodes from whole graph.

`cy.setExpandCollapseOptions(options)`
Resets the options to the given parameter.

`cy.setExpandCollapseOption(name, value)`
Sets the value of the option given by the name to the given value.


## Events
`cy.nodes().on("beforeCollapse", function(event) { var node = this; ... })` Triggered before a node is collapsed

`cy.nodes().on("afterCollapse", function(event) { var node = this; ... })` Triggered after a node is collapsed

`cy.nodes().on("beforeExpand", function(event) { var node = this; ... })` Triggered before a node is expanded

`cy.nodes().on("afterExpand", function(event) { var node = this; ... })`  Triggered after a node is expanded


## Default Options
```javascript
    var options = {
      layoutBy: null, // for rearrange after expand/collapse. It's just layout options or whole layout function. Choose your side!
      fisheye: true, // whether to perform fisheye view after expand/collapse you can specify a function too
      animate: true, // whether to animate on drawing changes you can specify a function too
      ready: function () { }, // callback when expand/collapse initialized
      undoable: true, // and if undoRedoExtension exists,

      cueEnabled: true, // Whether cues are enabled
      expandCollapseCuePosition: 'top-left', // default cue position is top left you can specify a function per node too
      expandCollapseCueSize: 12, // size of expand-collapse cue
      expandCollapseCueLineSize: 8, // size of lines used for drawing plus-minus icons
      expandCueImage: undefined, // image of expand icon if undefined draw regular expand cue
      collapseCueImage: undefined, // image of collapse icon if undefined draw regular collapse cue
      expandCollapseCueSensitivity: 1 // sensitivity of expand-collapse cues
    };
```

## Default Undo/Redo Actions
`ur.do("collapse", { nodes: eles, options: opts)` Equivalent of eles.collapse(opts)

`ur.do("expand", { nodes: eles, options: opts)` Equivalent of eles.expand(opts)

`ur.do("collapseRecursively", { nodes: eles, options: opts)` Equivalent of eles.collapseRecursively(opts)

`ur.do("expandRecursively", { nodes: eles, options: opts)` Equivalent of eles.expandRecursively(opts)

`ur.do("collapseAll", { options: opts)` Equivalent of cy.collapseAll(opts)

`ur.do("expandAll", { options: opts })` Equivalent of cy.expandAll(opts)



## Dependencies

 * Cytoscape.js ^1.7.0
 * cytoscape-undo-redo.js(optional) ^1.0.1
 * cytoscape-cose-bilkent.js(optional/suggested for layout after expand/collapse) ^1.3.6


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-expand-collapse`,
 * via bower: `bower install cytoscape-expand-collapse`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var expand-collapse = require('cytoscape-expand-collapse');

expand-collapse( cytoscape, jquery ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-expand-collapse'], function( cytoscape, expand-collapse ){
  expand-collapse( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-expand-collapse https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse.git`


## Team

  * [Selim Firat Yilmaz](https://github.com/mrsfy), [Metin Can Siper](https://github.com/metincansiper), [Alper Karacelik](https://github.com/alperkaracelik), [Ugur Dogrusoz](https://github.com/ugurdogrusoz) of [i-Vis at Bilkent University](http://www.cs.bilkent.edu.tr/~ivis)
