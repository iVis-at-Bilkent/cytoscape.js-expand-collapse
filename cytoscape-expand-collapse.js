;(function(){ 'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    var options = {
      
    };

    cytoscape( "core", "expandCollapse", function (options) {
      var cy = this;


    });

    cytoscape( 'collection', 'collapse', function(){
      var eles = this;
      var cy = this.cy();



      return this; // chainability
    } );

    cytoscape( 'collection', 'expand', function(){
      var eles = this;
      var cy = this.cy();



      return this; // chainability
    } );

    cytoscape( 'core', 'collapseAll', function(){
      var eles = this;
      var cy = this.cy();



      return this; // chainability
    } );

    cytoscape( 'core', 'expandAll', function(){
      var eles = this;
      var cy = this.cy();



      return this; // chainability
    } );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-expand-collapse', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})();
