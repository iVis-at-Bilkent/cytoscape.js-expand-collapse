;
(function ($$, $) {
  'use strict';

  var expandCollapseUtilities = require('./expandCollapseUtilities');
  var undoRedoUtilities = require('./undoRedoUtilities');
  var debounce = require('./debounce');
  var elementUtilities = require('./elementUtilities');

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
      expandCollapseCuePosition: 'top-left', // default cue position is top left you can specify a function per node too
      expandCollapseCueSize: 12, // size of expand-collapse cue
      expandCollapseCueLineSize: 8, // size of lines used for drawing plus-minus icons
      expandCueImage: undefined, // image of expand icon if undefined draw regular expand cue
      collapseCueImage: undefined, // image of collapse icon if undefined draw regular collapse cue
      expandCollapseCueSensitivity: 1 // sensitivity of expand-collapse cues
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

          $container.data('cyexpandcollapse', data);

          return $container;
        },
        init: function () {
          var self = this;
          var opts = setOptions(params);
          var $container = $(this);
          var cy;
          var $canvas = $('<canvas></canvas>');
          
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
          var data = $container.data('cyexpandcollapse');
          if (data == null) {
            data = {};
          }
          data.options = opts;

          var optCache;

          function options() {
            return optCache || (optCache = $container.data('cyexpandcollapse').options);
          }

          function clearDraws(keepExpandCues) {

            var w = $container.width();
            var h = $container.height();

            ctx.clearRect(0, 0, w, h);

            if (keepExpandCues) {
              var collapsedNodes = cy.nodes('[expanded-collapsed="collapsed"]');
              for (var i = 0; i < collapsedNodes.length; i++) {
                drawExpandCollapseCue(collapsedNodes[i]);
              }
            }
          }

          function clearNodeDraw(node) {

            var x = node._private.data.expandcollapseRenderedStartX;
            var y = node._private.data.expandcollapseRenderedStartY;
            var s = node._private.data.expandcollapseRenderedCueSize;

            if (node.data('expanded-collapsed') === 'collapsed') {
              drawExpandCollapseCue(node);
            }
            ctx.clearRect(x, y, s, s);
          }

          function drawExpandCollapseCue(node) {
            var cy = node.cy();
            var children = node.children();
            var collapsedChildren = node._private.data.collapsedChildren;
            var hasChildren = children != null && children.length > 0;
            //check if the expand or collapse cue is to be drawn
            if (!hasChildren && collapsedChildren == null) {
              return;
            }

            var expandedOrcollapsed = node.data('expanded-collapsed');

            //Draw expand-collapse rectangles
            var rectSize = options().expandCollapseCueSize;
            var lineSize = options().expandCollapseCueLineSize;
            var diff;

            rectSize = rectSize * cy.zoom();
            lineSize = lineSize * cy.zoom();
            diff = (rectSize - lineSize) / 2;

            var expandcollapseStartX;
            var expandcollapseStartY;
            var expandcollapseEndX;
            var expandcollapseEndY;
            var expandcollapseRectSize;

            var expandcollapseCenterX;
            var expandcollapseCenterY;

            if (options().expandCollapseCuePosition === 'top-left') {
              var p = node.renderedPosition();
              var w = node.renderedOuterWidth();
              var h = node.renderedOuterHeight();

              expandcollapseCenterX = p.x - w / 2 - rectSize / 4 + rectSize / 2;
              expandcollapseCenterY = p.y - h / 2 - rectSize / 4 + rectSize / 2;
            } else {
              var option = options().expandCollapseCuePosition;
              var cueCenter = typeof option === 'function' ? option.call(this, node) : option;
              var expandcollapseCenter = elementUtilities.convertToRenderedPosition(cueCenter);

              expandcollapseCenterX = expandcollapseCenter.x;
              expandcollapseCenterY = expandcollapseCenter.y;
            }

            expandcollapseStartX = expandcollapseCenterX - rectSize / 2;
            expandcollapseStartY = expandcollapseCenterY - rectSize / 2;
            expandcollapseEndX = expandcollapseStartX + rectSize;
            expandcollapseEndY = expandcollapseStartY + rectSize;
            expandcollapseRectSize = rectSize;
            
            // Draw expand/collapse cue if specified use image else draw it
            if (expandedOrcollapsed === 'expanded' && options().expandCueImage) {
              var img=new Image();
              img.src = options().expandCueImage;
              ctx.drawImage(img, expandcollapseCenterX, expandcollapseCenterY, rectSize, rectSize);
            }
            else if (expandedOrcollapsed === 'collapsed' && options().collapseCueImage) {
              var img=new Image();
              img.src = options().collapseCueImage;
              ctx.drawImage(img, expandcollapseCenterX, expandcollapseCenterY, rectSize, rectSize);
            }
            else {
              var oldFillStyle = ctx.fillStyle;
              var oldWidth = ctx.lineWidth;
              var oldStrokeStyle = ctx.strokeStyle;

              ctx.fillStyle = "black";
              ctx.strokeStyle = "black";

              ctx.ellipse(expandcollapseCenterX, expandcollapseCenterY, rectSize / 2, rectSize / 2, 0, 0, 2 * Math.PI);
              ctx.fill();

              ctx.beginPath();

              ctx.strokeStyle = "white";
              ctx.lineWidth = 2.6 * cy.zoom();

              ctx.moveTo(expandcollapseStartX + diff, expandcollapseStartY + rectSize / 2);
              ctx.lineTo(expandcollapseStartX + lineSize + diff, expandcollapseStartY + rectSize / 2);

              if (expandedOrcollapsed == 'collapsed') {
                ctx.moveTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + diff);
                ctx.lineTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + lineSize + diff);
              }

              ctx.closePath();
              ctx.stroke();

              ctx.strokeStyle = oldStrokeStyle;
              ctx.fillStyle = oldFillStyle;
              ctx.lineWidth = oldWidth;
            }

            node._private.data.expandcollapseRenderedStartX = expandcollapseStartX;
            node._private.data.expandcollapseRenderedStartY = expandcollapseStartY;
            node._private.data.expandcollapseRenderedCueSize = expandcollapseRectSize;
          }

          $container.cytoscape(function (e) {
            cy = this;
            clearDraws(true);

            cy.bind('zoom pan', function () {
              clearDraws(true);
            });

            cy.on('mouseover', 'node', function (e) {

              var node = this;

              // remove old handle
              clearDraws(true);

              // add new handle
              drawExpandCollapseCue(node);

              var lastPosition = {};

            });

            cy.on('mouseout tapdragout', 'node', function (e) {

              clearDraws(true);

            });

            cy.on('position', 'node', function () {
              var node = this;

              clearNodeDraw(node);
            });

            cy.on('remove', 'node', function () {
              var node = this;
              clearNodeDraw(node);
            });

            cy.on('tap', 'node', function (event) {
              var node = this;

              var expandcollapseRenderedStartX = node._private.data.expandcollapseRenderedStartX;
              var expandcollapseRenderedStartY = node._private.data.expandcollapseRenderedStartY;
              var expandcollapseRenderedRectSize = node._private.data.expandcollapseRenderedCueSize;
              var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
              var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;

              var cyRenderedPosX = event.cyRenderedPosition.x;
              var cyRenderedPosY = event.cyRenderedPosition.y;
              var factor = (options().expandCollapseCueSensitivity - 1) / 2;
              
              if (cyRenderedPosX >= expandcollapseRenderedStartX - expandcollapseRenderedRectSize * factor
                      && cyRenderedPosX <= expandcollapseRenderedEndX + expandcollapseRenderedRectSize * factor
                      && cyRenderedPosY >= expandcollapseRenderedStartY - expandcollapseRenderedRectSize * factor
                      && cyRenderedPosY <= expandcollapseRenderedEndY + expandcollapseRenderedRectSize * factor) {
                if (node.isCollapsible()) {
                  node.collapse();
                } else {
                  node.expand();
                }
              }
            });
          });

          $container.data('cyexpandcollapse', data);
        }
      };

      if (functions[fn]) {
        return functions[fn].apply(this, Array.prototype.slice.call(arguments, 1));
      } else if (typeof fn == 'object' || !fn) {
        return functions.init.apply(this, arguments);
      } else {
        $.error('No such function `' + fn + '` for cytoscape.js-expand-collapse');
      }

      return $(this);
    };

    $.fn.cyExpandCollapse = $.fn.cytoscapeExpandCollapse;


    // cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      cy = this;
      options = setOptions(opts);

      // All parent nodes are expanded on load
      cy.nodes(':parent').data('expanded-collapsed', 'expanded');
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
