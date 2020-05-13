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

module.exports = function (params, cy, api) {
  var elementUtilities;
  var fn = params;

  var nodeWithRenderedCue;

  const getData = function () {
    var scratch = cy.scratch('_cyExpandCollapse');
    return scratch && scratch.cueUtilities;
  };

  const setData = function (data) {
    var scratch = cy.scratch('_cyExpandCollapse');
    if (scratch == null) {
      scratch = {};
    }

    scratch.cueUtilities = data;
    cy.scratch('_cyExpandCollapse', scratch);
  };

  var functions = {
    init: function () {
      var $canvas = document.createElement('canvas');
      $canvas.classList.add("expand-collapse-canvas");
      var $container = cy.container();
      var ctx = $canvas.getContext('2d');
      $container.append($canvas);

      elementUtilities = _dereq_('./elementUtilities')(cy);

      var offset = function (elt) {
        var rect = elt.getBoundingClientRect();

        return {
          top: rect.top + document.documentElement.scrollTop,
          left: rect.left + document.documentElement.scrollLeft
        }
      }

      var _sizeCanvas = debounce(function () {
        $canvas.height = cy.container().offsetHeight;
        $canvas.width = cy.container().offsetWidth;
        $canvas.style.position = 'absolute';
        $canvas.style.top = 0;
        $canvas.style.left = 0;
        $canvas.style.zIndex = options().zIndex;

        setTimeout(function () {
          var canvasBb = offset($canvas);
          var containerBb = offset($container);
          $canvas.style.top = -(canvasBb.top - containerBb.top);
          $canvas.style.left = -(canvasBb.left - containerBb.left);

          // refresh the cues on canvas resize
          if (cy) {
            clearDraws(true);
          }
        }, 0);

      }, 250);

      function sizeCanvas() {
        _sizeCanvas();
      }

      sizeCanvas();

      var data = {};

      // if there are events field in data unbind them here
      // to prevent binding the same event multiple times
      // if (!data.hasEventFields) {
      //   functions['unbind'].apply( $container );
      // }

      function options() {
        return cy.scratch('_cyExpandCollapse').options;
      }

      function clearDraws() {
        var w = cy.width();
        var h = cy.height();

        ctx.clearRect(0, 0, w, h);
        nodeWithRenderedCue = null;
      }

      function drawExpandCollapseCue(node) {
        var children = node.children();
        var collapsedChildren = node.data('collapsedChildren');
        var hasChildren = children != null && children != undefined && children.length > 0;
        // If this is a simple node with no collapsed children return directly
        if (!hasChildren && !collapsedChildren) {
          return;
        }

        var isCollapsed = node.hasClass('cy-expand-collapse-collapsed-node');

        //Draw expand-collapse rectangles
        var rectSize = options().expandCollapseCueSize;
        var lineSize = options().expandCollapseCueLineSize;

        var cueCenter;

        if (options().expandCollapseCuePosition === 'top-left') {
          var offset = 1;
          var size = cy.zoom() < 1 ? rectSize / (2 * cy.zoom()) : rectSize / 2;
          var nodeBorderWid = parseFloat(node.css('border-width'));
          var x = node.position('x') - node.width() / 2 - parseFloat(node.css('padding-left'))
            + nodeBorderWid + size + offset;
          var y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
            + nodeBorderWid + size + offset;

          cueCenter = { x: x, y: y };
        } else {
          var option = options().expandCollapseCuePosition;
          cueCenter = typeof option === 'function' ? option.call(this, node) : option;
        }

        var expandcollapseCenter = elementUtilities.convertToRenderedPosition(cueCenter);

        // convert to rendered sizes
        rectSize = Math.max(rectSize, rectSize * cy.zoom());
        lineSize = Math.max(lineSize, lineSize * cy.zoom());
        var diff = (rectSize - lineSize) / 2;

        var expandcollapseCenterX = expandcollapseCenter.x;
        var expandcollapseCenterY = expandcollapseCenter.y;

        var expandcollapseStartX = expandcollapseCenterX - rectSize / 2;
        var expandcollapseStartY = expandcollapseCenterY - rectSize / 2;
        var expandcollapseRectSize = rectSize;

        // Draw expand/collapse cue if specified use an image else render it in the default way
        if (isCollapsed && options().expandCueImage) {
          drawImg(options().expandCueImage, expandcollapseStartX, expandcollapseStartY, rectSize, rectSize);
        }
        else if (!isCollapsed && options().collapseCueImage) {
          drawImg(options().collapseCueImage, expandcollapseStartX, expandcollapseStartY, rectSize, rectSize);
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
          ctx.lineWidth = Math.max(2.6, 2.6 * cy.zoom());

          ctx.moveTo(expandcollapseStartX + diff, expandcollapseStartY + rectSize / 2);
          ctx.lineTo(expandcollapseStartX + lineSize + diff, expandcollapseStartY + rectSize / 2);

          if (isCollapsed) {
            ctx.moveTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + diff);
            ctx.lineTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + lineSize + diff);
          }

          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = oldStrokeStyle;
          ctx.fillStyle = oldFillStyle;
          ctx.lineWidth = oldWidth;
        }

        node.data('expandcollapseRenderedStartX', expandcollapseStartX);
        node.data('expandcollapseRenderedStartY', expandcollapseStartY);
        node.data('expandcollapseRenderedCueSize', expandcollapseRectSize);

        nodeWithRenderedCue = node;
      }

      function drawImg(imgSrc, x, y, w, h) {
        var img = new Image(w, h);
        img.src = imgSrc;
        img.onload = () => {
          ctx.drawImage(img, x, y, w, h);
        };
      }

      cy.on('resize', data.eCyResize = function () {
        sizeCanvas();
      });

      cy.on('expandcollapse.clearvisualcue', function () {
        if (nodeWithRenderedCue) {
          clearDraws();
        }
      });

      var oldMousePos = null, currMousePos = null;
      cy.on('mousedown', data.eMouseDown = function (e) {
        oldMousePos = e.renderedPosition || e.cyRenderedPosition
      });

      cy.on('mouseup', data.eMouseUp = function (e) {
        currMousePos = e.renderedPosition || e.cyRenderedPosition
      });

      cy.on('remove', 'node', data.eRemove = function () {
        clearDraws();
      });

      var ur;
      cy.on('select unselect', data.eSelect = function () {
        if (this.length > cy.nodes(":selected").length) {
          this.unselect();
        }
        if (nodeWithRenderedCue) {
          clearDraws();
        }
        var isOnly1Selected = cy.$(':selected').length == 1;
        var isOnly1SelectedCompundNode = cy.nodes(':parent').filter(':selected').length == 1 && isOnly1Selected;
        var isOnly1SelectedCollapsedNode = cy.nodes('.cy-expand-collapse-collapsed-node').filter(':selected').length == 1 && isOnly1Selected;
        if (isOnly1SelectedCollapsedNode || isOnly1SelectedCompundNode) {
          drawExpandCollapseCue(cy.nodes(':selected'));
        }
      });

      cy.on('tap', data.eTap = function (event) {
        var node = nodeWithRenderedCue;
        if (!node) {
          return;
        }
        var expandcollapseRenderedStartX = node.data('expandcollapseRenderedStartX');
        var expandcollapseRenderedStartY = node.data('expandcollapseRenderedStartY');
        var expandcollapseRenderedRectSize = node.data('expandcollapseRenderedCueSize');
        var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
        var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;

        var cyRenderedPos = event.renderedPosition || event.cyRenderedPosition;
        var cyRenderedPosX = cyRenderedPos.x;
        var cyRenderedPosY = cyRenderedPos.y;
        var opts = options();
        var factor = (opts.expandCollapseCueSensitivity - 1) / 2;

        if ((Math.abs(oldMousePos.x - currMousePos.x) < 5 && Math.abs(oldMousePos.y - currMousePos.y) < 5)
          && cyRenderedPosX >= expandcollapseRenderedStartX - expandcollapseRenderedRectSize * factor
          && cyRenderedPosX <= expandcollapseRenderedEndX + expandcollapseRenderedRectSize * factor
          && cyRenderedPosY >= expandcollapseRenderedStartY - expandcollapseRenderedRectSize * factor
          && cyRenderedPosY <= expandcollapseRenderedEndY + expandcollapseRenderedRectSize * factor) {
          if (opts.undoable && !ur)
            ur = cy.undoRedo({
              defaultActions: false
            });
          if (api.isCollapsible(node))
            if (opts.undoable) {
              ur.do("collapse", {
                nodes: node,
                options: opts
              });
            }
            else
              api.collapse(node, opts);
          else if (api.isExpandable(node))
            if (opts.undoable)
              ur.do("expand", {
                nodes: node,
                options: opts
              });
            else
              api.expand(node, opts);

          if (node.selectable()) {
            node.unselectify();
            cy.scratch('_cyExpandCollapse').selectableChanged = true;
          }
        }
      });

      cy.on('expandcollapse.afterexpand expandcollapse.aftercollapse', 'node', data.eAfterExpandCollapse = function () {
        var delay = 50 + params.animate ? params.animationDuration : 0;
        setTimeout(() => {
          if (this.selected()) {
            drawExpandCollapseCue(this);
          }
        }, delay);
      });

      // write options to data
      data.hasEventFields = true;
      setData(data);
    },
    unbind: function () {
      // var $container = this;
      var data = getData();

      if (!data.hasEventFields) {
        console.log('events to unbind does not exist');
        return;
      }

      cy.trigger('expandcollapse.clearvisualcue');

      cy.off('mousedown', 'node', data.eMouseDown)
        .off('mouseup', 'node', data.eMouseUp)
        .off('remove', 'node', data.eRemove)
        .off('tap', 'node', data.eTap)
        .off('add', 'node', data.eAdd)
        .off('select unselect', data.eSelect)
        .off('expandcollapse.afterexpand expandcollapse.aftercollapse', 'node', data.eAfterExpandCollapse)
        .off('free', 'node', data.eFree)
        .off('resize', data.eCyResize);
    },
    rebind: function () {
      var data = getData();

      if (!data.hasEventFields) {
        console.log('events to rebind does not exist');
        return;
      }

      cy.on('mousedown', 'node', data.eMouseDown)
        .on('mouseup', 'node', data.eMouseUp)
        .on('remove', 'node', data.eRemove)
        .on('tap', 'node', data.eTap)
        .on('add', 'node', data.eAdd)
        .on('select unselect', data.eSelect)
        .on('expandcollapse.afterexpand expandcollapse.aftercollapse', 'node', data.eAfterExpandCollapse)
        .on('free', 'node', data.eFree)
        .on('resize', data.eCyResize);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(cy.container(), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(cy.container(), arguments);
  }
  throw new Error('No such function `' + fn + '` for cytoscape.js-expand-collapse');

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
    nonParents = topMostNodes.not(":parent"); 
    // moving parents spoils positioning, so move only nonparents
    nonParents.positions(function(ele, i){
      return {
        x: nonParents[i].position("x") + positionDiff.x,
        y: nonParents[i].position("y") + positionDiff.y
      };
    });
    for (var i = 0; i < topMostNodes.length; i++) {
      var node = topMostNodes[i];
      var children = node.children();
      this.moveNodes(positionDiff, children, true);
    }
  },
  getTopMostNodes: function (nodes) {//*//
    var nodesMap = {};
    for (var i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
    }
    var roots = nodes.filter(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      
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
      var layout = cy.layout(layoutBy);
      if (layout && layout.run) {
        layout.run();
      }
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
  /*
   * A funtion basicly expanding a node, it is to be called when a node is expanded anyway.
   * Single parameter indicates if the node is expanded alone and if it is truthy then layoutBy parameter is considered to
   * perform layout after expand.
   */
  expandNodeBaseFunction: function (node, single, layoutBy) {
    if (!node._private.data.collapsedChildren){
      return;
    }

    //check how the position of the node is changed
    var positionDiff = {
      x: node._private.position.x - node._private.data['position-before-collapse'].x,
      y: node._private.position.y - node._private.data['position-before-collapse'].y
    };

    node.removeData("infoLabel");
    node.removeClass('cy-expand-collapse-collapsed-node');

    node.trigger("expandcollapse.beforeexpand");
    var restoredNodes = node._private.data.collapsedChildren;
    restoredNodes.restore();
    var parentData = cy.scratch('_cyExpandCollapse').parentData;
    for(var i = 0; i < restoredNodes.length; i++){
      delete parentData[restoredNodes[i].id()];
    }
    cy.scratch('_cyExpandCollapse').parentData = parentData;
    this.repairEdges(node);
    node._private.data.collapsedChildren = null;

    elementUtilities.moveNodes(positionDiff, node.children());
    node.removeData('position-before-collapse');

    node.trigger("position"); // position not triggered by default when nodes are moved
    node.trigger("expandcollapse.afterexpand");

    // If expand is called just for one node then call end operation to perform layout
    if (single) {
      this.endOperation(layoutBy, node);
    }
  },
  /*
   * A helper function to collapse given nodes in a simple way (Without performing layout afterward)
   * It collapses all root nodes bottom up.
   */
  simpleCollapseGivenNodes: function (nodes) {//*//
    nodes.data("collapse", true);
    var roots = elementUtilities.getTopMostNodes(nodes);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      
      // Collapse the nodes in bottom up order
      this.collapseBottomUp(root);
    }
    
    return nodes;
  },
  /*
   * A helper function to expand given nodes in a simple way (Without performing layout afterward)
   * It expands all top most nodes top down.
   */
  simpleExpandGivenNodes: function (nodes, applyFishEyeViewToEachNode) {
    nodes.data("expand", true); // Mark that the nodes are still to be expanded
    var roots = elementUtilities.getTopMostNodes(nodes);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      this.expandTopDown(root, applyFishEyeViewToEachNode); // For each root node expand top down
    }
    return nodes;
  },
  /*
   * Expands all nodes by expanding all top most nodes top down with their descendants.
   */
  simpleExpandAllNodes: function (nodes, applyFishEyeViewToEachNode) {
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
  /*
   * The operation to be performed after expand/collapse. It rearrange nodes by layoutBy parameter.
   */
  endOperation: function (layoutBy, nodes) {
    var self = this;
    cy.ready(function () {
      setTimeout(function() {
        elementUtilities.rearrange(layoutBy);
        if(cy.scratch('_cyExpandCollapse').selectableChanged){
          nodes.selectify();
          cy.scratch('_cyExpandCollapse').selectableChanged = false;
        }
      }, 0);
      
    });
  },
  /*
   * Calls simple expandAllNodes. Then performs end operation.
   */
  expandAllNodes: function (nodes, options) {//*//
    var expandedStack = this.simpleExpandAllNodes(nodes, options.fisheye);

    this.endOperation(options.layoutBy, nodes);

    /*
     * return the nodes to undo the operation
     */
    return expandedStack;
  },
  /*
   * Expands the root and its collapsed descendents in top down order.
   */
  expandAllTopDown: function (root, expandStack, applyFishEyeViewToEachNode) {
    if (root._private.data.collapsedChildren != null) {
      expandStack.push(root);
      this.expandNode(root, applyFishEyeViewToEachNode);
    }
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.expandAllTopDown(node, expandStack, applyFishEyeViewToEachNode);
    }
  },
  //Expand the given nodes perform end operation after expandation
  expandGivenNodes: function (nodes, options) {
    // If there is just one node to expand we need to animate for fisheye view, but if there are more then one node we do not
    if (nodes.length === 1) {
      
      var node = nodes[0];
      if (node._private.data.collapsedChildren != null) {
        // Expand the given node the third parameter indicates that the node is simple which ensures that fisheye parameter will be considered
        this.expandNode(node, options.fisheye, true, options.animate, options.layoutBy, options.animationDuration);
      }
    } 
    else {
      // First expand given nodes and then perform layout according to the layoutBy parameter
      this.simpleExpandGivenNodes(nodes, options.fisheye);
      this.endOperation(options.layoutBy, nodes);
    }

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the given nodes then perform end operation
  collapseGivenNodes: function (nodes, options) {
    /*
     * In collapse operation there is no fisheye view to be applied so there is no animation to be destroyed here. We can do this 
     * in a batch.
     */ 
    cy.startBatch();
    this.simpleCollapseGivenNodes(nodes/*, options*/);
    cy.endBatch();

    nodes.trigger("position"); // position not triggered by default when collapseNode is called
    this.endOperation(options.layoutBy, nodes);

    // Update the style
    cy.style().update();

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the nodes in bottom up order starting from the root
  collapseBottomUp: function (root) {
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.collapseBottomUp(node);
    }
    //If the root is a compound node to be collapsed then collapse it
    if (root.data("collapse") && root.children().length > 0) {
      this.collapseNode(root);
      root.removeData("collapse");
    }
  },
  //expand the nodes in top down order starting from the root
  expandTopDown: function (root, applyFishEyeViewToEachNode) {
    if (root.data("expand") && root._private.data.collapsedChildren != null) {
      // Expand the root and unmark its expand data to specify that it is no more to be expanded
      this.expandNode(root, applyFishEyeViewToEachNode);
      root.removeData("expand");
    }
    // Make a recursive call for children of root
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.expandTopDown(node);
    }
  },
  // Converst the rendered position to model position according to global pan and zoom values
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
   * This method expands the given node. It considers applyFishEyeView, animate and layoutBy parameters.
   * It also considers single parameter which indicates if this node is expanded alone. If this parameter is truthy along with 
   * applyFishEyeView parameter then the state of view port is to be changed to have extra space on the screen (if needed) before appliying the
   * fisheye view.
   */
  expandNode: function (node, applyFishEyeView, single, animate, layoutBy, animationDuration) {
    var self = this;
    
    var commonExpandOperation = function (node, applyFishEyeView, single, animate, layoutBy, animationDuration) {
      if (applyFishEyeView) {

        node._private.data['width-before-fisheye'] = node._private.data['size-before-collapse'].w;
        node._private.data['height-before-fisheye'] = node._private.data['size-before-collapse'].h;
        
        // Fisheye view expand the node.
        // The first paramter indicates the node to apply fisheye view, the third parameter indicates the node
        // to be expanded after fisheye view is applied.
        self.fishEyeViewExpandGivenNode(node, single, node, animate, layoutBy, animationDuration);
      }
      
      // If one of these parameters is truthy it means that expandNodeBaseFunction is already to be called.
      // However if none of them is truthy we need to call it here.
      if (!single || !applyFishEyeView || !animate) {
        self.expandNodeBaseFunction(node, single, layoutBy);
      }
    };

    if (node._private.data.collapsedChildren != null) {
      this.storeWidthHeight(node);
      var animating = false; // Variable to check if there is a current animation, if there is commonExpandOperation will be called after animation
      
      // If the node is the only node to expand and fisheye view should be applied, then change the state of viewport 
      // to create more space on screen (If needed)
      if (applyFishEyeView && single) {
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
          x1: node._private.position.x - node._private.data['size-before-collapse'].w / 2 - padding,
          x2: node._private.position.x + node._private.data['size-before-collapse'].w / 2 + padding,
          y1: node._private.position.y - node._private.data['size-before-collapse'].h / 2 - padding,
          y2: node._private.position.y + node._private.data['size-before-collapse'].h / 2 + padding
        };

        var unionBB = boundingBoxUtilities.getUnion(nodeBB, bb);
        
        // If these bboxes are not equal then we need to change the viewport state (by pan and zoom)
        if (!boundingBoxUtilities.equalBoundingBoxes(unionBB, bb)) {
          var viewPort = cy.getFitViewport(unionBB, 10);
          var self = this;
          animating = animate; // Signal that there is an animation now and commonExpandOperation will be called after animation
          // Check if we need to animate during pan and zoom
          if (animate) {
            cy.animate({
              pan: viewPort.pan,
              zoom: viewPort.zoom,
              complete: function () {
                commonExpandOperation(node, applyFishEyeView, single, animate, layoutBy, animationDuration);
              }
            }, {
              duration: animationDuration || 1000
            });
          }
          else {
            cy.zoom(viewPort.zoom);
            cy.pan(viewPort.pan);
          }
        }
      }
      
      // If animating is not true we need to call commonExpandOperation here
      if (!animating) {
        commonExpandOperation(node, applyFishEyeView, single, animate, layoutBy, animationDuration);
      }
      
      //return the node to undo the operation
      return node;
    }
  },
  //collapse the given node without performing end operation
  collapseNode: function (node) {
    if (node._private.data.collapsedChildren == null) {
      node.data('position-before-collapse', {
        x: node.position().x,
        y: node.position().y
      });

      node.data('size-before-collapse', {
        w: node.outerWidth(),
        h: node.outerHeight()
      });

      var children = node.children();

      children.unselect();
      children.connectedEdges().unselect();

      node.trigger("expandcollapse.beforecollapse");
      
      this.barrowEdgesOfcollapsedChildren(node);
      this.removeChildren(node, node);
      node.addClass('cy-expand-collapse-collapsed-node');

      node.trigger("expandcollapse.aftercollapse");
      
      node.position(node.data('position-before-collapse'));

      //return the node to undo the operation
      return node;
    }
  },
  storeWidthHeight: function (node) {//*//
    if (node != null) {
      node._private.data['x-before-fisheye'] = this.xPositionInParent(node);
      node._private.data['y-before-fisheye'] = this.yPositionInParent(node);
      node._private.data['width-before-fisheye'] = node.outerWidth();
      node._private.data['height-before-fisheye'] = node.outerHeight();

      if (node.parent()[0] != null) {
        this.storeWidthHeight(node.parent()[0]);
      }
    }

  },
  /*
   * Apply fisheye view to the given node. nodeToExpand will be expanded after the operation. 
   * The other parameter are to be passed by parameters directly in internal function calls.
   */
  fishEyeViewExpandGivenNode: function (node, single, nodeToExpand, animate, layoutBy, animationDuration) {
    var siblings = this.getSiblings(node);

    var x_a = this.xPositionInParent(node);
    var y_a = this.yPositionInParent(node);

    var d_x_left = Math.abs((node._private.data['width-before-fisheye'] - node.outerWidth()) / 2);
    var d_x_right = Math.abs((node._private.data['width-before-fisheye'] - node.outerWidth()) / 2);
    var d_y_upper = Math.abs((node._private.data['height-before-fisheye'] - node.outerHeight()) / 2);
    var d_y_lower = Math.abs((node._private.data['height-before-fisheye'] - node.outerHeight()) / 2);

    var abs_diff_on_x = Math.abs(node._private.data['x-before-fisheye'] - x_a);
    var abs_diff_on_y = Math.abs(node._private.data['y-before-fisheye'] - y_a);

    // Center went to LEFT
    if (node._private.data['x-before-fisheye'] > x_a) {
      d_x_left = d_x_left + abs_diff_on_x;
      d_x_right = d_x_right - abs_diff_on_x;
    }
    // Center went to RIGHT
    else {
      d_x_left = d_x_left - abs_diff_on_x;
      d_x_right = d_x_right + abs_diff_on_x;
    }

    // Center went to UP
    if (node._private.data['y-before-fisheye'] > y_a) {
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
      
      // Move the sibling in the special way
      this.fishEyeViewMoveNode(sibling, T_x, T_y, nodeToExpand, single, animate, layoutBy, animationDuration);
    }

    // If there is no sibling call expand node base function here else it is to be called one of fishEyeViewMoveNode() calls
    if (siblings.length == 0) {
      this.expandNodeBaseFunction(nodeToExpand, single, layoutBy);
    }

    if (node.parent()[0] != null) {
      // Apply fisheye view to the parent node as well ( If exists )
      this.fishEyeViewExpandGivenNode(node.parent()[0], single, nodeToExpand, animate, layoutBy, animationDuration);
    }

    return node;
  },
  getSiblings: function (node) {
    var siblings;

    if (node.parent()[0] == null) {
      var orphans = cy.nodes(":visible").orphans();
      siblings = orphans.difference(node);
    } else {
      siblings = node.siblings(":visible");
    }

    return siblings;
  },
  /*
   * Move node operation specialized for fish eye view expand operation
   * Moves the node by moving its descandents. Movement is animated if both single and animate flags are truthy.
   */
  fishEyeViewMoveNode: function (node, T_x, T_y, nodeToExpand, single, animate, layoutBy, animationDuration) {
    var childrenList = cy.collection();
    if(node.isParent()){
       childrenList = node.children(":visible");
    }
    var self = this;
    
    /*
     * If the node is simple move itself directly else move it by moving its children by a self recursive call
     */
    if (childrenList.length == 0) {
      var newPosition = {x: node._private.position.x + T_x, y: node._private.position.y + T_y};
      if (!single || !animate) {
        node._private.position.x = newPosition.x;
        node._private.position.y = newPosition.y;
      }
      else {
        this.animatedlyMovingNodeCount++;
        node.animate({
          position: newPosition,
          complete: function () {
            self.animatedlyMovingNodeCount--;
            if (self.animatedlyMovingNodeCount > 0 || !nodeToExpand.hasClass('cy-expand-collapse-collapsed-node')) {

              return;
            }
            
            // If all nodes are moved we are ready to expand so call expand node base function
            self.expandNodeBaseFunction(nodeToExpand, single, layoutBy);

          }
        }, {
          duration: animationDuration || 1000
        });
      }
    }
    else {
      for (var i = 0; i < childrenList.length; i++) {
        this.fishEyeViewMoveNode(childrenList[i], T_x, T_y, nodeToExpand, single, animate, layoutBy, animationDuration);
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
  removeChildren: function (node, root) {
    var children = node.children();
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      this.removeChildren(child, root);
      var parentData = cy.scratch('_cyExpandCollapse').parentData;
      parentData[child.id()] = child.parent();
      cy.scratch('_cyExpandCollapse').parentData = parentData;
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
    return edge.hasClass("cy-expand-collapse-meta-edge");
  },
  barrowEdgesOfcollapsedChildren: function(node) {
    var relatedNodes = node.descendants();
    var edges = relatedNodes.edgesWith(cy.nodes().not(relatedNodes.union(node)));
    
    var relatedNodeMap = {};
    
    relatedNodes.each(function(ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
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
        
        edge.addClass("cy-expand-collapse-meta-edge");
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
    var parentData = cy.scratch('_cyExpandCollapse').parentData;
    var parent = parentData[current.id()];
    
    while( !current.inside() ) {
      current = parent;
      parent = parentData[parent.id()];
    }
    
    return current;
  },
  repairEdges: function(node) {
    var connectedMetaEdges = node.connectedEdges('.cy-expand-collapse-meta-edge');
    
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
        edge.removeClass('cy-expand-collapse-meta-edge');
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
  },
  /**
   * Get all collapsed children - including nested ones
   * @param node : a collapsed node
   * @param collapsedChildren : a collection to store the result
   * @return : collapsed children
   */
  getCollapsedChildrenRecursively: function(node, collapsedChildren){
    var children = node.data('collapsedChildren') || [];
    var i;
    for (i=0; i < children.length; i++){
      if (children[i].data('collapsedChildren')){
        collapsedChildren = collapsedChildren.union(this.getCollapsedChildrenRecursively(children[i], collapsedChildren));
      }
      collapsedChildren = collapsedChildren.union(children[i]);
    }
    return collapsedChildren;
  },
  /* -------------------------------------- start section edge expand collapse -------------------------------------- */
  collapseGivenEdges: function (edges, options) {
    edges.unselect();
    var nodes = edges.connectedNodes();
    var edgesToCollapse = {};
    // group edges by type if this option is set to true
    if (options.groupEdgesOfSameTypeOnCollapse) {
      edges.forEach(function (edge) {
        var edgeType = "unknown";
        if (options.edgeTypeInfo !== undefined) {
          edgeType = options.edgeTypeInfo instanceof Function ? options.edgeTypeInfo.call(edge) : edge.data()[options.edgeTypeInfo];
        }
        if (edgesToCollapse.hasOwnProperty(edgeType)) {
          edgesToCollapse[edgeType].edges = edgesToCollapse[edgeType].edges.add(edge);

          if (edgesToCollapse[edgeType].directionType == "unidirection" && (edgesToCollapse[edgeType].source != edge.source().id() || edgesToCollapse[edgeType].target != edge.target().id())) {
            edgesToCollapse[edgeType].directionType = "bidirection";
          }
        } else {
          var edgesX = cy.collection();
          edgesX = edgesX.add(edge);
          edgesToCollapse[edgeType] = { edges: edgesX, directionType: "unidirection", source: edge.source().id(), target: edge.target().id() }
        }
      });
    } else {
      edgesToCollapse["unknown"] = { edges: edges, directionType: "unidirection", source: edges[0].source().id(), target: edges[0].target().id() }
      for (var i = 0; i < edges.length; i++) {
        if (edgesToCollapse["unknown"].directionType == "unidirection" && (edgesToCollapse["unknown"].source != edges[i].source().id() || edgesToCollapse["unknown"].target != edges[i].target().id())) {
          edgesToCollapse["unknown"].directionType = "bidirection";
          break;
        }
      }
    }

    var result = { edges: cy.collection(), oldEdges: cy.collection() }
    var newEdges = [];
    for (const edgeGroupType in edgesToCollapse) {
      if (edgesToCollapse[edgeGroupType].edges.length < 2) {
        continue;
      }
      edges.trigger('expandcollapse.beforecollapseedge');
      result.oldEdges = result.oldEdges.add(edgesToCollapse[edgeGroupType].edges);
      var newEdge = {};
      newEdge.group = "edges";
      newEdge.data = {};
      newEdge.data.source = edgesToCollapse[edgeGroupType].source;
      newEdge.data.target = edgesToCollapse[edgeGroupType].target;
      newEdge.data.id = "collapsedEdge_" + nodes[0].id() + "_" + nodes[1].id() + "_" + edgeGroupType + "_" + Math.floor(Math.random() * Date.now());
      newEdge.data.collapsedEdges = cy.collection();

      edgesToCollapse[edgeGroupType].edges.forEach(function (edge) {
        newEdge.data.collapsedEdges = newEdge.data.collapsedEdges.add(edge);
      });

      newEdge.data.collapsedEdges = this.check4nestedCollapse(newEdge.data.collapsedEdges, options);

      var edgesTypeField = "edgeType";
      if (options.edgeTypeInfo !== undefined) {
        edgesTypeField = options.edgeTypeInfo instanceof Function ? edgeTypeField : options.edgeTypeInfo;
      }
      newEdge.data[edgesTypeField] = edgeGroupType;

      newEdge.data["directionType"] = edgesToCollapse[edgeGroupType].directionType;
      newEdge.classes = "cy-expand-collapse-collapsed-edge";

      newEdges.push(newEdge);
      cy.remove(edgesToCollapse[edgeGroupType].edges);
      edges.trigger('expandcollapse.aftercollapseedge');
    }

    result.edges = cy.add(newEdges);
    return result;
  },

  check4nestedCollapse: function(edges2collapse, options){
    if (options.allowNestedEdgeCollapse) {
      return edges2collapse;
    }
    let r = cy.collection();
    for (let i = 0; i < edges2collapse.length; i++) {
      let curr = edges2collapse[i];
      let collapsedEdges = curr.data('collapsedEdges');
      if (collapsedEdges && collapsedEdges.length > 0) {
        r = r.add(collapsedEdges);
      } else {
        r = r.add(curr);
      }
    }
    return r;
  },

  expandEdge: function (edge) {
    edge.unselect();
    var result = { edges: cy.collection(), oldEdges: cy.collection() }
    var edges = edge.data('collapsedEdges');
    if (edges !== undefined && edges.length > 0) {
      edge.trigger('expandcollapse.beforeexpandedge');
      result.oldEdges = result.oldEdges.add(edge);
      cy.remove(edge);
      result.edges = cy.add(edges);
      edge.trigger('expandcollapse.afterexpandedge');
    }
    return result;
  },

  //if the edges are only between two nodes (valid for collpasing) returns the two nodes else it returns false
  isValidEdgesForCollapse: function (edges) {
    var endPoints = this.getEdgesDistinctEndPoints(edges);
    if (endPoints.length != 2) {
      return false;
    } else {
      return endPoints;
    }
  },

  //returns a list of distinct endpoints of a set of edges.
  getEdgesDistinctEndPoints: function (edges) {
    var endPoints = [];
    edges.forEach(function (edge) {
      if (!this.containsElement(endPoints, edge.source())) {
        endPoints.push(edge.source());
      }
      if (!this.containsElement(endPoints, edge.target())) {
        endPoints.push(edge.target());

      }
    }.bind(this));

    return endPoints;
  },

  //function to check if a list of elements contains the given element by looking at id()
  containsElement: function (elements, element) {
    var exists = false;
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].id() == element.id()) {
        exists = true;
        break;
      }
    }
    return exists;
  }
  /* -------------------------------------- end section edge expand collapse -------------------------------------- */
}

};

