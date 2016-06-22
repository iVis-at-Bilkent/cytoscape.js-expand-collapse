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

module.exports = function (params) {
  var fn = params;

  var eMouseOver, eMouseOut, ePosition, eRemove, eTap, eZoom;
  var functions = {
    init: function () {
      var self = this;
      var opts = params;
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

          clearNodeDraw(node);
        });

        cy.on('remove', 'node', eRemove = function () {
          var node = this;
          clearNodeDraw(node);
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
        cy.off('mouseover', 'node', eMouseOver)
          .off('mouseout tapdragout', 'node', eMouseOut)
          .off('position', 'node', ePosition)
          .off('remove', 'node', eRemove)
          .off('tap', 'node', eTap);

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
},{"./debounce":3}],3:[function(_dereq_,module,exports){
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
var elementUtilities = {
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
  rearrange: function (layoutBy) {//*//
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

module.exports = elementUtilities;

},{}],5:[function(_dereq_,module,exports){
var boundingBoxUtilities = _dereq_('./boundingBoxUtilities');
var elementUtilities = _dereq_('./elementUtilities');

// Expand collapse utilities
var expandCollapseUtilities = {
  edgesToRepair: null,
  //the number of nodes moving animatedly after expand operation
  animatedlyMovingNodeCount: 0,
  //This is a map which keeps the information of collapsed meta edges to handle them correctly
  collapsedMetaEdgesInfo: {},
  //This map keeps track of the meta levels of edges by their id's
  edgesMetaLevels: {},
  //This method changes source or target id of the collapsed edge data kept in the data of the node
  //with id of createdWhileBeingCollapsed
  alterSourceOrTargetOfCollapsedEdge: function (createdWhileBeingCollapsed, edgeId, sourceOrTarget) {//*//
    var node = cy.getElementById(createdWhileBeingCollapsed)[0];
    var edgesOfcollapsedChildren = node._private.data.edgesOfcollapsedChildren;
    for (var i = 0; i < edgesOfcollapsedChildren.length; i++) {
      var collapsedEdge = edgesOfcollapsedChildren[i];
      if (collapsedEdge._private.data.id == edgeId) {
        collapsedEdge._private.data[sourceOrTarget] = collapsedEdge._private.data.collapsedNodeBeforeBecamingMeta;
        break;
      }
    }
  },
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
    node._private.data.collapsedChildren.nodes().restore();
    this.repairEdgesOfCollapsedChildren(node);
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
      this.collapseBottomUp(root);
    }
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
  beginOperation: function () {
    this.edgesToRepair = cy.collection();
  },
  endOperation: function (layoutBy) {
    var self = this;
    cy.ready(function () {
      self.edgesToRepair.restore();
      for (var i = 0; i < self.edgesToRepair.length; i++) {
        var edge = self.edgesToRepair[i];
        if (self.edgesMetaLevels[edge.id()] == null || self.edgesMetaLevels[edge.id()] == 0) {
          edge.removeClass("meta");
        }
        else {
          edge.addClass("meta");
        }
      }
      this.edgesToRepair = cy.collection();
      elementUtilities.rearrange(layoutBy);
    });
  },
  expandAllNodes: function (nodes, options) {//*//
    this.beginOperation();
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
    this.beginOperation();
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
    this.beginOperation();
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
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        this.barrowEdgesOfcollapsedChildren(node, child);
      }

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
  /*
   * This method let the root parameter to barrow the edges connected to the
   * child node or any node inside child node if the any one the source and target
   * is an outer node of the root node in other word it create meta edges
   */
  barrowEdgesOfcollapsedChildren: function (root, childNode) {//*//
    var children = childNode.children();
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      this.barrowEdgesOfcollapsedChildren(root, child);
    }

    var edges = childNode.connectedEdges();
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var source = edge.data("source");
      var target = edge.data("target");
      var sourceNode = edge.source();
      var targetNode = edge.target();

      var newEdge =  {}; //jQuery.extend(true, {}, edge.jsons()[0]);
      for (var key in edge.jsons()[0])
        newEdge[key] = edge.jsons()[0][key];

      //Initilize the meta level of this edge if it is not initilized yet
      if (this.edgesMetaLevels[edge.id()] == null) {
        this.edgesMetaLevels[edge.id()] = 0;
      }

      /*If the edge is meta and has different source and targets then handle this case because if
       * the other end of this edge is removed because of the reason that it's parent is
       * being collapsed and this node is expanded before other end is still collapsed this causes
       * that this edge cannot be restored as one end node of it does not exists.
       * Create a collapsed meta edge info for this edge and add this info to collapsedMetaEdgesInfo
       * map. This info includes createdWhileBeingCollapsed(the node which is being collapsed),
       * otherEnd(the other end of this edge) and oldOwner(the owner of this edge which will become
       * an old owner after collapse operation)
       */
      if (this.edgesMetaLevels[edge.id()] != 0 && source != target) {
        var otherEnd = null;
        var oldOwner = null;
        if (source == childNode.id()) {
          otherEnd = target;
          oldOwner = source;
        }
        else if (target == childNode.id()) {
          otherEnd = source;
          oldOwner = target;
        }
        var info = {
          createdWhileBeingCollapsed: root.id(),
          otherEnd: otherEnd,
          oldOwner: oldOwner
        };
        if (this.collapsedMetaEdgesInfo[otherEnd] == null) {
          this.collapsedMetaEdgesInfo[otherEnd] = {};
        }
        if (this.collapsedMetaEdgesInfo[root.id()] == null) {
          this.collapsedMetaEdgesInfo[root.id()] = {};
        }
        //the information should be reachable by edge id and node id's
        this.collapsedMetaEdgesInfo[root.id()][otherEnd] = info;
        this.collapsedMetaEdgesInfo[otherEnd][root.id()] = info;
        this.collapsedMetaEdgesInfo[edge.id()] = info;
      }

      var removedEdge = edge.remove();
      //store the data of the original edge
      //to restore when the node is expanded
      if (root._private.data.edgesOfcollapsedChildren == null) {
        root._private.data.edgesOfcollapsedChildren = removedEdge;
      }
      else {
        root._private.data.edgesOfcollapsedChildren =
          root._private.data.edgesOfcollapsedChildren.union(removedEdge);
      }

      //Do not handle the inner edges
      if (!this.isOuterNode(sourceNode, root) && !this.isOuterNode(targetNode, root)) {
        continue;
      }

      //If the change source and/or target of the edge in the
      //case of they are equal to the id of the collapsed child
      if (source == childNode.id()) {
        source = root.id();
      }
      if (target == childNode.id()) {
        target = root.id();
      }

      //prepare the new edge by changing the older source and/or target
      newEdge.data.portsource = source;
      newEdge.data.porttarget = target;
      newEdge.data.source = source;
      newEdge.data.target = target;
      //remove the older edge and add the new one
      cy.add(newEdge);
      var newCyEdge = cy.edges()[cy.edges().length - 1];
      //If this edge has not meta class properties make it meta
      if (this.edgesMetaLevels[newCyEdge.id()] == 0) {
        newCyEdge.addClass("meta");
      }
      //Increase the meta level of this edge by 1
      this.edgesMetaLevels[newCyEdge.id()]++;
      newCyEdge.data("collapsedNodeBeforeBecamingMeta", childNode.id());
    }
  },
  /*
   * This method repairs the edges of the collapsed children of the given node
   * when the node is being expanded, the meta edges created while the node is
   * being collapsed are handled in this method
   */
  repairEdgesOfCollapsedChildren: function (node) { //*//
    var edgesOfcollapsedChildren = node._private.data.edgesOfcollapsedChildren;
    if (edgesOfcollapsedChildren == null) {
      return;
    }
    var collapsedMetaEdgeInfoOfNode = this.collapsedMetaEdgesInfo[node.id()];
    for (var i = 0; i < edgesOfcollapsedChildren.length; i++) {
      //Handle collapsed meta edge info if it is required
      if (collapsedMetaEdgeInfoOfNode != null &&
        this.collapsedMetaEdgesInfo[edgesOfcollapsedChildren[i]._private.data.id] != null) {
        var info = this.collapsedMetaEdgesInfo[edgesOfcollapsedChildren[i]._private.data.id];
        //If the meta edge is not created because of the reason that this node is collapsed
        //handle it by changing source or target of related edge datas
        if (info.createdWhileBeingCollapsed != node.id()) {
          if (edgesOfcollapsedChildren[i]._private.data.source == info.oldOwner) {
            edgesOfcollapsedChildren[i]._private.data.source = info.createdWhileBeingCollapsed;
            this.alterSourceOrTargetOfCollapsedEdge(info.createdWhileBeingCollapsed
              , edgesOfcollapsedChildren[i]._private.data.id, "target");
          }
          else if (edgesOfcollapsedChildren[i]._private.data.target == info.oldOwner) {
            edgesOfcollapsedChildren[i]._private.data.target = info.createdWhileBeingCollapsed;
            this.alterSourceOrTargetOfCollapsedEdge(info.createdWhileBeingCollapsed
              , edgesOfcollapsedChildren[i]._private.data.id, "source");
          }
        }
        //Delete the related collapsedMetaEdgesInfo's as they are handled
        delete this.collapsedMetaEdgesInfo[info.createdWhileBeingCollapsed][info.otherEnd];
        delete this.collapsedMetaEdgesInfo[info.otherEnd][info.createdWhileBeingCollapsed];
        delete this.collapsedMetaEdgesInfo[edgesOfcollapsedChildren[i]._private.data.id];
      }
      var oldEdge = cy.getElementById(edgesOfcollapsedChildren[i]._private.data.id);
      //If the edge is already in the graph remove it and decrease it's meta level
      if (oldEdge != null && oldEdge.length > 0) {
        this.edgesMetaLevels[edgesOfcollapsedChildren[i]._private.data.id]--;
        oldEdge.remove();
      }
    }

    /*edgesOfcollapsedChildren.restore();*/

    //Check for meta levels of edges and handle the changes
    this.edgesToRepair = this.edgesToRepair.union(edgesOfcollapsedChildren);

    node._private.data.edgesOfcollapsedChildren = null;
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
};

module.exports = expandCollapseUtilities;
},{"./boundingBoxUtilities":1,"./elementUtilities":4}],6:[function(_dereq_,module,exports){
;
(function ($$, $) {
  'use strict';

  var expandCollapseUtilities = _dereq_('./expandCollapseUtilities');
  var undoRedoUtilities = _dereq_('./undoRedoUtilities');
  var elementUtilities = _dereq_('./elementUtilities');
  $.fn.cytoscapeExpandCollapse = _dereq_("./cueUtilities");

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
      ready: function () { },
      undoable: true, // and if undoRedoExtension exists,

      cueEnabled: true,
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


    // cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      cy = this;
      options = setOptions(opts);

      // All parent nodes are expanded on load
      cy.nodes(':parent').data('expanded-collapsed', 'expanded');
      undoRedoUtilities();
      
      if(options.cueEnabled)
        $(cy.container()).cytoscapeExpandCollapse(options);
      else
        $(cy.container()).cytoscapeExpandCollapse("unbind");


      options.ready();


      return cy;
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

},{"./cueUtilities":2,"./elementUtilities":4,"./expandCollapseUtilities":5,"./undoRedoUtilities":7}],7:[function(_dereq_,module,exports){
module.exports = function () {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({
    defaultActions: false
  });

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
    console.log(actions[i] + "->" + actions[(i + 3) % 6]);
  }

};
},{}]},{},[6])(6)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2VsZW1lbnRVdGlsaXRpZXMuanMiLCJzcmMvZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvdW5kb1JlZG9VdGlsaXRpZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5c0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBib3VuZGluZ0JveFV0aWxpdGllcyA9IHtcclxuICBlcXVhbEJvdW5kaW5nQm94ZXM6IGZ1bmN0aW9uKGJiMSwgYmIyKXtcclxuICAgICAgcmV0dXJuIGJiMS54MSA9PSBiYjIueDEgJiYgYmIxLngyID09IGJiMi54MiAmJiBiYjEueTEgPT0gYmIyLnkxICYmIGJiMS55MiA9PSBiYjIueTI7XHJcbiAgfSxcclxuICBnZXRVbmlvbjogZnVuY3Rpb24oYmIxLCBiYjIpe1xyXG4gICAgICB2YXIgdW5pb24gPSB7XHJcbiAgICAgIHgxOiBNYXRoLm1pbihiYjEueDEsIGJiMi54MSksXHJcbiAgICAgIHgyOiBNYXRoLm1heChiYjEueDIsIGJiMi54MiksXHJcbiAgICAgIHkxOiBNYXRoLm1pbihiYjEueTEsIGJiMi55MSksXHJcbiAgICAgIHkyOiBNYXRoLm1heChiYjEueTIsIGJiMi55MiksXHJcbiAgICB9O1xyXG5cclxuICAgIHVuaW9uLncgPSB1bmlvbi54MiAtIHVuaW9uLngxO1xyXG4gICAgdW5pb24uaCA9IHVuaW9uLnkyIC0gdW5pb24ueTE7XHJcblxyXG4gICAgcmV0dXJuIHVuaW9uO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYm91bmRpbmdCb3hVdGlsaXRpZXM7IiwidmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgdmFyIGZuID0gcGFyYW1zO1xyXG5cclxuICB2YXIgZU1vdXNlT3ZlciwgZU1vdXNlT3V0LCBlUG9zaXRpb24sIGVSZW1vdmUsIGVUYXAsIGVab29tO1xyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyIG9wdHMgPSBwYXJhbXM7XHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gJCh0aGlzKTtcclxuICAgICAgdmFyIGN5O1xyXG4gICAgICB2YXIgJGNhbnZhcyA9ICQoJzxjYW52YXM+PC9jYW52YXM+Jyk7XHJcblxyXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcclxuXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICRjb250YWluZXIud2lkdGgoKSlcclxuICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAndG9wJzogMCxcclxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxyXG4gICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcclxuXHJcbiAgICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICd0b3AnOiAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCksXHJcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgO1xyXG5cclxuICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYoY3kpe1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIDApO1xyXG5cclxuICAgICAgfSwgMjUwKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgX3NpemVDYW52YXMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgJCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3lleHBhbmRjb2xsYXBzZScpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZXhwYW5kY29sbGFwc2UnKS5vcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gY2xlYXJEcmF3cyhrZWVwRXhwYW5kQ3Vlcykge1xyXG5cclxuICAgICAgICB2YXIgdyA9ICRjb250YWluZXIud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcblxyXG4gICAgICAgIGlmIChrZWVwRXhwYW5kQ3Vlcykge1xyXG4gICAgICAgICAgdmFyIGNvbGxhcHNlZE5vZGVzID0gY3kubm9kZXMoJ1tleHBhbmRlZC1jb2xsYXBzZWQ9XCJjb2xsYXBzZWRcIl0nKTtcclxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sbGFwc2VkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgZHJhd0V4cGFuZENvbGxhcHNlQ3VlKGNvbGxhcHNlZE5vZGVzW2ldKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIGNsZWFyTm9kZURyYXcobm9kZSkge1xyXG5cclxuICAgICAgICB2YXIgeCA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYO1xyXG4gICAgICAgIHZhciB5ID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFk7XHJcbiAgICAgICAgdmFyIHMgPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemU7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcpID09PSAnY29sbGFwc2VkJykge1xyXG4gICAgICAgICAgZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguY2xlYXJSZWN0KHgsIHksIHMsIHMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSkge1xyXG4gICAgICAgIHZhciBjeSA9IG5vZGUuY3koKTtcclxuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgICAgIHZhciBoYXNDaGlsZHJlbiA9IGNoaWxkcmVuICE9IG51bGwgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICAgICAgICAvL2NoZWNrIGlmIHRoZSBleHBhbmQgb3IgY29sbGFwc2UgY3VlIGlzIHRvIGJlIGRyYXduXHJcbiAgICAgICAgaWYgKCFoYXNDaGlsZHJlbiAmJiBjb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZXhwYW5kZWRPcmNvbGxhcHNlZCA9IG5vZGUuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJyk7XHJcblxyXG4gICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xyXG4gICAgICAgIHZhciByZWN0U2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNpemU7XHJcbiAgICAgICAgdmFyIGxpbmVTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU7XHJcbiAgICAgICAgdmFyIGRpZmY7XHJcblxyXG4gICAgICAgIHJlY3RTaXplID0gcmVjdFNpemUgKiBjeS56b29tKCk7XHJcbiAgICAgICAgbGluZVNpemUgPSBsaW5lU2l6ZSAqIGN5Lnpvb20oKTtcclxuICAgICAgICBkaWZmID0gKHJlY3RTaXplIC0gbGluZVNpemUpIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VFbmRYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUVuZFk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVjdFNpemU7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclg7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uID09PSAndG9wLWxlZnQnKSB7XHJcbiAgICAgICAgICB2YXIgcCA9IG5vZGUucmVuZGVyZWRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgdmFyIHcgPSBub2RlLnJlbmRlcmVkT3V0ZXJXaWR0aCgpO1xyXG4gICAgICAgICAgdmFyIGggPSBub2RlLnJlbmRlcmVkT3V0ZXJIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgICBleHBhbmRjb2xsYXBzZUNlbnRlclggPSBwLnggLSB3IC8gMiAtIHJlY3RTaXplIC8gNCArIHJlY3RTaXplIC8gMjtcclxuICAgICAgICAgIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSA9IHAueSAtIGggLyAyIC0gcmVjdFNpemUgLyA0ICsgcmVjdFNpemUgLyAyO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgY3VlQ2VudGVyID0gdHlwZW9mIG9wdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbi5jYWxsKHRoaXMsIG5vZGUpIDogb3B0aW9uO1xyXG4gICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyID0gZWxlbWVudFV0aWxpdGllcy5jb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKGN1ZUNlbnRlcik7XHJcblxyXG4gICAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJYID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueDtcclxuICAgICAgICAgIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWSAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZUVuZFggPSBleHBhbmRjb2xsYXBzZVN0YXJ0WCArIHJlY3RTaXplO1xyXG4gICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemU7XHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VSZWN0U2l6ZSA9IHJlY3RTaXplO1xyXG5cclxuICAgICAgICAvLyBEcmF3IGV4cGFuZC9jb2xsYXBzZSBjdWUgaWYgc3BlY2lmaWVkIHVzZSBpbWFnZSBlbHNlIGRyYXcgaXRcclxuICAgICAgICBpZiAoZXhwYW5kZWRPcmNvbGxhcHNlZCA9PT0gJ2V4cGFuZGVkJyAmJiBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UpIHtcclxuICAgICAgICAgIHZhciBpbWc9bmV3IEltYWdlKCk7XHJcbiAgICAgICAgICBpbWcuc3JjID0gb3B0aW9ucygpLmV4cGFuZEN1ZUltYWdlO1xyXG4gICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChleHBhbmRlZE9yY29sbGFwc2VkID09PSAnY29sbGFwc2VkJyAmJiBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSkge1xyXG4gICAgICAgICAgdmFyIGltZz1uZXcgSW1hZ2UoKTtcclxuICAgICAgICAgIGltZy5zcmMgPSBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZTtcclxuICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCBleHBhbmRjb2xsYXBzZUNlbnRlclgsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSwgcmVjdFNpemUsIHJlY3RTaXplKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICB2YXIgb2xkRmlsbFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcclxuICAgICAgICAgIHZhciBvbGRXaWR0aCA9IGN0eC5saW5lV2lkdGg7XHJcbiAgICAgICAgICB2YXIgb2xkU3Ryb2tlU3R5bGUgPSBjdHguc3Ryb2tlU3R5bGU7XHJcblxyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgICBjdHguZWxsaXBzZShleHBhbmRjb2xsYXBzZUNlbnRlclgsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSwgcmVjdFNpemUgLyAyLCByZWN0U2l6ZSAvIDIsIDAsIDAsIDIgKiBNYXRoLlBJKTtcclxuICAgICAgICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwid2hpdGVcIjtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSAyLjYgKiBjeS56b29tKCk7XHJcblxyXG4gICAgICAgICAgY3R4Lm1vdmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcclxuICAgICAgICAgIGN0eC5saW5lVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyBsaW5lU2l6ZSArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcclxuXHJcbiAgICAgICAgICBpZiAoZXhwYW5kZWRPcmNvbGxhcHNlZCA9PSAnY29sbGFwc2VkJykge1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUgPSBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAkY29udGFpbmVyLmN5dG9zY2FwZShmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGN5ID0gdGhpcztcclxuICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG5cclxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIGN5Lm9uKCdtb3VzZW92ZXInLCAnbm9kZScsIGVNb3VzZU92ZXIgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIC8vIHJlbW92ZSBvbGQgaGFuZGxlXHJcbiAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG5cclxuICAgICAgICAgIC8vIGFkZCBuZXcgaGFuZGxlXHJcbiAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSk7XHJcblxyXG4gICAgICAgICAgdmFyIGxhc3RQb3NpdGlvbiA9IHt9O1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ21vdXNlb3V0IHRhcGRyYWdvdXQnLCAnbm9kZScsIGVNb3VzZU91dCA9IGZ1bmN0aW9uIChlKSB7XHJcblxyXG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGNsZWFyTm9kZURyYXcobm9kZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XHJcbiAgICAgICAgICBjbGVhck5vZGVEcmF3KG5vZGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB1cjtcclxuICAgICAgICBjeS5vbigndGFwJywgJ25vZGUnLCBlVGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WDtcclxuICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFk7XHJcbiAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplO1xyXG4gICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcclxuICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSA9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemU7XHJcblxyXG4gICAgICAgICAgdmFyIGN5UmVuZGVyZWRQb3NYID0gZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uLng7XHJcbiAgICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1kgPSBldmVudC5jeVJlbmRlcmVkUG9zaXRpb24ueTtcclxuICAgICAgICAgIHZhciBmYWN0b3IgPSAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XHJcblxyXG4gICAgICAgICAgaWYgKGN5UmVuZGVyZWRQb3NYID49IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggLSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuICAgICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1ggPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuICAgICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWSA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3Rvcikge1xyXG4gICAgICAgICAgICBpZihvcHRzLnVuZG9hYmxlICYmICF1cilcclxuICAgICAgICAgICAgICB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZihub2RlLmlzQ29sbGFwc2libGUoKSlcclxuICAgICAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSlcclxuICAgICAgICAgICAgICAgIHVyLmRvKFwiY29sbGFwc2VcIiwge1xyXG4gICAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcclxuICAgICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbm9kZS5jb2xsYXBzZShvcHRzKTtcclxuICAgICAgICAgICAgZWxzZSBpZihub2RlLmlzRXhwYW5kYWJsZSgpKVxyXG4gICAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKVxyXG4gICAgICAgICAgICAgICAgdXIuZG8oXCJleHBhbmRcIiwge1xyXG4gICAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcclxuICAgICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbm9kZS5leHBhbmQob3B0cyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgJGNvbnRhaW5lci5kYXRhKCdjeWV4cGFuZGNvbGxhcHNlJywgZGF0YSk7XHJcbiAgICB9LFxyXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY3kub2ZmKCdtb3VzZW92ZXInLCAnbm9kZScsIGVNb3VzZU92ZXIpXHJcbiAgICAgICAgICAub2ZmKCdtb3VzZW91dCB0YXBkcmFnb3V0JywgJ25vZGUnLCBlTW91c2VPdXQpXHJcbiAgICAgICAgICAub2ZmKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uKVxyXG4gICAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxyXG4gICAgICAgICAgLm9mZigndGFwJywgJ25vZGUnLCBlVGFwKTtcclxuXHJcbiAgICAgICAgY3kudW5iaW5kKFwiem9vbSBwYW5cIiwgZVpvb20pO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGlmIChmdW5jdGlvbnNbZm5dKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb25zW2ZuXS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkLmVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWV4cGFuZC1jb2xsYXBzZScpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICQodGhpcyk7XHJcbn07IiwidmFyIGRlYm91bmNlID0gKGZ1bmN0aW9uICgpIHtcclxuICAvKipcclxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XHJcbiAgICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxyXG4gICAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XHJcbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cclxuICAgKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXHJcbiAgICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cclxuICAgKi9cclxuICAvKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xyXG4gIHZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XHJcblxyXG4gIC8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXHJcbiAgdmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxyXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcclxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBEYXRlXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcclxuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XHJcbiAgICogfSwgXy5ub3coKSk7XHJcbiAgICogLy8gPT4gbG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxyXG4gICAqL1xyXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxyXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xyXG4gICAqIGludm9rZWQuIFRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gY29tZXMgd2l0aCBhIGBjYW5jZWxgIG1ldGhvZCB0byBjYW5jZWxcclxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXHJcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqIFN1YnNlcXVlbnQgY2FsbHMgdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdFxyXG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxyXG4gICAqXHJcbiAgICogKipOb3RlOioqIElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAsIGBmdW5jYCBpcyBpbnZva2VkXHJcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xyXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKlxyXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXHJcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBGdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZVxyXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxyXG4gICAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XHJcbiAgICpcclxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXHJcbiAgICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xyXG4gICAqICAgJ2xlYWRpbmcnOiB0cnVlLFxyXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXHJcbiAgICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xyXG4gICAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XHJcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxyXG4gICAqIHZhciB0b2RvQ2hhbmdlcyA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDEwMDApO1xyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscy50b2RvLCB0b2RvQ2hhbmdlcyk7XHJcbiAgICpcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcclxuICAgKiAgIGlmIChfLmZpbmQoY2hhbmdlcywgeyAndXNlcic6ICd0b2RvJywgJ3R5cGUnOiAnZGVsZXRlJ30pKSB7XHJcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xyXG4gICAqICAgfVxyXG4gICAqIH0sIFsnZGVsZXRlJ10pO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYXQgc29tZSBwb2ludCBgbW9kZWxzLnRvZG9gIGlzIGNoYW5nZWRcclxuICAgKiBtb2RlbHMudG9kby5jb21wbGV0ZWQgPSB0cnVlO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYmVmb3JlIDEgc2Vjb25kIGhhcyBwYXNzZWQgYG1vZGVscy50b2RvYCBpcyBkZWxldGVkXHJcbiAgICogLy8gd2hpY2ggY2FuY2VscyB0aGUgZGVib3VuY2VkIGB0b2RvQ2hhbmdlc2AgY2FsbFxyXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcclxuICAgKi9cclxuICBmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XHJcbiAgICB2YXIgYXJncyxcclxuICAgICAgICAgICAgbWF4VGltZW91dElkLFxyXG4gICAgICAgICAgICByZXN1bHQsXHJcbiAgICAgICAgICAgIHN0YW1wLFxyXG4gICAgICAgICAgICB0aGlzQXJnLFxyXG4gICAgICAgICAgICB0aW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcclxuICAgICAgICAgICAgbGFzdENhbGxlZCA9IDAsXHJcbiAgICAgICAgICAgIG1heFdhaXQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xyXG5cclxuICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcclxuICAgIH1cclxuICAgIHdhaXQgPSB3YWl0IDwgMCA/IDAgOiAoK3dhaXQgfHwgMCk7XHJcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xyXG4gICAgICB2YXIgbGVhZGluZyA9IHRydWU7XHJcbiAgICAgIHRyYWlsaW5nID0gZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XHJcbiAgICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcclxuICAgICAgbWF4V2FpdCA9ICdtYXhXYWl0JyBpbiBvcHRpb25zICYmIG5hdGl2ZU1heCgrb3B0aW9ucy5tYXhXYWl0IHx8IDAsIHdhaXQpO1xyXG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcclxuICAgICAgaWYgKHRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBsYXN0Q2FsbGVkID0gMDtcclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlKGlzQ2FsbGVkLCBpZCkge1xyXG4gICAgICBpZiAoaWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgICB9XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVsYXllZCgpIHtcclxuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93KCkgLSBzdGFtcCk7XHJcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XHJcbiAgICAgICAgY29tcGxldGUodHJhaWxpbmdDYWxsLCBtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1heERlbGF5ZWQoKSB7XHJcbiAgICAgIGNvbXBsZXRlKHRyYWlsaW5nLCB0aW1lb3V0SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlYm91bmNlZCgpIHtcclxuICAgICAgYXJncyA9IGFyZ3VtZW50cztcclxuICAgICAgc3RhbXAgPSBub3coKTtcclxuICAgICAgdGhpc0FyZyA9IHRoaXM7XHJcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xyXG5cclxuICAgICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXHJcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XHJcblxyXG4gICAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XHJcbiAgICAgICAgaXNDYWxsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcclxuICAgIHJldHVybiBkZWJvdW5jZWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxyXG4gICAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IExhbmdcclxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCh7fSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdChbMSwgMiwgM10pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoMSk7XHJcbiAgICogLy8gPT4gZmFsc2VcclxuICAgKi9cclxuICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cclxuICAgIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxyXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XHJcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGRlYm91bmNlO1xyXG5cclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7IiwidmFyIGVsZW1lbnRVdGlsaXRpZXMgPSB7XHJcbiAgbW92ZU5vZGVzOiBmdW5jdGlvbiAocG9zaXRpb25EaWZmLCBub2Rlcywgbm90Q2FsY1RvcE1vc3ROb2Rlcykge1xyXG4gICAgdmFyIHRvcE1vc3ROb2RlcyA9IG5vdENhbGNUb3BNb3N0Tm9kZXMgPyBub2RlcyA6IHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gdG9wTW9zdE5vZGVzW2ldO1xyXG4gICAgICB2YXIgb2xkWCA9IG5vZGUucG9zaXRpb24oXCJ4XCIpO1xyXG4gICAgICB2YXIgb2xkWSA9IG5vZGUucG9zaXRpb24oXCJ5XCIpO1xyXG4gICAgICBub2RlLnBvc2l0aW9uKHtcclxuICAgICAgICB4OiBvbGRYICsgcG9zaXRpb25EaWZmLngsXHJcbiAgICAgICAgeTogb2xkWSArIHBvc2l0aW9uRGlmZi55XHJcbiAgICAgIH0pO1xyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgdmFyIG5vZGVzTWFwID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50KClbMF07XHJcbiAgICAgIHdoaWxlIChwYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgIGlmIChub2Rlc01hcFtwYXJlbnQuaWQoKV0pIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudCgpWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJvb3RzO1xyXG4gIH0sXHJcbiAgcmVhcnJhbmdlOiBmdW5jdGlvbiAobGF5b3V0QnkpIHsvLyovL1xyXG4gICAgaWYgKHR5cGVvZiBsYXlvdXRCeSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIGxheW91dEJ5KCk7XHJcbiAgICB9IGVsc2UgaWYgKGxheW91dEJ5ICE9IG51bGwpIHtcclxuICAgICAgY3kubGF5b3V0KGxheW91dEJ5KTtcclxuICAgIH1cclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb246IGZ1bmN0aW9uIChtb2RlbFBvc2l0aW9uKSB7XHJcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcclxuICAgIHZhciB5ID0gbW9kZWxQb3NpdGlvbi55ICogem9vbSArIHBhbi55O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IHgsXHJcbiAgICAgIHk6IHlcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JvdW5kaW5nQm94VXRpbGl0aWVzJyk7XHJcbnZhciBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJyk7XHJcblxyXG4vLyBFeHBhbmQgY29sbGFwc2UgdXRpbGl0aWVzXHJcbnZhciBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyA9IHtcclxuICBlZGdlc1RvUmVwYWlyOiBudWxsLFxyXG4gIC8vdGhlIG51bWJlciBvZiBub2RlcyBtb3ZpbmcgYW5pbWF0ZWRseSBhZnRlciBleHBhbmQgb3BlcmF0aW9uXHJcbiAgYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudDogMCxcclxuICAvL1RoaXMgaXMgYSBtYXAgd2hpY2gga2VlcHMgdGhlIGluZm9ybWF0aW9uIG9mIGNvbGxhcHNlZCBtZXRhIGVkZ2VzIHRvIGhhbmRsZSB0aGVtIGNvcnJlY3RseVxyXG4gIGNvbGxhcHNlZE1ldGFFZGdlc0luZm86IHt9LFxyXG4gIC8vVGhpcyBtYXAga2VlcHMgdHJhY2sgb2YgdGhlIG1ldGEgbGV2ZWxzIG9mIGVkZ2VzIGJ5IHRoZWlyIGlkJ3NcclxuICBlZGdlc01ldGFMZXZlbHM6IHt9LFxyXG4gIC8vVGhpcyBtZXRob2QgY2hhbmdlcyBzb3VyY2Ugb3IgdGFyZ2V0IGlkIG9mIHRoZSBjb2xsYXBzZWQgZWRnZSBkYXRhIGtlcHQgaW4gdGhlIGRhdGEgb2YgdGhlIG5vZGVcclxuICAvL3dpdGggaWQgb2YgY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRcclxuICBhbHRlclNvdXJjZU9yVGFyZ2V0T2ZDb2xsYXBzZWRFZGdlOiBmdW5jdGlvbiAoY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQsIGVkZ2VJZCwgc291cmNlT3JUYXJnZXQpIHsvLyovL1xyXG4gICAgdmFyIG5vZGUgPSBjeS5nZXRFbGVtZW50QnlJZChjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZClbMF07XHJcbiAgICB2YXIgZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBjb2xsYXBzZWRFZGdlID0gZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldO1xyXG4gICAgICBpZiAoY29sbGFwc2VkRWRnZS5fcHJpdmF0ZS5kYXRhLmlkID09IGVkZ2VJZCkge1xyXG4gICAgICAgIGNvbGxhcHNlZEVkZ2UuX3ByaXZhdGUuZGF0YVtzb3VyY2VPclRhcmdldF0gPSBjb2xsYXBzZWRFZGdlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkTm9kZUJlZm9yZUJlY2FtaW5nTWV0YTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9BIGZ1bnRpb24gYmFzaWNseSBleHBhbmRpbmcgYSBub2RlIGl0IGlzIHRvIGJlIGNhbGxlZCB3aGVuIGEgbm9kZSBpcyBleHBhbmRlZCBhbnl3YXlcclxuICBleHBhbmROb2RlQmFzZUZ1bmN0aW9uOiBmdW5jdGlvbiAobm9kZSwgdHJpZ2dlckxheW91dCwgc2luZ2xlLCBsYXlvdXRCeSkgey8vKi8vXHJcbiAgICAvL2NoZWNrIGhvdyB0aGUgcG9zaXRpb24gb2YgdGhlIG5vZGUgaXMgY2hhbmdlZFxyXG4gICAgdmFyIHBvc2l0aW9uRGlmZiA9IHtcclxuICAgICAgeDogbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKS54LFxyXG4gICAgICB5OiBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpLnlcclxuICAgIH07XHJcblxyXG4gICAgbm9kZS5yZW1vdmVEYXRhKFwiaW5mb0xhYmVsXCIpO1xyXG4gICAgbm9kZS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnLCAnZXhwYW5kZWQnKTtcclxuXHJcbiAgICBub2RlLnRyaWdnZXIoXCJiZWZvcmVFeHBhbmRcIik7XHJcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4ubm9kZXMoKS5yZXN0b3JlKCk7XHJcbiAgICB0aGlzLnJlcGFpckVkZ2VzT2ZDb2xsYXBzZWRDaGlsZHJlbihub2RlKTtcclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IG51bGw7XHJcbiAgICBub2RlLnRyaWdnZXIoXCJhZnRlckV4cGFuZFwiKTtcclxuXHJcblxyXG4gICAgZWxlbWVudFV0aWxpdGllcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBub2RlLmNoaWxkcmVuKCkpO1xyXG4gICAgbm9kZS5yZW1vdmVEYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKTtcclxuXHJcbiAgICBpZiAoc2luZ2xlKVxyXG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbihsYXlvdXRCeSk7XHJcbiAgICAvLyByZWZyZXNoUGFkZGluZ3MoKTtcclxuICAgLyogaWYgKHRyaWdnZXJMYXlvdXQpXHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTsqL1xyXG4gIH0sXHJcbiAgc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgbm9kZXMuZGF0YShcImNvbGxhcHNlXCIsIHRydWUpO1xyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICBzaW1wbGVFeHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIG5vZGVzLmRhdGEoXCJleHBhbmRcIiwgdHJ1ZSk7XHJcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICBzaW1wbGVFeHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZXMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBub2RlcyA9IGN5Lm5vZGVzKCk7XHJcbiAgICB9XHJcbiAgICB2YXIgb3JwaGFucztcclxuICAgIG9ycGhhbnMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICB2YXIgZXhwYW5kU3RhY2sgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IG9ycGhhbnNbaV07XHJcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGV4cGFuZFN0YWNrO1xyXG4gIH0sXHJcbiAgYmVnaW5PcGVyYXRpb246IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICB9LFxyXG4gIGVuZE9wZXJhdGlvbjogZnVuY3Rpb24gKGxheW91dEJ5KSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjeS5yZWFkeShmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHNlbGYuZWRnZXNUb1JlcGFpci5yZXN0b3JlKCk7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5lZGdlc1RvUmVwYWlyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBzZWxmLmVkZ2VzVG9SZXBhaXJbaV07XHJcbiAgICAgICAgaWYgKHNlbGYuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gPT0gbnVsbCB8fCBzZWxmLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID09IDApIHtcclxuICAgICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB0aGlzLmVkZ2VzVG9SZXBhaXIgPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgZXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICB0aGlzLmJlZ2luT3BlcmF0aW9uKCk7XHJcbiAgICB2YXIgZXhwYW5kZWRTdGFjayA9IHRoaXMuc2ltcGxlRXhwYW5kQWxsTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XHJcblxyXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSk7XHJcblxyXG4gICAgLy9lbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGV4cGFuZGVkU3RhY2s7XHJcbiAgfSxcclxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICBleHBhbmRTdGFjay5wdXNoKHJvb3QpO1xyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24obm9kZSwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vRXhwYW5kIHRoZSBnaXZlbiBub2RlcyBwZXJmb3JtIGluY3JlbWVudGFsIGxheW91dCBhZnRlciBleHBhbmRhdGlvblxyXG4gIGV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICB0aGlzLmJlZ2luT3BlcmF0aW9uKCk7XHJcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShub2Rlc1swXSwgb3B0aW9ucy5maXNoZXllLCBvcHRpb25zLmFuaW1hdGUsIG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSk7XHJcblxyXG4gICAgICAvL2VsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKG9wdGlvbnMubGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlcyB0aGVuIG1ha2UgaW5jcmVtZW50YWwgbGF5b3V0XHJcbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xyXG4gICAgdGhpcy5iZWdpbk9wZXJhdGlvbigpO1xyXG4gICAgdGhpcy5zaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXMobm9kZXMsIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnkpO1xyXG4gICAgLy9lbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcclxuICBjb2xsYXBzZUJvdHRvbVVwOiBmdW5jdGlvbiAocm9vdCkgey8vKi8vXHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChub2RlKTtcclxuICAgIH1cclxuICAgIC8vSWYgdGhlIHJvb3QgaXMgYSBjb21wb3VuZCBub2RlIHRvIGJlIGNvbGxhcHNlZCB0aGVuIGNvbGxhcHNlIGl0XHJcbiAgICBpZiAocm9vdC5kYXRhKFwiY29sbGFwc2VcIikgJiYgcm9vdC5jaGlsZHJlbigpLmxlbmd0aCA+IDApIHtcclxuICAgICAgdGhpcy5zaW1wbGVDb2xsYXBzZU5vZGUocm9vdCk7XHJcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImNvbGxhcHNlXCIpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9leHBhbmQgdGhlIG5vZGVzIGluIHRvcCBkb3duIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcclxuICBleHBhbmRUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xyXG4gICAgaWYgKHJvb3QuZGF0YShcImV4cGFuZFwiKSAmJiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgICByb290LnJlbW92ZURhdGEoXCJleHBhbmRcIik7XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihub2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIGV4cGFuZE5vZGU6IGZ1bmN0aW9uIChub2RlLCBmaXNoZXllLCBhbmltYXRlLCBsYXlvdXRCeSkge1xyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kTm9kZShub2RlLCBmaXNoZXllLCB0cnVlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcblxyXG4gICAgICAvKlxyXG4gICAgICAgKiByZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgICAqL1xyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIGNvbnZlcnRUb01vZGVsUG9zaXRpb246IGZ1bmN0aW9uIChyZW5kZXJlZFBvc2l0aW9uKSB7XHJcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICB2YXIgeCA9IChyZW5kZXJlZFBvc2l0aW9uLnggLSBwYW4ueCkgLyB6b29tO1xyXG4gICAgdmFyIHkgPSAocmVuZGVyZWRQb3NpdGlvbi55IC0gcGFuLnkpIC8gem9vbTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB4LFxyXG4gICAgICB5OiB5XHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgLypcclxuICAgKlxyXG4gICAqIFRoaXMgbWV0aG9kIGV4cGFuZHMgdGhlIGdpdmVuIG5vZGVcclxuICAgKiB3aXRob3V0IG1ha2luZyBpbmNyZW1lbnRhbCBsYXlvdXRcclxuICAgKiBhZnRlciBleHBhbmQgb3BlcmF0aW9uIGl0IHdpbGwgYmUgc2ltcGx5XHJcbiAgICogdXNlZCB0byB1bmRvIHRoZSBjb2xsYXBzZSBvcGVyYXRpb25cclxuICAgKi9cclxuICBzaW1wbGVFeHBhbmROb2RlOiBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpIHsvLyovL1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciBjb21tb25FeHBhbmRPcGVyYXRpb24gPSBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpIHtcclxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcblxyXG4gICAgICAgIG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnLCBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykudyk7XHJcbiAgICAgICAgbm9kZS5kYXRhKCdoZWlnaHQtYmVmb3JlLWZpc2hleWUnLCBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykuaCk7XHJcblxyXG4gICAgICAgIHNlbGYuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZSwgc2luZ2xlTm90U2ltcGxlLCBub2RlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghc2luZ2xlTm90U2ltcGxlIHx8ICFhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSB8fCAhYW5pbWF0ZSkge1xyXG4gICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlLCBzaW5nbGVOb3RTaW1wbGUsIHNpbmdsZU5vdFNpbXBsZSwgbGF5b3V0QnkpOyAvLyoqKioqXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlKTtcclxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlICYmIHNpbmdsZU5vdFNpbXBsZSkge1xyXG4gICAgICAgIHZhciB0b3BMZWZ0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IDAsIHk6IDB9KTtcclxuICAgICAgICB2YXIgYm90dG9tUmlnaHRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogY3kud2lkdGgoKSwgeTogY3kuaGVpZ2h0KCl9KTtcclxuICAgICAgICB2YXIgcGFkZGluZyA9IDgwO1xyXG4gICAgICAgIHZhciBiYiA9IHtcclxuICAgICAgICAgIHgxOiB0b3BMZWZ0UG9zaXRpb24ueCxcclxuICAgICAgICAgIHgyOiBib3R0b21SaWdodFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB5MTogdG9wTGVmdFBvc2l0aW9uLnksXHJcbiAgICAgICAgICB5MjogYm90dG9tUmlnaHRQb3NpdGlvbi55XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIG5vZGVCQiA9IHtcclxuICAgICAgICAgIHgxOiBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykudyAvIDIgLSBwYWRkaW5nLFxyXG4gICAgICAgICAgeDI6IG5vZGUucG9zaXRpb24oJ3gnKSArIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS53IC8gMiArIHBhZGRpbmcsXHJcbiAgICAgICAgICB5MTogbm9kZS5wb3NpdGlvbigneScpIC0gbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmggLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHkyOiBub2RlLnBvc2l0aW9uKCd5JykgKyBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykuaCAvIDIgKyBwYWRkaW5nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVuaW9uQkIgPSBib3VuZGluZ0JveFV0aWxpdGllcy5nZXRVbmlvbihub2RlQkIsIGJiKTtcclxuICAgICAgICB2YXIgYW5pbWF0aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICghYm91bmRpbmdCb3hVdGlsaXRpZXMuZXF1YWxCb3VuZGluZ0JveGVzKHVuaW9uQkIsIGJiKSkge1xyXG4gICAgICAgICAgdmFyIHZpZXdQb3J0ID0gY3kuZ2V0Rml0Vmlld3BvcnQodW5pb25CQiwgMTApO1xyXG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgICAgYW5pbWF0aW5nID0gYW5pbWF0ZTtcclxuICAgICAgICAgIGlmIChhbmltYXRlKSB7XHJcbiAgICAgICAgICAgIGN5LmFuaW1hdGUoe1xyXG4gICAgICAgICAgICAgIHBhbjogdmlld1BvcnQucGFuLFxyXG4gICAgICAgICAgICAgIHpvb206IHZpZXdQb3J0Lnpvb20sXHJcbiAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgZHVyYXRpb246IDEwMDBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY3kuem9vbSh2aWV3UG9ydC56b29tKTtcclxuICAgICAgICAgICAgY3kucGFuKHZpZXdQb3J0LnBhbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghYW5pbWF0aW5nKSB7XHJcbiAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlIHdpdGhvdXQgbWFraW5nIGluY3JlbWVudGFsIGxheW91dFxyXG4gIHNpbXBsZUNvbGxhcHNlTm9kZTogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHg6IG5vZGUucG9zaXRpb24oKS54LFxyXG4gICAgICAgIHk6IG5vZGUucG9zaXRpb24oKS55XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScsIHtcclxuICAgICAgICB3OiBub2RlLm91dGVyV2lkdGgoKSxcclxuICAgICAgICBoOiBub2RlLm91dGVySGVpZ2h0KClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBub2RlLmNoaWxkcmVuKCkudW5zZWxlY3QoKTtcclxuICAgICAgbm9kZS5jaGlsZHJlbigpLmNvbm5lY3RlZEVkZ2VzKCkudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgIG5vZGUuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJywgJ2NvbGxhcHNlZCcpO1xyXG5cclxuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG5cclxuICAgICAgbm9kZS50cmlnZ2VyKFwiYmVmb3JlQ29sbGFwc2VcIik7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgICB0aGlzLmJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbihub2RlLCBjaGlsZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4obm9kZSwgbm9kZSk7XHJcblxyXG4gICAgICBub2RlLnRyaWdnZXIoXCJhZnRlckNvbGxhcHNlXCIpO1xyXG4gICAgICBcclxuICAgICAgbm9kZS5wb3NpdGlvbihub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpKTtcclxuXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIHN0b3JlV2lkdGhIZWlnaHQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIGlmIChub2RlICE9IG51bGwpIHtcclxuICAgICAgbm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJywgdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKSk7XHJcbiAgICAgIG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScsIHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSkpO1xyXG4gICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5vdXRlcldpZHRoKCkpO1xyXG4gICAgICBub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScsIG5vZGUub3V0ZXJIZWlnaHQoKSk7XHJcblxyXG4gICAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUucGFyZW50KClbMF0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH0sXHJcbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGVOb3RTaW1wbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpIHsvLyovL1xyXG4gICAgdmFyIHNpYmxpbmdzID0gdGhpcy5nZXRTaWJsaW5ncyhub2RlKTtcclxuXHJcbiAgICB2YXIgeF9hID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuICAgIHZhciB5X2EgPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG5cclxuICAgIHZhciBkX3hfbGVmdCA9IE1hdGguYWJzKChub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcclxuICAgIHZhciBkX3hfcmlnaHQgPSBNYXRoLmFicygobm9kZS5kYXRhKCd3aWR0aC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XHJcbiAgICB2YXIgZF95X3VwcGVyID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XHJcbiAgICB2YXIgZF95X2xvd2VyID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XHJcblxyXG4gICAgdmFyIGFic19kaWZmX29uX3ggPSBNYXRoLmFicyhub2RlLmRhdGEoJ3gtYmVmb3JlLWZpc2hleWUnKSAtIHhfYSk7XHJcbiAgICB2YXIgYWJzX2RpZmZfb25feSA9IE1hdGguYWJzKG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScpIC0geV9hKTtcclxuXHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBMRUZUXHJcbiAgICBpZiAobm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJykgPiB4X2EpIHtcclxuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCArIGFic19kaWZmX29uX3g7XHJcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCAtIGFic19kaWZmX29uX3g7XHJcbiAgICB9XHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBSSUdIVFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgLSBhYnNfZGlmZl9vbl94O1xyXG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgKyBhYnNfZGlmZl9vbl94O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIFVQXHJcbiAgICBpZiAobm9kZS5kYXRhKCd5LWJlZm9yZS1maXNoZXllJykgPiB5X2EpIHtcclxuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyICsgYWJzX2RpZmZfb25feTtcclxuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyIC0gYWJzX2RpZmZfb25feTtcclxuICAgIH1cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIERPV05cclxuICAgIGVsc2Uge1xyXG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgLSBhYnNfZGlmZl9vbl95O1xyXG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgKyBhYnNfZGlmZl9vbl95O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB4UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XHJcbiAgICB2YXIgeVBvc0luUGFyZW50U2libGluZyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgeFBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueFBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcclxuICAgICAgeVBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueVBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3NbaV07XHJcblxyXG4gICAgICB2YXIgeF9iID0geFBvc0luUGFyZW50U2libGluZ1tpXTtcclxuICAgICAgdmFyIHlfYiA9IHlQb3NJblBhcmVudFNpYmxpbmdbaV07XHJcblxyXG4gICAgICB2YXIgc2xvcGUgPSAoeV9iIC0geV9hKSAvICh4X2IgLSB4X2EpO1xyXG5cclxuICAgICAgdmFyIGRfeCA9IDA7XHJcbiAgICAgIHZhciBkX3kgPSAwO1xyXG4gICAgICB2YXIgVF94ID0gMDtcclxuICAgICAgdmFyIFRfeSA9IDA7XHJcblxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExFRlRcclxuICAgICAgaWYgKHhfYSA+IHhfYikge1xyXG4gICAgICAgIGRfeCA9IGRfeF9sZWZ0O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgUklHSFRcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZF94ID0gZF94X3JpZ2h0O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgVVBQRVIgc2lkZVxyXG4gICAgICBpZiAoeV9hID4geV9iKSB7XHJcbiAgICAgICAgZF95ID0gZF95X3VwcGVyO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTE9XRVIgc2lkZVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBkX3kgPSBkX3lfbG93ZXI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpc0Zpbml0ZShzbG9wZSkpIHtcclxuICAgICAgICBUX3ggPSBNYXRoLm1pbihkX3gsIChkX3kgLyBNYXRoLmFicyhzbG9wZSkpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNsb3BlICE9PSAwKSB7XHJcbiAgICAgICAgVF95ID0gTWF0aC5taW4oZF95LCAoZF94ICogTWF0aC5hYnMoc2xvcGUpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcclxuICAgICAgICBUX3ggPSAtMSAqIFRfeDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHlfYSA+IHlfYikge1xyXG4gICAgICAgIFRfeSA9IC0xICogVF95O1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoc2libGluZywgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLnBhcmVudCgpWzBdLCBzaW5nbGVOb3RTaW1wbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH0sXHJcbiAgZ2V0U2libGluZ3M6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBzaWJsaW5ncztcclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSA9PSBudWxsKSB7XHJcbiAgICAgIHNpYmxpbmdzID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKCkub3JwaGFucygpO1xyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKG9ycGhhbnNbaV0gIT0gbm9kZSkge1xyXG4gICAgICAgICAgc2libGluZ3MgPSBzaWJsaW5ncy5hZGQob3JwaGFuc1tpXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzaWJsaW5ncyA9IG5vZGUuc2libGluZ3MoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2libGluZ3M7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIE1vdmUgbm9kZSBvcGVyYXRpb24gc3BlY2lhbGl6ZWQgZm9yIGZpc2ggZXllIHZpZXcgZXhwYW5kIG9wZXJhdGlvblxyXG4gICAqIE1vdmVzIHRoZSBub2RlIGJ5IG1vdmluZyBpdHMgZGVzY2FuZGVudHMuIE1vdmVtZW50IGlzIGFuaW1hdGVkIGlmIHNpbmdsZU5vdFNpbXBsZSBmbGFnIGlzIHRydXRoeS5cclxuICAgKi9cclxuICBmaXNoRXllVmlld01vdmVOb2RlOiBmdW5jdGlvbiAobm9kZSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSkgey8vKi8vXHJcbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIGlmIChjaGlsZHJlbkxpc3QubGVuZ3RoID09IDApIHtcclxuICAgICAgdmFyIG5ld1Bvc2l0aW9uID0ge3g6IG5vZGUucG9zaXRpb24oJ3gnKSArIFRfeCwgeTogbm9kZS5wb3NpdGlvbigneScpICsgVF95fTtcclxuICAgICAgaWYgKCFzaW5nbGVOb3RTaW1wbGUgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBub2RlLnBvc2l0aW9uKG5ld1Bvc2l0aW9uKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcclxuICAgICAgICBub2RlLmFuaW1hdGUoe1xyXG4gICAgICAgICAgcG9zaXRpb246IG5ld1Bvc2l0aW9uLFxyXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50LS07XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQgPiAwIHx8IG5vZGVUb0V4cGFuZC5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnKSA9PT0gJ2V4cGFuZGVkJykge1xyXG5cclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZU5vdFNpbXBsZSwgdHJ1ZSwgbGF5b3V0QnkpO1xyXG5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICBkdXJhdGlvbjogMTAwMFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW5MaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHhQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuICAgIHZhciB4X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeF9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd4JykgKyAocGFyZW50LndpZHRoKCkgLyAyKTtcclxuICAgIH1cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucG9zaXRpb24oJ3gnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geF9hO1xyXG4gIH0sXHJcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xyXG5cclxuICAgIHZhciB5X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeV9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd5JykgKyAocGFyZW50LmhlaWdodCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHlfYTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxyXG4gICAqIHdpdGggdGhlIHNhbWUgcm9vdCBwYXJhbWV0ZXIsXHJcbiAgICogcmVtb3ZlIHRoZSBjaGlsZCBhbmQgYWRkIHRoZSByZW1vdmVkIGNoaWxkIHRvIHRoZSBjb2xsYXBzZWRjaGlsZHJlbiBkYXRhXHJcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXHJcbiAgICogcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuIGtlZXBzIHRoZSBub2RlcyB0byByZXN0b3JlIHdoZW4gdGhlXHJcbiAgICogcm9vdCBpcyBleHBhbmRlZFxyXG4gICAqL1xyXG4gIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkgey8vKi8vXHJcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKGNoaWxkLCByb290KTtcclxuICAgICAgdmFyIHJlbW92ZWRDaGlsZCA9IGNoaWxkLnJlbW92ZSgpO1xyXG4gICAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkQ2hpbGQ7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHJlbW92ZWRDaGlsZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIC8qXHJcbiAgICogVGhpcyBtZXRob2QgbGV0IHRoZSByb290IHBhcmFtZXRlciB0byBiYXJyb3cgdGhlIGVkZ2VzIGNvbm5lY3RlZCB0byB0aGVcclxuICAgKiBjaGlsZCBub2RlIG9yIGFueSBub2RlIGluc2lkZSBjaGlsZCBub2RlIGlmIHRoZSBhbnkgb25lIHRoZSBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAqIGlzIGFuIG91dGVyIG5vZGUgb2YgdGhlIHJvb3Qgbm9kZSBpbiBvdGhlciB3b3JkIGl0IGNyZWF0ZSBtZXRhIGVkZ2VzXHJcbiAgICovXHJcbiAgYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbiAocm9vdCwgY2hpbGROb2RlKSB7Ly8qLy9cclxuICAgIHZhciBjaGlsZHJlbiA9IGNoaWxkTm9kZS5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ocm9vdCwgY2hpbGQpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBlZGdlcyA9IGNoaWxkTm9kZS5jb25uZWN0ZWRFZGdlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgc291cmNlID0gZWRnZS5kYXRhKFwic291cmNlXCIpO1xyXG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS5kYXRhKFwidGFyZ2V0XCIpO1xyXG4gICAgICB2YXIgc291cmNlTm9kZSA9IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgIHZhciB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQoKTtcclxuXHJcbiAgICAgIHZhciBuZXdFZGdlID0gIHt9OyAvL2pRdWVyeS5leHRlbmQodHJ1ZSwge30sIGVkZ2UuanNvbnMoKVswXSk7XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBlZGdlLmpzb25zKClbMF0pXHJcbiAgICAgICAgbmV3RWRnZVtrZXldID0gZWRnZS5qc29ucygpWzBdW2tleV07XHJcblxyXG4gICAgICAvL0luaXRpbGl6ZSB0aGUgbWV0YSBsZXZlbCBvZiB0aGlzIGVkZ2UgaWYgaXQgaXMgbm90IGluaXRpbGl6ZWQgeWV0XHJcbiAgICAgIGlmICh0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID09IG51bGwpIHtcclxuICAgICAgICB0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID0gMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLypJZiB0aGUgZWRnZSBpcyBtZXRhIGFuZCBoYXMgZGlmZmVyZW50IHNvdXJjZSBhbmQgdGFyZ2V0cyB0aGVuIGhhbmRsZSB0aGlzIGNhc2UgYmVjYXVzZSBpZlxyXG4gICAgICAgKiB0aGUgb3RoZXIgZW5kIG9mIHRoaXMgZWRnZSBpcyByZW1vdmVkIGJlY2F1c2Ugb2YgdGhlIHJlYXNvbiB0aGF0IGl0J3MgcGFyZW50IGlzXHJcbiAgICAgICAqIGJlaW5nIGNvbGxhcHNlZCBhbmQgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGJlZm9yZSBvdGhlciBlbmQgaXMgc3RpbGwgY29sbGFwc2VkIHRoaXMgY2F1c2VzXHJcbiAgICAgICAqIHRoYXQgdGhpcyBlZGdlIGNhbm5vdCBiZSByZXN0b3JlZCBhcyBvbmUgZW5kIG5vZGUgb2YgaXQgZG9lcyBub3QgZXhpc3RzLlxyXG4gICAgICAgKiBDcmVhdGUgYSBjb2xsYXBzZWQgbWV0YSBlZGdlIGluZm8gZm9yIHRoaXMgZWRnZSBhbmQgYWRkIHRoaXMgaW5mbyB0byBjb2xsYXBzZWRNZXRhRWRnZXNJbmZvXHJcbiAgICAgICAqIG1hcC4gVGhpcyBpbmZvIGluY2x1ZGVzIGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkKHRoZSBub2RlIHdoaWNoIGlzIGJlaW5nIGNvbGxhcHNlZCksXHJcbiAgICAgICAqIG90aGVyRW5kKHRoZSBvdGhlciBlbmQgb2YgdGhpcyBlZGdlKSBhbmQgb2xkT3duZXIodGhlIG93bmVyIG9mIHRoaXMgZWRnZSB3aGljaCB3aWxsIGJlY29tZVxyXG4gICAgICAgKiBhbiBvbGQgb3duZXIgYWZ0ZXIgY29sbGFwc2Ugb3BlcmF0aW9uKVxyXG4gICAgICAgKi9cclxuICAgICAgaWYgKHRoaXMuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gIT0gMCAmJiBzb3VyY2UgIT0gdGFyZ2V0KSB7XHJcbiAgICAgICAgdmFyIG90aGVyRW5kID0gbnVsbDtcclxuICAgICAgICB2YXIgb2xkT3duZXIgPSBudWxsO1xyXG4gICAgICAgIGlmIChzb3VyY2UgPT0gY2hpbGROb2RlLmlkKCkpIHtcclxuICAgICAgICAgIG90aGVyRW5kID0gdGFyZ2V0O1xyXG4gICAgICAgICAgb2xkT3duZXIgPSBzb3VyY2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHRhcmdldCA9PSBjaGlsZE5vZGUuaWQoKSkge1xyXG4gICAgICAgICAgb3RoZXJFbmQgPSBzb3VyY2U7XHJcbiAgICAgICAgICBvbGRPd25lciA9IHRhcmdldDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGluZm8gPSB7XHJcbiAgICAgICAgICBjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZDogcm9vdC5pZCgpLFxyXG4gICAgICAgICAgb3RoZXJFbmQ6IG90aGVyRW5kLFxyXG4gICAgICAgICAgb2xkT3duZXI6IG9sZE93bmVyXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAodGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bb3RoZXJFbmRdID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9IHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL3RoZSBpbmZvcm1hdGlvbiBzaG91bGQgYmUgcmVhY2hhYmxlIGJ5IGVkZ2UgaWQgYW5kIG5vZGUgaWQnc1xyXG4gICAgICAgIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tyb290LmlkKCldW290aGVyRW5kXSA9IGluZm87XHJcbiAgICAgICAgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXVtyb290LmlkKCldID0gaW5mbztcclxuICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZS5pZCgpXSA9IGluZm87XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciByZW1vdmVkRWRnZSA9IGVkZ2UucmVtb3ZlKCk7XHJcbiAgICAgIC8vc3RvcmUgdGhlIGRhdGEgb2YgdGhlIG9yaWdpbmFsIGVkZ2VcclxuICAgICAgLy90byByZXN0b3JlIHdoZW4gdGhlIG5vZGUgaXMgZXhwYW5kZWRcclxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkRWRnZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID1cclxuICAgICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4udW5pb24ocmVtb3ZlZEVkZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL0RvIG5vdCBoYW5kbGUgdGhlIGlubmVyIGVkZ2VzXHJcbiAgICAgIGlmICghdGhpcy5pc091dGVyTm9kZShzb3VyY2VOb2RlLCByb290KSAmJiAhdGhpcy5pc091dGVyTm9kZSh0YXJnZXROb2RlLCByb290KSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL0lmIHRoZSBjaGFuZ2Ugc291cmNlIGFuZC9vciB0YXJnZXQgb2YgdGhlIGVkZ2UgaW4gdGhlXHJcbiAgICAgIC8vY2FzZSBvZiB0aGV5IGFyZSBlcXVhbCB0byB0aGUgaWQgb2YgdGhlIGNvbGxhcHNlZCBjaGlsZFxyXG4gICAgICBpZiAoc291cmNlID09IGNoaWxkTm9kZS5pZCgpKSB7XHJcbiAgICAgICAgc291cmNlID0gcm9vdC5pZCgpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0YXJnZXQgPT0gY2hpbGROb2RlLmlkKCkpIHtcclxuICAgICAgICB0YXJnZXQgPSByb290LmlkKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vcHJlcGFyZSB0aGUgbmV3IGVkZ2UgYnkgY2hhbmdpbmcgdGhlIG9sZGVyIHNvdXJjZSBhbmQvb3IgdGFyZ2V0XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5wb3J0c291cmNlID0gc291cmNlO1xyXG4gICAgICBuZXdFZGdlLmRhdGEucG9ydHRhcmdldCA9IHRhcmdldDtcclxuICAgICAgbmV3RWRnZS5kYXRhLnNvdXJjZSA9IHNvdXJjZTtcclxuICAgICAgbmV3RWRnZS5kYXRhLnRhcmdldCA9IHRhcmdldDtcclxuICAgICAgLy9yZW1vdmUgdGhlIG9sZGVyIGVkZ2UgYW5kIGFkZCB0aGUgbmV3IG9uZVxyXG4gICAgICBjeS5hZGQobmV3RWRnZSk7XHJcbiAgICAgIHZhciBuZXdDeUVkZ2UgPSBjeS5lZGdlcygpW2N5LmVkZ2VzKCkubGVuZ3RoIC0gMV07XHJcbiAgICAgIC8vSWYgdGhpcyBlZGdlIGhhcyBub3QgbWV0YSBjbGFzcyBwcm9wZXJ0aWVzIG1ha2UgaXQgbWV0YVxyXG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbbmV3Q3lFZGdlLmlkKCldID09IDApIHtcclxuICAgICAgICBuZXdDeUVkZ2UuYWRkQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vSW5jcmVhc2UgdGhlIG1ldGEgbGV2ZWwgb2YgdGhpcyBlZGdlIGJ5IDFcclxuICAgICAgdGhpcy5lZGdlc01ldGFMZXZlbHNbbmV3Q3lFZGdlLmlkKCldKys7XHJcbiAgICAgIG5ld0N5RWRnZS5kYXRhKFwiY29sbGFwc2VkTm9kZUJlZm9yZUJlY2FtaW5nTWV0YVwiLCBjaGlsZE5vZGUuaWQoKSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoaXMgbWV0aG9kIHJlcGFpcnMgdGhlIGVkZ2VzIG9mIHRoZSBjb2xsYXBzZWQgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIG5vZGVcclxuICAgKiB3aGVuIHRoZSBub2RlIGlzIGJlaW5nIGV4cGFuZGVkLCB0aGUgbWV0YSBlZGdlcyBjcmVhdGVkIHdoaWxlIHRoZSBub2RlIGlzXHJcbiAgICogYmVpbmcgY29sbGFwc2VkIGFyZSBoYW5kbGVkIGluIHRoaXMgbWV0aG9kXHJcbiAgICovXHJcbiAgcmVwYWlyRWRnZXNPZkNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSkgeyAvLyovL1xyXG4gICAgdmFyIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICBpZiAoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbGxhcHNlZE1ldGFFZGdlSW5mb09mTm9kZSA9IHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tub2RlLmlkKCldO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgLy9IYW5kbGUgY29sbGFwc2VkIG1ldGEgZWRnZSBpbmZvIGlmIGl0IGlzIHJlcXVpcmVkXHJcbiAgICAgIGlmIChjb2xsYXBzZWRNZXRhRWRnZUluZm9PZk5vZGUgIT0gbnVsbCAmJlxyXG4gICAgICAgIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZF0gIT0gbnVsbCkge1xyXG4gICAgICAgIHZhciBpbmZvID0gdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkXTtcclxuICAgICAgICAvL0lmIHRoZSBtZXRhIGVkZ2UgaXMgbm90IGNyZWF0ZWQgYmVjYXVzZSBvZiB0aGUgcmVhc29uIHRoYXQgdGhpcyBub2RlIGlzIGNvbGxhcHNlZFxyXG4gICAgICAgIC8vaGFuZGxlIGl0IGJ5IGNoYW5naW5nIHNvdXJjZSBvciB0YXJnZXQgb2YgcmVsYXRlZCBlZGdlIGRhdGFzXHJcbiAgICAgICAgaWYgKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQgIT0gbm9kZS5pZCgpKSB7XHJcbiAgICAgICAgICBpZiAoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuc291cmNlID09IGluZm8ub2xkT3duZXIpIHtcclxuICAgICAgICAgICAgZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuc291cmNlID0gaW5mby5jcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZDtcclxuICAgICAgICAgICAgdGhpcy5hbHRlclNvdXJjZU9yVGFyZ2V0T2ZDb2xsYXBzZWRFZGdlKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRcclxuICAgICAgICAgICAgICAsIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkLCBcInRhcmdldFwiKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9PSBpbmZvLm9sZE93bmVyKSB7XHJcbiAgICAgICAgICAgIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9IGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWx0ZXJTb3VyY2VPclRhcmdldE9mQ29sbGFwc2VkRWRnZShpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXHJcbiAgICAgICAgICAgICAgLCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZCwgXCJzb3VyY2VcIik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vRGVsZXRlIHRoZSByZWxhdGVkIGNvbGxhcHNlZE1ldGFFZGdlc0luZm8ncyBhcyB0aGV5IGFyZSBoYW5kbGVkXHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXVtpbmZvLm90aGVyRW5kXTtcclxuICAgICAgICBkZWxldGUgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2luZm8ub3RoZXJFbmRdW2luZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRdO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBvbGRFZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWQpO1xyXG4gICAgICAvL0lmIHRoZSBlZGdlIGlzIGFscmVhZHkgaW4gdGhlIGdyYXBoIHJlbW92ZSBpdCBhbmQgZGVjcmVhc2UgaXQncyBtZXRhIGxldmVsXHJcbiAgICAgIGlmIChvbGRFZGdlICE9IG51bGwgJiYgb2xkRWRnZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdLS07XHJcbiAgICAgICAgb2xkRWRnZS5yZW1vdmUoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuLnJlc3RvcmUoKTsqL1xyXG5cclxuICAgIC8vQ2hlY2sgZm9yIG1ldGEgbGV2ZWxzIG9mIGVkZ2VzIGFuZCBoYW5kbGUgdGhlIGNoYW5nZXNcclxuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IHRoaXMuZWRnZXNUb1JlcGFpci51bmlvbihlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4pO1xyXG5cclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xyXG4gIH0sXHJcbiAgLypub2RlIGlzIGFuIG91dGVyIG5vZGUgb2Ygcm9vdFxyXG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxyXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXHJcbiAgaXNPdXRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCByb290KSB7Ly8qLy9cclxuICAgIHZhciB0ZW1wID0gbm9kZTtcclxuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRlbXAgPT0gcm9vdCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXM7IiwiO1xyXG4oZnVuY3Rpb24gKCQkLCAkKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICB2YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzJyk7XHJcbiAgdmFyIHVuZG9SZWRvVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91bmRvUmVkb1V0aWxpdGllcycpO1xyXG4gIHZhciBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJyk7XHJcbiAgJC5mbi5jeXRvc2NhcGVFeHBhbmRDb2xsYXBzZSA9IHJlcXVpcmUoXCIuL2N1ZVV0aWxpdGllc1wiKTtcclxuXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUpIHtcclxuXHJcbiAgICBpZiAoIWN5dG9zY2FwZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBjeTtcclxuICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICBsYXlvdXRCeTogbnVsbCwgLy8gZm9yIHJlYXJyYW5nZSBhZnRlciBleHBhbmQvY29sbGFwc2VcclxuICAgICAgZmlzaGV5ZTogdHJ1ZSxcclxuICAgICAgYW5pbWF0ZTogdHJ1ZSxcclxuICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHsgfSxcclxuICAgICAgdW5kb2FibGU6IHRydWUsIC8vIGFuZCBpZiB1bmRvUmVkb0V4dGVuc2lvbiBleGlzdHMsXHJcblxyXG4gICAgICBjdWVFbmFibGVkOiB0cnVlLFxyXG4gICAgICBleHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uOiAndG9wLWxlZnQnLCAvLyBkZWZhdWx0IGN1ZSBwb3NpdGlvbiBpcyB0b3AgbGVmdCB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiBwZXIgbm9kZSB0b29cclxuICAgICAgZXhwYW5kQ29sbGFwc2VDdWVTaXplOiAxMiwgLy8gc2l6ZSBvZiBleHBhbmQtY29sbGFwc2UgY3VlXHJcbiAgICAgIGV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU6IDgsIC8vIHNpemUgb2YgbGluZXMgdXNlZCBmb3IgZHJhd2luZyBwbHVzLW1pbnVzIGljb25zXHJcbiAgICAgIGV4cGFuZEN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGV4cGFuZCBpY29uIGlmIHVuZGVmaW5lZCBkcmF3IHJlZ3VsYXIgZXhwYW5kIGN1ZVxyXG4gICAgICBjb2xsYXBzZUN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGNvbGxhcHNlIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBjb2xsYXBzZSBjdWVcclxuICAgICAgZXhwYW5kQ29sbGFwc2VDdWVTZW5zaXRpdml0eTogMSAvLyBzZW5zaXRpdml0eSBvZiBleHBhbmQtY29sbGFwc2UgY3Vlc1xyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBzZXRPcHRpb25zKGZyb20pIHtcclxuICAgICAgdmFyIHRlbXBPcHRzID0ge307XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKVxyXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XHJcblxyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gZnJvbSlcclxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcclxuICAgICAgICAgIHRlbXBPcHRzW2tleV0gPSBmcm9tW2tleV07XHJcbiAgICAgIHJldHVybiB0ZW1wT3B0cztcclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gY3kuZXhwYW5kQ29sbGFwc2UoKVxyXG4gICAgY3l0b3NjYXBlKFwiY29yZVwiLCBcImV4cGFuZENvbGxhcHNlXCIsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIGN5ID0gdGhpcztcclxuICAgICAgb3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICAvLyBBbGwgcGFyZW50IG5vZGVzIGFyZSBleHBhbmRlZCBvbiBsb2FkXHJcbiAgICAgIGN5Lm5vZGVzKCc6cGFyZW50JykuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJywgJ2V4cGFuZGVkJyk7XHJcbiAgICAgIHVuZG9SZWRvVXRpbGl0aWVzKCk7XHJcbiAgICAgIFxyXG4gICAgICBpZihvcHRpb25zLmN1ZUVuYWJsZWQpXHJcbiAgICAgICAgJChjeS5jb250YWluZXIoKSkuY3l0b3NjYXBlRXhwYW5kQ29sbGFwc2Uob3B0aW9ucyk7XHJcbiAgICAgIGVsc2VcclxuICAgICAgICAkKGN5LmNvbnRhaW5lcigpKS5jeXRvc2NhcGVFeHBhbmRDb2xsYXBzZShcInVuYmluZFwiKTtcclxuXHJcblxyXG4gICAgICBvcHRpb25zLnJlYWR5KCk7XHJcblxyXG5cclxuICAgICAgcmV0dXJuIGN5O1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29sbGVjdGlvbiBmdW5jdGlvbnNcclxuXHJcbiAgICAvLyBlbGVzLmNvbGxhcHNlKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnY29sbGFwc2UnLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXMuY29sbGFwc2libGVOb2RlcygpO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG5cclxuICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmNvbGxhcHNlQWxsKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnY29sbGFwc2VSZWN1cnNpdmVseScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLmNvbGxhcHNlKHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnZXhwYW5kJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzLmV4cGFuZGFibGVOb2RlcygpO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG5cclxuICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmRBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdleHBhbmRSZWN1cnNpdmVseScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoKTtcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRBbGxOb2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgLy8gQ29yZSBmdW5jdGlvbnNcclxuXHJcbiAgICAvLyBjeS5jb2xsYXBzZUFsbChvcHRpb25zKVxyXG4gICAgY3l0b3NjYXBlKCdjb3JlJywgJ2NvbGxhcHNlQWxsJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBjeS5jb2xsYXBzaWJsZU5vZGVzKCkuY29sbGFwc2VSZWN1cnNpdmVseSh0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBjeS5leHBhbmRBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdleHBhbmRBbGwnLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG5cclxuICAgICAgcmV0dXJuIGN5LmV4cGFuZGFibGVOb2RlcygpLmV4cGFuZFJlY3Vyc2l2ZWx5KHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAvLyBVdGlsaXR5IGZ1bmN0aW9uc1xyXG5cclxuICAgIC8vIGVsZS5pc0NvbGxhcHNpYmxlKClcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdpc0V4cGFuZGFibGUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBlbGUgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIChlbGUuZGF0YShcImV4cGFuZGVkLWNvbGxhcHNlZFwiKSA9PT0gXCJjb2xsYXBzZWRcIik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGUuaXNFeHBhbmRhYmxlKClcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdpc0NvbGxhcHNpYmxlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZWxlID0gdGhpcztcclxuICAgICAgcmV0dXJuICFlbGUuaXNFeHBhbmRhYmxlKCkgJiYgZWxlLmlzUGFyZW50KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmNvbGxhcHNlZCgpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnY29sbGFwc2libGVOb2RlcycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIGVsZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmlzQ29sbGFwc2libGUoKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmV4cGFuZGVkKClcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdleHBhbmRhYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcztcclxuXHJcbiAgICAgIHJldHVybiBlbGVzLmZpbHRlcihmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgICAgcmV0dXJuIGVsZS5pc0V4cGFuZGFibGUoKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIC8vIGVsZXMuY29sbGFwc2VkKClcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdjb2xsYXBzaWJsZU5vZGVzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIGN5Lm5vZGVzKCkuY29sbGFwc2libGVOb2RlcygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmRlZCgpXHJcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZXhwYW5kYWJsZU5vZGVzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIGN5Lm5vZGVzKCkuZXhwYW5kYWJsZU5vZGVzKCk7XHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXHJcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1leHBhbmQtY29sbGFwc2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiByZWdpc3RlcjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnKSB7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXHJcbiAgICByZWdpc3RlcihjeXRvc2NhcGUpO1xyXG4gIH1cclxuXHJcbn0pKGN5dG9zY2FwZSwgalF1ZXJ5KTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZVxyXG4gIH0pO1xyXG5cclxuICBmdW5jdGlvbiBnZXRFbGVzKF9lbGVzKSB7XHJcbiAgICByZXR1cm4gKHR5cGVvZiBfZWxlcyA9PT0gXCJzdHJpbmdcIikgPyBjeS4kKF9lbGVzKSA6IF9lbGVzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Tm9kZVBvc2l0aW9uc0FuZFNpemVzKCkge1xyXG4gICAgdmFyIHBvc2l0aW9uc0FuZFNpemVzID0ge307XHJcbiAgICB2YXIgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVsZSA9IG5vZGVzW2ldO1xyXG4gICAgICBwb3NpdGlvbnNBbmRTaXplc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgd2lkdGg6IGVsZS53aWR0aCgpLFxyXG4gICAgICAgIGhlaWdodDogZWxlLmhlaWdodCgpLFxyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwb3NpdGlvbnNBbmRTaXplcztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJldHVyblRvUG9zaXRpb25zQW5kU2l6ZXMobm9kZXNEYXRhKSB7XHJcbiAgICB2YXIgY3VycmVudFBvc2l0aW9uc0FuZFNpemVzID0ge307XHJcbiAgICBjeS5ub2RlcygpLnBvc2l0aW9ucyhmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgd2lkdGg6IGVsZS53aWR0aCgpLFxyXG4gICAgICAgIGhlaWdodDogZWxlLmhlaWdodCgpLFxyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZGF0YSA9IG5vZGVzRGF0YVtlbGUuaWQoKV07XHJcbiAgICAgIGVsZS5fcHJpdmF0ZS5kYXRhLndpZHRoID0gZGF0YS53aWR0aDtcclxuICAgICAgZWxlLl9wcml2YXRlLmRhdGEuaGVpZ2h0ID0gZGF0YS5oZWlnaHQ7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogZGF0YS54LFxyXG4gICAgICAgIHk6IGRhdGEueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplcztcclxuICB9XHJcblxyXG4gIHZhciBzZWNvbmRUaW1lT3B0cyA9IHtcclxuICAgIGxheW91dEJ5OiBudWxsLFxyXG4gICAgYW5pbWF0ZTogZmFsc2UsXHJcbiAgICBmaXNoZXllOiBmYWxzZVxyXG4gIH07XHJcblxyXG4gIGZ1bmN0aW9uIGRvSXQoZnVuYykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgICAgdmFyIG5vZGVzID0gZ2V0RWxlcyhhcmdzLm5vZGVzKTtcclxuICAgICAgaWYgKGFyZ3MuZmlyc3RUaW1lKSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zQW5kU2l6ZXMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gY3lbZnVuY10oYXJncy5vcHRpb25zKSA6IG5vZGVzW2Z1bmNdKGFyZ3Mub3B0aW9ucyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zQW5kU2l6ZXMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gY3lbZnVuY10oc2Vjb25kVGltZU9wdHMpIDogY3kuY29sbGVjdGlvbihub2RlcylbZnVuY10oc2Vjb25kVGltZU9wdHMpO1xyXG4gICAgICAgIHJldHVyblRvUG9zaXRpb25zQW5kU2l6ZXMoYXJncy5vbGREYXRhKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB2YXIgYWN0aW9ucyA9IFtcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VSZWN1cnNpdmVseVwiLCBcImNvbGxhcHNlQWxsXCIsIFwiZXhwYW5kXCIsIFwiZXhwYW5kUmVjdXJzaXZlbHlcIiwgXCJleHBhbmRBbGxcIl07XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgdXIuYWN0aW9uKGFjdGlvbnNbaV0sIGRvSXQoYWN0aW9uc1tpXSksIGRvSXQoYWN0aW9uc1soaSArIDMpICUgNl0pKTtcclxuICAgIGNvbnNvbGUubG9nKGFjdGlvbnNbaV0gKyBcIi0+XCIgKyBhY3Rpb25zWyhpICsgMykgJSA2XSk7XHJcbiAgfVxyXG5cclxufTsiXX0=
