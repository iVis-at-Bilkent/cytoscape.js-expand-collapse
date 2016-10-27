(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeExpandCollapse = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var boundingBoxUtilities = {
  equalBoundingBoxes: function(bb1, bb2){
      return bb1.x1 == bb2.x1 && bb1.x2 == bb2.x2 && bb1.y1 == bb2.y1 && bb1.y2 == bb2.y2;
  },
  getUnion: function(bb1, bb2){
      var union = {
      x1: Math.min(bb1.x1, bb2.x1),
      x2: Math.max(bb1.x2, bb2.x2),
      y1: Math.min(bb1.y1, bb2.y1),
      y2: Math.max(bb1.y2, bb2.y2),
    };

    union.w = union.x2 - union.x1;
    union.h = union.y2 - union.y1;

    return union;
  }
};

module.exports = boundingBoxUtilities;
},{}],2:[function(_dereq_,module,exports){
var debounce = _dereq_('./debounce');
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
      elementUtilities = _dereq_('./elementUtilities')(cy);

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
    return functions[fn].apply($(cy.container()), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply($(cy.container()), arguments);
  } else {
    $.error('No such function `' + fn + '` for cytoscape.js-expand-collapse');
  }

  return $(this);
};

},{"./debounce":3,"./elementUtilities":4}],3:[function(_dereq_,module,exports){
var debounce = (function () {
  /**
   * lodash 3.1.1 (Custom Build) <https://lodash.com/>
   * Build: `lodash modern modularize exports="npm" -o ./`
   * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   * Available under MIT license <https://lodash.com/license>
   */
  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /* Native method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max,
          nativeNow = Date.now;

  /**
   * Gets the number of milliseconds that have elapsed since the Unix epoch
   * (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @category Date
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => logs the number of milliseconds it took for the deferred function to be invoked
   */
  var now = nativeNow || function () {
    return new Date().getTime();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed invocations. Provide an options object to indicate that `func`
   * should be invoked on the leading and/or trailing edge of the `wait` timeout.
   * Subsequent calls to the debounced function return the result of the last
   * `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
   * on the trailing edge of the timeout only if the the debounced function is
   * invoked more than once during the `wait` timeout.
   *
   * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options] The options object.
   * @param {boolean} [options.leading=false] Specify invoking on the leading
   *  edge of the timeout.
   * @param {number} [options.maxWait] The maximum time `func` is allowed to be
   *  delayed before it's invoked.
   * @param {boolean} [options.trailing=true] Specify invoking on the trailing
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // avoid costly calculations while the window size is in flux
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
   * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // ensure `batchLog` is invoked once after 1 second of debounced calls
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', _.debounce(batchLog, 250, {
   *   'maxWait': 1000
   * }));
   *
   * // cancel a debounced call
   * var todoChanges = _.debounce(batchLog, 1000);
   * Object.observe(models.todo, todoChanges);
   *
   * Object.observe(models, function(changes) {
   *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
   *     todoChanges.cancel();
   *   }
   * }, ['delete']);
   *
   * // ...at some point `models.todo` is changed
   * models.todo.completed = true;
   *
   * // ...before 1 second has passed `models.todo` is deleted
   * // which cancels the debounced `todoChanges` call
   * delete models.todo;
   */
  function debounce(func, wait, options) {
    var args,
            maxTimeoutId,
            result,
            stamp,
            thisArg,
            timeoutId,
            trailingCall,
            lastCalled = 0,
            maxWait = false,
            trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = wait < 0 ? 0 : (+wait || 0);
    if (options === true) {
      var leading = true;
      trailing = false;
    } else if (isObject(options)) {
      leading = !!options.leading;
      maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      lastCalled = 0;
      maxTimeoutId = timeoutId = trailingCall = undefined;
    }

    function complete(isCalled, id) {
      if (id) {
        clearTimeout(id);
      }
      maxTimeoutId = timeoutId = trailingCall = undefined;
      if (isCalled) {
        lastCalled = now();
        result = func.apply(thisArg, args);
        if (!timeoutId && !maxTimeoutId) {
          args = thisArg = undefined;
        }
      }
    }

    function delayed() {
      var remaining = wait - (now() - stamp);
      if (remaining <= 0 || remaining > wait) {
        complete(trailingCall, maxTimeoutId);
      } else {
        timeoutId = setTimeout(delayed, remaining);
      }
    }

    function maxDelayed() {
      complete(trailing, timeoutId);
    }

    function debounced() {
      args = arguments;
      stamp = now();
      thisArg = this;
      trailingCall = trailing && (timeoutId || !leading);

      if (maxWait === false) {
        var leadingCall = leading && !timeoutId;
      } else {
        if (!maxTimeoutId && !leading) {
          lastCalled = stamp;
        }
        var remaining = maxWait - (stamp - lastCalled),
                isCalled = remaining <= 0 || remaining > maxWait;

        if (isCalled) {
          if (maxTimeoutId) {
            maxTimeoutId = clearTimeout(maxTimeoutId);
          }
          lastCalled = stamp;
          result = func.apply(thisArg, args);
        }
        else if (!maxTimeoutId) {
          maxTimeoutId = setTimeout(maxDelayed, remaining);
        }
      }
      if (isCalled && timeoutId) {
        timeoutId = clearTimeout(timeoutId);
      }
      else if (!timeoutId && wait !== maxWait) {
        timeoutId = setTimeout(delayed, wait);
      }
      if (leadingCall) {
        isCalled = true;
        result = func.apply(thisArg, args);
      }
      if (isCalled && !timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
      return result;
    }

    debounced.cancel = cancel;
    return debounced;
  }

  /**
   * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  return debounce;

})();

module.exports = debounce;
},{}],4:[function(_dereq_,module,exports){
function elementUtilities(cy) {
 return {
  moveNodes: function (positionDiff, nodes, notCalcTopMostNodes) {
    var topMostNodes = notCalcTopMostNodes ? nodes : this.getTopMostNodes(nodes);
    for (var i = 0; i < topMostNodes.length; i++) {
      var node = topMostNodes[i];
      var oldX = node.position("x");
      var oldY = node.position("y");
      node.position({
        x: oldX + positionDiff.x,
        y: oldY + positionDiff.y
      });
      var children = node.children();
      this.moveNodes(positionDiff, children, true);
    }
  },
  getTopMostNodes: function (nodes) {//*//
    var nodesMap = {};
    for (var i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
    }
    var roots = nodes.filter(function (i, ele) {
      var parent = ele.parent()[0];
      while (parent != null) {
        if (nodesMap[parent.id()]) {
          return false;
        }
        parent = parent.parent()[0];
      }
      return true;
    });

    return roots;
  },
  rearrange: function (layoutBy) {
    if (typeof layoutBy === "function") {
      layoutBy();
    } else if (layoutBy != null) {
      cy.layout(layoutBy);
    }
  },
  convertToRenderedPosition: function (modelPosition) {
    var pan = cy.pan();
    var zoom = cy.zoom();

    var x = modelPosition.x * zoom + pan.x;
    var y = modelPosition.y * zoom + pan.y;

    return {
      x: x,
      y: y
    };
  }
 };
}

module.exports = elementUtilities;

},{}],5:[function(_dereq_,module,exports){
var boundingBoxUtilities = _dereq_('./boundingBoxUtilities');

// Expand collapse utilities
function expandCollapseUtilities(cy) {
var elementUtilities = _dereq_('./elementUtilities')(cy);
return {
  //the number of nodes moving animatedly after expand operation
  animatedlyMovingNodeCount: 0,
  //A funtion basicly expanding a node it is to be called when a node is expanded anyway
  expandNodeBaseFunction: function (node, triggerLayout, single, layoutBy) {//*//
    //check how the position of the node is changed
    var positionDiff = {
      x: node.position('x') - node.data('position-before-collapse').x,
      y: node.position('y') - node.data('position-before-collapse').y
    };

    node.removeData("infoLabel");
    node.data('expanded-collapsed', 'expanded');

    node.trigger("beforeExpand");
    node._private.data.collapsedChildren.restore();
    this.repairEdges(node);
    node._private.data.collapsedChildren = null;
    node.trigger("afterExpand");


    elementUtilities.moveNodes(positionDiff, node.children());
    node.removeData('position-before-collapse');

    if (single)
      this.endOperation(layoutBy);
    // refreshPaddings();
   /* if (triggerLayout)
      elementUtilities.rearrange(layoutBy);*/
  },
  simpleCollapseGivenNodes: function (nodes) {//*//
    nodes.data("collapse", true);
    var roots = elementUtilities.getTopMostNodes(nodes);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      
      // Collapse the nodes in bottom up order
      cy.startBatch();
      this.collapseBottomUp(root);
      cy.endBatch();
    }
    
    // Update the style
    cy.style().update();
    return nodes;
  },
  simpleExpandGivenNodes: function (nodes, applyFishEyeViewToEachNode) {//*//
    nodes.data("expand", true);
    var roots = elementUtilities.getTopMostNodes(nodes);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      this.expandTopDown(root, applyFishEyeViewToEachNode);
    }
    return nodes;
  },
  simpleExpandAllNodes: function (nodes, applyFishEyeViewToEachNode) {//*//
    if (nodes === undefined) {
      nodes = cy.nodes();
    }
    var orphans;
    orphans = elementUtilities.getTopMostNodes(nodes);
    var expandStack = [];
    for (var i = 0; i < orphans.length; i++) {
      var root = orphans[i];
      this.expandAllTopDown(root, expandStack, applyFishEyeViewToEachNode);
    }
    return expandStack;
  },
  endOperation: function (layoutBy) {
    var self = this;
    cy.ready(function () {
      elementUtilities.rearrange(layoutBy);
    });
  },
  expandAllNodes: function (nodes, options) {//*//
    var expandedStack = this.simpleExpandAllNodes(nodes, options.fisheye);

    this.endOperation(options.layoutBy);

    //elementUtilities.rearrange(options.layoutBy);

    /*
     * return the nodes to undo the operation
     */
    return expandedStack;
  },
  expandAllTopDown: function (root, expandStack, applyFishEyeViewToEachNode) {//*//
    if (root._private.data.collapsedChildren != null) {
      expandStack.push(root);
      this.simpleExpandNode(root, applyFishEyeViewToEachNode);
    }
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.expandAllTopDown(node, expandStack, applyFishEyeViewToEachNode);
    }
  },
  //Expand the given nodes perform incremental layout after expandation
  expandGivenNodes: function (nodes, options) {//*//
    if (nodes.length === 1) {
      this.expandNode(nodes[0], options.fisheye, options.animate, options.layoutBy);

    } else {
      this.simpleExpandGivenNodes(nodes, options.fisheye);
      this.endOperation(options.layoutBy);

      //elementUtilities.rearrange(options.layoutBy);
    }

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the given nodes then make incremental layout
  collapseGivenNodes: function (nodes, options) {//*//
    this.simpleCollapseGivenNodes(nodes, options);

    this.endOperation(options.layoutBy);
    //elementUtilities.rearrange(options.layoutBy);

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the nodes in bottom up order starting from the root
  collapseBottomUp: function (root) {//*//
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.collapseBottomUp(node);
    }
    //If the root is a compound node to be collapsed then collapse it
    if (root.data("collapse") && root.children().length > 0) {
      this.simpleCollapseNode(root);
      root.removeData("collapse");
    }
  },
  //expand the nodes in top down order starting from the root
  expandTopDown: function (root, applyFishEyeViewToEachNode) {//*//
    if (root.data("expand") && root._private.data.collapsedChildren != null) {
      this.simpleExpandNode(root, applyFishEyeViewToEachNode);
      root.removeData("expand");
    }
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.expandTopDown(node);
    }
  },
  expandNode: function (node, fisheye, animate, layoutBy) {
    if (node._private.data.collapsedChildren != null) {
      this.simpleExpandNode(node, fisheye, true, animate, layoutBy);

      /*
       * return the node to undo the operation
       */
      return node;
    }
  },
  convertToModelPosition: function (renderedPosition) {
    var pan = cy.pan();
    var zoom = cy.zoom();

    var x = (renderedPosition.x - pan.x) / zoom;
    var y = (renderedPosition.y - pan.y) / zoom;

    return {
      x: x,
      y: y
    };
  },
  /*
   *
   * This method expands the given node
   * without making incremental layout
   * after expand operation it will be simply
   * used to undo the collapse operation
   */
  simpleExpandNode: function (node, applyFishEyeViewToEachNode, singleNotSimple, animate, layoutBy) {//*//
    var self = this;
    
    if( !animate ) {
      cy.startBatch();
    }

    var commonExpandOperation = function (node, applyFishEyeViewToEachNode, singleNotSimple, animate, layoutBy) {
      if (applyFishEyeViewToEachNode) {

        node.data('width-before-fisheye', node.data('size-before-collapse').w);
        node.data('height-before-fisheye', node.data('size-before-collapse').h);

        self.fishEyeViewExpandGivenNode(node, singleNotSimple, node, animate, layoutBy);
      }

      if (!singleNotSimple || !applyFishEyeViewToEachNode || !animate) {
        self.expandNodeBaseFunction(node, singleNotSimple, singleNotSimple, layoutBy); //*****
      }
    };

    if (node._private.data.collapsedChildren != null) {
      this.storeWidthHeight(node);
      if (applyFishEyeViewToEachNode && singleNotSimple) {
        var topLeftPosition = this.convertToModelPosition({x: 0, y: 0});
        var bottomRightPosition = this.convertToModelPosition({x: cy.width(), y: cy.height()});
        var padding = 80;
        var bb = {
          x1: topLeftPosition.x,
          x2: bottomRightPosition.x,
          y1: topLeftPosition.y,
          y2: bottomRightPosition.y
        };

        var nodeBB = {
          x1: node.position('x') - node.data('size-before-collapse').w / 2 - padding,
          x2: node.position('x') + node.data('size-before-collapse').w / 2 + padding,
          y1: node.position('y') - node.data('size-before-collapse').h / 2 - padding,
          y2: node.position('y') + node.data('size-before-collapse').h / 2 + padding
        };

        var unionBB = boundingBoxUtilities.getUnion(nodeBB, bb);
        var animating = false;

        if (!boundingBoxUtilities.equalBoundingBoxes(unionBB, bb)) {
          var viewPort = cy.getFitViewport(unionBB, 10);
          var self = this;
          animating = animate;
          if (animate) {
            cy.animate({
              pan: viewPort.pan,
              zoom: viewPort.zoom,
              complete: function () {
                commonExpandOperation(node, applyFishEyeViewToEachNode, singleNotSimple, animate, layoutBy);
              }
            }, {
              duration: 1000
            });
          }
          else {
            cy.zoom(viewPort.zoom);
            cy.pan(viewPort.pan);
          }
        }
        if (!animating) {
          commonExpandOperation(node, applyFishEyeViewToEachNode, singleNotSimple, animate, layoutBy);
        }
      }
      else {
        commonExpandOperation(node, applyFishEyeViewToEachNode, singleNotSimple, animate, layoutBy);
      }
      
      if( !animate ) {
        cy.endBatch();
      }

      //return the node to undo the operation
      return node;
    }
  },
  //collapse the given node without making incremental layout
  simpleCollapseNode: function (node) {//*//
    if (node._private.data.collapsedChildren == null) {
      node.data('position-before-collapse', {
        x: node.position().x,
        y: node.position().y
      });

      node.data('size-before-collapse', {
        w: node.outerWidth(),
        h: node.outerHeight()
      });

      node.children().unselect();
      node.children().connectedEdges().unselect();

      node.data('expanded-collapsed', 'collapsed');

      var children = node.children();

      node.trigger("beforeCollapse");
      this.barrowEdgesOfcollapsedChildren(node);

      this.removeChildren(node, node);

      node.trigger("afterCollapse");
      
      node.position(node.data('position-before-collapse'));

      //return the node to undo the operation
      return node;
    }
  },
  storeWidthHeight: function (node) {//*//
    if (node != null) {
      node.data('x-before-fisheye', this.xPositionInParent(node));
      node.data('y-before-fisheye', this.yPositionInParent(node));
      node.data('width-before-fisheye', node.outerWidth());
      node.data('height-before-fisheye', node.outerHeight());

      if (node.parent()[0] != null) {
        this.storeWidthHeight(node.parent()[0]);
      }
    }

  },
  fishEyeViewExpandGivenNode: function (node, singleNotSimple, nodeToExpand, animate, layoutBy) {//*//
    var siblings = this.getSiblings(node);

    var x_a = this.xPositionInParent(node);
    var y_a = this.yPositionInParent(node);

    var d_x_left = Math.abs((node.data('width-before-fisheye') - node.outerWidth()) / 2);
    var d_x_right = Math.abs((node.data('width-before-fisheye') - node.outerWidth()) / 2);
    var d_y_upper = Math.abs((node.data('height-before-fisheye') - node.outerHeight()) / 2);
    var d_y_lower = Math.abs((node.data('height-before-fisheye') - node.outerHeight()) / 2);

    var abs_diff_on_x = Math.abs(node.data('x-before-fisheye') - x_a);
    var abs_diff_on_y = Math.abs(node.data('y-before-fisheye') - y_a);

    // Center went to LEFT
    if (node.data('x-before-fisheye') > x_a) {
      d_x_left = d_x_left + abs_diff_on_x;
      d_x_right = d_x_right - abs_diff_on_x;
    }
    // Center went to RIGHT
    else {
      d_x_left = d_x_left - abs_diff_on_x;
      d_x_right = d_x_right + abs_diff_on_x;
    }

    // Center went to UP
    if (node.data('y-before-fisheye') > y_a) {
      d_y_upper = d_y_upper + abs_diff_on_y;
      d_y_lower = d_y_lower - abs_diff_on_y;
    }
    // Center went to DOWN
    else {
      d_y_upper = d_y_upper - abs_diff_on_y;
      d_y_lower = d_y_lower + abs_diff_on_y;
    }

    var xPosInParentSibling = [];
    var yPosInParentSibling = [];

    for (var i = 0; i < siblings.length; i++) {
      xPosInParentSibling.push(this.xPositionInParent(siblings[i]));
      yPosInParentSibling.push(this.yPositionInParent(siblings[i]));
    }

    for (var i = 0; i < siblings.length; i++) {
      var sibling = siblings[i];

      var x_b = xPosInParentSibling[i];
      var y_b = yPosInParentSibling[i];

      var slope = (y_b - y_a) / (x_b - x_a);

      var d_x = 0;
      var d_y = 0;
      var T_x = 0;
      var T_y = 0;

      // Current sibling is on the LEFT
      if (x_a > x_b) {
        d_x = d_x_left;
      }
      // Current sibling is on the RIGHT
      else {
        d_x = d_x_right;
      }
      // Current sibling is on the UPPER side
      if (y_a > y_b) {
        d_y = d_y_upper;
      }
      // Current sibling is on the LOWER side
      else {
        d_y = d_y_lower;
      }

      if (isFinite(slope)) {
        T_x = Math.min(d_x, (d_y / Math.abs(slope)));
      }

      if (slope !== 0) {
        T_y = Math.min(d_y, (d_x * Math.abs(slope)));
      }

      if (x_a > x_b) {
        T_x = -1 * T_x;
      }

      if (y_a > y_b) {
        T_y = -1 * T_y;
      }

      this.fishEyeViewMoveNode(sibling, T_x, T_y, nodeToExpand, singleNotSimple, animate, layoutBy);
    }

    if (siblings.length == 0) {
      this.expandNodeBaseFunction(nodeToExpand, singleNotSimple, true, layoutBy);
    }

    if (node.parent()[0] != null) {
      this.fishEyeViewExpandGivenNode(node.parent()[0], singleNotSimple, nodeToExpand, animate, layoutBy);
    }

    return node;
  },
  getSiblings: function (node) {//*//
    var siblings;

    if (node.parent()[0] == null) {
      siblings = cy.collection();
      var orphans = cy.nodes().orphans();

      for (var i = 0; i < orphans.length; i++) {
        if (orphans[i] != node) {
          siblings = siblings.add(orphans[i]);
        }
      }
    } else {
      siblings = node.siblings();
    }

    return siblings;
  },
  /*
   * Move node operation specialized for fish eye view expand operation
   * Moves the node by moving its descandents. Movement is animated if singleNotSimple flag is truthy.
   */
  fishEyeViewMoveNode: function (node, T_x, T_y, nodeToExpand, singleNotSimple, animate, layoutBy) {//*//
    var childrenList = node.children();
    var self = this;

    if (childrenList.length == 0) {
      var newPosition = {x: node.position('x') + T_x, y: node.position('y') + T_y};
      if (!singleNotSimple || !animate) {
        node.position(newPosition);
      }
      else {
        this.animatedlyMovingNodeCount++;
        node.animate({
          position: newPosition,
          complete: function () {
            self.animatedlyMovingNodeCount--;
            if (self.animatedlyMovingNodeCount > 0 || nodeToExpand.data('expanded-collapsed') === 'expanded') {

              return;
            }

            self.expandNodeBaseFunction(nodeToExpand, singleNotSimple, true, layoutBy);

          }
        }, {
          duration: 1000
        });
      }
    }
    else {

      for (var i = 0; i < childrenList.length; i++) {
        this.fishEyeViewMoveNode(childrenList[i], T_x, T_y, nodeToExpand, singleNotSimple, animate, layoutBy);
      }
    }
  },
  xPositionInParent: function (node) {//*//
    var parent = node.parent()[0];
    var x_a = 0.0;

    // Given node is not a direct child of the the root graph
    if (parent != null) {
      x_a = node.relativePosition('x') + (parent.width() / 2);
    }
    // Given node is a direct child of the the root graph

    else {
      x_a = node.position('x');
    }

    return x_a;
  },
  yPositionInParent: function (node) {//*//
    var parent = node.parent()[0];

    var y_a = 0.0;

    // Given node is not a direct child of the the root graph
    if (parent != null) {
      y_a = node.relativePosition('y') + (parent.height() / 2);
    }
    // Given node is a direct child of the the root graph

    else {
      y_a = node.position('y');
    }

    return y_a;
  },
  /*
   * for all children of the node parameter call this method
   * with the same root parameter,
   * remove the child and add the removed child to the collapsedchildren data
   * of the root to restore them in the case of expandation
   * root._private.data.collapsedChildren keeps the nodes to restore when the
   * root is expanded
   */
  removeChildren: function (node, root) {//*//
    var children = node.children();
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      this.removeChildren(child, root);
      var removedChild = child.remove();
      if (root._private.data.collapsedChildren == null) {
        root._private.data.collapsedChildren = removedChild;
      }
      else {
        root._private.data.collapsedChildren = root._private.data.collapsedChildren.union(removedChild);
      }
    }
  },
  isMetaEdge: function(edge) {
    return edge.hasClass("meta");
  },
  barrowEdgesOfcollapsedChildren: function(node) {
    var relatedNodes = node.descendants();
    var edges = relatedNodes.edgesWith(cy.nodes().not(relatedNodes.union(node)));
    
    var relatedNodeMap = {};
    
    relatedNodes.each(function(i, ele) {
      relatedNodeMap[ele.id()] = true;
    });
    
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var source = edge.source();
      var target = edge.target();
      
      if (!this.isMetaEdge(edge)) { // is original
        var originalEndsData = {
          source: source,
          target: target
        };
        
        edge.addClass("meta");
        edge.data('originalEnds', originalEndsData);
      }
      
      edge.move({
        target: !relatedNodeMap[target.id()] ? target.id() : node.id(),
        source: !relatedNodeMap[source.id()] ? source.id() : node.id()
      });
    }
  },
  findNewEnd: function(node) {
    var current = node;
    
    while( !current.inside() ) {
      current = current.parent();
    }
    
    return current;
  },
  repairEdges: function(node) {
    var connectedMetaEdges = node.connectedEdges('.meta');
    
    for (var i = 0; i < connectedMetaEdges.length; i++) {
      var edge = connectedMetaEdges[i];
      var originalEnds = edge.data('originalEnds');
      var currentSrcId = edge.data('source');
      var currentTgtId = edge.data('target');
      
      if ( currentSrcId === node.id() ) {
        edge = edge.move({
          source: this.findNewEnd(originalEnds.source).id()
        });
      } else {
        edge = edge.move({
          target: this.findNewEnd(originalEnds.target).id()
        });
      }
      
      if ( edge.data('source') === originalEnds.source.id() && edge.data('target') === originalEnds.target.id() ) {
        edge.removeClass('meta');
        edge.removeData('originalEnds');
      }
    }
  },
  /*node is an outer node of root
   if root is not it's anchestor
   and it is not the root itself*/
  isOuterNode: function (node, root) {//*//
    var temp = node;
    while (temp != null) {
      if (temp == root) {
        return false;
      }
      temp = temp.parent()[0];
    }
    return true;
  }
}
};

module.exports = expandCollapseUtilities;

},{"./boundingBoxUtilities":1,"./elementUtilities":4}],6:[function(_dereq_,module,exports){
;
(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape, $) {

    if (!cytoscape) {
      return;
    } // can't register if cytoscape unspecified

    var expandCollapseUtilities = _dereq_('./expandCollapseUtilities');
    var undoRedoUtilities = _dereq_('./undoRedoUtilities');
    var elementUtilities = _dereq_('./elementUtilities');
    var cueUtilities = _dereq_("./cueUtilities");

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

    function setOptions(from) {
      var tempOpts = {};
      for (var key in options)
        tempOpts[key] = options[key];

      for (var key in from)
        if (tempOpts.hasOwnProperty(key))
          tempOpts[key] = from[key];
      return tempOpts;
    }
    
    // evaluate some specific options in case of they are specified as functions to be dynamically changed
    function evalOptions(options) {
      var animate = typeof options.animate === 'function' ? options.animate.call() : options.animate;
      var fisheye = typeof options.fisheye === 'function' ? options.fisheye.call() : options.fisheye;
      
      options.animate = animate;
      options.fisheye = fisheye;
    }


    // cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      var cy = this;
      options = setOptions(opts);

      // All parent nodes are expanded on load
      cy.nodes(':parent').data('expanded-collapsed', 'expanded');
      undoRedoUtilities(cy);
      
      if(options.cueEnabled)
        cueUtilities(options);
      else
        cueUtilities("unbind");


      options.ready();


      return cy;
    });
    
    // set functions
    
    // set all options at once
    cytoscape("core", "setExpandCollapseOptions", function (opts) {
      options = opts;
    });
    
    // set the option whose name is given
    cytoscape("core", "setExpandCollapseOption", function (name, value) {
      options[name] = value;
    });

    // Collection functions

    // eles.collapse(options)
    cytoscape('collection', 'collapse', function (opts) {
      var eles = this.collapsibleNodes();
      var tempOptions = setOptions(opts);
      evalOptions(tempOptions);

      return expandCollapseUtilities(this.cy()).collapseGivenNodes(eles, tempOptions);
    });

    // eles.collapseAll(options)
    cytoscape('collection', 'collapseRecursively', function (opts) {
      var eles = this.collapsibleNodes();
      var tempOptions = setOptions(opts);
      evalOptions(tempOptions);

      return eles.union(eles.descendants()).collapse(tempOptions);
    });

    // eles.expand(options)
    cytoscape('collection', 'expand', function (opts) {
      var eles = this.expandableNodes();
      var tempOptions = setOptions(opts);
      evalOptions(tempOptions);

      return expandCollapseUtilities(this.cy()).expandGivenNodes(eles, tempOptions);
    });

    // eles.expandAll(options)
    cytoscape('collection', 'expandRecursively', function (opts) {
      var eles = this.expandableNodes();
      var tempOptions = setOptions(opts);
      evalOptions(tempOptions);

      return expandCollapseUtilities(this.cy()).expandAllNodes(eles, tempOptions);
    });


    // Core functions

    // cy.collapseAll(options)
    cytoscape('core', 'collapseAll', function (opts) {
      var cy = this;
      var tempOptions = setOptions(opts);
      evalOptions(tempOptions);

      return cy.collapsibleNodes().collapseRecursively(tempOptions);
    });

    // cy.expandAll(options)
    cytoscape('core', 'expandAll', function (opts) {
      var cy = this;
      var tempOptions = setOptions(opts);
      evalOptions(tempOptions);

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

    if (typeof cytoscape !== 'undefined' && typeof jQuery !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
      register(cytoscape, jQuery);
  }

})();

},{"./cueUtilities":2,"./elementUtilities":4,"./expandCollapseUtilities":5,"./undoRedoUtilities":7}],7:[function(_dereq_,module,exports){
module.exports = function (cy) {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({}, true);

  function getEles(_eles) {
    return (typeof _eles === "string") ? cy.$(_eles) : _eles;
  }

  function getNodePositionsAndSizes() {
    var positionsAndSizes = {};
    var nodes = cy.nodes();

    for (var i = 0; i < nodes.length; i++) {
      var ele = nodes[i];
      positionsAndSizes[ele.id()] = {
        width: ele.width(),
        height: ele.height(),
        x: ele.position("x"),
        y: ele.position("y")
      };
    }

    return positionsAndSizes;
  }

  function returnToPositionsAndSizes(nodesData) {
    var currentPositionsAndSizes = {};
    cy.nodes().positions(function (i, ele) {
      currentPositionsAndSizes[ele.id()] = {
        width: ele.width(),
        height: ele.height(),
        x: ele.position("x"),
        y: ele.position("y")
      };
      var data = nodesData[ele.id()];
      ele._private.data.width = data.width;
      ele._private.data.height = data.height;
      return {
        x: data.x,
        y: data.y
      };
    });

    return currentPositionsAndSizes;
  }

  var secondTimeOpts = {
    layoutBy: null,
    animate: false,
    fisheye: false
  };

  function doIt(func) {
    return function (args) {
      var result = {};
      var nodes = getEles(args.nodes);
      if (args.firstTime) {
        result.oldData = getNodePositionsAndSizes();
        result.nodes = func.indexOf("All") > 0 ? cy[func](args.options) : nodes[func](args.options);
      } else {
        result.oldData = getNodePositionsAndSizes();
        result.nodes = func.indexOf("All") > 0 ? cy[func](secondTimeOpts) : cy.collection(nodes)[func](secondTimeOpts);
        returnToPositionsAndSizes(args.oldData);
      }

      return result;
    };
  }

  var actions = ["collapse", "collapseRecursively", "collapseAll", "expand", "expandRecursively", "expandAll"];

  for (var i = 0; i < actions.length; i++) {
    ur.action(actions[i], doIt(actions[i]), doIt(actions[(i + 3) % 6]));
  }

};

},{}]},{},[6])(6)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2VsZW1lbnRVdGlsaXRpZXMuanMiLCJzcmMvZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvdW5kb1JlZG9VdGlsaXRpZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNubUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBib3VuZGluZ0JveFV0aWxpdGllcyA9IHtcbiAgZXF1YWxCb3VuZGluZ0JveGVzOiBmdW5jdGlvbihiYjEsIGJiMil7XG4gICAgICByZXR1cm4gYmIxLngxID09IGJiMi54MSAmJiBiYjEueDIgPT0gYmIyLngyICYmIGJiMS55MSA9PSBiYjIueTEgJiYgYmIxLnkyID09IGJiMi55MjtcbiAgfSxcbiAgZ2V0VW5pb246IGZ1bmN0aW9uKGJiMSwgYmIyKXtcbiAgICAgIHZhciB1bmlvbiA9IHtcbiAgICAgIHgxOiBNYXRoLm1pbihiYjEueDEsIGJiMi54MSksXG4gICAgICB4MjogTWF0aC5tYXgoYmIxLngyLCBiYjIueDIpLFxuICAgICAgeTE6IE1hdGgubWluKGJiMS55MSwgYmIyLnkxKSxcbiAgICAgIHkyOiBNYXRoLm1heChiYjEueTIsIGJiMi55MiksXG4gICAgfTtcblxuICAgIHVuaW9uLncgPSB1bmlvbi54MiAtIHVuaW9uLngxO1xuICAgIHVuaW9uLmggPSB1bmlvbi55MiAtIHVuaW9uLnkxO1xuXG4gICAgcmV0dXJuIHVuaW9uO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJvdW5kaW5nQm94VXRpbGl0aWVzOyIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxudmFyIGVsZW1lbnRVdGlsaXRpZXM7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICB2YXIgZm4gPSBwYXJhbXM7XHJcblxyXG4gIHZhciBlTW91c2VPdmVyLCBlTW91c2VPdXQsIGVQb3NpdGlvbiwgZVJlbW92ZSwgZVRhcCwgZVpvb20sIGVBZGQsIGVGcmVlO1xyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyIG9wdHMgPSBwYXJhbXM7XHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gdGhpcztcclxuICAgICAgdmFyIGN5ID0gdGhpcy5jeXRvc2NhcGUoJ2dldCcpO1xyXG4gICAgICB2YXIgJGNhbnZhcyA9ICQoJzxjYW52YXM+PC9jYW52YXM+Jyk7XHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XHJcblxyXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcclxuXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICRjb250YWluZXIud2lkdGgoKSlcclxuICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAndG9wJzogMCxcclxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxyXG4gICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcclxuXHJcbiAgICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICd0b3AnOiAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCksXHJcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgO1xyXG5cclxuICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYoY3kpe1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIDApO1xyXG5cclxuICAgICAgfSwgMjUwKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgX3NpemVDYW52YXMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgJCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3lleHBhbmRjb2xsYXBzZScpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZXhwYW5kY29sbGFwc2UnKS5vcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gY2xlYXJEcmF3cyhrZWVwRXhwYW5kQ3Vlcykge1xyXG5cclxuICAgICAgICB2YXIgdyA9ICRjb250YWluZXIud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcblxyXG4gICAgICAgIGlmIChrZWVwRXhwYW5kQ3Vlcykge1xyXG4gICAgICAgICAgdmFyIGNvbGxhcHNlZE5vZGVzID0gY3kubm9kZXMoJ1tleHBhbmRlZC1jb2xsYXBzZWQ9XCJjb2xsYXBzZWRcIl0nKTtcclxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sbGFwc2VkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgZHJhd0V4cGFuZENvbGxhcHNlQ3VlKGNvbGxhcHNlZE5vZGVzW2ldKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIGNsZWFyTm9kZURyYXcobm9kZSkge1xyXG5cclxuICAgICAgICB2YXIgeCA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYO1xyXG4gICAgICAgIHZhciB5ID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFk7XHJcbiAgICAgICAgdmFyIHMgPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemU7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcpID09PSAnY29sbGFwc2VkJykge1xyXG4gICAgICAgICAgZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguY2xlYXJSZWN0KHgsIHksIHMsIHMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSkge1xyXG4gICAgICAgIHZhciBjeSA9IG5vZGUuY3koKTtcclxuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgICAgIHZhciBoYXNDaGlsZHJlbiA9IGNoaWxkcmVuICE9IG51bGwgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICAgICAgICAvL2NoZWNrIGlmIHRoZSBleHBhbmQgb3IgY29sbGFwc2UgY3VlIGlzIHRvIGJlIGRyYXduXHJcbiAgICAgICAgaWYgKCFoYXNDaGlsZHJlbiAmJiBjb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZXhwYW5kZWRPcmNvbGxhcHNlZCA9IG5vZGUuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJyk7XHJcblxyXG4gICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xyXG4gICAgICAgIHZhciByZWN0U2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNpemU7XHJcbiAgICAgICAgdmFyIGxpbmVTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU7XHJcbiAgICAgICAgdmFyIGRpZmY7XHJcblxyXG4gICAgICAgIHJlY3RTaXplID0gcmVjdFNpemUgKiBjeS56b29tKCk7XHJcbiAgICAgICAgbGluZVNpemUgPSBsaW5lU2l6ZSAqIGN5Lnpvb20oKTtcclxuICAgICAgICBkaWZmID0gKHJlY3RTaXplIC0gbGluZVNpemUpIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VFbmRYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUVuZFk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVjdFNpemU7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclg7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uID09PSAndG9wLWxlZnQnKSB7XHJcbiAgICAgICAgICB2YXIgcCA9IG5vZGUucmVuZGVyZWRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgdmFyIHcgPSBub2RlLnJlbmRlcmVkT3V0ZXJXaWR0aCgpO1xyXG4gICAgICAgICAgdmFyIGggPSBub2RlLnJlbmRlcmVkT3V0ZXJIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgICBleHBhbmRjb2xsYXBzZUNlbnRlclggPSBwLnggLSB3IC8gMiAtIHJlY3RTaXplIC8gNCArIHJlY3RTaXplIC8gMjtcclxuICAgICAgICAgIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSA9IHAueSAtIGggLyAyIC0gcmVjdFNpemUgLyA0ICsgcmVjdFNpemUgLyAyO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgY3VlQ2VudGVyID0gdHlwZW9mIG9wdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbi5jYWxsKHRoaXMsIG5vZGUpIDogb3B0aW9uO1xyXG4gICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyID0gZWxlbWVudFV0aWxpdGllcy5jb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKGN1ZUNlbnRlcik7XHJcblxyXG4gICAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJYID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueDtcclxuICAgICAgICAgIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWSAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZUVuZFggPSBleHBhbmRjb2xsYXBzZVN0YXJ0WCArIHJlY3RTaXplO1xyXG4gICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemU7XHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VSZWN0U2l6ZSA9IHJlY3RTaXplO1xyXG5cclxuICAgICAgICAvLyBEcmF3IGV4cGFuZC9jb2xsYXBzZSBjdWUgaWYgc3BlY2lmaWVkIHVzZSBpbWFnZSBlbHNlIGRyYXcgaXRcclxuICAgICAgICBpZiAoZXhwYW5kZWRPcmNvbGxhcHNlZCA9PT0gJ2V4cGFuZGVkJyAmJiBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UpIHtcclxuICAgICAgICAgIHZhciBpbWc9bmV3IEltYWdlKCk7XHJcbiAgICAgICAgICBpbWcuc3JjID0gb3B0aW9ucygpLmV4cGFuZEN1ZUltYWdlO1xyXG4gICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChleHBhbmRlZE9yY29sbGFwc2VkID09PSAnY29sbGFwc2VkJyAmJiBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSkge1xyXG4gICAgICAgICAgdmFyIGltZz1uZXcgSW1hZ2UoKTtcclxuICAgICAgICAgIGltZy5zcmMgPSBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZTtcclxuICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCBleHBhbmRjb2xsYXBzZUNlbnRlclgsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSwgcmVjdFNpemUsIHJlY3RTaXplKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICB2YXIgb2xkRmlsbFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcclxuICAgICAgICAgIHZhciBvbGRXaWR0aCA9IGN0eC5saW5lV2lkdGg7XHJcbiAgICAgICAgICB2YXIgb2xkU3Ryb2tlU3R5bGUgPSBjdHguc3Ryb2tlU3R5bGU7XHJcblxyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgICBjdHguZWxsaXBzZShleHBhbmRjb2xsYXBzZUNlbnRlclgsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSwgcmVjdFNpemUgLyAyLCByZWN0U2l6ZSAvIDIsIDAsIDAsIDIgKiBNYXRoLlBJKTtcclxuICAgICAgICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwid2hpdGVcIjtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSAyLjYgKiBjeS56b29tKCk7XHJcblxyXG4gICAgICAgICAgY3R4Lm1vdmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcclxuICAgICAgICAgIGN0eC5saW5lVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyBsaW5lU2l6ZSArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcclxuXHJcbiAgICAgICAgICBpZiAoZXhwYW5kZWRPcmNvbGxhcHNlZCA9PSAnY29sbGFwc2VkJykge1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUgPSBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAkY29udGFpbmVyLmN5dG9zY2FwZShmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGN5ID0gdGhpcztcclxuICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG5cclxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIGN5Lm9uKCdtb3VzZW92ZXInLCAnbm9kZScsIGVNb3VzZU92ZXIgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIC8vIHJlbW92ZSBvbGQgaGFuZGxlXHJcbiAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG5cclxuICAgICAgICAgIC8vIGFkZCBuZXcgaGFuZGxlXHJcbiAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSk7XHJcblxyXG4gICAgICAgICAgdmFyIGxhc3RQb3NpdGlvbiA9IHt9O1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ21vdXNlb3V0IHRhcGRyYWdvdXQnLCAnbm9kZScsIGVNb3VzZU91dCA9IGZ1bmN0aW9uIChlKSB7XHJcblxyXG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XHJcbiAgICAgICAgICBjbGVhck5vZGVEcmF3KG5vZGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCdhZGQnLCAnbm9kZScsIGVBZGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XHJcbiAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ2ZyZWUnLCAnbm9kZScsIGVGcmVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciB1cjtcclxuICAgICAgICBjeS5vbigndGFwJywgJ25vZGUnLCBlVGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WDtcclxuICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFk7XHJcbiAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplO1xyXG4gICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcclxuICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSA9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemU7XHJcblxyXG4gICAgICAgICAgdmFyIGN5UmVuZGVyZWRQb3NYID0gZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uLng7XHJcbiAgICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1kgPSBldmVudC5jeVJlbmRlcmVkUG9zaXRpb24ueTtcclxuICAgICAgICAgIHZhciBmYWN0b3IgPSAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XHJcblxyXG4gICAgICAgICAgaWYgKGN5UmVuZGVyZWRQb3NYID49IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggLSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuICAgICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1ggPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuICAgICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWSA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3Rvcikge1xyXG4gICAgICAgICAgICBpZihvcHRzLnVuZG9hYmxlICYmICF1cilcclxuICAgICAgICAgICAgICB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZihub2RlLmlzQ29sbGFwc2libGUoKSlcclxuICAgICAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSlcclxuICAgICAgICAgICAgICAgIHVyLmRvKFwiY29sbGFwc2VcIiwge1xyXG4gICAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcclxuICAgICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbm9kZS5jb2xsYXBzZShvcHRzKTtcclxuICAgICAgICAgICAgZWxzZSBpZihub2RlLmlzRXhwYW5kYWJsZSgpKVxyXG4gICAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKVxyXG4gICAgICAgICAgICAgICAgdXIuZG8oXCJleHBhbmRcIiwge1xyXG4gICAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcclxuICAgICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbm9kZS5leHBhbmQob3B0cyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgJGNvbnRhaW5lci5kYXRhKCdjeWV4cGFuZGNvbGxhcHNlJywgZGF0YSk7XHJcbiAgICB9LFxyXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGN5ID0gdGhpcy5jeXRvc2NhcGUoJ2dldCcpO1xyXG4gICAgICAgIGN5Lm9mZignbW91c2VvdmVyJywgJ25vZGUnLCBlTW91c2VPdmVyKVxyXG4gICAgICAgICAgLm9mZignbW91c2VvdXQgdGFwZHJhZ291dCcsICdub2RlJywgZU1vdXNlT3V0KVxyXG4gICAgICAgICAgLm9mZigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbilcclxuICAgICAgICAgIC5vZmYoJ3JlbW92ZScsICdub2RlJywgZVJlbW92ZSlcclxuICAgICAgICAgIC5vZmYoJ3RhcCcsICdub2RlJywgZVRhcClcclxuICAgICAgICAgIC5vZmYoJ2FkZCcsICdub2RlJywgZUFkZClcclxuICAgICAgICAgIC5vZmYoJ2ZyZWUnLCAnbm9kZScsIGVGcmVlKTtcclxuXHJcbiAgICAgICAgY3kudW5iaW5kKFwiem9vbSBwYW5cIiwgZVpvb20pO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGlmIChmdW5jdGlvbnNbZm5dKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb25zW2ZuXS5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb25zLmluaXQuYXBwbHkoJChjeS5jb250YWluZXIoKSksIGFyZ3VtZW50cyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQuZXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZXhwYW5kLWNvbGxhcHNlJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gJCh0aGlzKTtcclxufTtcclxuIiwidmFyIGRlYm91bmNlID0gKGZ1bmN0aW9uICgpIHtcclxuICAvKipcclxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XHJcbiAgICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxyXG4gICAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XHJcbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cclxuICAgKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXHJcbiAgICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cclxuICAgKi9cclxuICAvKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xyXG4gIHZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XHJcblxyXG4gIC8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXHJcbiAgdmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxyXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcclxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBEYXRlXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcclxuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XHJcbiAgICogfSwgXy5ub3coKSk7XHJcbiAgICogLy8gPT4gbG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxyXG4gICAqL1xyXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxyXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xyXG4gICAqIGludm9rZWQuIFRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gY29tZXMgd2l0aCBhIGBjYW5jZWxgIG1ldGhvZCB0byBjYW5jZWxcclxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXHJcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqIFN1YnNlcXVlbnQgY2FsbHMgdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdFxyXG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxyXG4gICAqXHJcbiAgICogKipOb3RlOioqIElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAsIGBmdW5jYCBpcyBpbnZva2VkXHJcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xyXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKlxyXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXHJcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBGdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZVxyXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxyXG4gICAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XHJcbiAgICpcclxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXHJcbiAgICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xyXG4gICAqICAgJ2xlYWRpbmcnOiB0cnVlLFxyXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXHJcbiAgICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xyXG4gICAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XHJcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxyXG4gICAqIHZhciB0b2RvQ2hhbmdlcyA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDEwMDApO1xyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscy50b2RvLCB0b2RvQ2hhbmdlcyk7XHJcbiAgICpcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcclxuICAgKiAgIGlmIChfLmZpbmQoY2hhbmdlcywgeyAndXNlcic6ICd0b2RvJywgJ3R5cGUnOiAnZGVsZXRlJ30pKSB7XHJcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xyXG4gICAqICAgfVxyXG4gICAqIH0sIFsnZGVsZXRlJ10pO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYXQgc29tZSBwb2ludCBgbW9kZWxzLnRvZG9gIGlzIGNoYW5nZWRcclxuICAgKiBtb2RlbHMudG9kby5jb21wbGV0ZWQgPSB0cnVlO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYmVmb3JlIDEgc2Vjb25kIGhhcyBwYXNzZWQgYG1vZGVscy50b2RvYCBpcyBkZWxldGVkXHJcbiAgICogLy8gd2hpY2ggY2FuY2VscyB0aGUgZGVib3VuY2VkIGB0b2RvQ2hhbmdlc2AgY2FsbFxyXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcclxuICAgKi9cclxuICBmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XHJcbiAgICB2YXIgYXJncyxcclxuICAgICAgICAgICAgbWF4VGltZW91dElkLFxyXG4gICAgICAgICAgICByZXN1bHQsXHJcbiAgICAgICAgICAgIHN0YW1wLFxyXG4gICAgICAgICAgICB0aGlzQXJnLFxyXG4gICAgICAgICAgICB0aW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcclxuICAgICAgICAgICAgbGFzdENhbGxlZCA9IDAsXHJcbiAgICAgICAgICAgIG1heFdhaXQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xyXG5cclxuICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcclxuICAgIH1cclxuICAgIHdhaXQgPSB3YWl0IDwgMCA/IDAgOiAoK3dhaXQgfHwgMCk7XHJcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xyXG4gICAgICB2YXIgbGVhZGluZyA9IHRydWU7XHJcbiAgICAgIHRyYWlsaW5nID0gZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XHJcbiAgICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcclxuICAgICAgbWF4V2FpdCA9ICdtYXhXYWl0JyBpbiBvcHRpb25zICYmIG5hdGl2ZU1heCgrb3B0aW9ucy5tYXhXYWl0IHx8IDAsIHdhaXQpO1xyXG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcclxuICAgICAgaWYgKHRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBsYXN0Q2FsbGVkID0gMDtcclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlKGlzQ2FsbGVkLCBpZCkge1xyXG4gICAgICBpZiAoaWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgICB9XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVsYXllZCgpIHtcclxuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93KCkgLSBzdGFtcCk7XHJcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XHJcbiAgICAgICAgY29tcGxldGUodHJhaWxpbmdDYWxsLCBtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1heERlbGF5ZWQoKSB7XHJcbiAgICAgIGNvbXBsZXRlKHRyYWlsaW5nLCB0aW1lb3V0SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlYm91bmNlZCgpIHtcclxuICAgICAgYXJncyA9IGFyZ3VtZW50cztcclxuICAgICAgc3RhbXAgPSBub3coKTtcclxuICAgICAgdGhpc0FyZyA9IHRoaXM7XHJcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xyXG5cclxuICAgICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXHJcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XHJcblxyXG4gICAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XHJcbiAgICAgICAgaXNDYWxsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcclxuICAgIHJldHVybiBkZWJvdW5jZWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxyXG4gICAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IExhbmdcclxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCh7fSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdChbMSwgMiwgM10pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoMSk7XHJcbiAgICogLy8gPT4gZmFsc2VcclxuICAgKi9cclxuICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cclxuICAgIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxyXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XHJcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGRlYm91bmNlO1xyXG5cclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7IiwiZnVuY3Rpb24gZWxlbWVudFV0aWxpdGllcyhjeSkge1xyXG4gcmV0dXJuIHtcclxuICBtb3ZlTm9kZXM6IGZ1bmN0aW9uIChwb3NpdGlvbkRpZmYsIG5vZGVzLCBub3RDYWxjVG9wTW9zdE5vZGVzKSB7XHJcbiAgICB2YXIgdG9wTW9zdE5vZGVzID0gbm90Q2FsY1RvcE1vc3ROb2RlcyA/IG5vZGVzIDogdGhpcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3BNb3N0Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSB0b3BNb3N0Tm9kZXNbaV07XHJcbiAgICAgIHZhciBvbGRYID0gbm9kZS5wb3NpdGlvbihcInhcIik7XHJcbiAgICAgIHZhciBvbGRZID0gbm9kZS5wb3NpdGlvbihcInlcIik7XHJcbiAgICAgIG5vZGUucG9zaXRpb24oe1xyXG4gICAgICAgIHg6IG9sZFggKyBwb3NpdGlvbkRpZmYueCxcclxuICAgICAgICB5OiBvbGRZICsgcG9zaXRpb25EaWZmLnlcclxuICAgICAgfSk7XHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgICAgdGhpcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBjaGlsZHJlbiwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZXRUb3BNb3N0Tm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICB2YXIgbm9kZXNNYXAgPSB7fTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcclxuICAgICAgd2hpbGUgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKG5vZGVzTWFwW3BhcmVudC5pZCgpXSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcm9vdHM7XHJcbiAgfSxcclxuICByZWFycmFuZ2U6IGZ1bmN0aW9uIChsYXlvdXRCeSkge1xyXG4gICAgaWYgKHR5cGVvZiBsYXlvdXRCeSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIGxheW91dEJ5KCk7XHJcbiAgICB9IGVsc2UgaWYgKGxheW91dEJ5ICE9IG51bGwpIHtcclxuICAgICAgY3kubGF5b3V0KGxheW91dEJ5KTtcclxuICAgIH1cclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb246IGZ1bmN0aW9uIChtb2RlbFBvc2l0aW9uKSB7XHJcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcclxuICAgIHZhciB5ID0gbW9kZWxQb3NpdGlvbi55ICogem9vbSArIHBhbi55O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IHgsXHJcbiAgICAgIHk6IHlcclxuICAgIH07XHJcbiAgfVxyXG4gfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JvdW5kaW5nQm94VXRpbGl0aWVzJyk7XHJcblxyXG4vLyBFeHBhbmQgY29sbGFwc2UgdXRpbGl0aWVzXHJcbmZ1bmN0aW9uIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKGN5KSB7XHJcbnZhciBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJykoY3kpO1xyXG5yZXR1cm4ge1xyXG4gIC8vdGhlIG51bWJlciBvZiBub2RlcyBtb3ZpbmcgYW5pbWF0ZWRseSBhZnRlciBleHBhbmQgb3BlcmF0aW9uXHJcbiAgYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudDogMCxcclxuICAvL0EgZnVudGlvbiBiYXNpY2x5IGV4cGFuZGluZyBhIG5vZGUgaXQgaXMgdG8gYmUgY2FsbGVkIHdoZW4gYSBub2RlIGlzIGV4cGFuZGVkIGFueXdheVxyXG4gIGV4cGFuZE5vZGVCYXNlRnVuY3Rpb246IGZ1bmN0aW9uIChub2RlLCB0cmlnZ2VyTGF5b3V0LCBzaW5nbGUsIGxheW91dEJ5KSB7Ly8qLy9cclxuICAgIC8vY2hlY2sgaG93IHRoZSBwb3NpdGlvbiBvZiB0aGUgbm9kZSBpcyBjaGFuZ2VkXHJcbiAgICB2YXIgcG9zaXRpb25EaWZmID0ge1xyXG4gICAgICB4OiBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpLngsXHJcbiAgICAgIHk6IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykueVxyXG4gICAgfTtcclxuXHJcbiAgICBub2RlLnJlbW92ZURhdGEoXCJpbmZvTGFiZWxcIik7XHJcbiAgICBub2RlLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcsICdleHBhbmRlZCcpO1xyXG5cclxuICAgIG5vZGUudHJpZ2dlcihcImJlZm9yZUV4cGFuZFwiKTtcclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi5yZXN0b3JlKCk7XHJcbiAgICB0aGlzLnJlcGFpckVkZ2VzKG5vZGUpO1xyXG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gbnVsbDtcclxuICAgIG5vZGUudHJpZ2dlcihcImFmdGVyRXhwYW5kXCIpO1xyXG5cclxuXHJcbiAgICBlbGVtZW50VXRpbGl0aWVzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIG5vZGUuY2hpbGRyZW4oKSk7XHJcbiAgICBub2RlLnJlbW92ZURhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpO1xyXG5cclxuICAgIGlmIChzaW5nbGUpXHJcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKGxheW91dEJ5KTtcclxuICAgIC8vIHJlZnJlc2hQYWRkaW5ncygpO1xyXG4gICAvKiBpZiAodHJpZ2dlckxheW91dClcclxuICAgICAgZWxlbWVudFV0aWxpdGllcy5yZWFycmFuZ2UobGF5b3V0QnkpOyovXHJcbiAgfSxcclxuICBzaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICBub2Rlcy5kYXRhKFwiY29sbGFwc2VcIiwgdHJ1ZSk7XHJcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBDb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyXHJcbiAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKHJvb3QpO1xyXG4gICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBVcGRhdGUgdGhlIHN0eWxlXHJcbiAgICBjeS5zdHlsZSgpLnVwZGF0ZSgpO1xyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkgey8vKi8vXHJcbiAgICBub2Rlcy5kYXRhKFwiZXhwYW5kXCIsIHRydWUpO1xyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24ocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xyXG4gICAgaWYgKG5vZGVzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG4gICAgfVxyXG4gICAgdmFyIG9ycGhhbnM7XHJcbiAgICBvcnBoYW5zID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgdmFyIGV4cGFuZFN0YWNrID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ycGhhbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSBvcnBoYW5zW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24ocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBleHBhbmRTdGFjaztcclxuICB9LFxyXG4gIGVuZE9wZXJhdGlvbjogZnVuY3Rpb24gKGxheW91dEJ5KSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjeS5yZWFkeShmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgZXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICB2YXIgZXhwYW5kZWRTdGFjayA9IHRoaXMuc2ltcGxlRXhwYW5kQWxsTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XHJcblxyXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSk7XHJcblxyXG4gICAgLy9lbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGV4cGFuZGVkU3RhY2s7XHJcbiAgfSxcclxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICBleHBhbmRTdGFjay5wdXNoKHJvb3QpO1xyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24obm9kZSwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vRXhwYW5kIHRoZSBnaXZlbiBub2RlcyBwZXJmb3JtIGluY3JlbWVudGFsIGxheW91dCBhZnRlciBleHBhbmRhdGlvblxyXG4gIGV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShub2Rlc1swXSwgb3B0aW9ucy5maXNoZXllLCBvcHRpb25zLmFuaW1hdGUsIG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSk7XHJcblxyXG4gICAgICAvL2VsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKG9wdGlvbnMubGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlcyB0aGVuIG1ha2UgaW5jcmVtZW50YWwgbGF5b3V0XHJcbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xyXG4gICAgdGhpcy5zaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXMobm9kZXMsIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnkpO1xyXG4gICAgLy9lbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcclxuICBjb2xsYXBzZUJvdHRvbVVwOiBmdW5jdGlvbiAocm9vdCkgey8vKi8vXHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChub2RlKTtcclxuICAgIH1cclxuICAgIC8vSWYgdGhlIHJvb3QgaXMgYSBjb21wb3VuZCBub2RlIHRvIGJlIGNvbGxhcHNlZCB0aGVuIGNvbGxhcHNlIGl0XHJcbiAgICBpZiAocm9vdC5kYXRhKFwiY29sbGFwc2VcIikgJiYgcm9vdC5jaGlsZHJlbigpLmxlbmd0aCA+IDApIHtcclxuICAgICAgdGhpcy5zaW1wbGVDb2xsYXBzZU5vZGUocm9vdCk7XHJcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImNvbGxhcHNlXCIpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9leHBhbmQgdGhlIG5vZGVzIGluIHRvcCBkb3duIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcclxuICBleHBhbmRUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xyXG4gICAgaWYgKHJvb3QuZGF0YShcImV4cGFuZFwiKSAmJiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgICByb290LnJlbW92ZURhdGEoXCJleHBhbmRcIik7XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihub2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIGV4cGFuZE5vZGU6IGZ1bmN0aW9uIChub2RlLCBmaXNoZXllLCBhbmltYXRlLCBsYXlvdXRCeSkge1xyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kTm9kZShub2RlLCBmaXNoZXllLCB0cnVlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcblxyXG4gICAgICAvKlxyXG4gICAgICAgKiByZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgICAqL1xyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIGNvbnZlcnRUb01vZGVsUG9zaXRpb246IGZ1bmN0aW9uIChyZW5kZXJlZFBvc2l0aW9uKSB7XHJcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICB2YXIgeCA9IChyZW5kZXJlZFBvc2l0aW9uLnggLSBwYW4ueCkgLyB6b29tO1xyXG4gICAgdmFyIHkgPSAocmVuZGVyZWRQb3NpdGlvbi55IC0gcGFuLnkpIC8gem9vbTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB4LFxyXG4gICAgICB5OiB5XHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgLypcclxuICAgKlxyXG4gICAqIFRoaXMgbWV0aG9kIGV4cGFuZHMgdGhlIGdpdmVuIG5vZGVcclxuICAgKiB3aXRob3V0IG1ha2luZyBpbmNyZW1lbnRhbCBsYXlvdXRcclxuICAgKiBhZnRlciBleHBhbmQgb3BlcmF0aW9uIGl0IHdpbGwgYmUgc2ltcGx5XHJcbiAgICogdXNlZCB0byB1bmRvIHRoZSBjb2xsYXBzZSBvcGVyYXRpb25cclxuICAgKi9cclxuICBzaW1wbGVFeHBhbmROb2RlOiBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpIHsvLyovL1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgXHJcbiAgICBpZiggIWFuaW1hdGUgKSB7XHJcbiAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgY29tbW9uRXhwYW5kT3BlcmF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7XHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG5cclxuICAgICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncpO1xyXG4gICAgICAgIG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmgpO1xyXG5cclxuICAgICAgICBzZWxmLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgbm9kZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIXNpbmdsZU5vdFNpbXBsZSB8fCAhYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZSwgc2luZ2xlTm90U2ltcGxlLCBzaW5nbGVOb3RTaW1wbGUsIGxheW91dEJ5KTsgLy8qKioqKlxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZSk7XHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSAmJiBzaW5nbGVOb3RTaW1wbGUpIHtcclxuICAgICAgICB2YXIgdG9wTGVmdFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiAwLCB5OiAwfSk7XHJcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XHJcbiAgICAgICAgdmFyIHBhZGRpbmcgPSA4MDtcclxuICAgICAgICB2YXIgYmIgPSB7XHJcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB4MjogYm90dG9tUmlnaHRQb3NpdGlvbi54LFxyXG4gICAgICAgICAgeTE6IHRvcExlZnRQb3NpdGlvbi55LFxyXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBub2RlQkIgPSB7XHJcbiAgICAgICAgICB4MTogbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncgLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHgyOiBub2RlLnBvc2l0aW9uKCd4JykgKyBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykudyAvIDIgKyBwYWRkaW5nLFxyXG4gICAgICAgICAgeTE6IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oIC8gMiAtIHBhZGRpbmcsXHJcbiAgICAgICAgICB5Mjogbm9kZS5wb3NpdGlvbigneScpICsgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmggLyAyICsgcGFkZGluZ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciB1bmlvbkJCID0gYm91bmRpbmdCb3hVdGlsaXRpZXMuZ2V0VW5pb24obm9kZUJCLCBiYik7XHJcbiAgICAgICAgdmFyIGFuaW1hdGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoIWJvdW5kaW5nQm94VXRpbGl0aWVzLmVxdWFsQm91bmRpbmdCb3hlcyh1bmlvbkJCLCBiYikpIHtcclxuICAgICAgICAgIHZhciB2aWV3UG9ydCA9IGN5LmdldEZpdFZpZXdwb3J0KHVuaW9uQkIsIDEwKTtcclxuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgIGFuaW1hdGluZyA9IGFuaW1hdGU7XHJcbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICBjeS5hbmltYXRlKHtcclxuICAgICAgICAgICAgICBwYW46IHZpZXdQb3J0LnBhbixcclxuICAgICAgICAgICAgICB6b29tOiB2aWV3UG9ydC56b29tLFxyXG4gICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiAxMDAwXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN5Lnpvb20odmlld1BvcnQuem9vbSk7XHJcbiAgICAgICAgICAgIGN5LnBhbih2aWV3UG9ydC5wYW4pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWFuaW1hdGluZykge1xyXG4gICAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYoICFhbmltYXRlICkge1xyXG4gICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGUgd2l0aG91dCBtYWtpbmcgaW5jcmVtZW50YWwgbGF5b3V0XHJcbiAgc2ltcGxlQ29sbGFwc2VOb2RlOiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnLCB7XHJcbiAgICAgICAgeDogbm9kZS5wb3NpdGlvbigpLngsXHJcbiAgICAgICAgeTogbm9kZS5wb3NpdGlvbigpLnlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHc6IG5vZGUub3V0ZXJXaWR0aCgpLFxyXG4gICAgICAgIGg6IG5vZGUub3V0ZXJIZWlnaHQoKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5vZGUuY2hpbGRyZW4oKS51bnNlbGVjdCgpO1xyXG4gICAgICBub2RlLmNoaWxkcmVuKCkuY29ubmVjdGVkRWRnZXMoKS51bnNlbGVjdCgpO1xyXG5cclxuICAgICAgbm9kZS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnLCAnY29sbGFwc2VkJyk7XHJcblxyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcblxyXG4gICAgICBub2RlLnRyaWdnZXIoXCJiZWZvcmVDb2xsYXBzZVwiKTtcclxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4obm9kZSk7XHJcblxyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKG5vZGUsIG5vZGUpO1xyXG5cclxuICAgICAgbm9kZS50cmlnZ2VyKFwiYWZ0ZXJDb2xsYXBzZVwiKTtcclxuICAgICAgXHJcbiAgICAgIG5vZGUucG9zaXRpb24obm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKSk7XHJcblxyXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICBzdG9yZVdpZHRoSGVpZ2h0OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZSAhPSBudWxsKSB7XHJcbiAgICAgIG5vZGUuZGF0YSgneC1iZWZvcmUtZmlzaGV5ZScsIHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSkpO1xyXG4gICAgICBub2RlLmRhdGEoJ3ktYmVmb3JlLWZpc2hleWUnLCB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpKTtcclxuICAgICAgbm9kZS5kYXRhKCd3aWR0aC1iZWZvcmUtZmlzaGV5ZScsIG5vZGUub3V0ZXJXaWR0aCgpKTtcclxuICAgICAgbm9kZS5kYXRhKCdoZWlnaHQtYmVmb3JlLWZpc2hleWUnLCBub2RlLm91dGVySGVpZ2h0KCkpO1xyXG5cclxuICAgICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlLnBhcmVudCgpWzBdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9LFxyXG4gIGZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlTm90U2ltcGxlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5KSB7Ly8qLy9cclxuICAgIHZhciBzaWJsaW5ncyA9IHRoaXMuZ2V0U2libGluZ3Mobm9kZSk7XHJcblxyXG4gICAgdmFyIHhfYSA9IHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcbiAgICB2YXIgeV9hID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuXHJcbiAgICB2YXIgZF94X2xlZnQgPSBNYXRoLmFicygobm9kZS5kYXRhKCd3aWR0aC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XHJcbiAgICB2YXIgZF94X3JpZ2h0ID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeV91cHBlciA9IE1hdGguYWJzKChub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeV9sb3dlciA9IE1hdGguYWJzKChub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xyXG5cclxuICAgIHZhciBhYnNfZGlmZl9vbl94ID0gTWF0aC5hYnMobm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJykgLSB4X2EpO1xyXG4gICAgdmFyIGFic19kaWZmX29uX3kgPSBNYXRoLmFicyhub2RlLmRhdGEoJ3ktYmVmb3JlLWZpc2hleWUnKSAtIHlfYSk7XHJcblxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gTEVGVFxyXG4gICAgaWYgKG5vZGUuZGF0YSgneC1iZWZvcmUtZmlzaGV5ZScpID4geF9hKSB7XHJcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgKyBhYnNfZGlmZl9vbl94O1xyXG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgLSBhYnNfZGlmZl9vbl94O1xyXG4gICAgfVxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gUklHSFRcclxuICAgIGVsc2Uge1xyXG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0IC0gYWJzX2RpZmZfb25feDtcclxuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0ICsgYWJzX2RpZmZfb25feDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBVUFxyXG4gICAgaWYgKG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScpID4geV9hKSB7XHJcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciArIGFic19kaWZmX29uX3k7XHJcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciAtIGFic19kaWZmX29uX3k7XHJcbiAgICB9XHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBET1dOXHJcbiAgICBlbHNlIHtcclxuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyIC0gYWJzX2RpZmZfb25feTtcclxuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyICsgYWJzX2RpZmZfb25feTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgeFBvc0luUGFyZW50U2libGluZyA9IFtdO1xyXG4gICAgdmFyIHlQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHhQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnhQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XHJcbiAgICAgIHlQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnlQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgc2libGluZyA9IHNpYmxpbmdzW2ldO1xyXG5cclxuICAgICAgdmFyIHhfYiA9IHhQb3NJblBhcmVudFNpYmxpbmdbaV07XHJcbiAgICAgIHZhciB5X2IgPSB5UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xyXG5cclxuICAgICAgdmFyIHNsb3BlID0gKHlfYiAtIHlfYSkgLyAoeF9iIC0geF9hKTtcclxuXHJcbiAgICAgIHZhciBkX3ggPSAwO1xyXG4gICAgICB2YXIgZF95ID0gMDtcclxuICAgICAgdmFyIFRfeCA9IDA7XHJcbiAgICAgIHZhciBUX3kgPSAwO1xyXG5cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMRUZUXHJcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcclxuICAgICAgICBkX3ggPSBkX3hfbGVmdDtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFJJR0hUXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGRfeCA9IGRfeF9yaWdodDtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFVQUEVSIHNpZGVcclxuICAgICAgaWYgKHlfYSA+IHlfYikge1xyXG4gICAgICAgIGRfeSA9IGRfeV91cHBlcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExPV0VSIHNpZGVcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZF95ID0gZF95X2xvd2VyO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaXNGaW5pdGUoc2xvcGUpKSB7XHJcbiAgICAgICAgVF94ID0gTWF0aC5taW4oZF94LCAoZF95IC8gTWF0aC5hYnMoc2xvcGUpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzbG9wZSAhPT0gMCkge1xyXG4gICAgICAgIFRfeSA9IE1hdGgubWluKGRfeSwgKGRfeCAqIE1hdGguYWJzKHNsb3BlKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoeF9hID4geF9iKSB7XHJcbiAgICAgICAgVF94ID0gLTEgKiBUX3g7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcclxuICAgICAgICBUX3kgPSAtMSAqIFRfeTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKHNpYmxpbmcsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzaWJsaW5ncy5sZW5ndGggPT0gMCkge1xyXG4gICAgICB0aGlzLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIHRydWUsIGxheW91dEJ5KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZS5wYXJlbnQoKVswXSwgc2luZ2xlTm90U2ltcGxlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9LFxyXG4gIGdldFNpYmxpbmdzOiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgc2libGluZ3M7XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gPT0gbnVsbCkge1xyXG4gICAgICBzaWJsaW5ncyA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgdmFyIG9ycGhhbnMgPSBjeS5ub2RlcygpLm9ycGhhbnMoKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChvcnBoYW5zW2ldICE9IG5vZGUpIHtcclxuICAgICAgICAgIHNpYmxpbmdzID0gc2libGluZ3MuYWRkKG9ycGhhbnNbaV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2libGluZ3MgPSBub2RlLnNpYmxpbmdzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNpYmxpbmdzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBNb3ZlIG5vZGUgb3BlcmF0aW9uIHNwZWNpYWxpemVkIGZvciBmaXNoIGV5ZSB2aWV3IGV4cGFuZCBvcGVyYXRpb25cclxuICAgKiBNb3ZlcyB0aGUgbm9kZSBieSBtb3ZpbmcgaXRzIGRlc2NhbmRlbnRzLiBNb3ZlbWVudCBpcyBhbmltYXRlZCBpZiBzaW5nbGVOb3RTaW1wbGUgZmxhZyBpcyB0cnV0aHkuXHJcbiAgICovXHJcbiAgZmlzaEV5ZVZpZXdNb3ZlTm9kZTogZnVuY3Rpb24gKG5vZGUsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpIHsvLyovL1xyXG4gICAgdmFyIGNoaWxkcmVuTGlzdCA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICBpZiAoY2hpbGRyZW5MaXN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHZhciBuZXdQb3NpdGlvbiA9IHt4OiBub2RlLnBvc2l0aW9uKCd4JykgKyBUX3gsIHk6IG5vZGUucG9zaXRpb24oJ3knKSArIFRfeX07XHJcbiAgICAgIGlmICghc2luZ2xlTm90U2ltcGxlIHx8ICFhbmltYXRlKSB7XHJcbiAgICAgICAgbm9kZS5wb3NpdGlvbihuZXdQb3NpdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgdGhpcy5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50Kys7XHJcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcclxuICAgICAgICAgIHBvc2l0aW9uOiBuZXdQb3NpdGlvbixcclxuICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xyXG4gICAgICAgICAgICBpZiAoc2VsZi5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50ID4gMCB8fCBub2RlVG9FeHBhbmQuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJykgPT09ICdleHBhbmRlZCcpIHtcclxuXHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIHRydWUsIGxheW91dEJ5KTtcclxuXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgZHVyYXRpb246IDEwMDBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShjaGlsZHJlbkxpc3RbaV0sIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICB4UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XHJcbiAgICB2YXIgeF9hID0gMC4wO1xyXG5cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneCcpICsgKHBhcmVudC53aWR0aCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB4X2EgPSBub2RlLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHhfYTtcclxuICB9LFxyXG4gIHlQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuXHJcbiAgICB2YXIgeV9hID0gMC4wO1xyXG5cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHlfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneScpICsgKHBhcmVudC5oZWlnaHQoKSAvIDIpO1xyXG4gICAgfVxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeV9hID0gbm9kZS5wb3NpdGlvbigneScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB5X2E7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIG5vZGUgcGFyYW1ldGVyIGNhbGwgdGhpcyBtZXRob2RcclxuICAgKiB3aXRoIHRoZSBzYW1lIHJvb3QgcGFyYW1ldGVyLFxyXG4gICAqIHJlbW92ZSB0aGUgY2hpbGQgYW5kIGFkZCB0aGUgcmVtb3ZlZCBjaGlsZCB0byB0aGUgY29sbGFwc2VkY2hpbGRyZW4gZGF0YVxyXG4gICAqIG9mIHRoZSByb290IHRvIHJlc3RvcmUgdGhlbSBpbiB0aGUgY2FzZSBvZiBleHBhbmRhdGlvblxyXG4gICAqIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiBrZWVwcyB0aGUgbm9kZXMgdG8gcmVzdG9yZSB3aGVuIHRoZVxyXG4gICAqIHJvb3QgaXMgZXhwYW5kZWRcclxuICAgKi9cclxuICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xyXG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihjaGlsZCwgcm9vdCk7XHJcbiAgICAgIHZhciByZW1vdmVkQ2hpbGQgPSBjaGlsZC5yZW1vdmUoKTtcclxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZENoaWxkO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi51bmlvbihyZW1vdmVkQ2hpbGQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBpc01ldGFFZGdlOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICByZXR1cm4gZWRnZS5oYXNDbGFzcyhcIm1ldGFcIik7XHJcbiAgfSxcclxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciByZWxhdGVkTm9kZXMgPSBub2RlLmRlc2NlbmRhbnRzKCk7XHJcbiAgICB2YXIgZWRnZXMgPSByZWxhdGVkTm9kZXMuZWRnZXNXaXRoKGN5Lm5vZGVzKCkubm90KHJlbGF0ZWROb2Rlcy51bmlvbihub2RlKSkpO1xyXG4gICAgXHJcbiAgICB2YXIgcmVsYXRlZE5vZGVNYXAgPSB7fTtcclxuICAgIFxyXG4gICAgcmVsYXRlZE5vZGVzLmVhY2goZnVuY3Rpb24oaSwgZWxlKSB7XHJcbiAgICAgIHJlbGF0ZWROb2RlTWFwW2VsZS5pZCgpXSA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgc291cmNlID0gZWRnZS5zb3VyY2UoKTtcclxuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXRoaXMuaXNNZXRhRWRnZShlZGdlKSkgeyAvLyBpcyBvcmlnaW5hbFxyXG4gICAgICAgIHZhciBvcmlnaW5hbEVuZHNEYXRhID0ge1xyXG4gICAgICAgICAgc291cmNlOiBzb3VyY2UsXHJcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcIm1ldGFcIik7XHJcbiAgICAgICAgZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnLCBvcmlnaW5hbEVuZHNEYXRhKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgZWRnZS5tb3ZlKHtcclxuICAgICAgICB0YXJnZXQ6ICFyZWxhdGVkTm9kZU1hcFt0YXJnZXQuaWQoKV0gPyB0YXJnZXQuaWQoKSA6IG5vZGUuaWQoKSxcclxuICAgICAgICBzb3VyY2U6ICFyZWxhdGVkTm9kZU1hcFtzb3VyY2UuaWQoKV0gPyBzb3VyY2UuaWQoKSA6IG5vZGUuaWQoKVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9LFxyXG4gIGZpbmROZXdFbmQ6IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciBjdXJyZW50ID0gbm9kZTtcclxuICAgIFxyXG4gICAgd2hpbGUoICFjdXJyZW50Lmluc2lkZSgpICkge1xyXG4gICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQoKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgfSxcclxuICByZXBhaXJFZGdlczogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgdmFyIGNvbm5lY3RlZE1ldGFFZGdlcyA9IG5vZGUuY29ubmVjdGVkRWRnZXMoJy5tZXRhJyk7XHJcbiAgICBcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29ubmVjdGVkTWV0YUVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gY29ubmVjdGVkTWV0YUVkZ2VzW2ldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxFbmRzID0gZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnKTtcclxuICAgICAgdmFyIGN1cnJlbnRTcmNJZCA9IGVkZ2UuZGF0YSgnc291cmNlJyk7XHJcbiAgICAgIHZhciBjdXJyZW50VGd0SWQgPSBlZGdlLmRhdGEoJ3RhcmdldCcpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCBjdXJyZW50U3JjSWQgPT09IG5vZGUuaWQoKSApIHtcclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcclxuICAgICAgICAgIHNvdXJjZTogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy5zb3VyY2UpLmlkKClcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcclxuICAgICAgICAgIHRhcmdldDogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy50YXJnZXQpLmlkKClcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYgKCBlZGdlLmRhdGEoJ3NvdXJjZScpID09PSBvcmlnaW5hbEVuZHMuc291cmNlLmlkKCkgJiYgZWRnZS5kYXRhKCd0YXJnZXQnKSA9PT0gb3JpZ2luYWxFbmRzLnRhcmdldC5pZCgpICkge1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ21ldGEnKTtcclxuICAgICAgICBlZGdlLnJlbW92ZURhdGEoJ29yaWdpbmFsRW5kcycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKm5vZGUgaXMgYW4gb3V0ZXIgbm9kZSBvZiByb290XHJcbiAgIGlmIHJvb3QgaXMgbm90IGl0J3MgYW5jaGVzdG9yXHJcbiAgIGFuZCBpdCBpcyBub3QgdGhlIHJvb3QgaXRzZWxmKi9cclxuICBpc091dGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xyXG4gICAgdmFyIHRlbXAgPSBub2RlO1xyXG4gICAgd2hpbGUgKHRlbXAgIT0gbnVsbCkge1xyXG4gICAgICBpZiAodGVtcCA9PSByb290KSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG59XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzO1xyXG4iLCI7XHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSwgJCkge1xyXG5cclxuICAgIGlmICghY3l0b3NjYXBlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXHJcblxyXG4gICAgdmFyIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9leHBhbmRDb2xsYXBzZVV0aWxpdGllcycpO1xyXG4gICAgdmFyIHVuZG9SZWRvVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91bmRvUmVkb1V0aWxpdGllcycpO1xyXG4gICAgdmFyIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKTtcclxuICAgIHZhciBjdWVVdGlsaXRpZXMgPSByZXF1aXJlKFwiLi9jdWVVdGlsaXRpZXNcIik7XHJcblxyXG4gICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQncyBqdXN0IGxheW91dCBvcHRpb25zIG9yIHdob2xlIGxheW91dCBmdW5jdGlvbi4gQ2hvb3NlIHlvdXIgc2lkZSFcclxuICAgICAgZmlzaGV5ZTogdHJ1ZSwgLy8gd2hldGhlciB0byBwZXJmb3JtIGZpc2hleWUgdmlldyBhZnRlciBleHBhbmQvY29sbGFwc2UgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXHJcbiAgICAgIGFuaW1hdGU6IHRydWUsIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSBvbiBkcmF3aW5nIGNoYW5nZXMgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXHJcbiAgICAgIHJlYWR5OiBmdW5jdGlvbiAoKSB7IH0sIC8vIGNhbGxiYWNrIHdoZW4gZXhwYW5kL2NvbGxhcHNlIGluaXRpYWxpemVkXHJcbiAgICAgIHVuZG9hYmxlOiB0cnVlLCAvLyBhbmQgaWYgdW5kb1JlZG9FeHRlbnNpb24gZXhpc3RzLFxyXG5cclxuICAgICAgY3VlRW5hYmxlZDogdHJ1ZSwgLy8gV2hldGhlciBjdWVzIGFyZSBlbmFibGVkXHJcbiAgICAgIGV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb246ICd0b3AtbGVmdCcsIC8vIGRlZmF1bHQgY3VlIHBvc2l0aW9uIGlzIHRvcCBsZWZ0IHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHBlciBub2RlIHRvb1xyXG4gICAgICBleHBhbmRDb2xsYXBzZUN1ZVNpemU6IDEyLCAvLyBzaXplIG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVcclxuICAgICAgZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTogOCwgLy8gc2l6ZSBvZiBsaW5lcyB1c2VkIGZvciBkcmF3aW5nIHBsdXMtbWludXMgaWNvbnNcclxuICAgICAgZXhwYW5kQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgZXhwYW5kIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBleHBhbmQgY3VlXHJcbiAgICAgIGNvbGxhcHNlQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgY29sbGFwc2UgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGNvbGxhcHNlIGN1ZVxyXG4gICAgICBleHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5OiAxIC8vIHNlbnNpdGl2aXR5IG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVzXHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIHNldE9wdGlvbnMoZnJvbSkge1xyXG4gICAgICB2YXIgdGVtcE9wdHMgPSB7fTtcclxuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXHJcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuXHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBmcm9tKVxyXG4gICAgICAgIGlmICh0ZW1wT3B0cy5oYXNPd25Qcm9wZXJ0eShrZXkpKVxyXG4gICAgICAgICAgdGVtcE9wdHNba2V5XSA9IGZyb21ba2V5XTtcclxuICAgICAgcmV0dXJuIHRlbXBPcHRzO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBldmFsdWF0ZSBzb21lIHNwZWNpZmljIG9wdGlvbnMgaW4gY2FzZSBvZiB0aGV5IGFyZSBzcGVjaWZpZWQgYXMgZnVuY3Rpb25zIHRvIGJlIGR5bmFtaWNhbGx5IGNoYW5nZWRcclxuICAgIGZ1bmN0aW9uIGV2YWxPcHRpb25zKG9wdGlvbnMpIHtcclxuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcclxuICAgICAgdmFyIGZpc2hleWUgPSB0eXBlb2Ygb3B0aW9ucy5maXNoZXllID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5maXNoZXllLmNhbGwoKSA6IG9wdGlvbnMuZmlzaGV5ZTtcclxuICAgICAgXHJcbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XHJcbiAgICAgIG9wdGlvbnMuZmlzaGV5ZSA9IGZpc2hleWU7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIGN5LmV4cGFuZENvbGxhcHNlKClcclxuICAgIGN5dG9zY2FwZShcImNvcmVcIiwgXCJleHBhbmRDb2xsYXBzZVwiLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICBvcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIC8vIEFsbCBwYXJlbnQgbm9kZXMgYXJlIGV4cGFuZGVkIG9uIGxvYWRcclxuICAgICAgY3kubm9kZXMoJzpwYXJlbnQnKS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnLCAnZXhwYW5kZWQnKTtcclxuICAgICAgdW5kb1JlZG9VdGlsaXRpZXMoY3kpO1xyXG4gICAgICBcclxuICAgICAgaWYob3B0aW9ucy5jdWVFbmFibGVkKVxyXG4gICAgICAgIGN1ZVV0aWxpdGllcyhvcHRpb25zKTtcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGN1ZVV0aWxpdGllcyhcInVuYmluZFwiKTtcclxuXHJcblxyXG4gICAgICBvcHRpb25zLnJlYWR5KCk7XHJcblxyXG5cclxuICAgICAgcmV0dXJuIGN5O1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIHNldCBmdW5jdGlvbnNcclxuICAgIFxyXG4gICAgLy8gc2V0IGFsbCBvcHRpb25zIGF0IG9uY2VcclxuICAgIGN5dG9zY2FwZShcImNvcmVcIiwgXCJzZXRFeHBhbmRDb2xsYXBzZU9wdGlvbnNcIiwgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgb3B0aW9ucyA9IG9wdHM7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gc2V0IHRoZSBvcHRpb24gd2hvc2UgbmFtZSBpcyBnaXZlblxyXG4gICAgY3l0b3NjYXBlKFwiY29yZVwiLCBcInNldEV4cGFuZENvbGxhcHNlT3B0aW9uXCIsIGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xyXG4gICAgICBvcHRpb25zW25hbWVdID0gdmFsdWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2Uob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzZScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyh0aGlzLmN5KCkpLmNvbGxhcHNlR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmNvbGxhcHNlQWxsKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnY29sbGFwc2VSZWN1cnNpdmVseScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgIHJldHVybiBlbGVzLnVuaW9uKGVsZXMuZGVzY2VuZGFudHMoKSkuY29sbGFwc2UodGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmQob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdleHBhbmQnLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyh0aGlzLmN5KCkpLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmRBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdleHBhbmRSZWN1cnNpdmVseScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoKTtcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKHRoaXMuY3koKSkuZXhwYW5kQWxsTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIENvcmUgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gY3kuY29sbGFwc2VBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdjb2xsYXBzZUFsbCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgIHJldHVybiBjeS5jb2xsYXBzaWJsZU5vZGVzKCkuY29sbGFwc2VSZWN1cnNpdmVseSh0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBjeS5leHBhbmRBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdleHBhbmRBbGwnLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG4gICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICByZXR1cm4gY3kuZXhwYW5kYWJsZU5vZGVzKCkuZXhwYW5kUmVjdXJzaXZlbHkodGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gZWxlLmlzQ29sbGFwc2libGUoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2lzRXhwYW5kYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gKGVsZS5kYXRhKFwiZXhwYW5kZWQtY29sbGFwc2VkXCIpID09PSBcImNvbGxhcHNlZFwiKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZS5pc0V4cGFuZGFibGUoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2lzQ29sbGFwc2libGUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBlbGUgPSB0aGlzO1xyXG4gICAgICByZXR1cm4gIWVsZS5pc0V4cGFuZGFibGUoKSAmJiBlbGUuaXNQYXJlbnQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2VkKClcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzaWJsZU5vZGVzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuaXNDb2xsYXBzaWJsZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2V4cGFuZGFibGVOb2RlcycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIGVsZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmlzRXhwYW5kYWJsZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgLy8gZWxlcy5jb2xsYXBzZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb3JlJywgJ2NvbGxhcHNpYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmV4cGFuZGVkKClcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdleHBhbmRhYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5leHBhbmRhYmxlTm9kZXMoKTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWV4cGFuZC1jb2xsYXBzZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgalF1ZXJ5ICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgICByZWdpc3RlcihjeXRvc2NhcGUsIGpRdWVyeSk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3kpIHtcclxuICBpZiAoY3kudW5kb1JlZG8gPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIHVyID0gY3kudW5kb1JlZG8oe30sIHRydWUpO1xyXG5cclxuICBmdW5jdGlvbiBnZXRFbGVzKF9lbGVzKSB7XHJcbiAgICByZXR1cm4gKHR5cGVvZiBfZWxlcyA9PT0gXCJzdHJpbmdcIikgPyBjeS4kKF9lbGVzKSA6IF9lbGVzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Tm9kZVBvc2l0aW9uc0FuZFNpemVzKCkge1xyXG4gICAgdmFyIHBvc2l0aW9uc0FuZFNpemVzID0ge307XHJcbiAgICB2YXIgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVsZSA9IG5vZGVzW2ldO1xyXG4gICAgICBwb3NpdGlvbnNBbmRTaXplc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgd2lkdGg6IGVsZS53aWR0aCgpLFxyXG4gICAgICAgIGhlaWdodDogZWxlLmhlaWdodCgpLFxyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwb3NpdGlvbnNBbmRTaXplcztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJldHVyblRvUG9zaXRpb25zQW5kU2l6ZXMobm9kZXNEYXRhKSB7XHJcbiAgICB2YXIgY3VycmVudFBvc2l0aW9uc0FuZFNpemVzID0ge307XHJcbiAgICBjeS5ub2RlcygpLnBvc2l0aW9ucyhmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgd2lkdGg6IGVsZS53aWR0aCgpLFxyXG4gICAgICAgIGhlaWdodDogZWxlLmhlaWdodCgpLFxyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZGF0YSA9IG5vZGVzRGF0YVtlbGUuaWQoKV07XHJcbiAgICAgIGVsZS5fcHJpdmF0ZS5kYXRhLndpZHRoID0gZGF0YS53aWR0aDtcclxuICAgICAgZWxlLl9wcml2YXRlLmRhdGEuaGVpZ2h0ID0gZGF0YS5oZWlnaHQ7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogZGF0YS54LFxyXG4gICAgICAgIHk6IGRhdGEueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplcztcclxuICB9XHJcblxyXG4gIHZhciBzZWNvbmRUaW1lT3B0cyA9IHtcclxuICAgIGxheW91dEJ5OiBudWxsLFxyXG4gICAgYW5pbWF0ZTogZmFsc2UsXHJcbiAgICBmaXNoZXllOiBmYWxzZVxyXG4gIH07XHJcblxyXG4gIGZ1bmN0aW9uIGRvSXQoZnVuYykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgICAgdmFyIG5vZGVzID0gZ2V0RWxlcyhhcmdzLm5vZGVzKTtcclxuICAgICAgaWYgKGFyZ3MuZmlyc3RUaW1lKSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zQW5kU2l6ZXMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gY3lbZnVuY10oYXJncy5vcHRpb25zKSA6IG5vZGVzW2Z1bmNdKGFyZ3Mub3B0aW9ucyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zQW5kU2l6ZXMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gY3lbZnVuY10oc2Vjb25kVGltZU9wdHMpIDogY3kuY29sbGVjdGlvbihub2RlcylbZnVuY10oc2Vjb25kVGltZU9wdHMpO1xyXG4gICAgICAgIHJldHVyblRvUG9zaXRpb25zQW5kU2l6ZXMoYXJncy5vbGREYXRhKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB2YXIgYWN0aW9ucyA9IFtcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VSZWN1cnNpdmVseVwiLCBcImNvbGxhcHNlQWxsXCIsIFwiZXhwYW5kXCIsIFwiZXhwYW5kUmVjdXJzaXZlbHlcIiwgXCJleHBhbmRBbGxcIl07XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgdXIuYWN0aW9uKGFjdGlvbnNbaV0sIGRvSXQoYWN0aW9uc1tpXSksIGRvSXQoYWN0aW9uc1soaSArIDMpICUgNl0pKTtcclxuICB9XHJcblxyXG59O1xyXG4iXX0=
