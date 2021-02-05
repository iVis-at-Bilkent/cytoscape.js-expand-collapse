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
var debounce2 = _dereq_('./debounce2');

module.exports = function (params, cy, api) {
  var elementUtilities;
  var fn = params;
  const CUE_POS_UPDATE_DELAY = 100;
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

        node._private.data.expandcollapseRenderedStartX = expandcollapseStartX;
        node._private.data.expandcollapseRenderedStartY = expandcollapseStartY;
        node._private.data.expandcollapseRenderedCueSize = expandcollapseRectSize;

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

      cy.on('remove', 'node', data.eRemove = function (evt) {
        const node = evt.target;
        if (node == nodeWithRenderedCue) {
          clearDraws();
        }
      });

      var ur;
      cy.on('select unselect', data.eSelect = function () {
        if (nodeWithRenderedCue) {
          clearDraws();
        }
        var selectedNodes = cy.nodes(':selected');
        if (selectedNodes.length !== 1) {
          return;
        }
        var selectedNode = selectedNodes[0];

        if (selectedNode.isParent() || selectedNode.hasClass('cy-expand-collapse-collapsed-node')) {
          drawExpandCollapseCue(selectedNode);
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
          if (opts.undoable && !ur) {
            ur = cy.undoRedo({ defaultActions: false });
          }

          if (api.isCollapsible(node)) {
            clearDraws();
            if (opts.undoable) {
              ur.do("collapse", {
                nodes: node,
                options: opts
              });
            }
            else {
              api.collapse(node, opts);
            }
          }
          else if (api.isExpandable(node)) {
            clearDraws();
            if (opts.undoable) {
              ur.do("expand", { nodes: node, options: opts });
            }
            else {
              api.expand(node, opts);
            }
          }
          if (node.selectable()) {
            node.unselectify();
            cy.scratch('_cyExpandCollapse').selectableChanged = true;
          }
        }
      });

      cy.on('afterUndo afterRedo', data.eUndoRedo = data.eSelect);

      cy.on('position', 'node', data.ePosition = debounce2(data.eSelect, CUE_POS_UPDATE_DELAY, clearDraws));

      cy.on('pan zoom', data.ePosition);

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
        .off('position', 'node', data.ePosition)
        .off('pan zoom', data.ePosition)
        .off('select unselect', data.eSelect)
        .off('free', 'node', data.eFree)
        .off('resize', data.eCyResize)
        .off('afterUndo afterRedo', data.eUndoRedo);
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
        .on('position', 'node', data.ePosition)
        .on('pan zoom', data.ePosition)
        .on('select unselect', data.eSelect)
        .on('free', 'node', data.eFree)
        .on('resize', data.eCyResize)
        .on('afterUndo afterRedo', data.eUndoRedo);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(cy.container(), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(cy.container(), arguments);
  }
  throw new Error('No such function `' + fn + '` for cytoscape.js-expand-collapse');

};

},{"./debounce":3,"./debounce2":4,"./elementUtilities":5}],3:[function(_dereq_,module,exports){
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
var debounce2 = (function () {
  /**
   * Slightly modified version of debounce. Calls fn2 at the beginning of frequent calls to fn1
   * @static
   * @category Function
   * @param {Function} fn1 The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Function} fn2 The function to call the beginning of frequent calls to fn1
   * @returns {Function} Returns the new debounced function.
   */
  function debounce2(fn1, wait, fn2) {
    let timeout;
    let isInit = true;
    return function () {
      const context = this, args = arguments;
      const later = function () {
        timeout = null;
        fn1.apply(context, args);
        isInit = true;
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (isInit) {
        fn2.apply(context, args);
        isInit = false;
      }
    };
  }
  return debounce2;
})();

module.exports = debounce2;
},{}],5:[function(_dereq_,module,exports){
function elementUtilities(cy) {
 return {
  moveNodes: function (positionDiff, nodes, notCalcTopMostNodes) {
    var topMostNodes = notCalcTopMostNodes ? nodes : this.getTopMostNodes(nodes);
    var nonParents = topMostNodes.not(":parent"); 
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

},{}],6:[function(_dereq_,module,exports){
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
      var id1 = nodes[0].id();
      var id2 = id1;
      if (nodes[1]) {
          id2 = nodes[1].id();
      }
      newEdge.data.id = "collapsedEdge_" + id1 + "_" + id2 + "_" + edgeGroupType + "_" + Math.floor(Math.random() * Date.now());
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

},{"./boundingBoxUtilities":1,"./elementUtilities":5}],7:[function(_dereq_,module,exports){
(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape) {

    if (!cytoscape) {
      return;
    } // can't register if cytoscape unspecified

    var undoRedoUtilities = _dereq_('./undoRedoUtilities');
    var cueUtilities = _dereq_("./cueUtilities");
    var saveLoadUtils = null;

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

      function handleNewOptions(opts) {
        var currentOpts = getScratch(cy, 'options');
        if (opts.cueEnabled && !currentOpts.cueEnabled) {
          api.enableCue();
        }
        else if (!opts.cueEnabled && currentOpts.cueEnabled) {
          api.disableCue();
        }
      }

      function isOnly1Pair(edges) {
        let relatedEdgesArr = [];
        for (let i = 0; i < edges.length; i++) {
          const srcId = edges[i].source().id();
          const targetId = edges[i].target().id();
          const obj = {};
          obj[srcId] = true;
          obj[targetId] = true;
          relatedEdgesArr.push(obj);
        }
        for (let i = 0; i < relatedEdgesArr.length; i++) {
          for (let j = i + 1; j < relatedEdgesArr.length; j++) {
            const keys1 = Object.keys(relatedEdgesArr[i]);
            const keys2 = Object.keys(relatedEdgesArr[j]);
            const allKeys = new Set(keys1.concat(keys2));
            if (allKeys.size != keys1.length || allKeys.size != keys2.length) {
              return false;
            }
          }
        }
        return true;
      }

      // set all options at once
      api.setOptions = function (opts) {
        handleNewOptions(opts);
        setScratch(cy, 'options', opts);
      };

      api.extendOptions = function (opts) {
        var options = getScratch(cy, 'options');
        var newOptions = extendOptions(options, opts);
        handleNewOptions(newOptions);
        setScratch(cy, 'options', newOptions);
      }

      // set the option whose name is given
      api.setOption = function (name, value) {
        var opts = {};
        opts[name] = value;

        var options = getScratch(cy, 'options');
        var newOptions = extendOptions(options, opts);

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
          if (typeof ele === "number") {
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
          if (typeof ele === "number") {
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
      api.getCollapsedChildrenRecursively = function (node) {
        var collapsedChildren = cy.collection();
        return expandCollapseUtilities.getCollapsedChildrenRecursively(node, collapsedChildren);
      };

      /** Get collapsed children of all collapsed nodes recursively including nested collapsed children
       * Returned value includes edges and nodes, use selector to get edges or nodes
       * @return all collapsed children
       */
      api.getAllCollapsedChildrenRecursively = function () {
        var collapsedChildren = cy.collection();
        var collapsedNodes = cy.nodes(".cy-expand-collapse-collapsed-node");
        var j;
        for (j = 0; j < collapsedNodes.length; j++) {
          collapsedChildren = collapsedChildren.union(this.getCollapsedChildrenRecursively(collapsedNodes[j]));
        }
        return collapsedChildren;
      };
      // This method forces the visual cue to be cleared. It is to be called in extreme cases
      api.clearVisualCue = function (node) {
        cy.trigger('expandcollapse.clearvisualcue');
      };

      api.disableCue = function () {
        var options = getScratch(cy, 'options');
        if (options.cueEnabled) {
          cueUtilities('unbind', cy, api);
          options.cueEnabled = false;
        }
      };

      api.enableCue = function () {
        var options = getScratch(cy, 'options');
        if (!options.cueEnabled) {
          cueUtilities('rebind', cy, api);
          options.cueEnabled = true;
        }
      };

      api.getParent = function (nodeId) {
        if (cy.getElementById(nodeId)[0] === undefined) {
          var parentData = getScratch(cy, 'parentData');
          return parentData[nodeId];
        }
        else {
          return cy.getElementById(nodeId).parent();
        }
      };

      api.collapseEdges = function (edges, opts) {
        var result = { edges: cy.collection(), oldEdges: cy.collection() };
        if (edges.length < 2) return result;
        if (!isOnly1Pair(edges)) return result;
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        return expandCollapseUtilities.collapseGivenEdges(edges, tempOptions);
      };

      api.expandEdges = function (edges) {
        var result = { edges: cy.collection(), oldEdges: cy.collection() }
        if (edges === undefined) return result;

        //if(typeof edges[Symbol.iterator] === 'function'){//collection of edges is passed
        edges.forEach(function (edge) {
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

      api.collapseEdgesBetweenNodes = function (nodes, opts) {
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
        // for self-loops
        nodesPairs.push(...nodes.map(x => [x, x]));
        var result = { edges: cy.collection(), oldEdges: cy.collection() };
        nodesPairs.forEach(function (nodePair) {
          const id1 = nodePair[1].id();
          var edges = nodePair[0].connectedEdges('[source = "' + id1 + '"],[target = "' + id1 + '"]');
          // edges for self-loops
          if (nodePair[0].id() === id1) {
            edges = nodePair[0].connectedEdges('[source = "' + id1 + '"][target = "' + id1 + '"]');
          }
          if (edges.length >= 2) {
            var operationResult = expandCollapseUtilities.collapseGivenEdges(edges, tempOptions)
            result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
            result.edges = result.edges.add(operationResult.edges);
          }

        }.bind(this));

        return result;

      };

      api.expandEdgesBetweenNodes = function (nodes) {
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
        var nodesPairs = pairwise(nodes);
        // for self-loops
        nodesPairs.push(...nodes.map(x => [x, x]));
        nodesPairs.forEach(function (nodePair) {
          const id1 = nodePair[1].id();
          var edges = nodePair[0].connectedEdges('.cy-expand-collapse-collapsed-edge[source = "' + id1 + '"],[target = "' + id1 + '"]');
          // edges for self-loops
          if (nodePair[0].id() === id1) {
            edges = nodePair[0].connectedEdges('[source = "' + id1 + '"][target = "' + id1 + '"]');
          }
          edgesToExpand = edgesToExpand.union(edges);
        }.bind(this));
        return this.expandEdges(edgesToExpand);
      };

      api.collapseAllEdges = function (opts) {
        return this.collapseEdgesBetweenNodes(cy.edges().connectedNodes(), opts);
      };

      api.expandAllEdges = function () {
        var edges = cy.edges(".cy-expand-collapse-collapsed-edge");
        var result = { edges: cy.collection(), oldEdges: cy.collection() };
        var operationResult = this.expandEdges(edges);
        result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
        result.edges = result.edges.add(operationResult.edges);
        return result;
      };

      api.loadJson = function (jsonStr, isOverrideExisting = true) {
        saveLoadUtils.loadJson(jsonStr, isOverrideExisting);
      };

      api.saveJson = function (elems, filename) {
        saveLoadUtils.saveJson(elems, filename);
      };

      return api; // Return the API instance
    }

    // Get the whole scratchpad reserved for this extension (on an element or core) or get a single property of it
    function getScratch(cyOrEle, name) {
      if (cyOrEle.scratch('_cyExpandCollapse') === undefined) {
        cyOrEle.scratch('_cyExpandCollapse', {});
      }

      var scratch = cyOrEle.scratch('_cyExpandCollapse');
      var retVal = (name === undefined) ? scratch : scratch[name];
      return retVal;
    }

    // Set a single property on scratchpad of an element or the core
    function setScratch(cyOrEle, name, val) {
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

        edgeTypeInfo: "edgeType", //the name of the field that has the edge type, retrieved from edge.data(), can be a function
        groupEdgesOfSameTypeOnCollapse: false,
        allowNestedEdgeCollapse: true,
        zIndex: 999 // z-index value of the canvas in which cue ımages are drawn
      };

      // If opts is not 'get' that is it is a real options object then initilize the extension
      if (opts !== 'get') {
        options = extendOptions(options, opts);

        var expandCollapseUtilities = _dereq_('./expandCollapseUtilities')(cy);
        var api = createExtensionAPI(cy, expandCollapseUtilities); // creates and returns the API instance for the extension
        saveLoadUtils = _dereq_("./saveLoadUtilities")(cy, api);
        setScratch(cy, 'api', api);

        undoRedoUtilities(cy, api);

        cueUtilities(options, cy, api);

        // if the cue is not enabled unbind cue events
        if (!options.cueEnabled) {
          cueUtilities('unbind', cy, api);
        }

        if (options.ready) {
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

},{"./cueUtilities":2,"./expandCollapseUtilities":6,"./saveLoadUtilities":8,"./undoRedoUtilities":9}],8:[function(_dereq_,module,exports){
function saveLoadUtilities(cy, api) {
  /** converts array of JSON to a cytoscape.js collection (bottom-up recursive)
   * keeps information about parents, all nodes added to cytoscape, and nodes to be collapsed
  * @param  {} jsonArr an array of objects (a JSON array)
  * @param  {} allNodes a cytoscape.js collection
  * @param  {} nodes2collapse a cytoscape.js collection
  * @param  {} node2parent a JS object (simply key-value pairs)
  */
  function json2cyCollection(jsonArr, allNodes, nodes2collapse, node2parent, isOverrideExisting) {
    // process edges last since they depend on nodes
    jsonArr.sort((a) => {
      if (a.group === 'edges') {
        return 1;
      }
      return -1;
    });

    // add compound nodes first, then add other nodes then edges
    let coll = cy.collection();
    for (let i = 0; i < jsonArr.length; i++) {
      const json = jsonArr[i];
      const d = json.data;
      if (d.parent) {
        node2parent[d.id] = d.parent;
      }
      const pos = { x: json.position.x, y: json.position.y };
      const existing = cy.$id(d.id);
      let e = null;
      if (existing.length > 0) {
        if (isOverrideExisting) {
          existing.json(json);
        }
        e = existing;
      } else {
        e = cy.add(json);
      }
      if (e.isNode()) {
        allNodes.merge(e);
      }

      if (d.originalEnds) {
        // all nodes should be in the memory (in cy or not)
        let src = allNodes.$id(d.originalEnds.source.data.id);
        if (d.originalEnds.source.data.parent) {
          node2parent[d.originalEnds.source.data.id] = d.originalEnds.source.data.parent;
        }
        let tgt = allNodes.$id(d.originalEnds.target.data.id);
        if (d.originalEnds.target.data.parent) {
          node2parent[d.originalEnds.target.data.id] = d.originalEnds.target.data.parent;
        }
        e.data('originalEnds', { source: src, target: tgt });
      }
      if (d.collapsedChildren) {
        nodes2collapse.merge(e);
        json2cyCollection(d.collapsedChildren, allNodes, nodes2collapse, node2parent, isOverrideExisting);
        clearCollapseMetaData(e);
      } else if (d.collapsedEdges) {
        e.data('collapsedEdges', json2cyCollection(d.collapsedEdges, allNodes, nodes2collapse, node2parent, isOverrideExisting));
        // delete collapsed edges from cy
        cy.remove(e.data('collapsedEdges'));
      }
      e.position(pos); // adding new elements to a compound might change its position
      coll.merge(e);
    }
    return coll;
  }

  /** clears all the data related to collapsed node
   * @param  {} e a cytoscape element
   */
  function clearCollapseMetaData(e) {
    e.data('collapsedChildren', null);
    e.removeClass('cy-expand-collapse-collapsed-node');
    e.data('position-before-collapse', null);
    e.data('size-before-collapse', null);
    e.data('expandcollapseRenderedStartX', null);
    e.data('expandcollapseRenderedStartY', null);
    e.data('expandcollapseRenderedCueSize', null);
  }

  /** converts cytoscape collection to JSON array.(bottom-up recursive)
   * @param  {} elems
   */
  function cyCollection2Json(elems) {
    let r = [];
    for (let i = 0; i < elems.length; i++) {
      const elem = elems[i];
      let jsonObj = null;
      if (!elem.collapsedChildren && !elem.collapsedEdges) {
        jsonObj = elem.cy.json();
      }
      else if (elem.collapsedChildren) {
        elem.collapsedChildren = cyCollection2Json(halfDeepCopyCollection(elem.collapsedChildren));
        jsonObj = elem.cy.json();
        jsonObj.data.collapsedChildren = elem.collapsedChildren;
      } else if (elem.collapsedEdges) {
        elem.collapsedEdges = cyCollection2Json(halfDeepCopyCollection(elem.collapsedEdges));
        jsonObj = elem.cy.json();
        jsonObj.data.collapsedEdges = elem.collapsedEdges;
      }
      if (elem.originalEnds) {
        const src = elem.originalEnds.source.json();
        const tgt = elem.originalEnds.target.json();
        if (src.data.collapsedChildren) {
          src.data.collapsedChildren = cyCollection2Json(halfDeepCopyCollection(src.data.collapsedChildren));
        }
        if (tgt.data.collapsedChildren) {
          tgt.data.collapsedChildren = cyCollection2Json(halfDeepCopyCollection(tgt.data.collapsedChildren));
        }
        jsonObj.data.originalEnds = { source: src, target: tgt };
      }
      r.push(jsonObj);
    }
    return r;
  }

  /** returns { cy: any, collapsedEdges: any, collapsedChildren: any, originalEnds: any }[]
   * from cytoscape collection
   * @param  {} col
   */
  function halfDeepCopyCollection(col) {
    let arr = [];
    for (let i = 0; i < col.length; i++) {
      arr.push({ cy: col[i], collapsedEdges: col[i].data('collapsedEdges'), collapsedChildren: col[i].data('collapsedChildren'), originalEnds: col[i].data('originalEnds') });
    }
    return arr;
  }

  /** saves the string as a file.
   * @param  {} str string
   * @param  {} fileName string
   */
  function str2file(str, fileName) {
    const blob = new Blob([str], { type: 'text/plain' });
    const anchor = document.createElement('a');

    anchor.download = fileName;
    anchor.href = (window.URL).createObjectURL(blob);
    anchor.dataset.downloadurl =
      ['text/plain', anchor.download, anchor.href].join(':');
    anchor.click();
  }

  return {

    /** Load elements from JSON formatted string representation.
     * For collapsed compounds, first add all collapsed nodes as normal nodes then collapse them. Then reposition them.
     * For collapsed edges, first add all of the edges then remove collapsed edges from cytoscape.
     * For original ends, restore their reference to cytoscape elements
     * @param  {} txt string
     */
    loadJson: function (txt, isOverrideExisting) {
      const fileJSON = JSON.parse(txt);
      // original endpoints won't exist in cy. So keep a reference.
      const nodePositions = {};
      const allNodes = cy.collection(); // some elements are stored in cy, some are deleted 
      const nodes2collapse = cy.collection(); // some are deleted 
      const node2parent = {};
      for (const n of fileJSON.nodes) {
        nodePositions[n.data.id] = { x: n.position.x, y: n.position.y };
        if (n.data.parent) {
          node2parent[n.data.id] = n.data.parent;
        }
        const existing = cy.$id(n.data.id);
        let node = null;
        if (existing.length > 0) {
          if (isOverrideExisting) {
            existing.json(n);
          }
          node = existing;
        } else {
          node = cy.add(n);
        }

        allNodes.merge(node);
        if (node.data('collapsedChildren')) {
          json2cyCollection(node.data('collapsedChildren'), allNodes, nodes2collapse, node2parent, isOverrideExisting);
          nodes2collapse.merge(node);
          clearCollapseMetaData(node);
        }
      }
      for (const e of fileJSON.edges) {
        const existing = cy.$id(e.data.id);
        let edge = null;
        if (existing.length > 0) {
          if (isOverrideExisting) {
            existing.json(e);
          }
          edge = existing;
        } else {
          edge = cy.add(e);
        }
        if (edge.data('collapsedEdges')) {
          edge.data('collapsedEdges', json2cyCollection(e.data.collapsedEdges, allNodes, nodes2collapse, node2parent, isOverrideExisting));
          cy.remove(edge.data('collapsedEdges')); // delete collapsed edges from cy
        }
        if (edge.data('originalEnds')) {
          const srcId = e.data.originalEnds.source.data.id;
          const tgtId = e.data.originalEnds.target.data.id;
          e.data.originalEnds = { source: allNodes.filter('#' + srcId), target: allNodes.filter('#' + tgtId) };
        }
      }
      // set parents
      for (let node in node2parent) {
        const elem = allNodes.$id(node);
        if (elem.length === 1) {
          elem.move({ parent: node2parent[node] });
        }
      }
      // collapse the collapsed nodes
      api.collapse(nodes2collapse, { layoutBy: null, fisheye: false, animate: false });

      // positions might be changed in collapse extension
      for (const n of fileJSON.nodes) {
        const node = cy.$id(n.data.id)
        if (node.isChildless()) {
          cy.$id(n.data.id).position(nodePositions[n.data.id]);
        }
      }
      cy.fit();
    },


    /** saves cytoscape elements (collection) as JSON
     * calls elements' json method (https://js.cytoscape.org/#ele.json) when we keep a cytoscape element in the data. 
     * @param  {} elems cytoscape collection
     * @param  {} filename string
     */
    saveJson: function (elems, filename) {
      if (!elems) {
        elems = cy.$();
      }
      const nodes = halfDeepCopyCollection(elems.nodes());
      const edges = halfDeepCopyCollection(elems.edges());
      if (edges.length + nodes.length < 1) {
        return;
      }

      // according to cytoscape.js format
      const o = { nodes: [], edges: [] };
      for (const e of edges) {
        if (e.collapsedEdges) {
          e.collapsedEdges = cyCollection2Json(halfDeepCopyCollection(e.collapsedEdges));
        }
        if (e.originalEnds) {
          const src = e.originalEnds.source.json();
          const tgt = e.originalEnds.target.json();
          if (src.data.collapsedChildren) {
            // e.originalEnds.source.data.collapsedChildren will be changed
            src.data.collapsedChildren = cyCollection2Json(halfDeepCopyCollection(src.data.collapsedChildren));
          }
          if (tgt.data.collapsedChildren) {
            tgt.data.collapsedChildren = cyCollection2Json(halfDeepCopyCollection(tgt.data.collapsedChildren));
          }
          e.originalEnds = { source: src, target: tgt };
        }
        const jsonObj = e.cy.json();
        jsonObj.data.collapsedEdges = e.collapsedEdges;
        jsonObj.data.originalEnds = e.originalEnds;
        o.edges.push(jsonObj);
      }
      for (const n of nodes) {
        if (n.collapsedChildren) {
          n.collapsedChildren = cyCollection2Json(halfDeepCopyCollection(n.collapsedChildren));
        }
        const jsonObj = n.cy.json();
        jsonObj.data.collapsedChildren = n.collapsedChildren;
        o.nodes.push(jsonObj);
      }

      if (!filename) {
        filename = 'expand-collapse-output.json';
      }
      str2file(JSON.stringify(o), filename);
    }
  };
}

module.exports = saveLoadUtilities;

},{}],9:[function(_dereq_,module,exports){
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

},{}]},{},[7])(7)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2RlYm91bmNlMi5qcyIsInNyYy9lbGVtZW50VXRpbGl0aWVzLmpzIiwic3JjL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3NhdmVMb2FkVXRpbGl0aWVzLmpzIiwic3JjL3VuZG9SZWRvVXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbjBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0ge1xyXG4gIGVxdWFsQm91bmRpbmdCb3hlczogZnVuY3Rpb24oYmIxLCBiYjIpe1xyXG4gICAgICByZXR1cm4gYmIxLngxID09IGJiMi54MSAmJiBiYjEueDIgPT0gYmIyLngyICYmIGJiMS55MSA9PSBiYjIueTEgJiYgYmIxLnkyID09IGJiMi55MjtcclxuICB9LFxyXG4gIGdldFVuaW9uOiBmdW5jdGlvbihiYjEsIGJiMil7XHJcbiAgICAgIHZhciB1bmlvbiA9IHtcclxuICAgICAgeDE6IE1hdGgubWluKGJiMS54MSwgYmIyLngxKSxcclxuICAgICAgeDI6IE1hdGgubWF4KGJiMS54MiwgYmIyLngyKSxcclxuICAgICAgeTE6IE1hdGgubWluKGJiMS55MSwgYmIyLnkxKSxcclxuICAgICAgeTI6IE1hdGgubWF4KGJiMS55MiwgYmIyLnkyKSxcclxuICAgIH07XHJcblxyXG4gICAgdW5pb24udyA9IHVuaW9uLngyIC0gdW5pb24ueDE7XHJcbiAgICB1bmlvbi5oID0gdW5pb24ueTIgLSB1bmlvbi55MTtcclxuXHJcbiAgICByZXR1cm4gdW5pb247XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib3VuZGluZ0JveFV0aWxpdGllczsiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBkZWJvdW5jZTIgPSByZXF1aXJlKCcuL2RlYm91bmNlMicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGFyYW1zLCBjeSwgYXBpKSB7XHJcbiAgdmFyIGVsZW1lbnRVdGlsaXRpZXM7XHJcbiAgdmFyIGZuID0gcGFyYW1zO1xyXG4gIGNvbnN0IENVRV9QT1NfVVBEQVRFX0RFTEFZID0gMTAwO1xyXG4gIHZhciBub2RlV2l0aFJlbmRlcmVkQ3VlO1xyXG5cclxuICBjb25zdCBnZXREYXRhID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNjcmF0Y2ggPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xyXG4gICAgcmV0dXJuIHNjcmF0Y2ggJiYgc2NyYXRjaC5jdWVVdGlsaXRpZXM7XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XHJcbiAgICBpZiAoc2NyYXRjaCA9PSBudWxsKSB7XHJcbiAgICAgIHNjcmF0Y2ggPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICBzY3JhdGNoLmN1ZVV0aWxpdGllcyA9IGRhdGE7XHJcbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHNjcmF0Y2gpO1xyXG4gIH07XHJcblxyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciAkY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICRjYW52YXMuY2xhc3NMaXN0LmFkZChcImV4cGFuZC1jb2xsYXBzZS1jYW52YXNcIik7XHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gY3kuY29udGFpbmVyKCk7XHJcbiAgICAgIHZhciBjdHggPSAkY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXMpO1xyXG5cclxuICAgICAgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcclxuXHJcbiAgICAgIHZhciBvZmZzZXQgPSBmdW5jdGlvbiAoZWx0KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBlbHQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB0b3A6IHJlY3QudG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcclxuICAgICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgJGNhbnZhcy5oZWlnaHQgPSBjeS5jb250YWluZXIoKS5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgJGNhbnZhcy53aWR0aCA9IGN5LmNvbnRhaW5lcigpLm9mZnNldFdpZHRoO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUudG9wID0gMDtcclxuICAgICAgICAkY2FudmFzLnN0eWxlLmxlZnQgPSAwO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUuekluZGV4ID0gb3B0aW9ucygpLnpJbmRleDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSBvZmZzZXQoJGNhbnZhcyk7XHJcbiAgICAgICAgICB2YXIgY29udGFpbmVyQmIgPSBvZmZzZXQoJGNvbnRhaW5lcik7XHJcbiAgICAgICAgICAkY2FudmFzLnN0eWxlLnRvcCA9IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKTtcclxuICAgICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpO1xyXG5cclxuICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYgKGN5KSB7XHJcbiAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMCk7XHJcblxyXG4gICAgICB9LCAyNTApO1xyXG5cclxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcclxuICAgICAgICBfc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBzaXplQ2FudmFzKCk7XHJcblxyXG4gICAgICB2YXIgZGF0YSA9IHt9O1xyXG5cclxuICAgICAgLy8gaWYgdGhlcmUgYXJlIGV2ZW50cyBmaWVsZCBpbiBkYXRhIHVuYmluZCB0aGVtIGhlcmVcclxuICAgICAgLy8gdG8gcHJldmVudCBiaW5kaW5nIHRoZSBzYW1lIGV2ZW50IG11bHRpcGxlIHRpbWVzXHJcbiAgICAgIC8vIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xyXG4gICAgICAvLyAgIGZ1bmN0aW9uc1sndW5iaW5kJ10uYXBwbHkoICRjb250YWluZXIgKTtcclxuICAgICAgLy8gfVxyXG5cclxuICAgICAgZnVuY3Rpb24gb3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5vcHRpb25zO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBjbGVhckRyYXdzKCkge1xyXG4gICAgICAgIHZhciB3ID0gY3kud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9IGN5LmhlaWdodCgpO1xyXG5cclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xyXG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSkge1xyXG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XHJcbiAgICAgICAgdmFyIGhhc0NoaWxkcmVuID0gY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbiAhPSB1bmRlZmluZWQgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2ltcGxlIG5vZGUgd2l0aCBubyBjb2xsYXBzZWQgY2hpbGRyZW4gcmV0dXJuIGRpcmVjdGx5XHJcbiAgICAgICAgaWYgKCFoYXNDaGlsZHJlbiAmJiAhY29sbGFwc2VkQ2hpbGRyZW4pIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBpc0NvbGxhcHNlZCA9IG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG5cclxuICAgICAgICAvL0RyYXcgZXhwYW5kLWNvbGxhcHNlIHJlY3RhbmdsZXNcclxuICAgICAgICB2YXIgcmVjdFNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVTaXplO1xyXG4gICAgICAgIHZhciBsaW5lU2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplO1xyXG5cclxuICAgICAgICB2YXIgY3VlQ2VudGVyO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb24gPT09ICd0b3AtbGVmdCcpIHtcclxuICAgICAgICAgIHZhciBvZmZzZXQgPSAxO1xyXG4gICAgICAgICAgdmFyIHNpemUgPSBjeS56b29tKCkgPCAxID8gcmVjdFNpemUgLyAoMiAqIGN5Lnpvb20oKSkgOiByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgICB2YXIgbm9kZUJvcmRlcldpZCA9IHBhcnNlRmxvYXQobm9kZS5jc3MoJ2JvcmRlci13aWR0aCcpKTtcclxuICAgICAgICAgIHZhciB4ID0gbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS53aWR0aCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctbGVmdCcpKVxyXG4gICAgICAgICAgICArIG5vZGVCb3JkZXJXaWQgKyBzaXplICsgb2Zmc2V0O1xyXG4gICAgICAgICAgdmFyIHkgPSBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmhlaWdodCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctdG9wJykpXHJcbiAgICAgICAgICAgICsgbm9kZUJvcmRlcldpZCArIHNpemUgKyBvZmZzZXQ7XHJcblxyXG4gICAgICAgICAgY3VlQ2VudGVyID0geyB4OiB4LCB5OiB5IH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHZhciBvcHRpb24gPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjtcclxuICAgICAgICAgIGN1ZUNlbnRlciA9IHR5cGVvZiBvcHRpb24gPT09ICdmdW5jdGlvbicgPyBvcHRpb24uY2FsbCh0aGlzLCBub2RlKSA6IG9wdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlciA9IGVsZW1lbnRVdGlsaXRpZXMuY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihjdWVDZW50ZXIpO1xyXG5cclxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHNpemVzXHJcbiAgICAgICAgcmVjdFNpemUgPSBNYXRoLm1heChyZWN0U2l6ZSwgcmVjdFNpemUgKiBjeS56b29tKCkpO1xyXG4gICAgICAgIGxpbmVTaXplID0gTWF0aC5tYXgobGluZVNpemUsIGxpbmVTaXplICogY3kuem9vbSgpKTtcclxuICAgICAgICB2YXIgZGlmZiA9IChyZWN0U2l6ZSAtIGxpbmVTaXplKSAvIDI7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclggPSBleHBhbmRjb2xsYXBzZUNlbnRlci54O1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclkgPSBleHBhbmRjb2xsYXBzZUNlbnRlci55O1xyXG5cclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFggPSBleHBhbmRjb2xsYXBzZUNlbnRlclggLSByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRZID0gZXhwYW5kY29sbGFwc2VDZW50ZXJZIC0gcmVjdFNpemUgLyAyO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlY3RTaXplID0gcmVjdFNpemU7XHJcblxyXG4gICAgICAgIC8vIERyYXcgZXhwYW5kL2NvbGxhcHNlIGN1ZSBpZiBzcGVjaWZpZWQgdXNlIGFuIGltYWdlIGVsc2UgcmVuZGVyIGl0IGluIHRoZSBkZWZhdWx0IHdheVxyXG4gICAgICAgIGlmIChpc0NvbGxhcHNlZCAmJiBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UpIHtcclxuICAgICAgICAgIGRyYXdJbWcob3B0aW9ucygpLmV4cGFuZEN1ZUltYWdlLCBleHBhbmRjb2xsYXBzZVN0YXJ0WCwgZXhwYW5kY29sbGFwc2VTdGFydFksIHJlY3RTaXplLCByZWN0U2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFpc0NvbGxhcHNlZCAmJiBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSkge1xyXG4gICAgICAgICAgZHJhd0ltZyhvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSwgZXhwYW5kY29sbGFwc2VTdGFydFgsIGV4cGFuZGNvbGxhcHNlU3RhcnRZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHZhciBvbGRGaWxsU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xyXG4gICAgICAgICAgdmFyIG9sZFdpZHRoID0gY3R4LmxpbmVXaWR0aDtcclxuICAgICAgICAgIHZhciBvbGRTdHJva2VTdHlsZSA9IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgICAgICAgIGN0eC5lbGxpcHNlKGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSAvIDIsIHJlY3RTaXplIC8gMiwgMCwgMCwgMiAqIE1hdGguUEkpO1xyXG4gICAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IE1hdGgubWF4KDIuNiwgMi42ICogY3kuem9vbSgpKTtcclxuXHJcbiAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xyXG4gICAgICAgICAgY3R4LmxpbmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGxpbmVTaXplICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xyXG5cclxuICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUgPSBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xyXG5cclxuICAgICAgICBub2RlV2l0aFJlbmRlcmVkQ3VlID0gbm9kZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gZHJhd0ltZyhpbWdTcmMsIHgsIHksIHcsIGgpIHtcclxuICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKHcsIGgpO1xyXG4gICAgICAgIGltZy5zcmMgPSBpbWdTcmM7XHJcbiAgICAgICAgaW1nLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCB4LCB5LCB3LCBoKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjeS5vbigncmVzaXplJywgZGF0YS5lQ3lSZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAobm9kZVdpdGhSZW5kZXJlZEN1ZSkge1xyXG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgb2xkTW91c2VQb3MgPSBudWxsLCBjdXJyTW91c2VQb3MgPSBudWxsO1xyXG4gICAgICBjeS5vbignbW91c2Vkb3duJywgZGF0YS5lTW91c2VEb3duID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBvbGRNb3VzZVBvcyA9IGUucmVuZGVyZWRQb3NpdGlvbiB8fCBlLmN5UmVuZGVyZWRQb3NpdGlvblxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKCdtb3VzZXVwJywgZGF0YS5lTW91c2VVcCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgY3Vyck1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlID0gZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIGNvbnN0IG5vZGUgPSBldnQudGFyZ2V0O1xyXG4gICAgICAgIGlmIChub2RlID09IG5vZGVXaXRoUmVuZGVyZWRDdWUpIHtcclxuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIHVyO1xyXG4gICAgICBjeS5vbignc2VsZWN0IHVuc2VsZWN0JywgZGF0YS5lU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKSB7XHJcbiAgICAgICAgICBjbGVhckRyYXdzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzZWxlY3RlZE5vZGVzID0gY3kubm9kZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgIGlmIChzZWxlY3RlZE5vZGVzLmxlbmd0aCAhPT0gMSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc2VsZWN0ZWROb2RlID0gc2VsZWN0ZWROb2Rlc1swXTtcclxuXHJcbiAgICAgICAgaWYgKHNlbGVjdGVkTm9kZS5pc1BhcmVudCgpIHx8IHNlbGVjdGVkTm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcclxuICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShzZWxlY3RlZE5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjeS5vbigndGFwJywgZGF0YS5lVGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSBub2RlV2l0aFJlbmRlcmVkQ3VlO1xyXG4gICAgICAgIGlmICghbm9kZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCcpO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZID0gbm9kZS5kYXRhKCdleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZJyk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUnKTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSA9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemU7XHJcblxyXG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zID0gZXZlbnQucmVuZGVyZWRQb3NpdGlvbiB8fCBldmVudC5jeVJlbmRlcmVkUG9zaXRpb247XHJcbiAgICAgICAgdmFyIGN5UmVuZGVyZWRQb3NYID0gY3lSZW5kZXJlZFBvcy54O1xyXG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zWSA9IGN5UmVuZGVyZWRQb3MueTtcclxuICAgICAgICB2YXIgb3B0cyA9IG9wdGlvbnMoKTtcclxuICAgICAgICB2YXIgZmFjdG9yID0gKG9wdHMuZXhwYW5kQ29sbGFwc2VDdWVTZW5zaXRpdml0eSAtIDEpIC8gMjtcclxuXHJcbiAgICAgICAgaWYgKChNYXRoLmFicyhvbGRNb3VzZVBvcy54IC0gY3Vyck1vdXNlUG9zLngpIDwgNSAmJiBNYXRoLmFicyhvbGRNb3VzZVBvcy55IC0gY3Vyck1vdXNlUG9zLnkpIDwgNSlcclxuICAgICAgICAgICYmIGN5UmVuZGVyZWRQb3NYID49IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggLSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuICAgICAgICAgICYmIGN5UmVuZGVyZWRQb3NYIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWSA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWSA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3Rvcikge1xyXG4gICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUgJiYgIXVyKSB7XHJcbiAgICAgICAgICAgIHVyID0gY3kudW5kb1JlZG8oeyBkZWZhdWx0QWN0aW9uczogZmFsc2UgfSk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKGFwaS5pc0NvbGxhcHNpYmxlKG5vZGUpKSB7XHJcbiAgICAgICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICB1ci5kbyhcImNvbGxhcHNlXCIsIHtcclxuICAgICAgICAgICAgICAgIG5vZGVzOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGFwaS5jb2xsYXBzZShub2RlLCBvcHRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSBpZiAoYXBpLmlzRXhwYW5kYWJsZShub2RlKSkge1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKCk7XHJcbiAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgICAgdXIuZG8oXCJleHBhbmRcIiwgeyBub2Rlczogbm9kZSwgb3B0aW9uczogb3B0cyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBhcGkuZXhwYW5kKG5vZGUsIG9wdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAobm9kZS5zZWxlY3RhYmxlKCkpIHtcclxuICAgICAgICAgICAgbm9kZS51bnNlbGVjdGlmeSgpO1xyXG4gICAgICAgICAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ2FmdGVyVW5kbyBhZnRlclJlZG8nLCBkYXRhLmVVbmRvUmVkbyA9IGRhdGEuZVNlbGVjdCk7XHJcblxyXG4gICAgICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGRhdGEuZVBvc2l0aW9uID0gZGVib3VuY2UyKGRhdGEuZVNlbGVjdCwgQ1VFX1BPU19VUERBVEVfREVMQVksIGNsZWFyRHJhd3MpKTtcclxuXHJcbiAgICAgIGN5Lm9uKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKTtcclxuXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICBkYXRhLmhhc0V2ZW50RmllbGRzID0gdHJ1ZTtcclxuICAgICAgc2V0RGF0YShkYXRhKTtcclxuICAgIH0sXHJcbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gdmFyICRjb250YWluZXIgPSB0aGlzO1xyXG4gICAgICB2YXIgZGF0YSA9IGdldERhdGEoKTtcclxuXHJcbiAgICAgIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdldmVudHMgdG8gdW5iaW5kIGRvZXMgbm90IGV4aXN0Jyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjeS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScpO1xyXG5cclxuICAgICAgY3kub2ZmKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcclxuICAgICAgICAub2ZmKCdtb3VzZXVwJywgJ25vZGUnLCBkYXRhLmVNb3VzZVVwKVxyXG4gICAgICAgIC5vZmYoJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlKVxyXG4gICAgICAgIC5vZmYoJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxyXG4gICAgICAgIC5vZmYoJ2FkZCcsICdub2RlJywgZGF0YS5lQWRkKVxyXG4gICAgICAgIC5vZmYoJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbilcclxuICAgICAgICAub2ZmKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKVxyXG4gICAgICAgIC5vZmYoJ3NlbGVjdCB1bnNlbGVjdCcsIGRhdGEuZVNlbGVjdClcclxuICAgICAgICAub2ZmKCdmcmVlJywgJ25vZGUnLCBkYXRhLmVGcmVlKVxyXG4gICAgICAgIC5vZmYoJ3Jlc2l6ZScsIGRhdGEuZUN5UmVzaXplKVxyXG4gICAgICAgIC5vZmYoJ2FmdGVyVW5kbyBhZnRlclJlZG8nLCBkYXRhLmVVbmRvUmVkbyk7XHJcbiAgICB9LFxyXG4gICAgcmViaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xyXG5cclxuICAgICAgaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byByZWJpbmQgZG9lcyBub3QgZXhpc3QnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcclxuICAgICAgICAub24oJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXHJcbiAgICAgICAgLm9uKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcclxuICAgICAgICAub24oJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxyXG4gICAgICAgIC5vbignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXHJcbiAgICAgICAgLm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24pXHJcbiAgICAgICAgLm9uKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKVxyXG4gICAgICAgIC5vbignc2VsZWN0IHVuc2VsZWN0JywgZGF0YS5lU2VsZWN0KVxyXG4gICAgICAgIC5vbignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcclxuICAgICAgICAub24oJ3Jlc2l6ZScsIGRhdGEuZUN5UmVzaXplKVxyXG4gICAgICAgIC5vbignYWZ0ZXJVbmRvIGFmdGVyUmVkbycsIGRhdGEuZVVuZG9SZWRvKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkoY3kuY29udGFpbmVyKCksIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KGN5LmNvbnRhaW5lcigpLCBhcmd1bWVudHMpO1xyXG4gIH1cclxuICB0aHJvdyBuZXcgRXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZXhwYW5kLWNvbGxhcHNlJyk7XHJcblxyXG59O1xyXG4iLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCJ2YXIgZGVib3VuY2UyID0gKGZ1bmN0aW9uICgpIHtcclxuICAvKipcclxuICAgKiBTbGlnaHRseSBtb2RpZmllZCB2ZXJzaW9uIG9mIGRlYm91bmNlLiBDYWxscyBmbjIgYXQgdGhlIGJlZ2lubmluZyBvZiBmcmVxdWVudCBjYWxscyB0byBmbjFcclxuICAgKiBAc3RhdGljXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4xIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4yIFRoZSBmdW5jdGlvbiB0byBjYWxsIHRoZSBiZWdpbm5pbmcgb2YgZnJlcXVlbnQgY2FsbHMgdG8gZm4xXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlMihmbjEsIHdhaXQsIGZuMikge1xyXG4gICAgbGV0IHRpbWVvdXQ7XHJcbiAgICBsZXQgaXNJbml0ID0gdHJ1ZTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBjb25zdCBsYXRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcclxuICAgICAgICBmbjEuYXBwbHkoY29udGV4dCwgYXJncyk7XHJcbiAgICAgICAgaXNJbml0ID0gdHJ1ZTtcclxuICAgICAgfTtcclxuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG4gICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XHJcbiAgICAgIGlmIChpc0luaXQpIHtcclxuICAgICAgICBmbjIuYXBwbHkoY29udGV4dCwgYXJncyk7XHJcbiAgICAgICAgaXNJbml0ID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG4gIHJldHVybiBkZWJvdW5jZTI7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlMjsiLCJmdW5jdGlvbiBlbGVtZW50VXRpbGl0aWVzKGN5KSB7XHJcbiByZXR1cm4ge1xyXG4gIG1vdmVOb2RlczogZnVuY3Rpb24gKHBvc2l0aW9uRGlmZiwgbm9kZXMsIG5vdENhbGNUb3BNb3N0Tm9kZXMpIHtcclxuICAgIHZhciB0b3BNb3N0Tm9kZXMgPSBub3RDYWxjVG9wTW9zdE5vZGVzID8gbm9kZXMgOiB0aGlzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICB2YXIgbm9uUGFyZW50cyA9IHRvcE1vc3ROb2Rlcy5ub3QoXCI6cGFyZW50XCIpOyBcclxuICAgIC8vIG1vdmluZyBwYXJlbnRzIHNwb2lscyBwb3NpdGlvbmluZywgc28gbW92ZSBvbmx5IG5vbnBhcmVudHNcclxuICAgIG5vblBhcmVudHMucG9zaXRpb25zKGZ1bmN0aW9uKGVsZSwgaSl7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogbm9uUGFyZW50c1tpXS5wb3NpdGlvbihcInhcIikgKyBwb3NpdGlvbkRpZmYueCxcclxuICAgICAgICB5OiBub25QYXJlbnRzW2ldLnBvc2l0aW9uKFwieVwiKSArIHBvc2l0aW9uRGlmZi55XHJcbiAgICAgIH07XHJcbiAgICB9KTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gdG9wTW9zdE5vZGVzW2ldO1xyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgdmFyIG5vZGVzTWFwID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgcGFyZW50ID0gZWxlLnBhcmVudCgpWzBdO1xyXG4gICAgICB3aGlsZSAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICBpZiAobm9kZXNNYXBbcGFyZW50LmlkKCldKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQoKVswXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByb290cztcclxuICB9LFxyXG4gIHJlYXJyYW5nZTogZnVuY3Rpb24gKGxheW91dEJ5KSB7XHJcbiAgICBpZiAodHlwZW9mIGxheW91dEJ5ID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgbGF5b3V0QnkoKTtcclxuICAgIH0gZWxzZSBpZiAobGF5b3V0QnkgIT0gbnVsbCkge1xyXG4gICAgICB2YXIgbGF5b3V0ID0gY3kubGF5b3V0KGxheW91dEJ5KTtcclxuICAgICAgaWYgKGxheW91dCAmJiBsYXlvdXQucnVuKSB7XHJcbiAgICAgICAgbGF5b3V0LnJ1bigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uOiBmdW5jdGlvbiAobW9kZWxQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XHJcbiAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB4LFxyXG4gICAgICB5OiB5XHJcbiAgICB9O1xyXG4gIH1cclxuIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZWxlbWVudFV0aWxpdGllcztcclxuIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9ib3VuZGluZ0JveFV0aWxpdGllcycpO1xyXG5cclxuLy8gRXhwYW5kIGNvbGxhcHNlIHV0aWxpdGllc1xyXG5mdW5jdGlvbiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyhjeSkge1xyXG52YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcclxucmV0dXJuIHtcclxuICAvL3RoZSBudW1iZXIgb2Ygbm9kZXMgbW92aW5nIGFuaW1hdGVkbHkgYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvblxyXG4gIGFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQ6IDAsXHJcbiAgLypcclxuICAgKiBBIGZ1bnRpb24gYmFzaWNseSBleHBhbmRpbmcgYSBub2RlLCBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5LlxyXG4gICAqIFNpbmdsZSBwYXJhbWV0ZXIgaW5kaWNhdGVzIGlmIHRoZSBub2RlIGlzIGV4cGFuZGVkIGFsb25lIGFuZCBpZiBpdCBpcyB0cnV0aHkgdGhlbiBsYXlvdXRCeSBwYXJhbWV0ZXIgaXMgY29uc2lkZXJlZCB0b1xyXG4gICAqIHBlcmZvcm0gbGF5b3V0IGFmdGVyIGV4cGFuZC5cclxuICAgKi9cclxuICBleHBhbmROb2RlQmFzZUZ1bmN0aW9uOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBsYXlvdXRCeSkge1xyXG4gICAgaWYgKCFub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pe1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy9jaGVjayBob3cgdGhlIHBvc2l0aW9uIG9mIHRoZSBub2RlIGlzIGNoYW5nZWRcclxuICAgIHZhciBwb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgIHg6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCAtIG5vZGUuX3ByaXZhdGUuZGF0YVsncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJ10ueCxcclxuICAgICAgeTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS55XHJcbiAgICB9O1xyXG5cclxuICAgIG5vZGUucmVtb3ZlRGF0YShcImluZm9MYWJlbFwiKTtcclxuICAgIG5vZGUucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG5cclxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWV4cGFuZFwiKTtcclxuICAgIHZhciByZXN0b3JlZE5vZGVzID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgcmVzdG9yZWROb2Rlcy5yZXN0b3JlKCk7XHJcbiAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCByZXN0b3JlZE5vZGVzLmxlbmd0aDsgaSsrKXtcclxuICAgICAgZGVsZXRlIHBhcmVudERhdGFbcmVzdG9yZWROb2Rlc1tpXS5pZCgpXTtcclxuICAgIH1cclxuICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XHJcbiAgICB0aGlzLnJlcGFpckVkZ2VzKG5vZGUpO1xyXG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gbnVsbDtcclxuXHJcbiAgICBlbGVtZW50VXRpbGl0aWVzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIG5vZGUuY2hpbGRyZW4oKSk7XHJcbiAgICBub2RlLnJlbW92ZURhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpO1xyXG5cclxuICAgIG5vZGUudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBub2RlcyBhcmUgbW92ZWRcclxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kXCIpO1xyXG5cclxuICAgIC8vIElmIGV4cGFuZCBpcyBjYWxsZWQganVzdCBmb3Igb25lIG5vZGUgdGhlbiBjYWxsIGVuZCBvcGVyYXRpb24gdG8gcGVyZm9ybSBsYXlvdXRcclxuICAgIGlmIChzaW5nbGUpIHtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24obGF5b3V0QnksIG5vZGUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLypcclxuICAgKiBBIGhlbHBlciBmdW5jdGlvbiB0byBjb2xsYXBzZSBnaXZlbiBub2RlcyBpbiBhIHNpbXBsZSB3YXkgKFdpdGhvdXQgcGVyZm9ybWluZyBsYXlvdXQgYWZ0ZXJ3YXJkKVxyXG4gICAqIEl0IGNvbGxhcHNlcyBhbGwgcm9vdCBub2RlcyBib3R0b20gdXAuXHJcbiAgICovXHJcbiAgc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgbm9kZXMuZGF0YShcImNvbGxhcHNlXCIsIHRydWUpO1xyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICBcclxuICAgICAgLy8gQ29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlclxyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gZXhwYW5kIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXHJcbiAgICogSXQgZXhwYW5kcyBhbGwgdG9wIG1vc3Qgbm9kZXMgdG9wIGRvd24uXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgbm9kZXMuZGF0YShcImV4cGFuZFwiLCB0cnVlKTsgLy8gTWFyayB0aGF0IHRoZSBub2RlcyBhcmUgc3RpbGwgdG8gYmUgZXhwYW5kZWRcclxuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTsgLy8gRm9yIGVhY2ggcm9vdCBub2RlIGV4cGFuZCB0b3AgZG93blxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBFeHBhbmRzIGFsbCBub2RlcyBieSBleHBhbmRpbmcgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duIHdpdGggdGhlaXIgZGVzY2VuZGFudHMuXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuICAgIGlmIChub2RlcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG5vZGVzID0gY3kubm9kZXMoKTtcclxuICAgIH1cclxuICAgIHZhciBvcnBoYW5zO1xyXG4gICAgb3JwaGFucyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIHZhciBleHBhbmRTdGFjayA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gb3JwaGFuc1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXhwYW5kU3RhY2s7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoZSBvcGVyYXRpb24gdG8gYmUgcGVyZm9ybWVkIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQgcmVhcnJhbmdlIG5vZGVzIGJ5IGxheW91dEJ5IHBhcmFtZXRlci5cclxuICAgKi9cclxuICBlbmRPcGVyYXRpb246IGZ1bmN0aW9uIChsYXlvdXRCeSwgbm9kZXMpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIGN5LnJlYWR5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShsYXlvdXRCeSk7XHJcbiAgICAgICAgaWYoY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCl7XHJcbiAgICAgICAgICBub2Rlcy5zZWxlY3RpZnkoKTtcclxuICAgICAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sIDApO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBDYWxscyBzaW1wbGUgZXhwYW5kQWxsTm9kZXMuIFRoZW4gcGVyZm9ybXMgZW5kIG9wZXJhdGlvbi5cclxuICAgKi9cclxuICBleHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7Ly8qLy9cclxuICAgIHZhciBleHBhbmRlZFN0YWNrID0gdGhpcy5zaW1wbGVFeHBhbmRBbGxOb2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuXHJcbiAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBleHBhbmRlZFN0YWNrO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBFeHBhbmRzIHRoZSByb290IGFuZCBpdHMgY29sbGFwc2VkIGRlc2NlbmRlbnRzIGluIHRvcCBkb3duIG9yZGVyLlxyXG4gICAqL1xyXG4gIGV4cGFuZEFsbFRvcERvd246IGZ1bmN0aW9uIChyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICBleHBhbmRTdGFjay5wdXNoKHJvb3QpO1xyXG4gICAgICB0aGlzLmV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24obm9kZSwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vRXhwYW5kIHRoZSBnaXZlbiBub2RlcyBwZXJmb3JtIGVuZCBvcGVyYXRpb24gYWZ0ZXIgZXhwYW5kYXRpb25cclxuICBleHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcclxuICAgIC8vIElmIHRoZXJlIGlzIGp1c3Qgb25lIG5vZGUgdG8gZXhwYW5kIHdlIG5lZWQgdG8gYW5pbWF0ZSBmb3IgZmlzaGV5ZSB2aWV3LCBidXQgaWYgdGhlcmUgYXJlIG1vcmUgdGhlbiBvbmUgbm9kZSB3ZSBkbyBub3RcclxuICAgIGlmIChub2Rlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgXHJcbiAgICAgIHZhciBub2RlID0gbm9kZXNbMF07XHJcbiAgICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICAgIC8vIEV4cGFuZCB0aGUgZ2l2ZW4gbm9kZSB0aGUgdGhpcmQgcGFyYW1ldGVyIGluZGljYXRlcyB0aGF0IHRoZSBub2RlIGlzIHNpbXBsZSB3aGljaCBlbnN1cmVzIHRoYXQgZmlzaGV5ZSBwYXJhbWV0ZXIgd2lsbCBiZSBjb25zaWRlcmVkXHJcbiAgICAgICAgdGhpcy5leHBhbmROb2RlKG5vZGUsIG9wdGlvbnMuZmlzaGV5ZSwgdHJ1ZSwgb3B0aW9ucy5hbmltYXRlLCBvcHRpb25zLmxheW91dEJ5LCBvcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgICAgfVxyXG4gICAgfSBcclxuICAgIGVsc2Uge1xyXG4gICAgICAvLyBGaXJzdCBleHBhbmQgZ2l2ZW4gbm9kZXMgYW5kIHRoZW4gcGVyZm9ybSBsYXlvdXQgYWNjb3JkaW5nIHRvIHRoZSBsYXlvdXRCeSBwYXJhbWV0ZXJcclxuICAgICAgdGhpcy5zaW1wbGVFeHBhbmRHaXZlbk5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xyXG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGVzIHRoZW4gcGVyZm9ybSBlbmQgb3BlcmF0aW9uXHJcbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcclxuICAgIC8qXHJcbiAgICAgKiBJbiBjb2xsYXBzZSBvcGVyYXRpb24gdGhlcmUgaXMgbm8gZmlzaGV5ZSB2aWV3IHRvIGJlIGFwcGxpZWQgc28gdGhlcmUgaXMgbm8gYW5pbWF0aW9uIHRvIGJlIGRlc3Ryb3llZCBoZXJlLiBXZSBjYW4gZG8gdGhpcyBcclxuICAgICAqIGluIGEgYmF0Y2guXHJcbiAgICAgKi8gXHJcbiAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICB0aGlzLnNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2Rlcyhub2Rlcy8qLCBvcHRpb25zKi8pO1xyXG4gICAgY3kuZW5kQmF0Y2goKTtcclxuXHJcbiAgICBub2Rlcy50cmlnZ2VyKFwicG9zaXRpb25cIik7IC8vIHBvc2l0aW9uIG5vdCB0cmlnZ2VyZWQgYnkgZGVmYXVsdCB3aGVuIGNvbGxhcHNlTm9kZSBpcyBjYWxsZWRcclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcclxuXHJcbiAgICAvLyBVcGRhdGUgdGhlIHN0eWxlXHJcbiAgICBjeS5zdHlsZSgpLnVwZGF0ZSgpO1xyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBub2RlcyBpbiBib3R0b20gdXAgb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxyXG4gIGNvbGxhcHNlQm90dG9tVXA6IGZ1bmN0aW9uIChyb290KSB7XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChub2RlKTtcclxuICAgIH1cclxuICAgIC8vSWYgdGhlIHJvb3QgaXMgYSBjb21wb3VuZCBub2RlIHRvIGJlIGNvbGxhcHNlZCB0aGVuIGNvbGxhcHNlIGl0XHJcbiAgICBpZiAocm9vdC5kYXRhKFwiY29sbGFwc2VcIikgJiYgcm9vdC5jaGlsZHJlbigpLmxlbmd0aCA+IDApIHtcclxuICAgICAgdGhpcy5jb2xsYXBzZU5vZGUocm9vdCk7XHJcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImNvbGxhcHNlXCIpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9leHBhbmQgdGhlIG5vZGVzIGluIHRvcCBkb3duIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcclxuICBleHBhbmRUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuICAgIGlmIChyb290LmRhdGEoXCJleHBhbmRcIikgJiYgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgLy8gRXhwYW5kIHRoZSByb290IGFuZCB1bm1hcmsgaXRzIGV4cGFuZCBkYXRhIHRvIHNwZWNpZnkgdGhhdCBpdCBpcyBubyBtb3JlIHRvIGJlIGV4cGFuZGVkXHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImV4cGFuZFwiKTtcclxuICAgIH1cclxuICAgIC8vIE1ha2UgYSByZWN1cnNpdmUgY2FsbCBmb3IgY2hpbGRyZW4gb2Ygcm9vdFxyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24obm9kZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvLyBDb252ZXJzdCB0aGUgcmVuZGVyZWQgcG9zaXRpb24gdG8gbW9kZWwgcG9zaXRpb24gYWNjb3JkaW5nIHRvIGdsb2JhbCBwYW4gYW5kIHpvb20gdmFsdWVzXHJcbiAgY29udmVydFRvTW9kZWxQb3NpdGlvbjogZnVuY3Rpb24gKHJlbmRlcmVkUG9zaXRpb24pIHtcclxuICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgIHZhciB4ID0gKHJlbmRlcmVkUG9zaXRpb24ueCAtIHBhbi54KSAvIHpvb207XHJcbiAgICB2YXIgeSA9IChyZW5kZXJlZFBvc2l0aW9uLnkgLSBwYW4ueSkgLyB6b29tO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IHgsXHJcbiAgICAgIHk6IHlcclxuICAgIH07XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoaXMgbWV0aG9kIGV4cGFuZHMgdGhlIGdpdmVuIG5vZGUuIEl0IGNvbnNpZGVycyBhcHBseUZpc2hFeWVWaWV3LCBhbmltYXRlIGFuZCBsYXlvdXRCeSBwYXJhbWV0ZXJzLlxyXG4gICAqIEl0IGFsc28gY29uc2lkZXJzIHNpbmdsZSBwYXJhbWV0ZXIgd2hpY2ggaW5kaWNhdGVzIGlmIHRoaXMgbm9kZSBpcyBleHBhbmRlZCBhbG9uZS4gSWYgdGhpcyBwYXJhbWV0ZXIgaXMgdHJ1dGh5IGFsb25nIHdpdGggXHJcbiAgICogYXBwbHlGaXNoRXllVmlldyBwYXJhbWV0ZXIgdGhlbiB0aGUgc3RhdGUgb2YgdmlldyBwb3J0IGlzIHRvIGJlIGNoYW5nZWQgdG8gaGF2ZSBleHRyYSBzcGFjZSBvbiB0aGUgc2NyZWVuIChpZiBuZWVkZWQpIGJlZm9yZSBhcHBsaXlpbmcgdGhlXHJcbiAgICogZmlzaGV5ZSB2aWV3LlxyXG4gICAqL1xyXG4gIGV4cGFuZE5vZGU6IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgXHJcbiAgICB2YXIgY29tbW9uRXhwYW5kT3BlcmF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3KSB7XHJcblxyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53O1xyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gPSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBGaXNoZXllIHZpZXcgZXhwYW5kIHRoZSBub2RlLlxyXG4gICAgICAgIC8vIFRoZSBmaXJzdCBwYXJhbXRlciBpbmRpY2F0ZXMgdGhlIG5vZGUgdG8gYXBwbHkgZmlzaGV5ZSB2aWV3LCB0aGUgdGhpcmQgcGFyYW1ldGVyIGluZGljYXRlcyB0aGUgbm9kZVxyXG4gICAgICAgIC8vIHRvIGJlIGV4cGFuZGVkIGFmdGVyIGZpc2hleWUgdmlldyBpcyBhcHBsaWVkLlxyXG4gICAgICAgIHNlbGYuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZSwgc2luZ2xlLCBub2RlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiBvbmUgb2YgdGhlc2UgcGFyYW1ldGVycyBpcyB0cnV0aHkgaXQgbWVhbnMgdGhhdCBleHBhbmROb2RlQmFzZUZ1bmN0aW9uIGlzIGFscmVhZHkgdG8gYmUgY2FsbGVkLlxyXG4gICAgICAvLyBIb3dldmVyIGlmIG5vbmUgb2YgdGhlbSBpcyB0cnV0aHkgd2UgbmVlZCB0byBjYWxsIGl0IGhlcmUuXHJcbiAgICAgIGlmICghc2luZ2xlIHx8ICFhcHBseUZpc2hFeWVWaWV3IHx8ICFhbmltYXRlKSB7XHJcbiAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGUsIHNpbmdsZSwgbGF5b3V0QnkpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZSk7XHJcbiAgICAgIHZhciBhbmltYXRpbmcgPSBmYWxzZTsgLy8gVmFyaWFibGUgdG8gY2hlY2sgaWYgdGhlcmUgaXMgYSBjdXJyZW50IGFuaW1hdGlvbiwgaWYgdGhlcmUgaXMgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxyXG4gICAgICBcclxuICAgICAgLy8gSWYgdGhlIG5vZGUgaXMgdGhlIG9ubHkgbm9kZSB0byBleHBhbmQgYW5kIGZpc2hleWUgdmlldyBzaG91bGQgYmUgYXBwbGllZCwgdGhlbiBjaGFuZ2UgdGhlIHN0YXRlIG9mIHZpZXdwb3J0IFxyXG4gICAgICAvLyB0byBjcmVhdGUgbW9yZSBzcGFjZSBvbiBzY3JlZW4gKElmIG5lZWRlZClcclxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXcgJiYgc2luZ2xlKSB7XHJcbiAgICAgICAgdmFyIHRvcExlZnRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogMCwgeTogMH0pO1xyXG4gICAgICAgIHZhciBib3R0b21SaWdodFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiBjeS53aWR0aCgpLCB5OiBjeS5oZWlnaHQoKX0pO1xyXG4gICAgICAgIHZhciBwYWRkaW5nID0gODA7XHJcbiAgICAgICAgdmFyIGJiID0ge1xyXG4gICAgICAgICAgeDE6IHRvcExlZnRQb3NpdGlvbi54LFxyXG4gICAgICAgICAgeDI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueCxcclxuICAgICAgICAgIHkxOiB0b3BMZWZ0UG9zaXRpb24ueSxcclxuICAgICAgICAgIHkyOiBib3R0b21SaWdodFBvc2l0aW9uLnlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgbm9kZUJCID0ge1xyXG4gICAgICAgICAgeDE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53IC8gMiAtIHBhZGRpbmcsXHJcbiAgICAgICAgICB4Mjogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ICsgbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLncgLyAyICsgcGFkZGluZyxcclxuICAgICAgICAgIHkxOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgLSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaCAvIDIgLSBwYWRkaW5nLFxyXG4gICAgICAgICAgeTI6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSArIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiArIHBhZGRpbmdcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgdW5pb25CQiA9IGJvdW5kaW5nQm94VXRpbGl0aWVzLmdldFVuaW9uKG5vZGVCQiwgYmIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIHRoZXNlIGJib3hlcyBhcmUgbm90IGVxdWFsIHRoZW4gd2UgbmVlZCB0byBjaGFuZ2UgdGhlIHZpZXdwb3J0IHN0YXRlIChieSBwYW4gYW5kIHpvb20pXHJcbiAgICAgICAgaWYgKCFib3VuZGluZ0JveFV0aWxpdGllcy5lcXVhbEJvdW5kaW5nQm94ZXModW5pb25CQiwgYmIpKSB7XHJcbiAgICAgICAgICB2YXIgdmlld1BvcnQgPSBjeS5nZXRGaXRWaWV3cG9ydCh1bmlvbkJCLCAxMCk7XHJcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgICBhbmltYXRpbmcgPSBhbmltYXRlOyAvLyBTaWduYWwgdGhhdCB0aGVyZSBpcyBhbiBhbmltYXRpb24gbm93IGFuZCBjb21tb25FeHBhbmRPcGVyYXRpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW5pbWF0aW9uXHJcbiAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFuaW1hdGUgZHVyaW5nIHBhbiBhbmQgem9vbVxyXG4gICAgICAgICAgaWYgKGFuaW1hdGUpIHtcclxuICAgICAgICAgICAgY3kuYW5pbWF0ZSh7XHJcbiAgICAgICAgICAgICAgcGFuOiB2aWV3UG9ydC5wYW4sXHJcbiAgICAgICAgICAgICAgem9vbTogdmlld1BvcnQuem9vbSxcclxuICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICBkdXJhdGlvbjogYW5pbWF0aW9uRHVyYXRpb24gfHwgMTAwMFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjeS56b29tKHZpZXdQb3J0Lnpvb20pO1xyXG4gICAgICAgICAgICBjeS5wYW4odmlld1BvcnQucGFuKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIElmIGFuaW1hdGluZyBpcyBub3QgdHJ1ZSB3ZSBuZWVkIHRvIGNhbGwgY29tbW9uRXhwYW5kT3BlcmF0aW9uIGhlcmVcclxuICAgICAgaWYgKCFhbmltYXRpbmcpIHtcclxuICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlIHdpdGhvdXQgcGVyZm9ybWluZyBlbmQgb3BlcmF0aW9uXHJcbiAgY29sbGFwc2VOb2RlOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHg6IG5vZGUucG9zaXRpb24oKS54LFxyXG4gICAgICAgIHk6IG5vZGUucG9zaXRpb24oKS55XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScsIHtcclxuICAgICAgICB3OiBub2RlLm91dGVyV2lkdGgoKSxcclxuICAgICAgICBoOiBub2RlLm91dGVySGVpZ2h0KClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcblxyXG4gICAgICBjaGlsZHJlbi51bnNlbGVjdCgpO1xyXG4gICAgICBjaGlsZHJlbi5jb25uZWN0ZWRFZGdlcygpLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZVwiKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMuYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuKG5vZGUpO1xyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKG5vZGUsIG5vZGUpO1xyXG4gICAgICBub2RlLmFkZENsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcclxuXHJcbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2VcIik7XHJcbiAgICAgIFxyXG4gICAgICBub2RlLnBvc2l0aW9uKG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykpO1xyXG5cclxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgc3RvcmVXaWR0aEhlaWdodDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgaWYgKG5vZGUgIT0gbnVsbCkge1xyXG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSA9IHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5vdXRlcldpZHRoKCk7XHJcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gPSBub2RlLm91dGVySGVpZ2h0KCk7XHJcblxyXG4gICAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUucGFyZW50KClbMF0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH0sXHJcbiAgLypcclxuICAgKiBBcHBseSBmaXNoZXllIHZpZXcgdG8gdGhlIGdpdmVuIG5vZGUuIG5vZGVUb0V4cGFuZCB3aWxsIGJlIGV4cGFuZGVkIGFmdGVyIHRoZSBvcGVyYXRpb24uIFxyXG4gICAqIFRoZSBvdGhlciBwYXJhbWV0ZXIgYXJlIHRvIGJlIHBhc3NlZCBieSBwYXJhbWV0ZXJzIGRpcmVjdGx5IGluIGludGVybmFsIGZ1bmN0aW9uIGNhbGxzLlxyXG4gICAqL1xyXG4gIGZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xyXG4gICAgdmFyIHNpYmxpbmdzID0gdGhpcy5nZXRTaWJsaW5ncyhub2RlKTtcclxuXHJcbiAgICB2YXIgeF9hID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuICAgIHZhciB5X2EgPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG5cclxuICAgIHZhciBkX3hfbGVmdCA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcclxuICAgIHZhciBkX3hfcmlnaHQgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XHJcbiAgICB2YXIgZF95X3VwcGVyID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XHJcbiAgICB2YXIgZF95X2xvd2VyID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XHJcblxyXG4gICAgdmFyIGFic19kaWZmX29uX3ggPSBNYXRoLmFicyhub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSAtIHhfYSk7XHJcbiAgICB2YXIgYWJzX2RpZmZfb25feSA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddIC0geV9hKTtcclxuXHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBMRUZUXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gPiB4X2EpIHtcclxuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCArIGFic19kaWZmX29uX3g7XHJcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCAtIGFic19kaWZmX29uX3g7XHJcbiAgICB9XHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBSSUdIVFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgLSBhYnNfZGlmZl9vbl94O1xyXG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgKyBhYnNfZGlmZl9vbl94O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIFVQXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gPiB5X2EpIHtcclxuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyICsgYWJzX2RpZmZfb25feTtcclxuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyIC0gYWJzX2RpZmZfb25feTtcclxuICAgIH1cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIERPV05cclxuICAgIGVsc2Uge1xyXG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgLSBhYnNfZGlmZl9vbl95O1xyXG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgKyBhYnNfZGlmZl9vbl95O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB4UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XHJcbiAgICB2YXIgeVBvc0luUGFyZW50U2libGluZyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgeFBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueFBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcclxuICAgICAgeVBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueVBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3NbaV07XHJcblxyXG4gICAgICB2YXIgeF9iID0geFBvc0luUGFyZW50U2libGluZ1tpXTtcclxuICAgICAgdmFyIHlfYiA9IHlQb3NJblBhcmVudFNpYmxpbmdbaV07XHJcblxyXG4gICAgICB2YXIgc2xvcGUgPSAoeV9iIC0geV9hKSAvICh4X2IgLSB4X2EpO1xyXG5cclxuICAgICAgdmFyIGRfeCA9IDA7XHJcbiAgICAgIHZhciBkX3kgPSAwO1xyXG4gICAgICB2YXIgVF94ID0gMDtcclxuICAgICAgdmFyIFRfeSA9IDA7XHJcblxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExFRlRcclxuICAgICAgaWYgKHhfYSA+IHhfYikge1xyXG4gICAgICAgIGRfeCA9IGRfeF9sZWZ0O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgUklHSFRcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZF94ID0gZF94X3JpZ2h0O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgVVBQRVIgc2lkZVxyXG4gICAgICBpZiAoeV9hID4geV9iKSB7XHJcbiAgICAgICAgZF95ID0gZF95X3VwcGVyO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTE9XRVIgc2lkZVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBkX3kgPSBkX3lfbG93ZXI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpc0Zpbml0ZShzbG9wZSkpIHtcclxuICAgICAgICBUX3ggPSBNYXRoLm1pbihkX3gsIChkX3kgLyBNYXRoLmFicyhzbG9wZSkpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNsb3BlICE9PSAwKSB7XHJcbiAgICAgICAgVF95ID0gTWF0aC5taW4oZF95LCAoZF94ICogTWF0aC5hYnMoc2xvcGUpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcclxuICAgICAgICBUX3ggPSAtMSAqIFRfeDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHlfYSA+IHlfYikge1xyXG4gICAgICAgIFRfeSA9IC0xICogVF95O1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBNb3ZlIHRoZSBzaWJsaW5nIGluIHRoZSBzcGVjaWFsIHdheVxyXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoc2libGluZywgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIHRoZXJlIGlzIG5vIHNpYmxpbmcgY2FsbCBleHBhbmQgbm9kZSBiYXNlIGZ1bmN0aW9uIGhlcmUgZWxzZSBpdCBpcyB0byBiZSBjYWxsZWQgb25lIG9mIGZpc2hFeWVWaWV3TW92ZU5vZGUoKSBjYWxsc1xyXG4gICAgaWYgKHNpYmxpbmdzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgLy8gQXBwbHkgZmlzaGV5ZSB2aWV3IHRvIHRoZSBwYXJlbnQgbm9kZSBhcyB3ZWxsICggSWYgZXhpc3RzIClcclxuICAgICAgdGhpcy5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLnBhcmVudCgpWzBdLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9LFxyXG4gIGdldFNpYmxpbmdzOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgdmFyIHNpYmxpbmdzO1xyXG5cclxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdID09IG51bGwpIHtcclxuICAgICAgdmFyIG9ycGhhbnMgPSBjeS5ub2RlcyhcIjp2aXNpYmxlXCIpLm9ycGhhbnMoKTtcclxuICAgICAgc2libGluZ3MgPSBvcnBoYW5zLmRpZmZlcmVuY2Uobm9kZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzaWJsaW5ncyA9IG5vZGUuc2libGluZ3MoXCI6dmlzaWJsZVwiKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2libGluZ3M7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIE1vdmUgbm9kZSBvcGVyYXRpb24gc3BlY2lhbGl6ZWQgZm9yIGZpc2ggZXllIHZpZXcgZXhwYW5kIG9wZXJhdGlvblxyXG4gICAqIE1vdmVzIHRoZSBub2RlIGJ5IG1vdmluZyBpdHMgZGVzY2FuZGVudHMuIE1vdmVtZW50IGlzIGFuaW1hdGVkIGlmIGJvdGggc2luZ2xlIGFuZCBhbmltYXRlIGZsYWdzIGFyZSB0cnV0aHkuXHJcbiAgICovXHJcbiAgZmlzaEV5ZVZpZXdNb3ZlTm9kZTogZnVuY3Rpb24gKG5vZGUsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgaWYobm9kZS5pc1BhcmVudCgpKXtcclxuICAgICAgIGNoaWxkcmVuTGlzdCA9IG5vZGUuY2hpbGRyZW4oXCI6dmlzaWJsZVwiKTtcclxuICAgIH1cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIFxyXG4gICAgLypcclxuICAgICAqIElmIHRoZSBub2RlIGlzIHNpbXBsZSBtb3ZlIGl0c2VsZiBkaXJlY3RseSBlbHNlIG1vdmUgaXQgYnkgbW92aW5nIGl0cyBjaGlsZHJlbiBieSBhIHNlbGYgcmVjdXJzaXZlIGNhbGxcclxuICAgICAqL1xyXG4gICAgaWYgKGNoaWxkcmVuTGlzdC5sZW5ndGggPT0gMCkge1xyXG4gICAgICB2YXIgbmV3UG9zaXRpb24gPSB7eDogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ICsgVF94LCB5OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgKyBUX3l9O1xyXG4gICAgICBpZiAoIXNpbmdsZSB8fCAhYW5pbWF0ZSkge1xyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCA9IG5ld1Bvc2l0aW9uLng7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ID0gbmV3UG9zaXRpb24ueTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcclxuICAgICAgICBub2RlLmFuaW1hdGUoe1xyXG4gICAgICAgICAgcG9zaXRpb246IG5ld1Bvc2l0aW9uLFxyXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50LS07XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQgPiAwIHx8ICFub2RlVG9FeHBhbmQuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpKSB7XHJcblxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gSWYgYWxsIG5vZGVzIGFyZSBtb3ZlZCB3ZSBhcmUgcmVhZHkgdG8gZXhwYW5kIHNvIGNhbGwgZXhwYW5kIG5vZGUgYmFzZSBmdW5jdGlvblxyXG4gICAgICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGUsIGxheW91dEJ5KTtcclxuXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDEwMDBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW5MaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICB4UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XHJcbiAgICB2YXIgeF9hID0gMC4wO1xyXG5cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneCcpICsgKHBhcmVudC53aWR0aCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB4X2EgPSBub2RlLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHhfYTtcclxuICB9LFxyXG4gIHlQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuXHJcbiAgICB2YXIgeV9hID0gMC4wO1xyXG5cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHlfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneScpICsgKHBhcmVudC5oZWlnaHQoKSAvIDIpO1xyXG4gICAgfVxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeV9hID0gbm9kZS5wb3NpdGlvbigneScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB5X2E7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIG5vZGUgcGFyYW1ldGVyIGNhbGwgdGhpcyBtZXRob2RcclxuICAgKiB3aXRoIHRoZSBzYW1lIHJvb3QgcGFyYW1ldGVyLFxyXG4gICAqIHJlbW92ZSB0aGUgY2hpbGQgYW5kIGFkZCB0aGUgcmVtb3ZlZCBjaGlsZCB0byB0aGUgY29sbGFwc2VkY2hpbGRyZW4gZGF0YVxyXG4gICAqIG9mIHRoZSByb290IHRvIHJlc3RvcmUgdGhlbSBpbiB0aGUgY2FzZSBvZiBleHBhbmRhdGlvblxyXG4gICAqIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiBrZWVwcyB0aGUgbm9kZXMgdG8gcmVzdG9yZSB3aGVuIHRoZVxyXG4gICAqIHJvb3QgaXMgZXhwYW5kZWRcclxuICAgKi9cclxuICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4oY2hpbGQsIHJvb3QpO1xyXG4gICAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcclxuICAgICAgcGFyZW50RGF0YVtjaGlsZC5pZCgpXSA9IGNoaWxkLnBhcmVudCgpO1xyXG4gICAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGEgPSBwYXJlbnREYXRhO1xyXG4gICAgICB2YXIgcmVtb3ZlZENoaWxkID0gY2hpbGQucmVtb3ZlKCk7XHJcbiAgICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJlbW92ZWRDaGlsZDtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4udW5pb24ocmVtb3ZlZENoaWxkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgaXNNZXRhRWRnZTogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgcmV0dXJuIGVkZ2UuaGFzQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xyXG4gIH0sXHJcbiAgYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgcmVsYXRlZE5vZGVzID0gbm9kZS5kZXNjZW5kYW50cygpO1xyXG4gICAgdmFyIGVkZ2VzID0gcmVsYXRlZE5vZGVzLmVkZ2VzV2l0aChjeS5ub2RlcygpLm5vdChyZWxhdGVkTm9kZXMudW5pb24obm9kZSkpKTtcclxuICAgIFxyXG4gICAgdmFyIHJlbGF0ZWROb2RlTWFwID0ge307XHJcbiAgICBcclxuICAgIHJlbGF0ZWROb2Rlcy5lYWNoKGZ1bmN0aW9uKGVsZSwgaSkge1xyXG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICByZWxhdGVkTm9kZU1hcFtlbGUuaWQoKV0gPSB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcclxuICAgICAgdmFyIHNvdXJjZSA9IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgIHZhciB0YXJnZXQgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCF0aGlzLmlzTWV0YUVkZ2UoZWRnZSkpIHsgLy8gaXMgb3JpZ2luYWxcclxuICAgICAgICB2YXIgb3JpZ2luYWxFbmRzRGF0YSA9IHtcclxuICAgICAgICAgIHNvdXJjZTogc291cmNlLFxyXG4gICAgICAgICAgdGFyZ2V0OiB0YXJnZXRcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVkZ2UuYWRkQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xyXG4gICAgICAgIGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJywgb3JpZ2luYWxFbmRzRGF0YSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGVkZ2UubW92ZSh7XHJcbiAgICAgICAgdGFyZ2V0OiAhcmVsYXRlZE5vZGVNYXBbdGFyZ2V0LmlkKCldID8gdGFyZ2V0LmlkKCkgOiBub2RlLmlkKCksXHJcbiAgICAgICAgc291cmNlOiAhcmVsYXRlZE5vZGVNYXBbc291cmNlLmlkKCldID8gc291cmNlLmlkKCkgOiBub2RlLmlkKClcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBmaW5kTmV3RW5kOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgY3VycmVudCA9IG5vZGU7XHJcbiAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcclxuICAgIHZhciBwYXJlbnQgPSBwYXJlbnREYXRhW2N1cnJlbnQuaWQoKV07XHJcbiAgICBcclxuICAgIHdoaWxlKCAhY3VycmVudC5pbnNpZGUoKSApIHtcclxuICAgICAgY3VycmVudCA9IHBhcmVudDtcclxuICAgICAgcGFyZW50ID0gcGFyZW50RGF0YVtwYXJlbnQuaWQoKV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBjdXJyZW50O1xyXG4gIH0sXHJcbiAgcmVwYWlyRWRnZXM6IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciBjb25uZWN0ZWRNZXRhRWRnZXMgPSBub2RlLmNvbm5lY3RlZEVkZ2VzKCcuY3ktZXhwYW5kLWNvbGxhcHNlLW1ldGEtZWRnZScpO1xyXG4gICAgXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbm5lY3RlZE1ldGFFZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGNvbm5lY3RlZE1ldGFFZGdlc1tpXTtcclxuICAgICAgdmFyIG9yaWdpbmFsRW5kcyA9IGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJyk7XHJcbiAgICAgIHZhciBjdXJyZW50U3JjSWQgPSBlZGdlLmRhdGEoJ3NvdXJjZScpO1xyXG4gICAgICB2YXIgY3VycmVudFRndElkID0gZWRnZS5kYXRhKCd0YXJnZXQnKTtcclxuICAgICAgXHJcbiAgICAgIGlmICggY3VycmVudFNyY0lkID09PSBub2RlLmlkKCkgKSB7XHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZSh7XHJcbiAgICAgICAgICBzb3VyY2U6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMuc291cmNlKS5pZCgpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZSh7XHJcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMudGFyZ2V0KS5pZCgpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmICggZWRnZS5kYXRhKCdzb3VyY2UnKSA9PT0gb3JpZ2luYWxFbmRzLnNvdXJjZS5pZCgpICYmIGVkZ2UuZGF0YSgndGFyZ2V0JykgPT09IG9yaWdpbmFsRW5kcy50YXJnZXQuaWQoKSApIHtcclxuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XHJcbiAgICAgICAgZWRnZS5yZW1vdmVEYXRhKCdvcmlnaW5hbEVuZHMnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLypub2RlIGlzIGFuIG91dGVyIG5vZGUgb2Ygcm9vdFxyXG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxyXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXHJcbiAgaXNPdXRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCByb290KSB7Ly8qLy9cclxuICAgIHZhciB0ZW1wID0gbm9kZTtcclxuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRlbXAgPT0gcm9vdCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0sXHJcbiAgLyoqXHJcbiAgICogR2V0IGFsbCBjb2xsYXBzZWQgY2hpbGRyZW4gLSBpbmNsdWRpbmcgbmVzdGVkIG9uZXNcclxuICAgKiBAcGFyYW0gbm9kZSA6IGEgY29sbGFwc2VkIG5vZGVcclxuICAgKiBAcGFyYW0gY29sbGFwc2VkQ2hpbGRyZW4gOiBhIGNvbGxlY3Rpb24gdG8gc3RvcmUgdGhlIHJlc3VsdFxyXG4gICAqIEByZXR1cm4gOiBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgKi9cclxuICBnZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5OiBmdW5jdGlvbihub2RlLCBjb2xsYXBzZWRDaGlsZHJlbil7XHJcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJykgfHwgW107XHJcbiAgICB2YXIgaTtcclxuICAgIGZvciAoaT0wOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xyXG4gICAgICBpZiAoY2hpbGRyZW5baV0uZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKSl7XHJcbiAgICAgICAgY29sbGFwc2VkQ2hpbGRyZW4gPSBjb2xsYXBzZWRDaGlsZHJlbi51bmlvbih0aGlzLmdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkoY2hpbGRyZW5baV0sIGNvbGxhcHNlZENoaWxkcmVuKSk7XHJcbiAgICAgIH1cclxuICAgICAgY29sbGFwc2VkQ2hpbGRyZW4gPSBjb2xsYXBzZWRDaGlsZHJlbi51bmlvbihjaGlsZHJlbltpXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgfSxcclxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBzdGFydCBzZWN0aW9uIGVkZ2UgZXhwYW5kIGNvbGxhcHNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXHJcbiAgY29sbGFwc2VHaXZlbkVkZ2VzOiBmdW5jdGlvbiAoZWRnZXMsIG9wdGlvbnMpIHtcclxuICAgIGVkZ2VzLnVuc2VsZWN0KCk7XHJcbiAgICB2YXIgbm9kZXMgPSBlZGdlcy5jb25uZWN0ZWROb2RlcygpO1xyXG4gICAgdmFyIGVkZ2VzVG9Db2xsYXBzZSA9IHt9O1xyXG4gICAgLy8gZ3JvdXAgZWRnZXMgYnkgdHlwZSBpZiB0aGlzIG9wdGlvbiBpcyBzZXQgdG8gdHJ1ZVxyXG4gICAgaWYgKG9wdGlvbnMuZ3JvdXBFZGdlc09mU2FtZVR5cGVPbkNvbGxhcHNlKSB7XHJcbiAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgICAgICB2YXIgZWRnZVR5cGUgPSBcInVua25vd25cIjtcclxuICAgICAgICBpZiAob3B0aW9ucy5lZGdlVHlwZUluZm8gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgZWRnZVR5cGUgPSBvcHRpb25zLmVkZ2VUeXBlSW5mbyBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3B0aW9ucy5lZGdlVHlwZUluZm8uY2FsbChlZGdlKSA6IGVkZ2UuZGF0YSgpW29wdGlvbnMuZWRnZVR5cGVJbmZvXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZS5oYXNPd25Qcm9wZXJ0eShlZGdlVHlwZSkpIHtcclxuICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZWRnZXMgPSBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLmVkZ2VzLmFkZChlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5kaXJlY3Rpb25UeXBlID09IFwidW5pZGlyZWN0aW9uXCIgJiYgKGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uc291cmNlICE9IGVkZ2Uuc291cmNlKCkuaWQoKSB8fCBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLnRhcmdldCAhPSBlZGdlLnRhcmdldCgpLmlkKCkpKSB7XHJcbiAgICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZGlyZWN0aW9uVHlwZSA9IFwiYmlkaXJlY3Rpb25cIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdmFyIGVkZ2VzWCA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICAgIGVkZ2VzWCA9IGVkZ2VzWC5hZGQoZWRnZSk7XHJcbiAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdID0geyBlZGdlczogZWRnZXNYLCBkaXJlY3Rpb25UeXBlOiBcInVuaWRpcmVjdGlvblwiLCBzb3VyY2U6IGVkZ2Uuc291cmNlKCkuaWQoKSwgdGFyZ2V0OiBlZGdlLnRhcmdldCgpLmlkKCkgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdID0geyBlZGdlczogZWRnZXMsIGRpcmVjdGlvblR5cGU6IFwidW5pZGlyZWN0aW9uXCIsIHNvdXJjZTogZWRnZXNbMF0uc291cmNlKCkuaWQoKSwgdGFyZ2V0OiBlZGdlc1swXS50YXJnZXQoKS5pZCgpIH1cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLmRpcmVjdGlvblR5cGUgPT0gXCJ1bmlkaXJlY3Rpb25cIiAmJiAoZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS5zb3VyY2UgIT0gZWRnZXNbaV0uc291cmNlKCkuaWQoKSB8fCBlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLnRhcmdldCAhPSBlZGdlc1tpXS50YXJnZXQoKS5pZCgpKSkge1xyXG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS5kaXJlY3Rpb25UeXBlID0gXCJiaWRpcmVjdGlvblwiO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9XHJcbiAgICB2YXIgbmV3RWRnZXMgPSBbXTtcclxuICAgIGZvciAoY29uc3QgZWRnZUdyb3VwVHlwZSBpbiBlZGdlc1RvQ29sbGFwc2UpIHtcclxuICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcy5sZW5ndGggPCAyKSB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgICAgZWRnZXMudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYmVmb3JlY29sbGFwc2VlZGdlJyk7XHJcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzKTtcclxuICAgICAgdmFyIG5ld0VkZ2UgPSB7fTtcclxuICAgICAgbmV3RWRnZS5ncm91cCA9IFwiZWRnZXNcIjtcclxuICAgICAgbmV3RWRnZS5kYXRhID0ge307XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5zb3VyY2UgPSBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uc291cmNlO1xyXG4gICAgICBuZXdFZGdlLmRhdGEudGFyZ2V0ID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLnRhcmdldDtcclxuICAgICAgdmFyIGlkMSA9IG5vZGVzWzBdLmlkKCk7XHJcbiAgICAgIHZhciBpZDIgPSBpZDE7XHJcbiAgICAgIGlmIChub2Rlc1sxXSkge1xyXG4gICAgICAgICAgaWQyID0gbm9kZXNbMV0uaWQoKTtcclxuICAgICAgfVxyXG4gICAgICBuZXdFZGdlLmRhdGEuaWQgPSBcImNvbGxhcHNlZEVkZ2VfXCIgKyBpZDEgKyBcIl9cIiArIGlkMiArIFwiX1wiICsgZWRnZUdyb3VwVHlwZSArIFwiX1wiICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogRGF0ZS5ub3coKSk7XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IGN5LmNvbGxlY3Rpb24oKTtcclxuXHJcbiAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcy5mb3JFYWNoKGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICAgICAgbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzLmFkZChlZGdlKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMgPSB0aGlzLmNoZWNrNG5lc3RlZENvbGxhcHNlKG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcywgb3B0aW9ucyk7XHJcblxyXG4gICAgICB2YXIgZWRnZXNUeXBlRmllbGQgPSBcImVkZ2VUeXBlXCI7XHJcbiAgICAgIGlmIChvcHRpb25zLmVkZ2VUeXBlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZWRnZXNUeXBlRmllbGQgPSBvcHRpb25zLmVkZ2VUeXBlSW5mbyBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gZWRnZVR5cGVGaWVsZCA6IG9wdGlvbnMuZWRnZVR5cGVJbmZvO1xyXG4gICAgICB9XHJcbiAgICAgIG5ld0VkZ2UuZGF0YVtlZGdlc1R5cGVGaWVsZF0gPSBlZGdlR3JvdXBUeXBlO1xyXG5cclxuICAgICAgbmV3RWRnZS5kYXRhW1wiZGlyZWN0aW9uVHlwZVwiXSA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5kaXJlY3Rpb25UeXBlO1xyXG4gICAgICBuZXdFZGdlLmNsYXNzZXMgPSBcImN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVwiO1xyXG5cclxuICAgICAgbmV3RWRnZXMucHVzaChuZXdFZGdlKTtcclxuICAgICAgY3kucmVtb3ZlKGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcyk7XHJcbiAgICAgIGVkZ2VzLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2VlZGdlJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzdWx0LmVkZ2VzID0gY3kuYWRkKG5ld0VkZ2VzKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfSxcclxuXHJcbiAgY2hlY2s0bmVzdGVkQ29sbGFwc2U6IGZ1bmN0aW9uKGVkZ2VzMmNvbGxhcHNlLCBvcHRpb25zKXtcclxuICAgIGlmIChvcHRpb25zLmFsbG93TmVzdGVkRWRnZUNvbGxhcHNlKSB7XHJcbiAgICAgIHJldHVybiBlZGdlczJjb2xsYXBzZTtcclxuICAgIH1cclxuICAgIGxldCByID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlZGdlczJjb2xsYXBzZS5sZW5ndGg7IGkrKykge1xyXG4gICAgICBsZXQgY3VyciA9IGVkZ2VzMmNvbGxhcHNlW2ldO1xyXG4gICAgICBsZXQgY29sbGFwc2VkRWRnZXMgPSBjdXJyLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJyk7XHJcbiAgICAgIGlmIChjb2xsYXBzZWRFZGdlcyAmJiBjb2xsYXBzZWRFZGdlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgciA9IHIuYWRkKGNvbGxhcHNlZEVkZ2VzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByID0gci5hZGQoY3Vycik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByO1xyXG4gIH0sXHJcblxyXG4gIGV4cGFuZEVkZ2U6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICBlZGdlLnVuc2VsZWN0KCk7XHJcbiAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH1cclxuICAgIHZhciBlZGdlcyA9IGVkZ2UuZGF0YSgnY29sbGFwc2VkRWRnZXMnKTtcclxuICAgIGlmIChlZGdlcyAhPT0gdW5kZWZpbmVkICYmIGVkZ2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgZWRnZS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5iZWZvcmVleHBhbmRlZGdlJyk7XHJcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQoZWRnZSk7XHJcbiAgICAgIGN5LnJlbW92ZShlZGdlKTtcclxuICAgICAgcmVzdWx0LmVkZ2VzID0gY3kuYWRkKGVkZ2VzKTtcclxuICAgICAgZWRnZS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZGVkZ2UnKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfSxcclxuXHJcbiAgLy9pZiB0aGUgZWRnZXMgYXJlIG9ubHkgYmV0d2VlbiB0d28gbm9kZXMgKHZhbGlkIGZvciBjb2xscGFzaW5nKSByZXR1cm5zIHRoZSB0d28gbm9kZXMgZWxzZSBpdCByZXR1cm5zIGZhbHNlXHJcbiAgaXNWYWxpZEVkZ2VzRm9yQ29sbGFwc2U6IGZ1bmN0aW9uIChlZGdlcykge1xyXG4gICAgdmFyIGVuZFBvaW50cyA9IHRoaXMuZ2V0RWRnZXNEaXN0aW5jdEVuZFBvaW50cyhlZGdlcyk7XHJcbiAgICBpZiAoZW5kUG9pbnRzLmxlbmd0aCAhPSAyKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBlbmRQb2ludHM7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLy9yZXR1cm5zIGEgbGlzdCBvZiBkaXN0aW5jdCBlbmRwb2ludHMgb2YgYSBzZXQgb2YgZWRnZXMuXHJcbiAgZ2V0RWRnZXNEaXN0aW5jdEVuZFBvaW50czogZnVuY3Rpb24gKGVkZ2VzKSB7XHJcbiAgICB2YXIgZW5kUG9pbnRzID0gW107XHJcbiAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICAgIGlmICghdGhpcy5jb250YWluc0VsZW1lbnQoZW5kUG9pbnRzLCBlZGdlLnNvdXJjZSgpKSkge1xyXG4gICAgICAgIGVuZFBvaW50cy5wdXNoKGVkZ2Uuc291cmNlKCkpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICghdGhpcy5jb250YWluc0VsZW1lbnQoZW5kUG9pbnRzLCBlZGdlLnRhcmdldCgpKSkge1xyXG4gICAgICAgIGVuZFBvaW50cy5wdXNoKGVkZ2UudGFyZ2V0KCkpO1xyXG5cclxuICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICByZXR1cm4gZW5kUG9pbnRzO1xyXG4gIH0sXHJcblxyXG4gIC8vZnVuY3Rpb24gdG8gY2hlY2sgaWYgYSBsaXN0IG9mIGVsZW1lbnRzIGNvbnRhaW5zIHRoZSBnaXZlbiBlbGVtZW50IGJ5IGxvb2tpbmcgYXQgaWQoKVxyXG4gIGNvbnRhaW5zRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnRzLCBlbGVtZW50KSB7XHJcbiAgICB2YXIgZXhpc3RzID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmIChlbGVtZW50c1tpXS5pZCgpID09IGVsZW1lbnQuaWQoKSkge1xyXG4gICAgICAgIGV4aXN0cyA9IHRydWU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBleGlzdHM7XHJcbiAgfVxyXG4gIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGVuZCBzZWN0aW9uIGVkZ2UgZXhwYW5kIGNvbGxhcHNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXHJcbn1cclxuXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUpIHtcclxuXHJcbiAgICBpZiAoIWN5dG9zY2FwZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciB1bmRvUmVkb1V0aWxpdGllcyA9IHJlcXVpcmUoJy4vdW5kb1JlZG9VdGlsaXRpZXMnKTtcclxuICAgIHZhciBjdWVVdGlsaXRpZXMgPSByZXF1aXJlKFwiLi9jdWVVdGlsaXRpZXNcIik7XHJcbiAgICB2YXIgc2F2ZUxvYWRVdGlscyA9IG51bGw7XHJcblxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBleHRlbmRCeSkge1xyXG4gICAgICB2YXIgdGVtcE9wdHMgPSB7fTtcclxuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXHJcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuXHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBleHRlbmRCeSlcclxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcclxuICAgICAgICAgIHRlbXBPcHRzW2tleV0gPSBleHRlbmRCeVtrZXldO1xyXG4gICAgICByZXR1cm4gdGVtcE9wdHM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXZhbHVhdGUgc29tZSBzcGVjaWZpYyBvcHRpb25zIGluIGNhc2Ugb2YgdGhleSBhcmUgc3BlY2lmaWVkIGFzIGZ1bmN0aW9ucyB0byBiZSBkeW5hbWljYWxseSBjaGFuZ2VkXHJcbiAgICBmdW5jdGlvbiBldmFsT3B0aW9ucyhvcHRpb25zKSB7XHJcbiAgICAgIHZhciBhbmltYXRlID0gdHlwZW9mIG9wdGlvbnMuYW5pbWF0ZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuYW5pbWF0ZS5jYWxsKCkgOiBvcHRpb25zLmFuaW1hdGU7XHJcbiAgICAgIHZhciBmaXNoZXllID0gdHlwZW9mIG9wdGlvbnMuZmlzaGV5ZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZmlzaGV5ZS5jYWxsKCkgOiBvcHRpb25zLmZpc2hleWU7XHJcblxyXG4gICAgICBvcHRpb25zLmFuaW1hdGUgPSBhbmltYXRlO1xyXG4gICAgICBvcHRpb25zLmZpc2hleWUgPSBmaXNoZXllO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5LCBleHBhbmRDb2xsYXBzZVV0aWxpdGllcykge1xyXG4gICAgICB2YXIgYXBpID0ge307IC8vIEFQSSB0byBiZSByZXR1cm5lZFxyXG4gICAgICAvLyBzZXQgZnVuY3Rpb25zXHJcblxyXG4gICAgICBmdW5jdGlvbiBoYW5kbGVOZXdPcHRpb25zKG9wdHMpIHtcclxuICAgICAgICB2YXIgY3VycmVudE9wdHMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIGlmIChvcHRzLmN1ZUVuYWJsZWQgJiYgIWN1cnJlbnRPcHRzLmN1ZUVuYWJsZWQpIHtcclxuICAgICAgICAgIGFwaS5lbmFibGVDdWUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW9wdHMuY3VlRW5hYmxlZCAmJiBjdXJyZW50T3B0cy5jdWVFbmFibGVkKSB7XHJcbiAgICAgICAgICBhcGkuZGlzYWJsZUN1ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gaXNPbmx5MVBhaXIoZWRnZXMpIHtcclxuICAgICAgICBsZXQgcmVsYXRlZEVkZ2VzQXJyID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgY29uc3Qgc3JjSWQgPSBlZGdlc1tpXS5zb3VyY2UoKS5pZCgpO1xyXG4gICAgICAgICAgY29uc3QgdGFyZ2V0SWQgPSBlZGdlc1tpXS50YXJnZXQoKS5pZCgpO1xyXG4gICAgICAgICAgY29uc3Qgb2JqID0ge307XHJcbiAgICAgICAgICBvYmpbc3JjSWRdID0gdHJ1ZTtcclxuICAgICAgICAgIG9ialt0YXJnZXRJZF0gPSB0cnVlO1xyXG4gICAgICAgICAgcmVsYXRlZEVkZ2VzQXJyLnB1c2gob2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWxhdGVkRWRnZXNBcnIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHJlbGF0ZWRFZGdlc0Fyci5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICBjb25zdCBrZXlzMSA9IE9iamVjdC5rZXlzKHJlbGF0ZWRFZGdlc0FycltpXSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleXMyID0gT2JqZWN0LmtleXMocmVsYXRlZEVkZ2VzQXJyW2pdKTtcclxuICAgICAgICAgICAgY29uc3QgYWxsS2V5cyA9IG5ldyBTZXQoa2V5czEuY29uY2F0KGtleXMyKSk7XHJcbiAgICAgICAgICAgIGlmIChhbGxLZXlzLnNpemUgIT0ga2V5czEubGVuZ3RoIHx8IGFsbEtleXMuc2l6ZSAhPSBrZXlzMi5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHNldCBhbGwgb3B0aW9ucyBhdCBvbmNlXHJcbiAgICAgIGFwaS5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG9wdHMpO1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgb3B0cyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZXh0ZW5kT3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG5ld09wdGlvbnMpO1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHNldCB0aGUgb3B0aW9uIHdob3NlIG5hbWUgaXMgZ2l2ZW5cclxuICAgICAgYXBpLnNldE9wdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xyXG4gICAgICAgIHZhciBvcHRzID0ge307XHJcbiAgICAgICAgb3B0c1tuYW1lXSA9IHZhbHVlO1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG5cclxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG5ld09wdGlvbnMpO1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5jb2xsYXBzZSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyByZWN1cnNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5jb2xsYXBzZVJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XHJcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2UoZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5leHBhbmQgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGV4cGFuZCBnaXZlbiBlbGVzIHJlY3VzaXZlbHkgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxyXG4gICAgICBhcGkuZXhwYW5kUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRBbGxOb2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG5cclxuICAgICAgLy8gQ29yZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgIC8vIGNvbGxhcHNlIGFsbCBjb2xsYXBzaWJsZSBub2Rlc1xyXG4gICAgICBhcGkuY29sbGFwc2VBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2VSZWN1cnNpdmVseSh0aGlzLmNvbGxhcHNpYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZXhwYW5kIGFsbCBleHBhbmRhYmxlIG5vZGVzXHJcbiAgICAgIGFwaS5leHBhbmRBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVjdXJzaXZlbHkodGhpcy5leHBhbmRhYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuXHJcbiAgICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXHJcblxyXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGV4cGFuZGFibGVcclxuICAgICAgYXBpLmlzRXhwYW5kYWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gcmV0dXJucyBpZiB0aGUgZ2l2ZW4gbm9kZSBpcyBjb2xsYXBzaWJsZVxyXG4gICAgICBhcGkuaXNDb2xsYXBzaWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuICF0aGlzLmlzRXhwYW5kYWJsZShub2RlKSAmJiBub2RlLmlzUGFyZW50KCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBnZXQgY29sbGFwc2libGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXHJcbiAgICAgIGFwaS5jb2xsYXBzaWJsZU5vZGVzID0gZnVuY3Rpb24gKF9ub2Rlcykge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xyXG4gICAgICAgIHJldHVybiBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICAgICAgaWYgKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgZWxlID0gaTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBzZWxmLmlzQ29sbGFwc2libGUoZWxlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGdldCBleHBhbmRhYmxlIG9uZXMgaW5zaWRlIGdpdmVuIG5vZGVzIGlmIG5vZGVzIHBhcmFtZXRlciBpcyBub3Qgc3BlY2lmaWVkIGNvbnNpZGVyIGFsbCBub2Rlc1xyXG4gICAgICBhcGkuZXhwYW5kYWJsZU5vZGVzID0gZnVuY3Rpb24gKF9ub2Rlcykge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xyXG4gICAgICAgIHJldHVybiBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICAgICAgaWYgKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgZWxlID0gaTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBzZWxmLmlzRXhwYW5kYWJsZShlbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gR2V0IHRoZSBjaGlsZHJlbiBvZiB0aGUgZ2l2ZW4gY29sbGFwc2VkIG5vZGUgd2hpY2ggYXJlIHJlbW92ZWQgZHVyaW5nIGNvbGxhcHNlIG9wZXJhdGlvblxyXG4gICAgICBhcGkuZ2V0Q29sbGFwc2VkQ2hpbGRyZW4gPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiByZWN1cnNpdmVseSBpbmNsdWRpbmcgbmVzdGVkIGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAgICAgKiBSZXR1cm5lZCB2YWx1ZSBpbmNsdWRlcyBlZGdlcyBhbmQgbm9kZXMsIHVzZSBzZWxlY3RvciB0byBnZXQgZWRnZXMgb3Igbm9kZXNcclxuICAgICAgICogQHBhcmFtIG5vZGUgOiBhIGNvbGxhcHNlZCBub2RlXHJcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAgICAgKi9cclxuICAgICAgYXBpLmdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShub2RlLCBjb2xsYXBzZWRDaGlsZHJlbik7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiBvZiBhbGwgY29sbGFwc2VkIG5vZGVzIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXHJcbiAgICAgICAqIFJldHVybmVkIHZhbHVlIGluY2x1ZGVzIGVkZ2VzIGFuZCBub2RlcywgdXNlIHNlbGVjdG9yIHRvIGdldCBlZGdlcyBvciBub2Rlc1xyXG4gICAgICAgKiBAcmV0dXJuIGFsbCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICovXHJcbiAgICAgIGFwaS5nZXRBbGxDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICB2YXIgY29sbGFwc2VkTm9kZXMgPSBjeS5ub2RlcyhcIi5jeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGVcIik7XHJcbiAgICAgICAgdmFyIGo7XHJcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGNvbGxhcHNlZE5vZGVzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjb2xsYXBzZWROb2Rlc1tqXSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICAgIH07XHJcbiAgICAgIC8vIFRoaXMgbWV0aG9kIGZvcmNlcyB0aGUgdmlzdWFsIGN1ZSB0byBiZSBjbGVhcmVkLiBJdCBpcyB0byBiZSBjYWxsZWQgaW4gZXh0cmVtZSBjYXNlc1xyXG4gICAgICBhcGkuY2xlYXJWaXN1YWxDdWUgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIGN5LnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZGlzYWJsZUN1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY3VlRW5hYmxlZCkge1xyXG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCd1bmJpbmQnLCBjeSwgYXBpKTtcclxuICAgICAgICAgIG9wdGlvbnMuY3VlRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5lbmFibGVDdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIGlmICghb3B0aW9ucy5jdWVFbmFibGVkKSB7XHJcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3JlYmluZCcsIGN5LCBhcGkpO1xyXG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZ2V0UGFyZW50ID0gZnVuY3Rpb24gKG5vZGVJZCkge1xyXG4gICAgICAgIGlmIChjeS5nZXRFbGVtZW50QnlJZChub2RlSWQpWzBdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHZhciBwYXJlbnREYXRhID0gZ2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnKTtcclxuICAgICAgICAgIHJldHVybiBwYXJlbnREYXRhW25vZGVJZF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIGN5LmdldEVsZW1lbnRCeUlkKG5vZGVJZCkucGFyZW50KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmNvbGxhcHNlRWRnZXMgPSBmdW5jdGlvbiAoZWRnZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH07XHJcbiAgICAgICAgaWYgKGVkZ2VzLmxlbmd0aCA8IDIpIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgaWYgKCFpc09ubHkxUGFpcihlZGdlcykpIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XHJcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmV4cGFuZEVkZ2VzID0gZnVuY3Rpb24gKGVkZ2VzKSB7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9XHJcbiAgICAgICAgaWYgKGVkZ2VzID09PSB1bmRlZmluZWQpIHJldHVybiByZXN1bHQ7XHJcblxyXG4gICAgICAgIC8vaWYodHlwZW9mIGVkZ2VzW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpey8vY29sbGVjdGlvbiBvZiBlZGdlcyBpcyBwYXNzZWRcclxuICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlKTtcclxuICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcclxuICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLyogIH1lbHNley8vb25lIGVkZ2UgcGFzc2VkXHJcbiAgICAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEVkZ2UoZWRnZXMpO1xyXG4gICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcclxuICAgICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XHJcbiAgICAgICAgICAgXHJcbiAgICAgICAgIH0gKi9cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMgPSBmdW5jdGlvbiAobm9kZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBmdW5jdGlvbiBwYWlyd2lzZShsaXN0KSB7XHJcbiAgICAgICAgICB2YXIgcGFpcnMgPSBbXTtcclxuICAgICAgICAgIGxpc3RcclxuICAgICAgICAgICAgLnNsaWNlKDAsIGxpc3QubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGZpcnN0LCBuKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgdGFpbC5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKFtmaXJzdCwgaXRlbV0pXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICByZXR1cm4gcGFpcnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBub2Rlc1BhaXJzID0gcGFpcndpc2Uobm9kZXMpO1xyXG4gICAgICAgIC8vIGZvciBzZWxmLWxvb3BzXHJcbiAgICAgICAgbm9kZXNQYWlycy5wdXNoKC4uLm5vZGVzLm1hcCh4ID0+IFt4LCB4XSkpO1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB7IGVkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCkgfTtcclxuICAgICAgICBub2Rlc1BhaXJzLmZvckVhY2goZnVuY3Rpb24gKG5vZGVQYWlyKSB7XHJcbiAgICAgICAgICBjb25zdCBpZDEgPSBub2RlUGFpclsxXS5pZCgpO1xyXG4gICAgICAgICAgdmFyIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJ1tzb3VyY2UgPSBcIicgKyBpZDEgKyAnXCJdLFt0YXJnZXQgPSBcIicgKyBpZDEgKyAnXCJdJyk7XHJcbiAgICAgICAgICAvLyBlZGdlcyBmb3Igc2VsZi1sb29wc1xyXG4gICAgICAgICAgaWYgKG5vZGVQYWlyWzBdLmlkKCkgPT09IGlkMSkge1xyXG4gICAgICAgICAgICBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCdbc291cmNlID0gXCInICsgaWQxICsgJ1wiXVt0YXJnZXQgPSBcIicgKyBpZDEgKyAnXCJdJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoZWRnZXMubGVuZ3RoID49IDIpIHtcclxuICAgICAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpXHJcbiAgICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcclxuICAgICAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG5cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5leHBhbmRFZGdlc0JldHdlZW5Ob2RlcyA9IGZ1bmN0aW9uIChub2Rlcykge1xyXG4gICAgICAgIHZhciBlZGdlc1RvRXhwYW5kID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcclxuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xyXG4gICAgICAgICAgbGlzdFxyXG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcclxuICAgICAgICAgICAgICB2YXIgdGFpbCA9IGxpc3Quc2xpY2UobiArIDEsIGxpc3QubGVuZ3RoKTtcclxuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIHJldHVybiBwYWlycztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG5vZGVzUGFpcnMgPSBwYWlyd2lzZShub2Rlcyk7XHJcbiAgICAgICAgLy8gZm9yIHNlbGYtbG9vcHNcclxuICAgICAgICBub2Rlc1BhaXJzLnB1c2goLi4ubm9kZXMubWFwKHggPT4gW3gsIHhdKSk7XHJcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlUGFpcikge1xyXG4gICAgICAgICAgY29uc3QgaWQxID0gbm9kZVBhaXJbMV0uaWQoKTtcclxuICAgICAgICAgIHZhciBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCcuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlW3NvdXJjZSA9IFwiJyArIGlkMSArICdcIl0sW3RhcmdldCA9IFwiJyArIGlkMSArICdcIl0nKTtcclxuICAgICAgICAgIC8vIGVkZ2VzIGZvciBzZWxmLWxvb3BzXHJcbiAgICAgICAgICBpZiAobm9kZVBhaXJbMF0uaWQoKSA9PT0gaWQxKSB7XHJcbiAgICAgICAgICAgIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJ1tzb3VyY2UgPSBcIicgKyBpZDEgKyAnXCJdW3RhcmdldCA9IFwiJyArIGlkMSArICdcIl0nKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVkZ2VzVG9FeHBhbmQgPSBlZGdlc1RvRXhwYW5kLnVuaW9uKGVkZ2VzKTtcclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzVG9FeHBhbmQpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmNvbGxhcHNlQWxsRWRnZXMgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoY3kuZWRnZXMoKS5jb25uZWN0ZWROb2RlcygpLCBvcHRzKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5leHBhbmRBbGxFZGdlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZWRnZXMgPSBjeS5lZGdlcyhcIi5jeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLWVkZ2VcIik7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9O1xyXG4gICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzKTtcclxuICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XHJcbiAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpO1xyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkubG9hZEpzb24gPSBmdW5jdGlvbiAoanNvblN0ciwgaXNPdmVycmlkZUV4aXN0aW5nID0gdHJ1ZSkge1xyXG4gICAgICAgIHNhdmVMb2FkVXRpbHMubG9hZEpzb24oanNvblN0ciwgaXNPdmVycmlkZUV4aXN0aW5nKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5zYXZlSnNvbiA9IGZ1bmN0aW9uIChlbGVtcywgZmlsZW5hbWUpIHtcclxuICAgICAgICBzYXZlTG9hZFV0aWxzLnNhdmVKc29uKGVsZW1zLCBmaWxlbmFtZSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4gYXBpOyAvLyBSZXR1cm4gdGhlIEFQSSBpbnN0YW5jZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCB0aGUgd2hvbGUgc2NyYXRjaHBhZCByZXNlcnZlZCBmb3IgdGhpcyBleHRlbnNpb24gKG9uIGFuIGVsZW1lbnQgb3IgY29yZSkgb3IgZ2V0IGEgc2luZ2xlIHByb3BlcnR5IG9mIGl0XHJcbiAgICBmdW5jdGlvbiBnZXRTY3JhdGNoKGN5T3JFbGUsIG5hbWUpIHtcclxuICAgICAgaWYgKGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHt9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHNjcmF0Y2ggPSBjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XHJcbiAgICAgIHZhciByZXRWYWwgPSAobmFtZSA9PT0gdW5kZWZpbmVkKSA/IHNjcmF0Y2ggOiBzY3JhdGNoW25hbWVdO1xyXG4gICAgICByZXR1cm4gcmV0VmFsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNldCBhIHNpbmdsZSBwcm9wZXJ0eSBvbiBzY3JhdGNocGFkIG9mIGFuIGVsZW1lbnQgb3IgdGhlIGNvcmVcclxuICAgIGZ1bmN0aW9uIHNldFNjcmF0Y2goY3lPckVsZSwgbmFtZSwgdmFsKSB7XHJcbiAgICAgIGdldFNjcmF0Y2goY3lPckVsZSlbbmFtZV0gPSB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVnaXN0ZXIgdGhlIGV4dGVuc2lvbiBjeS5leHBhbmRDb2xsYXBzZSgpXHJcbiAgICBjeXRvc2NhcGUoXCJjb3JlXCIsIFwiZXhwYW5kQ29sbGFwc2VcIiwgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuXHJcbiAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKSB8fCB7XHJcbiAgICAgICAgbGF5b3V0Qnk6IG51bGwsIC8vIGZvciByZWFycmFuZ2UgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCdzIGp1c3QgbGF5b3V0IG9wdGlvbnMgb3Igd2hvbGUgbGF5b3V0IGZ1bmN0aW9uLiBDaG9vc2UgeW91ciBzaWRlIVxyXG4gICAgICAgIGZpc2hleWU6IHRydWUsIC8vIHdoZXRoZXIgdG8gcGVyZm9ybSBmaXNoZXllIHZpZXcgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlIHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHRvb1xyXG4gICAgICAgIGFuaW1hdGU6IHRydWUsIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSBvbiBkcmF3aW5nIGNoYW5nZXMgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXHJcbiAgICAgICAgYW5pbWF0aW9uRHVyYXRpb246IDEwMDAsIC8vIHdoZW4gYW5pbWF0ZSBpcyB0cnVlLCB0aGUgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzIG9mIHRoZSBhbmltYXRpb25cclxuICAgICAgICByZWFkeTogZnVuY3Rpb24gKCkgeyB9LCAvLyBjYWxsYmFjayB3aGVuIGV4cGFuZC9jb2xsYXBzZSBpbml0aWFsaXplZFxyXG4gICAgICAgIHVuZG9hYmxlOiB0cnVlLCAvLyBhbmQgaWYgdW5kb1JlZG9FeHRlbnNpb24gZXhpc3RzLFxyXG5cclxuICAgICAgICBjdWVFbmFibGVkOiB0cnVlLCAvLyBXaGV0aGVyIGN1ZXMgYXJlIGVuYWJsZWRcclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uOiAndG9wLWxlZnQnLCAvLyBkZWZhdWx0IGN1ZSBwb3NpdGlvbiBpcyB0b3AgbGVmdCB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiBwZXIgbm9kZSB0b29cclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNpemU6IDEyLCAvLyBzaXplIG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVcclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplOiA4LCAvLyBzaXplIG9mIGxpbmVzIHVzZWQgZm9yIGRyYXdpbmcgcGx1cy1taW51cyBpY29uc1xyXG4gICAgICAgIGV4cGFuZEN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGV4cGFuZCBpY29uIGlmIHVuZGVmaW5lZCBkcmF3IHJlZ3VsYXIgZXhwYW5kIGN1ZVxyXG4gICAgICAgIGNvbGxhcHNlQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgY29sbGFwc2UgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGNvbGxhcHNlIGN1ZVxyXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHk6IDEsIC8vIHNlbnNpdGl2aXR5IG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVzXHJcblxyXG4gICAgICAgIGVkZ2VUeXBlSW5mbzogXCJlZGdlVHlwZVwiLCAvL3RoZSBuYW1lIG9mIHRoZSBmaWVsZCB0aGF0IGhhcyB0aGUgZWRnZSB0eXBlLCByZXRyaWV2ZWQgZnJvbSBlZGdlLmRhdGEoKSwgY2FuIGJlIGEgZnVuY3Rpb25cclxuICAgICAgICBncm91cEVkZ2VzT2ZTYW1lVHlwZU9uQ29sbGFwc2U6IGZhbHNlLFxyXG4gICAgICAgIGFsbG93TmVzdGVkRWRnZUNvbGxhcHNlOiB0cnVlLFxyXG4gICAgICAgIHpJbmRleDogOTk5IC8vIHotaW5kZXggdmFsdWUgb2YgdGhlIGNhbnZhcyBpbiB3aGljaCBjdWUgxLFtYWdlcyBhcmUgZHJhd25cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIElmIG9wdHMgaXMgbm90ICdnZXQnIHRoYXQgaXMgaXQgaXMgYSByZWFsIG9wdGlvbnMgb2JqZWN0IHRoZW4gaW5pdGlsaXplIHRoZSBleHRlbnNpb25cclxuICAgICAgaWYgKG9wdHMgIT09ICdnZXQnKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMnKShjeSk7XHJcbiAgICAgICAgdmFyIGFwaSA9IGNyZWF0ZUV4dGVuc2lvbkFQSShjeSwgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMpOyAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHRoZSBBUEkgaW5zdGFuY2UgZm9yIHRoZSBleHRlbnNpb25cclxuICAgICAgICBzYXZlTG9hZFV0aWxzID0gcmVxdWlyZShcIi4vc2F2ZUxvYWRVdGlsaXRpZXNcIikoY3ksIGFwaSk7XHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ2FwaScsIGFwaSk7XHJcblxyXG4gICAgICAgIHVuZG9SZWRvVXRpbGl0aWVzKGN5LCBhcGkpO1xyXG5cclxuICAgICAgICBjdWVVdGlsaXRpZXMob3B0aW9ucywgY3ksIGFwaSk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZSBjdWUgaXMgbm90IGVuYWJsZWQgdW5iaW5kIGN1ZSBldmVudHNcclxuICAgICAgICBpZiAoIW9wdGlvbnMuY3VlRW5hYmxlZCkge1xyXG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCd1bmJpbmQnLCBjeSwgYXBpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLnJlYWR5KSB7XHJcbiAgICAgICAgICBvcHRpb25zLnJlYWR5KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgcGFyZW50RGF0YSA9IHt9O1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdwYXJlbnREYXRhJywgcGFyZW50RGF0YSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBnZXRTY3JhdGNoKGN5LCAnYXBpJyk7IC8vIEV4cG9zZSB0aGUgQVBJIHRvIHRoZSB1c2Vyc1xyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZXhwYW5kLWNvbGxhcHNlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgcmVnaXN0ZXIoY3l0b3NjYXBlKTtcclxuICB9XHJcblxyXG59KSgpO1xyXG4iLCJmdW5jdGlvbiBzYXZlTG9hZFV0aWxpdGllcyhjeSwgYXBpKSB7XHJcbiAgLyoqIGNvbnZlcnRzIGFycmF5IG9mIEpTT04gdG8gYSBjeXRvc2NhcGUuanMgY29sbGVjdGlvbiAoYm90dG9tLXVwIHJlY3Vyc2l2ZSlcclxuICAgKiBrZWVwcyBpbmZvcm1hdGlvbiBhYm91dCBwYXJlbnRzLCBhbGwgbm9kZXMgYWRkZWQgdG8gY3l0b3NjYXBlLCBhbmQgbm9kZXMgdG8gYmUgY29sbGFwc2VkXHJcbiAgKiBAcGFyYW0gIHt9IGpzb25BcnIgYW4gYXJyYXkgb2Ygb2JqZWN0cyAoYSBKU09OIGFycmF5KVxyXG4gICogQHBhcmFtICB7fSBhbGxOb2RlcyBhIGN5dG9zY2FwZS5qcyBjb2xsZWN0aW9uXHJcbiAgKiBAcGFyYW0gIHt9IG5vZGVzMmNvbGxhcHNlIGEgY3l0b3NjYXBlLmpzIGNvbGxlY3Rpb25cclxuICAqIEBwYXJhbSAge30gbm9kZTJwYXJlbnQgYSBKUyBvYmplY3QgKHNpbXBseSBrZXktdmFsdWUgcGFpcnMpXHJcbiAgKi9cclxuICBmdW5jdGlvbiBqc29uMmN5Q29sbGVjdGlvbihqc29uQXJyLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50LCBpc092ZXJyaWRlRXhpc3RpbmcpIHtcclxuICAgIC8vIHByb2Nlc3MgZWRnZXMgbGFzdCBzaW5jZSB0aGV5IGRlcGVuZCBvbiBub2Rlc1xyXG4gICAganNvbkFyci5zb3J0KChhKSA9PiB7XHJcbiAgICAgIGlmIChhLmdyb3VwID09PSAnZWRnZXMnKSB7XHJcbiAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIGNvbXBvdW5kIG5vZGVzIGZpcnN0LCB0aGVuIGFkZCBvdGhlciBub2RlcyB0aGVuIGVkZ2VzXHJcbiAgICBsZXQgY29sbCA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwganNvbkFyci5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBqc29uID0ganNvbkFycltpXTtcclxuICAgICAgY29uc3QgZCA9IGpzb24uZGF0YTtcclxuICAgICAgaWYgKGQucGFyZW50KSB7XHJcbiAgICAgICAgbm9kZTJwYXJlbnRbZC5pZF0gPSBkLnBhcmVudDtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwb3MgPSB7IHg6IGpzb24ucG9zaXRpb24ueCwgeToganNvbi5wb3NpdGlvbi55IH07XHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gY3kuJGlkKGQuaWQpO1xyXG4gICAgICBsZXQgZSA9IG51bGw7XHJcbiAgICAgIGlmIChleGlzdGluZy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgaWYgKGlzT3ZlcnJpZGVFeGlzdGluZykge1xyXG4gICAgICAgICAgZXhpc3RpbmcuanNvbihqc29uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZSA9IGV4aXN0aW5nO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGUgPSBjeS5hZGQoanNvbik7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGUuaXNOb2RlKCkpIHtcclxuICAgICAgICBhbGxOb2Rlcy5tZXJnZShlKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGQub3JpZ2luYWxFbmRzKSB7XHJcbiAgICAgICAgLy8gYWxsIG5vZGVzIHNob3VsZCBiZSBpbiB0aGUgbWVtb3J5IChpbiBjeSBvciBub3QpXHJcbiAgICAgICAgbGV0IHNyYyA9IGFsbE5vZGVzLiRpZChkLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5pZCk7XHJcbiAgICAgICAgaWYgKGQub3JpZ2luYWxFbmRzLnNvdXJjZS5kYXRhLnBhcmVudCkge1xyXG4gICAgICAgICAgbm9kZTJwYXJlbnRbZC5vcmlnaW5hbEVuZHMuc291cmNlLmRhdGEuaWRdID0gZC5vcmlnaW5hbEVuZHMuc291cmNlLmRhdGEucGFyZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdGd0ID0gYWxsTm9kZXMuJGlkKGQub3JpZ2luYWxFbmRzLnRhcmdldC5kYXRhLmlkKTtcclxuICAgICAgICBpZiAoZC5vcmlnaW5hbEVuZHMudGFyZ2V0LmRhdGEucGFyZW50KSB7XHJcbiAgICAgICAgICBub2RlMnBhcmVudFtkLm9yaWdpbmFsRW5kcy50YXJnZXQuZGF0YS5pZF0gPSBkLm9yaWdpbmFsRW5kcy50YXJnZXQuZGF0YS5wYXJlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGUuZGF0YSgnb3JpZ2luYWxFbmRzJywgeyBzb3VyY2U6IHNyYywgdGFyZ2V0OiB0Z3QgfSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGQuY29sbGFwc2VkQ2hpbGRyZW4pIHtcclxuICAgICAgICBub2RlczJjb2xsYXBzZS5tZXJnZShlKTtcclxuICAgICAgICBqc29uMmN5Q29sbGVjdGlvbihkLmNvbGxhcHNlZENoaWxkcmVuLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50LCBpc092ZXJyaWRlRXhpc3RpbmcpO1xyXG4gICAgICAgIGNsZWFyQ29sbGFwc2VNZXRhRGF0YShlKTtcclxuICAgICAgfSBlbHNlIGlmIChkLmNvbGxhcHNlZEVkZ2VzKSB7XHJcbiAgICAgICAgZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycsIGpzb24yY3lDb2xsZWN0aW9uKGQuY29sbGFwc2VkRWRnZXMsIGFsbE5vZGVzLCBub2RlczJjb2xsYXBzZSwgbm9kZTJwYXJlbnQsIGlzT3ZlcnJpZGVFeGlzdGluZykpO1xyXG4gICAgICAgIC8vIGRlbGV0ZSBjb2xsYXBzZWQgZWRnZXMgZnJvbSBjeVxyXG4gICAgICAgIGN5LnJlbW92ZShlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJykpO1xyXG4gICAgICB9XHJcbiAgICAgIGUucG9zaXRpb24ocG9zKTsgLy8gYWRkaW5nIG5ldyBlbGVtZW50cyB0byBhIGNvbXBvdW5kIG1pZ2h0IGNoYW5nZSBpdHMgcG9zaXRpb25cclxuICAgICAgY29sbC5tZXJnZShlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb2xsO1xyXG4gIH1cclxuXHJcbiAgLyoqIGNsZWFycyBhbGwgdGhlIGRhdGEgcmVsYXRlZCB0byBjb2xsYXBzZWQgbm9kZVxyXG4gICAqIEBwYXJhbSAge30gZSBhIGN5dG9zY2FwZSBlbGVtZW50XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gY2xlYXJDb2xsYXBzZU1ldGFEYXRhKGUpIHtcclxuICAgIGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nLCBudWxsKTtcclxuICAgIGUucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG4gICAgZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnLCBudWxsKTtcclxuICAgIGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnLCBudWxsKTtcclxuICAgIGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCcsIG51bGwpO1xyXG4gICAgZS5kYXRhKCdleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZJywgbnVsbCk7XHJcbiAgICBlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplJywgbnVsbCk7XHJcbiAgfVxyXG5cclxuICAvKiogY29udmVydHMgY3l0b3NjYXBlIGNvbGxlY3Rpb24gdG8gSlNPTiBhcnJheS4oYm90dG9tLXVwIHJlY3Vyc2l2ZSlcclxuICAgKiBAcGFyYW0gIHt9IGVsZW1zXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gY3lDb2xsZWN0aW9uMkpzb24oZWxlbXMpIHtcclxuICAgIGxldCByID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGVsZW0gPSBlbGVtc1tpXTtcclxuICAgICAgbGV0IGpzb25PYmogPSBudWxsO1xyXG4gICAgICBpZiAoIWVsZW0uY29sbGFwc2VkQ2hpbGRyZW4gJiYgIWVsZW0uY29sbGFwc2VkRWRnZXMpIHtcclxuICAgICAgICBqc29uT2JqID0gZWxlbS5jeS5qc29uKCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoZWxlbS5jb2xsYXBzZWRDaGlsZHJlbikge1xyXG4gICAgICAgIGVsZW0uY29sbGFwc2VkQ2hpbGRyZW4gPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKGVsZW0uY29sbGFwc2VkQ2hpbGRyZW4pKTtcclxuICAgICAgICBqc29uT2JqID0gZWxlbS5jeS5qc29uKCk7XHJcbiAgICAgICAganNvbk9iai5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gZWxlbS5jb2xsYXBzZWRDaGlsZHJlbjtcclxuICAgICAgfSBlbHNlIGlmIChlbGVtLmNvbGxhcHNlZEVkZ2VzKSB7XHJcbiAgICAgICAgZWxlbS5jb2xsYXBzZWRFZGdlcyA9IGN5Q29sbGVjdGlvbjJKc29uKGhhbGZEZWVwQ29weUNvbGxlY3Rpb24oZWxlbS5jb2xsYXBzZWRFZGdlcykpO1xyXG4gICAgICAgIGpzb25PYmogPSBlbGVtLmN5Lmpzb24oKTtcclxuICAgICAgICBqc29uT2JqLmRhdGEuY29sbGFwc2VkRWRnZXMgPSBlbGVtLmNvbGxhcHNlZEVkZ2VzO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChlbGVtLm9yaWdpbmFsRW5kcykge1xyXG4gICAgICAgIGNvbnN0IHNyYyA9IGVsZW0ub3JpZ2luYWxFbmRzLnNvdXJjZS5qc29uKCk7XHJcbiAgICAgICAgY29uc3QgdGd0ID0gZWxlbS5vcmlnaW5hbEVuZHMudGFyZ2V0Lmpzb24oKTtcclxuICAgICAgICBpZiAoc3JjLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pIHtcclxuICAgICAgICAgIHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGd0LmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pIHtcclxuICAgICAgICAgIHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbih0Z3QuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBqc29uT2JqLmRhdGEub3JpZ2luYWxFbmRzID0geyBzb3VyY2U6IHNyYywgdGFyZ2V0OiB0Z3QgfTtcclxuICAgICAgfVxyXG4gICAgICByLnB1c2goanNvbk9iaik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcblxyXG4gIC8qKiByZXR1cm5zIHsgY3k6IGFueSwgY29sbGFwc2VkRWRnZXM6IGFueSwgY29sbGFwc2VkQ2hpbGRyZW46IGFueSwgb3JpZ2luYWxFbmRzOiBhbnkgfVtdXHJcbiAgICogZnJvbSBjeXRvc2NhcGUgY29sbGVjdGlvblxyXG4gICAqIEBwYXJhbSAge30gY29sXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihjb2wpIHtcclxuICAgIGxldCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29sLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGFyci5wdXNoKHsgY3k6IGNvbFtpXSwgY29sbGFwc2VkRWRnZXM6IGNvbFtpXS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpLCBjb2xsYXBzZWRDaGlsZHJlbjogY29sW2ldLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyksIG9yaWdpbmFsRW5kczogY29sW2ldLmRhdGEoJ29yaWdpbmFsRW5kcycpIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFycjtcclxuICB9XHJcblxyXG4gIC8qKiBzYXZlcyB0aGUgc3RyaW5nIGFzIGEgZmlsZS5cclxuICAgKiBAcGFyYW0gIHt9IHN0ciBzdHJpbmdcclxuICAgKiBAcGFyYW0gIHt9IGZpbGVOYW1lIHN0cmluZ1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIHN0cjJmaWxlKHN0ciwgZmlsZU5hbWUpIHtcclxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbc3RyXSwgeyB0eXBlOiAndGV4dC9wbGFpbicgfSk7XHJcbiAgICBjb25zdCBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcblxyXG4gICAgYW5jaG9yLmRvd25sb2FkID0gZmlsZU5hbWU7XHJcbiAgICBhbmNob3IuaHJlZiA9ICh3aW5kb3cuVVJMKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcbiAgICBhbmNob3IuZGF0YXNldC5kb3dubG9hZHVybCA9XHJcbiAgICAgIFsndGV4dC9wbGFpbicsIGFuY2hvci5kb3dubG9hZCwgYW5jaG9yLmhyZWZdLmpvaW4oJzonKTtcclxuICAgIGFuY2hvci5jbGljaygpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuXHJcbiAgICAvKiogTG9hZCBlbGVtZW50cyBmcm9tIEpTT04gZm9ybWF0dGVkIHN0cmluZyByZXByZXNlbnRhdGlvbi5cclxuICAgICAqIEZvciBjb2xsYXBzZWQgY29tcG91bmRzLCBmaXJzdCBhZGQgYWxsIGNvbGxhcHNlZCBub2RlcyBhcyBub3JtYWwgbm9kZXMgdGhlbiBjb2xsYXBzZSB0aGVtLiBUaGVuIHJlcG9zaXRpb24gdGhlbS5cclxuICAgICAqIEZvciBjb2xsYXBzZWQgZWRnZXMsIGZpcnN0IGFkZCBhbGwgb2YgdGhlIGVkZ2VzIHRoZW4gcmVtb3ZlIGNvbGxhcHNlZCBlZGdlcyBmcm9tIGN5dG9zY2FwZS5cclxuICAgICAqIEZvciBvcmlnaW5hbCBlbmRzLCByZXN0b3JlIHRoZWlyIHJlZmVyZW5jZSB0byBjeXRvc2NhcGUgZWxlbWVudHNcclxuICAgICAqIEBwYXJhbSAge30gdHh0IHN0cmluZ1xyXG4gICAgICovXHJcbiAgICBsb2FkSnNvbjogZnVuY3Rpb24gKHR4dCwgaXNPdmVycmlkZUV4aXN0aW5nKSB7XHJcbiAgICAgIGNvbnN0IGZpbGVKU09OID0gSlNPTi5wYXJzZSh0eHQpO1xyXG4gICAgICAvLyBvcmlnaW5hbCBlbmRwb2ludHMgd29uJ3QgZXhpc3QgaW4gY3kuIFNvIGtlZXAgYSByZWZlcmVuY2UuXHJcbiAgICAgIGNvbnN0IG5vZGVQb3NpdGlvbnMgPSB7fTtcclxuICAgICAgY29uc3QgYWxsTm9kZXMgPSBjeS5jb2xsZWN0aW9uKCk7IC8vIHNvbWUgZWxlbWVudHMgYXJlIHN0b3JlZCBpbiBjeSwgc29tZSBhcmUgZGVsZXRlZCBcclxuICAgICAgY29uc3Qgbm9kZXMyY29sbGFwc2UgPSBjeS5jb2xsZWN0aW9uKCk7IC8vIHNvbWUgYXJlIGRlbGV0ZWQgXHJcbiAgICAgIGNvbnN0IG5vZGUycGFyZW50ID0ge307XHJcbiAgICAgIGZvciAoY29uc3QgbiBvZiBmaWxlSlNPTi5ub2Rlcykge1xyXG4gICAgICAgIG5vZGVQb3NpdGlvbnNbbi5kYXRhLmlkXSA9IHsgeDogbi5wb3NpdGlvbi54LCB5OiBuLnBvc2l0aW9uLnkgfTtcclxuICAgICAgICBpZiAobi5kYXRhLnBhcmVudCkge1xyXG4gICAgICAgICAgbm9kZTJwYXJlbnRbbi5kYXRhLmlkXSA9IG4uZGF0YS5wYXJlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gY3kuJGlkKG4uZGF0YS5pZCk7XHJcbiAgICAgICAgbGV0IG5vZGUgPSBudWxsO1xyXG4gICAgICAgIGlmIChleGlzdGluZy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBpZiAoaXNPdmVycmlkZUV4aXN0aW5nKSB7XHJcbiAgICAgICAgICAgIGV4aXN0aW5nLmpzb24obik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBub2RlID0gZXhpc3Rpbmc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIG5vZGUgPSBjeS5hZGQobik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhbGxOb2Rlcy5tZXJnZShub2RlKTtcclxuICAgICAgICBpZiAobm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpKSB7XHJcbiAgICAgICAgICBqc29uMmN5Q29sbGVjdGlvbihub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyksIGFsbE5vZGVzLCBub2RlczJjb2xsYXBzZSwgbm9kZTJwYXJlbnQsIGlzT3ZlcnJpZGVFeGlzdGluZyk7XHJcbiAgICAgICAgICBub2RlczJjb2xsYXBzZS5tZXJnZShub2RlKTtcclxuICAgICAgICAgIGNsZWFyQ29sbGFwc2VNZXRhRGF0YShub2RlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZm9yIChjb25zdCBlIG9mIGZpbGVKU09OLmVkZ2VzKSB7XHJcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBjeS4kaWQoZS5kYXRhLmlkKTtcclxuICAgICAgICBsZXQgZWRnZSA9IG51bGw7XHJcbiAgICAgICAgaWYgKGV4aXN0aW5nLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGlmIChpc092ZXJyaWRlRXhpc3RpbmcpIHtcclxuICAgICAgICAgICAgZXhpc3RpbmcuanNvbihlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVkZ2UgPSBleGlzdGluZztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZWRnZSA9IGN5LmFkZChlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGVkZ2UuZGF0YSgnY29sbGFwc2VkRWRnZXMnKSkge1xyXG4gICAgICAgICAgZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycsIGpzb24yY3lDb2xsZWN0aW9uKGUuZGF0YS5jb2xsYXBzZWRFZGdlcywgYWxsTm9kZXMsIG5vZGVzMmNvbGxhcHNlLCBub2RlMnBhcmVudCwgaXNPdmVycmlkZUV4aXN0aW5nKSk7XHJcbiAgICAgICAgICBjeS5yZW1vdmUoZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpKTsgLy8gZGVsZXRlIGNvbGxhcHNlZCBlZGdlcyBmcm9tIGN5XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlZGdlLmRhdGEoJ29yaWdpbmFsRW5kcycpKSB7XHJcbiAgICAgICAgICBjb25zdCBzcmNJZCA9IGUuZGF0YS5vcmlnaW5hbEVuZHMuc291cmNlLmRhdGEuaWQ7XHJcbiAgICAgICAgICBjb25zdCB0Z3RJZCA9IGUuZGF0YS5vcmlnaW5hbEVuZHMudGFyZ2V0LmRhdGEuaWQ7XHJcbiAgICAgICAgICBlLmRhdGEub3JpZ2luYWxFbmRzID0geyBzb3VyY2U6IGFsbE5vZGVzLmZpbHRlcignIycgKyBzcmNJZCksIHRhcmdldDogYWxsTm9kZXMuZmlsdGVyKCcjJyArIHRndElkKSB9O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICAvLyBzZXQgcGFyZW50c1xyXG4gICAgICBmb3IgKGxldCBub2RlIGluIG5vZGUycGFyZW50KSB7XHJcbiAgICAgICAgY29uc3QgZWxlbSA9IGFsbE5vZGVzLiRpZChub2RlKTtcclxuICAgICAgICBpZiAoZWxlbS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgIGVsZW0ubW92ZSh7IHBhcmVudDogbm9kZTJwYXJlbnRbbm9kZV0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIC8vIGNvbGxhcHNlIHRoZSBjb2xsYXBzZWQgbm9kZXNcclxuICAgICAgYXBpLmNvbGxhcHNlKG5vZGVzMmNvbGxhcHNlLCB7IGxheW91dEJ5OiBudWxsLCBmaXNoZXllOiBmYWxzZSwgYW5pbWF0ZTogZmFsc2UgfSk7XHJcblxyXG4gICAgICAvLyBwb3NpdGlvbnMgbWlnaHQgYmUgY2hhbmdlZCBpbiBjb2xsYXBzZSBleHRlbnNpb25cclxuICAgICAgZm9yIChjb25zdCBuIG9mIGZpbGVKU09OLm5vZGVzKSB7XHJcbiAgICAgICAgY29uc3Qgbm9kZSA9IGN5LiRpZChuLmRhdGEuaWQpXHJcbiAgICAgICAgaWYgKG5vZGUuaXNDaGlsZGxlc3MoKSkge1xyXG4gICAgICAgICAgY3kuJGlkKG4uZGF0YS5pZCkucG9zaXRpb24obm9kZVBvc2l0aW9uc1tuLmRhdGEuaWRdKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgY3kuZml0KCk7XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgICAvKiogc2F2ZXMgY3l0b3NjYXBlIGVsZW1lbnRzIChjb2xsZWN0aW9uKSBhcyBKU09OXHJcbiAgICAgKiBjYWxscyBlbGVtZW50cycganNvbiBtZXRob2QgKGh0dHBzOi8vanMuY3l0b3NjYXBlLm9yZy8jZWxlLmpzb24pIHdoZW4gd2Uga2VlcCBhIGN5dG9zY2FwZSBlbGVtZW50IGluIHRoZSBkYXRhLiBcclxuICAgICAqIEBwYXJhbSAge30gZWxlbXMgY3l0b3NjYXBlIGNvbGxlY3Rpb25cclxuICAgICAqIEBwYXJhbSAge30gZmlsZW5hbWUgc3RyaW5nXHJcbiAgICAgKi9cclxuICAgIHNhdmVKc29uOiBmdW5jdGlvbiAoZWxlbXMsIGZpbGVuYW1lKSB7XHJcbiAgICAgIGlmICghZWxlbXMpIHtcclxuICAgICAgICBlbGVtcyA9IGN5LiQoKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBub2RlcyA9IGhhbGZEZWVwQ29weUNvbGxlY3Rpb24oZWxlbXMubm9kZXMoKSk7XHJcbiAgICAgIGNvbnN0IGVkZ2VzID0gaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihlbGVtcy5lZGdlcygpKTtcclxuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCArIG5vZGVzLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGFjY29yZGluZyB0byBjeXRvc2NhcGUuanMgZm9ybWF0XHJcbiAgICAgIGNvbnN0IG8gPSB7IG5vZGVzOiBbXSwgZWRnZXM6IFtdIH07XHJcbiAgICAgIGZvciAoY29uc3QgZSBvZiBlZGdlcykge1xyXG4gICAgICAgIGlmIChlLmNvbGxhcHNlZEVkZ2VzKSB7XHJcbiAgICAgICAgICBlLmNvbGxhcHNlZEVkZ2VzID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihlLmNvbGxhcHNlZEVkZ2VzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlLm9yaWdpbmFsRW5kcykge1xyXG4gICAgICAgICAgY29uc3Qgc3JjID0gZS5vcmlnaW5hbEVuZHMuc291cmNlLmpzb24oKTtcclxuICAgICAgICAgIGNvbnN0IHRndCA9IGUub3JpZ2luYWxFbmRzLnRhcmdldC5qc29uKCk7XHJcbiAgICAgICAgICBpZiAoc3JjLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgLy8gZS5vcmlnaW5hbEVuZHMuc291cmNlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gd2lsbCBiZSBjaGFuZ2VkXHJcbiAgICAgICAgICAgIHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgIHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbih0Z3QuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZS5vcmlnaW5hbEVuZHMgPSB7IHNvdXJjZTogc3JjLCB0YXJnZXQ6IHRndCB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBqc29uT2JqID0gZS5jeS5qc29uKCk7XHJcbiAgICAgICAganNvbk9iai5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gZS5jb2xsYXBzZWRFZGdlcztcclxuICAgICAgICBqc29uT2JqLmRhdGEub3JpZ2luYWxFbmRzID0gZS5vcmlnaW5hbEVuZHM7XHJcbiAgICAgICAgby5lZGdlcy5wdXNoKGpzb25PYmopO1xyXG4gICAgICB9XHJcbiAgICAgIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xyXG4gICAgICAgIGlmIChuLmNvbGxhcHNlZENoaWxkcmVuKSB7XHJcbiAgICAgICAgICBuLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihuLmNvbGxhcHNlZENoaWxkcmVuKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGpzb25PYmogPSBuLmN5Lmpzb24oKTtcclxuICAgICAgICBqc29uT2JqLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBuLmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgICAgIG8ubm9kZXMucHVzaChqc29uT2JqKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFmaWxlbmFtZSkge1xyXG4gICAgICAgIGZpbGVuYW1lID0gJ2V4cGFuZC1jb2xsYXBzZS1vdXRwdXQuanNvbic7XHJcbiAgICAgIH1cclxuICAgICAgc3RyMmZpbGUoSlNPTi5zdHJpbmdpZnkobyksIGZpbGVuYW1lKTtcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNhdmVMb2FkVXRpbGl0aWVzO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgYXBpKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHt9LCB0cnVlKTtcclxuXHJcbiAgZnVuY3Rpb24gZ2V0RWxlcyhfZWxlcykge1xyXG4gICAgcmV0dXJuICh0eXBlb2YgX2VsZXMgPT09IFwic3RyaW5nXCIpID8gY3kuJChfZWxlcykgOiBfZWxlcztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldE5vZGVQb3NpdGlvbnMoKSB7XHJcbiAgICB2YXIgcG9zaXRpb25zID0ge307XHJcbiAgICB2YXIgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVsZSA9IG5vZGVzW2ldO1xyXG4gICAgICBwb3NpdGlvbnNbZWxlLmlkKCldID0ge1xyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwb3NpdGlvbnM7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXR1cm5Ub1Bvc2l0aW9ucyhwb3NpdGlvbnMpIHtcclxuICAgIHZhciBjdXJyZW50UG9zaXRpb25zID0ge307XHJcbiAgICBjeS5ub2RlcygpLm5vdChcIjpwYXJlbnRcIikucG9zaXRpb25zKGZ1bmN0aW9uIChlbGUsIGkpIHtcclxuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIGVsZSA9IGk7XHJcbiAgICAgIH1cclxuICAgICAgY3VycmVudFBvc2l0aW9uc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgeDogZWxlLnBvc2l0aW9uKFwieFwiKSxcclxuICAgICAgICB5OiBlbGUucG9zaXRpb24oXCJ5XCIpXHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBwb3MgPSBwb3NpdGlvbnNbZWxlLmlkKCldO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBvcy54LFxyXG4gICAgICAgIHk6IHBvcy55XHJcbiAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gY3VycmVudFBvc2l0aW9ucztcclxuICB9XHJcblxyXG4gIHZhciBzZWNvbmRUaW1lT3B0cyA9IHtcclxuICAgIGxheW91dEJ5OiBudWxsLFxyXG4gICAgYW5pbWF0ZTogZmFsc2UsXHJcbiAgICBmaXNoZXllOiBmYWxzZVxyXG4gIH07XHJcblxyXG4gIGZ1bmN0aW9uIGRvSXQoZnVuYykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgICAgdmFyIG5vZGVzID0gZ2V0RWxlcyhhcmdzLm5vZGVzKTtcclxuICAgICAgaWYgKGFyZ3MuZmlyc3RUaW1lKSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGFwaVtmdW5jXShhcmdzLm9wdGlvbnMpIDogYXBpW2Z1bmNdKG5vZGVzLCBhcmdzLm9wdGlvbnMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9ucygpO1xyXG4gICAgICAgIHJlc3VsdC5ub2RlcyA9IGZ1bmMuaW5kZXhPZihcIkFsbFwiKSA+IDAgPyBhcGlbZnVuY10oc2Vjb25kVGltZU9wdHMpIDogYXBpW2Z1bmNdKGN5LmNvbGxlY3Rpb24obm9kZXMpLCBzZWNvbmRUaW1lT3B0cyk7XHJcbiAgICAgICAgcmV0dXJuVG9Qb3NpdGlvbnMoYXJncy5vbGREYXRhKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB2YXIgYWN0aW9ucyA9IFtcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VSZWN1cnNpdmVseVwiLCBcImNvbGxhcHNlQWxsXCIsIFwiZXhwYW5kXCIsIFwiZXhwYW5kUmVjdXJzaXZlbHlcIiwgXCJleHBhbmRBbGxcIl07XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYoaSA9PSAyKVxyXG4gICAgICB1ci5hY3Rpb24oXCJjb2xsYXBzZUFsbFwiLCBkb0l0KFwiY29sbGFwc2VBbGxcIiksIGRvSXQoXCJleHBhbmRSZWN1cnNpdmVseVwiKSk7XHJcbiAgICBlbHNlIGlmKGkgPT0gNSlcclxuICAgICAgdXIuYWN0aW9uKFwiZXhwYW5kQWxsXCIsIGRvSXQoXCJleHBhbmRBbGxcIiksIGRvSXQoXCJjb2xsYXBzZVJlY3Vyc2l2ZWx5XCIpKTtcclxuICAgIGVsc2VcclxuICAgICAgdXIuYWN0aW9uKGFjdGlvbnNbaV0sIGRvSXQoYWN0aW9uc1tpXSksIGRvSXQoYWN0aW9uc1soaSArIDMpICUgNl0pKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNvbGxhcHNlRWRnZXMoYXJncyl7ICAgIFxyXG4gICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XHJcbiAgICB2YXIgZWRnZXMgPSBhcmdzLmVkZ2VzO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgXHJcbiAgICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgICBpZihhcmdzLmZpcnN0VGltZSl7XHJcbiAgICAgIHZhciBjb2xsYXBzZVJlc3VsdCA9IGFwaS5jb2xsYXBzZUVkZ2VzKGVkZ2VzLG9wdGlvbnMpOyAgICBcclxuICAgICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VSZXN1bHQuZWRnZXM7XHJcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlUmVzdWx0Lm9sZEVkZ2VzOyAgXHJcbiAgICAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcclxuICAgIH1lbHNle1xyXG4gICAgICByZXN1bHQub2xkRWRnZXMgPSBlZGdlcztcclxuICAgICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcclxuICAgICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XHJcbiAgICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xyXG4gICAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcclxuICAgICAgfVxyXG4gICAgIFxyXG4gICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG4gIGZ1bmN0aW9uIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoYXJncyl7XHJcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcclxuICAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcclxuICAgICB2YXIgY29sbGFwc2VBbGxSZXN1bHQgPSBhcGkuY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyhhcmdzLm5vZGVzLCBvcHRpb25zKTtcclxuICAgICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5lZGdlcztcclxuICAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5vbGRFZGdlcztcclxuICAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XHJcbiAgICB9ZWxzZXtcclxuICAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xyXG4gICAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XHJcbiAgICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XHJcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcclxuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xyXG4gICAgICB9XHJcbiAgICBcclxuICAgIH1cclxuIFxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuXHJcbiB9XHJcbiBmdW5jdGlvbiBjb2xsYXBzZUFsbEVkZ2VzKGFyZ3Mpe1xyXG4gICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcclxuICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcclxuICAgIHZhciBjb2xsYXBzZUFsbFJlc3VsdCA9IGFwaS5jb2xsYXBzZUFsbEVkZ2VzKG9wdGlvbnMpO1xyXG4gICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQuZWRnZXM7XHJcbiAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5vbGRFZGdlcztcclxuICAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcclxuICAgfWVsc2V7XHJcbiAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xyXG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcclxuICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcclxuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xyXG4gICAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XHJcbiAgICAgIH1cclxuICAgXHJcbiAgIH1cclxuXHJcbiAgIHJldHVybiByZXN1bHQ7XHJcbiB9XHJcbiBmdW5jdGlvbiBleHBhbmRFZGdlcyhhcmdzKXsgICBcclxuICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XHJcbiAgIHZhciByZXN1bHQgPXt9O1xyXG4gIFxyXG4gICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcclxuICAgICB2YXIgZXhwYW5kUmVzdWx0ID0gYXBpLmV4cGFuZEVkZ2VzKGFyZ3MuZWRnZXMpO1xyXG4gICAgcmVzdWx0LmVkZ2VzID0gZXhwYW5kUmVzdWx0LmVkZ2VzO1xyXG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gZXhwYW5kUmVzdWx0Lm9sZEVkZ2VzO1xyXG4gICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xyXG4gICAgXHJcbiAgIH1lbHNle1xyXG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcclxuICAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XHJcbiAgICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcclxuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xyXG4gICAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XHJcbiAgICAgIH1cclxuICBcclxuICAgfVxyXG5cclxuICAgcmV0dXJuIHJlc3VsdDtcclxuIH1cclxuIGZ1bmN0aW9uIGV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mpe1xyXG4gIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xyXG4gIHZhciByZXN1bHQgPSB7fTtcclxuICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgaWYoYXJncy5maXJzdFRpbWUpe1xyXG4gICB2YXIgY29sbGFwc2VBbGxSZXN1bHQgPSBhcGkuZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMoYXJncy5ub2RlcyxvcHRpb25zKTtcclxuICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQuZWRnZXM7XHJcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0Lm9sZEVkZ2VzO1xyXG4gICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XHJcbiAgfWVsc2V7XHJcbiAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XHJcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XHJcbiAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xyXG4gICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xyXG4gICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xyXG4gICAgfVxyXG4gIFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxuIH1cclxuIGZ1bmN0aW9uIGV4cGFuZEFsbEVkZ2VzKGFyZ3Mpe1xyXG4gIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xyXG4gIHZhciByZXN1bHQgPSB7fTtcclxuICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgaWYoYXJncy5maXJzdFRpbWUpe1xyXG4gICB2YXIgZXhwYW5kUmVzdWx0ID0gYXBpLmV4cGFuZEFsbEVkZ2VzKG9wdGlvbnMpO1xyXG4gICByZXN1bHQuZWRnZXMgPSBleHBhbmRSZXN1bHQuZWRnZXM7XHJcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGV4cGFuZFJlc3VsdC5vbGRFZGdlcztcclxuICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xyXG4gIH1lbHNle1xyXG4gICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xyXG4gICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xyXG4gICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcclxuICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcclxuICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcclxuICAgIH1cclxuICAgXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG4gfVxyXG4gXHJcbiBcclxuICB1ci5hY3Rpb24oXCJjb2xsYXBzZUVkZ2VzXCIsIGNvbGxhcHNlRWRnZXMsIGV4cGFuZEVkZ2VzKTtcclxuICB1ci5hY3Rpb24oXCJleHBhbmRFZGdlc1wiLCBleHBhbmRFZGdlcywgY29sbGFwc2VFZGdlcyk7XHJcblxyXG4gIHVyLmFjdGlvbihcImNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXNcIiwgY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcywgZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMpO1xyXG4gIHVyLmFjdGlvbihcImV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzXCIsIGV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzLCBjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzKTtcclxuXHJcbiAgdXIuYWN0aW9uKFwiY29sbGFwc2VBbGxFZGdlc1wiLCBjb2xsYXBzZUFsbEVkZ2VzLCBleHBhbmRBbGxFZGdlcyk7XHJcbiAgdXIuYWN0aW9uKFwiZXhwYW5kQWxsRWRnZXNcIiwgZXhwYW5kQWxsRWRnZXMsIGNvbGxhcHNlQWxsRWRnZXMpO1xyXG5cclxuIFxyXG5cclxuXHJcbiAgXHJcblxyXG5cclxufTtcclxuIl19
