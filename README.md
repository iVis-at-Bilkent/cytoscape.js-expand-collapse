cytoscape-expand-collapse
================================================================================


## Description

This extension provides an interface to expand&#x2F;collapse nodes.

## API
`eles.expand(options)`
`eles.collapse(options)`
`cy.collapseAll(options)`
`cy.expandAll(options)`
`cy.expandCollapse(options)`



## Dependencies

 * Cytoscape.js ^x.y.z
 * cytoscape-undo-redo.js(optional) ^1.0.0


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

expand-collapse( cytoscape ); // register extension
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