module.exports = expandCollapseUtilities;

},{"./boundingBoxUtilities":1,"./elementUtilities":4}],6:[function(_dereq_,module,exports){
;
(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape) {

    if (!cytoscape) {
      return;
    } // can't register if cytoscape unspecified

    var undoRedoUtilities = _dereq_('./undoRedoUtilities');
    var cueUtilities = _dereq_("./cueUtilities");

    function extendOptions(options, extendBy) {
      var tempOpts = {};
      for (var key in options)
        tempOpts[key] = options[key];

      for (var key in extendBy)
        if (tempOpts.hasOwnProperty(key))
          tempOpts[key] = extendBy[key];
      return tempOpts;
    }
    
    // evaluate some specific options in case of they are specified as functions to be dynamically changed
    function evalOptions(options) {
      var animate = typeof options.animate === 'function' ? options.animate.call() : options.animate;
      var fisheye = typeof options.fisheye === 'function' ? options.fisheye.call() : options.fisheye;
      
      options.animate = animate;
      options.fisheye = fisheye;
    }
    
    // creates and returns the API instance for the extension
    function createExtensionAPI(cy, expandCollapseUtilities) {
      var api = {}; // API to be returned
      // set functions

      function handleNewOptions( opts ) {
        var currentOpts = getScratch(cy, 'options');
        if ( opts.cueEnabled && !currentOpts.cueEnabled ) {
          api.enableCue();
        }
        else if ( !opts.cueEnabled && currentOpts.cueEnabled ) {
          api.disableCue();
        }
      }

      // set all options at once
      api.setOptions = function(opts) {
        handleNewOptions(opts);
        setScratch(cy, 'options', opts);
      };

      api.extendOptions = function(opts) {
        var options = getScratch(cy, 'options');
        var newOptions = extendOptions( options, opts );
        handleNewOptions(newOptions);
        setScratch(cy, 'options', newOptions);
      }

      // set the option whose name is given
      api.setOption = function (name, value) {
        var opts = {};
        opts[ name ] = value;

        var options = getScratch(cy, 'options');
        var newOptions = extendOptions( options, opts );

        handleNewOptions(newOptions);
        setScratch(cy, 'options', newOptions);
      };

      // Collection functions

      // collapse given eles extend options with given param
      api.collapse = function (_eles, opts) {
        var eles = this.collapsibleNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.collapseGivenNodes(eles, tempOptions);
      };

      // collapse given eles recursively extend options with given param
      api.collapseRecursively = function (_eles, opts) {
        var eles = this.collapsibleNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return this.collapse(eles.union(eles.descendants()), tempOptions);
      };

      // expand given eles extend options with given param
      api.expand = function (_eles, opts) {
        var eles = this.expandableNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.expandGivenNodes(eles, tempOptions);
      };

      // expand given eles recusively extend options with given param
      api.expandRecursively = function (_eles, opts) {
        var eles = this.expandableNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.expandAllNodes(eles, tempOptions);
      };


      // Core functions

      // collapse all collapsible nodes
      api.collapseAll = function (opts) {
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return this.collapseRecursively(this.collapsibleNodes(), tempOptions);
      };

      // expand all expandable nodes
      api.expandAll = function (opts) {
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return this.expandRecursively(this.expandableNodes(), tempOptions);
      };


      // Utility functions

      // returns if the given node is expandable
      api.isExpandable = function (node) {
        return node.hasClass('cy-expand-collapse-collapsed-node');
      };

      // returns if the given node is collapsible
      api.isCollapsible = function (node) {
        return !this.isExpandable(node) && node.isParent();
      };

      // get collapsible ones inside given nodes if nodes parameter is not specified consider all nodes
      api.collapsibleNodes = function (_nodes) {
        var self = this;
        var nodes = _nodes ? _nodes : cy.nodes();
        return nodes.filter(function (ele, i) {
          if(typeof ele === "number") {
            ele = i;
          }
          return self.isCollapsible(ele);
        });
      };

      // get expandable ones inside given nodes if nodes parameter is not specified consider all nodes
      api.expandableNodes = function (_nodes) {
        var self = this;
        var nodes = _nodes ? _nodes : cy.nodes();
        return nodes.filter(function (ele, i) {
          if(typeof ele === "number") {
            ele = i;
          }
          return self.isExpandable(ele);
        });
      };
      
      // Get the children of the given collapsed node which are removed during collapse operation
      api.getCollapsedChildren = function (node) {
        return node.data('collapsedChildren');
      };

      /** Get collapsed children recursively including nested collapsed children
       * Returned value includes edges and nodes, use selector to get edges or nodes
       * @param node : a collapsed node
       * @return all collapsed children
       */
      api.getCollapsedChildrenRecursively = function(node) {
        var collapsedChildren = cy.collection();
        return expandCollapseUtilities.getCollapsedChildrenRecursively(node, collapsedChildren);
      };

      /** Get collapsed children of all collapsed nodes recursively including nested collapsed children
       * Returned value includes edges and nodes, use selector to get edges or nodes
       * @return all collapsed children
       */
      api.getAllCollapsedChildrenRecursively = function(){
        var collapsedChildren = cy.collection();
        var collapsedNodes = cy.nodes(".cy-expand-collapse-collapsed-node");
        var j;
        for (j=0; j < collapsedNodes.length; j++){
            collapsedChildren = collapsedChildren.union(this.getCollapsedChildrenRecursively(collapsedNodes[j]));
        }
        return collapsedChildren;
      };
      // This method forces the visual cue to be cleared. It is to be called in extreme cases
      api.clearVisualCue = function(node) {
        cy.trigger('expandcollapse.clearvisualcue');
      };

      api.disableCue = function() {
        var options = getScratch(cy, 'options');
        if (options.cueEnabled) {
          cueUtilities('unbind', cy, api);
          options.cueEnabled = false;
        }
      };

      api.enableCue = function() {
        var options = getScratch(cy, 'options');
        if (!options.cueEnabled) {
          cueUtilities('rebind', cy, api);
          options.cueEnabled = true;
        }
      };

      api.getParent = function(nodeId) {
        if(cy.getElementById(nodeId)[0] === undefined){
          var parentData = getScratch(cy, 'parentData');
          return parentData[nodeId];
        }
        else{
          return cy.getElementById(nodeId).parent();
        }
      };

      api.collapseEdges = function(edges,opts){     
        var result =    {edges: cy.collection(), oldEdges: cy.collection()};
        if(edges.length < 2) return result ;
        if(edges.connectedNodes().length > 2) return result;
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts); 
        return expandCollapseUtilities.collapseGivenEdges(edges, tempOptions);
      };
      api.expandEdges = function(edges){    
        var result =    {edges: cy.collection(), oldEdges: cy.collection()}    
        if(edges === undefined) return result; 
        
        //if(typeof edges[Symbol.iterator] === 'function'){//collection of edges is passed
          edges.forEach(function(edge){
            var operationResult = expandCollapseUtilities.expandEdge(edge);
            result.edges = result.edges.add(operationResult.edges);
            result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
           
          });
       /*  }else{//one edge passed
          var operationResult = expandCollapseUtilities.expandEdge(edges);
          result.edges = result.edges.add(operationResult.edges);
          result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
          
        } */

        return result;
       
      };
      api.collapseEdgesBetweenNodes = function(nodes, opts){
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts); 
        function pairwise(list) {
          var pairs = [];
          list
            .slice(0, list.length - 1)
            .forEach(function (first, n) {
              var tail = list.slice(n + 1, list.length);
              tail.forEach(function (item) {
                pairs.push([first, item])
              });
            })
          return pairs;
        }
        var nodesPairs = pairwise(nodes);
        var result = {edges: cy.collection(), oldEdges: cy.collection()};
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');     
          
          if(edges.length >= 2){
            var operationResult = expandCollapseUtilities.collapseGivenEdges(edges, tempOptions)
            result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
            result.edges = result.edges.add(operationResult.edges);
          }    
         
        }.bind(this));       
     
        return result;

      };
      api.expandEdgesBetweenNodes = function(nodes){
        if(nodes.length <= 1) cy.collection();
        var edgesToExpand = cy.collection();
        function pairwise(list) {
          var pairs = [];
          list
            .slice(0, list.length - 1)
            .forEach(function (first, n) {
              var tail = list.slice(n + 1, list.length);
              tail.forEach(function (item) {
                pairs.push([first, item])
              });
            })
          return pairs;
        }
        //var result = {edges: cy.collection(), oldEdges: cy.collection()}   ;     
        var nodesPairs = pairwise(nodes);
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('.cy-expand-collapse-collapsed-edge[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');  
          edgesToExpand = edgesToExpand.union(edges);         
          
        }.bind(this));
        //result.oldEdges = result.oldEdges.add(edgesToExpand);
        //result.edges = result.edges.add(this.expandEdges(edgesToExpand));
        return this.expandEdges(edgesToExpand);
      };
      api.collapseAllEdges = function(opts){
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts); 
        function pairwise(list) {
          var pairs = [];
          list
            .slice(0, list.length - 1)
            .forEach(function (first, n) {
              var tail = list.slice(n + 1, list.length);
              tail.forEach(function (item) {
                pairs.push([first, item])
              });
            })
          return pairs;
        } 
        
        return this.collapseEdgesBetweenNodes(cy.edges().connectedNodes(),opts);
       /*  var nodesPairs = pairwise(cy.edges().connectedNodes());
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');         
          if(edges.length >=2){
            expandCollapseUtilities.collapseGivenEdges(edges, tempOptions);
          }
          
        }.bind(this)); */

      }; 
      api.expandAllEdges = function(){       
        var edges = cy.edges(".cy-expand-collapse-collapsed-edge");
        var result = {edges:cy.collection(), oldEdges : cy.collection()};
        var operationResult = this.expandEdges(edges);
        result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
        result.edges = result.edges.add(operationResult.edges);   
        return result;
      };

     
     
      return api; // Return the API instance
    }

    // Get the whole scratchpad reserved for this extension (on an element or core) or get a single property of it
    function getScratch (cyOrEle, name) {
      if (cyOrEle.scratch('_cyExpandCollapse') === undefined) {
        cyOrEle.scratch('_cyExpandCollapse', {});
      }

      var scratch = cyOrEle.scratch('_cyExpandCollapse');
      var retVal = ( name === undefined ) ? scratch : scratch[name];
      return retVal;
    }

    // Set a single property on scratchpad of an element or the core
    function setScratch (cyOrEle, name, val) {
      getScratch(cyOrEle)[name] = val;
    }

    // register the extension cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      var cy = this;

      var options = getScratch(cy, 'options') || {
        layoutBy: null, // for rearrange after expand/collapse. It's just layout options or whole layout function. Choose your side!
        fisheye: true, // whether to perform fisheye view after expand/collapse you can specify a function too
        animate: true, // whether to animate on drawing changes you can specify a function too
        animationDuration: 1000, // when animate is true, the duration in milliseconds of the animation
        ready: function () { }, // callback when expand/collapse initialized
        undoable: true, // and if undoRedoExtension exists,

        cueEnabled: true, // Whether cues are enabled
        expandCollapseCuePosition: 'top-left', // default cue position is top left you can specify a function per node too
        expandCollapseCueSize: 12, // size of expand-collapse cue
        expandCollapseCueLineSize: 8, // size of lines used for drawing plus-minus icons
        expandCueImage: undefined, // image of expand icon if undefined draw regular expand cue
        collapseCueImage: undefined, // image of collapse icon if undefined draw regular collapse cue
        expandCollapseCueSensitivity: 1, // sensitivity of expand-collapse cues
       
        edgeTypeInfo : "edgeType", //the name of the field that has the edge type, retrieved from edge.data(), can be a function
        groupEdgesOfSameTypeOnCollapse: false,
        allowNestedEdgeCollapse: true,
        zIndex: 999 // z-index value of the canvas in which cue ımages are drawn
      };

      // If opts is not 'get' that is it is a real options object then initilize the extension
      if (opts !== 'get') {
        options = extendOptions(options, opts);

        var expandCollapseUtilities = _dereq_('./expandCollapseUtilities')(cy);
        var api = createExtensionAPI(cy, expandCollapseUtilities); // creates and returns the API instance for the extension

        setScratch(cy, 'api', api);

        undoRedoUtilities(cy, api);

        cueUtilities(options, cy, api);

        // if the cue is not enabled unbind cue events
        if(!options.cueEnabled) {
          cueUtilities('unbind', cy, api);
        }

        if ( options.ready ) {
          options.ready();
        }

        setScratch(cy, 'options', options);

        var parentData = {};
        setScratch(cy, 'parentData', parentData);
      }

      return getScratch(cy, 'api'); // Expose the API to the users
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

})();

},{"./cueUtilities":2,"./expandCollapseUtilities":5,"./undoRedoUtilities":7}],7:[function(_dereq_,module,exports){
module.exports = function (cy, api) {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({}, true);

  function getEles(_eles) {
    return (typeof _eles === "string") ? cy.$(_eles) : _eles;
  }

  function getNodePositions() {
    var positions = {};
    var nodes = cy.nodes();

    for (var i = 0; i < nodes.length; i++) {
      var ele = nodes[i];
      positions[ele.id()] = {
        x: ele.position("x"),
        y: ele.position("y")
      };
    }

    return positions;
  }

  function returnToPositions(positions) {
    var currentPositions = {};
    cy.nodes().not(":parent").positions(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      currentPositions[ele.id()] = {
        x: ele.position("x"),
        y: ele.position("y")
      };
      var pos = positions[ele.id()];
      return {
        x: pos.x,
        y: pos.y
      };
    });

    return currentPositions;
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
        result.oldData = getNodePositions();
        result.nodes = func.indexOf("All") > 0 ? api[func](args.options) : api[func](nodes, args.options);
      } else {
        result.oldData = getNodePositions();
        result.nodes = func.indexOf("All") > 0 ? api[func](secondTimeOpts) : api[func](cy.collection(nodes), secondTimeOpts);
        returnToPositions(args.oldData);
      }

      return result;
    };
  }

  var actions = ["collapse", "collapseRecursively", "collapseAll", "expand", "expandRecursively", "expandAll"];

  for (var i = 0; i < actions.length; i++) {
    if(i == 2)
      ur.action("collapseAll", doIt("collapseAll"), doIt("expandRecursively"));
    else if(i == 5)
      ur.action("expandAll", doIt("expandAll"), doIt("collapseRecursively"));
    else
      ur.action(actions[i], doIt(actions[i]), doIt(actions[(i + 3) % 6]));
  }

  function collapseEdges(args){    
    var options = args.options;
    var edges = args.edges;
    var result = {};
    
    result.options = options;
    if(args.firstTime){
      var collapseResult = api.collapseEdges(edges,options);    
      result.edges = collapseResult.edges;
      result.oldEdges = collapseResult.oldEdges;  
      result.firstTime = false;
    }else{
      result.oldEdges = edges;
      result.edges = args.oldEdges;
      if(args.edges.length > 0 && args.oldEdges.length > 0){
        cy.remove(args.edges);
        cy.add(args.oldEdges);
      }
     
     
    }

    return result;
  }
  function collapseEdgesBetweenNodes(args){
    var options = args.options;
    var result = {};
    result.options = options;
    if(args.firstTime){
     var collapseAllResult = api.collapseEdgesBetweenNodes(args.nodes, options);
     result.edges = collapseAllResult.edges;
     result.oldEdges = collapseAllResult.oldEdges;
     result.firstTime = false;
    }else{
     result.edges = args.oldEdges;
     result.oldEdges = args.edges;
     if(args.edges.length > 0 && args.oldEdges.length > 0){
      cy.remove(args.edges);
      cy.add(args.oldEdges);
      }
    
    }
 
    return result;

 }
 function collapseAllEdges(args){
   var options = args.options;
   var result = {};
   result.options = options;
   if(args.firstTime){
    var collapseAllResult = api.collapseAllEdges(options);
    result.edges = collapseAllResult.edges;
    result.oldEdges = collapseAllResult.oldEdges;
    result.firstTime = false;
   }else{
    result.edges = args.oldEdges;
    result.oldEdges = args.edges;
    if(args.edges.length > 0  && args.oldEdges.length > 0){
      cy.remove(args.edges);
      cy.add(args.oldEdges);
      }
   
   }

   return result;
 }
 function expandEdges(args){   
   var options = args.options;
   var result ={};
  
   result.options = options;
   if(args.firstTime){
     var expandResult = api.expandEdges(args.edges);
    result.edges = expandResult.edges;
    result.oldEdges = expandResult.oldEdges;
    result.firstTime = false;
    
   }else{
    result.oldEdges = args.edges;
    result.edges = args.oldEdges;
    if(args.edges.length > 0 && args.oldEdges.length > 0){
      cy.remove(args.edges);
      cy.add(args.oldEdges);
      }
  
   }

   return result;
 }
 function expandEdgesBetweenNodes(args){
  var options = args.options;
  var result = {};
  result.options = options;
  if(args.firstTime){
   var collapseAllResult = api.expandEdgesBetweenNodes(args.nodes,options);
   result.edges = collapseAllResult.edges;
   result.oldEdges = collapseAllResult.oldEdges;
   result.firstTime = false;
  }else{
   result.edges = args.oldEdges;
   result.oldEdges = args.edges;
   if(args.edges.length > 0 && args.oldEdges.length > 0){
    cy.remove(args.edges);
    cy.add(args.oldEdges);
    }
  
  }

  return result;
 }
 function expandAllEdges(args){
  var options = args.options;
  var result = {};
  result.options = options;
  if(args.firstTime){
   var expandResult = api.expandAllEdges(options);
   result.edges = expandResult.edges;
   result.oldEdges = expandResult.oldEdges;
   result.firstTime = false;
  }else{
   result.edges = args.oldEdges;
   result.oldEdges = args.edges;
   if(args.edges.length > 0 && args.oldEdges.length > 0){
    cy.remove(args.edges);
    cy.add(args.oldEdges);
    }
   
  }

  return result;
 }
 
 
  ur.action("collapseEdges", collapseEdges, expandEdges);
  ur.action("expandEdges", expandEdges, collapseEdges);

  ur.action("collapseEdgesBetweenNodes", collapseEdgesBetweenNodes, expandEdgesBetweenNodes);
  ur.action("expandEdgesBetweenNodes", expandEdgesBetweenNodes, collapseEdgesBetweenNodes);

  ur.action("collapseAllEdges", collapseAllEdges, expandAllEdges);
  ur.action("expandAllEdges", expandAllEdges, collapseAllEdges);

 


  


};

},{}]},{},[6])(6)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2VsZW1lbnRVdGlsaXRpZXMuanMiLCJzcmMvZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvdW5kb1JlZG9VdGlsaXRpZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSB7XHJcbiAgZXF1YWxCb3VuZGluZ0JveGVzOiBmdW5jdGlvbihiYjEsIGJiMil7XHJcbiAgICAgIHJldHVybiBiYjEueDEgPT0gYmIyLngxICYmIGJiMS54MiA9PSBiYjIueDIgJiYgYmIxLnkxID09IGJiMi55MSAmJiBiYjEueTIgPT0gYmIyLnkyO1xyXG4gIH0sXHJcbiAgZ2V0VW5pb246IGZ1bmN0aW9uKGJiMSwgYmIyKXtcclxuICAgICAgdmFyIHVuaW9uID0ge1xyXG4gICAgICB4MTogTWF0aC5taW4oYmIxLngxLCBiYjIueDEpLFxyXG4gICAgICB4MjogTWF0aC5tYXgoYmIxLngyLCBiYjIueDIpLFxyXG4gICAgICB5MTogTWF0aC5taW4oYmIxLnkxLCBiYjIueTEpLFxyXG4gICAgICB5MjogTWF0aC5tYXgoYmIxLnkyLCBiYjIueTIpLFxyXG4gICAgfTtcclxuXHJcbiAgICB1bmlvbi53ID0gdW5pb24ueDIgLSB1bmlvbi54MTtcclxuICAgIHVuaW9uLmggPSB1bmlvbi55MiAtIHVuaW9uLnkxO1xyXG5cclxuICAgIHJldHVybiB1bmlvbjtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJvdW5kaW5nQm94VXRpbGl0aWVzOyIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3ksIGFwaSkge1xyXG4gIHZhciBlbGVtZW50VXRpbGl0aWVzO1xyXG4gIHZhciBmbiA9IHBhcmFtcztcclxuXHJcbiAgdmFyIG5vZGVXaXRoUmVuZGVyZWRDdWU7XHJcblxyXG4gIGNvbnN0IGdldERhdGEgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XHJcbiAgICByZXR1cm4gc2NyYXRjaCAmJiBzY3JhdGNoLmN1ZVV0aWxpdGllcztcclxuICB9O1xyXG5cclxuICBjb25zdCBzZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBzY3JhdGNoID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKTtcclxuICAgIGlmIChzY3JhdGNoID09IG51bGwpIHtcclxuICAgICAgc2NyYXRjaCA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIHNjcmF0Y2guY3VlVXRpbGl0aWVzID0gZGF0YTtcclxuICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJywgc2NyYXRjaCk7XHJcbiAgfTtcclxuXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyICRjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgJGNhbnZhcy5jbGFzc0xpc3QuYWRkKFwiZXhwYW5kLWNvbGxhcHNlLWNhbnZhc1wiKTtcclxuICAgICAgdmFyICRjb250YWluZXIgPSBjeS5jb250YWluZXIoKTtcclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGNhbnZhcyk7XHJcblxyXG4gICAgICBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJykoY3kpO1xyXG5cclxuICAgICAgdmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbHQpIHtcclxuICAgICAgICB2YXIgcmVjdCA9IGVsdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHRvcDogcmVjdC50b3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wLFxyXG4gICAgICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnRcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzLmhlaWdodCA9IGN5LmNvbnRhaW5lcigpLm9mZnNldEhlaWdodDtcclxuICAgICAgICAkY2FudmFzLndpZHRoID0gY3kuY29udGFpbmVyKCkub2Zmc2V0V2lkdGg7XHJcbiAgICAgICAgJGNhbnZhcy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcbiAgICAgICAgJGNhbnZhcy5zdHlsZS50b3AgPSAwO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IDA7XHJcbiAgICAgICAgJGNhbnZhcy5zdHlsZS56SW5kZXggPSBvcHRpb25zKCkuekluZGV4O1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBjYW52YXNCYiA9IG9mZnNldCgkY2FudmFzKTtcclxuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9IG9mZnNldCgkY29udGFpbmVyKTtcclxuICAgICAgICAgICRjYW52YXMuc3R5bGUudG9wID0gLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApO1xyXG4gICAgICAgICAgJGNhbnZhcy5zdHlsZS5sZWZ0ID0gLShjYW52YXNCYi5sZWZ0IC0gY29udGFpbmVyQmIubGVmdCk7XHJcblxyXG4gICAgICAgICAgLy8gcmVmcmVzaCB0aGUgY3VlcyBvbiBjYW52YXMgcmVzaXplXHJcbiAgICAgICAgICBpZiAoY3kpIHtcclxuICAgICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCAwKTtcclxuXHJcbiAgICAgIH0sIDI1MCk7XHJcblxyXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xyXG4gICAgICAgIF9zaXplQ2FudmFzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNpemVDYW52YXMoKTtcclxuXHJcbiAgICAgIHZhciBkYXRhID0ge307XHJcblxyXG4gICAgICAvLyBpZiB0aGVyZSBhcmUgZXZlbnRzIGZpZWxkIGluIGRhdGEgdW5iaW5kIHRoZW0gaGVyZVxyXG4gICAgICAvLyB0byBwcmV2ZW50IGJpbmRpbmcgdGhlIHNhbWUgZXZlbnQgbXVsdGlwbGUgdGltZXNcclxuICAgICAgLy8gaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgIC8vICAgZnVuY3Rpb25zWyd1bmJpbmQnXS5hcHBseSggJGNvbnRhaW5lciApO1xyXG4gICAgICAvLyB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLm9wdGlvbnM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIGNsZWFyRHJhd3MoKSB7XHJcbiAgICAgICAgdmFyIHcgPSBjeS53aWR0aCgpO1xyXG4gICAgICAgIHZhciBoID0gY3kuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcbiAgICAgICAgbm9kZVdpdGhSZW5kZXJlZEN1ZSA9IG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKSB7XHJcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKTtcclxuICAgICAgICB2YXIgaGFzQ2hpbGRyZW4gPSBjaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuICE9IHVuZGVmaW5lZCAmJiBjaGlsZHJlbi5sZW5ndGggPiAwO1xyXG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBzaW1wbGUgbm9kZSB3aXRoIG5vIGNvbGxhcHNlZCBjaGlsZHJlbiByZXR1cm4gZGlyZWN0bHlcclxuICAgICAgICBpZiAoIWhhc0NoaWxkcmVuICYmICFjb2xsYXBzZWRDaGlsZHJlbikge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGlzQ29sbGFwc2VkID0gbm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcblxyXG4gICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xyXG4gICAgICAgIHZhciByZWN0U2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNpemU7XHJcbiAgICAgICAgdmFyIGxpbmVTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU7XHJcblxyXG4gICAgICAgIHZhciBjdWVDZW50ZXI7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbiA9PT0gJ3RvcC1sZWZ0Jykge1xyXG4gICAgICAgICAgdmFyIG9mZnNldCA9IDE7XHJcbiAgICAgICAgICB2YXIgc2l6ZSA9IGN5Lnpvb20oKSA8IDEgPyByZWN0U2l6ZSAvICgyICogY3kuem9vbSgpKSA6IHJlY3RTaXplIC8gMjtcclxuICAgICAgICAgIHZhciBub2RlQm9yZGVyV2lkID0gcGFyc2VGbG9hdChub2RlLmNzcygnYm9yZGVyLXdpZHRoJykpO1xyXG4gICAgICAgICAgdmFyIHggPSBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLndpZHRoKCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1sZWZ0JykpXHJcbiAgICAgICAgICAgICsgbm9kZUJvcmRlcldpZCArIHNpemUgKyBvZmZzZXQ7XHJcbiAgICAgICAgICB2YXIgeSA9IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuaGVpZ2h0KCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy10b3AnKSlcclxuICAgICAgICAgICAgKyBub2RlQm9yZGVyV2lkICsgc2l6ZSArIG9mZnNldDtcclxuXHJcbiAgICAgICAgICBjdWVDZW50ZXIgPSB7IHg6IHgsIHk6IHkgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uO1xyXG4gICAgICAgICAgY3VlQ2VudGVyID0gdHlwZW9mIG9wdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbi5jYWxsKHRoaXMsIG5vZGUpIDogb3B0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyID0gZWxlbWVudFV0aWxpdGllcy5jb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKGN1ZUNlbnRlcik7XHJcblxyXG4gICAgICAgIC8vIGNvbnZlcnQgdG8gcmVuZGVyZWQgc2l6ZXNcclxuICAgICAgICByZWN0U2l6ZSA9IE1hdGgubWF4KHJlY3RTaXplLCByZWN0U2l6ZSAqIGN5Lnpvb20oKSk7XHJcbiAgICAgICAgbGluZVNpemUgPSBNYXRoLm1heChsaW5lU2l6ZSwgbGluZVNpemUgKiBjeS56b29tKCkpO1xyXG4gICAgICAgIHZhciBkaWZmID0gKHJlY3RTaXplIC0gbGluZVNpemUpIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLng7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLnk7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFkgPSBleHBhbmRjb2xsYXBzZUNlbnRlclkgLSByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVjdFNpemUgPSByZWN0U2l6ZTtcclxuXHJcbiAgICAgICAgLy8gRHJhdyBleHBhbmQvY29sbGFwc2UgY3VlIGlmIHNwZWNpZmllZCB1c2UgYW4gaW1hZ2UgZWxzZSByZW5kZXIgaXQgaW4gdGhlIGRlZmF1bHQgd2F5XHJcbiAgICAgICAgaWYgKGlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZSkge1xyXG4gICAgICAgICAgZHJhd0ltZyhvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UsIGV4cGFuZGNvbGxhcHNlU3RhcnRYLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSwgcmVjdFNpemUsIHJlY3RTaXplKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIWlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlKSB7XHJcbiAgICAgICAgICBkcmF3SW1nKG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlLCBleHBhbmRjb2xsYXBzZVN0YXJ0WCwgZXhwYW5kY29sbGFwc2VTdGFydFksIHJlY3RTaXplLCByZWN0U2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgdmFyIG9sZEZpbGxTdHlsZSA9IGN0eC5maWxsU3R5bGU7XHJcbiAgICAgICAgICB2YXIgb2xkV2lkdGggPSBjdHgubGluZVdpZHRoO1xyXG4gICAgICAgICAgdmFyIG9sZFN0cm9rZVN0eWxlID0gY3R4LnN0cm9rZVN0eWxlO1xyXG5cclxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgICAgY3R4LmVsbGlwc2UoZXhwYW5kY29sbGFwc2VDZW50ZXJYLCBleHBhbmRjb2xsYXBzZUNlbnRlclksIHJlY3RTaXplIC8gMiwgcmVjdFNpemUgLyAyLCAwLCAwLCAyICogTWF0aC5QSSk7XHJcbiAgICAgICAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gTWF0aC5tYXgoMi42LCAyLjYgKiBjeS56b29tKCkpO1xyXG5cclxuICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XHJcbiAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgbGluZVNpemUgKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XHJcblxyXG4gICAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XHJcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgZGlmZik7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgbGluZVNpemUgKyBkaWZmKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gb2xkU3Ryb2tlU3R5bGU7XHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gb2xkRmlsbFN0eWxlO1xyXG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IG9sZFdpZHRoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbm9kZS5kYXRhKCdleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYJywgZXhwYW5kY29sbGFwc2VTdGFydFgpO1xyXG4gICAgICAgIG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WScsIGV4cGFuZGNvbGxhcHNlU3RhcnRZKTtcclxuICAgICAgICBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplJywgZXhwYW5kY29sbGFwc2VSZWN0U2l6ZSk7XHJcblxyXG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBub2RlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBkcmF3SW1nKGltZ1NyYywgeCwgeSwgdywgaCkge1xyXG4gICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UodywgaCk7XHJcbiAgICAgICAgaW1nLnNyYyA9IGltZ1NyYztcclxuICAgICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIHgsIHksIHcsIGgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5Lm9uKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKSB7XHJcbiAgICAgICAgICBjbGVhckRyYXdzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHZhciBvbGRNb3VzZVBvcyA9IG51bGwsIGN1cnJNb3VzZVBvcyA9IG51bGw7XHJcbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCBkYXRhLmVNb3VzZURvd24gPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIG9sZE1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ21vdXNldXAnLCBkYXRhLmVNb3VzZVVwID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBjdXJyTW91c2VQb3MgPSBlLnJlbmRlcmVkUG9zaXRpb24gfHwgZS5jeVJlbmRlcmVkUG9zaXRpb25cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjeS5vbigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY2xlYXJEcmF3cygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHZhciB1cjtcclxuICAgICAgY3kub24oJ3NlbGVjdCB1bnNlbGVjdCcsIGRhdGEuZVNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiBjeS5ub2RlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGgpIHtcclxuICAgICAgICAgIHRoaXMudW5zZWxlY3QoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5vZGVXaXRoUmVuZGVyZWRDdWUpIHtcclxuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGlzT25seTFTZWxlY3RlZCA9IGN5LiQoJzpzZWxlY3RlZCcpLmxlbmd0aCA9PSAxO1xyXG4gICAgICAgIHZhciBpc09ubHkxU2VsZWN0ZWRDb21wdW5kTm9kZSA9IGN5Lm5vZGVzKCc6cGFyZW50JykuZmlsdGVyKCc6c2VsZWN0ZWQnKS5sZW5ndGggPT0gMSAmJiBpc09ubHkxU2VsZWN0ZWQ7XHJcbiAgICAgICAgdmFyIGlzT25seTFTZWxlY3RlZENvbGxhcHNlZE5vZGUgPSBjeS5ub2RlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpLmZpbHRlcignOnNlbGVjdGVkJykubGVuZ3RoID09IDEgJiYgaXNPbmx5MVNlbGVjdGVkO1xyXG4gICAgICAgIGlmIChpc09ubHkxU2VsZWN0ZWRDb2xsYXBzZWROb2RlIHx8IGlzT25seTFTZWxlY3RlZENvbXB1bmROb2RlKSB7XHJcbiAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUoY3kubm9kZXMoJzpzZWxlY3RlZCcpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ3RhcCcsIGRhdGEuZVRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZVdpdGhSZW5kZXJlZEN1ZTtcclxuICAgICAgICBpZiAoIW5vZGUpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFgnKTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WScpO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgPSBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplJyk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xyXG5cclxuICAgICAgICB2YXIgY3lSZW5kZXJlZFBvcyA9IGV2ZW50LnJlbmRlcmVkUG9zaXRpb24gfHwgZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uO1xyXG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zWCA9IGN5UmVuZGVyZWRQb3MueDtcclxuICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1kgPSBjeVJlbmRlcmVkUG9zLnk7XHJcbiAgICAgICAgdmFyIG9wdHMgPSBvcHRpb25zKCk7XHJcbiAgICAgICAgdmFyIGZhY3RvciA9IChvcHRzLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XHJcblxyXG4gICAgICAgIGlmICgoTWF0aC5hYnMob2xkTW91c2VQb3MueCAtIGN1cnJNb3VzZVBvcy54KSA8IDUgJiYgTWF0aC5hYnMob2xkTW91c2VQb3MueSAtIGN1cnJNb3VzZVBvcy55KSA8IDUpXHJcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3IpIHtcclxuICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlICYmICF1cilcclxuICAgICAgICAgICAgdXIgPSBjeS51bmRvUmVkbyh7XHJcbiAgICAgICAgICAgICAgZGVmYXVsdEFjdGlvbnM6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgaWYgKGFwaS5pc0NvbGxhcHNpYmxlKG5vZGUpKVxyXG4gICAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgIHVyLmRvKFwiY29sbGFwc2VcIiwge1xyXG4gICAgICAgICAgICAgICAgbm9kZXM6IG5vZGUsXHJcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRzXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIGFwaS5jb2xsYXBzZShub2RlLCBvcHRzKTtcclxuICAgICAgICAgIGVsc2UgaWYgKGFwaS5pc0V4cGFuZGFibGUobm9kZSkpXHJcbiAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKVxyXG4gICAgICAgICAgICAgIHVyLmRvKFwiZXhwYW5kXCIsIHtcclxuICAgICAgICAgICAgICAgIG5vZGVzOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgYXBpLmV4cGFuZChub2RlLCBvcHRzKTtcclxuXHJcbiAgICAgICAgICBpZiAobm9kZS5zZWxlY3RhYmxlKCkpIHtcclxuICAgICAgICAgICAgbm9kZS51bnNlbGVjdGlmeSgpO1xyXG4gICAgICAgICAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kIGV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2UnLCAnbm9kZScsIGRhdGEuZUFmdGVyRXhwYW5kQ29sbGFwc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGRlbGF5ID0gNTAgKyBwYXJhbXMuYW5pbWF0ZSA/IHBhcmFtcy5hbmltYXRpb25EdXJhdGlvbiA6IDA7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZSh0aGlzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBkZWxheSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXHJcbiAgICAgIGRhdGEuaGFzRXZlbnRGaWVsZHMgPSB0cnVlO1xyXG4gICAgICBzZXREYXRhKGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyB2YXIgJGNvbnRhaW5lciA9IHRoaXM7XHJcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xyXG5cclxuICAgICAgaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byB1bmJpbmQgZG9lcyBub3QgZXhpc3QnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5LnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJyk7XHJcblxyXG4gICAgICBjeS5vZmYoJ21vdXNlZG93bicsICdub2RlJywgZGF0YS5lTW91c2VEb3duKVxyXG4gICAgICAgIC5vZmYoJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXHJcbiAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUpXHJcbiAgICAgICAgLm9mZigndGFwJywgJ25vZGUnLCBkYXRhLmVUYXApXHJcbiAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXHJcbiAgICAgICAgLm9mZignc2VsZWN0IHVuc2VsZWN0JywgZGF0YS5lU2VsZWN0KVxyXG4gICAgICAgIC5vZmYoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kIGV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2UnLCAnbm9kZScsIGRhdGEuZUFmdGVyRXhwYW5kQ29sbGFwc2UpXHJcbiAgICAgICAgLm9mZignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcclxuICAgICAgICAub2ZmKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSk7XHJcbiAgICB9LFxyXG4gICAgcmViaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xyXG5cclxuICAgICAgaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byByZWJpbmQgZG9lcyBub3QgZXhpc3QnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcclxuICAgICAgICAub24oJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXHJcbiAgICAgICAgLm9uKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcclxuICAgICAgICAub24oJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxyXG4gICAgICAgIC5vbignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXHJcbiAgICAgICAgLm9uKCdzZWxlY3QgdW5zZWxlY3QnLCBkYXRhLmVTZWxlY3QpXHJcbiAgICAgICAgLm9uKCdleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZCBleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlJywgJ25vZGUnLCBkYXRhLmVBZnRlckV4cGFuZENvbGxhcHNlKVxyXG4gICAgICAgIC5vbignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcclxuICAgICAgICAub24oJ3Jlc2l6ZScsIGRhdGEuZUN5UmVzaXplKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkoY3kuY29udGFpbmVyKCksIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KGN5LmNvbnRhaW5lcigpLCBhcmd1bWVudHMpO1xyXG4gIH1cclxuICB0aHJvdyBuZXcgRXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZXhwYW5kLWNvbGxhcHNlJyk7XHJcblxyXG59O1xyXG4iLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCJmdW5jdGlvbiBlbGVtZW50VXRpbGl0aWVzKGN5KSB7XHJcbiByZXR1cm4ge1xyXG4gIG1vdmVOb2RlczogZnVuY3Rpb24gKHBvc2l0aW9uRGlmZiwgbm9kZXMsIG5vdENhbGNUb3BNb3N0Tm9kZXMpIHtcclxuICAgIHZhciB0b3BNb3N0Tm9kZXMgPSBub3RDYWxjVG9wTW9zdE5vZGVzID8gbm9kZXMgOiB0aGlzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBub25QYXJlbnRzID0gdG9wTW9zdE5vZGVzLm5vdChcIjpwYXJlbnRcIik7IFxyXG4gICAgLy8gbW92aW5nIHBhcmVudHMgc3BvaWxzIHBvc2l0aW9uaW5nLCBzbyBtb3ZlIG9ubHkgbm9ucGFyZW50c1xyXG4gICAgbm9uUGFyZW50cy5wb3NpdGlvbnMoZnVuY3Rpb24oZWxlLCBpKXtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBub25QYXJlbnRzW2ldLnBvc2l0aW9uKFwieFwiKSArIHBvc2l0aW9uRGlmZi54LFxyXG4gICAgICAgIHk6IG5vblBhcmVudHNbaV0ucG9zaXRpb24oXCJ5XCIpICsgcG9zaXRpb25EaWZmLnlcclxuICAgICAgfTtcclxuICAgIH0pO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3BNb3N0Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSB0b3BNb3N0Tm9kZXNbaV07XHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgICAgdGhpcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBjaGlsZHJlbiwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZXRUb3BNb3N0Tm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICB2YXIgbm9kZXNNYXAgPSB7fTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcclxuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIGVsZSA9IGk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50KClbMF07XHJcbiAgICAgIHdoaWxlIChwYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgIGlmIChub2Rlc01hcFtwYXJlbnQuaWQoKV0pIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudCgpWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJvb3RzO1xyXG4gIH0sXHJcbiAgcmVhcnJhbmdlOiBmdW5jdGlvbiAobGF5b3V0QnkpIHtcclxuICAgIGlmICh0eXBlb2YgbGF5b3V0QnkgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICBsYXlvdXRCeSgpO1xyXG4gICAgfSBlbHNlIGlmIChsYXlvdXRCeSAhPSBudWxsKSB7XHJcbiAgICAgIHZhciBsYXlvdXQgPSBjeS5sYXlvdXQobGF5b3V0QnkpO1xyXG4gICAgICBpZiAobGF5b3V0ICYmIGxheW91dC5ydW4pIHtcclxuICAgICAgICBsYXlvdXQucnVuKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb246IGZ1bmN0aW9uIChtb2RlbFBvc2l0aW9uKSB7XHJcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcclxuICAgIHZhciB5ID0gbW9kZWxQb3NpdGlvbi55ICogem9vbSArIHBhbi55O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IHgsXHJcbiAgICAgIHk6IHlcclxuICAgIH07XHJcbiAgfVxyXG4gfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JvdW5kaW5nQm94VXRpbGl0aWVzJyk7XHJcblxyXG4vLyBFeHBhbmQgY29sbGFwc2UgdXRpbGl0aWVzXHJcbmZ1bmN0aW9uIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKGN5KSB7XHJcbnZhciBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJykoY3kpO1xyXG5yZXR1cm4ge1xyXG4gIC8vdGhlIG51bWJlciBvZiBub2RlcyBtb3ZpbmcgYW5pbWF0ZWRseSBhZnRlciBleHBhbmQgb3BlcmF0aW9uXHJcbiAgYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudDogMCxcclxuICAvKlxyXG4gICAqIEEgZnVudGlvbiBiYXNpY2x5IGV4cGFuZGluZyBhIG5vZGUsIGl0IGlzIHRvIGJlIGNhbGxlZCB3aGVuIGEgbm9kZSBpcyBleHBhbmRlZCBhbnl3YXkuXHJcbiAgICogU2luZ2xlIHBhcmFtZXRlciBpbmRpY2F0ZXMgaWYgdGhlIG5vZGUgaXMgZXhwYW5kZWQgYWxvbmUgYW5kIGlmIGl0IGlzIHRydXRoeSB0aGVuIGxheW91dEJ5IHBhcmFtZXRlciBpcyBjb25zaWRlcmVkIHRvXHJcbiAgICogcGVyZm9ybSBsYXlvdXQgYWZ0ZXIgZXhwYW5kLlxyXG4gICAqL1xyXG4gIGV4cGFuZE5vZGVCYXNlRnVuY3Rpb246IGZ1bmN0aW9uIChub2RlLCBzaW5nbGUsIGxheW91dEJ5KSB7XHJcbiAgICBpZiAoIW5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbil7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvL2NoZWNrIGhvdyB0aGUgcG9zaXRpb24gb2YgdGhlIG5vZGUgaXMgY2hhbmdlZFxyXG4gICAgdmFyIHBvc2l0aW9uRGlmZiA9IHtcclxuICAgICAgeDogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS54LFxyXG4gICAgICB5OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgLSBub2RlLl9wcml2YXRlLmRhdGFbJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZSddLnlcclxuICAgIH07XHJcblxyXG4gICAgbm9kZS5yZW1vdmVEYXRhKFwiaW5mb0xhYmVsXCIpO1xyXG4gICAgbm9kZS5yZW1vdmVDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcblxyXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYmVmb3JlZXhwYW5kXCIpO1xyXG4gICAgdmFyIHJlc3RvcmVkTm9kZXMgPSBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICByZXN0b3JlZE5vZGVzLnJlc3RvcmUoKTtcclxuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHJlc3RvcmVkTm9kZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICBkZWxldGUgcGFyZW50RGF0YVtyZXN0b3JlZE5vZGVzW2ldLmlkKCldO1xyXG4gICAgfVxyXG4gICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhID0gcGFyZW50RGF0YTtcclxuICAgIHRoaXMucmVwYWlyRWRnZXMobm9kZSk7XHJcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xyXG5cclxuICAgIGVsZW1lbnRVdGlsaXRpZXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgbm9kZS5jaGlsZHJlbigpKTtcclxuICAgIG5vZGUucmVtb3ZlRGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJyk7XHJcblxyXG4gICAgbm9kZS50cmlnZ2VyKFwicG9zaXRpb25cIik7IC8vIHBvc2l0aW9uIG5vdCB0cmlnZ2VyZWQgYnkgZGVmYXVsdCB3aGVuIG5vZGVzIGFyZSBtb3ZlZFxyXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmRcIik7XHJcblxyXG4gICAgLy8gSWYgZXhwYW5kIGlzIGNhbGxlZCBqdXN0IGZvciBvbmUgbm9kZSB0aGVuIGNhbGwgZW5kIG9wZXJhdGlvbiB0byBwZXJmb3JtIGxheW91dFxyXG4gICAgaWYgKHNpbmdsZSkge1xyXG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbihsYXlvdXRCeSwgbm9kZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEEgaGVscGVyIGZ1bmN0aW9uIHRvIGNvbGxhcHNlIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXHJcbiAgICogSXQgY29sbGFwc2VzIGFsbCByb290IG5vZGVzIGJvdHRvbSB1cC5cclxuICAgKi9cclxuICBzaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICBub2Rlcy5kYXRhKFwiY29sbGFwc2VcIiwgdHJ1ZSk7XHJcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBDb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyXHJcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChyb290KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBBIGhlbHBlciBmdW5jdGlvbiB0byBleHBhbmQgZ2l2ZW4gbm9kZXMgaW4gYSBzaW1wbGUgd2F5IChXaXRob3V0IHBlcmZvcm1pbmcgbGF5b3V0IGFmdGVyd2FyZClcclxuICAgKiBJdCBleHBhbmRzIGFsbCB0b3AgbW9zdCBub2RlcyB0b3AgZG93bi5cclxuICAgKi9cclxuICBzaW1wbGVFeHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcbiAgICBub2Rlcy5kYXRhKFwiZXhwYW5kXCIsIHRydWUpOyAvLyBNYXJrIHRoYXQgdGhlIG5vZGVzIGFyZSBzdGlsbCB0byBiZSBleHBhbmRlZFxyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24ocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpOyAvLyBGb3IgZWFjaCByb290IG5vZGUgZXhwYW5kIHRvcCBkb3duXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEV4cGFuZHMgYWxsIG5vZGVzIGJ5IGV4cGFuZGluZyBhbGwgdG9wIG1vc3Qgbm9kZXMgdG9wIGRvd24gd2l0aCB0aGVpciBkZXNjZW5kYW50cy5cclxuICAgKi9cclxuICBzaW1wbGVFeHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgaWYgKG5vZGVzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG4gICAgfVxyXG4gICAgdmFyIG9ycGhhbnM7XHJcbiAgICBvcnBoYW5zID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgdmFyIGV4cGFuZFN0YWNrID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ycGhhbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSBvcnBoYW5zW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24ocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBleHBhbmRTdGFjaztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogVGhlIG9wZXJhdGlvbiB0byBiZSBwZXJmb3JtZWQgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCByZWFycmFuZ2Ugbm9kZXMgYnkgbGF5b3V0QnkgcGFyYW1ldGVyLlxyXG4gICAqL1xyXG4gIGVuZE9wZXJhdGlvbjogZnVuY3Rpb24gKGxheW91dEJ5LCBub2Rlcykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgY3kucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcclxuICAgICAgICBpZihjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkKXtcclxuICAgICAgICAgIG5vZGVzLnNlbGVjdGlmeSgpO1xyXG4gICAgICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfSwgMCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIENhbGxzIHNpbXBsZSBleHBhbmRBbGxOb2Rlcy4gVGhlbiBwZXJmb3JtcyBlbmQgb3BlcmF0aW9uLlxyXG4gICAqL1xyXG4gIGV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xyXG4gICAgdmFyIGV4cGFuZGVkU3RhY2sgPSB0aGlzLnNpbXBsZUV4cGFuZEFsbE5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xyXG5cclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGV4cGFuZGVkU3RhY2s7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEV4cGFuZHMgdGhlIHJvb3QgYW5kIGl0cyBjb2xsYXBzZWQgZGVzY2VuZGVudHMgaW4gdG9wIGRvd24gb3JkZXIuXHJcbiAgICovXHJcbiAgZXhwYW5kQWxsVG9wRG93bjogZnVuY3Rpb24gKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIGV4cGFuZFN0YWNrLnB1c2gocm9vdCk7XHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihub2RlLCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9FeHBhbmQgdGhlIGdpdmVuIG5vZGVzIHBlcmZvcm0gZW5kIG9wZXJhdGlvbiBhZnRlciBleHBhbmRhdGlvblxyXG4gIGV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykge1xyXG4gICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB0byBleHBhbmQgd2UgbmVlZCB0byBhbmltYXRlIGZvciBmaXNoZXllIHZpZXcsIGJ1dCBpZiB0aGVyZSBhcmUgbW9yZSB0aGVuIG9uZSBub2RlIHdlIGRvIG5vdFxyXG4gICAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICBcclxuICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXTtcclxuICAgICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgICAgLy8gRXhwYW5kIHRoZSBnaXZlbiBub2RlIHRoZSB0aGlyZCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoYXQgdGhlIG5vZGUgaXMgc2ltcGxlIHdoaWNoIGVuc3VyZXMgdGhhdCBmaXNoZXllIHBhcmFtZXRlciB3aWxsIGJlIGNvbnNpZGVyZWRcclxuICAgICAgICB0aGlzLmV4cGFuZE5vZGUobm9kZSwgb3B0aW9ucy5maXNoZXllLCB0cnVlLCBvcHRpb25zLmFuaW1hdGUsIG9wdGlvbnMubGF5b3V0QnksIG9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICB9IFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIC8vIEZpcnN0IGV4cGFuZCBnaXZlbiBub2RlcyBhbmQgdGhlbiBwZXJmb3JtIGxheW91dCBhY2NvcmRpbmcgdG8gdGhlIGxheW91dEJ5IHBhcmFtZXRlclxyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZEdpdmVuTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XHJcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZXMgdGhlbiBwZXJmb3JtIGVuZCBvcGVyYXRpb25cclxuICBjb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykge1xyXG4gICAgLypcclxuICAgICAqIEluIGNvbGxhcHNlIG9wZXJhdGlvbiB0aGVyZSBpcyBubyBmaXNoZXllIHZpZXcgdG8gYmUgYXBwbGllZCBzbyB0aGVyZSBpcyBubyBhbmltYXRpb24gdG8gYmUgZGVzdHJveWVkIGhlcmUuIFdlIGNhbiBkbyB0aGlzIFxyXG4gICAgICogaW4gYSBiYXRjaC5cclxuICAgICAqLyBcclxuICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgIHRoaXMuc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzKG5vZGVzLyosIG9wdGlvbnMqLyk7XHJcbiAgICBjeS5lbmRCYXRjaCgpO1xyXG5cclxuICAgIG5vZGVzLnRyaWdnZXIoXCJwb3NpdGlvblwiKTsgLy8gcG9zaXRpb24gbm90IHRyaWdnZXJlZCBieSBkZWZhdWx0IHdoZW4gY29sbGFwc2VOb2RlIGlzIGNhbGxlZFxyXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSB0aGUgc3R5bGVcclxuICAgIGN5LnN0eWxlKCkudXBkYXRlKCk7XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XHJcbiAgY29sbGFwc2VCb3R0b21VcDogZnVuY3Rpb24gKHJvb3QpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKG5vZGUpO1xyXG4gICAgfVxyXG4gICAgLy9JZiB0aGUgcm9vdCBpcyBhIGNvbXBvdW5kIG5vZGUgdG8gYmUgY29sbGFwc2VkIHRoZW4gY29sbGFwc2UgaXRcclxuICAgIGlmIChyb290LmRhdGEoXCJjb2xsYXBzZVwiKSAmJiByb290LmNoaWxkcmVuKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICB0aGlzLmNvbGxhcHNlTm9kZShyb290KTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiY29sbGFwc2VcIik7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2V4cGFuZCB0aGUgbm9kZXMgaW4gdG9wIGRvd24gb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxyXG4gIGV4cGFuZFRvcERvd246IGZ1bmN0aW9uIChyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgaWYgKHJvb3QuZGF0YShcImV4cGFuZFwiKSAmJiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICAvLyBFeHBhbmQgdGhlIHJvb3QgYW5kIHVubWFyayBpdHMgZXhwYW5kIGRhdGEgdG8gc3BlY2lmeSB0aGF0IGl0IGlzIG5vIG1vcmUgdG8gYmUgZXhwYW5kZWRcclxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiZXhwYW5kXCIpO1xyXG4gICAgfVxyXG4gICAgLy8gTWFrZSBhIHJlY3Vyc2l2ZSBjYWxsIGZvciBjaGlsZHJlbiBvZiByb290XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihub2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vIENvbnZlcnN0IHRoZSByZW5kZXJlZCBwb3NpdGlvbiB0byBtb2RlbCBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gZ2xvYmFsIHBhbiBhbmQgem9vbSB2YWx1ZXNcclxuICBjb252ZXJ0VG9Nb2RlbFBvc2l0aW9uOiBmdW5jdGlvbiAocmVuZGVyZWRQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcclxuICAgIHZhciB5ID0gKHJlbmRlcmVkUG9zaXRpb24ueSAtIHBhbi55KSAvIHpvb207XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogeCxcclxuICAgICAgeTogeVxyXG4gICAgfTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZS4gSXQgY29uc2lkZXJzIGFwcGx5RmlzaEV5ZVZpZXcsIGFuaW1hdGUgYW5kIGxheW91dEJ5IHBhcmFtZXRlcnMuXHJcbiAgICogSXQgYWxzbyBjb25zaWRlcnMgc2luZ2xlIHBhcmFtZXRlciB3aGljaCBpbmRpY2F0ZXMgaWYgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGFsb25lLiBJZiB0aGlzIHBhcmFtZXRlciBpcyB0cnV0aHkgYWxvbmcgd2l0aCBcclxuICAgKiBhcHBseUZpc2hFeWVWaWV3IHBhcmFtZXRlciB0aGVuIHRoZSBzdGF0ZSBvZiB2aWV3IHBvcnQgaXMgdG8gYmUgY2hhbmdlZCB0byBoYXZlIGV4dHJhIHNwYWNlIG9uIHRoZSBzY3JlZW4gKGlmIG5lZWRlZCkgYmVmb3JlIGFwcGxpeWluZyB0aGVcclxuICAgKiBmaXNoZXllIHZpZXcuXHJcbiAgICovXHJcbiAgZXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBcclxuICAgIHZhciBjb21tb25FeHBhbmRPcGVyYXRpb24gPSBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXcpIHtcclxuXHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLnc7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpc2hleWUgdmlldyBleHBhbmQgdGhlIG5vZGUuXHJcbiAgICAgICAgLy8gVGhlIGZpcnN0IHBhcmFtdGVyIGluZGljYXRlcyB0aGUgbm9kZSB0byBhcHBseSBmaXNoZXllIHZpZXcsIHRoZSB0aGlyZCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoZSBub2RlXHJcbiAgICAgICAgLy8gdG8gYmUgZXhwYW5kZWQgYWZ0ZXIgZmlzaGV5ZSB2aWV3IGlzIGFwcGxpZWQuXHJcbiAgICAgICAgc2VsZi5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLCBzaW5nbGUsIG5vZGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIElmIG9uZSBvZiB0aGVzZSBwYXJhbWV0ZXJzIGlzIHRydXRoeSBpdCBtZWFucyB0aGF0IGV4cGFuZE5vZGVCYXNlRnVuY3Rpb24gaXMgYWxyZWFkeSB0byBiZSBjYWxsZWQuXHJcbiAgICAgIC8vIEhvd2V2ZXIgaWYgbm9uZSBvZiB0aGVtIGlzIHRydXRoeSB3ZSBuZWVkIHRvIGNhbGwgaXQgaGVyZS5cclxuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFwcGx5RmlzaEV5ZVZpZXcgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZSwgc2luZ2xlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlKTtcclxuICAgICAgdmFyIGFuaW1hdGluZyA9IGZhbHNlOyAvLyBWYXJpYWJsZSB0byBjaGVjayBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgYW5pbWF0aW9uLCBpZiB0aGVyZSBpcyBjb21tb25FeHBhbmRPcGVyYXRpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW5pbWF0aW9uXHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiB0aGUgbm9kZSBpcyB0aGUgb25seSBub2RlIHRvIGV4cGFuZCBhbmQgZmlzaGV5ZSB2aWV3IHNob3VsZCBiZSBhcHBsaWVkLCB0aGVuIGNoYW5nZSB0aGUgc3RhdGUgb2Ygdmlld3BvcnQgXHJcbiAgICAgIC8vIHRvIGNyZWF0ZSBtb3JlIHNwYWNlIG9uIHNjcmVlbiAoSWYgbmVlZGVkKVxyXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlldyAmJiBzaW5nbGUpIHtcclxuICAgICAgICB2YXIgdG9wTGVmdFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiAwLCB5OiAwfSk7XHJcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XHJcbiAgICAgICAgdmFyIHBhZGRpbmcgPSA4MDtcclxuICAgICAgICB2YXIgYmIgPSB7XHJcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB4MjogYm90dG9tUmlnaHRQb3NpdGlvbi54LFxyXG4gICAgICAgICAgeTE6IHRvcExlZnRQb3NpdGlvbi55LFxyXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBub2RlQkIgPSB7XHJcbiAgICAgICAgICB4MTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLncgLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHgyOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggKyBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udyAvIDIgKyBwYWRkaW5nLFxyXG4gICAgICAgICAgeTE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiAtIHBhZGRpbmcsXHJcbiAgICAgICAgICB5Mjogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ICsgbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmggLyAyICsgcGFkZGluZ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciB1bmlvbkJCID0gYm91bmRpbmdCb3hVdGlsaXRpZXMuZ2V0VW5pb24obm9kZUJCLCBiYik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSWYgdGhlc2UgYmJveGVzIGFyZSBub3QgZXF1YWwgdGhlbiB3ZSBuZWVkIHRvIGNoYW5nZSB0aGUgdmlld3BvcnQgc3RhdGUgKGJ5IHBhbiBhbmQgem9vbSlcclxuICAgICAgICBpZiAoIWJvdW5kaW5nQm94VXRpbGl0aWVzLmVxdWFsQm91bmRpbmdCb3hlcyh1bmlvbkJCLCBiYikpIHtcclxuICAgICAgICAgIHZhciB2aWV3UG9ydCA9IGN5LmdldEZpdFZpZXdwb3J0KHVuaW9uQkIsIDEwKTtcclxuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgIGFuaW1hdGluZyA9IGFuaW1hdGU7IC8vIFNpZ25hbCB0aGF0IHRoZXJlIGlzIGFuIGFuaW1hdGlvbiBub3cgYW5kIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbmltYXRpb25cclxuICAgICAgICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gYW5pbWF0ZSBkdXJpbmcgcGFuIGFuZCB6b29tXHJcbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICBjeS5hbmltYXRlKHtcclxuICAgICAgICAgICAgICBwYW46IHZpZXdQb3J0LnBhbixcclxuICAgICAgICAgICAgICB6b29tOiB2aWV3UG9ydC56b29tLFxyXG4gICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25EdXJhdGlvbiB8fCAxMDAwXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN5Lnpvb20odmlld1BvcnQuem9vbSk7XHJcbiAgICAgICAgICAgIGN5LnBhbih2aWV3UG9ydC5wYW4pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gSWYgYW5pbWF0aW5nIGlzIG5vdCB0cnVlIHdlIG5lZWQgdG8gY2FsbCBjb21tb25FeHBhbmRPcGVyYXRpb24gaGVyZVxyXG4gICAgICBpZiAoIWFuaW1hdGluZykge1xyXG4gICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGUgd2l0aG91dCBwZXJmb3JtaW5nIGVuZCBvcGVyYXRpb25cclxuICBjb2xsYXBzZU5vZGU6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnLCB7XHJcbiAgICAgICAgeDogbm9kZS5wb3NpdGlvbigpLngsXHJcbiAgICAgICAgeTogbm9kZS5wb3NpdGlvbigpLnlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHc6IG5vZGUub3V0ZXJXaWR0aCgpLFxyXG4gICAgICAgIGg6IG5vZGUub3V0ZXJIZWlnaHQoKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuXHJcbiAgICAgIGNoaWxkcmVuLnVuc2VsZWN0KCk7XHJcbiAgICAgIGNoaWxkcmVuLmNvbm5lY3RlZEVkZ2VzKCkudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWNvbGxhcHNlXCIpO1xyXG4gICAgICBcclxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4obm9kZSk7XHJcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4obm9kZSwgbm9kZSk7XHJcbiAgICAgIG5vZGUuYWRkQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG5cclxuICAgICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJjb2xsYXBzZVwiKTtcclxuICAgICAgXHJcbiAgICAgIG5vZGUucG9zaXRpb24obm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKSk7XHJcblxyXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICBzdG9yZVdpZHRoSGVpZ2h0OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZSAhPSBudWxsKSB7XHJcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gPSBub2RlLm91dGVyV2lkdGgoKTtcclxuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUub3V0ZXJIZWlnaHQoKTtcclxuXHJcbiAgICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZS5wYXJlbnQoKVswXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgZ2l2ZW4gbm9kZS4gbm9kZVRvRXhwYW5kIHdpbGwgYmUgZXhwYW5kZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbi4gXHJcbiAgICogVGhlIG90aGVyIHBhcmFtZXRlciBhcmUgdG8gYmUgcGFzc2VkIGJ5IHBhcmFtZXRlcnMgZGlyZWN0bHkgaW4gaW50ZXJuYWwgZnVuY3Rpb24gY2FsbHMuXHJcbiAgICovXHJcbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcbiAgICB2YXIgc2libGluZ3MgPSB0aGlzLmdldFNpYmxpbmdzKG5vZGUpO1xyXG5cclxuICAgIHZhciB4X2EgPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG4gICAgdmFyIHlfYSA9IHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcblxyXG4gICAgdmFyIGRfeF9sZWZ0ID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeF9yaWdodCA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcclxuICAgIHZhciBkX3lfdXBwZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcclxuICAgIHZhciBkX3lfbG93ZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcclxuXHJcbiAgICB2YXIgYWJzX2RpZmZfb25feCA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddIC0geF9hKTtcclxuICAgIHZhciBhYnNfZGlmZl9vbl95ID0gTWF0aC5hYnMobm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gLSB5X2EpO1xyXG5cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIExFRlRcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSA+IHhfYSkge1xyXG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0ICsgYWJzX2RpZmZfb25feDtcclxuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0IC0gYWJzX2RpZmZfb25feDtcclxuICAgIH1cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIFJJR0hUXHJcbiAgICBlbHNlIHtcclxuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCAtIGFic19kaWZmX29uX3g7XHJcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCArIGFic19kaWZmX29uX3g7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gVVBcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSA+IHlfYSkge1xyXG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgKyBhYnNfZGlmZl9vbl95O1xyXG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgLSBhYnNfZGlmZl9vbl95O1xyXG4gICAgfVxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gRE9XTlxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciAtIGFic19kaWZmX29uX3k7XHJcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciArIGFic19kaWZmX29uX3k7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHhQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcclxuICAgIHZhciB5UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB4UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy54UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xyXG4gICAgICB5UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy55UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHNpYmxpbmcgPSBzaWJsaW5nc1tpXTtcclxuXHJcbiAgICAgIHZhciB4X2IgPSB4UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xyXG4gICAgICB2YXIgeV9iID0geVBvc0luUGFyZW50U2libGluZ1tpXTtcclxuXHJcbiAgICAgIHZhciBzbG9wZSA9ICh5X2IgLSB5X2EpIC8gKHhfYiAtIHhfYSk7XHJcblxyXG4gICAgICB2YXIgZF94ID0gMDtcclxuICAgICAgdmFyIGRfeSA9IDA7XHJcbiAgICAgIHZhciBUX3ggPSAwO1xyXG4gICAgICB2YXIgVF95ID0gMDtcclxuXHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTEVGVFxyXG4gICAgICBpZiAoeF9hID4geF9iKSB7XHJcbiAgICAgICAgZF94ID0gZF94X2xlZnQ7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBSSUdIVFxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBkX3ggPSBkX3hfcmlnaHQ7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBVUFBFUiBzaWRlXHJcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcclxuICAgICAgICBkX3kgPSBkX3lfdXBwZXI7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMT1dFUiBzaWRlXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGRfeSA9IGRfeV9sb3dlcjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGlzRmluaXRlKHNsb3BlKSkge1xyXG4gICAgICAgIFRfeCA9IE1hdGgubWluKGRfeCwgKGRfeSAvIE1hdGguYWJzKHNsb3BlKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2xvcGUgIT09IDApIHtcclxuICAgICAgICBUX3kgPSBNYXRoLm1pbihkX3ksIChkX3ggKiBNYXRoLmFicyhzbG9wZSkpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHhfYSA+IHhfYikge1xyXG4gICAgICAgIFRfeCA9IC0xICogVF94O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoeV9hID4geV9iKSB7XHJcbiAgICAgICAgVF95ID0gLTEgKiBUX3k7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIE1vdmUgdGhlIHNpYmxpbmcgaW4gdGhlIHNwZWNpYWwgd2F5XHJcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShzaWJsaW5nLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gc2libGluZyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb24gaGVyZSBlbHNlIGl0IGlzIHRvIGJlIGNhbGxlZCBvbmUgb2YgZmlzaEV5ZVZpZXdNb3ZlTm9kZSgpIGNhbGxzXHJcbiAgICBpZiAoc2libGluZ3MubGVuZ3RoID09IDApIHtcclxuICAgICAgdGhpcy5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBsYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xyXG4gICAgICAvLyBBcHBseSBmaXNoZXllIHZpZXcgdG8gdGhlIHBhcmVudCBub2RlIGFzIHdlbGwgKCBJZiBleGlzdHMgKVxyXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUucGFyZW50KClbMF0sIHNpbmdsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH0sXHJcbiAgZ2V0U2libGluZ3M6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICB2YXIgc2libGluZ3M7XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gPT0gbnVsbCkge1xyXG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKFwiOnZpc2libGVcIikub3JwaGFucygpO1xyXG4gICAgICBzaWJsaW5ncyA9IG9ycGhhbnMuZGlmZmVyZW5jZShub2RlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNpYmxpbmdzID0gbm9kZS5zaWJsaW5ncyhcIjp2aXNpYmxlXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzaWJsaW5ncztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogTW92ZSBub2RlIG9wZXJhdGlvbiBzcGVjaWFsaXplZCBmb3IgZmlzaCBleWUgdmlldyBleHBhbmQgb3BlcmF0aW9uXHJcbiAgICogTW92ZXMgdGhlIG5vZGUgYnkgbW92aW5nIGl0cyBkZXNjYW5kZW50cy4gTW92ZW1lbnQgaXMgYW5pbWF0ZWQgaWYgYm90aCBzaW5nbGUgYW5kIGFuaW1hdGUgZmxhZ3MgYXJlIHRydXRoeS5cclxuICAgKi9cclxuICBmaXNoRXllVmlld01vdmVOb2RlOiBmdW5jdGlvbiAobm9kZSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuICAgIHZhciBjaGlsZHJlbkxpc3QgPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICBpZihub2RlLmlzUGFyZW50KCkpe1xyXG4gICAgICAgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbihcIjp2aXNpYmxlXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgXHJcbiAgICAvKlxyXG4gICAgICogSWYgdGhlIG5vZGUgaXMgc2ltcGxlIG1vdmUgaXRzZWxmIGRpcmVjdGx5IGVsc2UgbW92ZSBpdCBieSBtb3ZpbmcgaXRzIGNoaWxkcmVuIGJ5IGEgc2VsZiByZWN1cnNpdmUgY2FsbFxyXG4gICAgICovXHJcbiAgICBpZiAoY2hpbGRyZW5MaXN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHZhciBuZXdQb3NpdGlvbiA9IHt4OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggKyBUX3gsIHk6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSArIFRfeX07XHJcbiAgICAgIGlmICghc2luZ2xlIHx8ICFhbmltYXRlKSB7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ID0gbmV3UG9zaXRpb24ueDtcclxuICAgICAgICBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgPSBuZXdQb3NpdGlvbi55O1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCsrO1xyXG4gICAgICAgIG5vZGUuYW5pbWF0ZSh7XHJcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXHJcbiAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQtLTtcclxuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgIW5vZGVUb0V4cGFuZC5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcclxuXHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBJZiBhbGwgbm9kZXMgYXJlIG1vdmVkIHdlIGFyZSByZWFkeSB0byBleHBhbmQgc28gY2FsbCBleHBhbmQgbm9kZSBiYXNlIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xyXG5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICBkdXJhdGlvbjogYW5pbWF0aW9uRHVyYXRpb24gfHwgMTAwMFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoY2hpbGRyZW5MaXN0W2ldLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHhQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuICAgIHZhciB4X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeF9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd4JykgKyAocGFyZW50LndpZHRoKCkgLyAyKTtcclxuICAgIH1cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucG9zaXRpb24oJ3gnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geF9hO1xyXG4gIH0sXHJcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xyXG5cclxuICAgIHZhciB5X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeV9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd5JykgKyAocGFyZW50LmhlaWdodCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHlfYTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxyXG4gICAqIHdpdGggdGhlIHNhbWUgcm9vdCBwYXJhbWV0ZXIsXHJcbiAgICogcmVtb3ZlIHRoZSBjaGlsZCBhbmQgYWRkIHRoZSByZW1vdmVkIGNoaWxkIHRvIHRoZSBjb2xsYXBzZWRjaGlsZHJlbiBkYXRhXHJcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXHJcbiAgICogcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuIGtlZXBzIHRoZSBub2RlcyB0byByZXN0b3JlIHdoZW4gdGhlXHJcbiAgICogcm9vdCBpcyBleHBhbmRlZFxyXG4gICAqL1xyXG4gIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkge1xyXG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihjaGlsZCwgcm9vdCk7XHJcbiAgICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xyXG4gICAgICBwYXJlbnREYXRhW2NoaWxkLmlkKCldID0gY2hpbGQucGFyZW50KCk7XHJcbiAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XHJcbiAgICAgIHZhciByZW1vdmVkQ2hpbGQgPSBjaGlsZC5yZW1vdmUoKTtcclxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZENoaWxkO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi51bmlvbihyZW1vdmVkQ2hpbGQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBpc01ldGFFZGdlOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICByZXR1cm4gZWRnZS5oYXNDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XHJcbiAgfSxcclxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciByZWxhdGVkTm9kZXMgPSBub2RlLmRlc2NlbmRhbnRzKCk7XHJcbiAgICB2YXIgZWRnZXMgPSByZWxhdGVkTm9kZXMuZWRnZXNXaXRoKGN5Lm5vZGVzKCkubm90KHJlbGF0ZWROb2Rlcy51bmlvbihub2RlKSkpO1xyXG4gICAgXHJcbiAgICB2YXIgcmVsYXRlZE5vZGVNYXAgPSB7fTtcclxuICAgIFxyXG4gICAgcmVsYXRlZE5vZGVzLmVhY2goZnVuY3Rpb24oZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlbGF0ZWROb2RlTWFwW2VsZS5pZCgpXSA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgc291cmNlID0gZWRnZS5zb3VyY2UoKTtcclxuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXRoaXMuaXNNZXRhRWRnZShlZGdlKSkgeyAvLyBpcyBvcmlnaW5hbFxyXG4gICAgICAgIHZhciBvcmlnaW5hbEVuZHNEYXRhID0ge1xyXG4gICAgICAgICAgc291cmNlOiBzb3VyY2UsXHJcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XHJcbiAgICAgICAgZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnLCBvcmlnaW5hbEVuZHNEYXRhKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgZWRnZS5tb3ZlKHtcclxuICAgICAgICB0YXJnZXQ6ICFyZWxhdGVkTm9kZU1hcFt0YXJnZXQuaWQoKV0gPyB0YXJnZXQuaWQoKSA6IG5vZGUuaWQoKSxcclxuICAgICAgICBzb3VyY2U6ICFyZWxhdGVkTm9kZU1hcFtzb3VyY2UuaWQoKV0gPyBzb3VyY2UuaWQoKSA6IG5vZGUuaWQoKVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9LFxyXG4gIGZpbmROZXdFbmQ6IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciBjdXJyZW50ID0gbm9kZTtcclxuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xyXG4gICAgdmFyIHBhcmVudCA9IHBhcmVudERhdGFbY3VycmVudC5pZCgpXTtcclxuICAgIFxyXG4gICAgd2hpbGUoICFjdXJyZW50Lmluc2lkZSgpICkge1xyXG4gICAgICBjdXJyZW50ID0gcGFyZW50O1xyXG4gICAgICBwYXJlbnQgPSBwYXJlbnREYXRhW3BhcmVudC5pZCgpXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgfSxcclxuICByZXBhaXJFZGdlczogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgdmFyIGNvbm5lY3RlZE1ldGFFZGdlcyA9IG5vZGUuY29ubmVjdGVkRWRnZXMoJy5jeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XHJcbiAgICBcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29ubmVjdGVkTWV0YUVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gY29ubmVjdGVkTWV0YUVkZ2VzW2ldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxFbmRzID0gZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnKTtcclxuICAgICAgdmFyIGN1cnJlbnRTcmNJZCA9IGVkZ2UuZGF0YSgnc291cmNlJyk7XHJcbiAgICAgIHZhciBjdXJyZW50VGd0SWQgPSBlZGdlLmRhdGEoJ3RhcmdldCcpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCBjdXJyZW50U3JjSWQgPT09IG5vZGUuaWQoKSApIHtcclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcclxuICAgICAgICAgIHNvdXJjZTogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy5zb3VyY2UpLmlkKClcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcclxuICAgICAgICAgIHRhcmdldDogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy50YXJnZXQpLmlkKClcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYgKCBlZGdlLmRhdGEoJ3NvdXJjZScpID09PSBvcmlnaW5hbEVuZHMuc291cmNlLmlkKCkgJiYgZWRnZS5kYXRhKCd0YXJnZXQnKSA9PT0gb3JpZ2luYWxFbmRzLnRhcmdldC5pZCgpICkge1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcclxuICAgICAgICBlZGdlLnJlbW92ZURhdGEoJ29yaWdpbmFsRW5kcycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKm5vZGUgaXMgYW4gb3V0ZXIgbm9kZSBvZiByb290XHJcbiAgIGlmIHJvb3QgaXMgbm90IGl0J3MgYW5jaGVzdG9yXHJcbiAgIGFuZCBpdCBpcyBub3QgdGhlIHJvb3QgaXRzZWxmKi9cclxuICBpc091dGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xyXG4gICAgdmFyIHRlbXAgPSBub2RlO1xyXG4gICAgd2hpbGUgKHRlbXAgIT0gbnVsbCkge1xyXG4gICAgICBpZiAodGVtcCA9PSByb290KSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSxcclxuICAvKipcclxuICAgKiBHZXQgYWxsIGNvbGxhcHNlZCBjaGlsZHJlbiAtIGluY2x1ZGluZyBuZXN0ZWQgb25lc1xyXG4gICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxyXG4gICAqIEBwYXJhbSBjb2xsYXBzZWRDaGlsZHJlbiA6IGEgY29sbGVjdGlvbiB0byBzdG9yZSB0aGUgcmVzdWx0XHJcbiAgICogQHJldHVybiA6IGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAqL1xyXG4gIGdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHk6IGZ1bmN0aW9uKG5vZGUsIGNvbGxhcHNlZENoaWxkcmVuKXtcclxuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKSB8fCBbXTtcclxuICAgIHZhciBpO1xyXG4gICAgZm9yIChpPTA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XHJcbiAgICAgIGlmIChjaGlsZHJlbltpXS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpKXtcclxuICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjaGlsZHJlbltpXSwgY29sbGFwc2VkQ2hpbGRyZW4pKTtcclxuICAgICAgfVxyXG4gICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKGNoaWxkcmVuW2ldKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcclxuICB9LFxyXG4gIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIHN0YXJ0IHNlY3Rpb24gZWRnZSBleHBhbmQgY29sbGFwc2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cclxuICBjb2xsYXBzZUdpdmVuRWRnZXM6IGZ1bmN0aW9uIChlZGdlcywgb3B0aW9ucykge1xyXG4gICAgZWRnZXMudW5zZWxlY3QoKTtcclxuICAgIHZhciBub2RlcyA9IGVkZ2VzLmNvbm5lY3RlZE5vZGVzKCk7XHJcbiAgICB2YXIgZWRnZXNUb0NvbGxhcHNlID0ge307XHJcbiAgICAvLyBncm91cCBlZGdlcyBieSB0eXBlIGlmIHRoaXMgb3B0aW9uIGlzIHNldCB0byB0cnVlXHJcbiAgICBpZiAob3B0aW9ucy5ncm91cEVkZ2VzT2ZTYW1lVHlwZU9uQ29sbGFwc2UpIHtcclxuICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgICAgIHZhciBlZGdlVHlwZSA9IFwidW5rbm93blwiO1xyXG4gICAgICAgIGlmIChvcHRpb25zLmVkZ2VUeXBlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBlZGdlVHlwZSA9IG9wdGlvbnMuZWRnZVR5cGVJbmZvIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcHRpb25zLmVkZ2VUeXBlSW5mby5jYWxsKGVkZ2UpIDogZWRnZS5kYXRhKClbb3B0aW9ucy5lZGdlVHlwZUluZm9dO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlLmhhc093blByb3BlcnR5KGVkZ2VUeXBlKSkge1xyXG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5lZGdlcyA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZWRnZXMuYWRkKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLmRpcmVjdGlvblR5cGUgPT0gXCJ1bmlkaXJlY3Rpb25cIiAmJiAoZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5zb3VyY2UgIT0gZWRnZS5zb3VyY2UoKS5pZCgpIHx8IGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0udGFyZ2V0ICE9IGVkZ2UudGFyZ2V0KCkuaWQoKSkpIHtcclxuICAgICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5kaXJlY3Rpb25UeXBlID0gXCJiaWRpcmVjdGlvblwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YXIgZWRnZXNYID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICAgICAgZWRnZXNYID0gZWRnZXNYLmFkZChlZGdlKTtcclxuICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0gPSB7IGVkZ2VzOiBlZGdlc1gsIGRpcmVjdGlvblR5cGU6IFwidW5pZGlyZWN0aW9uXCIsIHNvdXJjZTogZWRnZS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVkZ2UudGFyZ2V0KCkuaWQoKSB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0gPSB7IGVkZ2VzOiBlZGdlcywgZGlyZWN0aW9uVHlwZTogXCJ1bmlkaXJlY3Rpb25cIiwgc291cmNlOiBlZGdlc1swXS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVkZ2VzWzBdLnRhcmdldCgpLmlkKCkgfVxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0uZGlyZWN0aW9uVHlwZSA9PSBcInVuaWRpcmVjdGlvblwiICYmIChlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLnNvdXJjZSAhPSBlZGdlc1tpXS5zb3VyY2UoKS5pZCgpIHx8IGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0udGFyZ2V0ICE9IGVkZ2VzW2ldLnRhcmdldCgpLmlkKCkpKSB7XHJcbiAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLmRpcmVjdGlvblR5cGUgPSBcImJpZGlyZWN0aW9uXCI7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH1cclxuICAgIHZhciBuZXdFZGdlcyA9IFtdO1xyXG4gICAgZm9yIChjb25zdCBlZGdlR3JvdXBUeXBlIGluIGVkZ2VzVG9Db2xsYXBzZSkge1xyXG4gICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzLmxlbmd0aCA8IDIpIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG4gICAgICBlZGdlcy50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZWVkZ2UnKTtcclxuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZWRnZXMpO1xyXG4gICAgICB2YXIgbmV3RWRnZSA9IHt9O1xyXG4gICAgICBuZXdFZGdlLmdyb3VwID0gXCJlZGdlc1wiO1xyXG4gICAgICBuZXdFZGdlLmRhdGEgPSB7fTtcclxuICAgICAgbmV3RWRnZS5kYXRhLnNvdXJjZSA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5zb3VyY2U7XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS50YXJnZXQgPSBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0udGFyZ2V0O1xyXG4gICAgICBuZXdFZGdlLmRhdGEuaWQgPSBcImNvbGxhcHNlZEVkZ2VfXCIgKyBub2Rlc1swXS5pZCgpICsgXCJfXCIgKyBub2Rlc1sxXS5pZCgpICsgXCJfXCIgKyBlZGdlR3JvdXBUeXBlICsgXCJfXCIgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBEYXRlLm5vdygpKTtcclxuICAgICAgbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gY3kuY29sbGVjdGlvbigpO1xyXG5cclxuICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgICAgICBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMgPSBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMuYWRkKGVkZ2UpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IHRoaXMuY2hlY2s0bmVzdGVkQ29sbGFwc2UobmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzLCBvcHRpb25zKTtcclxuXHJcbiAgICAgIHZhciBlZGdlc1R5cGVGaWVsZCA9IFwiZWRnZVR5cGVcIjtcclxuICAgICAgaWYgKG9wdGlvbnMuZWRnZVR5cGVJbmZvICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBlZGdlc1R5cGVGaWVsZCA9IG9wdGlvbnMuZWRnZVR5cGVJbmZvIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBlZGdlVHlwZUZpZWxkIDogb3B0aW9ucy5lZGdlVHlwZUluZm87XHJcbiAgICAgIH1cclxuICAgICAgbmV3RWRnZS5kYXRhW2VkZ2VzVHlwZUZpZWxkXSA9IGVkZ2VHcm91cFR5cGU7XHJcblxyXG4gICAgICBuZXdFZGdlLmRhdGFbXCJkaXJlY3Rpb25UeXBlXCJdID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmRpcmVjdGlvblR5cGU7XHJcbiAgICAgIG5ld0VkZ2UuY2xhc3NlcyA9IFwiY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlXCI7XHJcblxyXG4gICAgICBuZXdFZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG4gICAgICBjeS5yZW1vdmUoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzKTtcclxuICAgICAgZWRnZXMudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYWZ0ZXJjb2xsYXBzZWVkZ2UnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXN1bHQuZWRnZXMgPSBjeS5hZGQobmV3RWRnZXMpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9LFxyXG5cclxuICBjaGVjazRuZXN0ZWRDb2xsYXBzZTogZnVuY3Rpb24oZWRnZXMyY29sbGFwc2UsIG9wdGlvbnMpe1xyXG4gICAgaWYgKG9wdGlvbnMuYWxsb3dOZXN0ZWRFZGdlQ29sbGFwc2UpIHtcclxuICAgICAgcmV0dXJuIGVkZ2VzMmNvbGxhcHNlO1xyXG4gICAgfVxyXG4gICAgbGV0IHIgPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVkZ2VzMmNvbGxhcHNlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGxldCBjdXJyID0gZWRnZXMyY29sbGFwc2VbaV07XHJcbiAgICAgIGxldCBjb2xsYXBzZWRFZGdlcyA9IGN1cnIuZGF0YSgnY29sbGFwc2VkRWRnZXMnKTtcclxuICAgICAgaWYgKGNvbGxhcHNlZEVkZ2VzICYmIGNvbGxhcHNlZEVkZ2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByID0gci5hZGQoY29sbGFwc2VkRWRnZXMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHIgPSByLmFkZChjdXJyKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHI7XHJcbiAgfSxcclxuXHJcbiAgZXhwYW5kRWRnZTogZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgIHZhciByZXN1bHQgPSB7IGVkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCkgfVxyXG4gICAgdmFyIGVkZ2VzID0gZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpO1xyXG4gICAgaWYgKGVkZ2VzICE9PSB1bmRlZmluZWQgJiYgZWRnZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBlZGdlLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmJlZm9yZWV4cGFuZGVkZ2UnKTtcclxuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChlZGdlKTtcclxuICAgICAgY3kucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICByZXN1bHQuZWRnZXMgPSBjeS5hZGQoZWRnZXMpO1xyXG4gICAgICBlZGdlLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kZWRnZScpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9LFxyXG5cclxuICAvL2lmIHRoZSBlZGdlcyBhcmUgb25seSBiZXR3ZWVuIHR3byBub2RlcyAodmFsaWQgZm9yIGNvbGxwYXNpbmcpIHJldHVybnMgdGhlIHR3byBub2RlcyBlbHNlIGl0IHJldHVybnMgZmFsc2VcclxuICBpc1ZhbGlkRWRnZXNGb3JDb2xsYXBzZTogZnVuY3Rpb24gKGVkZ2VzKSB7XHJcbiAgICB2YXIgZW5kUG9pbnRzID0gdGhpcy5nZXRFZGdlc0Rpc3RpbmN0RW5kUG9pbnRzKGVkZ2VzKTtcclxuICAgIGlmIChlbmRQb2ludHMubGVuZ3RoICE9IDIpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGVuZFBvaW50cztcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvL3JldHVybnMgYSBsaXN0IG9mIGRpc3RpbmN0IGVuZHBvaW50cyBvZiBhIHNldCBvZiBlZGdlcy5cclxuICBnZXRFZGdlc0Rpc3RpbmN0RW5kUG9pbnRzOiBmdW5jdGlvbiAoZWRnZXMpIHtcclxuICAgIHZhciBlbmRQb2ludHMgPSBbXTtcclxuICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zRWxlbWVudChlbmRQb2ludHMsIGVkZ2Uuc291cmNlKCkpKSB7XHJcbiAgICAgICAgZW5kUG9pbnRzLnB1c2goZWRnZS5zb3VyY2UoKSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zRWxlbWVudChlbmRQb2ludHMsIGVkZ2UudGFyZ2V0KCkpKSB7XHJcbiAgICAgICAgZW5kUG9pbnRzLnB1c2goZWRnZS50YXJnZXQoKSk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHJldHVybiBlbmRQb2ludHM7XHJcbiAgfSxcclxuXHJcbiAgLy9mdW5jdGlvbiB0byBjaGVjayBpZiBhIGxpc3Qgb2YgZWxlbWVudHMgY29udGFpbnMgdGhlIGdpdmVuIGVsZW1lbnQgYnkgbG9va2luZyBhdCBpZCgpXHJcbiAgY29udGFpbnNFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudHMsIGVsZW1lbnQpIHtcclxuICAgIHZhciBleGlzdHMgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKGVsZW1lbnRzW2ldLmlkKCkgPT0gZWxlbWVudC5pZCgpKSB7XHJcbiAgICAgICAgZXhpc3RzID0gdHJ1ZTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGV4aXN0cztcclxuICB9XHJcbiAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZW5kIHNlY3Rpb24gZWRnZSBleHBhbmQgY29sbGFwc2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cclxufVxyXG5cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXM7XHJcbiIsIjtcclxuKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcclxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiAoY3l0b3NjYXBlKSB7XHJcblxyXG4gICAgaWYgKCFjeXRvc2NhcGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcclxuXHJcbiAgICB2YXIgdW5kb1JlZG9VdGlsaXRpZXMgPSByZXF1aXJlKCcuL3VuZG9SZWRvVXRpbGl0aWVzJyk7XHJcbiAgICB2YXIgY3VlVXRpbGl0aWVzID0gcmVxdWlyZShcIi4vY3VlVXRpbGl0aWVzXCIpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGV4dGVuZE9wdGlvbnMob3B0aW9ucywgZXh0ZW5kQnkpIHtcclxuICAgICAgdmFyIHRlbXBPcHRzID0ge307XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKVxyXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XHJcblxyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gZXh0ZW5kQnkpXHJcbiAgICAgICAgaWYgKHRlbXBPcHRzLmhhc093blByb3BlcnR5KGtleSkpXHJcbiAgICAgICAgICB0ZW1wT3B0c1trZXldID0gZXh0ZW5kQnlba2V5XTtcclxuICAgICAgcmV0dXJuIHRlbXBPcHRzO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBldmFsdWF0ZSBzb21lIHNwZWNpZmljIG9wdGlvbnMgaW4gY2FzZSBvZiB0aGV5IGFyZSBzcGVjaWZpZWQgYXMgZnVuY3Rpb25zIHRvIGJlIGR5bmFtaWNhbGx5IGNoYW5nZWRcclxuICAgIGZ1bmN0aW9uIGV2YWxPcHRpb25zKG9wdGlvbnMpIHtcclxuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcclxuICAgICAgdmFyIGZpc2hleWUgPSB0eXBlb2Ygb3B0aW9ucy5maXNoZXllID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5maXNoZXllLmNhbGwoKSA6IG9wdGlvbnMuZmlzaGV5ZTtcclxuICAgICAgXHJcbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XHJcbiAgICAgIG9wdGlvbnMuZmlzaGV5ZSA9IGZpc2hleWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5LCBleHBhbmRDb2xsYXBzZVV0aWxpdGllcykge1xyXG4gICAgICB2YXIgYXBpID0ge307IC8vIEFQSSB0byBiZSByZXR1cm5lZFxyXG4gICAgICAvLyBzZXQgZnVuY3Rpb25zXHJcblxyXG4gICAgICBmdW5jdGlvbiBoYW5kbGVOZXdPcHRpb25zKCBvcHRzICkge1xyXG4gICAgICAgIHZhciBjdXJyZW50T3B0cyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgaWYgKCBvcHRzLmN1ZUVuYWJsZWQgJiYgIWN1cnJlbnRPcHRzLmN1ZUVuYWJsZWQgKSB7XHJcbiAgICAgICAgICBhcGkuZW5hYmxlQ3VlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCAhb3B0cy5jdWVFbmFibGVkICYmIGN1cnJlbnRPcHRzLmN1ZUVuYWJsZWQgKSB7XHJcbiAgICAgICAgICBhcGkuZGlzYWJsZUN1ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gc2V0IGFsbCBvcHRpb25zIGF0IG9uY2VcclxuICAgICAgYXBpLnNldE9wdGlvbnMgPSBmdW5jdGlvbihvcHRzKSB7XHJcbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhvcHRzKTtcclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdHMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmV4dGVuZE9wdGlvbnMgPSBmdW5jdGlvbihvcHRzKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyggb3B0aW9ucywgb3B0cyApO1xyXG4gICAgICAgIGhhbmRsZU5ld09wdGlvbnMobmV3T3B0aW9ucyk7XHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBuZXdPcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gc2V0IHRoZSBvcHRpb24gd2hvc2UgbmFtZSBpcyBnaXZlblxyXG4gICAgICBhcGkuc2V0T3B0aW9uID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIG9wdHMgPSB7fTtcclxuICAgICAgICBvcHRzWyBuYW1lIF0gPSB2YWx1ZTtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyggb3B0aW9ucywgb3B0cyApO1xyXG5cclxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG5ld09wdGlvbnMpO1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5jb2xsYXBzZSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyByZWN1cnNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5jb2xsYXBzZVJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XHJcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2UoZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5leHBhbmQgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGV4cGFuZCBnaXZlbiBlbGVzIHJlY3VzaXZlbHkgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxyXG4gICAgICBhcGkuZXhwYW5kUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRBbGxOb2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG5cclxuICAgICAgLy8gQ29yZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgIC8vIGNvbGxhcHNlIGFsbCBjb2xsYXBzaWJsZSBub2Rlc1xyXG4gICAgICBhcGkuY29sbGFwc2VBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2VSZWN1cnNpdmVseSh0aGlzLmNvbGxhcHNpYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZXhwYW5kIGFsbCBleHBhbmRhYmxlIG5vZGVzXHJcbiAgICAgIGFwaS5leHBhbmRBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVjdXJzaXZlbHkodGhpcy5leHBhbmRhYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuXHJcbiAgICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXHJcblxyXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGV4cGFuZGFibGVcclxuICAgICAgYXBpLmlzRXhwYW5kYWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gcmV0dXJucyBpZiB0aGUgZ2l2ZW4gbm9kZSBpcyBjb2xsYXBzaWJsZVxyXG4gICAgICBhcGkuaXNDb2xsYXBzaWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuICF0aGlzLmlzRXhwYW5kYWJsZShub2RlKSAmJiBub2RlLmlzUGFyZW50KCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBnZXQgY29sbGFwc2libGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXHJcbiAgICAgIGFwaS5jb2xsYXBzaWJsZU5vZGVzID0gZnVuY3Rpb24gKF9ub2Rlcykge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xyXG4gICAgICAgIHJldHVybiBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBlbGUgPSBpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHNlbGYuaXNDb2xsYXBzaWJsZShlbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZ2V0IGV4cGFuZGFibGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXHJcbiAgICAgIGFwaS5leHBhbmRhYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub2RlcyA9IF9ub2RlcyA/IF9ub2RlcyA6IGN5Lm5vZGVzKCk7XHJcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgICAgIGVsZSA9IGk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gc2VsZi5pc0V4cGFuZGFibGUoZWxlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfTtcclxuICAgICAgXHJcbiAgICAgIC8vIEdldCB0aGUgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIGNvbGxhcHNlZCBub2RlIHdoaWNoIGFyZSByZW1vdmVkIGR1cmluZyBjb2xsYXBzZSBvcGVyYXRpb25cclxuICAgICAgYXBpLmdldENvbGxhcHNlZENoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLyoqIEdldCBjb2xsYXBzZWQgY2hpbGRyZW4gcmVjdXJzaXZlbHkgaW5jbHVkaW5nIG5lc3RlZCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICogUmV0dXJuZWQgdmFsdWUgaW5jbHVkZXMgZWRnZXMgYW5kIG5vZGVzLCB1c2Ugc2VsZWN0b3IgdG8gZ2V0IGVkZ2VzIG9yIG5vZGVzXHJcbiAgICAgICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxyXG4gICAgICAgKiBAcmV0dXJuIGFsbCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICovXHJcbiAgICAgIGFwaS5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShub2RlLCBjb2xsYXBzZWRDaGlsZHJlbik7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiBvZiBhbGwgY29sbGFwc2VkIG5vZGVzIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXHJcbiAgICAgICAqIFJldHVybmVkIHZhbHVlIGluY2x1ZGVzIGVkZ2VzIGFuZCBub2RlcywgdXNlIHNlbGVjdG9yIHRvIGdldCBlZGdlcyBvciBub2Rlc1xyXG4gICAgICAgKiBAcmV0dXJuIGFsbCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICovXHJcbiAgICAgIGFwaS5nZXRBbGxDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24oKXtcclxuICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICAgICAgdmFyIGNvbGxhcHNlZE5vZGVzID0gY3kubm9kZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlXCIpO1xyXG4gICAgICAgIHZhciBqO1xyXG4gICAgICAgIGZvciAoaj0wOyBqIDwgY29sbGFwc2VkTm9kZXMubGVuZ3RoOyBqKyspe1xyXG4gICAgICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjb2xsYXBzZWROb2Rlc1tqXSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICAgIH07XHJcbiAgICAgIC8vIFRoaXMgbWV0aG9kIGZvcmNlcyB0aGUgdmlzdWFsIGN1ZSB0byBiZSBjbGVhcmVkLiBJdCBpcyB0byBiZSBjYWxsZWQgaW4gZXh0cmVtZSBjYXNlc1xyXG4gICAgICBhcGkuY2xlYXJWaXN1YWxDdWUgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgY3kudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5kaXNhYmxlQ3VlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIGlmIChvcHRpb25zLmN1ZUVuYWJsZWQpIHtcclxuICAgICAgICAgIGN1ZVV0aWxpdGllcygndW5iaW5kJywgY3ksIGFwaSk7XHJcbiAgICAgICAgICBvcHRpb25zLmN1ZUVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZW5hYmxlQ3VlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIGlmICghb3B0aW9ucy5jdWVFbmFibGVkKSB7XHJcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3JlYmluZCcsIGN5LCBhcGkpO1xyXG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZ2V0UGFyZW50ID0gZnVuY3Rpb24obm9kZUlkKSB7XHJcbiAgICAgICAgaWYoY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKVswXSA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIHZhciBwYXJlbnREYXRhID0gZ2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnKTtcclxuICAgICAgICAgIHJldHVybiBwYXJlbnREYXRhW25vZGVJZF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICByZXR1cm4gY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKS5wYXJlbnQoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuY29sbGFwc2VFZGdlcyA9IGZ1bmN0aW9uKGVkZ2VzLG9wdHMpeyAgICAgXHJcbiAgICAgICAgdmFyIHJlc3VsdCA9ICAgIHtlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpfTtcclxuICAgICAgICBpZihlZGdlcy5sZW5ndGggPCAyKSByZXR1cm4gcmVzdWx0IDtcclxuICAgICAgICBpZihlZGdlcy5jb25uZWN0ZWROb2RlcygpLmxlbmd0aCA+IDIpIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7IFxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuRWRnZXMoZWRnZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuICAgICAgYXBpLmV4cGFuZEVkZ2VzID0gZnVuY3Rpb24oZWRnZXMpeyAgICBcclxuICAgICAgICB2YXIgcmVzdWx0ID0gICAge2VkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCl9ICAgIFxyXG4gICAgICAgIGlmKGVkZ2VzID09PSB1bmRlZmluZWQpIHJldHVybiByZXN1bHQ7IFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vaWYodHlwZW9mIGVkZ2VzW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpey8vY29sbGVjdGlvbiBvZiBlZGdlcyBpcyBwYXNzZWRcclxuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSl7XHJcbiAgICAgICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRFZGdlKGVkZ2UpO1xyXG4gICAgICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XHJcbiAgICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcclxuICAgICAgICAgICBcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgLyogIH1lbHNley8vb25lIGVkZ2UgcGFzc2VkXHJcbiAgICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlcyk7XHJcbiAgICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XHJcbiAgICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9ICovXHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICBcclxuICAgICAgfTtcclxuICAgICAgYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMgPSBmdW5jdGlvbihub2Rlcywgb3B0cyl7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7IFxyXG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcclxuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xyXG4gICAgICAgICAgbGlzdFxyXG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcclxuICAgICAgICAgICAgICB2YXIgdGFpbCA9IGxpc3Quc2xpY2UobiArIDEsIGxpc3QubGVuZ3RoKTtcclxuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIHJldHVybiBwYWlycztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG5vZGVzUGFpcnMgPSBwYWlyd2lzZShub2Rlcyk7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHtlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpfTtcclxuICAgICAgICBub2Rlc1BhaXJzLmZvckVhY2goZnVuY3Rpb24obm9kZVBhaXIpe1xyXG4gICAgICAgICAgdmFyIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJ1tzb3VyY2UgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXSxbdGFyZ2V0ID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0nKTsgICAgIFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZihlZGdlcy5sZW5ndGggPj0gMil7XHJcbiAgICAgICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuRWRnZXMoZWRnZXMsIHRlbXBPcHRpb25zKVxyXG4gICAgICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XHJcbiAgICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcclxuICAgICAgICAgIH0gICAgXHJcbiAgICAgICAgIFxyXG4gICAgICAgIH0uYmluZCh0aGlzKSk7ICAgICAgIFxyXG4gICAgIFxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcblxyXG4gICAgICB9O1xyXG4gICAgICBhcGkuZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMgPSBmdW5jdGlvbihub2Rlcyl7XHJcbiAgICAgICAgaWYobm9kZXMubGVuZ3RoIDw9IDEpIGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICB2YXIgZWRnZXNUb0V4cGFuZCA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICBmdW5jdGlvbiBwYWlyd2lzZShsaXN0KSB7XHJcbiAgICAgICAgICB2YXIgcGFpcnMgPSBbXTtcclxuICAgICAgICAgIGxpc3RcclxuICAgICAgICAgICAgLnNsaWNlKDAsIGxpc3QubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGZpcnN0LCBuKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgdGFpbC5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKFtmaXJzdCwgaXRlbV0pXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICByZXR1cm4gcGFpcnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vdmFyIHJlc3VsdCA9IHtlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpfSAgIDsgICAgIFxyXG4gICAgICAgIHZhciBub2Rlc1BhaXJzID0gcGFpcndpc2Uobm9kZXMpO1xyXG4gICAgICAgIG5vZGVzUGFpcnMuZm9yRWFjaChmdW5jdGlvbihub2RlUGFpcil7XHJcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVtzb3VyY2UgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXSxbdGFyZ2V0ID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0nKTsgIFxyXG4gICAgICAgICAgZWRnZXNUb0V4cGFuZCA9IGVkZ2VzVG9FeHBhbmQudW5pb24oZWRnZXMpOyAgICAgICAgIFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAvL3Jlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQoZWRnZXNUb0V4cGFuZCk7XHJcbiAgICAgICAgLy9yZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKHRoaXMuZXhwYW5kRWRnZXMoZWRnZXNUb0V4cGFuZCkpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzVG9FeHBhbmQpO1xyXG4gICAgICB9O1xyXG4gICAgICBhcGkuY29sbGFwc2VBbGxFZGdlcyA9IGZ1bmN0aW9uKG9wdHMpe1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpOyBcclxuICAgICAgICBmdW5jdGlvbiBwYWlyd2lzZShsaXN0KSB7XHJcbiAgICAgICAgICB2YXIgcGFpcnMgPSBbXTtcclxuICAgICAgICAgIGxpc3RcclxuICAgICAgICAgICAgLnNsaWNlKDAsIGxpc3QubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGZpcnN0LCBuKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgdGFpbC5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKFtmaXJzdCwgaXRlbV0pXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICByZXR1cm4gcGFpcnM7XHJcbiAgICAgICAgfSBcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzKGN5LmVkZ2VzKCkuY29ubmVjdGVkTm9kZXMoKSxvcHRzKTtcclxuICAgICAgIC8qICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKGN5LmVkZ2VzKCkuY29ubmVjdGVkTm9kZXMoKSk7XHJcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVQYWlyKXtcclxuICAgICAgICAgIHZhciBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCdbc291cmNlID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0sW3RhcmdldCA9IFwiJysgbm9kZVBhaXJbMV0uaWQoKSsnXCJdJyk7ICAgICAgICAgXHJcbiAgICAgICAgICBpZihlZGdlcy5sZW5ndGggPj0yKXtcclxuICAgICAgICAgICAgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbkVkZ2VzKGVkZ2VzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICB9LmJpbmQodGhpcykpOyAqL1xyXG5cclxuICAgICAgfTsgXHJcbiAgICAgIGFwaS5leHBhbmRBbGxFZGdlcyA9IGZ1bmN0aW9uKCl7ICAgICAgIFxyXG4gICAgICAgIHZhciBlZGdlcyA9IGN5LmVkZ2VzKFwiLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVwiKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0ge2VkZ2VzOmN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXMgOiBjeS5jb2xsZWN0aW9uKCl9O1xyXG4gICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzKTtcclxuICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XHJcbiAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpOyAgIFxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH07XHJcblxyXG4gICAgIFxyXG4gICAgIFxyXG4gICAgICByZXR1cm4gYXBpOyAvLyBSZXR1cm4gdGhlIEFQSSBpbnN0YW5jZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCB0aGUgd2hvbGUgc2NyYXRjaHBhZCByZXNlcnZlZCBmb3IgdGhpcyBleHRlbnNpb24gKG9uIGFuIGVsZW1lbnQgb3IgY29yZSkgb3IgZ2V0IGEgc2luZ2xlIHByb3BlcnR5IG9mIGl0XHJcbiAgICBmdW5jdGlvbiBnZXRTY3JhdGNoIChjeU9yRWxlLCBuYW1lKSB7XHJcbiAgICAgIGlmIChjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnLCB7fSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBzY3JhdGNoID0gY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xyXG4gICAgICB2YXIgcmV0VmFsID0gKCBuYW1lID09PSB1bmRlZmluZWQgKSA/IHNjcmF0Y2ggOiBzY3JhdGNoW25hbWVdO1xyXG4gICAgICByZXR1cm4gcmV0VmFsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNldCBhIHNpbmdsZSBwcm9wZXJ0eSBvbiBzY3JhdGNocGFkIG9mIGFuIGVsZW1lbnQgb3IgdGhlIGNvcmVcclxuICAgIGZ1bmN0aW9uIHNldFNjcmF0Y2ggKGN5T3JFbGUsIG5hbWUsIHZhbCkge1xyXG4gICAgICBnZXRTY3JhdGNoKGN5T3JFbGUpW25hbWVdID0gdmFsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJlZ2lzdGVyIHRoZSBleHRlbnNpb24gY3kuZXhwYW5kQ29sbGFwc2UoKVxyXG4gICAgY3l0b3NjYXBlKFwiY29yZVwiLCBcImV4cGFuZENvbGxhcHNlXCIsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJykgfHwge1xyXG4gICAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQncyBqdXN0IGxheW91dCBvcHRpb25zIG9yIHdob2xlIGxheW91dCBmdW5jdGlvbi4gQ2hvb3NlIHlvdXIgc2lkZSFcclxuICAgICAgICBmaXNoZXllOiB0cnVlLCAvLyB3aGV0aGVyIHRvIHBlcmZvcm0gZmlzaGV5ZSB2aWV3IGFmdGVyIGV4cGFuZC9jb2xsYXBzZSB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiB0b29cclxuICAgICAgICBhbmltYXRlOiB0cnVlLCAvLyB3aGV0aGVyIHRvIGFuaW1hdGUgb24gZHJhd2luZyBjaGFuZ2VzIHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHRvb1xyXG4gICAgICAgIGFuaW1hdGlvbkR1cmF0aW9uOiAxMDAwLCAvLyB3aGVuIGFuaW1hdGUgaXMgdHJ1ZSwgdGhlIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyBvZiB0aGUgYW5pbWF0aW9uXHJcbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHsgfSwgLy8gY2FsbGJhY2sgd2hlbiBleHBhbmQvY29sbGFwc2UgaW5pdGlhbGl6ZWRcclxuICAgICAgICB1bmRvYWJsZTogdHJ1ZSwgLy8gYW5kIGlmIHVuZG9SZWRvRXh0ZW5zaW9uIGV4aXN0cyxcclxuXHJcbiAgICAgICAgY3VlRW5hYmxlZDogdHJ1ZSwgLy8gV2hldGhlciBjdWVzIGFyZSBlbmFibGVkXHJcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjogJ3RvcC1sZWZ0JywgLy8gZGVmYXVsdCBjdWUgcG9zaXRpb24gaXMgdG9wIGxlZnQgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gcGVyIG5vZGUgdG9vXHJcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVTaXplOiAxMiwgLy8gc2l6ZSBvZiBleHBhbmQtY29sbGFwc2UgY3VlXHJcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTogOCwgLy8gc2l6ZSBvZiBsaW5lcyB1c2VkIGZvciBkcmF3aW5nIHBsdXMtbWludXMgaWNvbnNcclxuICAgICAgICBleHBhbmRDdWVJbWFnZTogdW5kZWZpbmVkLCAvLyBpbWFnZSBvZiBleHBhbmQgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGV4cGFuZCBjdWVcclxuICAgICAgICBjb2xsYXBzZUN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGNvbGxhcHNlIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBjb2xsYXBzZSBjdWVcclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5OiAxLCAvLyBzZW5zaXRpdml0eSBvZiBleHBhbmQtY29sbGFwc2UgY3Vlc1xyXG4gICAgICAgXHJcbiAgICAgICAgZWRnZVR5cGVJbmZvIDogXCJlZGdlVHlwZVwiLCAvL3RoZSBuYW1lIG9mIHRoZSBmaWVsZCB0aGF0IGhhcyB0aGUgZWRnZSB0eXBlLCByZXRyaWV2ZWQgZnJvbSBlZGdlLmRhdGEoKSwgY2FuIGJlIGEgZnVuY3Rpb25cclxuICAgICAgICBncm91cEVkZ2VzT2ZTYW1lVHlwZU9uQ29sbGFwc2U6IGZhbHNlLFxyXG4gICAgICAgIGFsbG93TmVzdGVkRWRnZUNvbGxhcHNlOiB0cnVlLFxyXG4gICAgICAgIHpJbmRleDogOTk5IC8vIHotaW5kZXggdmFsdWUgb2YgdGhlIGNhbnZhcyBpbiB3aGljaCBjdWUgxLFtYWdlcyBhcmUgZHJhd25cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIElmIG9wdHMgaXMgbm90ICdnZXQnIHRoYXQgaXMgaXQgaXMgYSByZWFsIG9wdGlvbnMgb2JqZWN0IHRoZW4gaW5pdGlsaXplIHRoZSBleHRlbnNpb25cclxuICAgICAgaWYgKG9wdHMgIT09ICdnZXQnKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMnKShjeSk7XHJcbiAgICAgICAgdmFyIGFwaSA9IGNyZWF0ZUV4dGVuc2lvbkFQSShjeSwgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMpOyAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHRoZSBBUEkgaW5zdGFuY2UgZm9yIHRoZSBleHRlbnNpb25cclxuXHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ2FwaScsIGFwaSk7XHJcblxyXG4gICAgICAgIHVuZG9SZWRvVXRpbGl0aWVzKGN5LCBhcGkpO1xyXG5cclxuICAgICAgICBjdWVVdGlsaXRpZXMob3B0aW9ucywgY3ksIGFwaSk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZSBjdWUgaXMgbm90IGVuYWJsZWQgdW5iaW5kIGN1ZSBldmVudHNcclxuICAgICAgICBpZighb3B0aW9ucy5jdWVFbmFibGVkKSB7XHJcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3VuYmluZCcsIGN5LCBhcGkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCBvcHRpb25zLnJlYWR5ICkge1xyXG4gICAgICAgICAgb3B0aW9ucy5yZWFkeSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgdmFyIHBhcmVudERhdGEgPSB7fTtcclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAncGFyZW50RGF0YScsIHBhcmVudERhdGEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZ2V0U2NyYXRjaChjeSwgJ2FwaScpOyAvLyBFeHBvc2UgdGhlIEFQSSB0byB0aGUgdXNlcnNcclxuICAgIH0pO1xyXG4gIH07XHJcbiAgXHJcblxyXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWV4cGFuZC1jb2xsYXBzZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgICByZWdpc3RlcihjeXRvc2NhcGUpO1xyXG4gIH1cclxuXHJcbn0pKCk7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCBhcGkpIHtcclxuICBpZiAoY3kudW5kb1JlZG8gPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIHVyID0gY3kudW5kb1JlZG8oe30sIHRydWUpO1xyXG5cclxuICBmdW5jdGlvbiBnZXRFbGVzKF9lbGVzKSB7XHJcbiAgICByZXR1cm4gKHR5cGVvZiBfZWxlcyA9PT0gXCJzdHJpbmdcIikgPyBjeS4kKF9lbGVzKSA6IF9lbGVzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Tm9kZVBvc2l0aW9ucygpIHtcclxuICAgIHZhciBwb3NpdGlvbnMgPSB7fTtcclxuICAgIHZhciBub2RlcyA9IGN5Lm5vZGVzKCk7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWxlID0gbm9kZXNbaV07XHJcbiAgICAgIHBvc2l0aW9uc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgeDogZWxlLnBvc2l0aW9uKFwieFwiKSxcclxuICAgICAgICB5OiBlbGUucG9zaXRpb24oXCJ5XCIpXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBvc2l0aW9ucztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJldHVyblRvUG9zaXRpb25zKHBvc2l0aW9ucykge1xyXG4gICAgdmFyIGN1cnJlbnRQb3NpdGlvbnMgPSB7fTtcclxuICAgIGN5Lm5vZGVzKCkubm90KFwiOnBhcmVudFwiKS5wb3NpdGlvbnMoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICBjdXJyZW50UG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcclxuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxyXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcclxuICAgICAgfTtcclxuICAgICAgdmFyIHBvcyA9IHBvc2l0aW9uc1tlbGUuaWQoKV07XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogcG9zLngsXHJcbiAgICAgICAgeTogcG9zLnlcclxuICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjdXJyZW50UG9zaXRpb25zO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlY29uZFRpbWVPcHRzID0ge1xyXG4gICAgbGF5b3V0Qnk6IG51bGwsXHJcbiAgICBhbmltYXRlOiBmYWxzZSxcclxuICAgIGZpc2hleWU6IGZhbHNlXHJcbiAgfTtcclxuXHJcbiAgZnVuY3Rpb24gZG9JdChmdW5jKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICB2YXIgbm9kZXMgPSBnZXRFbGVzKGFyZ3Mubm9kZXMpO1xyXG4gICAgICBpZiAoYXJncy5maXJzdFRpbWUpIHtcclxuICAgICAgICByZXN1bHQub2xkRGF0YSA9IGdldE5vZGVQb3NpdGlvbnMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKGFyZ3Mub3B0aW9ucykgOiBhcGlbZnVuY10obm9kZXMsIGFyZ3Mub3B0aW9ucyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGFwaVtmdW5jXShzZWNvbmRUaW1lT3B0cykgOiBhcGlbZnVuY10oY3kuY29sbGVjdGlvbihub2RlcyksIHNlY29uZFRpbWVPcHRzKTtcclxuICAgICAgICByZXR1cm5Ub1Bvc2l0aW9ucyhhcmdzLm9sZERhdGEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHZhciBhY3Rpb25zID0gW1wiY29sbGFwc2VcIiwgXCJjb2xsYXBzZVJlY3Vyc2l2ZWx5XCIsIFwiY29sbGFwc2VBbGxcIiwgXCJleHBhbmRcIiwgXCJleHBhbmRSZWN1cnNpdmVseVwiLCBcImV4cGFuZEFsbFwiXTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZihpID09IDIpXHJcbiAgICAgIHVyLmFjdGlvbihcImNvbGxhcHNlQWxsXCIsIGRvSXQoXCJjb2xsYXBzZUFsbFwiKSwgZG9JdChcImV4cGFuZFJlY3Vyc2l2ZWx5XCIpKTtcclxuICAgIGVsc2UgaWYoaSA9PSA1KVxyXG4gICAgICB1ci5hY3Rpb24oXCJleHBhbmRBbGxcIiwgZG9JdChcImV4cGFuZEFsbFwiKSwgZG9JdChcImNvbGxhcHNlUmVjdXJzaXZlbHlcIikpO1xyXG4gICAgZWxzZVxyXG4gICAgICB1ci5hY3Rpb24oYWN0aW9uc1tpXSwgZG9JdChhY3Rpb25zW2ldKSwgZG9JdChhY3Rpb25zWyhpICsgMykgJSA2XSkpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY29sbGFwc2VFZGdlcyhhcmdzKXsgICAgXHJcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcclxuICAgIHZhciBlZGdlcyA9IGFyZ3MuZWRnZXM7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBcclxuICAgIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcclxuICAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcclxuICAgICAgdmFyIGNvbGxhcHNlUmVzdWx0ID0gYXBpLmNvbGxhcHNlRWRnZXMoZWRnZXMsb3B0aW9ucyk7ICAgIFxyXG4gICAgICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZVJlc3VsdC5lZGdlcztcclxuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VSZXN1bHQub2xkRWRnZXM7ICBcclxuICAgICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IGVkZ2VzO1xyXG4gICAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xyXG4gICAgICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcclxuICAgICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XHJcbiAgICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xyXG4gICAgICB9XHJcbiAgICAgXHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcbiAgZnVuY3Rpb24gY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyhhcmdzKXtcclxuICAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gICAgaWYoYXJncy5maXJzdFRpbWUpe1xyXG4gICAgIHZhciBjb2xsYXBzZUFsbFJlc3VsdCA9IGFwaS5jb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mubm9kZXMsIG9wdGlvbnMpO1xyXG4gICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0LmVkZ2VzO1xyXG4gICAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0Lm9sZEVkZ2VzO1xyXG4gICAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcclxuICAgIH1lbHNle1xyXG4gICAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XHJcbiAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcclxuICAgICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcclxuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xyXG4gICAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XHJcbiAgICAgIH1cclxuICAgIFxyXG4gICAgfVxyXG4gXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG5cclxuIH1cclxuIGZ1bmN0aW9uIGNvbGxhcHNlQWxsRWRnZXMoYXJncyl7XHJcbiAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xyXG4gICB2YXIgcmVzdWx0ID0ge307XHJcbiAgIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcclxuICAgaWYoYXJncy5maXJzdFRpbWUpe1xyXG4gICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmNvbGxhcHNlQWxsRWRnZXMob3B0aW9ucyk7XHJcbiAgICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5lZGdlcztcclxuICAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0Lm9sZEVkZ2VzO1xyXG4gICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xyXG4gICB9ZWxzZXtcclxuICAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XHJcbiAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xyXG4gICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xyXG4gICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XHJcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcclxuICAgICAgfVxyXG4gICBcclxuICAgfVxyXG5cclxuICAgcmV0dXJuIHJlc3VsdDtcclxuIH1cclxuIGZ1bmN0aW9uIGV4cGFuZEVkZ2VzKGFyZ3MpeyAgIFxyXG4gICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcclxuICAgdmFyIHJlc3VsdCA9e307XHJcbiAgXHJcbiAgIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcclxuICAgaWYoYXJncy5maXJzdFRpbWUpe1xyXG4gICAgIHZhciBleHBhbmRSZXN1bHQgPSBhcGkuZXhwYW5kRWRnZXMoYXJncy5lZGdlcyk7XHJcbiAgICByZXN1bHQuZWRnZXMgPSBleHBhbmRSZXN1bHQuZWRnZXM7XHJcbiAgICByZXN1bHQub2xkRWRnZXMgPSBleHBhbmRSZXN1bHQub2xkRWRnZXM7XHJcbiAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XHJcbiAgICBcclxuICAgfWVsc2V7XHJcbiAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xyXG4gICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcclxuICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xyXG4gICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XHJcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcclxuICAgICAgfVxyXG4gIFxyXG4gICB9XHJcblxyXG4gICByZXR1cm4gcmVzdWx0O1xyXG4gfVxyXG4gZnVuY3Rpb24gZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMoYXJncyl7XHJcbiAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XHJcbiAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcclxuICBpZihhcmdzLmZpcnN0VGltZSl7XHJcbiAgIHZhciBjb2xsYXBzZUFsbFJlc3VsdCA9IGFwaS5leHBhbmRFZGdlc0JldHdlZW5Ob2RlcyhhcmdzLm5vZGVzLG9wdGlvbnMpO1xyXG4gICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5lZGdlcztcclxuICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQub2xkRWRnZXM7XHJcbiAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcclxuICB9ZWxzZXtcclxuICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcclxuICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcclxuICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XHJcbiAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XHJcbiAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XHJcbiAgICB9XHJcbiAgXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG4gfVxyXG4gZnVuY3Rpb24gZXhwYW5kQWxsRWRnZXMoYXJncyl7XHJcbiAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XHJcbiAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcclxuICBpZihhcmdzLmZpcnN0VGltZSl7XHJcbiAgIHZhciBleHBhbmRSZXN1bHQgPSBhcGkuZXhwYW5kQWxsRWRnZXMob3B0aW9ucyk7XHJcbiAgIHJlc3VsdC5lZGdlcyA9IGV4cGFuZFJlc3VsdC5lZGdlcztcclxuICAgcmVzdWx0Lm9sZEVkZ2VzID0gZXhwYW5kUmVzdWx0Lm9sZEVkZ2VzO1xyXG4gICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XHJcbiAgfWVsc2V7XHJcbiAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XHJcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XHJcbiAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xyXG4gICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xyXG4gICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xyXG4gICAgfVxyXG4gICBcclxuICB9XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbiB9XHJcbiBcclxuIFxyXG4gIHVyLmFjdGlvbihcImNvbGxhcHNlRWRnZXNcIiwgY29sbGFwc2VFZGdlcywgZXhwYW5kRWRnZXMpO1xyXG4gIHVyLmFjdGlvbihcImV4cGFuZEVkZ2VzXCIsIGV4cGFuZEVkZ2VzLCBjb2xsYXBzZUVkZ2VzKTtcclxuXHJcbiAgdXIuYWN0aW9uKFwiY29sbGFwc2VFZGdlc0JldHdlZW5Ob2Rlc1wiLCBjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzLCBleHBhbmRFZGdlc0JldHdlZW5Ob2Rlcyk7XHJcbiAgdXIuYWN0aW9uKFwiZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXNcIiwgZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMsIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMpO1xyXG5cclxuICB1ci5hY3Rpb24oXCJjb2xsYXBzZUFsbEVkZ2VzXCIsIGNvbGxhcHNlQWxsRWRnZXMsIGV4cGFuZEFsbEVkZ2VzKTtcclxuICB1ci5hY3Rpb24oXCJleHBhbmRBbGxFZGdlc1wiLCBleHBhbmRBbGxFZGdlcywgY29sbGFwc2VBbGxFZGdlcyk7XHJcblxyXG4gXHJcblxyXG5cclxuICBcclxuXHJcblxyXG59O1xyXG4iXX0=
