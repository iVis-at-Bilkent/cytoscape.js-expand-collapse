var debounce = require('./debounce');
var elementUtilities;

module.exports = function (params) {
  var fn = params;

  var eMouseOver, eMouseOut, ePosition, eRemove, eTap, eZoom, eAdd, eFree;
  var functions = {
    init: function () {
      var self = this;
      var opts = params;
      var $container = this;
      var cy = this.cytoscape('get');
      var $canvas = $('<canvas></canvas>');
      elementUtilities = require('./elementUtilities')(cy);

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

          // refresh the cues on canvas resize
          if(cy){
            clearDraws(true);
          }
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

        cy.bind('zoom pan', eZoom = function () {
          clearDraws(true);
        });


        cy.on('mouseover', 'node', eMouseOver = function (e) {
          var node = this;

          // remove old handle
          clearDraws(true);

          // add new handle
          drawExpandCollapseCue(node);

          var lastPosition = {};

        });

        cy.on('mouseout tapdragout', 'node', eMouseOut = function (e) {

          clearDraws(true);

        });

        cy.on('position', 'node', ePosition = function () {
          var node = this;

          clearDraws(true);
        });

        cy.on('remove', 'node', eRemove = function () {
          var node = this;
          clearNodeDraw(node);
        });
        
        cy.on('add', 'node', eAdd = function () {
          var node = this;
          drawExpandCollapseCue(node);
        });
        
        cy.on('free', 'node', eFree = function () {
          var node = this;
          
          clearDraws(true);
        });
        
        var ur;
        cy.on('tap', 'node', eTap = function (event) {
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
            if(opts.undoable && !ur)
              ur = cy.undoRedo({
                defaultActions: false
              });
            if(node.isCollapsible())
              if (opts.undoable)
                ur.do("collapse", {
                  nodes: node,
                  options: opts
                });
              else
                node.collapse(opts);
            else if(node.isExpandable())
              if (opts.undoable)
                ur.do("expand", {
                  nodes: node,
                  options: opts
                });
              else
                node.expand(opts);
          }
        });
      });

      $container.data('cyexpandcollapse', data);
    },
    unbind: function () {
        var cy = this.cytoscape('get');
        cy.off('mouseover', 'node', eMouseOver)
          .off('mouseout tapdragout', 'node', eMouseOut)
          .off('position', 'node', ePosition)
          .off('remove', 'node', eRemove)
          .off('tap', 'node', eTap)
          .off('add', 'node', eAdd)
          .off('free', 'node', eFree);

        cy.unbind("zoom pan", eZoom);
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
