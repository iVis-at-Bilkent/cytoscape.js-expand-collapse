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
    if (siblings.length == 0 && node.same(nodeToExpand)) {
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
        node.position(newPosition); // at this point, position should be updated
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
        edgesTypeField = options.edgeTypeInfo instanceof Function ? edgesTypeField : options.edgeTypeInfo;
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

      api.loadJson = function (jsonStr) {
        saveLoadUtils.loadJson(jsonStr);
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
  function json2cyCollection(jsonArr, allNodes, nodes2collapse, node2parent) {
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
      const e = cy.add(json);
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
        json2cyCollection(d.collapsedChildren, allNodes, nodes2collapse, node2parent);
        clearCollapseMetaData(e);
      } else if (d.collapsedEdges) {
        e.data('collapsedEdges', json2cyCollection(d.collapsedEdges, allNodes, nodes2collapse, node2parent));
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

  function overrideJson2Elem(elem, json) {
    const collapsedChildren = elem.data('collapsedChildren');
    const collapsedEdges = elem.data('collapsedEdges');
    const originalEnds = elem.data('originalEnds');
    elem.json(json);
    if (collapsedChildren) {
      elem.data('collapsedChildren', collapsedChildren);
    }
    if (collapsedEdges) {
      elem.data('collapsedEdges', collapsedEdges);
    }
    if (originalEnds) {
      elem.data('originalEnds', originalEnds);
    }
  }

  return {

    /** Load elements from JSON formatted string representation.
     * For collapsed compounds, first add all collapsed nodes as normal nodes then collapse them. Then reposition them.
     * For collapsed edges, first add all of the edges then remove collapsed edges from cytoscape.
     * For original ends, restore their reference to cytoscape elements
     * @param  {} txt string
     */
    loadJson: function (txt) {
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
        const node = cy.add(n);
        allNodes.merge(node);
        if (node.data('collapsedChildren')) {
          json2cyCollection(node.data('collapsedChildren'), allNodes, nodes2collapse, node2parent);
          nodes2collapse.merge(node);
          clearCollapseMetaData(node);
        }
      }
      for (const e of fileJSON.edges) {
        const edge = cy.add(e);
        if (edge.data('collapsedEdges')) {
          edge.data('collapsedEdges', json2cyCollection(e.data.collapsedEdges, allNodes, nodes2collapse, node2parent));
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2RlYm91bmNlMi5qcyIsInNyYy9lbGVtZW50VXRpbGl0aWVzLmpzIiwic3JjL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3NhdmVMb2FkVXRpbGl0aWVzLmpzIiwic3JjL3VuZG9SZWRvVXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2wwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBib3VuZGluZ0JveFV0aWxpdGllcyA9IHtcbiAgZXF1YWxCb3VuZGluZ0JveGVzOiBmdW5jdGlvbihiYjEsIGJiMil7XG4gICAgICByZXR1cm4gYmIxLngxID09IGJiMi54MSAmJiBiYjEueDIgPT0gYmIyLngyICYmIGJiMS55MSA9PSBiYjIueTEgJiYgYmIxLnkyID09IGJiMi55MjtcbiAgfSxcbiAgZ2V0VW5pb246IGZ1bmN0aW9uKGJiMSwgYmIyKXtcbiAgICAgIHZhciB1bmlvbiA9IHtcbiAgICAgIHgxOiBNYXRoLm1pbihiYjEueDEsIGJiMi54MSksXG4gICAgICB4MjogTWF0aC5tYXgoYmIxLngyLCBiYjIueDIpLFxuICAgICAgeTE6IE1hdGgubWluKGJiMS55MSwgYmIyLnkxKSxcbiAgICAgIHkyOiBNYXRoLm1heChiYjEueTIsIGJiMi55MiksXG4gICAgfTtcblxuICAgIHVuaW9uLncgPSB1bmlvbi54MiAtIHVuaW9uLngxO1xuICAgIHVuaW9uLmggPSB1bmlvbi55MiAtIHVuaW9uLnkxO1xuXG4gICAgcmV0dXJuIHVuaW9uO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJvdW5kaW5nQm94VXRpbGl0aWVzOyIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcbnZhciBkZWJvdW5jZTIgPSByZXF1aXJlKCcuL2RlYm91bmNlMicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXJhbXMsIGN5LCBhcGkpIHtcbiAgdmFyIGVsZW1lbnRVdGlsaXRpZXM7XG4gIHZhciBmbiA9IHBhcmFtcztcbiAgY29uc3QgQ1VFX1BPU19VUERBVEVfREVMQVkgPSAxMDA7XG4gIHZhciBub2RlV2l0aFJlbmRlcmVkQ3VlO1xuXG4gIGNvbnN0IGdldERhdGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjcmF0Y2ggPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xuICAgIHJldHVybiBzY3JhdGNoICYmIHNjcmF0Y2guY3VlVXRpbGl0aWVzO1xuICB9O1xuXG4gIGNvbnN0IHNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBzY3JhdGNoID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKTtcbiAgICBpZiAoc2NyYXRjaCA9PSBudWxsKSB7XG4gICAgICBzY3JhdGNoID0ge307XG4gICAgfVxuXG4gICAgc2NyYXRjaC5jdWVVdGlsaXRpZXMgPSBkYXRhO1xuICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJywgc2NyYXRjaCk7XG4gIH07XG5cbiAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgJGNhbnZhcy5jbGFzc0xpc3QuYWRkKFwiZXhwYW5kLWNvbGxhcHNlLWNhbnZhc1wiKTtcbiAgICAgIHZhciAkY29udGFpbmVyID0gY3kuY29udGFpbmVyKCk7XG4gICAgICB2YXIgY3R4ID0gJGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGNhbnZhcyk7XG5cbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XG5cbiAgICAgIHZhciBvZmZzZXQgPSBmdW5jdGlvbiAoZWx0KSB7XG4gICAgICAgIHZhciByZWN0ID0gZWx0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdG9wOiByZWN0LnRvcCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AsXG4gICAgICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnRcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICRjYW52YXMuaGVpZ2h0ID0gY3kuY29udGFpbmVyKCkub2Zmc2V0SGVpZ2h0O1xuICAgICAgICAkY2FudmFzLndpZHRoID0gY3kuY29udGFpbmVyKCkub2Zmc2V0V2lkdGg7XG4gICAgICAgICRjYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAkY2FudmFzLnN0eWxlLnRvcCA9IDA7XG4gICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IDA7XG4gICAgICAgICRjYW52YXMuc3R5bGUuekluZGV4ID0gb3B0aW9ucygpLnpJbmRleDtcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSBvZmZzZXQoJGNhbnZhcyk7XG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gb2Zmc2V0KCRjb250YWluZXIpO1xuICAgICAgICAgICRjYW52YXMuc3R5bGUudG9wID0gLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApO1xuICAgICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpO1xuXG4gICAgICAgICAgLy8gcmVmcmVzaCB0aGUgY3VlcyBvbiBjYW52YXMgcmVzaXplXG4gICAgICAgICAgaWYgKGN5KSB7XG4gICAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG5cbiAgICAgIH0sIDI1MCk7XG5cbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XG4gICAgICAgIF9zaXplQ2FudmFzKCk7XG4gICAgICB9XG5cbiAgICAgIHNpemVDYW52YXMoKTtcblxuICAgICAgdmFyIGRhdGEgPSB7fTtcblxuICAgICAgLy8gaWYgdGhlcmUgYXJlIGV2ZW50cyBmaWVsZCBpbiBkYXRhIHVuYmluZCB0aGVtIGhlcmVcbiAgICAgIC8vIHRvIHByZXZlbnQgYmluZGluZyB0aGUgc2FtZSBldmVudCBtdWx0aXBsZSB0aW1lc1xuICAgICAgLy8gaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XG4gICAgICAvLyAgIGZ1bmN0aW9uc1sndW5iaW5kJ10uYXBwbHkoICRjb250YWluZXIgKTtcbiAgICAgIC8vIH1cblxuICAgICAgZnVuY3Rpb24gb3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykub3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2xlYXJEcmF3cygpIHtcbiAgICAgICAgdmFyIHcgPSBjeS53aWR0aCgpO1xuICAgICAgICB2YXIgaCA9IGN5LmhlaWdodCgpO1xuXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGhhc0NoaWxkcmVuID0gY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbiAhPSB1bmRlZmluZWQgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHNpbXBsZSBub2RlIHdpdGggbm8gY29sbGFwc2VkIGNoaWxkcmVuIHJldHVybiBkaXJlY3RseVxuICAgICAgICBpZiAoIWhhc0NoaWxkcmVuICYmICFjb2xsYXBzZWRDaGlsZHJlbikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpc0NvbGxhcHNlZCA9IG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xuXG4gICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xuICAgICAgICB2YXIgcmVjdFNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVTaXplO1xuICAgICAgICB2YXIgbGluZVNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTtcblxuICAgICAgICB2YXIgY3VlQ2VudGVyO1xuXG4gICAgICAgIGlmIChvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbiA9PT0gJ3RvcC1sZWZ0Jykge1xuICAgICAgICAgIHZhciBvZmZzZXQgPSAxO1xuICAgICAgICAgIHZhciBzaXplID0gY3kuem9vbSgpIDwgMSA/IHJlY3RTaXplIC8gKDIgKiBjeS56b29tKCkpIDogcmVjdFNpemUgLyAyO1xuICAgICAgICAgIHZhciBub2RlQm9yZGVyV2lkID0gcGFyc2VGbG9hdChub2RlLmNzcygnYm9yZGVyLXdpZHRoJykpO1xuICAgICAgICAgIHZhciB4ID0gbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS53aWR0aCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctbGVmdCcpKVxuICAgICAgICAgICAgKyBub2RlQm9yZGVyV2lkICsgc2l6ZSArIG9mZnNldDtcbiAgICAgICAgICB2YXIgeSA9IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuaGVpZ2h0KCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy10b3AnKSlcbiAgICAgICAgICAgICsgbm9kZUJvcmRlcldpZCArIHNpemUgKyBvZmZzZXQ7XG5cbiAgICAgICAgICBjdWVDZW50ZXIgPSB7IHg6IHgsIHk6IHkgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XG4gICAgICAgICAgY3VlQ2VudGVyID0gdHlwZW9mIG9wdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbi5jYWxsKHRoaXMsIG5vZGUpIDogb3B0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyID0gZWxlbWVudFV0aWxpdGllcy5jb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKGN1ZUNlbnRlcik7XG5cbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBzaXplc1xuICAgICAgICByZWN0U2l6ZSA9IE1hdGgubWF4KHJlY3RTaXplLCByZWN0U2l6ZSAqIGN5Lnpvb20oKSk7XG4gICAgICAgIGxpbmVTaXplID0gTWF0aC5tYXgobGluZVNpemUsIGxpbmVTaXplICogY3kuem9vbSgpKTtcbiAgICAgICAgdmFyIGRpZmYgPSAocmVjdFNpemUgLSBsaW5lU2l6ZSkgLyAyO1xuXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclggPSBleHBhbmRjb2xsYXBzZUNlbnRlci54O1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VDZW50ZXJZID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueTtcblxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFggPSBleHBhbmRjb2xsYXBzZUNlbnRlclggLSByZWN0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWSAtIHJlY3RTaXplIC8gMjtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVjdFNpemUgPSByZWN0U2l6ZTtcblxuICAgICAgICAvLyBEcmF3IGV4cGFuZC9jb2xsYXBzZSBjdWUgaWYgc3BlY2lmaWVkIHVzZSBhbiBpbWFnZSBlbHNlIHJlbmRlciBpdCBpbiB0aGUgZGVmYXVsdCB3YXlcbiAgICAgICAgaWYgKGlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZSkge1xuICAgICAgICAgIGRyYXdJbWcob3B0aW9ucygpLmV4cGFuZEN1ZUltYWdlLCBleHBhbmRjb2xsYXBzZVN0YXJ0WCwgZXhwYW5kY29sbGFwc2VTdGFydFksIHJlY3RTaXplLCByZWN0U2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIWlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlKSB7XG4gICAgICAgICAgZHJhd0ltZyhvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSwgZXhwYW5kY29sbGFwc2VTdGFydFgsIGV4cGFuZGNvbGxhcHNlU3RhcnRZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHZhciBvbGRGaWxsU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xuICAgICAgICAgIHZhciBvbGRXaWR0aCA9IGN0eC5saW5lV2lkdGg7XG4gICAgICAgICAgdmFyIG9sZFN0cm9rZVN0eWxlID0gY3R4LnN0cm9rZVN0eWxlO1xuXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XG5cbiAgICAgICAgICBjdHguZWxsaXBzZShleHBhbmRjb2xsYXBzZUNlbnRlclgsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSwgcmVjdFNpemUgLyAyLCByZWN0U2l6ZSAvIDIsIDAsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICBjdHguZmlsbCgpO1xuXG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBNYXRoLm1heCgyLjYsIDIuNiAqIGN5Lnpvb20oKSk7XG5cbiAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xuICAgICAgICAgIGN0eC5saW5lVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyBsaW5lU2l6ZSArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcblxuICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgY3R4Lm1vdmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIHJlY3RTaXplIC8gMiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyBkaWZmKTtcbiAgICAgICAgICAgIGN0eC5saW5lVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgbGluZVNpemUgKyBkaWZmKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xuXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gb2xkU3Ryb2tlU3R5bGU7XG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gb2xkV2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlU3RhcnRYO1xuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZO1xuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUgPSBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xuXG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBub2RlO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBkcmF3SW1nKGltZ1NyYywgeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKHcsIGgpO1xuICAgICAgICBpbWcuc3JjID0gaW1nU3JjO1xuICAgICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCB4LCB5LCB3LCBoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY3kub24oJ3Jlc2l6ZScsIGRhdGEuZUN5UmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzaXplQ2FudmFzKCk7XG4gICAgICB9KTtcblxuICAgICAgY3kub24oJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAobm9kZVdpdGhSZW5kZXJlZEN1ZSkge1xuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBvbGRNb3VzZVBvcyA9IG51bGwsIGN1cnJNb3VzZVBvcyA9IG51bGw7XG4gICAgICBjeS5vbignbW91c2Vkb3duJywgZGF0YS5lTW91c2VEb3duID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgb2xkTW91c2VQb3MgPSBlLnJlbmRlcmVkUG9zaXRpb24gfHwgZS5jeVJlbmRlcmVkUG9zaXRpb25cbiAgICAgIH0pO1xuXG4gICAgICBjeS5vbignbW91c2V1cCcsIGRhdGEuZU1vdXNlVXAgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBjdXJyTW91c2VQb3MgPSBlLnJlbmRlcmVkUG9zaXRpb24gfHwgZS5jeVJlbmRlcmVkUG9zaXRpb25cbiAgICAgIH0pO1xuXG4gICAgICBjeS5vbigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUgPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBldnQudGFyZ2V0O1xuICAgICAgICBpZiAobm9kZSA9PSBub2RlV2l0aFJlbmRlcmVkQ3VlKSB7XG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIHVyO1xuICAgICAgY3kub24oJ3NlbGVjdCB1bnNlbGVjdCcsIGRhdGEuZVNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKG5vZGVXaXRoUmVuZGVyZWRDdWUpIHtcbiAgICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNlbGVjdGVkTm9kZXMgPSBjeS5ub2RlcygnOnNlbGVjdGVkJyk7XG4gICAgICAgIGlmIChzZWxlY3RlZE5vZGVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2VsZWN0ZWROb2RlID0gc2VsZWN0ZWROb2Rlc1swXTtcblxuICAgICAgICBpZiAoc2VsZWN0ZWROb2RlLmlzUGFyZW50KCkgfHwgc2VsZWN0ZWROb2RlLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKSkge1xuICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShzZWxlY3RlZE5vZGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY3kub24oJ3RhcCcsIGRhdGEuZVRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgbm9kZSA9IG5vZGVXaXRoUmVuZGVyZWRDdWU7XG4gICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCcpO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WScpO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplID0gbm9kZS5kYXRhKCdleHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZScpO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xuXG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zID0gZXZlbnQucmVuZGVyZWRQb3NpdGlvbiB8fCBldmVudC5jeVJlbmRlcmVkUG9zaXRpb247XG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zWCA9IGN5UmVuZGVyZWRQb3MueDtcbiAgICAgICAgdmFyIGN5UmVuZGVyZWRQb3NZID0gY3lSZW5kZXJlZFBvcy55O1xuICAgICAgICB2YXIgb3B0cyA9IG9wdGlvbnMoKTtcbiAgICAgICAgdmFyIGZhY3RvciA9IChvcHRzLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XG5cbiAgICAgICAgaWYgKChNYXRoLmFicyhvbGRNb3VzZVBvcy54IC0gY3Vyck1vdXNlUG9zLngpIDwgNSAmJiBNYXRoLmFicyhvbGRNb3VzZVBvcy55IC0gY3Vyck1vdXNlUG9zLnkpIDwgNSlcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1ggPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWSA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3IpIHtcbiAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSAmJiAhdXIpIHtcbiAgICAgICAgICAgIHVyID0gY3kudW5kb1JlZG8oeyBkZWZhdWx0QWN0aW9uczogZmFsc2UgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGFwaS5pc0NvbGxhcHNpYmxlKG5vZGUpKSB7XG4gICAgICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSkge1xuICAgICAgICAgICAgICB1ci5kbyhcImNvbGxhcHNlXCIsIHtcbiAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRzXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGFwaS5jb2xsYXBzZShub2RlLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYXBpLmlzRXhwYW5kYWJsZShub2RlKSkge1xuICAgICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUpIHtcbiAgICAgICAgICAgICAgdXIuZG8oXCJleHBhbmRcIiwgeyBub2Rlczogbm9kZSwgb3B0aW9uczogb3B0cyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBhcGkuZXhwYW5kKG5vZGUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobm9kZS5zZWxlY3RhYmxlKCkpIHtcbiAgICAgICAgICAgIG5vZGUudW5zZWxlY3RpZnkoKTtcbiAgICAgICAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGN5Lm9uKCdhZnRlclVuZG8gYWZ0ZXJSZWRvJywgZGF0YS5lVW5kb1JlZG8gPSBkYXRhLmVTZWxlY3QpO1xuXG4gICAgICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGRhdGEuZVBvc2l0aW9uID0gZGVib3VuY2UyKGRhdGEuZVNlbGVjdCwgQ1VFX1BPU19VUERBVEVfREVMQVksIGNsZWFyRHJhd3MpKTtcblxuICAgICAgY3kub24oJ3BhbiB6b29tJywgZGF0YS5lUG9zaXRpb24pO1xuXG4gICAgICAvLyB3cml0ZSBvcHRpb25zIHRvIGRhdGFcbiAgICAgIGRhdGEuaGFzRXZlbnRGaWVsZHMgPSB0cnVlO1xuICAgICAgc2V0RGF0YShkYXRhKTtcbiAgICB9LFxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgLy8gdmFyICRjb250YWluZXIgPSB0aGlzO1xuICAgICAgdmFyIGRhdGEgPSBnZXREYXRhKCk7XG5cbiAgICAgIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xuICAgICAgICBjb25zb2xlLmxvZygnZXZlbnRzIHRvIHVuYmluZCBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGN5LnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJyk7XG5cbiAgICAgIGN5Lm9mZignbW91c2Vkb3duJywgJ25vZGUnLCBkYXRhLmVNb3VzZURvd24pXG4gICAgICAgIC5vZmYoJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXG4gICAgICAgIC5vZmYoJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlKVxuICAgICAgICAub2ZmKCd0YXAnLCAnbm9kZScsIGRhdGEuZVRhcClcbiAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXG4gICAgICAgIC5vZmYoJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbilcbiAgICAgICAgLm9mZigncGFuIHpvb20nLCBkYXRhLmVQb3NpdGlvbilcbiAgICAgICAgLm9mZignc2VsZWN0IHVuc2VsZWN0JywgZGF0YS5lU2VsZWN0KVxuICAgICAgICAub2ZmKCdmcmVlJywgJ25vZGUnLCBkYXRhLmVGcmVlKVxuICAgICAgICAub2ZmKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSlcbiAgICAgICAgLm9mZignYWZ0ZXJVbmRvIGFmdGVyUmVkbycsIGRhdGEuZVVuZG9SZWRvKTtcbiAgICB9LFxuICAgIHJlYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRhdGEgPSBnZXREYXRhKCk7XG5cbiAgICAgIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xuICAgICAgICBjb25zb2xlLmxvZygnZXZlbnRzIHRvIHJlYmluZCBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcbiAgICAgICAgLm9uKCdtb3VzZXVwJywgJ25vZGUnLCBkYXRhLmVNb3VzZVVwKVxuICAgICAgICAub24oJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlKVxuICAgICAgICAub24oJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxuICAgICAgICAub24oJ2FkZCcsICdub2RlJywgZGF0YS5lQWRkKVxuICAgICAgICAub24oJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbilcbiAgICAgICAgLm9uKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKVxuICAgICAgICAub24oJ3NlbGVjdCB1bnNlbGVjdCcsIGRhdGEuZVNlbGVjdClcbiAgICAgICAgLm9uKCdmcmVlJywgJ25vZGUnLCBkYXRhLmVGcmVlKVxuICAgICAgICAub24oJ3Jlc2l6ZScsIGRhdGEuZUN5UmVzaXplKVxuICAgICAgICAub24oJ2FmdGVyVW5kbyBhZnRlclJlZG8nLCBkYXRhLmVVbmRvUmVkbyk7XG4gICAgfVxuICB9O1xuXG4gIGlmIChmdW5jdGlvbnNbZm5dKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkoY3kuY29udGFpbmVyKCksIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb25zLmluaXQuYXBwbHkoY3kuY29udGFpbmVyKCksIGFyZ3VtZW50cyk7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWV4cGFuZC1jb2xsYXBzZScpO1xuXG59O1xuIiwidmFyIGRlYm91bmNlID0gKGZ1bmN0aW9uICgpIHtcbiAgLyoqXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAgICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICAgKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gICAqL1xuICAvKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4gIC8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcblxuICAvKipcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgRGF0ZVxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAgICogfSwgXy5ub3coKSk7XG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAgICovXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXG4gICAqXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICpcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZ1xuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XG4gICAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XG4gICAqXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcbiAgICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxuICAgKiB9KSk7XG4gICAqXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcbiAgICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xuICAgKiAgICdtYXhXYWl0JzogMTAwMFxuICAgKiB9KSk7XG4gICAqXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXG4gICAqIHZhciB0b2RvQ2hhbmdlcyA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDEwMDApO1xuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xuICAgKlxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XG4gICAqICAgfVxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcbiAgICpcbiAgICogLy8gLi4uYXQgc29tZSBwb2ludCBgbW9kZWxzLnRvZG9gIGlzIGNoYW5nZWRcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcbiAgICpcbiAgICogLy8gLi4uYmVmb3JlIDEgc2Vjb25kIGhhcyBwYXNzZWQgYG1vZGVscy50b2RvYCBpcyBkZWxldGVkXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xuICAgKi9cbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBhcmdzLFxuICAgICAgICAgICAgbWF4VGltZW91dElkLFxuICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgc3RhbXAsXG4gICAgICAgICAgICB0aGlzQXJnLFxuICAgICAgICAgICAgdGltZW91dElkLFxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgICAgICAgbGFzdENhbGxlZCA9IDAsXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICAgIH1cbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICB2YXIgbGVhZGluZyA9IHRydWU7XG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xuICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBsYXN0Q2FsbGVkID0gMDtcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcbiAgICAgIGlmIChpZCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgICAgfVxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVsYXllZCgpIHtcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgY29tcGxldGUodHJhaWxpbmdDYWxsLCBtYXhUaW1lb3V0SWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1heERlbGF5ZWQoKSB7XG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgc3RhbXAgPSBub3coKTtcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XG5cbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcblxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XG4gICAgcmV0dXJuIGRlYm91bmNlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgTGFuZ1xuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8uaXNPYmplY3Qoe30pO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KDEpO1xuICAgKiAvLyA9PiBmYWxzZVxuICAgKi9cbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAgIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG4gIH1cblxuICByZXR1cm4gZGVib3VuY2U7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7IiwidmFyIGRlYm91bmNlMiA9IChmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBTbGlnaHRseSBtb2RpZmllZCB2ZXJzaW9uIG9mIGRlYm91bmNlLiBDYWxscyBmbjIgYXQgdGhlIGJlZ2lubmluZyBvZiBmcmVxdWVudCBjYWxscyB0byBmbjFcbiAgICogQHN0YXRpY1xuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4xIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbjIgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgdGhlIGJlZ2lubmluZyBvZiBmcmVxdWVudCBjYWxscyB0byBmbjFcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICAgKi9cbiAgZnVuY3Rpb24gZGVib3VuY2UyKGZuMSwgd2FpdCwgZm4yKSB7XG4gICAgbGV0IHRpbWVvdXQ7XG4gICAgbGV0IGlzSW5pdCA9IHRydWU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBmbjEuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlzSW5pdCA9IHRydWU7XG4gICAgICB9O1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgaWYgKGlzSW5pdCkge1xuICAgICAgICBmbjIuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlzSW5pdCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH07XG4gIH1cbiAgcmV0dXJuIGRlYm91bmNlMjtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2UyOyIsImZ1bmN0aW9uIGVsZW1lbnRVdGlsaXRpZXMoY3kpIHtcbiByZXR1cm4ge1xuICBtb3ZlTm9kZXM6IGZ1bmN0aW9uIChwb3NpdGlvbkRpZmYsIG5vZGVzLCBub3RDYWxjVG9wTW9zdE5vZGVzKSB7XG4gICAgdmFyIHRvcE1vc3ROb2RlcyA9IG5vdENhbGNUb3BNb3N0Tm9kZXMgPyBub2RlcyA6IHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcbiAgICB2YXIgbm9uUGFyZW50cyA9IHRvcE1vc3ROb2Rlcy5ub3QoXCI6cGFyZW50XCIpOyBcbiAgICAvLyBtb3ZpbmcgcGFyZW50cyBzcG9pbHMgcG9zaXRpb25pbmcsIHNvIG1vdmUgb25seSBub25wYXJlbnRzXG4gICAgbm9uUGFyZW50cy5wb3NpdGlvbnMoZnVuY3Rpb24oZWxlLCBpKXtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IG5vblBhcmVudHNbaV0ucG9zaXRpb24oXCJ4XCIpICsgcG9zaXRpb25EaWZmLngsXG4gICAgICAgIHk6IG5vblBhcmVudHNbaV0ucG9zaXRpb24oXCJ5XCIpICsgcG9zaXRpb25EaWZmLnlcbiAgICAgIH07XG4gICAgfSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3BNb3N0Tm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gdG9wTW9zdE5vZGVzW2ldO1xuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuICAgICAgdGhpcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBjaGlsZHJlbiwgdHJ1ZSk7XG4gICAgfVxuICB9LFxuICBnZXRUb3BNb3N0Tm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXG4gICAgdmFyIG5vZGVzTWFwID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgcm9vdHMgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBlbGUgPSBpO1xuICAgICAgfVxuICAgICAgXG4gICAgICB2YXIgcGFyZW50ID0gZWxlLnBhcmVudCgpWzBdO1xuICAgICAgd2hpbGUgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICAgIGlmIChub2Rlc01hcFtwYXJlbnQuaWQoKV0pIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudCgpWzBdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcm9vdHM7XG4gIH0sXG4gIHJlYXJyYW5nZTogZnVuY3Rpb24gKGxheW91dEJ5KSB7XG4gICAgaWYgKHR5cGVvZiBsYXlvdXRCeSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBsYXlvdXRCeSgpO1xuICAgIH0gZWxzZSBpZiAobGF5b3V0QnkgIT0gbnVsbCkge1xuICAgICAgdmFyIGxheW91dCA9IGN5LmxheW91dChsYXlvdXRCeSk7XG4gICAgICBpZiAobGF5b3V0ICYmIGxheW91dC5ydW4pIHtcbiAgICAgICAgbGF5b3V0LnJ1bigpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbjogZnVuY3Rpb24gKG1vZGVsUG9zaXRpb24pIHtcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XG5cbiAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcbiAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcblxuICAgIHJldHVybiB7XG4gICAgICB4OiB4LFxuICAgICAgeTogeVxuICAgIH07XG4gIH1cbiB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGVsZW1lbnRVdGlsaXRpZXM7XG4iLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JvdW5kaW5nQm94VXRpbGl0aWVzJyk7XG5cbi8vIEV4cGFuZCBjb2xsYXBzZSB1dGlsaXRpZXNcbmZ1bmN0aW9uIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKGN5KSB7XG52YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcbnJldHVybiB7XG4gIC8vdGhlIG51bWJlciBvZiBub2RlcyBtb3ZpbmcgYW5pbWF0ZWRseSBhZnRlciBleHBhbmQgb3BlcmF0aW9uXG4gIGFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQ6IDAsXG4gIC8qXG4gICAqIEEgZnVudGlvbiBiYXNpY2x5IGV4cGFuZGluZyBhIG5vZGUsIGl0IGlzIHRvIGJlIGNhbGxlZCB3aGVuIGEgbm9kZSBpcyBleHBhbmRlZCBhbnl3YXkuXG4gICAqIFNpbmdsZSBwYXJhbWV0ZXIgaW5kaWNhdGVzIGlmIHRoZSBub2RlIGlzIGV4cGFuZGVkIGFsb25lIGFuZCBpZiBpdCBpcyB0cnV0aHkgdGhlbiBsYXlvdXRCeSBwYXJhbWV0ZXIgaXMgY29uc2lkZXJlZCB0b1xuICAgKiBwZXJmb3JtIGxheW91dCBhZnRlciBleHBhbmQuXG4gICAqL1xuICBleHBhbmROb2RlQmFzZUZ1bmN0aW9uOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBsYXlvdXRCeSkge1xuICAgIGlmICghbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKXtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvL2NoZWNrIGhvdyB0aGUgcG9zaXRpb24gb2YgdGhlIG5vZGUgaXMgY2hhbmdlZFxuICAgIHZhciBwb3NpdGlvbkRpZmYgPSB7XG4gICAgICB4OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggLSBub2RlLl9wcml2YXRlLmRhdGFbJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZSddLngsXG4gICAgICB5OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgLSBub2RlLl9wcml2YXRlLmRhdGFbJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZSddLnlcbiAgICB9O1xuXG4gICAgbm9kZS5yZW1vdmVEYXRhKFwiaW5mb0xhYmVsXCIpO1xuICAgIG5vZGUucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xuXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYmVmb3JlZXhwYW5kXCIpO1xuICAgIHZhciByZXN0b3JlZE5vZGVzID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuO1xuICAgIHJlc3RvcmVkTm9kZXMucmVzdG9yZSgpO1xuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCByZXN0b3JlZE5vZGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgIGRlbGV0ZSBwYXJlbnREYXRhW3Jlc3RvcmVkTm9kZXNbaV0uaWQoKV07XG4gICAgfVxuICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XG4gICAgdGhpcy5yZXBhaXJFZGdlcyhub2RlKTtcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xuXG4gICAgZWxlbWVudFV0aWxpdGllcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBub2RlLmNoaWxkcmVuKCkpO1xuICAgIG5vZGUucmVtb3ZlRGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJyk7XG5cbiAgICBub2RlLnRyaWdnZXIoXCJwb3NpdGlvblwiKTsgLy8gcG9zaXRpb24gbm90IHRyaWdnZXJlZCBieSBkZWZhdWx0IHdoZW4gbm9kZXMgYXJlIG1vdmVkXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmRcIik7XG5cbiAgICAvLyBJZiBleHBhbmQgaXMgY2FsbGVkIGp1c3QgZm9yIG9uZSBub2RlIHRoZW4gY2FsbCBlbmQgb3BlcmF0aW9uIHRvIHBlcmZvcm0gbGF5b3V0XG4gICAgaWYgKHNpbmdsZSkge1xuICAgICAgdGhpcy5lbmRPcGVyYXRpb24obGF5b3V0QnksIG5vZGUpO1xuICAgIH1cbiAgfSxcbiAgLypcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gY29sbGFwc2UgZ2l2ZW4gbm9kZXMgaW4gYSBzaW1wbGUgd2F5IChXaXRob3V0IHBlcmZvcm1pbmcgbGF5b3V0IGFmdGVyd2FyZClcbiAgICogSXQgY29sbGFwc2VzIGFsbCByb290IG5vZGVzIGJvdHRvbSB1cC5cbiAgICovXG4gIHNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzKSB7Ly8qLy9cbiAgICBub2Rlcy5kYXRhKFwiY29sbGFwc2VcIiwgdHJ1ZSk7XG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XG4gICAgICBcbiAgICAgIC8vIENvbGxhcHNlIHRoZSBub2RlcyBpbiBib3R0b20gdXAgb3JkZXJcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChyb290KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9LFxuICAvKlxuICAgKiBBIGhlbHBlciBmdW5jdGlvbiB0byBleHBhbmQgZ2l2ZW4gbm9kZXMgaW4gYSBzaW1wbGUgd2F5IChXaXRob3V0IHBlcmZvcm1pbmcgbGF5b3V0IGFmdGVyd2FyZClcbiAgICogSXQgZXhwYW5kcyBhbGwgdG9wIG1vc3Qgbm9kZXMgdG9wIGRvd24uXG4gICAqL1xuICBzaW1wbGVFeHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XG4gICAgbm9kZXMuZGF0YShcImV4cGFuZFwiLCB0cnVlKTsgLy8gTWFyayB0aGF0IHRoZSBub2RlcyBhcmUgc3RpbGwgdG8gYmUgZXhwYW5kZWRcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7IC8vIEZvciBlYWNoIHJvb3Qgbm9kZSBleHBhbmQgdG9wIGRvd25cbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xuICB9LFxuICAvKlxuICAgKiBFeHBhbmRzIGFsbCBub2RlcyBieSBleHBhbmRpbmcgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duIHdpdGggdGhlaXIgZGVzY2VuZGFudHMuXG4gICAqL1xuICBzaW1wbGVFeHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xuICAgIGlmIChub2RlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBub2RlcyA9IGN5Lm5vZGVzKCk7XG4gICAgfVxuICAgIHZhciBvcnBoYW5zO1xuICAgIG9ycGhhbnMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgdmFyIGV4cGFuZFN0YWNrID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcm9vdCA9IG9ycGhhbnNbaV07XG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24ocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cGFuZFN0YWNrO1xuICB9LFxuICAvKlxuICAgKiBUaGUgb3BlcmF0aW9uIHRvIGJlIHBlcmZvcm1lZCBhZnRlciBleHBhbmQvY29sbGFwc2UuIEl0IHJlYXJyYW5nZSBub2RlcyBieSBsYXlvdXRCeSBwYXJhbWV0ZXIuXG4gICAqL1xuICBlbmRPcGVyYXRpb246IGZ1bmN0aW9uIChsYXlvdXRCeSwgbm9kZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgY3kucmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudFV0aWxpdGllcy5yZWFycmFuZ2UobGF5b3V0QnkpO1xuICAgICAgICBpZihjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkKXtcbiAgICAgICAgICBub2Rlcy5zZWxlY3RpZnkoKTtcbiAgICAgICAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0sIDApO1xuICAgICAgXG4gICAgfSk7XG4gIH0sXG4gIC8qXG4gICAqIENhbGxzIHNpbXBsZSBleHBhbmRBbGxOb2Rlcy4gVGhlbiBwZXJmb3JtcyBlbmQgb3BlcmF0aW9uLlxuICAgKi9cbiAgZXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXG4gICAgdmFyIGV4cGFuZGVkU3RhY2sgPSB0aGlzLnNpbXBsZUV4cGFuZEFsbE5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xuXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xuXG4gICAgLypcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIHJldHVybiBleHBhbmRlZFN0YWNrO1xuICB9LFxuICAvKlxuICAgKiBFeHBhbmRzIHRoZSByb290IGFuZCBpdHMgY29sbGFwc2VkIGRlc2NlbmRlbnRzIGluIHRvcCBkb3duIG9yZGVyLlxuICAgKi9cbiAgZXhwYW5kQWxsVG9wRG93bjogZnVuY3Rpb24gKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xuICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgZXhwYW5kU3RhY2sucHVzaChyb290KTtcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgfVxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKG5vZGUsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgfVxuICB9LFxuICAvL0V4cGFuZCB0aGUgZ2l2ZW4gbm9kZXMgcGVyZm9ybSBlbmQgb3BlcmF0aW9uIGFmdGVyIGV4cGFuZGF0aW9uXG4gIGV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykge1xuICAgIC8vIElmIHRoZXJlIGlzIGp1c3Qgb25lIG5vZGUgdG8gZXhwYW5kIHdlIG5lZWQgdG8gYW5pbWF0ZSBmb3IgZmlzaGV5ZSB2aWV3LCBidXQgaWYgdGhlcmUgYXJlIG1vcmUgdGhlbiBvbmUgbm9kZSB3ZSBkbyBub3RcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICBcbiAgICAgIHZhciBub2RlID0gbm9kZXNbMF07XG4gICAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgICAgLy8gRXhwYW5kIHRoZSBnaXZlbiBub2RlIHRoZSB0aGlyZCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoYXQgdGhlIG5vZGUgaXMgc2ltcGxlIHdoaWNoIGVuc3VyZXMgdGhhdCBmaXNoZXllIHBhcmFtZXRlciB3aWxsIGJlIGNvbnNpZGVyZWRcbiAgICAgICAgdGhpcy5leHBhbmROb2RlKG5vZGUsIG9wdGlvbnMuZmlzaGV5ZSwgdHJ1ZSwgb3B0aW9ucy5hbmltYXRlLCBvcHRpb25zLmxheW91dEJ5LCBvcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICAgIH1cbiAgICB9IFxuICAgIGVsc2Uge1xuICAgICAgLy8gRmlyc3QgZXhwYW5kIGdpdmVuIG5vZGVzIGFuZCB0aGVuIHBlcmZvcm0gbGF5b3V0IGFjY29yZGluZyB0byB0aGUgbGF5b3V0QnkgcGFyYW1ldGVyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZEdpdmVuTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZXMgdGhlbiBwZXJmb3JtIGVuZCBvcGVyYXRpb25cbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcbiAgICAvKlxuICAgICAqIEluIGNvbGxhcHNlIG9wZXJhdGlvbiB0aGVyZSBpcyBubyBmaXNoZXllIHZpZXcgdG8gYmUgYXBwbGllZCBzbyB0aGVyZSBpcyBubyBhbmltYXRpb24gdG8gYmUgZGVzdHJveWVkIGhlcmUuIFdlIGNhbiBkbyB0aGlzIFxuICAgICAqIGluIGEgYmF0Y2guXG4gICAgICovIFxuICAgIGN5LnN0YXJ0QmF0Y2goKTtcbiAgICB0aGlzLnNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2Rlcyhub2Rlcy8qLCBvcHRpb25zKi8pO1xuICAgIGN5LmVuZEJhdGNoKCk7XG5cbiAgICBub2Rlcy50cmlnZ2VyKFwicG9zaXRpb25cIik7IC8vIHBvc2l0aW9uIG5vdCB0cmlnZ2VyZWQgYnkgZGVmYXVsdCB3aGVuIGNvbGxhcHNlTm9kZSBpcyBjYWxsZWRcbiAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIHN0eWxlXG4gICAgY3kuc3R5bGUoKS51cGRhdGUoKTtcblxuICAgIC8qXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgKi9cbiAgICByZXR1cm4gbm9kZXM7XG4gIH0sXG4gIC8vY29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XG4gIGNvbGxhcHNlQm90dG9tVXA6IGZ1bmN0aW9uIChyb290KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAobm9kZSk7XG4gICAgfVxuICAgIC8vSWYgdGhlIHJvb3QgaXMgYSBjb21wb3VuZCBub2RlIHRvIGJlIGNvbGxhcHNlZCB0aGVuIGNvbGxhcHNlIGl0XG4gICAgaWYgKHJvb3QuZGF0YShcImNvbGxhcHNlXCIpICYmIHJvb3QuY2hpbGRyZW4oKS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmNvbGxhcHNlTm9kZShyb290KTtcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImNvbGxhcHNlXCIpO1xuICAgIH1cbiAgfSxcbiAgLy9leHBhbmQgdGhlIG5vZGVzIGluIHRvcCBkb3duIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcbiAgZXhwYW5kVG9wRG93bjogZnVuY3Rpb24gKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XG4gICAgaWYgKHJvb3QuZGF0YShcImV4cGFuZFwiKSAmJiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgLy8gRXhwYW5kIHRoZSByb290IGFuZCB1bm1hcmsgaXRzIGV4cGFuZCBkYXRhIHRvIHNwZWNpZnkgdGhhdCBpdCBpcyBubyBtb3JlIHRvIGJlIGV4cGFuZGVkXG4gICAgICB0aGlzLmV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiZXhwYW5kXCIpO1xuICAgIH1cbiAgICAvLyBNYWtlIGEgcmVjdXJzaXZlIGNhbGwgZm9yIGNoaWxkcmVuIG9mIHJvb3RcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihub2RlKTtcbiAgICB9XG4gIH0sXG4gIC8vIENvbnZlcnN0IHRoZSByZW5kZXJlZCBwb3NpdGlvbiB0byBtb2RlbCBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gZ2xvYmFsIHBhbiBhbmQgem9vbSB2YWx1ZXNcbiAgY29udmVydFRvTW9kZWxQb3NpdGlvbjogZnVuY3Rpb24gKHJlbmRlcmVkUG9zaXRpb24pIHtcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XG5cbiAgICB2YXIgeCA9IChyZW5kZXJlZFBvc2l0aW9uLnggLSBwYW4ueCkgLyB6b29tO1xuICAgIHZhciB5ID0gKHJlbmRlcmVkUG9zaXRpb24ueSAtIHBhbi55KSAvIHpvb207XG5cbiAgICByZXR1cm4ge1xuICAgICAgeDogeCxcbiAgICAgIHk6IHlcbiAgICB9O1xuICB9LFxuICAvKlxuICAgKiBUaGlzIG1ldGhvZCBleHBhbmRzIHRoZSBnaXZlbiBub2RlLiBJdCBjb25zaWRlcnMgYXBwbHlGaXNoRXllVmlldywgYW5pbWF0ZSBhbmQgbGF5b3V0QnkgcGFyYW1ldGVycy5cbiAgICogSXQgYWxzbyBjb25zaWRlcnMgc2luZ2xlIHBhcmFtZXRlciB3aGljaCBpbmRpY2F0ZXMgaWYgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGFsb25lLiBJZiB0aGlzIHBhcmFtZXRlciBpcyB0cnV0aHkgYWxvbmcgd2l0aCBcbiAgICogYXBwbHlGaXNoRXllVmlldyBwYXJhbWV0ZXIgdGhlbiB0aGUgc3RhdGUgb2YgdmlldyBwb3J0IGlzIHRvIGJlIGNoYW5nZWQgdG8gaGF2ZSBleHRyYSBzcGFjZSBvbiB0aGUgc2NyZWVuIChpZiBuZWVkZWQpIGJlZm9yZSBhcHBsaXlpbmcgdGhlXG4gICAqIGZpc2hleWUgdmlldy5cbiAgICovXG4gIGV4cGFuZE5vZGU6IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBcbiAgICB2YXIgY29tbW9uRXhwYW5kT3BlcmF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlldykge1xuXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53O1xuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmg7XG4gICAgICAgIFxuICAgICAgICAvLyBGaXNoZXllIHZpZXcgZXhwYW5kIHRoZSBub2RlLlxuICAgICAgICAvLyBUaGUgZmlyc3QgcGFyYW10ZXIgaW5kaWNhdGVzIHRoZSBub2RlIHRvIGFwcGx5IGZpc2hleWUgdmlldywgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhlIG5vZGVcbiAgICAgICAgLy8gdG8gYmUgZXhwYW5kZWQgYWZ0ZXIgZmlzaGV5ZSB2aWV3IGlzIGFwcGxpZWQuXG4gICAgICAgIHNlbGYuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZSwgc2luZ2xlLCBub2RlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBJZiBvbmUgb2YgdGhlc2UgcGFyYW1ldGVycyBpcyB0cnV0aHkgaXQgbWVhbnMgdGhhdCBleHBhbmROb2RlQmFzZUZ1bmN0aW9uIGlzIGFscmVhZHkgdG8gYmUgY2FsbGVkLlxuICAgICAgLy8gSG93ZXZlciBpZiBub25lIG9mIHRoZW0gaXMgdHJ1dGh5IHdlIG5lZWQgdG8gY2FsbCBpdCBoZXJlLlxuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFwcGx5RmlzaEV5ZVZpZXcgfHwgIWFuaW1hdGUpIHtcbiAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGUsIHNpbmdsZSwgbGF5b3V0QnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlKTtcbiAgICAgIHZhciBhbmltYXRpbmcgPSBmYWxzZTsgLy8gVmFyaWFibGUgdG8gY2hlY2sgaWYgdGhlcmUgaXMgYSBjdXJyZW50IGFuaW1hdGlvbiwgaWYgdGhlcmUgaXMgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxuICAgICAgXG4gICAgICAvLyBJZiB0aGUgbm9kZSBpcyB0aGUgb25seSBub2RlIHRvIGV4cGFuZCBhbmQgZmlzaGV5ZSB2aWV3IHNob3VsZCBiZSBhcHBsaWVkLCB0aGVuIGNoYW5nZSB0aGUgc3RhdGUgb2Ygdmlld3BvcnQgXG4gICAgICAvLyB0byBjcmVhdGUgbW9yZSBzcGFjZSBvbiBzY3JlZW4gKElmIG5lZWRlZClcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3ICYmIHNpbmdsZSkge1xuICAgICAgICB2YXIgdG9wTGVmdFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiAwLCB5OiAwfSk7XG4gICAgICAgIHZhciBib3R0b21SaWdodFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiBjeS53aWR0aCgpLCB5OiBjeS5oZWlnaHQoKX0pO1xuICAgICAgICB2YXIgcGFkZGluZyA9IDgwO1xuICAgICAgICB2YXIgYmIgPSB7XG4gICAgICAgICAgeDE6IHRvcExlZnRQb3NpdGlvbi54LFxuICAgICAgICAgIHgyOiBib3R0b21SaWdodFBvc2l0aW9uLngsXG4gICAgICAgICAgeTE6IHRvcExlZnRQb3NpdGlvbi55LFxuICAgICAgICAgIHkyOiBib3R0b21SaWdodFBvc2l0aW9uLnlcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbm9kZUJCID0ge1xuICAgICAgICAgIHgxOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggLSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udyAvIDIgLSBwYWRkaW5nLFxuICAgICAgICAgIHgyOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggKyBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udyAvIDIgKyBwYWRkaW5nLFxuICAgICAgICAgIHkxOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgLSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaCAvIDIgLSBwYWRkaW5nLFxuICAgICAgICAgIHkyOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgKyBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaCAvIDIgKyBwYWRkaW5nXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVuaW9uQkIgPSBib3VuZGluZ0JveFV0aWxpdGllcy5nZXRVbmlvbihub2RlQkIsIGJiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHRoZXNlIGJib3hlcyBhcmUgbm90IGVxdWFsIHRoZW4gd2UgbmVlZCB0byBjaGFuZ2UgdGhlIHZpZXdwb3J0IHN0YXRlIChieSBwYW4gYW5kIHpvb20pXG4gICAgICAgIGlmICghYm91bmRpbmdCb3hVdGlsaXRpZXMuZXF1YWxCb3VuZGluZ0JveGVzKHVuaW9uQkIsIGJiKSkge1xuICAgICAgICAgIHZhciB2aWV3UG9ydCA9IGN5LmdldEZpdFZpZXdwb3J0KHVuaW9uQkIsIDEwKTtcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgYW5pbWF0aW5nID0gYW5pbWF0ZTsgLy8gU2lnbmFsIHRoYXQgdGhlcmUgaXMgYW4gYW5pbWF0aW9uIG5vdyBhbmQgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxuICAgICAgICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gYW5pbWF0ZSBkdXJpbmcgcGFuIGFuZCB6b29tXG4gICAgICAgICAgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgICAgIGN5LmFuaW1hdGUoe1xuICAgICAgICAgICAgICBwYW46IHZpZXdQb3J0LnBhbixcbiAgICAgICAgICAgICAgem9vbTogdmlld1BvcnQuem9vbSxcbiAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25EdXJhdGlvbiB8fCAxMDAwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjeS56b29tKHZpZXdQb3J0Lnpvb20pO1xuICAgICAgICAgICAgY3kucGFuKHZpZXdQb3J0LnBhbik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIElmIGFuaW1hdGluZyBpcyBub3QgdHJ1ZSB3ZSBuZWVkIHRvIGNhbGwgY29tbW9uRXhwYW5kT3BlcmF0aW9uIGhlcmVcbiAgICAgIGlmICghYW5pbWF0aW5nKSB7XG4gICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9LFxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlIHdpdGhvdXQgcGVyZm9ybWluZyBlbmQgb3BlcmF0aW9uXG4gIGNvbGxhcHNlTm9kZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcbiAgICAgIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJywge1xuICAgICAgICB4OiBub2RlLnBvc2l0aW9uKCkueCxcbiAgICAgICAgeTogbm9kZS5wb3NpdGlvbigpLnlcbiAgICAgIH0pO1xuXG4gICAgICBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJywge1xuICAgICAgICB3OiBub2RlLm91dGVyV2lkdGgoKSxcbiAgICAgICAgaDogbm9kZS5vdXRlckhlaWdodCgpXG4gICAgICB9KTtcblxuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuXG4gICAgICBjaGlsZHJlbi51bnNlbGVjdCgpO1xuICAgICAgY2hpbGRyZW4uY29ubmVjdGVkRWRnZXMoKS51bnNlbGVjdCgpO1xuXG4gICAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZVwiKTtcbiAgICAgIFxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4obm9kZSk7XG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKG5vZGUsIG5vZGUpO1xuICAgICAgbm9kZS5hZGRDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XG5cbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2VcIik7XG4gICAgICBcbiAgICAgIG5vZGUucG9zaXRpb24obm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKSk7XG5cbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9LFxuICBzdG9yZVdpZHRoSGVpZ2h0OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXG4gICAgaWYgKG5vZGUgIT0gbnVsbCkge1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5vdXRlcldpZHRoKCk7XG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5vdXRlckhlaWdodCgpO1xuXG4gICAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlLnBhcmVudCgpWzBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSxcbiAgLypcbiAgICogQXBwbHkgZmlzaGV5ZSB2aWV3IHRvIHRoZSBnaXZlbiBub2RlLiBub2RlVG9FeHBhbmQgd2lsbCBiZSBleHBhbmRlZCBhZnRlciB0aGUgb3BlcmF0aW9uLiBcbiAgICogVGhlIG90aGVyIHBhcmFtZXRlciBhcmUgdG8gYmUgcGFzc2VkIGJ5IHBhcmFtZXRlcnMgZGlyZWN0bHkgaW4gaW50ZXJuYWwgZnVuY3Rpb24gY2FsbHMuXG4gICAqL1xuICBmaXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZTogZnVuY3Rpb24gKG5vZGUsIHNpbmdsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcbiAgICB2YXIgc2libGluZ3MgPSB0aGlzLmdldFNpYmxpbmdzKG5vZGUpO1xuXG4gICAgdmFyIHhfYSA9IHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XG4gICAgdmFyIHlfYSA9IHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XG5cbiAgICB2YXIgZF94X2xlZnQgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XG4gICAgdmFyIGRfeF9yaWdodCA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcbiAgICB2YXIgZF95X3VwcGVyID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XG4gICAgdmFyIGRfeV9sb3dlciA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xuXG4gICAgdmFyIGFic19kaWZmX29uX3ggPSBNYXRoLmFicyhub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSAtIHhfYSk7XG4gICAgdmFyIGFic19kaWZmX29uX3kgPSBNYXRoLmFicyhub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSAtIHlfYSk7XG5cbiAgICAvLyBDZW50ZXIgd2VudCB0byBMRUZUXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddID4geF9hKSB7XG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0ICsgYWJzX2RpZmZfb25feDtcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCAtIGFic19kaWZmX29uX3g7XG4gICAgfVxuICAgIC8vIENlbnRlciB3ZW50IHRvIFJJR0hUXG4gICAgZWxzZSB7XG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0IC0gYWJzX2RpZmZfb25feDtcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCArIGFic19kaWZmX29uX3g7XG4gICAgfVxuXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gVVBcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gPiB5X2EpIHtcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciArIGFic19kaWZmX29uX3k7XG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgLSBhYnNfZGlmZl9vbl95O1xuICAgIH1cbiAgICAvLyBDZW50ZXIgd2VudCB0byBET1dOXG4gICAgZWxzZSB7XG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgLSBhYnNfZGlmZl9vbl95O1xuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyICsgYWJzX2RpZmZfb25feTtcbiAgICB9XG5cbiAgICB2YXIgeFBvc0luUGFyZW50U2libGluZyA9IFtdO1xuICAgIHZhciB5UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB4UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy54UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xuICAgICAgeVBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueVBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc2libGluZyA9IHNpYmxpbmdzW2ldO1xuXG4gICAgICB2YXIgeF9iID0geFBvc0luUGFyZW50U2libGluZ1tpXTtcbiAgICAgIHZhciB5X2IgPSB5UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xuXG4gICAgICB2YXIgc2xvcGUgPSAoeV9iIC0geV9hKSAvICh4X2IgLSB4X2EpO1xuXG4gICAgICB2YXIgZF94ID0gMDtcbiAgICAgIHZhciBkX3kgPSAwO1xuICAgICAgdmFyIFRfeCA9IDA7XG4gICAgICB2YXIgVF95ID0gMDtcblxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMRUZUXG4gICAgICBpZiAoeF9hID4geF9iKSB7XG4gICAgICAgIGRfeCA9IGRfeF9sZWZ0O1xuICAgICAgfVxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBSSUdIVFxuICAgICAgZWxzZSB7XG4gICAgICAgIGRfeCA9IGRfeF9yaWdodDtcbiAgICAgIH1cbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgVVBQRVIgc2lkZVxuICAgICAgaWYgKHlfYSA+IHlfYikge1xuICAgICAgICBkX3kgPSBkX3lfdXBwZXI7XG4gICAgICB9XG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExPV0VSIHNpZGVcbiAgICAgIGVsc2Uge1xuICAgICAgICBkX3kgPSBkX3lfbG93ZXI7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0Zpbml0ZShzbG9wZSkpIHtcbiAgICAgICAgVF94ID0gTWF0aC5taW4oZF94LCAoZF95IC8gTWF0aC5hYnMoc2xvcGUpKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzbG9wZSAhPT0gMCkge1xuICAgICAgICBUX3kgPSBNYXRoLm1pbihkX3ksIChkX3ggKiBNYXRoLmFicyhzbG9wZSkpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHhfYSA+IHhfYikge1xuICAgICAgICBUX3ggPSAtMSAqIFRfeDtcbiAgICAgIH1cblxuICAgICAgaWYgKHlfYSA+IHlfYikge1xuICAgICAgICBUX3kgPSAtMSAqIFRfeTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gTW92ZSB0aGUgc2libGluZyBpbiB0aGUgc3BlY2lhbCB3YXlcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShzaWJsaW5nLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gc2libGluZyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb24gaGVyZSBlbHNlIGl0IGlzIHRvIGJlIGNhbGxlZCBvbmUgb2YgZmlzaEV5ZVZpZXdNb3ZlTm9kZSgpIGNhbGxzXG4gICAgaWYgKHNpYmxpbmdzLmxlbmd0aCA9PSAwICYmIG5vZGUuc2FtZShub2RlVG9FeHBhbmQpKSB7XG4gICAgICB0aGlzLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGUsIGxheW91dEJ5KTtcbiAgICB9XG5cbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XG4gICAgICAvLyBBcHBseSBmaXNoZXllIHZpZXcgdG8gdGhlIHBhcmVudCBub2RlIGFzIHdlbGwgKCBJZiBleGlzdHMgKVxuICAgICAgdGhpcy5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLnBhcmVudCgpWzBdLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbiAgfSxcbiAgZ2V0U2libGluZ3M6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdmFyIHNpYmxpbmdzO1xuXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gPT0gbnVsbCkge1xuICAgICAgdmFyIG9ycGhhbnMgPSBjeS5ub2RlcyhcIjp2aXNpYmxlXCIpLm9ycGhhbnMoKTtcbiAgICAgIHNpYmxpbmdzID0gb3JwaGFucy5kaWZmZXJlbmNlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaWJsaW5ncyA9IG5vZGUuc2libGluZ3MoXCI6dmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2libGluZ3M7XG4gIH0sXG4gIC8qXG4gICAqIE1vdmUgbm9kZSBvcGVyYXRpb24gc3BlY2lhbGl6ZWQgZm9yIGZpc2ggZXllIHZpZXcgZXhwYW5kIG9wZXJhdGlvblxuICAgKiBNb3ZlcyB0aGUgbm9kZSBieSBtb3ZpbmcgaXRzIGRlc2NhbmRlbnRzLiBNb3ZlbWVudCBpcyBhbmltYXRlZCBpZiBib3RoIHNpbmdsZSBhbmQgYW5pbWF0ZSBmbGFncyBhcmUgdHJ1dGh5LlxuICAgKi9cbiAgZmlzaEV5ZVZpZXdNb3ZlTm9kZTogZnVuY3Rpb24gKG5vZGUsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XG4gICAgdmFyIGNoaWxkcmVuTGlzdCA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICBpZihub2RlLmlzUGFyZW50KCkpe1xuICAgICAgIGNoaWxkcmVuTGlzdCA9IG5vZGUuY2hpbGRyZW4oXCI6dmlzaWJsZVwiKTtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIC8qXG4gICAgICogSWYgdGhlIG5vZGUgaXMgc2ltcGxlIG1vdmUgaXRzZWxmIGRpcmVjdGx5IGVsc2UgbW92ZSBpdCBieSBtb3ZpbmcgaXRzIGNoaWxkcmVuIGJ5IGEgc2VsZiByZWN1cnNpdmUgY2FsbFxuICAgICAqL1xuICAgIGlmIChjaGlsZHJlbkxpc3QubGVuZ3RoID09IDApIHtcbiAgICAgIHZhciBuZXdQb3NpdGlvbiA9IHt4OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggKyBUX3gsIHk6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSArIFRfeX07XG4gICAgICBpZiAoIXNpbmdsZSB8fCAhYW5pbWF0ZSkge1xuICAgICAgICBub2RlLnBvc2l0aW9uKG5ld1Bvc2l0aW9uKTsgLy8gYXQgdGhpcyBwb2ludCwgcG9zaXRpb24gc2hvdWxkIGJlIHVwZGF0ZWRcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgIW5vZGVUb0V4cGFuZC5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcblxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIGFsbCBub2RlcyBhcmUgbW92ZWQgd2UgYXJlIHJlYWR5IHRvIGV4cGFuZCBzbyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb25cbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xuXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDEwMDBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgeFBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcbiAgICB2YXIgeF9hID0gMC4wO1xuXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICB4X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3gnKSArIChwYXJlbnQud2lkdGgoKSAvIDIpO1xuICAgIH1cbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuXG4gICAgZWxzZSB7XG4gICAgICB4X2EgPSBub2RlLnBvc2l0aW9uKCd4Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHhfYTtcbiAgfSxcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcblxuICAgIHZhciB5X2EgPSAwLjA7XG5cbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgIHlfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneScpICsgKHBhcmVudC5oZWlnaHQoKSAvIDIpO1xuICAgIH1cbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuXG4gICAgZWxzZSB7XG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHlfYTtcbiAgfSxcbiAgLypcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxuICAgKiB3aXRoIHRoZSBzYW1lIHJvb3QgcGFyYW1ldGVyLFxuICAgKiByZW1vdmUgdGhlIGNoaWxkIGFuZCBhZGQgdGhlIHJlbW92ZWQgY2hpbGQgdG8gdGhlIGNvbGxhcHNlZGNoaWxkcmVuIGRhdGFcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXG4gICAqIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiBrZWVwcyB0aGUgbm9kZXMgdG8gcmVzdG9yZSB3aGVuIHRoZVxuICAgKiByb290IGlzIGV4cGFuZGVkXG4gICAqL1xuICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKGNoaWxkLCByb290KTtcbiAgICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xuICAgICAgcGFyZW50RGF0YVtjaGlsZC5pZCgpXSA9IGNoaWxkLnBhcmVudCgpO1xuICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhID0gcGFyZW50RGF0YTtcbiAgICAgIHZhciByZW1vdmVkQ2hpbGQgPSBjaGlsZC5yZW1vdmUoKTtcbiAgICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkQ2hpbGQ7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHJlbW92ZWRDaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBpc01ldGFFZGdlOiBmdW5jdGlvbihlZGdlKSB7XG4gICAgcmV0dXJuIGVkZ2UuaGFzQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xuICB9LFxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgcmVsYXRlZE5vZGVzID0gbm9kZS5kZXNjZW5kYW50cygpO1xuICAgIHZhciBlZGdlcyA9IHJlbGF0ZWROb2Rlcy5lZGdlc1dpdGgoY3kubm9kZXMoKS5ub3QocmVsYXRlZE5vZGVzLnVuaW9uKG5vZGUpKSk7XG4gICAgXG4gICAgdmFyIHJlbGF0ZWROb2RlTWFwID0ge307XG4gICAgXG4gICAgcmVsYXRlZE5vZGVzLmVhY2goZnVuY3Rpb24oZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICByZWxhdGVkTm9kZU1hcFtlbGUuaWQoKV0gPSB0cnVlO1xuICAgIH0pO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XG4gICAgICB2YXIgc291cmNlID0gZWRnZS5zb3VyY2UoKTtcbiAgICAgIHZhciB0YXJnZXQgPSBlZGdlLnRhcmdldCgpO1xuICAgICAgXG4gICAgICBpZiAoIXRoaXMuaXNNZXRhRWRnZShlZGdlKSkgeyAvLyBpcyBvcmlnaW5hbFxuICAgICAgICB2YXIgb3JpZ2luYWxFbmRzRGF0YSA9IHtcbiAgICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XG4gICAgICAgIGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJywgb3JpZ2luYWxFbmRzRGF0YSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGVkZ2UubW92ZSh7XG4gICAgICAgIHRhcmdldDogIXJlbGF0ZWROb2RlTWFwW3RhcmdldC5pZCgpXSA/IHRhcmdldC5pZCgpIDogbm9kZS5pZCgpLFxuICAgICAgICBzb3VyY2U6ICFyZWxhdGVkTm9kZU1hcFtzb3VyY2UuaWQoKV0gPyBzb3VyY2UuaWQoKSA6IG5vZGUuaWQoKVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBmaW5kTmV3RW5kOiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBub2RlO1xuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xuICAgIHZhciBwYXJlbnQgPSBwYXJlbnREYXRhW2N1cnJlbnQuaWQoKV07XG4gICAgXG4gICAgd2hpbGUoICFjdXJyZW50Lmluc2lkZSgpICkge1xuICAgICAgY3VycmVudCA9IHBhcmVudDtcbiAgICAgIHBhcmVudCA9IHBhcmVudERhdGFbcGFyZW50LmlkKCldO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY3VycmVudDtcbiAgfSxcbiAgcmVwYWlyRWRnZXM6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgY29ubmVjdGVkTWV0YUVkZ2VzID0gbm9kZS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbm5lY3RlZE1ldGFFZGdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGVkZ2UgPSBjb25uZWN0ZWRNZXRhRWRnZXNbaV07XG4gICAgICB2YXIgb3JpZ2luYWxFbmRzID0gZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnKTtcbiAgICAgIHZhciBjdXJyZW50U3JjSWQgPSBlZGdlLmRhdGEoJ3NvdXJjZScpO1xuICAgICAgdmFyIGN1cnJlbnRUZ3RJZCA9IGVkZ2UuZGF0YSgndGFyZ2V0Jyk7XG4gICAgICBcbiAgICAgIGlmICggY3VycmVudFNyY0lkID09PSBub2RlLmlkKCkgKSB7XG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUoe1xuICAgICAgICAgIHNvdXJjZTogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy5zb3VyY2UpLmlkKClcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMudGFyZ2V0KS5pZCgpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoIGVkZ2UuZGF0YSgnc291cmNlJykgPT09IG9yaWdpbmFsRW5kcy5zb3VyY2UuaWQoKSAmJiBlZGdlLmRhdGEoJ3RhcmdldCcpID09PSBvcmlnaW5hbEVuZHMudGFyZ2V0LmlkKCkgKSB7XG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcbiAgICAgICAgZWRnZS5yZW1vdmVEYXRhKCdvcmlnaW5hbEVuZHMnKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIC8qbm9kZSBpcyBhbiBvdXRlciBub2RlIG9mIHJvb3RcbiAgIGlmIHJvb3QgaXMgbm90IGl0J3MgYW5jaGVzdG9yXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXG4gIGlzT3V0ZXJOb2RlOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkgey8vKi8vXG4gICAgdmFyIHRlbXAgPSBub2RlO1xuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcbiAgICAgIGlmICh0ZW1wID09IHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdGVtcCA9IHRlbXAucGFyZW50KClbMF07XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICAvKipcbiAgICogR2V0IGFsbCBjb2xsYXBzZWQgY2hpbGRyZW4gLSBpbmNsdWRpbmcgbmVzdGVkIG9uZXNcbiAgICogQHBhcmFtIG5vZGUgOiBhIGNvbGxhcHNlZCBub2RlXG4gICAqIEBwYXJhbSBjb2xsYXBzZWRDaGlsZHJlbiA6IGEgY29sbGVjdGlvbiB0byBzdG9yZSB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm4gOiBjb2xsYXBzZWQgY2hpbGRyZW5cbiAgICovXG4gIGdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHk6IGZ1bmN0aW9uKG5vZGUsIGNvbGxhcHNlZENoaWxkcmVuKXtcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJykgfHwgW107XG4gICAgdmFyIGk7XG4gICAgZm9yIChpPTA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICBpZiAoY2hpbGRyZW5baV0uZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKSl7XG4gICAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24odGhpcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KGNoaWxkcmVuW2ldLCBjb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgfVxuICAgICAgY29sbGFwc2VkQ2hpbGRyZW4gPSBjb2xsYXBzZWRDaGlsZHJlbi51bmlvbihjaGlsZHJlbltpXSk7XG4gICAgfVxuICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcbiAgfSxcbiAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gc3RhcnQgc2VjdGlvbiBlZGdlIGV4cGFuZCBjb2xsYXBzZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuICBjb2xsYXBzZUdpdmVuRWRnZXM6IGZ1bmN0aW9uIChlZGdlcywgb3B0aW9ucykge1xuICAgIGVkZ2VzLnVuc2VsZWN0KCk7XG4gICAgdmFyIG5vZGVzID0gZWRnZXMuY29ubmVjdGVkTm9kZXMoKTtcbiAgICB2YXIgZWRnZXNUb0NvbGxhcHNlID0ge307XG4gICAgLy8gZ3JvdXAgZWRnZXMgYnkgdHlwZSBpZiB0aGlzIG9wdGlvbiBpcyBzZXQgdG8gdHJ1ZVxuICAgIGlmIChvcHRpb25zLmdyb3VwRWRnZXNPZlNhbWVUeXBlT25Db2xsYXBzZSkge1xuICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xuICAgICAgICB2YXIgZWRnZVR5cGUgPSBcInVua25vd25cIjtcbiAgICAgICAgaWYgKG9wdGlvbnMuZWRnZVR5cGVJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlZGdlVHlwZSA9IG9wdGlvbnMuZWRnZVR5cGVJbmZvIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcHRpb25zLmVkZ2VUeXBlSW5mby5jYWxsKGVkZ2UpIDogZWRnZS5kYXRhKClbb3B0aW9ucy5lZGdlVHlwZUluZm9dO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2UuaGFzT3duUHJvcGVydHkoZWRnZVR5cGUpKSB7XG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5lZGdlcyA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZWRnZXMuYWRkKGVkZ2UpO1xuXG4gICAgICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZGlyZWN0aW9uVHlwZSA9PSBcInVuaWRpcmVjdGlvblwiICYmIChlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLnNvdXJjZSAhPSBlZGdlLnNvdXJjZSgpLmlkKCkgfHwgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS50YXJnZXQgIT0gZWRnZS50YXJnZXQoKS5pZCgpKSkge1xuICAgICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5kaXJlY3Rpb25UeXBlID0gXCJiaWRpcmVjdGlvblwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZWRnZXNYID0gY3kuY29sbGVjdGlvbigpO1xuICAgICAgICAgIGVkZ2VzWCA9IGVkZ2VzWC5hZGQoZWRnZSk7XG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXSA9IHsgZWRnZXM6IGVkZ2VzWCwgZGlyZWN0aW9uVHlwZTogXCJ1bmlkaXJlY3Rpb25cIiwgc291cmNlOiBlZGdlLnNvdXJjZSgpLmlkKCksIHRhcmdldDogZWRnZS50YXJnZXQoKS5pZCgpIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0gPSB7IGVkZ2VzOiBlZGdlcywgZGlyZWN0aW9uVHlwZTogXCJ1bmlkaXJlY3Rpb25cIiwgc291cmNlOiBlZGdlc1swXS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVkZ2VzWzBdLnRhcmdldCgpLmlkKCkgfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS5kaXJlY3Rpb25UeXBlID09IFwidW5pZGlyZWN0aW9uXCIgJiYgKGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0uc291cmNlICE9IGVkZ2VzW2ldLnNvdXJjZSgpLmlkKCkgfHwgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS50YXJnZXQgIT0gZWRnZXNbaV0udGFyZ2V0KCkuaWQoKSkpIHtcbiAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLmRpcmVjdGlvblR5cGUgPSBcImJpZGlyZWN0aW9uXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH1cbiAgICB2YXIgbmV3RWRnZXMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVkZ2VHcm91cFR5cGUgaW4gZWRnZXNUb0NvbGxhcHNlKSB7XG4gICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBlZGdlcy50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZWVkZ2UnKTtcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzKTtcbiAgICAgIHZhciBuZXdFZGdlID0ge307XG4gICAgICBuZXdFZGdlLmdyb3VwID0gXCJlZGdlc1wiO1xuICAgICAgbmV3RWRnZS5kYXRhID0ge307XG4gICAgICBuZXdFZGdlLmRhdGEuc291cmNlID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLnNvdXJjZTtcbiAgICAgIG5ld0VkZ2UuZGF0YS50YXJnZXQgPSBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0udGFyZ2V0O1xuICAgICAgdmFyIGlkMSA9IG5vZGVzWzBdLmlkKCk7XG4gICAgICB2YXIgaWQyID0gaWQxO1xuICAgICAgaWYgKG5vZGVzWzFdKSB7XG4gICAgICAgICAgaWQyID0gbm9kZXNbMV0uaWQoKTtcbiAgICAgIH1cbiAgICAgIG5ld0VkZ2UuZGF0YS5pZCA9IFwiY29sbGFwc2VkRWRnZV9cIiArIGlkMSArIFwiX1wiICsgaWQyICsgXCJfXCIgKyBlZGdlR3JvdXBUeXBlICsgXCJfXCIgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBEYXRlLm5vdygpKTtcbiAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IGN5LmNvbGxlY3Rpb24oKTtcblxuICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICAgICAgbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzLmFkZChlZGdlKTtcbiAgICAgIH0pO1xuXG4gICAgICBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMgPSB0aGlzLmNoZWNrNG5lc3RlZENvbGxhcHNlKG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcywgb3B0aW9ucyk7XG5cbiAgICAgIHZhciBlZGdlc1R5cGVGaWVsZCA9IFwiZWRnZVR5cGVcIjtcbiAgICAgIGlmIChvcHRpb25zLmVkZ2VUeXBlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGVkZ2VzVHlwZUZpZWxkID0gb3B0aW9ucy5lZGdlVHlwZUluZm8gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGVkZ2VzVHlwZUZpZWxkIDogb3B0aW9ucy5lZGdlVHlwZUluZm87XG4gICAgICB9XG4gICAgICBuZXdFZGdlLmRhdGFbZWRnZXNUeXBlRmllbGRdID0gZWRnZUdyb3VwVHlwZTtcblxuICAgICAgbmV3RWRnZS5kYXRhW1wiZGlyZWN0aW9uVHlwZVwiXSA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5kaXJlY3Rpb25UeXBlO1xuICAgICAgbmV3RWRnZS5jbGFzc2VzID0gXCJjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLWVkZ2VcIjtcblxuICAgICAgbmV3RWRnZXMucHVzaChuZXdFZGdlKTtcbiAgICAgIGN5LnJlbW92ZShlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZWRnZXMpO1xuICAgICAgZWRnZXMudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYWZ0ZXJjb2xsYXBzZWVkZ2UnKTtcbiAgICB9XG5cbiAgICByZXN1bHQuZWRnZXMgPSBjeS5hZGQobmV3RWRnZXMpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgY2hlY2s0bmVzdGVkQ29sbGFwc2U6IGZ1bmN0aW9uKGVkZ2VzMmNvbGxhcHNlLCBvcHRpb25zKXtcbiAgICBpZiAob3B0aW9ucy5hbGxvd05lc3RlZEVkZ2VDb2xsYXBzZSkge1xuICAgICAgcmV0dXJuIGVkZ2VzMmNvbGxhcHNlO1xuICAgIH1cbiAgICBsZXQgciA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVkZ2VzMmNvbGxhcHNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgY3VyciA9IGVkZ2VzMmNvbGxhcHNlW2ldO1xuICAgICAgbGV0IGNvbGxhcHNlZEVkZ2VzID0gY3Vyci5kYXRhKCdjb2xsYXBzZWRFZGdlcycpO1xuICAgICAgaWYgKGNvbGxhcHNlZEVkZ2VzICYmIGNvbGxhcHNlZEVkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgciA9IHIuYWRkKGNvbGxhcHNlZEVkZ2VzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHIgPSByLmFkZChjdXJyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH0sXG5cbiAgZXhwYW5kRWRnZTogZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICBlZGdlLnVuc2VsZWN0KCk7XG4gICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9XG4gICAgdmFyIGVkZ2VzID0gZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpO1xuICAgIGlmIChlZGdlcyAhPT0gdW5kZWZpbmVkICYmIGVkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVkZ2UudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYmVmb3JlZXhwYW5kZWRnZScpO1xuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChlZGdlKTtcbiAgICAgIGN5LnJlbW92ZShlZGdlKTtcbiAgICAgIHJlc3VsdC5lZGdlcyA9IGN5LmFkZChlZGdlcyk7XG4gICAgICBlZGdlLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kZWRnZScpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8vaWYgdGhlIGVkZ2VzIGFyZSBvbmx5IGJldHdlZW4gdHdvIG5vZGVzICh2YWxpZCBmb3IgY29sbHBhc2luZykgcmV0dXJucyB0aGUgdHdvIG5vZGVzIGVsc2UgaXQgcmV0dXJucyBmYWxzZVxuICBpc1ZhbGlkRWRnZXNGb3JDb2xsYXBzZTogZnVuY3Rpb24gKGVkZ2VzKSB7XG4gICAgdmFyIGVuZFBvaW50cyA9IHRoaXMuZ2V0RWRnZXNEaXN0aW5jdEVuZFBvaW50cyhlZGdlcyk7XG4gICAgaWYgKGVuZFBvaW50cy5sZW5ndGggIT0gMikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZW5kUG9pbnRzO1xuICAgIH1cbiAgfSxcblxuICAvL3JldHVybnMgYSBsaXN0IG9mIGRpc3RpbmN0IGVuZHBvaW50cyBvZiBhIHNldCBvZiBlZGdlcy5cbiAgZ2V0RWRnZXNEaXN0aW5jdEVuZFBvaW50czogZnVuY3Rpb24gKGVkZ2VzKSB7XG4gICAgdmFyIGVuZFBvaW50cyA9IFtdO1xuICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICAgIGlmICghdGhpcy5jb250YWluc0VsZW1lbnQoZW5kUG9pbnRzLCBlZGdlLnNvdXJjZSgpKSkge1xuICAgICAgICBlbmRQb2ludHMucHVzaChlZGdlLnNvdXJjZSgpKTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5jb250YWluc0VsZW1lbnQoZW5kUG9pbnRzLCBlZGdlLnRhcmdldCgpKSkge1xuICAgICAgICBlbmRQb2ludHMucHVzaChlZGdlLnRhcmdldCgpKTtcblxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICByZXR1cm4gZW5kUG9pbnRzO1xuICB9LFxuXG4gIC8vZnVuY3Rpb24gdG8gY2hlY2sgaWYgYSBsaXN0IG9mIGVsZW1lbnRzIGNvbnRhaW5zIHRoZSBnaXZlbiBlbGVtZW50IGJ5IGxvb2tpbmcgYXQgaWQoKVxuICBjb250YWluc0VsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50cywgZWxlbWVudCkge1xuICAgIHZhciBleGlzdHMgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZWxlbWVudHNbaV0uaWQoKSA9PSBlbGVtZW50LmlkKCkpIHtcbiAgICAgICAgZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBleGlzdHM7XG4gIH1cbiAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZW5kIHNlY3Rpb24gZWRnZSBleHBhbmQgY29sbGFwc2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbn1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcztcbiIsIihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUpIHtcblxuICAgIGlmICghY3l0b3NjYXBlKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcblxuICAgIHZhciB1bmRvUmVkb1V0aWxpdGllcyA9IHJlcXVpcmUoJy4vdW5kb1JlZG9VdGlsaXRpZXMnKTtcbiAgICB2YXIgY3VlVXRpbGl0aWVzID0gcmVxdWlyZShcIi4vY3VlVXRpbGl0aWVzXCIpO1xuICAgIHZhciBzYXZlTG9hZFV0aWxzID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGV4dGVuZE9wdGlvbnMob3B0aW9ucywgZXh0ZW5kQnkpIHtcbiAgICAgIHZhciB0ZW1wT3B0cyA9IHt9O1xuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBleHRlbmRCeSlcbiAgICAgICAgaWYgKHRlbXBPcHRzLmhhc093blByb3BlcnR5KGtleSkpXG4gICAgICAgICAgdGVtcE9wdHNba2V5XSA9IGV4dGVuZEJ5W2tleV07XG4gICAgICByZXR1cm4gdGVtcE9wdHM7XG4gICAgfVxuXG4gICAgLy8gZXZhbHVhdGUgc29tZSBzcGVjaWZpYyBvcHRpb25zIGluIGNhc2Ugb2YgdGhleSBhcmUgc3BlY2lmaWVkIGFzIGZ1bmN0aW9ucyB0byBiZSBkeW5hbWljYWxseSBjaGFuZ2VkXG4gICAgZnVuY3Rpb24gZXZhbE9wdGlvbnMob3B0aW9ucykge1xuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcbiAgICAgIHZhciBmaXNoZXllID0gdHlwZW9mIG9wdGlvbnMuZmlzaGV5ZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZmlzaGV5ZS5jYWxsKCkgOiBvcHRpb25zLmZpc2hleWU7XG5cbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XG4gICAgICBvcHRpb25zLmZpc2hleWUgPSBmaXNoZXllO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUV4dGVuc2lvbkFQSShjeSwgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMpIHtcbiAgICAgIHZhciBhcGkgPSB7fTsgLy8gQVBJIHRvIGJlIHJldHVybmVkXG4gICAgICAvLyBzZXQgZnVuY3Rpb25zXG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZU5ld09wdGlvbnMob3B0cykge1xuICAgICAgICB2YXIgY3VycmVudE9wdHMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICBpZiAob3B0cy5jdWVFbmFibGVkICYmICFjdXJyZW50T3B0cy5jdWVFbmFibGVkKSB7XG4gICAgICAgICAgYXBpLmVuYWJsZUN1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFvcHRzLmN1ZUVuYWJsZWQgJiYgY3VycmVudE9wdHMuY3VlRW5hYmxlZCkge1xuICAgICAgICAgIGFwaS5kaXNhYmxlQ3VlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gaXNPbmx5MVBhaXIoZWRnZXMpIHtcbiAgICAgICAgbGV0IHJlbGF0ZWRFZGdlc0FyciA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3Qgc3JjSWQgPSBlZGdlc1tpXS5zb3VyY2UoKS5pZCgpO1xuICAgICAgICAgIGNvbnN0IHRhcmdldElkID0gZWRnZXNbaV0udGFyZ2V0KCkuaWQoKTtcbiAgICAgICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgICAgICBvYmpbc3JjSWRdID0gdHJ1ZTtcbiAgICAgICAgICBvYmpbdGFyZ2V0SWRdID0gdHJ1ZTtcbiAgICAgICAgICByZWxhdGVkRWRnZXNBcnIucHVzaChvYmopO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVsYXRlZEVkZ2VzQXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgcmVsYXRlZEVkZ2VzQXJyLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlzMSA9IE9iamVjdC5rZXlzKHJlbGF0ZWRFZGdlc0FycltpXSk7XG4gICAgICAgICAgICBjb25zdCBrZXlzMiA9IE9iamVjdC5rZXlzKHJlbGF0ZWRFZGdlc0FycltqXSk7XG4gICAgICAgICAgICBjb25zdCBhbGxLZXlzID0gbmV3IFNldChrZXlzMS5jb25jYXQoa2V5czIpKTtcbiAgICAgICAgICAgIGlmIChhbGxLZXlzLnNpemUgIT0ga2V5czEubGVuZ3RoIHx8IGFsbEtleXMuc2l6ZSAhPSBrZXlzMi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gc2V0IGFsbCBvcHRpb25zIGF0IG9uY2VcbiAgICAgIGFwaS5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhvcHRzKTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBvcHRzKTtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHRlbmRPcHRpb25zID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgbmV3T3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGhhbmRsZU5ld09wdGlvbnMobmV3T3B0aW9ucyk7XG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB0aGUgb3B0aW9uIHdob3NlIG5hbWUgaXMgZ2l2ZW5cbiAgICAgIGFwaS5zZXRPcHRpb24gPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgb3B0c1tuYW1lXSA9IHZhbHVlO1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuXG4gICAgICAgIGhhbmRsZU5ld09wdGlvbnMobmV3T3B0aW9ucyk7XG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xuXG4gICAgICAvLyBjb2xsYXBzZSBnaXZlbiBlbGVzIGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cbiAgICAgIGFwaS5jb2xsYXBzZSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuY29sbGFwc2libGVOb2RlcyhfZWxlcyk7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyByZWN1cnNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXG4gICAgICBhcGkuY29sbGFwc2VSZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuY29sbGFwc2libGVOb2RlcyhfZWxlcyk7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxhcHNlKGVsZXMudW5pb24oZWxlcy5kZXNjZW5kYW50cygpKSwgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gZXhwYW5kIGdpdmVuIGVsZXMgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxuICAgICAgYXBpLmV4cGFuZCA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gZXhwYW5kIGdpdmVuIGVsZXMgcmVjdXNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXG4gICAgICBhcGkuZXhwYW5kUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmV4cGFuZGFibGVOb2RlcyhfZWxlcyk7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRBbGxOb2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIENvcmUgZnVuY3Rpb25zXG5cbiAgICAgIC8vIGNvbGxhcHNlIGFsbCBjb2xsYXBzaWJsZSBub2Rlc1xuICAgICAgYXBpLmNvbGxhcHNlQWxsID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2VSZWN1cnNpdmVseSh0aGlzLmNvbGxhcHNpYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gZXhwYW5kIGFsbCBleHBhbmRhYmxlIG5vZGVzXG4gICAgICBhcGkuZXhwYW5kQWxsID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVjdXJzaXZlbHkodGhpcy5leHBhbmRhYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuXG4gICAgICAvLyBVdGlsaXR5IGZ1bmN0aW9uc1xuXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGV4cGFuZGFibGVcbiAgICAgIGFwaS5pc0V4cGFuZGFibGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XG4gICAgICB9O1xuXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGNvbGxhcHNpYmxlXG4gICAgICBhcGkuaXNDb2xsYXBzaWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiAhdGhpcy5pc0V4cGFuZGFibGUobm9kZSkgJiYgbm9kZS5pc1BhcmVudCgpO1xuICAgICAgfTtcblxuICAgICAgLy8gZ2V0IGNvbGxhcHNpYmxlIG9uZXMgaW5zaWRlIGdpdmVuIG5vZGVzIGlmIG5vZGVzIHBhcmFtZXRlciBpcyBub3Qgc3BlY2lmaWVkIGNvbnNpZGVyIGFsbCBub2Rlc1xuICAgICAgYXBpLmNvbGxhcHNpYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG5vZGVzID0gX25vZGVzID8gX25vZGVzIDogY3kubm9kZXMoKTtcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGVsZSA9IGk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLmlzQ29sbGFwc2libGUoZWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBnZXQgZXhwYW5kYWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcbiAgICAgIGFwaS5leHBhbmRhYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG5vZGVzID0gX25vZGVzID8gX25vZGVzIDogY3kubm9kZXMoKTtcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGVsZSA9IGk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLmlzRXhwYW5kYWJsZShlbGUpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIEdldCB0aGUgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIGNvbGxhcHNlZCBub2RlIHdoaWNoIGFyZSByZW1vdmVkIGR1cmluZyBjb2xsYXBzZSBvcGVyYXRpb25cbiAgICAgIGFwaS5nZXRDb2xsYXBzZWRDaGlsZHJlbiA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XG4gICAgICB9O1xuXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiByZWN1cnNpdmVseSBpbmNsdWRpbmcgbmVzdGVkIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICogUmV0dXJuZWQgdmFsdWUgaW5jbHVkZXMgZWRnZXMgYW5kIG5vZGVzLCB1c2Ugc2VsZWN0b3IgdG8gZ2V0IGVkZ2VzIG9yIG5vZGVzXG4gICAgICAgKiBAcGFyYW0gbm9kZSA6IGEgY29sbGFwc2VkIG5vZGVcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICovXG4gICAgICBhcGkuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkobm9kZSwgY29sbGFwc2VkQ2hpbGRyZW4pO1xuICAgICAgfTtcblxuICAgICAgLyoqIEdldCBjb2xsYXBzZWQgY2hpbGRyZW4gb2YgYWxsIGNvbGxhcHNlZCBub2RlcyByZWN1cnNpdmVseSBpbmNsdWRpbmcgbmVzdGVkIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICogUmV0dXJuZWQgdmFsdWUgaW5jbHVkZXMgZWRnZXMgYW5kIG5vZGVzLCB1c2Ugc2VsZWN0b3IgdG8gZ2V0IGVkZ2VzIG9yIG5vZGVzXG4gICAgICAgKiBAcmV0dXJuIGFsbCBjb2xsYXBzZWQgY2hpbGRyZW5cbiAgICAgICAqL1xuICAgICAgYXBpLmdldEFsbENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICAgICAgdmFyIGNvbGxhcHNlZE5vZGVzID0gY3kubm9kZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlXCIpO1xuICAgICAgICB2YXIgajtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGNvbGxhcHNlZE5vZGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29sbGFwc2VkQ2hpbGRyZW4gPSBjb2xsYXBzZWRDaGlsZHJlbi51bmlvbih0aGlzLmdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkoY29sbGFwc2VkTm9kZXNbal0pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XG4gICAgICB9O1xuICAgICAgLy8gVGhpcyBtZXRob2QgZm9yY2VzIHRoZSB2aXN1YWwgY3VlIHRvIGJlIGNsZWFyZWQuIEl0IGlzIHRvIGJlIGNhbGxlZCBpbiBleHRyZW1lIGNhc2VzXG4gICAgICBhcGkuY2xlYXJWaXN1YWxDdWUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBjeS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScpO1xuICAgICAgfTtcblxuICAgICAgYXBpLmRpc2FibGVDdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuY3VlRW5hYmxlZCkge1xuICAgICAgICAgIGN1ZVV0aWxpdGllcygndW5iaW5kJywgY3ksIGFwaSk7XG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGFwaS5lbmFibGVDdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLmN1ZUVuYWJsZWQpIHtcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3JlYmluZCcsIGN5LCBhcGkpO1xuICAgICAgICAgIG9wdGlvbnMuY3VlRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGFwaS5nZXRQYXJlbnQgPSBmdW5jdGlvbiAobm9kZUlkKSB7XG4gICAgICAgIGlmIChjeS5nZXRFbGVtZW50QnlJZChub2RlSWQpWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YXIgcGFyZW50RGF0YSA9IGdldFNjcmF0Y2goY3ksICdwYXJlbnREYXRhJyk7XG4gICAgICAgICAgcmV0dXJuIHBhcmVudERhdGFbbm9kZUlkXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKS5wYXJlbnQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgYXBpLmNvbGxhcHNlRWRnZXMgPSBmdW5jdGlvbiAoZWRnZXMsIG9wdHMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9O1xuICAgICAgICBpZiAoZWRnZXMubGVuZ3RoIDwgMikgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgaWYgKCFpc09ubHkxUGFpcihlZGdlcykpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuICAgICAgYXBpLmV4cGFuZEVkZ2VzID0gZnVuY3Rpb24gKGVkZ2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7IGVkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCkgfVxuICAgICAgICBpZiAoZWRnZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDtcblxuICAgICAgICAvL2lmKHR5cGVvZiBlZGdlc1tTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nKXsvL2NvbGxlY3Rpb24gb2YgZWRnZXMgaXMgcGFzc2VkXG4gICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlKTtcbiAgICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XG4gICAgICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQub2xkRWRnZXMpO1xuXG4gICAgICAgIH0pO1xuICAgICAgICAvKiAgfWVsc2V7Ly9vbmUgZWRnZSBwYXNzZWRcbiAgICAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEVkZ2UoZWRnZXMpO1xuICAgICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XG4gICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcbiAgICAgICAgICAgXG4gICAgICAgICB9ICovXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuXG4gICAgICBhcGkuY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyA9IGZ1bmN0aW9uIChub2Rlcywgb3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcbiAgICAgICAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICAgICAgICBsaXN0XG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGZpcnN0LCBuKSB7XG4gICAgICAgICAgICAgIHZhciB0YWlsID0gbGlzdC5zbGljZShuICsgMSwgbGlzdC5sZW5ndGgpO1xuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKFtmaXJzdCwgaXRlbV0pXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm4gcGFpcnM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5vZGVzUGFpcnMgPSBwYWlyd2lzZShub2Rlcyk7XG4gICAgICAgIC8vIGZvciBzZWxmLWxvb3BzXG4gICAgICAgIG5vZGVzUGFpcnMucHVzaCguLi5ub2Rlcy5tYXAoeCA9PiBbeCwgeF0pKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9O1xuICAgICAgICBub2Rlc1BhaXJzLmZvckVhY2goZnVuY3Rpb24gKG5vZGVQYWlyKSB7XG4gICAgICAgICAgY29uc3QgaWQxID0gbm9kZVBhaXJbMV0uaWQoKTtcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnW3NvdXJjZSA9IFwiJyArIGlkMSArICdcIl0sW3RhcmdldCA9IFwiJyArIGlkMSArICdcIl0nKTtcbiAgICAgICAgICAvLyBlZGdlcyBmb3Igc2VsZi1sb29wc1xuICAgICAgICAgIGlmIChub2RlUGFpclswXS5pZCgpID09PSBpZDEpIHtcbiAgICAgICAgICAgIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJ1tzb3VyY2UgPSBcIicgKyBpZDEgKyAnXCJdW3RhcmdldCA9IFwiJyArIGlkMSArICdcIl0nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGVkZ2VzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbkVkZ2VzKGVkZ2VzLCB0ZW1wT3B0aW9ucylcbiAgICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcbiAgICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuXG4gICAgICB9O1xuXG4gICAgICBhcGkuZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMgPSBmdW5jdGlvbiAobm9kZXMpIHtcbiAgICAgICAgdmFyIGVkZ2VzVG9FeHBhbmQgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcbiAgICAgICAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICAgICAgICBsaXN0XG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGZpcnN0LCBuKSB7XG4gICAgICAgICAgICAgIHZhciB0YWlsID0gbGlzdC5zbGljZShuICsgMSwgbGlzdC5sZW5ndGgpO1xuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKFtmaXJzdCwgaXRlbV0pXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm4gcGFpcnM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5vZGVzUGFpcnMgPSBwYWlyd2lzZShub2Rlcyk7XG4gICAgICAgIC8vIGZvciBzZWxmLWxvb3BzXG4gICAgICAgIG5vZGVzUGFpcnMucHVzaCguLi5ub2Rlcy5tYXAoeCA9PiBbeCwgeF0pKTtcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlUGFpcikge1xuICAgICAgICAgIGNvbnN0IGlkMSA9IG5vZGVQYWlyWzFdLmlkKCk7XG4gICAgICAgICAgdmFyIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJy5jeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLWVkZ2Vbc291cmNlID0gXCInICsgaWQxICsgJ1wiXSxbdGFyZ2V0ID0gXCInICsgaWQxICsgJ1wiXScpO1xuICAgICAgICAgIC8vIGVkZ2VzIGZvciBzZWxmLWxvb3BzXG4gICAgICAgICAgaWYgKG5vZGVQYWlyWzBdLmlkKCkgPT09IGlkMSkge1xuICAgICAgICAgICAgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnW3NvdXJjZSA9IFwiJyArIGlkMSArICdcIl1bdGFyZ2V0ID0gXCInICsgaWQxICsgJ1wiXScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlZGdlc1RvRXhwYW5kID0gZWRnZXNUb0V4cGFuZC51bmlvbihlZGdlcyk7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgIHJldHVybiB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzVG9FeHBhbmQpO1xuICAgICAgfTtcblxuICAgICAgYXBpLmNvbGxhcHNlQWxsRWRnZXMgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzKGN5LmVkZ2VzKCkuY29ubmVjdGVkTm9kZXMoKSwgb3B0cyk7XG4gICAgICB9O1xuXG4gICAgICBhcGkuZXhwYW5kQWxsRWRnZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlZGdlcyA9IGN5LmVkZ2VzKFwiLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVwiKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9O1xuICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gdGhpcy5leHBhbmRFZGdlcyhlZGdlcyk7XG4gICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcbiAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcblxuICAgICAgYXBpLmxvYWRKc29uID0gZnVuY3Rpb24gKGpzb25TdHIpIHtcbiAgICAgICAgc2F2ZUxvYWRVdGlscy5sb2FkSnNvbihqc29uU3RyKTtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5zYXZlSnNvbiA9IGZ1bmN0aW9uIChlbGVtcywgZmlsZW5hbWUpIHtcbiAgICAgICAgc2F2ZUxvYWRVdGlscy5zYXZlSnNvbihlbGVtcywgZmlsZW5hbWUpO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIGFwaTsgLy8gUmV0dXJuIHRoZSBBUEkgaW5zdGFuY2VcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIHdob2xlIHNjcmF0Y2hwYWQgcmVzZXJ2ZWQgZm9yIHRoaXMgZXh0ZW5zaW9uIChvbiBhbiBlbGVtZW50IG9yIGNvcmUpIG9yIGdldCBhIHNpbmdsZSBwcm9wZXJ0eSBvZiBpdFxuICAgIGZ1bmN0aW9uIGdldFNjcmF0Y2goY3lPckVsZSwgbmFtZSkge1xuICAgICAgaWYgKGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnLCB7fSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzY3JhdGNoID0gY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xuICAgICAgdmFyIHJldFZhbCA9IChuYW1lID09PSB1bmRlZmluZWQpID8gc2NyYXRjaCA6IHNjcmF0Y2hbbmFtZV07XG4gICAgICByZXR1cm4gcmV0VmFsO1xuICAgIH1cblxuICAgIC8vIFNldCBhIHNpbmdsZSBwcm9wZXJ0eSBvbiBzY3JhdGNocGFkIG9mIGFuIGVsZW1lbnQgb3IgdGhlIGNvcmVcbiAgICBmdW5jdGlvbiBzZXRTY3JhdGNoKGN5T3JFbGUsIG5hbWUsIHZhbCkge1xuICAgICAgZ2V0U2NyYXRjaChjeU9yRWxlKVtuYW1lXSA9IHZhbDtcbiAgICB9XG5cbiAgICAvLyByZWdpc3RlciB0aGUgZXh0ZW5zaW9uIGN5LmV4cGFuZENvbGxhcHNlKClcbiAgICBjeXRvc2NhcGUoXCJjb3JlXCIsIFwiZXhwYW5kQ29sbGFwc2VcIiwgZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgIHZhciBjeSA9IHRoaXM7XG5cbiAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKSB8fCB7XG4gICAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQncyBqdXN0IGxheW91dCBvcHRpb25zIG9yIHdob2xlIGxheW91dCBmdW5jdGlvbi4gQ2hvb3NlIHlvdXIgc2lkZSFcbiAgICAgICAgZmlzaGV5ZTogdHJ1ZSwgLy8gd2hldGhlciB0byBwZXJmb3JtIGZpc2hleWUgdmlldyBhZnRlciBleHBhbmQvY29sbGFwc2UgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXG4gICAgICAgIGFuaW1hdGU6IHRydWUsIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSBvbiBkcmF3aW5nIGNoYW5nZXMgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXG4gICAgICAgIGFuaW1hdGlvbkR1cmF0aW9uOiAxMDAwLCAvLyB3aGVuIGFuaW1hdGUgaXMgdHJ1ZSwgdGhlIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyBvZiB0aGUgYW5pbWF0aW9uXG4gICAgICAgIHJlYWR5OiBmdW5jdGlvbiAoKSB7IH0sIC8vIGNhbGxiYWNrIHdoZW4gZXhwYW5kL2NvbGxhcHNlIGluaXRpYWxpemVkXG4gICAgICAgIHVuZG9hYmxlOiB0cnVlLCAvLyBhbmQgaWYgdW5kb1JlZG9FeHRlbnNpb24gZXhpc3RzLFxuXG4gICAgICAgIGN1ZUVuYWJsZWQ6IHRydWUsIC8vIFdoZXRoZXIgY3VlcyBhcmUgZW5hYmxlZFxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uOiAndG9wLWxlZnQnLCAvLyBkZWZhdWx0IGN1ZSBwb3NpdGlvbiBpcyB0b3AgbGVmdCB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiBwZXIgbm9kZSB0b29cbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVTaXplOiAxMiwgLy8gc2l6ZSBvZiBleHBhbmQtY29sbGFwc2UgY3VlXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU6IDgsIC8vIHNpemUgb2YgbGluZXMgdXNlZCBmb3IgZHJhd2luZyBwbHVzLW1pbnVzIGljb25zXG4gICAgICAgIGV4cGFuZEN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGV4cGFuZCBpY29uIGlmIHVuZGVmaW5lZCBkcmF3IHJlZ3VsYXIgZXhwYW5kIGN1ZVxuICAgICAgICBjb2xsYXBzZUN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGNvbGxhcHNlIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBjb2xsYXBzZSBjdWVcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVTZW5zaXRpdml0eTogMSwgLy8gc2Vuc2l0aXZpdHkgb2YgZXhwYW5kLWNvbGxhcHNlIGN1ZXNcblxuICAgICAgICBlZGdlVHlwZUluZm86IFwiZWRnZVR5cGVcIiwgLy90aGUgbmFtZSBvZiB0aGUgZmllbGQgdGhhdCBoYXMgdGhlIGVkZ2UgdHlwZSwgcmV0cmlldmVkIGZyb20gZWRnZS5kYXRhKCksIGNhbiBiZSBhIGZ1bmN0aW9uXG4gICAgICAgIGdyb3VwRWRnZXNPZlNhbWVUeXBlT25Db2xsYXBzZTogZmFsc2UsXG4gICAgICAgIGFsbG93TmVzdGVkRWRnZUNvbGxhcHNlOiB0cnVlLFxuICAgICAgICB6SW5kZXg6IDk5OSAvLyB6LWluZGV4IHZhbHVlIG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggY3VlIMSxbWFnZXMgYXJlIGRyYXduXG4gICAgICB9O1xuXG4gICAgICAvLyBJZiBvcHRzIGlzIG5vdCAnZ2V0JyB0aGF0IGlzIGl0IGlzIGEgcmVhbCBvcHRpb25zIG9iamVjdCB0aGVuIGluaXRpbGl6ZSB0aGUgZXh0ZW5zaW9uXG4gICAgICBpZiAob3B0cyAhPT0gJ2dldCcpIHtcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG5cbiAgICAgICAgdmFyIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9leHBhbmRDb2xsYXBzZVV0aWxpdGllcycpKGN5KTtcbiAgICAgICAgdmFyIGFwaSA9IGNyZWF0ZUV4dGVuc2lvbkFQSShjeSwgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMpOyAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHRoZSBBUEkgaW5zdGFuY2UgZm9yIHRoZSBleHRlbnNpb25cbiAgICAgICAgc2F2ZUxvYWRVdGlscyA9IHJlcXVpcmUoXCIuL3NhdmVMb2FkVXRpbGl0aWVzXCIpKGN5LCBhcGkpO1xuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnYXBpJywgYXBpKTtcblxuICAgICAgICB1bmRvUmVkb1V0aWxpdGllcyhjeSwgYXBpKTtcblxuICAgICAgICBjdWVVdGlsaXRpZXMob3B0aW9ucywgY3ksIGFwaSk7XG5cbiAgICAgICAgLy8gaWYgdGhlIGN1ZSBpcyBub3QgZW5hYmxlZCB1bmJpbmQgY3VlIGV2ZW50c1xuICAgICAgICBpZiAoIW9wdGlvbnMuY3VlRW5hYmxlZCkge1xuICAgICAgICAgIGN1ZVV0aWxpdGllcygndW5iaW5kJywgY3ksIGFwaSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5yZWFkeSkge1xuICAgICAgICAgIG9wdGlvbnMucmVhZHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgb3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHBhcmVudERhdGEgPSB7fTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnLCBwYXJlbnREYXRhKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGdldFNjcmF0Y2goY3ksICdhcGknKTsgLy8gRXhwb3NlIHRoZSBBUEkgdG8gdGhlIHVzZXJzXG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XG4gIH1cblxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1leHBhbmQtY29sbGFwc2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XG4gICAgfSk7XG4gIH1cblxuICBpZiAodHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcbiAgICByZWdpc3RlcihjeXRvc2NhcGUpO1xuICB9XG5cbn0pKCk7XG4iLCJmdW5jdGlvbiBzYXZlTG9hZFV0aWxpdGllcyhjeSwgYXBpKSB7XG4gIC8qKiBjb252ZXJ0cyBhcnJheSBvZiBKU09OIHRvIGEgY3l0b3NjYXBlLmpzIGNvbGxlY3Rpb24gKGJvdHRvbS11cCByZWN1cnNpdmUpXG4gICAqIGtlZXBzIGluZm9ybWF0aW9uIGFib3V0IHBhcmVudHMsIGFsbCBub2RlcyBhZGRlZCB0byBjeXRvc2NhcGUsIGFuZCBub2RlcyB0byBiZSBjb2xsYXBzZWRcbiAgKiBAcGFyYW0gIHt9IGpzb25BcnIgYW4gYXJyYXkgb2Ygb2JqZWN0cyAoYSBKU09OIGFycmF5KVxuICAqIEBwYXJhbSAge30gYWxsTm9kZXMgYSBjeXRvc2NhcGUuanMgY29sbGVjdGlvblxuICAqIEBwYXJhbSAge30gbm9kZXMyY29sbGFwc2UgYSBjeXRvc2NhcGUuanMgY29sbGVjdGlvblxuICAqIEBwYXJhbSAge30gbm9kZTJwYXJlbnQgYSBKUyBvYmplY3QgKHNpbXBseSBrZXktdmFsdWUgcGFpcnMpXG4gICovXG4gIGZ1bmN0aW9uIGpzb24yY3lDb2xsZWN0aW9uKGpzb25BcnIsIGFsbE5vZGVzLCBub2RlczJjb2xsYXBzZSwgbm9kZTJwYXJlbnQpIHtcbiAgICAvLyBwcm9jZXNzIGVkZ2VzIGxhc3Qgc2luY2UgdGhleSBkZXBlbmQgb24gbm9kZXNcbiAgICBqc29uQXJyLnNvcnQoKGEpID0+IHtcbiAgICAgIGlmIChhLmdyb3VwID09PSAnZWRnZXMnKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH0pO1xuXG4gICAgLy8gYWRkIGNvbXBvdW5kIG5vZGVzIGZpcnN0LCB0aGVuIGFkZCBvdGhlciBub2RlcyB0aGVuIGVkZ2VzXG4gICAgbGV0IGNvbGwgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBqc29uQXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBqc29uID0ganNvbkFycltpXTtcbiAgICAgIGNvbnN0IGQgPSBqc29uLmRhdGE7XG4gICAgICBpZiAoZC5wYXJlbnQpIHtcbiAgICAgICAgbm9kZTJwYXJlbnRbZC5pZF0gPSBkLnBhcmVudDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBvcyA9IHsgeDoganNvbi5wb3NpdGlvbi54LCB5OiBqc29uLnBvc2l0aW9uLnkgfTtcbiAgICAgIGNvbnN0IGUgPSBjeS5hZGQoanNvbik7XG4gICAgICBpZiAoZS5pc05vZGUoKSkge1xuICAgICAgICBhbGxOb2Rlcy5tZXJnZShlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGQub3JpZ2luYWxFbmRzKSB7XG4gICAgICAgIC8vIGFsbCBub2RlcyBzaG91bGQgYmUgaW4gdGhlIG1lbW9yeSAoaW4gY3kgb3Igbm90KVxuICAgICAgICBsZXQgc3JjID0gYWxsTm9kZXMuJGlkKGQub3JpZ2luYWxFbmRzLnNvdXJjZS5kYXRhLmlkKTtcbiAgICAgICAgaWYgKGQub3JpZ2luYWxFbmRzLnNvdXJjZS5kYXRhLnBhcmVudCkge1xuICAgICAgICAgIG5vZGUycGFyZW50W2Qub3JpZ2luYWxFbmRzLnNvdXJjZS5kYXRhLmlkXSA9IGQub3JpZ2luYWxFbmRzLnNvdXJjZS5kYXRhLnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdGd0ID0gYWxsTm9kZXMuJGlkKGQub3JpZ2luYWxFbmRzLnRhcmdldC5kYXRhLmlkKTtcbiAgICAgICAgaWYgKGQub3JpZ2luYWxFbmRzLnRhcmdldC5kYXRhLnBhcmVudCkge1xuICAgICAgICAgIG5vZGUycGFyZW50W2Qub3JpZ2luYWxFbmRzLnRhcmdldC5kYXRhLmlkXSA9IGQub3JpZ2luYWxFbmRzLnRhcmdldC5kYXRhLnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBlLmRhdGEoJ29yaWdpbmFsRW5kcycsIHsgc291cmNlOiBzcmMsIHRhcmdldDogdGd0IH0pO1xuICAgICAgfVxuICAgICAgaWYgKGQuY29sbGFwc2VkQ2hpbGRyZW4pIHtcbiAgICAgICAgbm9kZXMyY29sbGFwc2UubWVyZ2UoZSk7XG4gICAgICAgIGpzb24yY3lDb2xsZWN0aW9uKGQuY29sbGFwc2VkQ2hpbGRyZW4sIGFsbE5vZGVzLCBub2RlczJjb2xsYXBzZSwgbm9kZTJwYXJlbnQpO1xuICAgICAgICBjbGVhckNvbGxhcHNlTWV0YURhdGEoZSk7XG4gICAgICB9IGVsc2UgaWYgKGQuY29sbGFwc2VkRWRnZXMpIHtcbiAgICAgICAgZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycsIGpzb24yY3lDb2xsZWN0aW9uKGQuY29sbGFwc2VkRWRnZXMsIGFsbE5vZGVzLCBub2RlczJjb2xsYXBzZSwgbm9kZTJwYXJlbnQpKTtcbiAgICAgICAgLy8gZGVsZXRlIGNvbGxhcHNlZCBlZGdlcyBmcm9tIGN5XG4gICAgICAgIGN5LnJlbW92ZShlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJykpO1xuICAgICAgfVxuICAgICAgZS5wb3NpdGlvbihwb3MpOyAvLyBhZGRpbmcgbmV3IGVsZW1lbnRzIHRvIGEgY29tcG91bmQgbWlnaHQgY2hhbmdlIGl0cyBwb3NpdGlvblxuICAgICAgY29sbC5tZXJnZShlKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbGw7XG4gIH1cblxuICAvKiogY2xlYXJzIGFsbCB0aGUgZGF0YSByZWxhdGVkIHRvIGNvbGxhcHNlZCBub2RlXG4gICAqIEBwYXJhbSAge30gZSBhIGN5dG9zY2FwZSBlbGVtZW50XG4gICAqL1xuICBmdW5jdGlvbiBjbGVhckNvbGxhcHNlTWV0YURhdGEoZSkge1xuICAgIGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nLCBudWxsKTtcbiAgICBlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcbiAgICBlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScsIG51bGwpO1xuICAgIGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnLCBudWxsKTtcbiAgICBlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFgnLCBudWxsKTtcbiAgICBlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFknLCBudWxsKTtcbiAgICBlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplJywgbnVsbCk7XG4gIH1cblxuICAvKiogY29udmVydHMgY3l0b3NjYXBlIGNvbGxlY3Rpb24gdG8gSlNPTiBhcnJheS4oYm90dG9tLXVwIHJlY3Vyc2l2ZSlcbiAgICogQHBhcmFtICB7fSBlbGVtc1xuICAgKi9cbiAgZnVuY3Rpb24gY3lDb2xsZWN0aW9uMkpzb24oZWxlbXMpIHtcbiAgICBsZXQgciA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVsZW0gPSBlbGVtc1tpXTtcbiAgICAgIGxldCBqc29uT2JqID0gbnVsbDtcbiAgICAgIGlmICghZWxlbS5jb2xsYXBzZWRDaGlsZHJlbiAmJiAhZWxlbS5jb2xsYXBzZWRFZGdlcykge1xuICAgICAgICBqc29uT2JqID0gZWxlbS5jeS5qc29uKCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChlbGVtLmNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgIGVsZW0uY29sbGFwc2VkQ2hpbGRyZW4gPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKGVsZW0uY29sbGFwc2VkQ2hpbGRyZW4pKTtcbiAgICAgICAganNvbk9iaiA9IGVsZW0uY3kuanNvbigpO1xuICAgICAgICBqc29uT2JqLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBlbGVtLmNvbGxhcHNlZENoaWxkcmVuO1xuICAgICAgfSBlbHNlIGlmIChlbGVtLmNvbGxhcHNlZEVkZ2VzKSB7XG4gICAgICAgIGVsZW0uY29sbGFwc2VkRWRnZXMgPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKGVsZW0uY29sbGFwc2VkRWRnZXMpKTtcbiAgICAgICAganNvbk9iaiA9IGVsZW0uY3kuanNvbigpO1xuICAgICAgICBqc29uT2JqLmRhdGEuY29sbGFwc2VkRWRnZXMgPSBlbGVtLmNvbGxhcHNlZEVkZ2VzO1xuICAgICAgfVxuICAgICAgaWYgKGVsZW0ub3JpZ2luYWxFbmRzKSB7XG4gICAgICAgIGNvbnN0IHNyYyA9IGVsZW0ub3JpZ2luYWxFbmRzLnNvdXJjZS5qc29uKCk7XG4gICAgICAgIGNvbnN0IHRndCA9IGVsZW0ub3JpZ2luYWxFbmRzLnRhcmdldC5qc29uKCk7XG4gICAgICAgIGlmIChzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikge1xuICAgICAgICAgIHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0Z3QuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikge1xuICAgICAgICAgIHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbih0Z3QuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgICB9XG4gICAgICAgIGpzb25PYmouZGF0YS5vcmlnaW5hbEVuZHMgPSB7IHNvdXJjZTogc3JjLCB0YXJnZXQ6IHRndCB9O1xuICAgICAgfVxuICAgICAgci5wdXNoKGpzb25PYmopO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIC8qKiByZXR1cm5zIHsgY3k6IGFueSwgY29sbGFwc2VkRWRnZXM6IGFueSwgY29sbGFwc2VkQ2hpbGRyZW46IGFueSwgb3JpZ2luYWxFbmRzOiBhbnkgfVtdXG4gICAqIGZyb20gY3l0b3NjYXBlIGNvbGxlY3Rpb25cbiAgICogQHBhcmFtICB7fSBjb2xcbiAgICovXG4gIGZ1bmN0aW9uIGhhbGZEZWVwQ29weUNvbGxlY3Rpb24oY29sKSB7XG4gICAgbGV0IGFyciA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29sLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcnIucHVzaCh7IGN5OiBjb2xbaV0sIGNvbGxhcHNlZEVkZ2VzOiBjb2xbaV0uZGF0YSgnY29sbGFwc2VkRWRnZXMnKSwgY29sbGFwc2VkQ2hpbGRyZW46IGNvbFtpXS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpLCBvcmlnaW5hbEVuZHM6IGNvbFtpXS5kYXRhKCdvcmlnaW5hbEVuZHMnKSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuXG4gIC8qKiBzYXZlcyB0aGUgc3RyaW5nIGFzIGEgZmlsZS5cbiAgICogQHBhcmFtICB7fSBzdHIgc3RyaW5nXG4gICAqIEBwYXJhbSAge30gZmlsZU5hbWUgc3RyaW5nXG4gICAqL1xuICBmdW5jdGlvbiBzdHIyZmlsZShzdHIsIGZpbGVOYW1lKSB7XG4gICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtzdHJdLCB7IHR5cGU6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICBjb25zdCBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICBhbmNob3IuZG93bmxvYWQgPSBmaWxlTmFtZTtcbiAgICBhbmNob3IuaHJlZiA9ICh3aW5kb3cuVVJMKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgYW5jaG9yLmRhdGFzZXQuZG93bmxvYWR1cmwgPVxuICAgICAgWyd0ZXh0L3BsYWluJywgYW5jaG9yLmRvd25sb2FkLCBhbmNob3IuaHJlZl0uam9pbignOicpO1xuICAgIGFuY2hvci5jbGljaygpO1xuICB9XG5cbiAgZnVuY3Rpb24gb3ZlcnJpZGVKc29uMkVsZW0oZWxlbSwganNvbikge1xuICAgIGNvbnN0IGNvbGxhcHNlZENoaWxkcmVuID0gZWxlbS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpO1xuICAgIGNvbnN0IGNvbGxhcHNlZEVkZ2VzID0gZWxlbS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpO1xuICAgIGNvbnN0IG9yaWdpbmFsRW5kcyA9IGVsZW0uZGF0YSgnb3JpZ2luYWxFbmRzJyk7XG4gICAgZWxlbS5qc29uKGpzb24pO1xuICAgIGlmIChjb2xsYXBzZWRDaGlsZHJlbikge1xuICAgICAgZWxlbS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicsIGNvbGxhcHNlZENoaWxkcmVuKTtcbiAgICB9XG4gICAgaWYgKGNvbGxhcHNlZEVkZ2VzKSB7XG4gICAgICBlbGVtLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJywgY29sbGFwc2VkRWRnZXMpO1xuICAgIH1cbiAgICBpZiAob3JpZ2luYWxFbmRzKSB7XG4gICAgICBlbGVtLmRhdGEoJ29yaWdpbmFsRW5kcycsIG9yaWdpbmFsRW5kcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcblxuICAgIC8qKiBMb2FkIGVsZW1lbnRzIGZyb20gSlNPTiBmb3JtYXR0ZWQgc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgICAqIEZvciBjb2xsYXBzZWQgY29tcG91bmRzLCBmaXJzdCBhZGQgYWxsIGNvbGxhcHNlZCBub2RlcyBhcyBub3JtYWwgbm9kZXMgdGhlbiBjb2xsYXBzZSB0aGVtLiBUaGVuIHJlcG9zaXRpb24gdGhlbS5cbiAgICAgKiBGb3IgY29sbGFwc2VkIGVkZ2VzLCBmaXJzdCBhZGQgYWxsIG9mIHRoZSBlZGdlcyB0aGVuIHJlbW92ZSBjb2xsYXBzZWQgZWRnZXMgZnJvbSBjeXRvc2NhcGUuXG4gICAgICogRm9yIG9yaWdpbmFsIGVuZHMsIHJlc3RvcmUgdGhlaXIgcmVmZXJlbmNlIHRvIGN5dG9zY2FwZSBlbGVtZW50c1xuICAgICAqIEBwYXJhbSAge30gdHh0IHN0cmluZ1xuICAgICAqL1xuICAgIGxvYWRKc29uOiBmdW5jdGlvbiAodHh0KSB7XG4gICAgICBjb25zdCBmaWxlSlNPTiA9IEpTT04ucGFyc2UodHh0KTtcbiAgICAgIC8vIG9yaWdpbmFsIGVuZHBvaW50cyB3b24ndCBleGlzdCBpbiBjeS4gU28ga2VlcCBhIHJlZmVyZW5jZS5cbiAgICAgIGNvbnN0IG5vZGVQb3NpdGlvbnMgPSB7fTtcbiAgICAgIGNvbnN0IGFsbE5vZGVzID0gY3kuY29sbGVjdGlvbigpOyAvLyBzb21lIGVsZW1lbnRzIGFyZSBzdG9yZWQgaW4gY3ksIHNvbWUgYXJlIGRlbGV0ZWQgXG4gICAgICBjb25zdCBub2RlczJjb2xsYXBzZSA9IGN5LmNvbGxlY3Rpb24oKTsgLy8gc29tZSBhcmUgZGVsZXRlZCBcbiAgICAgIGNvbnN0IG5vZGUycGFyZW50ID0ge307XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgZmlsZUpTT04ubm9kZXMpIHtcbiAgICAgICAgbm9kZVBvc2l0aW9uc1tuLmRhdGEuaWRdID0geyB4OiBuLnBvc2l0aW9uLngsIHk6IG4ucG9zaXRpb24ueSB9O1xuICAgICAgICBpZiAobi5kYXRhLnBhcmVudCkge1xuICAgICAgICAgIG5vZGUycGFyZW50W24uZGF0YS5pZF0gPSBuLmRhdGEucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vZGUgPSBjeS5hZGQobik7XG4gICAgICAgIGFsbE5vZGVzLm1lcmdlKG5vZGUpO1xuICAgICAgICBpZiAobm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpKSB7XG4gICAgICAgICAganNvbjJjeUNvbGxlY3Rpb24obm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50KTtcbiAgICAgICAgICBub2RlczJjb2xsYXBzZS5tZXJnZShub2RlKTtcbiAgICAgICAgICBjbGVhckNvbGxhcHNlTWV0YURhdGEobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZSBvZiBmaWxlSlNPTi5lZGdlcykge1xuICAgICAgICBjb25zdCBlZGdlID0gY3kuYWRkKGUpO1xuICAgICAgICBpZiAoZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpKSB7XG4gICAgICAgICAgZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycsIGpzb24yY3lDb2xsZWN0aW9uKGUuZGF0YS5jb2xsYXBzZWRFZGdlcywgYWxsTm9kZXMsIG5vZGVzMmNvbGxhcHNlLCBub2RlMnBhcmVudCkpO1xuICAgICAgICAgIGN5LnJlbW92ZShlZGdlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJykpOyAvLyBkZWxldGUgY29sbGFwc2VkIGVkZ2VzIGZyb20gY3lcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnKSkge1xuICAgICAgICAgIGNvbnN0IHNyY0lkID0gZS5kYXRhLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5pZDtcbiAgICAgICAgICBjb25zdCB0Z3RJZCA9IGUuZGF0YS5vcmlnaW5hbEVuZHMudGFyZ2V0LmRhdGEuaWQ7XG4gICAgICAgICAgZS5kYXRhLm9yaWdpbmFsRW5kcyA9IHsgc291cmNlOiBhbGxOb2Rlcy5maWx0ZXIoJyMnICsgc3JjSWQpLCB0YXJnZXQ6IGFsbE5vZGVzLmZpbHRlcignIycgKyB0Z3RJZCkgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gc2V0IHBhcmVudHNcbiAgICAgIGZvciAobGV0IG5vZGUgaW4gbm9kZTJwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgZWxlbSA9IGFsbE5vZGVzLiRpZChub2RlKTtcbiAgICAgICAgaWYgKGVsZW0ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgZWxlbS5tb3ZlKHsgcGFyZW50OiBub2RlMnBhcmVudFtub2RlXSB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY29sbGFwc2UgdGhlIGNvbGxhcHNlZCBub2Rlc1xuICAgICAgYXBpLmNvbGxhcHNlKG5vZGVzMmNvbGxhcHNlLCB7IGxheW91dEJ5OiBudWxsLCBmaXNoZXllOiBmYWxzZSwgYW5pbWF0ZTogZmFsc2UgfSk7XG5cbiAgICAgIC8vIHBvc2l0aW9ucyBtaWdodCBiZSBjaGFuZ2VkIGluIGNvbGxhcHNlIGV4dGVuc2lvblxuICAgICAgZm9yIChjb25zdCBuIG9mIGZpbGVKU09OLm5vZGVzKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBjeS4kaWQobi5kYXRhLmlkKVxuICAgICAgICBpZiAobm9kZS5pc0NoaWxkbGVzcygpKSB7XG4gICAgICAgICAgY3kuJGlkKG4uZGF0YS5pZCkucG9zaXRpb24obm9kZVBvc2l0aW9uc1tuLmRhdGEuaWRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY3kuZml0KCk7XG4gICAgfSxcblxuXG4gICAgLyoqIHNhdmVzIGN5dG9zY2FwZSBlbGVtZW50cyAoY29sbGVjdGlvbikgYXMgSlNPTlxuICAgICAqIGNhbGxzIGVsZW1lbnRzJyBqc29uIG1ldGhvZCAoaHR0cHM6Ly9qcy5jeXRvc2NhcGUub3JnLyNlbGUuanNvbikgd2hlbiB3ZSBrZWVwIGEgY3l0b3NjYXBlIGVsZW1lbnQgaW4gdGhlIGRhdGEuIFxuICAgICAqIEBwYXJhbSAge30gZWxlbXMgY3l0b3NjYXBlIGNvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0gIHt9IGZpbGVuYW1lIHN0cmluZ1xuICAgICAqL1xuICAgIHNhdmVKc29uOiBmdW5jdGlvbiAoZWxlbXMsIGZpbGVuYW1lKSB7XG4gICAgICBpZiAoIWVsZW1zKSB7XG4gICAgICAgIGVsZW1zID0gY3kuJCgpO1xuICAgICAgfVxuICAgICAgY29uc3Qgbm9kZXMgPSBoYWxmRGVlcENvcHlDb2xsZWN0aW9uKGVsZW1zLm5vZGVzKCkpO1xuICAgICAgY29uc3QgZWRnZXMgPSBoYWxmRGVlcENvcHlDb2xsZWN0aW9uKGVsZW1zLmVkZ2VzKCkpO1xuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCArIG5vZGVzLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhY2NvcmRpbmcgdG8gY3l0b3NjYXBlLmpzIGZvcm1hdFxuICAgICAgY29uc3QgbyA9IHsgbm9kZXM6IFtdLCBlZGdlczogW10gfTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBlZGdlcykge1xuICAgICAgICBpZiAoZS5jb2xsYXBzZWRFZGdlcykge1xuICAgICAgICAgIGUuY29sbGFwc2VkRWRnZXMgPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKGUuY29sbGFwc2VkRWRnZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZS5vcmlnaW5hbEVuZHMpIHtcbiAgICAgICAgICBjb25zdCBzcmMgPSBlLm9yaWdpbmFsRW5kcy5zb3VyY2UuanNvbigpO1xuICAgICAgICAgIGNvbnN0IHRndCA9IGUub3JpZ2luYWxFbmRzLnRhcmdldC5qc29uKCk7XG4gICAgICAgICAgaWYgKHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgICAgICAvLyBlLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiB3aWxsIGJlIGNoYW5nZWRcbiAgICAgICAgICAgIHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGd0LmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgIHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbih0Z3QuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlLm9yaWdpbmFsRW5kcyA9IHsgc291cmNlOiBzcmMsIHRhcmdldDogdGd0IH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbk9iaiA9IGUuY3kuanNvbigpO1xuICAgICAgICBqc29uT2JqLmRhdGEuY29sbGFwc2VkRWRnZXMgPSBlLmNvbGxhcHNlZEVkZ2VzO1xuICAgICAgICBqc29uT2JqLmRhdGEub3JpZ2luYWxFbmRzID0gZS5vcmlnaW5hbEVuZHM7XG4gICAgICAgIG8uZWRnZXMucHVzaChqc29uT2JqKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xuICAgICAgICBpZiAobi5jb2xsYXBzZWRDaGlsZHJlbikge1xuICAgICAgICAgIG4uY29sbGFwc2VkQ2hpbGRyZW4gPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKG4uY29sbGFwc2VkQ2hpbGRyZW4pKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uT2JqID0gbi5jeS5qc29uKCk7XG4gICAgICAgIGpzb25PYmouZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IG4uY29sbGFwc2VkQ2hpbGRyZW47XG4gICAgICAgIG8ubm9kZXMucHVzaChqc29uT2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICBmaWxlbmFtZSA9ICdleHBhbmQtY29sbGFwc2Utb3V0cHV0Lmpzb24nO1xuICAgICAgfVxuICAgICAgc3RyMmZpbGUoSlNPTi5zdHJpbmdpZnkobyksIGZpbGVuYW1lKTtcbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2F2ZUxvYWRVdGlsaXRpZXM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgYXBpKSB7XG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7fSwgdHJ1ZSk7XG5cbiAgZnVuY3Rpb24gZ2V0RWxlcyhfZWxlcykge1xuICAgIHJldHVybiAodHlwZW9mIF9lbGVzID09PSBcInN0cmluZ1wiKSA/IGN5LiQoX2VsZXMpIDogX2VsZXM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXROb2RlUG9zaXRpb25zKCkge1xuICAgIHZhciBwb3NpdGlvbnMgPSB7fTtcbiAgICB2YXIgbm9kZXMgPSBjeS5ub2RlcygpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGVsZSA9IG5vZGVzW2ldO1xuICAgICAgcG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcbiAgICAgICAgeDogZWxlLnBvc2l0aW9uKFwieFwiKSxcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gcG9zaXRpb25zO1xuICB9XG5cbiAgZnVuY3Rpb24gcmV0dXJuVG9Qb3NpdGlvbnMocG9zaXRpb25zKSB7XG4gICAgdmFyIGN1cnJlbnRQb3NpdGlvbnMgPSB7fTtcbiAgICBjeS5ub2RlcygpLm5vdChcIjpwYXJlbnRcIikucG9zaXRpb25zKGZ1bmN0aW9uIChlbGUsIGkpIHtcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgZWxlID0gaTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRQb3NpdGlvbnNbZWxlLmlkKCldID0ge1xuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxuICAgICAgICB5OiBlbGUucG9zaXRpb24oXCJ5XCIpXG4gICAgICB9O1xuICAgICAgdmFyIHBvcyA9IHBvc2l0aW9uc1tlbGUuaWQoKV07XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiBwb3MueCxcbiAgICAgICAgeTogcG9zLnlcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY3VycmVudFBvc2l0aW9ucztcbiAgfVxuXG4gIHZhciBzZWNvbmRUaW1lT3B0cyA9IHtcbiAgICBsYXlvdXRCeTogbnVsbCxcbiAgICBhbmltYXRlOiBmYWxzZSxcbiAgICBmaXNoZXllOiBmYWxzZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGRvSXQoZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgdmFyIG5vZGVzID0gZ2V0RWxlcyhhcmdzLm5vZGVzKTtcbiAgICAgIGlmIChhcmdzLmZpcnN0VGltZSkge1xuICAgICAgICByZXN1bHQub2xkRGF0YSA9IGdldE5vZGVQb3NpdGlvbnMoKTtcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGFwaVtmdW5jXShhcmdzLm9wdGlvbnMpIDogYXBpW2Z1bmNdKG5vZGVzLCBhcmdzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zKCk7XG4gICAgICAgIHJlc3VsdC5ub2RlcyA9IGZ1bmMuaW5kZXhPZihcIkFsbFwiKSA+IDAgPyBhcGlbZnVuY10oc2Vjb25kVGltZU9wdHMpIDogYXBpW2Z1bmNdKGN5LmNvbGxlY3Rpb24obm9kZXMpLCBzZWNvbmRUaW1lT3B0cyk7XG4gICAgICAgIHJldHVyblRvUG9zaXRpb25zKGFyZ3Mub2xkRGF0YSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBhY3Rpb25zID0gW1wiY29sbGFwc2VcIiwgXCJjb2xsYXBzZVJlY3Vyc2l2ZWx5XCIsIFwiY29sbGFwc2VBbGxcIiwgXCJleHBhbmRcIiwgXCJleHBhbmRSZWN1cnNpdmVseVwiLCBcImV4cGFuZEFsbFwiXTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZihpID09IDIpXG4gICAgICB1ci5hY3Rpb24oXCJjb2xsYXBzZUFsbFwiLCBkb0l0KFwiY29sbGFwc2VBbGxcIiksIGRvSXQoXCJleHBhbmRSZWN1cnNpdmVseVwiKSk7XG4gICAgZWxzZSBpZihpID09IDUpXG4gICAgICB1ci5hY3Rpb24oXCJleHBhbmRBbGxcIiwgZG9JdChcImV4cGFuZEFsbFwiKSwgZG9JdChcImNvbGxhcHNlUmVjdXJzaXZlbHlcIikpO1xuICAgIGVsc2VcbiAgICAgIHVyLmFjdGlvbihhY3Rpb25zW2ldLCBkb0l0KGFjdGlvbnNbaV0pLCBkb0l0KGFjdGlvbnNbKGkgKyAzKSAlIDZdKSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb2xsYXBzZUVkZ2VzKGFyZ3MpeyAgICBcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcbiAgICB2YXIgZWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBcbiAgICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgICAgdmFyIGNvbGxhcHNlUmVzdWx0ID0gYXBpLmNvbGxhcHNlRWRnZXMoZWRnZXMsb3B0aW9ucyk7ICAgIFxuICAgICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VSZXN1bHQuZWRnZXM7XG4gICAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZVJlc3VsdC5vbGRFZGdlczsgIFxuICAgICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgIH1lbHNle1xuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gZWRnZXM7XG4gICAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XG4gICAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xuICAgICAgfVxuICAgICBcbiAgICAgXG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mpe1xuICAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgICB2YXIgY29sbGFwc2VBbGxSZXN1bHQgPSBhcGkuY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyhhcmdzLm5vZGVzLCBvcHRpb25zKTtcbiAgICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQuZWRnZXM7XG4gICAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0Lm9sZEVkZ2VzO1xuICAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XG4gICAgfWVsc2V7XG4gICAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XG4gICAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XG4gICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xuICAgICAgfVxuICAgIFxuICAgIH1cbiBcbiAgICByZXR1cm4gcmVzdWx0O1xuXG4gfVxuIGZ1bmN0aW9uIGNvbGxhcHNlQWxsRWRnZXMoYXJncyl7XG4gICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcbiAgIHZhciByZXN1bHQgPSB7fTtcbiAgIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcbiAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcbiAgICB2YXIgY29sbGFwc2VBbGxSZXN1bHQgPSBhcGkuY29sbGFwc2VBbGxFZGdlcyhvcHRpb25zKTtcbiAgICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5lZGdlcztcbiAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5vbGRFZGdlcztcbiAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XG4gICB9ZWxzZXtcbiAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XG4gICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xuICAgICAgfVxuICAgXG4gICB9XG5cbiAgIHJldHVybiByZXN1bHQ7XG4gfVxuIGZ1bmN0aW9uIGV4cGFuZEVkZ2VzKGFyZ3MpeyAgIFxuICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gICB2YXIgcmVzdWx0ID17fTtcbiAgXG4gICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICBpZihhcmdzLmZpcnN0VGltZSl7XG4gICAgIHZhciBleHBhbmRSZXN1bHQgPSBhcGkuZXhwYW5kRWRnZXMoYXJncy5lZGdlcyk7XG4gICAgcmVzdWx0LmVkZ2VzID0gZXhwYW5kUmVzdWx0LmVkZ2VzO1xuICAgIHJlc3VsdC5vbGRFZGdlcyA9IGV4cGFuZFJlc3VsdC5vbGRFZGdlcztcbiAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XG4gICAgXG4gICB9ZWxzZXtcbiAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XG4gICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XG4gICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XG4gICAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XG4gICAgICB9XG4gIFxuICAgfVxuXG4gICByZXR1cm4gcmVzdWx0O1xuIH1cbiBmdW5jdGlvbiBleHBhbmRFZGdlc0JldHdlZW5Ob2RlcyhhcmdzKXtcbiAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICBpZihhcmdzLmZpcnN0VGltZSl7XG4gICB2YXIgY29sbGFwc2VBbGxSZXN1bHQgPSBhcGkuZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMoYXJncy5ub2RlcyxvcHRpb25zKTtcbiAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0LmVkZ2VzO1xuICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQub2xkRWRnZXM7XG4gICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XG4gIH1lbHNle1xuICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XG4gICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcbiAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XG4gICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xuICAgIH1cbiAgXG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xuIH1cbiBmdW5jdGlvbiBleHBhbmRBbGxFZGdlcyhhcmdzKXtcbiAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICBpZihhcmdzLmZpcnN0VGltZSl7XG4gICB2YXIgZXhwYW5kUmVzdWx0ID0gYXBpLmV4cGFuZEFsbEVkZ2VzKG9wdGlvbnMpO1xuICAgcmVzdWx0LmVkZ2VzID0gZXhwYW5kUmVzdWx0LmVkZ2VzO1xuICAgcmVzdWx0Lm9sZEVkZ2VzID0gZXhwYW5kUmVzdWx0Lm9sZEVkZ2VzO1xuICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICB9ZWxzZXtcbiAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XG4gICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XG4gICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICB9XG4gICBcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG4gfVxuIFxuIFxuICB1ci5hY3Rpb24oXCJjb2xsYXBzZUVkZ2VzXCIsIGNvbGxhcHNlRWRnZXMsIGV4cGFuZEVkZ2VzKTtcbiAgdXIuYWN0aW9uKFwiZXhwYW5kRWRnZXNcIiwgZXhwYW5kRWRnZXMsIGNvbGxhcHNlRWRnZXMpO1xuXG4gIHVyLmFjdGlvbihcImNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXNcIiwgY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcywgZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMpO1xuICB1ci5hY3Rpb24oXCJleHBhbmRFZGdlc0JldHdlZW5Ob2Rlc1wiLCBleHBhbmRFZGdlc0JldHdlZW5Ob2RlcywgY29sbGFwc2VFZGdlc0JldHdlZW5Ob2Rlcyk7XG5cbiAgdXIuYWN0aW9uKFwiY29sbGFwc2VBbGxFZGdlc1wiLCBjb2xsYXBzZUFsbEVkZ2VzLCBleHBhbmRBbGxFZGdlcyk7XG4gIHVyLmFjdGlvbihcImV4cGFuZEFsbEVkZ2VzXCIsIGV4cGFuZEFsbEVkZ2VzLCBjb2xsYXBzZUFsbEVkZ2VzKTtcblxuIFxuXG5cbiAgXG5cblxufTtcbiJdfQ==
