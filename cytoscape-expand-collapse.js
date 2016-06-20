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
},{}],3:[function(_dereq_,module,exports){
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

},{}],4:[function(_dereq_,module,exports){
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
    node._private.data.collapsedChildren.nodes().restore();
    this.repairEdgesOfCollapsedChildren(node);
    node._private.data.collapsedChildren = null;

    cy.nodes().updateCompoundBounds();

    //Don't show children info when the complex node is expanded
    if (node._private.data.sbgnclass == "complex") {
      node.removeStyle('content');
    }

    elementUtilities.moveNodes(positionDiff, node.children());
    node.removeData('position-before-collapse');

    if (single)
      this.endOperation();
    // refreshPaddings();
    if (triggerLayout) { //*/*/*asdsadda
      elementUtilities.rearrange(layoutBy);

    }
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
  endOperation: function () {
    this.edgesToRepair.restore();
    for (var i = 0; i < this.edgesToRepair.length; i++) {
      var edge = this.edgesToRepair[i];
      if (this.edgesMetaLevels[edge.id()] == null || this.edgesMetaLevels[edge.id()] == 0) {
        edge.removeClass("meta");
      }
      else {
        edge.addClass("meta");
      }
    }
    this.edgesToRepair = cy.collection();
  },
  expandAllNodes: function (nodes, options) {//*//
    this.beginOperation();
    cy.trigger("beforeExpand", [nodes, options]);
    var expandedStack = this.simpleExpandAllNodes(nodes, options.fisheye);
    cy.trigger("afterExpand", [nodes, options]);

    this.endOperation();

    elementUtilities.rearrange(options.layoutBy);

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
    cy.trigger("beforeExpand", [nodes, options]);
    if (nodes.length === 1) {
      this.expandNode(nodes[0], options.fisheye, options.animate, options.layoutBy);
      cy.trigger("afterExpand", [nodes, options]);

    } else {
      this.simpleExpandGivenNodes(nodes, options.fisheye);
      this.endOperation();
      cy.trigger("afterExpand", [nodes, options]);

      elementUtilities.rearrange(options.layoutBy);
    }

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the given nodes then make incremental layout
  collapseGivenNodes: function (nodes, options) {//*//
    this.beginOperation();
    cy.trigger("beforeCollapse", [nodes, options]);
    this.simpleCollapseGivenNodes(nodes, options);
    cy.trigger("beforeCollapse", [nodes, options]);

    this.endOperation();
    elementUtilities.rearrange(options.layoutBy);

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


      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        this.barrowEdgesOfcollapsedChildren(node, child);
      }

      this.removeChildren(node, node);
      // refreshPaddings();

      if (node._private.data.sbgnclass == "complex") {
        node.addClass('changeContent');
      }

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
},{"./boundingBoxUtilities":1,"./elementUtilities":3}],5:[function(_dereq_,module,exports){
;
(function ($$, $) {
  'use strict';

  var expandCollapseUtilities = _dereq_('./expandCollapseUtilities');
  var undoRedoUtilities = _dereq_('./undoRedoUtilities');
  var debounce = _dereq_('./debounce');
  var elementUtilities = _dereq_('./elementUtilities');

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
            var ur;
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
      undoRedoUtilities();

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

},{"./debounce":2,"./elementUtilities":3,"./expandCollapseUtilities":4,"./undoRedoUtilities":6}],6:[function(_dereq_,module,exports){
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
        result.nodes = func.indexOf("All") > 0 ? cy[func](secondTimeOpts) : nodes[func](secondTimeOpts);
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
},{}]},{},[5])(5)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvZGVib3VuY2UuanMiLCJzcmMvZWxlbWVudFV0aWxpdGllcy5qcyIsInNyYy9leHBhbmRDb2xsYXBzZVV0aWxpdGllcy5qcyIsInNyYy9pbmRleC5qcyIsInNyYy91bmRvUmVkb1V0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6dEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSB7XG4gIGVxdWFsQm91bmRpbmdCb3hlczogZnVuY3Rpb24oYmIxLCBiYjIpe1xuICAgICAgcmV0dXJuIGJiMS54MSA9PSBiYjIueDEgJiYgYmIxLngyID09IGJiMi54MiAmJiBiYjEueTEgPT0gYmIyLnkxICYmIGJiMS55MiA9PSBiYjIueTI7XG4gIH0sXG4gIGdldFVuaW9uOiBmdW5jdGlvbihiYjEsIGJiMil7XG4gICAgICB2YXIgdW5pb24gPSB7XG4gICAgICB4MTogTWF0aC5taW4oYmIxLngxLCBiYjIueDEpLFxuICAgICAgeDI6IE1hdGgubWF4KGJiMS54MiwgYmIyLngyKSxcbiAgICAgIHkxOiBNYXRoLm1pbihiYjEueTEsIGJiMi55MSksXG4gICAgICB5MjogTWF0aC5tYXgoYmIxLnkyLCBiYjIueTIpLFxuICAgIH07XG5cbiAgICB1bmlvbi53ID0gdW5pb24ueDIgLSB1bmlvbi54MTtcbiAgICB1bmlvbi5oID0gdW5pb24ueTIgLSB1bmlvbi55MTtcblxuICAgIHJldHVybiB1bmlvbjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBib3VuZGluZ0JveFV0aWxpdGllczsiLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCJ2YXIgZWxlbWVudFV0aWxpdGllcyA9IHtcclxuICBtb3ZlTm9kZXM6IGZ1bmN0aW9uIChwb3NpdGlvbkRpZmYsIG5vZGVzLCBub3RDYWxjVG9wTW9zdE5vZGVzKSB7XHJcbiAgICB2YXIgdG9wTW9zdE5vZGVzID0gbm90Q2FsY1RvcE1vc3ROb2RlcyA/IG5vZGVzIDogdGhpcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3BNb3N0Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSB0b3BNb3N0Tm9kZXNbaV07XHJcbiAgICAgIHZhciBvbGRYID0gbm9kZS5wb3NpdGlvbihcInhcIik7XHJcbiAgICAgIHZhciBvbGRZID0gbm9kZS5wb3NpdGlvbihcInlcIik7XHJcbiAgICAgIG5vZGUucG9zaXRpb24oe1xyXG4gICAgICAgIHg6IG9sZFggKyBwb3NpdGlvbkRpZmYueCxcclxuICAgICAgICB5OiBvbGRZICsgcG9zaXRpb25EaWZmLnlcclxuICAgICAgfSk7XHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgICAgdGhpcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBjaGlsZHJlbiwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZXRUb3BNb3N0Tm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICB2YXIgbm9kZXNNYXAgPSB7fTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcclxuICAgICAgd2hpbGUgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKG5vZGVzTWFwW3BhcmVudC5pZCgpXSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcm9vdHM7XHJcbiAgfSxcclxuICByZWFycmFuZ2U6IGZ1bmN0aW9uIChsYXlvdXRCeSkgey8vKi8vXHJcbiAgICBpZiAodHlwZW9mIGxheW91dEJ5ID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgbGF5b3V0QnkoKTtcclxuICAgIH0gZWxzZSBpZiAobGF5b3V0QnkgIT0gbnVsbCkge1xyXG4gICAgICBjeS5sYXlvdXQobGF5b3V0QnkpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbjogZnVuY3Rpb24gKG1vZGVsUG9zaXRpb24pIHtcclxuICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xyXG4gICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogeCxcclxuICAgICAgeTogeVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGVsZW1lbnRVdGlsaXRpZXM7XHJcbiIsInZhciBib3VuZGluZ0JveFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vYm91bmRpbmdCb3hVdGlsaXRpZXMnKTtcclxudmFyIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKTtcclxuXHJcbi8vIEV4cGFuZCBjb2xsYXBzZSB1dGlsaXRpZXNcclxudmFyIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0ge1xyXG4gIGVkZ2VzVG9SZXBhaXI6IG51bGwsXHJcbiAgLy90aGUgbnVtYmVyIG9mIG5vZGVzIG1vdmluZyBhbmltYXRlZGx5IGFmdGVyIGV4cGFuZCBvcGVyYXRpb25cclxuICBhbmltYXRlZGx5TW92aW5nTm9kZUNvdW50OiAwLFxyXG4gIC8vVGhpcyBpcyBhIG1hcCB3aGljaCBrZWVwcyB0aGUgaW5mb3JtYXRpb24gb2YgY29sbGFwc2VkIG1ldGEgZWRnZXMgdG8gaGFuZGxlIHRoZW0gY29ycmVjdGx5XHJcbiAgY29sbGFwc2VkTWV0YUVkZ2VzSW5mbzoge30sXHJcbiAgLy9UaGlzIG1hcCBrZWVwcyB0cmFjayBvZiB0aGUgbWV0YSBsZXZlbHMgb2YgZWRnZXMgYnkgdGhlaXIgaWQnc1xyXG4gIGVkZ2VzTWV0YUxldmVsczoge30sXHJcbiAgLy9UaGlzIG1ldGhvZCBjaGFuZ2VzIHNvdXJjZSBvciB0YXJnZXQgaWQgb2YgdGhlIGNvbGxhcHNlZCBlZGdlIGRhdGEga2VwdCBpbiB0aGUgZGF0YSBvZiB0aGUgbm9kZVxyXG4gIC8vd2l0aCBpZCBvZiBjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZFxyXG4gIGFsdGVyU291cmNlT3JUYXJnZXRPZkNvbGxhcHNlZEVkZ2U6IGZ1bmN0aW9uIChjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZCwgZWRnZUlkLCBzb3VyY2VPclRhcmdldCkgey8vKi8vXHJcbiAgICB2YXIgbm9kZSA9IGN5LmdldEVsZW1lbnRCeUlkKGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkKVswXTtcclxuICAgIHZhciBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSBub2RlLl9wcml2YXRlLmRhdGEuZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGNvbGxhcHNlZEVkZ2UgPSBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV07XHJcbiAgICAgIGlmIChjb2xsYXBzZWRFZGdlLl9wcml2YXRlLmRhdGEuaWQgPT0gZWRnZUlkKSB7XHJcbiAgICAgICAgY29sbGFwc2VkRWRnZS5fcHJpdmF0ZS5kYXRhW3NvdXJjZU9yVGFyZ2V0XSA9IGNvbGxhcHNlZEVkZ2UuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWROb2RlQmVmb3JlQmVjYW1pbmdNZXRhO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL0EgZnVudGlvbiBiYXNpY2x5IGV4cGFuZGluZyBhIG5vZGUgaXQgaXMgdG8gYmUgY2FsbGVkIHdoZW4gYSBub2RlIGlzIGV4cGFuZGVkIGFueXdheVxyXG4gIGV4cGFuZE5vZGVCYXNlRnVuY3Rpb246IGZ1bmN0aW9uIChub2RlLCB0cmlnZ2VyTGF5b3V0LCBzaW5nbGUsIGxheW91dEJ5KSB7Ly8qLy9cclxuICAgIC8vY2hlY2sgaG93IHRoZSBwb3NpdGlvbiBvZiB0aGUgbm9kZSBpcyBjaGFuZ2VkXHJcbiAgICB2YXIgcG9zaXRpb25EaWZmID0ge1xyXG4gICAgICB4OiBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpLngsXHJcbiAgICAgIHk6IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykueVxyXG4gICAgfTtcclxuXHJcbiAgICBub2RlLnJlbW92ZURhdGEoXCJpbmZvTGFiZWxcIik7XHJcbiAgICBub2RlLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcsICdleHBhbmRlZCcpO1xyXG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLm5vZGVzKCkucmVzdG9yZSgpO1xyXG4gICAgdGhpcy5yZXBhaXJFZGdlc09mQ29sbGFwc2VkQ2hpbGRyZW4obm9kZSk7XHJcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xyXG5cclxuICAgIGN5Lm5vZGVzKCkudXBkYXRlQ29tcG91bmRCb3VuZHMoKTtcclxuXHJcbiAgICAvL0Rvbid0IHNob3cgY2hpbGRyZW4gaW5mbyB3aGVuIHRoZSBjb21wbGV4IG5vZGUgaXMgZXhwYW5kZWRcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuc2JnbmNsYXNzID09IFwiY29tcGxleFwiKSB7XHJcbiAgICAgIG5vZGUucmVtb3ZlU3R5bGUoJ2NvbnRlbnQnKTtcclxuICAgIH1cclxuXHJcbiAgICBlbGVtZW50VXRpbGl0aWVzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIG5vZGUuY2hpbGRyZW4oKSk7XHJcbiAgICBub2RlLnJlbW92ZURhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpO1xyXG5cclxuICAgIGlmIChzaW5nbGUpXHJcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKCk7XHJcbiAgICAvLyByZWZyZXNoUGFkZGluZ3MoKTtcclxuICAgIGlmICh0cmlnZ2VyTGF5b3V0KSB7IC8vKi8qLyphc2RzYWRkYVxyXG4gICAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShsYXlvdXRCeSk7XHJcblxyXG4gICAgfVxyXG4gIH0sXHJcbiAgc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgbm9kZXMuZGF0YShcImNvbGxhcHNlXCIsIHRydWUpO1xyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICBzaW1wbGVFeHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIG5vZGVzLmRhdGEoXCJleHBhbmRcIiwgdHJ1ZSk7XHJcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICBzaW1wbGVFeHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZXMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBub2RlcyA9IGN5Lm5vZGVzKCk7XHJcbiAgICB9XHJcbiAgICB2YXIgb3JwaGFucztcclxuICAgIG9ycGhhbnMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICB2YXIgZXhwYW5kU3RhY2sgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IG9ycGhhbnNbaV07XHJcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGV4cGFuZFN0YWNrO1xyXG4gIH0sXHJcbiAgYmVnaW5PcGVyYXRpb246IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICB9LFxyXG4gIGVuZE9wZXJhdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5lZGdlc1RvUmVwYWlyLnJlc3RvcmUoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lZGdlc1RvUmVwYWlyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gdGhpcy5lZGdlc1RvUmVwYWlyW2ldO1xyXG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZS5pZCgpXSA9PSBudWxsIHx8IHRoaXMuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gPT0gMCkge1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGVkZ2UuYWRkQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmVkZ2VzVG9SZXBhaXIgPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgfSxcclxuICBleHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7Ly8qLy9cclxuICAgIHRoaXMuYmVnaW5PcGVyYXRpb24oKTtcclxuICAgIGN5LnRyaWdnZXIoXCJiZWZvcmVFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcbiAgICB2YXIgZXhwYW5kZWRTdGFjayA9IHRoaXMuc2ltcGxlRXhwYW5kQWxsTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XHJcbiAgICBjeS50cmlnZ2VyKFwiYWZ0ZXJFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcblxyXG4gICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcclxuXHJcbiAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGV4cGFuZGVkU3RhY2s7XHJcbiAgfSxcclxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICBleHBhbmRTdGFjay5wdXNoKHJvb3QpO1xyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24obm9kZSwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vRXhwYW5kIHRoZSBnaXZlbiBub2RlcyBwZXJmb3JtIGluY3JlbWVudGFsIGxheW91dCBhZnRlciBleHBhbmRhdGlvblxyXG4gIGV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICB0aGlzLmJlZ2luT3BlcmF0aW9uKCk7XHJcbiAgICBjeS50cmlnZ2VyKFwiYmVmb3JlRXhwYW5kXCIsIFtub2Rlcywgb3B0aW9uc10pO1xyXG4gICAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICB0aGlzLmV4cGFuZE5vZGUobm9kZXNbMF0sIG9wdGlvbnMuZmlzaGV5ZSwgb3B0aW9ucy5hbmltYXRlLCBvcHRpb25zLmxheW91dEJ5KTtcclxuICAgICAgY3kudHJpZ2dlcihcImFmdGVyRXhwYW5kXCIsIFtub2Rlcywgb3B0aW9uc10pO1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcclxuICAgICAgY3kudHJpZ2dlcihcImFmdGVyRXhwYW5kXCIsIFtub2Rlcywgb3B0aW9uc10pO1xyXG5cclxuICAgICAgZWxlbWVudFV0aWxpdGllcy5yZWFycmFuZ2Uob3B0aW9ucy5sYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGVzIHRoZW4gbWFrZSBpbmNyZW1lbnRhbCBsYXlvdXRcclxuICBjb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICB0aGlzLmJlZ2luT3BlcmF0aW9uKCk7XHJcbiAgICBjeS50cmlnZ2VyKFwiYmVmb3JlQ29sbGFwc2VcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcbiAgICB0aGlzLnNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucyk7XHJcbiAgICBjeS50cmlnZ2VyKFwiYmVmb3JlQ29sbGFwc2VcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcblxyXG4gICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcclxuICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBub2RlcyBpbiBib3R0b20gdXAgb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxyXG4gIGNvbGxhcHNlQm90dG9tVXA6IGZ1bmN0aW9uIChyb290KSB7Ly8qLy9cclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKG5vZGUpO1xyXG4gICAgfVxyXG4gICAgLy9JZiB0aGUgcm9vdCBpcyBhIGNvbXBvdW5kIG5vZGUgdG8gYmUgY29sbGFwc2VkIHRoZW4gY29sbGFwc2UgaXRcclxuICAgIGlmIChyb290LmRhdGEoXCJjb2xsYXBzZVwiKSAmJiByb290LmNoaWxkcmVuKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICB0aGlzLnNpbXBsZUNvbGxhcHNlTm9kZShyb290KTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiY29sbGFwc2VcIik7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2V4cGFuZCB0aGUgbm9kZXMgaW4gdG9wIGRvd24gb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxyXG4gIGV4cGFuZFRvcERvd246IGZ1bmN0aW9uIChyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkgey8vKi8vXHJcbiAgICBpZiAocm9vdC5kYXRhKFwiZXhwYW5kXCIpICYmIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImV4cGFuZFwiKTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKG5vZGUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGZpc2hleWUsIGFuaW1hdGUsIGxheW91dEJ5KSB7XHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5zaW1wbGVFeHBhbmROb2RlKG5vZGUsIGZpc2hleWUsIHRydWUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuXHJcbiAgICAgIC8qXHJcbiAgICAgICAqIHJldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgICovXHJcbiAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgY29udmVydFRvTW9kZWxQb3NpdGlvbjogZnVuY3Rpb24gKHJlbmRlcmVkUG9zaXRpb24pIHtcclxuICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgIHZhciB4ID0gKHJlbmRlcmVkUG9zaXRpb24ueCAtIHBhbi54KSAvIHpvb207XHJcbiAgICB2YXIgeSA9IChyZW5kZXJlZFBvc2l0aW9uLnkgLSBwYW4ueSkgLyB6b29tO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IHgsXHJcbiAgICAgIHk6IHlcclxuICAgIH07XHJcbiAgfSxcclxuICAvKlxyXG4gICAqXHJcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZVxyXG4gICAqIHdpdGhvdXQgbWFraW5nIGluY3JlbWVudGFsIGxheW91dFxyXG4gICAqIGFmdGVyIGV4cGFuZCBvcGVyYXRpb24gaXQgd2lsbCBiZSBzaW1wbHlcclxuICAgKiB1c2VkIHRvIHVuZG8gdGhlIGNvbGxhcHNlIG9wZXJhdGlvblxyXG4gICAqL1xyXG4gIHNpbXBsZUV4cGFuZE5vZGU6IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSkgey8vKi8vXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdmFyIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSkge1xyXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuXHJcbiAgICAgICAgbm9kZS5kYXRhKCd3aWR0aC1iZWZvcmUtZmlzaGV5ZScsIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS53KTtcclxuICAgICAgICBub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScsIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oKTtcclxuXHJcbiAgICAgICAgc2VsZi5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLCBzaW5nbGVOb3RTaW1wbGUsIG5vZGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFzaW5nbGVOb3RTaW1wbGUgfHwgIWFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlIHx8ICFhbmltYXRlKSB7XHJcbiAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgc2luZ2xlTm90U2ltcGxlLCBsYXlvdXRCeSk7IC8vKioqKipcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUpO1xyXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUgJiYgc2luZ2xlTm90U2ltcGxlKSB7XHJcbiAgICAgICAgdmFyIHRvcExlZnRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogMCwgeTogMH0pO1xyXG4gICAgICAgIHZhciBib3R0b21SaWdodFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiBjeS53aWR0aCgpLCB5OiBjeS5oZWlnaHQoKX0pO1xyXG4gICAgICAgIHZhciBwYWRkaW5nID0gODA7XHJcbiAgICAgICAgdmFyIGJiID0ge1xyXG4gICAgICAgICAgeDE6IHRvcExlZnRQb3NpdGlvbi54LFxyXG4gICAgICAgICAgeDI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueCxcclxuICAgICAgICAgIHkxOiB0b3BMZWZ0UG9zaXRpb24ueSxcclxuICAgICAgICAgIHkyOiBib3R0b21SaWdodFBvc2l0aW9uLnlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgbm9kZUJCID0ge1xyXG4gICAgICAgICAgeDE6IG5vZGUucG9zaXRpb24oJ3gnKSAtIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS53IC8gMiAtIHBhZGRpbmcsXHJcbiAgICAgICAgICB4Mjogbm9kZS5wb3NpdGlvbigneCcpICsgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncgLyAyICsgcGFkZGluZyxcclxuICAgICAgICAgIHkxOiBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykuaCAvIDIgLSBwYWRkaW5nLFxyXG4gICAgICAgICAgeTI6IG5vZGUucG9zaXRpb24oJ3knKSArIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oIC8gMiArIHBhZGRpbmdcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgdW5pb25CQiA9IGJvdW5kaW5nQm94VXRpbGl0aWVzLmdldFVuaW9uKG5vZGVCQiwgYmIpO1xyXG4gICAgICAgIHZhciBhbmltYXRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKCFib3VuZGluZ0JveFV0aWxpdGllcy5lcXVhbEJvdW5kaW5nQm94ZXModW5pb25CQiwgYmIpKSB7XHJcbiAgICAgICAgICB2YXIgdmlld1BvcnQgPSBjeS5nZXRGaXRWaWV3cG9ydCh1bmlvbkJCLCAxMCk7XHJcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgICBhbmltYXRpbmcgPSBhbmltYXRlO1xyXG4gICAgICAgICAgaWYgKGFuaW1hdGUpIHtcclxuICAgICAgICAgICAgY3kuYW5pbWF0ZSh7XHJcbiAgICAgICAgICAgICAgcGFuOiB2aWV3UG9ydC5wYW4sXHJcbiAgICAgICAgICAgICAgem9vbTogdmlld1BvcnQuem9vbSxcclxuICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICBkdXJhdGlvbjogMTAwMFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjeS56b29tKHZpZXdQb3J0Lnpvb20pO1xyXG4gICAgICAgICAgICBjeS5wYW4odmlld1BvcnQucGFuKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFhbmltYXRpbmcpIHtcclxuICAgICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGUgd2l0aG91dCBtYWtpbmcgaW5jcmVtZW50YWwgbGF5b3V0XHJcbiAgc2ltcGxlQ29sbGFwc2VOb2RlOiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnLCB7XHJcbiAgICAgICAgeDogbm9kZS5wb3NpdGlvbigpLngsXHJcbiAgICAgICAgeTogbm9kZS5wb3NpdGlvbigpLnlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHc6IG5vZGUub3V0ZXJXaWR0aCgpLFxyXG4gICAgICAgIGg6IG5vZGUub3V0ZXJIZWlnaHQoKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5vZGUuY2hpbGRyZW4oKS51bnNlbGVjdCgpO1xyXG4gICAgICBub2RlLmNoaWxkcmVuKCkuY29ubmVjdGVkRWRnZXMoKS51bnNlbGVjdCgpO1xyXG5cclxuICAgICAgbm9kZS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnLCAnY29sbGFwc2VkJyk7XHJcblxyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcblxyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICAgIHRoaXMuYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuKG5vZGUsIGNoaWxkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihub2RlLCBub2RlKTtcclxuICAgICAgLy8gcmVmcmVzaFBhZGRpbmdzKCk7XHJcblxyXG4gICAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLnNiZ25jbGFzcyA9PSBcImNvbXBsZXhcIikge1xyXG4gICAgICAgIG5vZGUuYWRkQ2xhc3MoJ2NoYW5nZUNvbnRlbnQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbm9kZS5wb3NpdGlvbihub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpKTtcclxuXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIHN0b3JlV2lkdGhIZWlnaHQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIGlmIChub2RlICE9IG51bGwpIHtcclxuICAgICAgbm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJywgdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKSk7XHJcbiAgICAgIG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScsIHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSkpO1xyXG4gICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5vdXRlcldpZHRoKCkpO1xyXG4gICAgICBub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScsIG5vZGUub3V0ZXJIZWlnaHQoKSk7XHJcblxyXG4gICAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUucGFyZW50KClbMF0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH0sXHJcbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGVOb3RTaW1wbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpIHsvLyovL1xyXG4gICAgdmFyIHNpYmxpbmdzID0gdGhpcy5nZXRTaWJsaW5ncyhub2RlKTtcclxuXHJcbiAgICB2YXIgeF9hID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuICAgIHZhciB5X2EgPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG5cclxuICAgIHZhciBkX3hfbGVmdCA9IE1hdGguYWJzKChub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcclxuICAgIHZhciBkX3hfcmlnaHQgPSBNYXRoLmFicygobm9kZS5kYXRhKCd3aWR0aC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XHJcbiAgICB2YXIgZF95X3VwcGVyID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XHJcbiAgICB2YXIgZF95X2xvd2VyID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XHJcblxyXG4gICAgdmFyIGFic19kaWZmX29uX3ggPSBNYXRoLmFicyhub2RlLmRhdGEoJ3gtYmVmb3JlLWZpc2hleWUnKSAtIHhfYSk7XHJcbiAgICB2YXIgYWJzX2RpZmZfb25feSA9IE1hdGguYWJzKG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScpIC0geV9hKTtcclxuXHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBMRUZUXHJcbiAgICBpZiAobm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJykgPiB4X2EpIHtcclxuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCArIGFic19kaWZmX29uX3g7XHJcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCAtIGFic19kaWZmX29uX3g7XHJcbiAgICB9XHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBSSUdIVFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgLSBhYnNfZGlmZl9vbl94O1xyXG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgKyBhYnNfZGlmZl9vbl94O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIFVQXHJcbiAgICBpZiAobm9kZS5kYXRhKCd5LWJlZm9yZS1maXNoZXllJykgPiB5X2EpIHtcclxuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyICsgYWJzX2RpZmZfb25feTtcclxuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyIC0gYWJzX2RpZmZfb25feTtcclxuICAgIH1cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIERPV05cclxuICAgIGVsc2Uge1xyXG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgLSBhYnNfZGlmZl9vbl95O1xyXG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgKyBhYnNfZGlmZl9vbl95O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB4UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XHJcbiAgICB2YXIgeVBvc0luUGFyZW50U2libGluZyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgeFBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueFBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcclxuICAgICAgeVBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueVBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3NbaV07XHJcblxyXG4gICAgICB2YXIgeF9iID0geFBvc0luUGFyZW50U2libGluZ1tpXTtcclxuICAgICAgdmFyIHlfYiA9IHlQb3NJblBhcmVudFNpYmxpbmdbaV07XHJcblxyXG4gICAgICB2YXIgc2xvcGUgPSAoeV9iIC0geV9hKSAvICh4X2IgLSB4X2EpO1xyXG5cclxuICAgICAgdmFyIGRfeCA9IDA7XHJcbiAgICAgIHZhciBkX3kgPSAwO1xyXG4gICAgICB2YXIgVF94ID0gMDtcclxuICAgICAgdmFyIFRfeSA9IDA7XHJcblxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExFRlRcclxuICAgICAgaWYgKHhfYSA+IHhfYikge1xyXG4gICAgICAgIGRfeCA9IGRfeF9sZWZ0O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgUklHSFRcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZF94ID0gZF94X3JpZ2h0O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgVVBQRVIgc2lkZVxyXG4gICAgICBpZiAoeV9hID4geV9iKSB7XHJcbiAgICAgICAgZF95ID0gZF95X3VwcGVyO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTE9XRVIgc2lkZVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBkX3kgPSBkX3lfbG93ZXI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpc0Zpbml0ZShzbG9wZSkpIHtcclxuICAgICAgICBUX3ggPSBNYXRoLm1pbihkX3gsIChkX3kgLyBNYXRoLmFicyhzbG9wZSkpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNsb3BlICE9PSAwKSB7XHJcbiAgICAgICAgVF95ID0gTWF0aC5taW4oZF95LCAoZF94ICogTWF0aC5hYnMoc2xvcGUpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcclxuICAgICAgICBUX3ggPSAtMSAqIFRfeDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHlfYSA+IHlfYikge1xyXG4gICAgICAgIFRfeSA9IC0xICogVF95O1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoc2libGluZywgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLnBhcmVudCgpWzBdLCBzaW5nbGVOb3RTaW1wbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH0sXHJcbiAgZ2V0U2libGluZ3M6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBzaWJsaW5ncztcclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSA9PSBudWxsKSB7XHJcbiAgICAgIHNpYmxpbmdzID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKCkub3JwaGFucygpO1xyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKG9ycGhhbnNbaV0gIT0gbm9kZSkge1xyXG4gICAgICAgICAgc2libGluZ3MgPSBzaWJsaW5ncy5hZGQob3JwaGFuc1tpXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzaWJsaW5ncyA9IG5vZGUuc2libGluZ3MoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2libGluZ3M7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIE1vdmUgbm9kZSBvcGVyYXRpb24gc3BlY2lhbGl6ZWQgZm9yIGZpc2ggZXllIHZpZXcgZXhwYW5kIG9wZXJhdGlvblxyXG4gICAqIE1vdmVzIHRoZSBub2RlIGJ5IG1vdmluZyBpdHMgZGVzY2FuZGVudHMuIE1vdmVtZW50IGlzIGFuaW1hdGVkIGlmIHNpbmdsZU5vdFNpbXBsZSBmbGFnIGlzIHRydXRoeS5cclxuICAgKi9cclxuICBmaXNoRXllVmlld01vdmVOb2RlOiBmdW5jdGlvbiAobm9kZSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSkgey8vKi8vXHJcbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIGlmIChjaGlsZHJlbkxpc3QubGVuZ3RoID09IDApIHtcclxuICAgICAgdmFyIG5ld1Bvc2l0aW9uID0ge3g6IG5vZGUucG9zaXRpb24oJ3gnKSArIFRfeCwgeTogbm9kZS5wb3NpdGlvbigneScpICsgVF95fTtcclxuICAgICAgaWYgKCFzaW5nbGVOb3RTaW1wbGUgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBub2RlLnBvc2l0aW9uKG5ld1Bvc2l0aW9uKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcclxuICAgICAgICBub2RlLmFuaW1hdGUoe1xyXG4gICAgICAgICAgcG9zaXRpb246IG5ld1Bvc2l0aW9uLFxyXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50LS07XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQgPiAwIHx8IG5vZGVUb0V4cGFuZC5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnKSA9PT0gJ2V4cGFuZGVkJykge1xyXG5cclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZU5vdFNpbXBsZSwgdHJ1ZSwgbGF5b3V0QnkpO1xyXG5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICBkdXJhdGlvbjogMTAwMFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW5MaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHhQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuICAgIHZhciB4X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeF9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd4JykgKyAocGFyZW50LndpZHRoKCkgLyAyKTtcclxuICAgIH1cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucG9zaXRpb24oJ3gnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geF9hO1xyXG4gIH0sXHJcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xyXG5cclxuICAgIHZhciB5X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeV9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd5JykgKyAocGFyZW50LmhlaWdodCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHlfYTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxyXG4gICAqIHdpdGggdGhlIHNhbWUgcm9vdCBwYXJhbWV0ZXIsXHJcbiAgICogcmVtb3ZlIHRoZSBjaGlsZCBhbmQgYWRkIHRoZSByZW1vdmVkIGNoaWxkIHRvIHRoZSBjb2xsYXBzZWRjaGlsZHJlbiBkYXRhXHJcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXHJcbiAgICogcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuIGtlZXBzIHRoZSBub2RlcyB0byByZXN0b3JlIHdoZW4gdGhlXHJcbiAgICogcm9vdCBpcyBleHBhbmRlZFxyXG4gICAqL1xyXG4gIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkgey8vKi8vXHJcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKGNoaWxkLCByb290KTtcclxuICAgICAgdmFyIHJlbW92ZWRDaGlsZCA9IGNoaWxkLnJlbW92ZSgpO1xyXG4gICAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkQ2hpbGQ7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHJlbW92ZWRDaGlsZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIC8qXHJcbiAgICogVGhpcyBtZXRob2QgbGV0IHRoZSByb290IHBhcmFtZXRlciB0byBiYXJyb3cgdGhlIGVkZ2VzIGNvbm5lY3RlZCB0byB0aGVcclxuICAgKiBjaGlsZCBub2RlIG9yIGFueSBub2RlIGluc2lkZSBjaGlsZCBub2RlIGlmIHRoZSBhbnkgb25lIHRoZSBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAqIGlzIGFuIG91dGVyIG5vZGUgb2YgdGhlIHJvb3Qgbm9kZSBpbiBvdGhlciB3b3JkIGl0IGNyZWF0ZSBtZXRhIGVkZ2VzXHJcbiAgICovXHJcbiAgYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbiAocm9vdCwgY2hpbGROb2RlKSB7Ly8qLy9cclxuICAgIHZhciBjaGlsZHJlbiA9IGNoaWxkTm9kZS5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ocm9vdCwgY2hpbGQpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBlZGdlcyA9IGNoaWxkTm9kZS5jb25uZWN0ZWRFZGdlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgc291cmNlID0gZWRnZS5kYXRhKFwic291cmNlXCIpO1xyXG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS5kYXRhKFwidGFyZ2V0XCIpO1xyXG4gICAgICB2YXIgc291cmNlTm9kZSA9IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgIHZhciB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQoKTtcclxuXHJcbiAgICAgIHZhciBuZXdFZGdlID0gIHt9OyAvL2pRdWVyeS5leHRlbmQodHJ1ZSwge30sIGVkZ2UuanNvbnMoKVswXSk7XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBlZGdlLmpzb25zKClbMF0pXHJcbiAgICAgICAgbmV3RWRnZVtrZXldID0gZWRnZS5qc29ucygpWzBdW2tleV07XHJcblxyXG4gICAgICAvL0luaXRpbGl6ZSB0aGUgbWV0YSBsZXZlbCBvZiB0aGlzIGVkZ2UgaWYgaXQgaXMgbm90IGluaXRpbGl6ZWQgeWV0XHJcbiAgICAgIGlmICh0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID09IG51bGwpIHtcclxuICAgICAgICB0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID0gMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLypJZiB0aGUgZWRnZSBpcyBtZXRhIGFuZCBoYXMgZGlmZmVyZW50IHNvdXJjZSBhbmQgdGFyZ2V0cyB0aGVuIGhhbmRsZSB0aGlzIGNhc2UgYmVjYXVzZSBpZlxyXG4gICAgICAgKiB0aGUgb3RoZXIgZW5kIG9mIHRoaXMgZWRnZSBpcyByZW1vdmVkIGJlY2F1c2Ugb2YgdGhlIHJlYXNvbiB0aGF0IGl0J3MgcGFyZW50IGlzXHJcbiAgICAgICAqIGJlaW5nIGNvbGxhcHNlZCBhbmQgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGJlZm9yZSBvdGhlciBlbmQgaXMgc3RpbGwgY29sbGFwc2VkIHRoaXMgY2F1c2VzXHJcbiAgICAgICAqIHRoYXQgdGhpcyBlZGdlIGNhbm5vdCBiZSByZXN0b3JlZCBhcyBvbmUgZW5kIG5vZGUgb2YgaXQgZG9lcyBub3QgZXhpc3RzLlxyXG4gICAgICAgKiBDcmVhdGUgYSBjb2xsYXBzZWQgbWV0YSBlZGdlIGluZm8gZm9yIHRoaXMgZWRnZSBhbmQgYWRkIHRoaXMgaW5mbyB0byBjb2xsYXBzZWRNZXRhRWRnZXNJbmZvXHJcbiAgICAgICAqIG1hcC4gVGhpcyBpbmZvIGluY2x1ZGVzIGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkKHRoZSBub2RlIHdoaWNoIGlzIGJlaW5nIGNvbGxhcHNlZCksXHJcbiAgICAgICAqIG90aGVyRW5kKHRoZSBvdGhlciBlbmQgb2YgdGhpcyBlZGdlKSBhbmQgb2xkT3duZXIodGhlIG93bmVyIG9mIHRoaXMgZWRnZSB3aGljaCB3aWxsIGJlY29tZVxyXG4gICAgICAgKiBhbiBvbGQgb3duZXIgYWZ0ZXIgY29sbGFwc2Ugb3BlcmF0aW9uKVxyXG4gICAgICAgKi9cclxuICAgICAgaWYgKHRoaXMuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gIT0gMCAmJiBzb3VyY2UgIT0gdGFyZ2V0KSB7XHJcbiAgICAgICAgdmFyIG90aGVyRW5kID0gbnVsbDtcclxuICAgICAgICB2YXIgb2xkT3duZXIgPSBudWxsO1xyXG4gICAgICAgIGlmIChzb3VyY2UgPT0gY2hpbGROb2RlLmlkKCkpIHtcclxuICAgICAgICAgIG90aGVyRW5kID0gdGFyZ2V0O1xyXG4gICAgICAgICAgb2xkT3duZXIgPSBzb3VyY2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHRhcmdldCA9PSBjaGlsZE5vZGUuaWQoKSkge1xyXG4gICAgICAgICAgb3RoZXJFbmQgPSBzb3VyY2U7XHJcbiAgICAgICAgICBvbGRPd25lciA9IHRhcmdldDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGluZm8gPSB7XHJcbiAgICAgICAgICBjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZDogcm9vdC5pZCgpLFxyXG4gICAgICAgICAgb3RoZXJFbmQ6IG90aGVyRW5kLFxyXG4gICAgICAgICAgb2xkT3duZXI6IG9sZE93bmVyXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAodGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bb3RoZXJFbmRdID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9IHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL3RoZSBpbmZvcm1hdGlvbiBzaG91bGQgYmUgcmVhY2hhYmxlIGJ5IGVkZ2UgaWQgYW5kIG5vZGUgaWQnc1xyXG4gICAgICAgIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tyb290LmlkKCldW290aGVyRW5kXSA9IGluZm87XHJcbiAgICAgICAgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXVtyb290LmlkKCldID0gaW5mbztcclxuICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZS5pZCgpXSA9IGluZm87XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciByZW1vdmVkRWRnZSA9IGVkZ2UucmVtb3ZlKCk7XHJcbiAgICAgIC8vc3RvcmUgdGhlIGRhdGEgb2YgdGhlIG9yaWdpbmFsIGVkZ2VcclxuICAgICAgLy90byByZXN0b3JlIHdoZW4gdGhlIG5vZGUgaXMgZXhwYW5kZWRcclxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkRWRnZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID1cclxuICAgICAgICAgICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4udW5pb24ocmVtb3ZlZEVkZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL0RvIG5vdCBoYW5kbGUgdGhlIGlubmVyIGVkZ2VzXHJcbiAgICAgIGlmICghdGhpcy5pc091dGVyTm9kZShzb3VyY2VOb2RlLCByb290KSAmJiAhdGhpcy5pc091dGVyTm9kZSh0YXJnZXROb2RlLCByb290KSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL0lmIHRoZSBjaGFuZ2Ugc291cmNlIGFuZC9vciB0YXJnZXQgb2YgdGhlIGVkZ2UgaW4gdGhlXHJcbiAgICAgIC8vY2FzZSBvZiB0aGV5IGFyZSBlcXVhbCB0byB0aGUgaWQgb2YgdGhlIGNvbGxhcHNlZCBjaGlsZFxyXG4gICAgICBpZiAoc291cmNlID09IGNoaWxkTm9kZS5pZCgpKSB7XHJcbiAgICAgICAgc291cmNlID0gcm9vdC5pZCgpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0YXJnZXQgPT0gY2hpbGROb2RlLmlkKCkpIHtcclxuICAgICAgICB0YXJnZXQgPSByb290LmlkKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vcHJlcGFyZSB0aGUgbmV3IGVkZ2UgYnkgY2hhbmdpbmcgdGhlIG9sZGVyIHNvdXJjZSBhbmQvb3IgdGFyZ2V0XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5wb3J0c291cmNlID0gc291cmNlO1xyXG4gICAgICBuZXdFZGdlLmRhdGEucG9ydHRhcmdldCA9IHRhcmdldDtcclxuICAgICAgbmV3RWRnZS5kYXRhLnNvdXJjZSA9IHNvdXJjZTtcclxuICAgICAgbmV3RWRnZS5kYXRhLnRhcmdldCA9IHRhcmdldDtcclxuICAgICAgLy9yZW1vdmUgdGhlIG9sZGVyIGVkZ2UgYW5kIGFkZCB0aGUgbmV3IG9uZVxyXG4gICAgICBjeS5hZGQobmV3RWRnZSk7XHJcbiAgICAgIHZhciBuZXdDeUVkZ2UgPSBjeS5lZGdlcygpW2N5LmVkZ2VzKCkubGVuZ3RoIC0gMV07XHJcbiAgICAgIC8vSWYgdGhpcyBlZGdlIGhhcyBub3QgbWV0YSBjbGFzcyBwcm9wZXJ0aWVzIG1ha2UgaXQgbWV0YVxyXG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbbmV3Q3lFZGdlLmlkKCldID09IDApIHtcclxuICAgICAgICBuZXdDeUVkZ2UuYWRkQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vSW5jcmVhc2UgdGhlIG1ldGEgbGV2ZWwgb2YgdGhpcyBlZGdlIGJ5IDFcclxuICAgICAgdGhpcy5lZGdlc01ldGFMZXZlbHNbbmV3Q3lFZGdlLmlkKCldKys7XHJcbiAgICAgIG5ld0N5RWRnZS5kYXRhKFwiY29sbGFwc2VkTm9kZUJlZm9yZUJlY2FtaW5nTWV0YVwiLCBjaGlsZE5vZGUuaWQoKSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoaXMgbWV0aG9kIHJlcGFpcnMgdGhlIGVkZ2VzIG9mIHRoZSBjb2xsYXBzZWQgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIG5vZGVcclxuICAgKiB3aGVuIHRoZSBub2RlIGlzIGJlaW5nIGV4cGFuZGVkLCB0aGUgbWV0YSBlZGdlcyBjcmVhdGVkIHdoaWxlIHRoZSBub2RlIGlzXHJcbiAgICogYmVpbmcgY29sbGFwc2VkIGFyZSBoYW5kbGVkIGluIHRoaXMgbWV0aG9kXHJcbiAgICovXHJcbiAgcmVwYWlyRWRnZXNPZkNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSkgeyAvLyovL1xyXG4gICAgdmFyIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICBpZiAoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbGxhcHNlZE1ldGFFZGdlSW5mb09mTm9kZSA9IHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tub2RlLmlkKCldO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgLy9IYW5kbGUgY29sbGFwc2VkIG1ldGEgZWRnZSBpbmZvIGlmIGl0IGlzIHJlcXVpcmVkXHJcbiAgICAgIGlmIChjb2xsYXBzZWRNZXRhRWRnZUluZm9PZk5vZGUgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZF0gIT0gbnVsbCkge1xyXG4gICAgICAgIHZhciBpbmZvID0gdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkXTtcclxuICAgICAgICAvL0lmIHRoZSBtZXRhIGVkZ2UgaXMgbm90IGNyZWF0ZWQgYmVjYXVzZSBvZiB0aGUgcmVhc29uIHRoYXQgdGhpcyBub2RlIGlzIGNvbGxhcHNlZFxyXG4gICAgICAgIC8vaGFuZGxlIGl0IGJ5IGNoYW5naW5nIHNvdXJjZSBvciB0YXJnZXQgb2YgcmVsYXRlZCBlZGdlIGRhdGFzXHJcbiAgICAgICAgaWYgKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQgIT0gbm9kZS5pZCgpKSB7XHJcbiAgICAgICAgICBpZiAoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuc291cmNlID09IGluZm8ub2xkT3duZXIpIHtcclxuICAgICAgICAgICAgZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuc291cmNlID0gaW5mby5jcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZDtcclxuICAgICAgICAgICAgdGhpcy5hbHRlclNvdXJjZU9yVGFyZ2V0T2ZDb2xsYXBzZWRFZGdlKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRcclxuICAgICAgICAgICAgICAgICAgICAsIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkLCBcInRhcmdldFwiKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9PSBpbmZvLm9sZE93bmVyKSB7XHJcbiAgICAgICAgICAgIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9IGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWx0ZXJTb3VyY2VPclRhcmdldE9mQ29sbGFwc2VkRWRnZShpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXHJcbiAgICAgICAgICAgICAgICAgICAgLCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZCwgXCJzb3VyY2VcIik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vRGVsZXRlIHRoZSByZWxhdGVkIGNvbGxhcHNlZE1ldGFFZGdlc0luZm8ncyBhcyB0aGV5IGFyZSBoYW5kbGVkXHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXVtpbmZvLm90aGVyRW5kXTtcclxuICAgICAgICBkZWxldGUgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2luZm8ub3RoZXJFbmRdW2luZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRdO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBvbGRFZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWQpO1xyXG4gICAgICAvL0lmIHRoZSBlZGdlIGlzIGFscmVhZHkgaW4gdGhlIGdyYXBoIHJlbW92ZSBpdCBhbmQgZGVjcmVhc2UgaXQncyBtZXRhIGxldmVsXHJcbiAgICAgIGlmIChvbGRFZGdlICE9IG51bGwgJiYgb2xkRWRnZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdLS07XHJcbiAgICAgICAgb2xkRWRnZS5yZW1vdmUoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuLnJlc3RvcmUoKTsqL1xyXG5cclxuICAgIC8vQ2hlY2sgZm9yIG1ldGEgbGV2ZWxzIG9mIGVkZ2VzIGFuZCBoYW5kbGUgdGhlIGNoYW5nZXNcclxuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IHRoaXMuZWRnZXNUb1JlcGFpci51bmlvbihlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4pO1xyXG5cclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xyXG4gIH0sXHJcbiAgLypub2RlIGlzIGFuIG91dGVyIG5vZGUgb2Ygcm9vdFxyXG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxyXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXHJcbiAgaXNPdXRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCByb290KSB7Ly8qLy9cclxuICAgIHZhciB0ZW1wID0gbm9kZTtcclxuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRlbXAgPT0gcm9vdCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXM7IiwiO1xyXG4oZnVuY3Rpb24gKCQkLCAkKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICB2YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzJyk7XHJcbiAgdmFyIHVuZG9SZWRvVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91bmRvUmVkb1V0aWxpdGllcycpO1xyXG4gIHZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxuICB2YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpO1xyXG5cclxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSkge1xyXG5cclxuICAgIGlmICghY3l0b3NjYXBlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXHJcblxyXG4gICAgdmFyIGN5O1xyXG4gICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZVxyXG4gICAgICBmaXNoZXllOiB0cnVlLFxyXG4gICAgICBhbmltYXRlOiB0cnVlLFxyXG4gICAgICByZWFkeTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB9LFxyXG4gICAgICB1bmRvYWJsZTogdHJ1ZSwgLy8gYW5kIGlmIHVuZG9SZWRvRXh0ZW5zaW9uIGV4aXN0cyxcclxuICAgICAgZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjogJ3RvcC1sZWZ0JywgLy8gZGVmYXVsdCBjdWUgcG9zaXRpb24gaXMgdG9wIGxlZnQgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gcGVyIG5vZGUgdG9vXHJcbiAgICAgIGV4cGFuZENvbGxhcHNlQ3VlU2l6ZTogMTIsIC8vIHNpemUgb2YgZXhwYW5kLWNvbGxhcHNlIGN1ZVxyXG4gICAgICBleHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplOiA4LCAvLyBzaXplIG9mIGxpbmVzIHVzZWQgZm9yIGRyYXdpbmcgcGx1cy1taW51cyBpY29uc1xyXG4gICAgICBleHBhbmRDdWVJbWFnZTogdW5kZWZpbmVkLCAvLyBpbWFnZSBvZiBleHBhbmQgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGV4cGFuZCBjdWVcclxuICAgICAgY29sbGFwc2VDdWVJbWFnZTogdW5kZWZpbmVkLCAvLyBpbWFnZSBvZiBjb2xsYXBzZSBpY29uIGlmIHVuZGVmaW5lZCBkcmF3IHJlZ3VsYXIgY29sbGFwc2UgY3VlXHJcbiAgICAgIGV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHk6IDEgLy8gc2Vuc2l0aXZpdHkgb2YgZXhwYW5kLWNvbGxhcHNlIGN1ZXNcclxuICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0T3B0aW9ucyhmcm9tKSB7XHJcbiAgICAgIHZhciB0ZW1wT3B0cyA9IHt9O1xyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucylcclxuICAgICAgICB0ZW1wT3B0c1trZXldID0gb3B0aW9uc1trZXldO1xyXG5cclxuICAgICAgZm9yICh2YXIga2V5IGluIGZyb20pXHJcbiAgICAgICAgaWYgKHRlbXBPcHRzLmhhc093blByb3BlcnR5KGtleSkpXHJcbiAgICAgICAgICB0ZW1wT3B0c1trZXldID0gZnJvbVtrZXldO1xyXG4gICAgICByZXR1cm4gdGVtcE9wdHM7XHJcbiAgICB9XHJcblxyXG4gICAgJC5mbi5jeXRvc2NhcGVFeHBhbmRDb2xsYXBzZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgICAgdmFyIGZuID0gcGFyYW1zO1xyXG5cclxuICAgICAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgICAgICBvcHRpb246IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xyXG4gICAgICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xyXG4gICAgICAgICAgdmFyIGRhdGEgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZXhwYW5kY29sbGFwc2UnKTtcclxuXHJcbiAgICAgICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgb3B0aW9ucyA9IGRhdGEub3B0aW9ucztcclxuXHJcbiAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5hbWUgPT0gdHlwZW9mIHt9KSB7XHJcbiAgICAgICAgICAgICAgdmFyIG5ld09wdHMgPSBuYW1lO1xyXG4gICAgICAgICAgICAgIG9wdGlvbnMgPSBzZXRPcHRpb25zKG5ld09wdHMpO1xyXG4gICAgICAgICAgICAgIGRhdGEub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnNbbmFtZV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnNbbmFtZV0gPSB2YWx1ZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAkY29udGFpbmVyLmRhdGEoJ2N5ZXhwYW5kY29sbGFwc2UnLCBkYXRhKTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gJGNvbnRhaW5lcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgIHZhciBvcHRzID0gc2V0T3B0aW9ucyhwYXJhbXMpO1xyXG4gICAgICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xyXG4gICAgICAgICAgdmFyIGN5O1xyXG4gICAgICAgICAgdmFyICRjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcclxuXHJcbiAgICAgICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRjYW52YXNcclxuICAgICAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgICAgICAgICAgICAuYXR0cignd2lkdGgnLCAkY29udGFpbmVyLndpZHRoKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgJ3RvcCc6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAnbGVmdCc6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICA7XHJcblxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xyXG4gICAgICAgICAgICAgIHZhciBjb250YWluZXJCYiA9ICRjb250YWluZXIub2Zmc2V0KCk7XHJcblxyXG4gICAgICAgICAgICAgICRjYW52YXNcclxuICAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAndG9wJzogLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgICAgIGlmKGN5KXtcclxuICAgICAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAwKTtcclxuXHJcbiAgICAgICAgICB9LCAyNTApO1xyXG5cclxuICAgICAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgICAgIF9zaXplQ2FudmFzKCk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgICAgICQod2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNpemVDYW52YXMoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHZhciBjdHggPSAkY2FudmFzWzBdLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4gICAgICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXHJcbiAgICAgICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3lleHBhbmRjb2xsYXBzZScpO1xyXG4gICAgICAgICAgaWYgKGRhdGEgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBkYXRhID0ge307XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBkYXRhLm9wdGlvbnMgPSBvcHRzO1xyXG5cclxuICAgICAgICAgIHZhciBvcHRDYWNoZTtcclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWV4cGFuZGNvbGxhcHNlJykub3B0aW9ucyk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgZnVuY3Rpb24gY2xlYXJEcmF3cyhrZWVwRXhwYW5kQ3Vlcykge1xyXG5cclxuICAgICAgICAgICAgdmFyIHcgPSAkY29udGFpbmVyLndpZHRoKCk7XHJcbiAgICAgICAgICAgIHZhciBoID0gJGNvbnRhaW5lci5oZWlnaHQoKTtcclxuXHJcbiAgICAgICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoa2VlcEV4cGFuZEN1ZXMpIHtcclxuICAgICAgICAgICAgICB2YXIgY29sbGFwc2VkTm9kZXMgPSBjeS5ub2RlcygnW2V4cGFuZGVkLWNvbGxhcHNlZD1cImNvbGxhcHNlZFwiXScpO1xyXG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sbGFwc2VkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShjb2xsYXBzZWROb2Rlc1tpXSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgZnVuY3Rpb24gY2xlYXJOb2RlRHJhdyhub2RlKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgeCA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYO1xyXG4gICAgICAgICAgICB2YXIgeSA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZO1xyXG4gICAgICAgICAgICB2YXIgcyA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcpID09PSAnY29sbGFwc2VkJykge1xyXG4gICAgICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjdHguY2xlYXJSZWN0KHgsIHksIHMsIHMpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGZ1bmN0aW9uIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKSB7XHJcbiAgICAgICAgICAgIHZhciBjeSA9IG5vZGUuY3koKTtcclxuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICAgICAgICAgIHZhciBoYXNDaGlsZHJlbiA9IGNoaWxkcmVuICE9IG51bGwgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICAgICAgICAgICAgLy9jaGVjayBpZiB0aGUgZXhwYW5kIG9yIGNvbGxhcHNlIGN1ZSBpcyB0byBiZSBkcmF3blxyXG4gICAgICAgICAgICBpZiAoIWhhc0NoaWxkcmVuICYmIGNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBleHBhbmRlZE9yY29sbGFwc2VkID0gbm9kZS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnKTtcclxuXHJcbiAgICAgICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xyXG4gICAgICAgICAgICB2YXIgcmVjdFNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVTaXplO1xyXG4gICAgICAgICAgICB2YXIgbGluZVNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTtcclxuICAgICAgICAgICAgdmFyIGRpZmY7XHJcblxyXG4gICAgICAgICAgICByZWN0U2l6ZSA9IHJlY3RTaXplICogY3kuem9vbSgpO1xyXG4gICAgICAgICAgICBsaW5lU2l6ZSA9IGxpbmVTaXplICogY3kuem9vbSgpO1xyXG4gICAgICAgICAgICBkaWZmID0gKHJlY3RTaXplIC0gbGluZVNpemUpIC8gMjtcclxuXHJcbiAgICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WDtcclxuICAgICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRZO1xyXG4gICAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VFbmRYO1xyXG4gICAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VFbmRZO1xyXG4gICAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZWN0U2l6ZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclg7XHJcbiAgICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclk7XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb24gPT09ICd0b3AtbGVmdCcpIHtcclxuICAgICAgICAgICAgICB2YXIgcCA9IG5vZGUucmVuZGVyZWRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgIHZhciB3ID0gbm9kZS5yZW5kZXJlZE91dGVyV2lkdGgoKTtcclxuICAgICAgICAgICAgICB2YXIgaCA9IG5vZGUucmVuZGVyZWRPdXRlckhlaWdodCgpO1xyXG5cclxuICAgICAgICAgICAgICBleHBhbmRjb2xsYXBzZUNlbnRlclggPSBwLnggLSB3IC8gMiAtIHJlY3RTaXplIC8gNCArIHJlY3RTaXplIC8gMjtcclxuICAgICAgICAgICAgICBleHBhbmRjb2xsYXBzZUNlbnRlclkgPSBwLnkgLSBoIC8gMiAtIHJlY3RTaXplIC8gNCArIHJlY3RTaXplIC8gMjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgdmFyIGN1ZUNlbnRlciA9IHR5cGVvZiBvcHRpb24gPT09ICdmdW5jdGlvbicgPyBvcHRpb24uY2FsbCh0aGlzLCBub2RlKSA6IG9wdGlvbjtcclxuICAgICAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VDZW50ZXIgPSBlbGVtZW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oY3VlQ2VudGVyKTtcclxuXHJcbiAgICAgICAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJYID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueDtcclxuICAgICAgICAgICAgICBleHBhbmRjb2xsYXBzZUNlbnRlclkgPSBleHBhbmRjb2xsYXBzZUNlbnRlci55O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICAgICAgZXhwYW5kY29sbGFwc2VTdGFydFkgPSBleHBhbmRjb2xsYXBzZUNlbnRlclkgLSByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWCA9IGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemU7XHJcbiAgICAgICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemU7XHJcbiAgICAgICAgICAgIGV4cGFuZGNvbGxhcHNlUmVjdFNpemUgPSByZWN0U2l6ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIERyYXcgZXhwYW5kL2NvbGxhcHNlIGN1ZSBpZiBzcGVjaWZpZWQgdXNlIGltYWdlIGVsc2UgZHJhdyBpdFxyXG4gICAgICAgICAgICBpZiAoZXhwYW5kZWRPcmNvbGxhcHNlZCA9PT0gJ2V4cGFuZGVkJyAmJiBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UpIHtcclxuICAgICAgICAgICAgICB2YXIgaW1nPW5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICAgIGltZy5zcmMgPSBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2U7XHJcbiAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGV4cGFuZGVkT3Jjb2xsYXBzZWQgPT09ICdjb2xsYXBzZWQnICYmIG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlKSB7XHJcbiAgICAgICAgICAgICAgdmFyIGltZz1uZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgICBpbWcuc3JjID0gb3B0aW9ucygpLmNvbGxhcHNlQ3VlSW1hZ2U7XHJcbiAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIHZhciBvbGRGaWxsU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xyXG4gICAgICAgICAgICAgIHZhciBvbGRXaWR0aCA9IGN0eC5saW5lV2lkdGg7XHJcbiAgICAgICAgICAgICAgdmFyIG9sZFN0cm9rZVN0eWxlID0gY3R4LnN0cm9rZVN0eWxlO1xyXG5cclxuICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgICAgICAgY3R4LmVsbGlwc2UoZXhwYW5kY29sbGFwc2VDZW50ZXJYLCBleHBhbmRjb2xsYXBzZUNlbnRlclksIHJlY3RTaXplIC8gMiwgcmVjdFNpemUgLyAyLCAwLCAwLCAyICogTWF0aC5QSSk7XHJcbiAgICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgICAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDIuNiAqIGN5Lnpvb20oKTtcclxuXHJcbiAgICAgICAgICAgICAgY3R4Lm1vdmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgbGluZVNpemUgKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XHJcblxyXG4gICAgICAgICAgICAgIGlmIChleHBhbmRlZE9yY29sbGFwc2VkID09ICdjb2xsYXBzZWQnKSB7XHJcbiAgICAgICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmxpbmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIHJlY3RTaXplIC8gMiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyBsaW5lU2l6ZSArIGRpZmYpO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gb2xkU3Ryb2tlU3R5bGU7XHJcbiAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcclxuICAgICAgICAgICAgICBjdHgubGluZVdpZHRoID0gb2xkV2lkdGg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XHJcbiAgICAgICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZID0gZXhwYW5kY29sbGFwc2VTdGFydFk7XHJcbiAgICAgICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZSA9IGV4cGFuZGNvbGxhcHNlUmVjdFNpemU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgJGNvbnRhaW5lci5jeXRvc2NhcGUoZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgY3kgPSB0aGlzO1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjeS5vbignbW91c2VvdmVyJywgJ25vZGUnLCBmdW5jdGlvbiAoZSkge1xyXG5cclxuICAgICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICAgIC8vIHJlbW92ZSBvbGQgaGFuZGxlXHJcbiAgICAgICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgLy8gYWRkIG5ldyBoYW5kbGVcclxuICAgICAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSk7XHJcblxyXG4gICAgICAgICAgICAgIHZhciBsYXN0UG9zaXRpb24gPSB7fTtcclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY3kub24oJ21vdXNlb3V0IHRhcGRyYWdvdXQnLCAnbm9kZScsIGZ1bmN0aW9uIChlKSB7XHJcblxyXG4gICAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgY2xlYXJOb2RlRHJhdyhub2RlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjeS5vbigncmVtb3ZlJywgJ25vZGUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgICAgICAgICAgIGNsZWFyTm9kZURyYXcobm9kZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2YXIgdXI7XHJcbiAgICAgICAgICAgIGN5Lm9uKCd0YXAnLCAnbm9kZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WDtcclxuICAgICAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZO1xyXG4gICAgICAgICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemU7XHJcbiAgICAgICAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcclxuICAgICAgICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xyXG5cclxuICAgICAgICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1ggPSBldmVudC5jeVJlbmRlcmVkUG9zaXRpb24ueDtcclxuICAgICAgICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1kgPSBldmVudC5jeVJlbmRlcmVkUG9zaXRpb24ueTtcclxuICAgICAgICAgICAgICB2YXIgZmFjdG9yID0gKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5IC0gMSkgLyAyO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmIChjeVJlbmRlcmVkUG9zWCA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgICAgICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgICAgICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3IpIHtcclxuICAgICAgICAgICAgICAgIGlmKG9wdHMudW5kb2FibGUgJiYgIXVyKVxyXG4gICAgICAgICAgICAgICAgICB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QWN0aW9uczogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZihub2RlLmlzQ29sbGFwc2libGUoKSlcclxuICAgICAgICAgICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgdXIuZG8oXCJjb2xsYXBzZVwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcclxuICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IG9wdHNcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY29sbGFwc2Uob3B0cyk7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKG5vZGUuaXNFeHBhbmRhYmxlKCkpXHJcbiAgICAgICAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIHVyLmRvKFwiZXhwYW5kXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgIG5vZGVzOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5leHBhbmQob3B0cyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICRjb250YWluZXIuZGF0YSgnY3lleHBhbmRjb2xsYXBzZScsIGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGlmIChmdW5jdGlvbnNbZm5dKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgICQuZXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZXhwYW5kLWNvbGxhcHNlJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiAkKHRoaXMpO1xyXG4gICAgfTtcclxuXHJcbiAgICAkLmZuLmN5RXhwYW5kQ29sbGFwc2UgPSAkLmZuLmN5dG9zY2FwZUV4cGFuZENvbGxhcHNlO1xyXG5cclxuXHJcbiAgICAvLyBjeS5leHBhbmRDb2xsYXBzZSgpXHJcbiAgICBjeXRvc2NhcGUoXCJjb3JlXCIsIFwiZXhwYW5kQ29sbGFwc2VcIiwgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgY3kgPSB0aGlzO1xyXG4gICAgICBvcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIC8vIEFsbCBwYXJlbnQgbm9kZXMgYXJlIGV4cGFuZGVkIG9uIGxvYWRcclxuICAgICAgY3kubm9kZXMoJzpwYXJlbnQnKS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnLCAnZXhwYW5kZWQnKTtcclxuICAgICAgdW5kb1JlZG9VdGlsaXRpZXMoKTtcclxuXHJcbiAgICAgIG9wdGlvbnMucmVhZHkoKTtcclxuXHJcbiAgICAgIHJldHVybiAkKGN5LmNvbnRhaW5lcigpKS5jeXRvc2NhcGVFeHBhbmRDb2xsYXBzZShvcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbGxlY3Rpb24gZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gZWxlcy5jb2xsYXBzZShvcHRpb25zKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2NvbGxhcHNlJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoKTtcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5jb2xsYXBzZUFsbChvcHRpb25zKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2NvbGxhcHNlUmVjdXJzaXZlbHknLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXMuY29sbGFwc2libGVOb2RlcygpO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG5cclxuICAgICAgcmV0dXJuIGVsZXMudW5pb24oZWxlcy5kZXNjZW5kYW50cygpKS5jb2xsYXBzZSh0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmV4cGFuZChvcHRpb25zKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2V4cGFuZCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoKTtcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kQWxsKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnZXhwYW5kUmVjdXJzaXZlbHknLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kQWxsTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIENvcmUgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gY3kuY29sbGFwc2VBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdjb2xsYXBzZUFsbCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gY3kuY29sbGFwc2libGVOb2RlcygpLmNvbGxhcHNlUmVjdXJzaXZlbHkodGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gY3kuZXhwYW5kQWxsKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZXhwYW5kQWxsJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBjeS5leHBhbmRhYmxlTm9kZXMoKS5leHBhbmRSZWN1cnNpdmVseSh0ZW1wT3B0aW9ucyk7XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgLy8gVXRpbGl0eSBmdW5jdGlvbnNcclxuXHJcbiAgICAvLyBlbGUuaXNDb2xsYXBzaWJsZSgpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnaXNFeHBhbmRhYmxlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZWxlID0gdGhpcztcclxuXHJcbiAgICAgIHJldHVybiAoZWxlLmRhdGEoXCJleHBhbmRlZC1jb2xsYXBzZWRcIikgPT09IFwiY29sbGFwc2VkXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlLmlzRXhwYW5kYWJsZSgpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnaXNDb2xsYXBzaWJsZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZSA9IHRoaXM7XHJcbiAgICAgIHJldHVybiAhZWxlLmlzRXhwYW5kYWJsZSgpICYmIGVsZS5pc1BhcmVudCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5jb2xsYXBzZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2NvbGxhcHNpYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcztcclxuXHJcbiAgICAgIHJldHVybiBlbGVzLmZpbHRlcihmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgICAgcmV0dXJuIGVsZS5pc0NvbGxhcHNpYmxlKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmRlZCgpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnZXhwYW5kYWJsZU5vZGVzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuaXNFeHBhbmRhYmxlKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICAvLyBlbGVzLmNvbGxhcHNlZCgpXHJcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnY29sbGFwc2libGVOb2RlcycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuXHJcbiAgICAgIHJldHVybiBjeS5ub2RlcygpLmNvbGxhcHNpYmxlTm9kZXMoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb3JlJywgJ2V4cGFuZGFibGVOb2RlcycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuXHJcbiAgICAgIHJldHVybiBjeS5ub2RlcygpLmV4cGFuZGFibGVOb2RlcygpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZXhwYW5kLWNvbGxhcHNlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgcmVnaXN0ZXIoY3l0b3NjYXBlKTtcclxuICB9XHJcblxyXG59KShjeXRvc2NhcGUsIGpRdWVyeSk7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7XHJcbiAgICBkZWZhdWx0QWN0aW9uczogZmFsc2VcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gZ2V0RWxlcyhfZWxlcykge1xyXG4gICAgcmV0dXJuICh0eXBlb2YgX2VsZXMgPT09IFwic3RyaW5nXCIpID8gY3kuJChfZWxlcykgOiBfZWxlcztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldE5vZGVQb3NpdGlvbnNBbmRTaXplcygpIHtcclxuICAgIHZhciBwb3NpdGlvbnNBbmRTaXplcyA9IHt9O1xyXG4gICAgdmFyIG5vZGVzID0gY3kubm9kZXMoKTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlbGUgPSBub2Rlc1tpXTtcclxuICAgICAgcG9zaXRpb25zQW5kU2l6ZXNbZWxlLmlkKCldID0ge1xyXG4gICAgICAgIHdpZHRoOiBlbGUud2lkdGgoKSxcclxuICAgICAgICBoZWlnaHQ6IGVsZS5oZWlnaHQoKSxcclxuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxyXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcG9zaXRpb25zQW5kU2l6ZXM7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXR1cm5Ub1Bvc2l0aW9uc0FuZFNpemVzKG5vZGVzRGF0YSkge1xyXG4gICAgdmFyIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplcyA9IHt9O1xyXG4gICAgY3kubm9kZXMoKS5wb3NpdGlvbnMoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgICBjdXJyZW50UG9zaXRpb25zQW5kU2l6ZXNbZWxlLmlkKCldID0ge1xyXG4gICAgICAgIHdpZHRoOiBlbGUud2lkdGgoKSxcclxuICAgICAgICBoZWlnaHQ6IGVsZS5oZWlnaHQoKSxcclxuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxyXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcclxuICAgICAgfTtcclxuICAgICAgdmFyIGRhdGEgPSBub2Rlc0RhdGFbZWxlLmlkKCldO1xyXG4gICAgICBlbGUuX3ByaXZhdGUuZGF0YS53aWR0aCA9IGRhdGEud2lkdGg7XHJcbiAgICAgIGVsZS5fcHJpdmF0ZS5kYXRhLmhlaWdodCA9IGRhdGEuaGVpZ2h0O1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IGRhdGEueCxcclxuICAgICAgICB5OiBkYXRhLnlcclxuICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjdXJyZW50UG9zaXRpb25zQW5kU2l6ZXM7XHJcbiAgfVxyXG5cclxuICB2YXIgc2Vjb25kVGltZU9wdHMgPSB7XHJcbiAgICBsYXlvdXRCeTogbnVsbCxcclxuICAgIGFuaW1hdGU6IGZhbHNlLFxyXG4gICAgZmlzaGV5ZTogZmFsc2VcclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBkb0l0KGZ1bmMpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICAgIHZhciBub2RlcyA9IGdldEVsZXMoYXJncy5ub2Rlcyk7XHJcbiAgICAgIGlmIChhcmdzLmZpcnN0VGltZSkge1xyXG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9uc0FuZFNpemVzKCk7XHJcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGN5W2Z1bmNdKGFyZ3Mub3B0aW9ucykgOiBub2Rlc1tmdW5jXShhcmdzLm9wdGlvbnMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9uc0FuZFNpemVzKCk7XHJcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGN5W2Z1bmNdKHNlY29uZFRpbWVPcHRzKSA6IG5vZGVzW2Z1bmNdKHNlY29uZFRpbWVPcHRzKTtcclxuICAgICAgICByZXR1cm5Ub1Bvc2l0aW9uc0FuZFNpemVzKGFyZ3Mub2xkRGF0YSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdmFyIGFjdGlvbnMgPSBbXCJjb2xsYXBzZVwiLCBcImNvbGxhcHNlUmVjdXJzaXZlbHlcIiwgXCJjb2xsYXBzZUFsbFwiLCBcImV4cGFuZFwiLCBcImV4cGFuZFJlY3Vyc2l2ZWx5XCIsIFwiZXhwYW5kQWxsXCJdO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgIHVyLmFjdGlvbihhY3Rpb25zW2ldLCBkb0l0KGFjdGlvbnNbaV0pLCBkb0l0KGFjdGlvbnNbKGkgKyAzKSAlIDZdKSk7XHJcbiAgICBjb25zb2xlLmxvZyhhY3Rpb25zW2ldICsgXCItPlwiICsgYWN0aW9uc1soaSArIDMpICUgNl0pO1xyXG4gIH1cclxuXHJcbn07Il19
