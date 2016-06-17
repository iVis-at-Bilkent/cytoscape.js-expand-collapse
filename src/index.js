;
(function ($$, $) {
  'use strict';

  var expandCollapseUtilities = require('./expandCollapseUtilities');
  var undoRedoUtilities = require('./undoRedoUtilities');
  var debounce = require('./debounce');

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape) {

    if (!cytoscape) {
      return;
    } // can't register if cytoscape unspecified

    var cy;
    var options = {
      layoutBy: null, // for rearrange after expand/collapse
      fisheye: true,
      animate: true,
      ready: function () {
      },
      undoable: true, // and if undoRedoExtension exists,
      handleColor: '#000000', // the colour of the handle and the line drawn from it
      hoverDelay: 150, // time spend over a target node before it is considered a target selection
      enabled: true // whether to start the plugin in the enabled state
    };

    function setOptions(from) {
      var tempOpts = {};
      for (var key in options)
        tempOpts[key] = options[key];

      for (var key in from)
        if (tempOpts.hasOwnProperty(key))
          tempOpts[key] = from[key];
      return tempOpts;
    }

    $.fn.cytoscapeExpandCollapse = function (params) {
      var fn = params;

      var functions = {
        option: function (name, value) {
          var $container = $(this);
          var data = $container.data('cyexpandcollapse');

          if (data == null) {
            return;
          }

          var options = data.options;

          if (value === undefined) {
            if (typeof name == typeof {}) {
              var newOpts = name;
              options = setOptions(newOpts);
              data.options = options;
            } else {
              return options[name];
            }
          } else {
            options[name] = value;
          }

          $container.data('cynoderesize', data);

          return $container;
        },
        init: function () {
          var self = this;
          var opts = setOptions(params);
          var $container = $(this);
          var cy;
          var $canvas = $('<canvas></canvas>');
          var handle;
          var line, linePoints;
          var mdownOnHandle = false;
          var grabbingNode = false;
          var inForceStart = false;
          var hoverTimeout;
          var drawsClear = true;
          var sourceNode;
          var drawMode = false;

          $container.append($canvas);

          var _sizeCanvas = debounce(function () {
            $canvas
                    .attr('height', $container.height())
                    .attr('width', $container.width())
                    .css({
                      'position': 'absolute',
                      'top': 0,
                      'left': 0,
                      'z-index': '999'
                    })
                    ;

            setTimeout(function () {
              var canvasBb = $canvas.offset();
              var containerBb = $container.offset();

              $canvas
                      .css({
                        'top': -(canvasBb.top - containerBb.top),
                        'left': -(canvasBb.left - containerBb.left)
                      })
                      ;
            }, 0);
          }, 250);

          function sizeCanvas() {
            _sizeCanvas();
          }

          sizeCanvas();

          $(window).bind('resize', function () {
            sizeCanvas();
          });

          var ctx = $canvas[0].getContext('2d');

          // write options to data
          var data = $container.data('cynoderesize');
          if (data == null) {
            data = {};
          }
          data.options = opts;

          var optCache;

          function options() {
            return optCache || (optCache = $container.data('cynoderesize').options);
          }

          function clearDraws(keepExpandBoxes) {

            if (drawsClear) {
              return;
            } // break early to be efficient

            var w = $container.width();
            var h = $container.height();

            ctx.clearRect(0, 0, w, h);
            
//            if (keepExpandBoxes){
//              var collapsedNodes = cy.nodes('[expanded-collapsed="collapsed"]');
//              for(var i = 0; i < collapsedNodes.length; i++){
//                drawExpandCollapseBox(collapsedNodes[i]);
//              }
//            }
            
            drawsClear = true;
          }

          var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;



          function drawExpandCollapseBox(node) {
            var cy = node.cy();
            var children = node.children();
            var collapsedChildren = node._private.data.collapsedChildren;
            var hasChildren = children != null && children.length > 0;
            //check if the expand or collapse box is to be drawn
            if (!hasChildren && collapsedChildren == null) {
              return;
            }

            //If the compound node has no expanded-collapsed data property make it expanded
            if (node.data()['expanded-collapsed'] == null) {
              node.data('expanded-collapsed', 'expanded');
            }

            var expandedOrcollapsed = node.data('expanded-collapsed');

            //Draw expand-collapse rectangles
            var rectSize = 12;
            var lineSize = 8;
            var startOffset = 5;
            var diff;

            var p = node.renderedPosition();
            var w = node.renderedOuterWidth();
            var h = node.renderedOuterHeight();
            rectSize = rectSize * cy.zoom();
            lineSize = lineSize * cy.zoom();
            diff = (rectSize - lineSize) / 2;

            node._private.data.expandcollapseStartX = p.x - w / 2 - rectSize / 4;
            node._private.data.expandcollapseStartY = p.y - h / 2 - rectSize / 4;
            node._private.data.expandcollapseEndX = node._private.data.expandcollapseStartX + rectSize;
            node._private.data.expandcollapseEndY = node._private.data.expandcollapseStartY + rectSize;
            node._private.data.expandcollapseRectSize = rectSize;

            var expandCollapseCenterX = node._private.data.expandcollapseStartX + rectSize / 2;
            var expandCollapseCenterY = node._private.data.expandcollapseStartY + rectSize / 2;

            var oldFillStyle = ctx.fillStyle;
            var oldWidth = ctx.lineWidth;
            var oldStrokeStyle = ctx.strokeStyle;

            ctx.fillStyle = "black";
            ctx.strokeStyle = "black";

//            window.cyNodeShapes['ellipse'].draw(ctx, expandCollapseCenterX, expandCollapseCenterY, rectSize, rectSize);
            ctx.ellipse(expandCollapseCenterX, expandCollapseCenterY, rectSize / 2, rectSize / 2, 0, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();

            ctx.strokeStyle = "white";
            ctx.lineWidth = 2.6 * cy.zoom();

            ctx.moveTo(node._private.data.expandcollapseStartX + diff, node._private.data.expandcollapseStartY + rectSize / 2);
            ctx.lineTo(node._private.data.expandcollapseStartX + lineSize + diff, node._private.data.expandcollapseStartY + +rectSize / 2);

            if (expandedOrcollapsed == 'collapsed') {
              ctx.moveTo(node._private.data.expandcollapseStartX + rectSize / 2, node._private.data.expandcollapseStartY + diff);
              ctx.lineTo(node._private.data.expandcollapseStartX + rectSize / 2, node._private.data.expandcollapseStartY + lineSize + diff);
            }

            ctx.closePath();
            ctx.stroke();

            ctx.strokeStyle = oldStrokeStyle;
            ctx.fillStyle = oldFillStyle;
            ctx.lineWidth = oldWidth;

            drawsClear = false;
          }

          $container.cytoscape(function (e) {
            cy = this;

            var transformHandler;
            cy.bind('zoom pan', transformHandler = function () {
              clearDraws();
            });

            var startHandler, hoverHandler, leaveHandler, grabNodeHandler, freeNodeHandler, dragNodeHandler, forceStartHandler, removeHandler, tapToStartHandler, dragHandler, grabHandler;
            cy.on('mouseover', 'node', function (e) {

              var node = this;

              // remove old handle
              clearDraws(true);

              // add new handle
              drawExpandCollapseBox(node);

              node.trigger('cynoderesize.showhandle');
              var lastPosition = {};

            });
            
            cy.on('mouseout tapdragout', 'node', function (e) {

              clearDraws(true);

            });



//            data.unbind = function () {
//              cy
//                      .off('mouseover', 'node', startHandler)
//                      .off('mouseover', 'node', hoverHandler)
//                      .off('mouseout', 'node', leaveHandler)
//                      .off('drag position', 'node', dragNodeHandler)
//                      .off('grab', 'node', grabNodeHandler)
//                      .off('free', 'node', freeNodeHandler)
//                      .off('cynoderesize.forcestart', 'node', forceStartHandler)
//                      .off('remove', 'node', removeHandler)
//                      .off('tap', 'node', tapToStartHandler);
//            };
          });

          $container.data('cynoderesize', data);
        }
      };

      if (functions[fn]) {
        return functions[fn].apply(this, Array.prototype.slice.call(arguments, 1));
      } else if (typeof fn == 'object' || !fn) {
        return functions.init.apply(this, arguments);
      } else {
        $.error('No such function `' + fn + '` for jquery.cytoscapeNodeResize');
      }

      return $(this);
    };

    $.fn.cyExpandCollapse = $.fn.cytoscapeExpandCollapse;

    var tappedBefore;
    var tappedTimeout;

    // cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      cy = this;
      options = setOptions(opts);

      undoRedoUtilities(options.undoable);

      options.ready();

      return $(cy.container()).cytoscapeExpandCollapse(options);
    });

    // Collection functions

    // eles.collapse(options)
    cytoscape('collection', 'collapse', function (opts) {
      var eles = this.collapsibleNodes();
      var tempOptions = setOptions(opts);

      return expandCollapseUtilities.collapseGivenNodes(eles, tempOptions);
    });

    // eles.collapseAll(options)
    cytoscape('collection', 'collapseRecursively', function (opts) {
      var eles = this.collapsibleNodes();
      var tempOptions = setOptions(opts);

      return eles.union(eles.descendants()).collapse(tempOptions);
    });

    // eles.expand(options)
    cytoscape('collection', 'expand', function (opts) {
      var eles = this.expandableNodes();
      var tempOptions = setOptions(opts);

      return expandCollapseUtilities.expandGivenNodes(eles, tempOptions);
    });

    // eles.expandAll(options)
    cytoscape('collection', 'expandRecursively', function (opts) {
      var eles = this.expandableNodes();
      var tempOptions = setOptions(opts);

      return expandCollapseUtilities.expandAllNodes(eles, tempOptions);
    });


    // Core functions

    // cy.collapseAll(options)
    cytoscape('core', 'collapseAll', function (opts) {
      var cy = this;
      var tempOptions = setOptions(opts);

      return cy.collapsibleNodes().collapseRecursively(tempOptions);
    });

    // cy.expandAll(options)
    cytoscape('core', 'expandAll', function (opts) {
      var cy = this;
      var tempOptions = setOptions(opts);

      return cy.expandableNodes().expandRecursively(tempOptions);
    });


    // Utility functions

    // ele.isCollapsible()
    cytoscape('collection', 'isExpandable', function () {
      var ele = this;

      return (ele.data("expanded-collapsed") === "collapsed");
    });

    // ele.isExpandable()
    cytoscape('collection', 'isCollapsible', function () {
      var ele = this;
      return !ele.isExpandable() && ele.isParent();
    });

    // eles.collapsed()
    cytoscape('collection', 'collapsibleNodes', function () {
      var eles = this;

      return eles.filter(function (i, ele) {
        return ele.isCollapsible();
      });
    });

    // eles.expanded()
    cytoscape('collection', 'expandableNodes', function () {
      var eles = this;

      return eles.filter(function (i, ele) {
        return ele.isExpandable();
      });
    });
    // eles.collapsed()
    cytoscape('core', 'collapsibleNodes', function () {
      var cy = this;

      return cy.nodes().collapsibleNodes();
    });

    // eles.expanded()
    cytoscape('core', 'expandableNodes', function () {
      var cy = this;

      return cy.nodes().expandableNodes();
    });
  };

  if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
    module.exports = register;
  }

  if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
    define('cytoscape-expand-collapse', function () {
      return register;
    });
  }

  if (typeof cytoscape !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape);
  }

})(cytoscape, jQuery);
