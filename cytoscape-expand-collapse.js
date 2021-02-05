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
          overrideJson2Elem(existing, json);
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
            overrideJson2Elem(existing, n);
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
            overrideJson2Elem(existing, e);
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2RlYm91bmNlMi5qcyIsInNyYy9lbGVtZW50VXRpbGl0aWVzLmpzIiwic3JjL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3NhdmVMb2FkVXRpbGl0aWVzLmpzIiwic3JjL3VuZG9SZWRvVXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbjBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSB7XG4gIGVxdWFsQm91bmRpbmdCb3hlczogZnVuY3Rpb24oYmIxLCBiYjIpe1xuICAgICAgcmV0dXJuIGJiMS54MSA9PSBiYjIueDEgJiYgYmIxLngyID09IGJiMi54MiAmJiBiYjEueTEgPT0gYmIyLnkxICYmIGJiMS55MiA9PSBiYjIueTI7XG4gIH0sXG4gIGdldFVuaW9uOiBmdW5jdGlvbihiYjEsIGJiMil7XG4gICAgICB2YXIgdW5pb24gPSB7XG4gICAgICB4MTogTWF0aC5taW4oYmIxLngxLCBiYjIueDEpLFxuICAgICAgeDI6IE1hdGgubWF4KGJiMS54MiwgYmIyLngyKSxcbiAgICAgIHkxOiBNYXRoLm1pbihiYjEueTEsIGJiMi55MSksXG4gICAgICB5MjogTWF0aC5tYXgoYmIxLnkyLCBiYjIueTIpLFxuICAgIH07XG5cbiAgICB1bmlvbi53ID0gdW5pb24ueDIgLSB1bmlvbi54MTtcbiAgICB1bmlvbi5oID0gdW5pb24ueTIgLSB1bmlvbi55MTtcblxuICAgIHJldHVybiB1bmlvbjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBib3VuZGluZ0JveFV0aWxpdGllczsiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG52YXIgZGVib3VuY2UyID0gcmVxdWlyZSgnLi9kZWJvdW5jZTInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGFyYW1zLCBjeSwgYXBpKSB7XG4gIHZhciBlbGVtZW50VXRpbGl0aWVzO1xuICB2YXIgZm4gPSBwYXJhbXM7XG4gIGNvbnN0IENVRV9QT1NfVVBEQVRFX0RFTEFZID0gMTAwO1xuICB2YXIgbm9kZVdpdGhSZW5kZXJlZEN1ZTtcblxuICBjb25zdCBnZXREYXRhID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY3JhdGNoID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKTtcbiAgICByZXR1cm4gc2NyYXRjaCAmJiBzY3JhdGNoLmN1ZVV0aWxpdGllcztcbiAgfTtcblxuICBjb25zdCBzZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XG4gICAgaWYgKHNjcmF0Y2ggPT0gbnVsbCkge1xuICAgICAgc2NyYXRjaCA9IHt9O1xuICAgIH1cblxuICAgIHNjcmF0Y2guY3VlVXRpbGl0aWVzID0gZGF0YTtcbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHNjcmF0Y2gpO1xuICB9O1xuXG4gIHZhciBmdW5jdGlvbnMgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICRjYW52YXMuY2xhc3NMaXN0LmFkZChcImV4cGFuZC1jb2xsYXBzZS1jYW52YXNcIik7XG4gICAgICB2YXIgJGNvbnRhaW5lciA9IGN5LmNvbnRhaW5lcigpO1xuICAgICAgdmFyIGN0eCA9ICRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXMpO1xuXG4gICAgICBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJykoY3kpO1xuXG4gICAgICB2YXIgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsdCkge1xuICAgICAgICB2YXIgcmVjdCA9IGVsdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHRvcDogcmVjdC50b3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wLFxuICAgICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAkY2FudmFzLmhlaWdodCA9IGN5LmNvbnRhaW5lcigpLm9mZnNldEhlaWdodDtcbiAgICAgICAgJGNhbnZhcy53aWR0aCA9IGN5LmNvbnRhaW5lcigpLm9mZnNldFdpZHRoO1xuICAgICAgICAkY2FudmFzLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgJGNhbnZhcy5zdHlsZS50b3AgPSAwO1xuICAgICAgICAkY2FudmFzLnN0eWxlLmxlZnQgPSAwO1xuICAgICAgICAkY2FudmFzLnN0eWxlLnpJbmRleCA9IG9wdGlvbnMoKS56SW5kZXg7XG5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGNhbnZhc0JiID0gb2Zmc2V0KCRjYW52YXMpO1xuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9IG9mZnNldCgkY29udGFpbmVyKTtcbiAgICAgICAgICAkY2FudmFzLnN0eWxlLnRvcCA9IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKTtcbiAgICAgICAgICAkY2FudmFzLnN0eWxlLmxlZnQgPSAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KTtcblxuICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxuICAgICAgICAgIGlmIChjeSkge1xuICAgICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuXG4gICAgICB9LCAyNTApO1xuXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xuICAgICAgICBfc2l6ZUNhbnZhcygpO1xuICAgICAgfVxuXG4gICAgICBzaXplQ2FudmFzKCk7XG5cbiAgICAgIHZhciBkYXRhID0ge307XG5cbiAgICAgIC8vIGlmIHRoZXJlIGFyZSBldmVudHMgZmllbGQgaW4gZGF0YSB1bmJpbmQgdGhlbSBoZXJlXG4gICAgICAvLyB0byBwcmV2ZW50IGJpbmRpbmcgdGhlIHNhbWUgZXZlbnQgbXVsdGlwbGUgdGltZXNcbiAgICAgIC8vIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xuICAgICAgLy8gICBmdW5jdGlvbnNbJ3VuYmluZCddLmFwcGx5KCAkY29udGFpbmVyICk7XG4gICAgICAvLyB9XG5cbiAgICAgIGZ1bmN0aW9uIG9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLm9wdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNsZWFyRHJhd3MoKSB7XG4gICAgICAgIHZhciB3ID0gY3kud2lkdGgoKTtcbiAgICAgICAgdmFyIGggPSBjeS5oZWlnaHQoKTtcblxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xuICAgICAgICBub2RlV2l0aFJlbmRlcmVkQ3VlID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGUpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XG4gICAgICAgIHZhciBoYXNDaGlsZHJlbiA9IGNoaWxkcmVuICE9IG51bGwgJiYgY2hpbGRyZW4gIT0gdW5kZWZpbmVkICYmIGNoaWxkcmVuLmxlbmd0aCA+IDA7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBzaW1wbGUgbm9kZSB3aXRoIG5vIGNvbGxhcHNlZCBjaGlsZHJlbiByZXR1cm4gZGlyZWN0bHlcbiAgICAgICAgaWYgKCFoYXNDaGlsZHJlbiAmJiAhY29sbGFwc2VkQ2hpbGRyZW4pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXNDb2xsYXBzZWQgPSBub2RlLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcblxuICAgICAgICAvL0RyYXcgZXhwYW5kLWNvbGxhcHNlIHJlY3RhbmdsZXNcbiAgICAgICAgdmFyIHJlY3RTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlU2l6ZTtcbiAgICAgICAgdmFyIGxpbmVTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU7XG5cbiAgICAgICAgdmFyIGN1ZUNlbnRlcjtcblxuICAgICAgICBpZiAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb24gPT09ICd0b3AtbGVmdCcpIHtcbiAgICAgICAgICB2YXIgb2Zmc2V0ID0gMTtcbiAgICAgICAgICB2YXIgc2l6ZSA9IGN5Lnpvb20oKSA8IDEgPyByZWN0U2l6ZSAvICgyICogY3kuem9vbSgpKSA6IHJlY3RTaXplIC8gMjtcbiAgICAgICAgICB2YXIgbm9kZUJvcmRlcldpZCA9IHBhcnNlRmxvYXQobm9kZS5jc3MoJ2JvcmRlci13aWR0aCcpKTtcbiAgICAgICAgICB2YXIgeCA9IG5vZGUucG9zaXRpb24oJ3gnKSAtIG5vZGUud2lkdGgoKSAvIDIgLSBwYXJzZUZsb2F0KG5vZGUuY3NzKCdwYWRkaW5nLWxlZnQnKSlcbiAgICAgICAgICAgICsgbm9kZUJvcmRlcldpZCArIHNpemUgKyBvZmZzZXQ7XG4gICAgICAgICAgdmFyIHkgPSBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmhlaWdodCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctdG9wJykpXG4gICAgICAgICAgICArIG5vZGVCb3JkZXJXaWQgKyBzaXplICsgb2Zmc2V0O1xuXG4gICAgICAgICAgY3VlQ2VudGVyID0geyB4OiB4LCB5OiB5IH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uO1xuICAgICAgICAgIGN1ZUNlbnRlciA9IHR5cGVvZiBvcHRpb24gPT09ICdmdW5jdGlvbicgPyBvcHRpb24uY2FsbCh0aGlzLCBub2RlKSA6IG9wdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlciA9IGVsZW1lbnRVdGlsaXRpZXMuY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihjdWVDZW50ZXIpO1xuXG4gICAgICAgIC8vIGNvbnZlcnQgdG8gcmVuZGVyZWQgc2l6ZXNcbiAgICAgICAgcmVjdFNpemUgPSBNYXRoLm1heChyZWN0U2l6ZSwgcmVjdFNpemUgKiBjeS56b29tKCkpO1xuICAgICAgICBsaW5lU2l6ZSA9IE1hdGgubWF4KGxpbmVTaXplLCBsaW5lU2l6ZSAqIGN5Lnpvb20oKSk7XG4gICAgICAgIHZhciBkaWZmID0gKHJlY3RTaXplIC0gbGluZVNpemUpIC8gMjtcblxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VDZW50ZXJYID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueDtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLnk7XG5cbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRYID0gZXhwYW5kY29sbGFwc2VDZW50ZXJYIC0gcmVjdFNpemUgLyAyO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFkgPSBleHBhbmRjb2xsYXBzZUNlbnRlclkgLSByZWN0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlY3RTaXplID0gcmVjdFNpemU7XG5cbiAgICAgICAgLy8gRHJhdyBleHBhbmQvY29sbGFwc2UgY3VlIGlmIHNwZWNpZmllZCB1c2UgYW4gaW1hZ2UgZWxzZSByZW5kZXIgaXQgaW4gdGhlIGRlZmF1bHQgd2F5XG4gICAgICAgIGlmIChpc0NvbGxhcHNlZCAmJiBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UpIHtcbiAgICAgICAgICBkcmF3SW1nKG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZSwgZXhwYW5kY29sbGFwc2VTdGFydFgsIGV4cGFuZGNvbGxhcHNlU3RhcnRZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFpc0NvbGxhcHNlZCAmJiBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSkge1xuICAgICAgICAgIGRyYXdJbWcob3B0aW9ucygpLmNvbGxhcHNlQ3VlSW1hZ2UsIGV4cGFuZGNvbGxhcHNlU3RhcnRYLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSwgcmVjdFNpemUsIHJlY3RTaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB2YXIgb2xkRmlsbFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcbiAgICAgICAgICB2YXIgb2xkV2lkdGggPSBjdHgubGluZVdpZHRoO1xuICAgICAgICAgIHZhciBvbGRTdHJva2VTdHlsZSA9IGN0eC5zdHJva2VTdHlsZTtcblxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xuXG4gICAgICAgICAgY3R4LmVsbGlwc2UoZXhwYW5kY29sbGFwc2VDZW50ZXJYLCBleHBhbmRjb2xsYXBzZUNlbnRlclksIHJlY3RTaXplIC8gMiwgcmVjdFNpemUgLyAyLCAwLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgY3R4LmZpbGwoKTtcblxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcblxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwid2hpdGVcIjtcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gTWF0aC5tYXgoMi42LCAyLjYgKiBjeS56b29tKCkpO1xuXG4gICAgICAgICAgY3R4Lm1vdmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcbiAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgbGluZVNpemUgKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XG5cbiAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgZGlmZik7XG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgICAgIGN0eC5zdHJva2UoKTtcblxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRGaWxsU3R5bGU7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IG9sZFdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBleHBhbmRjb2xsYXBzZVN0YXJ0WDtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplID0gZXhwYW5kY29sbGFwc2VSZWN0U2l6ZTtcblxuICAgICAgICBub2RlV2l0aFJlbmRlcmVkQ3VlID0gbm9kZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZHJhd0ltZyhpbWdTcmMsIHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIGltZyA9IG5ldyBJbWFnZSh3LCBoKTtcbiAgICAgICAgaW1nLnNyYyA9IGltZ1NyYztcbiAgICAgICAgaW1nLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgeCwgeSwgdywgaCk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGN5Lm9uKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xuICAgICAgfSk7XG5cbiAgICAgIGN5Lm9uKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKG5vZGVXaXRoUmVuZGVyZWRDdWUpIHtcbiAgICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB2YXIgb2xkTW91c2VQb3MgPSBudWxsLCBjdXJyTW91c2VQb3MgPSBudWxsO1xuICAgICAgY3kub24oJ21vdXNlZG93bicsIGRhdGEuZU1vdXNlRG93biA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIG9sZE1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXG4gICAgICB9KTtcblxuICAgICAgY3kub24oJ21vdXNldXAnLCBkYXRhLmVNb3VzZVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgY3Vyck1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXG4gICAgICB9KTtcblxuICAgICAgY3kub24oJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlID0gZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBjb25zdCBub2RlID0gZXZ0LnRhcmdldDtcbiAgICAgICAgaWYgKG5vZGUgPT0gbm9kZVdpdGhSZW5kZXJlZEN1ZSkge1xuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciB1cjtcbiAgICAgIGN5Lm9uKCdzZWxlY3QgdW5zZWxlY3QnLCBkYXRhLmVTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKSB7XG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZWxlY3RlZE5vZGVzID0gY3kubm9kZXMoJzpzZWxlY3RlZCcpO1xuICAgICAgICBpZiAoc2VsZWN0ZWROb2Rlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNlbGVjdGVkTm9kZSA9IHNlbGVjdGVkTm9kZXNbMF07XG5cbiAgICAgICAgaWYgKHNlbGVjdGVkTm9kZS5pc1BhcmVudCgpIHx8IHNlbGVjdGVkTm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcbiAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUoc2VsZWN0ZWROb2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGN5Lm9uKCd0YXAnLCBkYXRhLmVUYXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBub2RlV2l0aFJlbmRlcmVkQ3VlO1xuICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFgnKTtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFknKTtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUnKTtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRZID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcblxuICAgICAgICB2YXIgY3lSZW5kZXJlZFBvcyA9IGV2ZW50LnJlbmRlcmVkUG9zaXRpb24gfHwgZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uO1xuICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1ggPSBjeVJlbmRlcmVkUG9zLng7XG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zWSA9IGN5UmVuZGVyZWRQb3MueTtcbiAgICAgICAgdmFyIG9wdHMgPSBvcHRpb25zKCk7XG4gICAgICAgIHZhciBmYWN0b3IgPSAob3B0cy5leHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5IC0gMSkgLyAyO1xuXG4gICAgICAgIGlmICgoTWF0aC5hYnMob2xkTW91c2VQb3MueCAtIGN1cnJNb3VzZVBvcy54KSA8IDUgJiYgTWF0aC5hYnMob2xkTW91c2VQb3MueSAtIGN1cnJNb3VzZVBvcy55KSA8IDUpXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1ggPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxuICAgICAgICAgICYmIGN5UmVuZGVyZWRQb3NYIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxuICAgICAgICAgICYmIGN5UmVuZGVyZWRQb3NZIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yKSB7XG4gICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUgJiYgIXVyKSB7XG4gICAgICAgICAgICB1ciA9IGN5LnVuZG9SZWRvKHsgZGVmYXVsdEFjdGlvbnM6IGZhbHNlIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhcGkuaXNDb2xsYXBzaWJsZShub2RlKSkge1xuICAgICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUpIHtcbiAgICAgICAgICAgICAgdXIuZG8oXCJjb2xsYXBzZVwiLCB7XG4gICAgICAgICAgICAgICAgbm9kZXM6IG5vZGUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0c1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBhcGkuY29sbGFwc2Uobm9kZSwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFwaS5pc0V4cGFuZGFibGUobm9kZSkpIHtcbiAgICAgICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKSB7XG4gICAgICAgICAgICAgIHVyLmRvKFwiZXhwYW5kXCIsIHsgbm9kZXM6IG5vZGUsIG9wdGlvbnM6IG9wdHMgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgYXBpLmV4cGFuZChub2RlLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG5vZGUuc2VsZWN0YWJsZSgpKSB7XG4gICAgICAgICAgICBub2RlLnVuc2VsZWN0aWZ5KCk7XG4gICAgICAgICAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjeS5vbignYWZ0ZXJVbmRvIGFmdGVyUmVkbycsIGRhdGEuZVVuZG9SZWRvID0gZGF0YS5lU2VsZWN0KTtcblxuICAgICAgY3kub24oJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbiA9IGRlYm91bmNlMihkYXRhLmVTZWxlY3QsIENVRV9QT1NfVVBEQVRFX0RFTEFZLCBjbGVhckRyYXdzKSk7XG5cbiAgICAgIGN5Lm9uKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKTtcblxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXG4gICAgICBkYXRhLmhhc0V2ZW50RmllbGRzID0gdHJ1ZTtcbiAgICAgIHNldERhdGEoZGF0YSk7XG4gICAgfSxcbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIHZhciAkY29udGFpbmVyID0gdGhpcztcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xuXG4gICAgICBpZiAoIWRhdGEuaGFzRXZlbnRGaWVsZHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byB1bmJpbmQgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjeS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScpO1xuXG4gICAgICBjeS5vZmYoJ21vdXNlZG93bicsICdub2RlJywgZGF0YS5lTW91c2VEb3duKVxuICAgICAgICAub2ZmKCdtb3VzZXVwJywgJ25vZGUnLCBkYXRhLmVNb3VzZVVwKVxuICAgICAgICAub2ZmKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcbiAgICAgICAgLm9mZigndGFwJywgJ25vZGUnLCBkYXRhLmVUYXApXG4gICAgICAgIC5vZmYoJ2FkZCcsICdub2RlJywgZGF0YS5lQWRkKVxuICAgICAgICAub2ZmKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24pXG4gICAgICAgIC5vZmYoJ3BhbiB6b29tJywgZGF0YS5lUG9zaXRpb24pXG4gICAgICAgIC5vZmYoJ3NlbGVjdCB1bnNlbGVjdCcsIGRhdGEuZVNlbGVjdClcbiAgICAgICAgLm9mZignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcbiAgICAgICAgLm9mZigncmVzaXplJywgZGF0YS5lQ3lSZXNpemUpXG4gICAgICAgIC5vZmYoJ2FmdGVyVW5kbyBhZnRlclJlZG8nLCBkYXRhLmVVbmRvUmVkbyk7XG4gICAgfSxcbiAgICByZWJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xuXG4gICAgICBpZiAoIWRhdGEuaGFzRXZlbnRGaWVsZHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byByZWJpbmQgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjeS5vbignbW91c2Vkb3duJywgJ25vZGUnLCBkYXRhLmVNb3VzZURvd24pXG4gICAgICAgIC5vbignbW91c2V1cCcsICdub2RlJywgZGF0YS5lTW91c2VVcClcbiAgICAgICAgLm9uKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcbiAgICAgICAgLm9uKCd0YXAnLCAnbm9kZScsIGRhdGEuZVRhcClcbiAgICAgICAgLm9uKCdhZGQnLCAnbm9kZScsIGRhdGEuZUFkZClcbiAgICAgICAgLm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24pXG4gICAgICAgIC5vbigncGFuIHpvb20nLCBkYXRhLmVQb3NpdGlvbilcbiAgICAgICAgLm9uKCdzZWxlY3QgdW5zZWxlY3QnLCBkYXRhLmVTZWxlY3QpXG4gICAgICAgIC5vbignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcbiAgICAgICAgLm9uKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSlcbiAgICAgICAgLm9uKCdhZnRlclVuZG8gYWZ0ZXJSZWRvJywgZGF0YS5lVW5kb1JlZG8pO1xuICAgIH1cbiAgfTtcblxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KGN5LmNvbnRhaW5lcigpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KGN5LmNvbnRhaW5lcigpLCBhcmd1bWVudHMpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1leHBhbmQtY29sbGFwc2UnKTtcblxufTtcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICAgKi9cbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IERhdGVcbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XG4gICAqIH0sIF8ubm93KCkpO1xuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gICAqL1xuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxuICAgKlxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gICAqXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xuICAgKlxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICogICAnbGVhZGluZyc6IHRydWUsXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcbiAgICpcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xuICAgKiAgIH1cbiAgICogfSwgWydkZWxldGUnXSk7XG4gICAqXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XG4gICAqXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXJncyxcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgIHN0YW1wLFxuICAgICAgICAgICAgdGhpc0FyZyxcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgICB9XG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgbGFzdENhbGxlZCA9IDA7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICAgIH1cbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHN0YW1wID0gbm93KCk7XG4gICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xuXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XG5cbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIHJldHVybiBkZWJvdW5jZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KHt9KTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc09iamVjdCgxKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGRlYm91bmNlO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsInZhciBkZWJvdW5jZTIgPSAoZnVuY3Rpb24gKCkge1xuICAvKipcbiAgICogU2xpZ2h0bHkgbW9kaWZpZWQgdmVyc2lvbiBvZiBkZWJvdW5jZS4gQ2FsbHMgZm4yIGF0IHRoZSBiZWdpbm5pbmcgb2YgZnJlcXVlbnQgY2FsbHMgdG8gZm4xXG4gICAqIEBzdGF0aWNcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuMSBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4yIFRoZSBmdW5jdGlvbiB0byBjYWxsIHRoZSBiZWdpbm5pbmcgb2YgZnJlcXVlbnQgY2FsbHMgdG8gZm4xXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlMihmbjEsIHdhaXQsIGZuMikge1xuICAgIGxldCB0aW1lb3V0O1xuICAgIGxldCBpc0luaXQgPSB0cnVlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGNvbnN0IGxhdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgZm4xLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpc0luaXQgPSB0cnVlO1xuICAgICAgfTtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIGlmIChpc0luaXQpIHtcbiAgICAgICAgZm4yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpc0luaXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIHJldHVybiBkZWJvdW5jZTI7XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlMjsiLCJmdW5jdGlvbiBlbGVtZW50VXRpbGl0aWVzKGN5KSB7XG4gcmV0dXJuIHtcbiAgbW92ZU5vZGVzOiBmdW5jdGlvbiAocG9zaXRpb25EaWZmLCBub2Rlcywgbm90Q2FsY1RvcE1vc3ROb2Rlcykge1xuICAgIHZhciB0b3BNb3N0Tm9kZXMgPSBub3RDYWxjVG9wTW9zdE5vZGVzID8gbm9kZXMgOiB0aGlzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgdmFyIG5vblBhcmVudHMgPSB0b3BNb3N0Tm9kZXMubm90KFwiOnBhcmVudFwiKTsgXG4gICAgLy8gbW92aW5nIHBhcmVudHMgc3BvaWxzIHBvc2l0aW9uaW5nLCBzbyBtb3ZlIG9ubHkgbm9ucGFyZW50c1xuICAgIG5vblBhcmVudHMucG9zaXRpb25zKGZ1bmN0aW9uKGVsZSwgaSl7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiBub25QYXJlbnRzW2ldLnBvc2l0aW9uKFwieFwiKSArIHBvc2l0aW9uRGlmZi54LFxuICAgICAgICB5OiBub25QYXJlbnRzW2ldLnBvc2l0aW9uKFwieVwiKSArIHBvc2l0aW9uRGlmZi55XG4gICAgICB9O1xuICAgIH0pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IHRvcE1vc3ROb2Rlc1tpXTtcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xuICAgIH1cbiAgfSxcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xuICAgIHZhciBub2Rlc01hcCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgZWxlID0gaTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcbiAgICAgIHdoaWxlIChwYXJlbnQgIT0gbnVsbCkge1xuICAgICAgICBpZiAobm9kZXNNYXBbcGFyZW50LmlkKCldKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQoKVswXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJvb3RzO1xuICB9LFxuICByZWFycmFuZ2U6IGZ1bmN0aW9uIChsYXlvdXRCeSkge1xuICAgIGlmICh0eXBlb2YgbGF5b3V0QnkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgbGF5b3V0QnkoKTtcbiAgICB9IGVsc2UgaWYgKGxheW91dEJ5ICE9IG51bGwpIHtcbiAgICAgIHZhciBsYXlvdXQgPSBjeS5sYXlvdXQobGF5b3V0QnkpO1xuICAgICAgaWYgKGxheW91dCAmJiBsYXlvdXQucnVuKSB7XG4gICAgICAgIGxheW91dC5ydW4oKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb246IGZ1bmN0aW9uIChtb2RlbFBvc2l0aW9uKSB7XG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XG4gICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgeDogeCxcbiAgICAgIHk6IHlcbiAgICB9O1xuICB9XG4gfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VXRpbGl0aWVzO1xuIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9ib3VuZGluZ0JveFV0aWxpdGllcycpO1xuXG4vLyBFeHBhbmQgY29sbGFwc2UgdXRpbGl0aWVzXG5mdW5jdGlvbiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyhjeSkge1xudmFyIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XG5yZXR1cm4ge1xuICAvL3RoZSBudW1iZXIgb2Ygbm9kZXMgbW92aW5nIGFuaW1hdGVkbHkgYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvblxuICBhbmltYXRlZGx5TW92aW5nTm9kZUNvdW50OiAwLFxuICAvKlxuICAgKiBBIGZ1bnRpb24gYmFzaWNseSBleHBhbmRpbmcgYSBub2RlLCBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5LlxuICAgKiBTaW5nbGUgcGFyYW1ldGVyIGluZGljYXRlcyBpZiB0aGUgbm9kZSBpcyBleHBhbmRlZCBhbG9uZSBhbmQgaWYgaXQgaXMgdHJ1dGh5IHRoZW4gbGF5b3V0QnkgcGFyYW1ldGVyIGlzIGNvbnNpZGVyZWQgdG9cbiAgICogcGVyZm9ybSBsYXlvdXQgYWZ0ZXIgZXhwYW5kLlxuICAgKi9cbiAgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbjogZnVuY3Rpb24gKG5vZGUsIHNpbmdsZSwgbGF5b3V0QnkpIHtcbiAgICBpZiAoIW5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbil7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy9jaGVjayBob3cgdGhlIHBvc2l0aW9uIG9mIHRoZSBub2RlIGlzIGNoYW5nZWRcbiAgICB2YXIgcG9zaXRpb25EaWZmID0ge1xuICAgICAgeDogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS54LFxuICAgICAgeTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS55XG4gICAgfTtcblxuICAgIG5vZGUucmVtb3ZlRGF0YShcImluZm9MYWJlbFwiKTtcbiAgICBub2RlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcblxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWV4cGFuZFwiKTtcbiAgICB2YXIgcmVzdG9yZWROb2RlcyA9IG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbjtcbiAgICByZXN0b3JlZE5vZGVzLnJlc3RvcmUoKTtcbiAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcmVzdG9yZWROb2Rlcy5sZW5ndGg7IGkrKyl7XG4gICAgICBkZWxldGUgcGFyZW50RGF0YVtyZXN0b3JlZE5vZGVzW2ldLmlkKCldO1xuICAgIH1cbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGEgPSBwYXJlbnREYXRhO1xuICAgIHRoaXMucmVwYWlyRWRnZXMobm9kZSk7XG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gbnVsbDtcblxuICAgIGVsZW1lbnRVdGlsaXRpZXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgbm9kZS5jaGlsZHJlbigpKTtcbiAgICBub2RlLnJlbW92ZURhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpO1xuXG4gICAgbm9kZS50cmlnZ2VyKFwicG9zaXRpb25cIik7IC8vIHBvc2l0aW9uIG5vdCB0cmlnZ2VyZWQgYnkgZGVmYXVsdCB3aGVuIG5vZGVzIGFyZSBtb3ZlZFxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kXCIpO1xuXG4gICAgLy8gSWYgZXhwYW5kIGlzIGNhbGxlZCBqdXN0IGZvciBvbmUgbm9kZSB0aGVuIGNhbGwgZW5kIG9wZXJhdGlvbiB0byBwZXJmb3JtIGxheW91dFxuICAgIGlmIChzaW5nbGUpIHtcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKGxheW91dEJ5LCBub2RlKTtcbiAgICB9XG4gIH0sXG4gIC8qXG4gICAqIEEgaGVscGVyIGZ1bmN0aW9uIHRvIGNvbGxhcHNlIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXG4gICAqIEl0IGNvbGxhcHNlcyBhbGwgcm9vdCBub2RlcyBib3R0b20gdXAuXG4gICAqL1xuICBzaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXG4gICAgbm9kZXMuZGF0YShcImNvbGxhcHNlXCIsIHRydWUpO1xuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xuICAgICAgXG4gICAgICAvLyBDb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLypcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gZXhwYW5kIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXG4gICAqIEl0IGV4cGFuZHMgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duLlxuICAgKi9cbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xuICAgIG5vZGVzLmRhdGEoXCJleHBhbmRcIiwgdHJ1ZSk7IC8vIE1hcmsgdGhhdCB0aGUgbm9kZXMgYXJlIHN0aWxsIHRvIGJlIGV4cGFuZGVkXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24ocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpOyAvLyBGb3IgZWFjaCByb290IG5vZGUgZXhwYW5kIHRvcCBkb3duXG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLypcbiAgICogRXhwYW5kcyBhbGwgbm9kZXMgYnkgZXhwYW5kaW5nIGFsbCB0b3AgbW9zdCBub2RlcyB0b3AgZG93biB3aXRoIHRoZWlyIGRlc2NlbmRhbnRzLlxuICAgKi9cbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcbiAgICBpZiAobm9kZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbm9kZXMgPSBjeS5ub2RlcygpO1xuICAgIH1cbiAgICB2YXIgb3JwaGFucztcbiAgICBvcnBoYW5zID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIHZhciBleHBhbmRTdGFjayA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJvb3QgPSBvcnBoYW5zW2ldO1xuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBleHBhbmRTdGFjaztcbiAgfSxcbiAgLypcbiAgICogVGhlIG9wZXJhdGlvbiB0byBiZSBwZXJmb3JtZWQgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCByZWFycmFuZ2Ugbm9kZXMgYnkgbGF5b3V0QnkgcGFyYW1ldGVyLlxuICAgKi9cbiAgZW5kT3BlcmF0aW9uOiBmdW5jdGlvbiAobGF5b3V0QnksIG5vZGVzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGN5LnJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcbiAgICAgICAgaWYoY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCl7XG4gICAgICAgICAgbm9kZXMuc2VsZWN0aWZ5KCk7XG4gICAgICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9LCAwKTtcbiAgICAgIFxuICAgIH0pO1xuICB9LFxuICAvKlxuICAgKiBDYWxscyBzaW1wbGUgZXhwYW5kQWxsTm9kZXMuIFRoZW4gcGVyZm9ybXMgZW5kIG9wZXJhdGlvbi5cbiAgICovXG4gIGV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xuICAgIHZhciBleHBhbmRlZFN0YWNrID0gdGhpcy5zaW1wbGVFeHBhbmRBbGxOb2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcblxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcblxuICAgIC8qXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgKi9cbiAgICByZXR1cm4gZXhwYW5kZWRTdGFjaztcbiAgfSxcbiAgLypcbiAgICogRXhwYW5kcyB0aGUgcm9vdCBhbmQgaXRzIGNvbGxhcHNlZCBkZXNjZW5kZW50cyBpbiB0b3AgZG93biBvcmRlci5cbiAgICovXG4gIGV4cGFuZEFsbFRvcERvd246IGZ1bmN0aW9uIChyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcbiAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIGV4cGFuZFN0YWNrLnB1c2gocm9vdCk7XG4gICAgICB0aGlzLmV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihub2RlLCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgfSxcbiAgLy9FeHBhbmQgdGhlIGdpdmVuIG5vZGVzIHBlcmZvcm0gZW5kIG9wZXJhdGlvbiBhZnRlciBleHBhbmRhdGlvblxuICBleHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHRvIGV4cGFuZCB3ZSBuZWVkIHRvIGFuaW1hdGUgZm9yIGZpc2hleWUgdmlldywgYnV0IGlmIHRoZXJlIGFyZSBtb3JlIHRoZW4gb25lIG5vZGUgd2UgZG8gbm90XG4gICAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgXG4gICAgICB2YXIgbm9kZSA9IG5vZGVzWzBdO1xuICAgICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICAgIC8vIEV4cGFuZCB0aGUgZ2l2ZW4gbm9kZSB0aGUgdGhpcmQgcGFyYW1ldGVyIGluZGljYXRlcyB0aGF0IHRoZSBub2RlIGlzIHNpbXBsZSB3aGljaCBlbnN1cmVzIHRoYXQgZmlzaGV5ZSBwYXJhbWV0ZXIgd2lsbCBiZSBjb25zaWRlcmVkXG4gICAgICAgIHRoaXMuZXhwYW5kTm9kZShub2RlLCBvcHRpb25zLmZpc2hleWUsIHRydWUsIG9wdGlvbnMuYW5pbWF0ZSwgb3B0aW9ucy5sYXlvdXRCeSwgb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbik7XG4gICAgICB9XG4gICAgfSBcbiAgICBlbHNlIHtcbiAgICAgIC8vIEZpcnN0IGV4cGFuZCBnaXZlbiBub2RlcyBhbmQgdGhlbiBwZXJmb3JtIGxheW91dCBhY2NvcmRpbmcgdG8gdGhlIGxheW91dEJ5IHBhcmFtZXRlclxuICAgICAgdGhpcy5zaW1wbGVFeHBhbmRHaXZlbk5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xuICAgICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgKi9cbiAgICByZXR1cm4gbm9kZXM7XG4gIH0sXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGVzIHRoZW4gcGVyZm9ybSBlbmQgb3BlcmF0aW9uXG4gIGNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7XG4gICAgLypcbiAgICAgKiBJbiBjb2xsYXBzZSBvcGVyYXRpb24gdGhlcmUgaXMgbm8gZmlzaGV5ZSB2aWV3IHRvIGJlIGFwcGxpZWQgc28gdGhlcmUgaXMgbm8gYW5pbWF0aW9uIHRvIGJlIGRlc3Ryb3llZCBoZXJlLiBXZSBjYW4gZG8gdGhpcyBcbiAgICAgKiBpbiBhIGJhdGNoLlxuICAgICAqLyBcbiAgICBjeS5zdGFydEJhdGNoKCk7XG4gICAgdGhpcy5zaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXMobm9kZXMvKiwgb3B0aW9ucyovKTtcbiAgICBjeS5lbmRCYXRjaCgpO1xuXG4gICAgbm9kZXMudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBjb2xsYXBzZU5vZGUgaXMgY2FsbGVkXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xuXG4gICAgLy8gVXBkYXRlIHRoZSBzdHlsZVxuICAgIGN5LnN0eWxlKCkudXBkYXRlKCk7XG5cbiAgICAvKlxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXG4gICAgICovXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9LFxuICAvL2NvbGxhcHNlIHRoZSBub2RlcyBpbiBib3R0b20gdXAgb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxuICBjb2xsYXBzZUJvdHRvbVVwOiBmdW5jdGlvbiAocm9vdCkge1xuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKG5vZGUpO1xuICAgIH1cbiAgICAvL0lmIHRoZSByb290IGlzIGEgY29tcG91bmQgbm9kZSB0byBiZSBjb2xsYXBzZWQgdGhlbiBjb2xsYXBzZSBpdFxuICAgIGlmIChyb290LmRhdGEoXCJjb2xsYXBzZVwiKSAmJiByb290LmNoaWxkcmVuKCkubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5jb2xsYXBzZU5vZGUocm9vdCk7XG4gICAgICByb290LnJlbW92ZURhdGEoXCJjb2xsYXBzZVwiKTtcbiAgICB9XG4gIH0sXG4gIC8vZXhwYW5kIHRoZSBub2RlcyBpbiB0b3AgZG93biBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XG4gIGV4cGFuZFRvcERvd246IGZ1bmN0aW9uIChyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xuICAgIGlmIChyb290LmRhdGEoXCJleHBhbmRcIikgJiYgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIC8vIEV4cGFuZCB0aGUgcm9vdCBhbmQgdW5tYXJrIGl0cyBleHBhbmQgZGF0YSB0byBzcGVjaWZ5IHRoYXQgaXQgaXMgbm8gbW9yZSB0byBiZSBleHBhbmRlZFxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImV4cGFuZFwiKTtcbiAgICB9XG4gICAgLy8gTWFrZSBhIHJlY3Vyc2l2ZSBjYWxsIGZvciBjaGlsZHJlbiBvZiByb290XG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24obm9kZSk7XG4gICAgfVxuICB9LFxuICAvLyBDb252ZXJzdCB0aGUgcmVuZGVyZWQgcG9zaXRpb24gdG8gbW9kZWwgcG9zaXRpb24gYWNjb3JkaW5nIHRvIGdsb2JhbCBwYW4gYW5kIHpvb20gdmFsdWVzXG4gIGNvbnZlcnRUb01vZGVsUG9zaXRpb246IGZ1bmN0aW9uIChyZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcbiAgICB2YXIgeSA9IChyZW5kZXJlZFBvc2l0aW9uLnkgLSBwYW4ueSkgLyB6b29tO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5XG4gICAgfTtcbiAgfSxcbiAgLypcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZS4gSXQgY29uc2lkZXJzIGFwcGx5RmlzaEV5ZVZpZXcsIGFuaW1hdGUgYW5kIGxheW91dEJ5IHBhcmFtZXRlcnMuXG4gICAqIEl0IGFsc28gY29uc2lkZXJzIHNpbmdsZSBwYXJhbWV0ZXIgd2hpY2ggaW5kaWNhdGVzIGlmIHRoaXMgbm9kZSBpcyBleHBhbmRlZCBhbG9uZS4gSWYgdGhpcyBwYXJhbWV0ZXIgaXMgdHJ1dGh5IGFsb25nIHdpdGggXG4gICAqIGFwcGx5RmlzaEV5ZVZpZXcgcGFyYW1ldGVyIHRoZW4gdGhlIHN0YXRlIG9mIHZpZXcgcG9ydCBpcyB0byBiZSBjaGFuZ2VkIHRvIGhhdmUgZXh0cmEgc3BhY2Ugb24gdGhlIHNjcmVlbiAoaWYgbmVlZGVkKSBiZWZvcmUgYXBwbGl5aW5nIHRoZVxuICAgKiBmaXNoZXllIHZpZXcuXG4gICAqL1xuICBleHBhbmROb2RlOiBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgdmFyIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXcpIHtcblxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gPSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udztcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlzaGV5ZSB2aWV3IGV4cGFuZCB0aGUgbm9kZS5cbiAgICAgICAgLy8gVGhlIGZpcnN0IHBhcmFtdGVyIGluZGljYXRlcyB0aGUgbm9kZSB0byBhcHBseSBmaXNoZXllIHZpZXcsIHRoZSB0aGlyZCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoZSBub2RlXG4gICAgICAgIC8vIHRvIGJlIGV4cGFuZGVkIGFmdGVyIGZpc2hleWUgdmlldyBpcyBhcHBsaWVkLlxuICAgICAgICBzZWxmLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUsIHNpbmdsZSwgbm9kZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSWYgb25lIG9mIHRoZXNlIHBhcmFtZXRlcnMgaXMgdHJ1dGh5IGl0IG1lYW5zIHRoYXQgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbiBpcyBhbHJlYWR5IHRvIGJlIGNhbGxlZC5cbiAgICAgIC8vIEhvd2V2ZXIgaWYgbm9uZSBvZiB0aGVtIGlzIHRydXRoeSB3ZSBuZWVkIHRvIGNhbGwgaXQgaGVyZS5cbiAgICAgIGlmICghc2luZ2xlIHx8ICFhcHBseUZpc2hFeWVWaWV3IHx8ICFhbmltYXRlKSB7XG4gICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlLCBzaW5nbGUsIGxheW91dEJ5KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZSk7XG4gICAgICB2YXIgYW5pbWF0aW5nID0gZmFsc2U7IC8vIFZhcmlhYmxlIHRvIGNoZWNrIGlmIHRoZXJlIGlzIGEgY3VycmVudCBhbmltYXRpb24sIGlmIHRoZXJlIGlzIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbmltYXRpb25cbiAgICAgIFxuICAgICAgLy8gSWYgdGhlIG5vZGUgaXMgdGhlIG9ubHkgbm9kZSB0byBleHBhbmQgYW5kIGZpc2hleWUgdmlldyBzaG91bGQgYmUgYXBwbGllZCwgdGhlbiBjaGFuZ2UgdGhlIHN0YXRlIG9mIHZpZXdwb3J0IFxuICAgICAgLy8gdG8gY3JlYXRlIG1vcmUgc3BhY2Ugb24gc2NyZWVuIChJZiBuZWVkZWQpXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlldyAmJiBzaW5nbGUpIHtcbiAgICAgICAgdmFyIHRvcExlZnRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogMCwgeTogMH0pO1xuICAgICAgICB2YXIgYm90dG9tUmlnaHRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogY3kud2lkdGgoKSwgeTogY3kuaGVpZ2h0KCl9KTtcbiAgICAgICAgdmFyIHBhZGRpbmcgPSA4MDtcbiAgICAgICAgdmFyIGJiID0ge1xuICAgICAgICAgIHgxOiB0b3BMZWZ0UG9zaXRpb24ueCxcbiAgICAgICAgICB4MjogYm90dG9tUmlnaHRQb3NpdGlvbi54LFxuICAgICAgICAgIHkxOiB0b3BMZWZ0UG9zaXRpb24ueSxcbiAgICAgICAgICB5MjogYm90dG9tUmlnaHRQb3NpdGlvbi55XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG5vZGVCQiA9IHtcbiAgICAgICAgICB4MTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLncgLyAyIC0gcGFkZGluZyxcbiAgICAgICAgICB4Mjogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ICsgbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLncgLyAyICsgcGFkZGluZyxcbiAgICAgICAgICB5MTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmggLyAyIC0gcGFkZGluZyxcbiAgICAgICAgICB5Mjogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ICsgbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmggLyAyICsgcGFkZGluZ1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB1bmlvbkJCID0gYm91bmRpbmdCb3hVdGlsaXRpZXMuZ2V0VW5pb24obm9kZUJCLCBiYik7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB0aGVzZSBiYm94ZXMgYXJlIG5vdCBlcXVhbCB0aGVuIHdlIG5lZWQgdG8gY2hhbmdlIHRoZSB2aWV3cG9ydCBzdGF0ZSAoYnkgcGFuIGFuZCB6b29tKVxuICAgICAgICBpZiAoIWJvdW5kaW5nQm94VXRpbGl0aWVzLmVxdWFsQm91bmRpbmdCb3hlcyh1bmlvbkJCLCBiYikpIHtcbiAgICAgICAgICB2YXIgdmlld1BvcnQgPSBjeS5nZXRGaXRWaWV3cG9ydCh1bmlvbkJCLCAxMCk7XG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgIGFuaW1hdGluZyA9IGFuaW1hdGU7IC8vIFNpZ25hbCB0aGF0IHRoZXJlIGlzIGFuIGFuaW1hdGlvbiBub3cgYW5kIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbmltYXRpb25cbiAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFuaW1hdGUgZHVyaW5nIHBhbiBhbmQgem9vbVxuICAgICAgICAgIGlmIChhbmltYXRlKSB7XG4gICAgICAgICAgICBjeS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgcGFuOiB2aWV3UG9ydC5wYW4sXG4gICAgICAgICAgICAgIHpvb206IHZpZXdQb3J0Lnpvb20sXG4gICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBkdXJhdGlvbjogYW5pbWF0aW9uRHVyYXRpb24gfHwgMTAwMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3kuem9vbSh2aWV3UG9ydC56b29tKTtcbiAgICAgICAgICAgIGN5LnBhbih2aWV3UG9ydC5wYW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBJZiBhbmltYXRpbmcgaXMgbm90IHRydWUgd2UgbmVlZCB0byBjYWxsIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiBoZXJlXG4gICAgICBpZiAoIWFuaW1hdGluZykge1xuICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfSxcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZSB3aXRob3V0IHBlcmZvcm1pbmcgZW5kIG9wZXJhdGlvblxuICBjb2xsYXBzZU5vZGU6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XG4gICAgICBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScsIHtcbiAgICAgICAgeDogbm9kZS5wb3NpdGlvbigpLngsXG4gICAgICAgIHk6IG5vZGUucG9zaXRpb24oKS55XG4gICAgICB9KTtcblxuICAgICAgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScsIHtcbiAgICAgICAgdzogbm9kZS5vdXRlcldpZHRoKCksXG4gICAgICAgIGg6IG5vZGUub3V0ZXJIZWlnaHQoKVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcblxuICAgICAgY2hpbGRyZW4udW5zZWxlY3QoKTtcbiAgICAgIGNoaWxkcmVuLmNvbm5lY3RlZEVkZ2VzKCkudW5zZWxlY3QoKTtcblxuICAgICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYmVmb3JlY29sbGFwc2VcIik7XG4gICAgICBcbiAgICAgIHRoaXMuYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuKG5vZGUpO1xuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihub2RlLCBub2RlKTtcbiAgICAgIG5vZGUuYWRkQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xuXG4gICAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlXCIpO1xuICAgICAgXG4gICAgICBub2RlLnBvc2l0aW9uKG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykpO1xuXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfSxcbiAgc3RvcmVXaWR0aEhlaWdodDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xuICAgIGlmIChub2RlICE9IG51bGwpIHtcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUub3V0ZXJXaWR0aCgpO1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xuICAgICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZS5wYXJlbnQoKVswXSk7XG4gICAgICB9XG4gICAgfVxuXG4gIH0sXG4gIC8qXG4gICAqIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgZ2l2ZW4gbm9kZS4gbm9kZVRvRXhwYW5kIHdpbGwgYmUgZXhwYW5kZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbi4gXG4gICAqIFRoZSBvdGhlciBwYXJhbWV0ZXIgYXJlIHRvIGJlIHBhc3NlZCBieSBwYXJhbWV0ZXJzIGRpcmVjdGx5IGluIGludGVybmFsIGZ1bmN0aW9uIGNhbGxzLlxuICAgKi9cbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XG4gICAgdmFyIHNpYmxpbmdzID0gdGhpcy5nZXRTaWJsaW5ncyhub2RlKTtcblxuICAgIHZhciB4X2EgPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuICAgIHZhciB5X2EgPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuXG4gICAgdmFyIGRfeF9sZWZ0ID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xuICAgIHZhciBkX3hfcmlnaHQgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XG4gICAgdmFyIGRfeV91cHBlciA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xuICAgIHZhciBkX3lfbG93ZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcblxuICAgIHZhciBhYnNfZGlmZl9vbl94ID0gTWF0aC5hYnMobm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gLSB4X2EpO1xuICAgIHZhciBhYnNfZGlmZl9vbl95ID0gTWF0aC5hYnMobm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gLSB5X2EpO1xuXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gTEVGVFxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSA+IHhfYSkge1xuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCArIGFic19kaWZmX29uX3g7XG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgLSBhYnNfZGlmZl9vbl94O1xuICAgIH1cbiAgICAvLyBDZW50ZXIgd2VudCB0byBSSUdIVFxuICAgIGVsc2Uge1xuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCAtIGFic19kaWZmX29uX3g7XG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgKyBhYnNfZGlmZl9vbl94O1xuICAgIH1cblxuICAgIC8vIENlbnRlciB3ZW50IHRvIFVQXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddID4geV9hKSB7XG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgKyBhYnNfZGlmZl9vbl95O1xuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyIC0gYWJzX2RpZmZfb25feTtcbiAgICB9XG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gRE9XTlxuICAgIGVsc2Uge1xuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyIC0gYWJzX2RpZmZfb25feTtcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciArIGFic19kaWZmX29uX3k7XG4gICAgfVxuXG4gICAgdmFyIHhQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcbiAgICB2YXIgeVBvc0luUGFyZW50U2libGluZyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgeFBvc0luUGFyZW50U2libGluZy5wdXNoKHRoaXMueFBvc2l0aW9uSW5QYXJlbnQoc2libGluZ3NbaV0pKTtcbiAgICAgIHlQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnlQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHNpYmxpbmcgPSBzaWJsaW5nc1tpXTtcblxuICAgICAgdmFyIHhfYiA9IHhQb3NJblBhcmVudFNpYmxpbmdbaV07XG4gICAgICB2YXIgeV9iID0geVBvc0luUGFyZW50U2libGluZ1tpXTtcblxuICAgICAgdmFyIHNsb3BlID0gKHlfYiAtIHlfYSkgLyAoeF9iIC0geF9hKTtcblxuICAgICAgdmFyIGRfeCA9IDA7XG4gICAgICB2YXIgZF95ID0gMDtcbiAgICAgIHZhciBUX3ggPSAwO1xuICAgICAgdmFyIFRfeSA9IDA7XG5cbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTEVGVFxuICAgICAgaWYgKHhfYSA+IHhfYikge1xuICAgICAgICBkX3ggPSBkX3hfbGVmdDtcbiAgICAgIH1cbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgUklHSFRcbiAgICAgIGVsc2Uge1xuICAgICAgICBkX3ggPSBkX3hfcmlnaHQ7XG4gICAgICB9XG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFVQUEVSIHNpZGVcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcbiAgICAgICAgZF95ID0gZF95X3VwcGVyO1xuICAgICAgfVxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMT1dFUiBzaWRlXG4gICAgICBlbHNlIHtcbiAgICAgICAgZF95ID0gZF95X2xvd2VyO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNGaW5pdGUoc2xvcGUpKSB7XG4gICAgICAgIFRfeCA9IE1hdGgubWluKGRfeCwgKGRfeSAvIE1hdGguYWJzKHNsb3BlKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2xvcGUgIT09IDApIHtcbiAgICAgICAgVF95ID0gTWF0aC5taW4oZF95LCAoZF94ICogTWF0aC5hYnMoc2xvcGUpKSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcbiAgICAgICAgVF94ID0gLTEgKiBUX3g7XG4gICAgICB9XG5cbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcbiAgICAgICAgVF95ID0gLTEgKiBUX3k7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIE1vdmUgdGhlIHNpYmxpbmcgaW4gdGhlIHNwZWNpYWwgd2F5XG4gICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoc2libGluZywgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIG5vIHNpYmxpbmcgY2FsbCBleHBhbmQgbm9kZSBiYXNlIGZ1bmN0aW9uIGhlcmUgZWxzZSBpdCBpcyB0byBiZSBjYWxsZWQgb25lIG9mIGZpc2hFeWVWaWV3TW92ZU5vZGUoKSBjYWxsc1xuICAgIGlmIChzaWJsaW5ncy5sZW5ndGggPT0gMCkge1xuICAgICAgdGhpcy5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBsYXlvdXRCeSk7XG4gICAgfVxuXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xuICAgICAgLy8gQXBwbHkgZmlzaGV5ZSB2aWV3IHRvIHRoZSBwYXJlbnQgbm9kZSBhcyB3ZWxsICggSWYgZXhpc3RzIClcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZS5wYXJlbnQoKVswXSwgc2luZ2xlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH0sXG4gIGdldFNpYmxpbmdzOiBmdW5jdGlvbiAobm9kZSkge1xuICAgIHZhciBzaWJsaW5ncztcblxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdID09IG51bGwpIHtcbiAgICAgIHZhciBvcnBoYW5zID0gY3kubm9kZXMoXCI6dmlzaWJsZVwiKS5vcnBoYW5zKCk7XG4gICAgICBzaWJsaW5ncyA9IG9ycGhhbnMuZGlmZmVyZW5jZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2libGluZ3MgPSBub2RlLnNpYmxpbmdzKFwiOnZpc2libGVcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpYmxpbmdzO1xuICB9LFxuICAvKlxuICAgKiBNb3ZlIG5vZGUgb3BlcmF0aW9uIHNwZWNpYWxpemVkIGZvciBmaXNoIGV5ZSB2aWV3IGV4cGFuZCBvcGVyYXRpb25cbiAgICogTW92ZXMgdGhlIG5vZGUgYnkgbW92aW5nIGl0cyBkZXNjYW5kZW50cy4gTW92ZW1lbnQgaXMgYW5pbWF0ZWQgaWYgYm90aCBzaW5nbGUgYW5kIGFuaW1hdGUgZmxhZ3MgYXJlIHRydXRoeS5cbiAgICovXG4gIGZpc2hFeWVWaWV3TW92ZU5vZGU6IGZ1bmN0aW9uIChub2RlLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xuICAgIHZhciBjaGlsZHJlbkxpc3QgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgaWYobm9kZS5pc1BhcmVudCgpKXtcbiAgICAgICBjaGlsZHJlbkxpc3QgPSBub2RlLmNoaWxkcmVuKFwiOnZpc2libGVcIik7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBcbiAgICAvKlxuICAgICAqIElmIHRoZSBub2RlIGlzIHNpbXBsZSBtb3ZlIGl0c2VsZiBkaXJlY3RseSBlbHNlIG1vdmUgaXQgYnkgbW92aW5nIGl0cyBjaGlsZHJlbiBieSBhIHNlbGYgcmVjdXJzaXZlIGNhbGxcbiAgICAgKi9cbiAgICBpZiAoY2hpbGRyZW5MaXN0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICB2YXIgbmV3UG9zaXRpb24gPSB7eDogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ICsgVF94LCB5OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgKyBUX3l9O1xuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFuaW1hdGUpIHtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ID0gbmV3UG9zaXRpb24ueDtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ID0gbmV3UG9zaXRpb24ueTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgIW5vZGVUb0V4cGFuZC5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcblxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIGFsbCBub2RlcyBhcmUgbW92ZWQgd2UgYXJlIHJlYWR5IHRvIGV4cGFuZCBzbyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb25cbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xuXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDEwMDBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgeFBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcbiAgICB2YXIgeF9hID0gMC4wO1xuXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICB4X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3gnKSArIChwYXJlbnQud2lkdGgoKSAvIDIpO1xuICAgIH1cbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuXG4gICAgZWxzZSB7XG4gICAgICB4X2EgPSBub2RlLnBvc2l0aW9uKCd4Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHhfYTtcbiAgfSxcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcblxuICAgIHZhciB5X2EgPSAwLjA7XG5cbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgIHlfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneScpICsgKHBhcmVudC5oZWlnaHQoKSAvIDIpO1xuICAgIH1cbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuXG4gICAgZWxzZSB7XG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHlfYTtcbiAgfSxcbiAgLypcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxuICAgKiB3aXRoIHRoZSBzYW1lIHJvb3QgcGFyYW1ldGVyLFxuICAgKiByZW1vdmUgdGhlIGNoaWxkIGFuZCBhZGQgdGhlIHJlbW92ZWQgY2hpbGQgdG8gdGhlIGNvbGxhcHNlZGNoaWxkcmVuIGRhdGFcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXG4gICAqIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiBrZWVwcyB0aGUgbm9kZXMgdG8gcmVzdG9yZSB3aGVuIHRoZVxuICAgKiByb290IGlzIGV4cGFuZGVkXG4gICAqL1xuICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKGNoaWxkLCByb290KTtcbiAgICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xuICAgICAgcGFyZW50RGF0YVtjaGlsZC5pZCgpXSA9IGNoaWxkLnBhcmVudCgpO1xuICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhID0gcGFyZW50RGF0YTtcbiAgICAgIHZhciByZW1vdmVkQ2hpbGQgPSBjaGlsZC5yZW1vdmUoKTtcbiAgICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkQ2hpbGQ7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHJlbW92ZWRDaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBpc01ldGFFZGdlOiBmdW5jdGlvbihlZGdlKSB7XG4gICAgcmV0dXJuIGVkZ2UuaGFzQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xuICB9LFxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgcmVsYXRlZE5vZGVzID0gbm9kZS5kZXNjZW5kYW50cygpO1xuICAgIHZhciBlZGdlcyA9IHJlbGF0ZWROb2Rlcy5lZGdlc1dpdGgoY3kubm9kZXMoKS5ub3QocmVsYXRlZE5vZGVzLnVuaW9uKG5vZGUpKSk7XG4gICAgXG4gICAgdmFyIHJlbGF0ZWROb2RlTWFwID0ge307XG4gICAgXG4gICAgcmVsYXRlZE5vZGVzLmVhY2goZnVuY3Rpb24oZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICByZWxhdGVkTm9kZU1hcFtlbGUuaWQoKV0gPSB0cnVlO1xuICAgIH0pO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XG4gICAgICB2YXIgc291cmNlID0gZWRnZS5zb3VyY2UoKTtcbiAgICAgIHZhciB0YXJnZXQgPSBlZGdlLnRhcmdldCgpO1xuICAgICAgXG4gICAgICBpZiAoIXRoaXMuaXNNZXRhRWRnZShlZGdlKSkgeyAvLyBpcyBvcmlnaW5hbFxuICAgICAgICB2YXIgb3JpZ2luYWxFbmRzRGF0YSA9IHtcbiAgICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XG4gICAgICAgIGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJywgb3JpZ2luYWxFbmRzRGF0YSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGVkZ2UubW92ZSh7XG4gICAgICAgIHRhcmdldDogIXJlbGF0ZWROb2RlTWFwW3RhcmdldC5pZCgpXSA/IHRhcmdldC5pZCgpIDogbm9kZS5pZCgpLFxuICAgICAgICBzb3VyY2U6ICFyZWxhdGVkTm9kZU1hcFtzb3VyY2UuaWQoKV0gPyBzb3VyY2UuaWQoKSA6IG5vZGUuaWQoKVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBmaW5kTmV3RW5kOiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBub2RlO1xuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xuICAgIHZhciBwYXJlbnQgPSBwYXJlbnREYXRhW2N1cnJlbnQuaWQoKV07XG4gICAgXG4gICAgd2hpbGUoICFjdXJyZW50Lmluc2lkZSgpICkge1xuICAgICAgY3VycmVudCA9IHBhcmVudDtcbiAgICAgIHBhcmVudCA9IHBhcmVudERhdGFbcGFyZW50LmlkKCldO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY3VycmVudDtcbiAgfSxcbiAgcmVwYWlyRWRnZXM6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgY29ubmVjdGVkTWV0YUVkZ2VzID0gbm9kZS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbm5lY3RlZE1ldGFFZGdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGVkZ2UgPSBjb25uZWN0ZWRNZXRhRWRnZXNbaV07XG4gICAgICB2YXIgb3JpZ2luYWxFbmRzID0gZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnKTtcbiAgICAgIHZhciBjdXJyZW50U3JjSWQgPSBlZGdlLmRhdGEoJ3NvdXJjZScpO1xuICAgICAgdmFyIGN1cnJlbnRUZ3RJZCA9IGVkZ2UuZGF0YSgndGFyZ2V0Jyk7XG4gICAgICBcbiAgICAgIGlmICggY3VycmVudFNyY0lkID09PSBub2RlLmlkKCkgKSB7XG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUoe1xuICAgICAgICAgIHNvdXJjZTogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy5zb3VyY2UpLmlkKClcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMudGFyZ2V0KS5pZCgpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoIGVkZ2UuZGF0YSgnc291cmNlJykgPT09IG9yaWdpbmFsRW5kcy5zb3VyY2UuaWQoKSAmJiBlZGdlLmRhdGEoJ3RhcmdldCcpID09PSBvcmlnaW5hbEVuZHMudGFyZ2V0LmlkKCkgKSB7XG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcbiAgICAgICAgZWRnZS5yZW1vdmVEYXRhKCdvcmlnaW5hbEVuZHMnKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIC8qbm9kZSBpcyBhbiBvdXRlciBub2RlIG9mIHJvb3RcbiAgIGlmIHJvb3QgaXMgbm90IGl0J3MgYW5jaGVzdG9yXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXG4gIGlzT3V0ZXJOb2RlOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkgey8vKi8vXG4gICAgdmFyIHRlbXAgPSBub2RlO1xuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcbiAgICAgIGlmICh0ZW1wID09IHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdGVtcCA9IHRlbXAucGFyZW50KClbMF07XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICAvKipcbiAgICogR2V0IGFsbCBjb2xsYXBzZWQgY2hpbGRyZW4gLSBpbmNsdWRpbmcgbmVzdGVkIG9uZXNcbiAgICogQHBhcmFtIG5vZGUgOiBhIGNvbGxhcHNlZCBub2RlXG4gICAqIEBwYXJhbSBjb2xsYXBzZWRDaGlsZHJlbiA6IGEgY29sbGVjdGlvbiB0byBzdG9yZSB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm4gOiBjb2xsYXBzZWQgY2hpbGRyZW5cbiAgICovXG4gIGdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHk6IGZ1bmN0aW9uKG5vZGUsIGNvbGxhcHNlZENoaWxkcmVuKXtcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJykgfHwgW107XG4gICAgdmFyIGk7XG4gICAgZm9yIChpPTA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICBpZiAoY2hpbGRyZW5baV0uZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKSl7XG4gICAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24odGhpcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KGNoaWxkcmVuW2ldLCBjb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgfVxuICAgICAgY29sbGFwc2VkQ2hpbGRyZW4gPSBjb2xsYXBzZWRDaGlsZHJlbi51bmlvbihjaGlsZHJlbltpXSk7XG4gICAgfVxuICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcbiAgfSxcbiAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gc3RhcnQgc2VjdGlvbiBlZGdlIGV4cGFuZCBjb2xsYXBzZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuICBjb2xsYXBzZUdpdmVuRWRnZXM6IGZ1bmN0aW9uIChlZGdlcywgb3B0aW9ucykge1xuICAgIGVkZ2VzLnVuc2VsZWN0KCk7XG4gICAgdmFyIG5vZGVzID0gZWRnZXMuY29ubmVjdGVkTm9kZXMoKTtcbiAgICB2YXIgZWRnZXNUb0NvbGxhcHNlID0ge307XG4gICAgLy8gZ3JvdXAgZWRnZXMgYnkgdHlwZSBpZiB0aGlzIG9wdGlvbiBpcyBzZXQgdG8gdHJ1ZVxuICAgIGlmIChvcHRpb25zLmdyb3VwRWRnZXNPZlNhbWVUeXBlT25Db2xsYXBzZSkge1xuICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xuICAgICAgICB2YXIgZWRnZVR5cGUgPSBcInVua25vd25cIjtcbiAgICAgICAgaWYgKG9wdGlvbnMuZWRnZVR5cGVJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlZGdlVHlwZSA9IG9wdGlvbnMuZWRnZVR5cGVJbmZvIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcHRpb25zLmVkZ2VUeXBlSW5mby5jYWxsKGVkZ2UpIDogZWRnZS5kYXRhKClbb3B0aW9ucy5lZGdlVHlwZUluZm9dO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2UuaGFzT3duUHJvcGVydHkoZWRnZVR5cGUpKSB7XG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5lZGdlcyA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZWRnZXMuYWRkKGVkZ2UpO1xuXG4gICAgICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZGlyZWN0aW9uVHlwZSA9PSBcInVuaWRpcmVjdGlvblwiICYmIChlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLnNvdXJjZSAhPSBlZGdlLnNvdXJjZSgpLmlkKCkgfHwgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS50YXJnZXQgIT0gZWRnZS50YXJnZXQoKS5pZCgpKSkge1xuICAgICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5kaXJlY3Rpb25UeXBlID0gXCJiaWRpcmVjdGlvblwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZWRnZXNYID0gY3kuY29sbGVjdGlvbigpO1xuICAgICAgICAgIGVkZ2VzWCA9IGVkZ2VzWC5hZGQoZWRnZSk7XG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXSA9IHsgZWRnZXM6IGVkZ2VzWCwgZGlyZWN0aW9uVHlwZTogXCJ1bmlkaXJlY3Rpb25cIiwgc291cmNlOiBlZGdlLnNvdXJjZSgpLmlkKCksIHRhcmdldDogZWRnZS50YXJnZXQoKS5pZCgpIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0gPSB7IGVkZ2VzOiBlZGdlcywgZGlyZWN0aW9uVHlwZTogXCJ1bmlkaXJlY3Rpb25cIiwgc291cmNlOiBlZGdlc1swXS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVkZ2VzWzBdLnRhcmdldCgpLmlkKCkgfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS5kaXJlY3Rpb25UeXBlID09IFwidW5pZGlyZWN0aW9uXCIgJiYgKGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0uc291cmNlICE9IGVkZ2VzW2ldLnNvdXJjZSgpLmlkKCkgfHwgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS50YXJnZXQgIT0gZWRnZXNbaV0udGFyZ2V0KCkuaWQoKSkpIHtcbiAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLmRpcmVjdGlvblR5cGUgPSBcImJpZGlyZWN0aW9uXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH1cbiAgICB2YXIgbmV3RWRnZXMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVkZ2VHcm91cFR5cGUgaW4gZWRnZXNUb0NvbGxhcHNlKSB7XG4gICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBlZGdlcy50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZWVkZ2UnKTtcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzKTtcbiAgICAgIHZhciBuZXdFZGdlID0ge307XG4gICAgICBuZXdFZGdlLmdyb3VwID0gXCJlZGdlc1wiO1xuICAgICAgbmV3RWRnZS5kYXRhID0ge307XG4gICAgICBuZXdFZGdlLmRhdGEuc291cmNlID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLnNvdXJjZTtcbiAgICAgIG5ld0VkZ2UuZGF0YS50YXJnZXQgPSBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0udGFyZ2V0O1xuICAgICAgdmFyIGlkMSA9IG5vZGVzWzBdLmlkKCk7XG4gICAgICB2YXIgaWQyID0gaWQxO1xuICAgICAgaWYgKG5vZGVzWzFdKSB7XG4gICAgICAgICAgaWQyID0gbm9kZXNbMV0uaWQoKTtcbiAgICAgIH1cbiAgICAgIG5ld0VkZ2UuZGF0YS5pZCA9IFwiY29sbGFwc2VkRWRnZV9cIiArIGlkMSArIFwiX1wiICsgaWQyICsgXCJfXCIgKyBlZGdlR3JvdXBUeXBlICsgXCJfXCIgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBEYXRlLm5vdygpKTtcbiAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IGN5LmNvbGxlY3Rpb24oKTtcblxuICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICAgICAgbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzLmFkZChlZGdlKTtcbiAgICAgIH0pO1xuXG4gICAgICBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMgPSB0aGlzLmNoZWNrNG5lc3RlZENvbGxhcHNlKG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcywgb3B0aW9ucyk7XG5cbiAgICAgIHZhciBlZGdlc1R5cGVGaWVsZCA9IFwiZWRnZVR5cGVcIjtcbiAgICAgIGlmIChvcHRpb25zLmVkZ2VUeXBlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGVkZ2VzVHlwZUZpZWxkID0gb3B0aW9ucy5lZGdlVHlwZUluZm8gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGVkZ2VUeXBlRmllbGQgOiBvcHRpb25zLmVkZ2VUeXBlSW5mbztcbiAgICAgIH1cbiAgICAgIG5ld0VkZ2UuZGF0YVtlZGdlc1R5cGVGaWVsZF0gPSBlZGdlR3JvdXBUeXBlO1xuXG4gICAgICBuZXdFZGdlLmRhdGFbXCJkaXJlY3Rpb25UeXBlXCJdID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmRpcmVjdGlvblR5cGU7XG4gICAgICBuZXdFZGdlLmNsYXNzZXMgPSBcImN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVwiO1xuXG4gICAgICBuZXdFZGdlcy5wdXNoKG5ld0VkZ2UpO1xuICAgICAgY3kucmVtb3ZlKGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcyk7XG4gICAgICBlZGdlcy50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlZWRnZScpO1xuICAgIH1cblxuICAgIHJlc3VsdC5lZGdlcyA9IGN5LmFkZChuZXdFZGdlcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICBjaGVjazRuZXN0ZWRDb2xsYXBzZTogZnVuY3Rpb24oZWRnZXMyY29sbGFwc2UsIG9wdGlvbnMpe1xuICAgIGlmIChvcHRpb25zLmFsbG93TmVzdGVkRWRnZUNvbGxhcHNlKSB7XG4gICAgICByZXR1cm4gZWRnZXMyY29sbGFwc2U7XG4gICAgfVxuICAgIGxldCByID0gY3kuY29sbGVjdGlvbigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWRnZXMyY29sbGFwc2UubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBjdXJyID0gZWRnZXMyY29sbGFwc2VbaV07XG4gICAgICBsZXQgY29sbGFwc2VkRWRnZXMgPSBjdXJyLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJyk7XG4gICAgICBpZiAoY29sbGFwc2VkRWRnZXMgJiYgY29sbGFwc2VkRWRnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICByID0gci5hZGQoY29sbGFwc2VkRWRnZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgciA9IHIuYWRkKGN1cnIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfSxcblxuICBleHBhbmRFZGdlOiBmdW5jdGlvbiAoZWRnZSkge1xuICAgIGVkZ2UudW5zZWxlY3QoKTtcbiAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH1cbiAgICB2YXIgZWRnZXMgPSBlZGdlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJyk7XG4gICAgaWYgKGVkZ2VzICE9PSB1bmRlZmluZWQgJiYgZWRnZXMubGVuZ3RoID4gMCkge1xuICAgICAgZWRnZS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5iZWZvcmVleHBhbmRlZGdlJyk7XG4gICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKGVkZ2UpO1xuICAgICAgY3kucmVtb3ZlKGVkZ2UpO1xuICAgICAgcmVzdWx0LmVkZ2VzID0gY3kuYWRkKGVkZ2VzKTtcbiAgICAgIGVkZ2UudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmRlZGdlJyk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgLy9pZiB0aGUgZWRnZXMgYXJlIG9ubHkgYmV0d2VlbiB0d28gbm9kZXMgKHZhbGlkIGZvciBjb2xscGFzaW5nKSByZXR1cm5zIHRoZSB0d28gbm9kZXMgZWxzZSBpdCByZXR1cm5zIGZhbHNlXG4gIGlzVmFsaWRFZGdlc0ZvckNvbGxhcHNlOiBmdW5jdGlvbiAoZWRnZXMpIHtcbiAgICB2YXIgZW5kUG9pbnRzID0gdGhpcy5nZXRFZGdlc0Rpc3RpbmN0RW5kUG9pbnRzKGVkZ2VzKTtcbiAgICBpZiAoZW5kUG9pbnRzLmxlbmd0aCAhPSAyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBlbmRQb2ludHM7XG4gICAgfVxuICB9LFxuXG4gIC8vcmV0dXJucyBhIGxpc3Qgb2YgZGlzdGluY3QgZW5kcG9pbnRzIG9mIGEgc2V0IG9mIGVkZ2VzLlxuICBnZXRFZGdlc0Rpc3RpbmN0RW5kUG9pbnRzOiBmdW5jdGlvbiAoZWRnZXMpIHtcbiAgICB2YXIgZW5kUG9pbnRzID0gW107XG4gICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xuICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zRWxlbWVudChlbmRQb2ludHMsIGVkZ2Uuc291cmNlKCkpKSB7XG4gICAgICAgIGVuZFBvaW50cy5wdXNoKGVkZ2Uuc291cmNlKCkpO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zRWxlbWVudChlbmRQb2ludHMsIGVkZ2UudGFyZ2V0KCkpKSB7XG4gICAgICAgIGVuZFBvaW50cy5wdXNoKGVkZ2UudGFyZ2V0KCkpO1xuXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHJldHVybiBlbmRQb2ludHM7XG4gIH0sXG5cbiAgLy9mdW5jdGlvbiB0byBjaGVjayBpZiBhIGxpc3Qgb2YgZWxlbWVudHMgY29udGFpbnMgdGhlIGdpdmVuIGVsZW1lbnQgYnkgbG9va2luZyBhdCBpZCgpXG4gIGNvbnRhaW5zRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnRzLCBlbGVtZW50KSB7XG4gICAgdmFyIGV4aXN0cyA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChlbGVtZW50c1tpXS5pZCgpID09IGVsZW1lbnQuaWQoKSkge1xuICAgICAgICBleGlzdHMgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGV4aXN0cztcbiAgfVxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBlbmQgc2VjdGlvbiBlZGdlIGV4cGFuZCBjb2xsYXBzZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xufVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSkge1xuXG4gICAgaWYgKCFjeXRvc2NhcGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxuXG4gICAgdmFyIHVuZG9SZWRvVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91bmRvUmVkb1V0aWxpdGllcycpO1xuICAgIHZhciBjdWVVdGlsaXRpZXMgPSByZXF1aXJlKFwiLi9jdWVVdGlsaXRpZXNcIik7XG4gICAgdmFyIHNhdmVMb2FkVXRpbHMgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBleHRlbmRCeSkge1xuICAgICAgdmFyIHRlbXBPcHRzID0ge307XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucylcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcblxuICAgICAgZm9yICh2YXIga2V5IGluIGV4dGVuZEJ5KVxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcbiAgICAgICAgICB0ZW1wT3B0c1trZXldID0gZXh0ZW5kQnlba2V5XTtcbiAgICAgIHJldHVybiB0ZW1wT3B0cztcbiAgICB9XG5cbiAgICAvLyBldmFsdWF0ZSBzb21lIHNwZWNpZmljIG9wdGlvbnMgaW4gY2FzZSBvZiB0aGV5IGFyZSBzcGVjaWZpZWQgYXMgZnVuY3Rpb25zIHRvIGJlIGR5bmFtaWNhbGx5IGNoYW5nZWRcbiAgICBmdW5jdGlvbiBldmFsT3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICB2YXIgYW5pbWF0ZSA9IHR5cGVvZiBvcHRpb25zLmFuaW1hdGUgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmFuaW1hdGUuY2FsbCgpIDogb3B0aW9ucy5hbmltYXRlO1xuICAgICAgdmFyIGZpc2hleWUgPSB0eXBlb2Ygb3B0aW9ucy5maXNoZXllID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5maXNoZXllLmNhbGwoKSA6IG9wdGlvbnMuZmlzaGV5ZTtcblxuICAgICAgb3B0aW9ucy5hbmltYXRlID0gYW5pbWF0ZTtcbiAgICAgIG9wdGlvbnMuZmlzaGV5ZSA9IGZpc2hleWU7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlcyBhbmQgcmV0dXJucyB0aGUgQVBJIGluc3RhbmNlIGZvciB0aGUgZXh0ZW5zaW9uXG4gICAgZnVuY3Rpb24gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5LCBleHBhbmRDb2xsYXBzZVV0aWxpdGllcykge1xuICAgICAgdmFyIGFwaSA9IHt9OyAvLyBBUEkgdG8gYmUgcmV0dXJuZWRcbiAgICAgIC8vIHNldCBmdW5jdGlvbnNcblxuICAgICAgZnVuY3Rpb24gaGFuZGxlTmV3T3B0aW9ucyhvcHRzKSB7XG4gICAgICAgIHZhciBjdXJyZW50T3B0cyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIGlmIChvcHRzLmN1ZUVuYWJsZWQgJiYgIWN1cnJlbnRPcHRzLmN1ZUVuYWJsZWQpIHtcbiAgICAgICAgICBhcGkuZW5hYmxlQ3VlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW9wdHMuY3VlRW5hYmxlZCAmJiBjdXJyZW50T3B0cy5jdWVFbmFibGVkKSB7XG4gICAgICAgICAgYXBpLmRpc2FibGVDdWUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBpc09ubHkxUGFpcihlZGdlcykge1xuICAgICAgICBsZXQgcmVsYXRlZEVkZ2VzQXJyID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBzcmNJZCA9IGVkZ2VzW2ldLnNvdXJjZSgpLmlkKCk7XG4gICAgICAgICAgY29uc3QgdGFyZ2V0SWQgPSBlZGdlc1tpXS50YXJnZXQoKS5pZCgpO1xuICAgICAgICAgIGNvbnN0IG9iaiA9IHt9O1xuICAgICAgICAgIG9ialtzcmNJZF0gPSB0cnVlO1xuICAgICAgICAgIG9ialt0YXJnZXRJZF0gPSB0cnVlO1xuICAgICAgICAgIHJlbGF0ZWRFZGdlc0Fyci5wdXNoKG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWxhdGVkRWRnZXNBcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCByZWxhdGVkRWRnZXNBcnIubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGtleXMxID0gT2JqZWN0LmtleXMocmVsYXRlZEVkZ2VzQXJyW2ldKTtcbiAgICAgICAgICAgIGNvbnN0IGtleXMyID0gT2JqZWN0LmtleXMocmVsYXRlZEVkZ2VzQXJyW2pdKTtcbiAgICAgICAgICAgIGNvbnN0IGFsbEtleXMgPSBuZXcgU2V0KGtleXMxLmNvbmNhdChrZXlzMikpO1xuICAgICAgICAgICAgaWYgKGFsbEtleXMuc2l6ZSAhPSBrZXlzMS5sZW5ndGggfHwgYWxsS2V5cy5zaXplICE9IGtleXMyLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBzZXQgYWxsIG9wdGlvbnMgYXQgb25jZVxuICAgICAgYXBpLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG9wdHMpO1xuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdHMpO1xuICAgICAgfTtcblxuICAgICAgYXBpLmV4dGVuZE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhuZXdPcHRpb25zKTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBuZXdPcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHRoZSBvcHRpb24gd2hvc2UgbmFtZSBpcyBnaXZlblxuICAgICAgYXBpLnNldE9wdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICBvcHRzW25hbWVdID0gdmFsdWU7XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgbmV3T3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG5cbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhuZXdPcHRpb25zKTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBuZXdPcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIENvbGxlY3Rpb24gZnVuY3Rpb25zXG5cbiAgICAgIC8vIGNvbGxhcHNlIGdpdmVuIGVsZXMgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxuICAgICAgYXBpLmNvbGxhcHNlID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBjb2xsYXBzZSBnaXZlbiBlbGVzIHJlY3Vyc2l2ZWx5IGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cbiAgICAgIGFwaS5jb2xsYXBzZVJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2UoZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXG4gICAgICBhcGkuZXhwYW5kID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoX2VsZXMpO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyByZWN1c2l2ZWx5IGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cbiAgICAgIGFwaS5leHBhbmRSZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEFsbE5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cblxuICAgICAgLy8gQ29yZSBmdW5jdGlvbnNcblxuICAgICAgLy8gY29sbGFwc2UgYWxsIGNvbGxhcHNpYmxlIG5vZGVzXG4gICAgICBhcGkuY29sbGFwc2VBbGwgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZVJlY3Vyc2l2ZWx5KHRoaXMuY29sbGFwc2libGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBleHBhbmQgYWxsIGV4cGFuZGFibGUgbm9kZXNcbiAgICAgIGFwaS5leHBhbmRBbGwgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5leHBhbmRSZWN1cnNpdmVseSh0aGlzLmV4cGFuZGFibGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXG5cbiAgICAgIC8vIHJldHVybnMgaWYgdGhlIGdpdmVuIG5vZGUgaXMgZXhwYW5kYWJsZVxuICAgICAgYXBpLmlzRXhwYW5kYWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIHJldHVybnMgaWYgdGhlIGdpdmVuIG5vZGUgaXMgY29sbGFwc2libGVcbiAgICAgIGFwaS5pc0NvbGxhcHNpYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLmlzRXhwYW5kYWJsZShub2RlKSAmJiBub2RlLmlzUGFyZW50KCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBnZXQgY29sbGFwc2libGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXG4gICAgICBhcGkuY29sbGFwc2libGVOb2RlcyA9IGZ1bmN0aW9uIChfbm9kZXMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xuICAgICAgICByZXR1cm4gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgZWxlID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNlbGYuaXNDb2xsYXBzaWJsZShlbGUpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGdldCBleHBhbmRhYmxlIG9uZXMgaW5zaWRlIGdpdmVuIG5vZGVzIGlmIG5vZGVzIHBhcmFtZXRlciBpcyBub3Qgc3BlY2lmaWVkIGNvbnNpZGVyIGFsbCBub2Rlc1xuICAgICAgYXBpLmV4cGFuZGFibGVOb2RlcyA9IGZ1bmN0aW9uIChfbm9kZXMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xuICAgICAgICByZXR1cm4gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgZWxlID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNlbGYuaXNFeHBhbmRhYmxlKGVsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgLy8gR2V0IHRoZSBjaGlsZHJlbiBvZiB0aGUgZ2l2ZW4gY29sbGFwc2VkIG5vZGUgd2hpY2ggYXJlIHJlbW92ZWQgZHVyaW5nIGNvbGxhcHNlIG9wZXJhdGlvblxuICAgICAgYXBpLmdldENvbGxhcHNlZENoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKTtcbiAgICAgIH07XG5cbiAgICAgIC8qKiBHZXQgY29sbGFwc2VkIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKiBSZXR1cm5lZCB2YWx1ZSBpbmNsdWRlcyBlZGdlcyBhbmQgbm9kZXMsIHVzZSBzZWxlY3RvciB0byBnZXQgZWRnZXMgb3Igbm9kZXNcbiAgICAgICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxuICAgICAgICogQHJldHVybiBhbGwgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKi9cbiAgICAgIGFwaS5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gY3kuY29sbGVjdGlvbigpO1xuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShub2RlLCBjb2xsYXBzZWRDaGlsZHJlbik7XG4gICAgICB9O1xuXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiBvZiBhbGwgY29sbGFwc2VkIG5vZGVzIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKiBSZXR1cm5lZCB2YWx1ZSBpbmNsdWRlcyBlZGdlcyBhbmQgbm9kZXMsIHVzZSBzZWxlY3RvciB0byBnZXQgZWRnZXMgb3Igbm9kZXNcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICovXG4gICAgICBhcGkuZ2V0QWxsQ29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gY3kuY29sbGVjdGlvbigpO1xuICAgICAgICB2YXIgY29sbGFwc2VkTm9kZXMgPSBjeS5ub2RlcyhcIi5jeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGVcIik7XG4gICAgICAgIHZhciBqO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgY29sbGFwc2VkTm9kZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjb2xsYXBzZWROb2Rlc1tqXSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcbiAgICAgIH07XG4gICAgICAvLyBUaGlzIG1ldGhvZCBmb3JjZXMgdGhlIHZpc3VhbCBjdWUgdG8gYmUgY2xlYXJlZC4gSXQgaXMgdG8gYmUgY2FsbGVkIGluIGV4dHJlbWUgY2FzZXNcbiAgICAgIGFwaS5jbGVhclZpc3VhbEN1ZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGN5LnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJyk7XG4gICAgICB9O1xuXG4gICAgICBhcGkuZGlzYWJsZUN1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICBpZiAob3B0aW9ucy5jdWVFbmFibGVkKSB7XG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCd1bmJpbmQnLCBjeSwgYXBpKTtcbiAgICAgICAgICBvcHRpb25zLmN1ZUVuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgYXBpLmVuYWJsZUN1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuY3VlRW5hYmxlZCkge1xuICAgICAgICAgIGN1ZVV0aWxpdGllcygncmViaW5kJywgY3ksIGFwaSk7XG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgYXBpLmdldFBhcmVudCA9IGZ1bmN0aW9uIChub2RlSWQpIHtcbiAgICAgICAgaWYgKGN5LmdldEVsZW1lbnRCeUlkKG5vZGVJZClbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhciBwYXJlbnREYXRhID0gZ2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnKTtcbiAgICAgICAgICByZXR1cm4gcGFyZW50RGF0YVtub2RlSWRdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHJldHVybiBjeS5nZXRFbGVtZW50QnlJZChub2RlSWQpLnBhcmVudCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBhcGkuY29sbGFwc2VFZGdlcyA9IGZ1bmN0aW9uIChlZGdlcywgb3B0cykge1xuICAgICAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH07XG4gICAgICAgIGlmIChlZGdlcy5sZW5ndGggPCAyKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICBpZiAoIWlzT25seTFQYWlyKGVkZ2VzKSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbkVkZ2VzKGVkZ2VzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICBhcGkuZXhwYW5kRWRnZXMgPSBmdW5jdGlvbiAoZWRnZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9XG4gICAgICAgIGlmIChlZGdlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgICAgIC8vaWYodHlwZW9mIGVkZ2VzW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpey8vY29sbGVjdGlvbiBvZiBlZGdlcyBpcyBwYXNzZWRcbiAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xuICAgICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRFZGdlKGVkZ2UpO1xuICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcbiAgICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XG5cbiAgICAgICAgfSk7XG4gICAgICAgIC8qICB9ZWxzZXsvL29uZSBlZGdlIHBhc3NlZFxuICAgICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlcyk7XG4gICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcbiAgICAgICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQub2xkRWRnZXMpO1xuICAgICAgICAgICBcbiAgICAgICAgIH0gKi9cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5jb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzID0gZnVuY3Rpb24gKG5vZGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZnVuY3Rpb24gcGFpcndpc2UobGlzdCkge1xuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xuICAgICAgICAgIGxpc3RcbiAgICAgICAgICAgIC5zbGljZSgwLCBsaXN0Lmxlbmd0aCAtIDEpXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgIHRhaWwuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBwYWlycztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKG5vZGVzKTtcbiAgICAgICAgLy8gZm9yIHNlbGYtbG9vcHNcbiAgICAgICAgbm9kZXNQYWlycy5wdXNoKC4uLm5vZGVzLm1hcCh4ID0+IFt4LCB4XSkpO1xuICAgICAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH07XG4gICAgICAgIG5vZGVzUGFpcnMuZm9yRWFjaChmdW5jdGlvbiAobm9kZVBhaXIpIHtcbiAgICAgICAgICBjb25zdCBpZDEgPSBub2RlUGFpclsxXS5pZCgpO1xuICAgICAgICAgIHZhciBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCdbc291cmNlID0gXCInICsgaWQxICsgJ1wiXSxbdGFyZ2V0ID0gXCInICsgaWQxICsgJ1wiXScpO1xuICAgICAgICAgIC8vIGVkZ2VzIGZvciBzZWxmLWxvb3BzXG4gICAgICAgICAgaWYgKG5vZGVQYWlyWzBdLmlkKCkgPT09IGlkMSkge1xuICAgICAgICAgICAgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnW3NvdXJjZSA9IFwiJyArIGlkMSArICdcIl1bdGFyZ2V0ID0gXCInICsgaWQxICsgJ1wiXScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZWRnZXMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuRWRnZXMoZWRnZXMsIHRlbXBPcHRpb25zKVxuICAgICAgICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQub2xkRWRnZXMpO1xuICAgICAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG5cbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHBhbmRFZGdlc0JldHdlZW5Ob2RlcyA9IGZ1bmN0aW9uIChub2Rlcykge1xuICAgICAgICB2YXIgZWRnZXNUb0V4cGFuZCA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICAgICAgZnVuY3Rpb24gcGFpcndpc2UobGlzdCkge1xuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xuICAgICAgICAgIGxpc3RcbiAgICAgICAgICAgIC5zbGljZSgwLCBsaXN0Lmxlbmd0aCAtIDEpXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgIHRhaWwuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBwYWlycztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKG5vZGVzKTtcbiAgICAgICAgLy8gZm9yIHNlbGYtbG9vcHNcbiAgICAgICAgbm9kZXNQYWlycy5wdXNoKC4uLm5vZGVzLm1hcCh4ID0+IFt4LCB4XSkpO1xuICAgICAgICBub2Rlc1BhaXJzLmZvckVhY2goZnVuY3Rpb24gKG5vZGVQYWlyKSB7XG4gICAgICAgICAgY29uc3QgaWQxID0gbm9kZVBhaXJbMV0uaWQoKTtcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVtzb3VyY2UgPSBcIicgKyBpZDEgKyAnXCJdLFt0YXJnZXQgPSBcIicgKyBpZDEgKyAnXCJdJyk7XG4gICAgICAgICAgLy8gZWRnZXMgZm9yIHNlbGYtbG9vcHNcbiAgICAgICAgICBpZiAobm9kZVBhaXJbMF0uaWQoKSA9PT0gaWQxKSB7XG4gICAgICAgICAgICBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCdbc291cmNlID0gXCInICsgaWQxICsgJ1wiXVt0YXJnZXQgPSBcIicgKyBpZDEgKyAnXCJdJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVkZ2VzVG9FeHBhbmQgPSBlZGdlc1RvRXhwYW5kLnVuaW9uKGVkZ2VzKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kRWRnZXMoZWRnZXNUb0V4cGFuZCk7XG4gICAgICB9O1xuXG4gICAgICBhcGkuY29sbGFwc2VBbGxFZGdlcyA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoY3kuZWRnZXMoKS5jb25uZWN0ZWROb2RlcygpLCBvcHRzKTtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHBhbmRBbGxFZGdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVkZ2VzID0gY3kuZWRnZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlXCIpO1xuICAgICAgICB2YXIgcmVzdWx0ID0geyBlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpIH07XG4gICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzKTtcbiAgICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQub2xkRWRnZXMpO1xuICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuXG4gICAgICBhcGkubG9hZEpzb24gPSBmdW5jdGlvbiAoanNvblN0ciwgaXNPdmVycmlkZUV4aXN0aW5nID0gdHJ1ZSkge1xuICAgICAgICBzYXZlTG9hZFV0aWxzLmxvYWRKc29uKGpzb25TdHIsIGlzT3ZlcnJpZGVFeGlzdGluZyk7XG4gICAgICB9O1xuXG4gICAgICBhcGkuc2F2ZUpzb24gPSBmdW5jdGlvbiAoZWxlbXMsIGZpbGVuYW1lKSB7XG4gICAgICAgIHNhdmVMb2FkVXRpbHMuc2F2ZUpzb24oZWxlbXMsIGZpbGVuYW1lKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBhcGk7IC8vIFJldHVybiB0aGUgQVBJIGluc3RhbmNlXG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSB3aG9sZSBzY3JhdGNocGFkIHJlc2VydmVkIGZvciB0aGlzIGV4dGVuc2lvbiAob24gYW4gZWxlbWVudCBvciBjb3JlKSBvciBnZXQgYSBzaW5nbGUgcHJvcGVydHkgb2YgaXRcbiAgICBmdW5jdGlvbiBnZXRTY3JhdGNoKGN5T3JFbGUsIG5hbWUpIHtcbiAgICAgIGlmIChjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJywge30pO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2NyYXRjaCA9IGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKTtcbiAgICAgIHZhciByZXRWYWwgPSAobmFtZSA9PT0gdW5kZWZpbmVkKSA/IHNjcmF0Y2ggOiBzY3JhdGNoW25hbWVdO1xuICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBzaW5nbGUgcHJvcGVydHkgb24gc2NyYXRjaHBhZCBvZiBhbiBlbGVtZW50IG9yIHRoZSBjb3JlXG4gICAgZnVuY3Rpb24gc2V0U2NyYXRjaChjeU9yRWxlLCBuYW1lLCB2YWwpIHtcbiAgICAgIGdldFNjcmF0Y2goY3lPckVsZSlbbmFtZV0gPSB2YWw7XG4gICAgfVxuXG4gICAgLy8gcmVnaXN0ZXIgdGhlIGV4dGVuc2lvbiBjeS5leHBhbmRDb2xsYXBzZSgpXG4gICAgY3l0b3NjYXBlKFwiY29yZVwiLCBcImV4cGFuZENvbGxhcHNlXCIsIGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICB2YXIgY3kgPSB0aGlzO1xuXG4gICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJykgfHwge1xuICAgICAgICBsYXlvdXRCeTogbnVsbCwgLy8gZm9yIHJlYXJyYW5nZSBhZnRlciBleHBhbmQvY29sbGFwc2UuIEl0J3MganVzdCBsYXlvdXQgb3B0aW9ucyBvciB3aG9sZSBsYXlvdXQgZnVuY3Rpb24uIENob29zZSB5b3VyIHNpZGUhXG4gICAgICAgIGZpc2hleWU6IHRydWUsIC8vIHdoZXRoZXIgdG8gcGVyZm9ybSBmaXNoZXllIHZpZXcgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlIHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHRvb1xuICAgICAgICBhbmltYXRlOiB0cnVlLCAvLyB3aGV0aGVyIHRvIGFuaW1hdGUgb24gZHJhd2luZyBjaGFuZ2VzIHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHRvb1xuICAgICAgICBhbmltYXRpb25EdXJhdGlvbjogMTAwMCwgLy8gd2hlbiBhbmltYXRlIGlzIHRydWUsIHRoZSBkdXJhdGlvbiBpbiBtaWxsaXNlY29uZHMgb2YgdGhlIGFuaW1hdGlvblxuICAgICAgICByZWFkeTogZnVuY3Rpb24gKCkgeyB9LCAvLyBjYWxsYmFjayB3aGVuIGV4cGFuZC9jb2xsYXBzZSBpbml0aWFsaXplZFxuICAgICAgICB1bmRvYWJsZTogdHJ1ZSwgLy8gYW5kIGlmIHVuZG9SZWRvRXh0ZW5zaW9uIGV4aXN0cyxcblxuICAgICAgICBjdWVFbmFibGVkOiB0cnVlLCAvLyBXaGV0aGVyIGN1ZXMgYXJlIGVuYWJsZWRcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjogJ3RvcC1sZWZ0JywgLy8gZGVmYXVsdCBjdWUgcG9zaXRpb24gaXMgdG9wIGxlZnQgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gcGVyIG5vZGUgdG9vXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlU2l6ZTogMTIsIC8vIHNpemUgb2YgZXhwYW5kLWNvbGxhcHNlIGN1ZVxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplOiA4LCAvLyBzaXplIG9mIGxpbmVzIHVzZWQgZm9yIGRyYXdpbmcgcGx1cy1taW51cyBpY29uc1xuICAgICAgICBleHBhbmRDdWVJbWFnZTogdW5kZWZpbmVkLCAvLyBpbWFnZSBvZiBleHBhbmQgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGV4cGFuZCBjdWVcbiAgICAgICAgY29sbGFwc2VDdWVJbWFnZTogdW5kZWZpbmVkLCAvLyBpbWFnZSBvZiBjb2xsYXBzZSBpY29uIGlmIHVuZGVmaW5lZCBkcmF3IHJlZ3VsYXIgY29sbGFwc2UgY3VlXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHk6IDEsIC8vIHNlbnNpdGl2aXR5IG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVzXG5cbiAgICAgICAgZWRnZVR5cGVJbmZvOiBcImVkZ2VUeXBlXCIsIC8vdGhlIG5hbWUgb2YgdGhlIGZpZWxkIHRoYXQgaGFzIHRoZSBlZGdlIHR5cGUsIHJldHJpZXZlZCBmcm9tIGVkZ2UuZGF0YSgpLCBjYW4gYmUgYSBmdW5jdGlvblxuICAgICAgICBncm91cEVkZ2VzT2ZTYW1lVHlwZU9uQ29sbGFwc2U6IGZhbHNlLFxuICAgICAgICBhbGxvd05lc3RlZEVkZ2VDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgekluZGV4OiA5OTkgLy8gei1pbmRleCB2YWx1ZSBvZiB0aGUgY2FudmFzIGluIHdoaWNoIGN1ZSDEsW1hZ2VzIGFyZSBkcmF3blxuICAgICAgfTtcblxuICAgICAgLy8gSWYgb3B0cyBpcyBub3QgJ2dldCcgdGhhdCBpcyBpdCBpcyBhIHJlYWwgb3B0aW9ucyBvYmplY3QgdGhlbiBpbml0aWxpemUgdGhlIGV4dGVuc2lvblxuICAgICAgaWYgKG9wdHMgIT09ICdnZXQnKSB7XG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuXG4gICAgICAgIHZhciBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMnKShjeSk7XG4gICAgICAgIHZhciBhcGkgPSBjcmVhdGVFeHRlbnNpb25BUEkoY3ksIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKTsgLy8gY3JlYXRlcyBhbmQgcmV0dXJucyB0aGUgQVBJIGluc3RhbmNlIGZvciB0aGUgZXh0ZW5zaW9uXG4gICAgICAgIHNhdmVMb2FkVXRpbHMgPSByZXF1aXJlKFwiLi9zYXZlTG9hZFV0aWxpdGllc1wiKShjeSwgYXBpKTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ2FwaScsIGFwaSk7XG5cbiAgICAgICAgdW5kb1JlZG9VdGlsaXRpZXMoY3ksIGFwaSk7XG5cbiAgICAgICAgY3VlVXRpbGl0aWVzKG9wdGlvbnMsIGN5LCBhcGkpO1xuXG4gICAgICAgIC8vIGlmIHRoZSBjdWUgaXMgbm90IGVuYWJsZWQgdW5iaW5kIGN1ZSBldmVudHNcbiAgICAgICAgaWYgKCFvcHRpb25zLmN1ZUVuYWJsZWQpIHtcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3VuYmluZCcsIGN5LCBhcGkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucmVhZHkpIHtcbiAgICAgICAgICBvcHRpb25zLnJlYWR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBwYXJlbnREYXRhID0ge307XG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdwYXJlbnREYXRhJywgcGFyZW50RGF0YSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBnZXRTY3JhdGNoKGN5LCAnYXBpJyk7IC8vIEV4cG9zZSB0aGUgQVBJIHRvIHRoZSB1c2Vyc1xuICAgIH0pO1xuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZXhwYW5kLWNvbGxhcHNlJywgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnKSB7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXG4gICAgcmVnaXN0ZXIoY3l0b3NjYXBlKTtcbiAgfVxuXG59KSgpO1xuIiwiZnVuY3Rpb24gc2F2ZUxvYWRVdGlsaXRpZXMoY3ksIGFwaSkge1xuICAvKiogY29udmVydHMgYXJyYXkgb2YgSlNPTiB0byBhIGN5dG9zY2FwZS5qcyBjb2xsZWN0aW9uIChib3R0b20tdXAgcmVjdXJzaXZlKVxuICAgKiBrZWVwcyBpbmZvcm1hdGlvbiBhYm91dCBwYXJlbnRzLCBhbGwgbm9kZXMgYWRkZWQgdG8gY3l0b3NjYXBlLCBhbmQgbm9kZXMgdG8gYmUgY29sbGFwc2VkXG4gICogQHBhcmFtICB7fSBqc29uQXJyIGFuIGFycmF5IG9mIG9iamVjdHMgKGEgSlNPTiBhcnJheSlcbiAgKiBAcGFyYW0gIHt9IGFsbE5vZGVzIGEgY3l0b3NjYXBlLmpzIGNvbGxlY3Rpb25cbiAgKiBAcGFyYW0gIHt9IG5vZGVzMmNvbGxhcHNlIGEgY3l0b3NjYXBlLmpzIGNvbGxlY3Rpb25cbiAgKiBAcGFyYW0gIHt9IG5vZGUycGFyZW50IGEgSlMgb2JqZWN0IChzaW1wbHkga2V5LXZhbHVlIHBhaXJzKVxuICAqL1xuICBmdW5jdGlvbiBqc29uMmN5Q29sbGVjdGlvbihqc29uQXJyLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50LCBpc092ZXJyaWRlRXhpc3RpbmcpIHtcbiAgICAvLyBwcm9jZXNzIGVkZ2VzIGxhc3Qgc2luY2UgdGhleSBkZXBlbmQgb24gbm9kZXNcbiAgICBqc29uQXJyLnNvcnQoKGEpID0+IHtcbiAgICAgIGlmIChhLmdyb3VwID09PSAnZWRnZXMnKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH0pO1xuXG4gICAgLy8gYWRkIGNvbXBvdW5kIG5vZGVzIGZpcnN0LCB0aGVuIGFkZCBvdGhlciBub2RlcyB0aGVuIGVkZ2VzXG4gICAgbGV0IGNvbGwgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBqc29uQXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBqc29uID0ganNvbkFycltpXTtcbiAgICAgIGNvbnN0IGQgPSBqc29uLmRhdGE7XG4gICAgICBpZiAoZC5wYXJlbnQpIHtcbiAgICAgICAgbm9kZTJwYXJlbnRbZC5pZF0gPSBkLnBhcmVudDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBvcyA9IHsgeDoganNvbi5wb3NpdGlvbi54LCB5OiBqc29uLnBvc2l0aW9uLnkgfTtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gY3kuJGlkKGQuaWQpO1xuICAgICAgbGV0IGUgPSBudWxsO1xuICAgICAgaWYgKGV4aXN0aW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGlzT3ZlcnJpZGVFeGlzdGluZykge1xuICAgICAgICAgIG92ZXJyaWRlSnNvbjJFbGVtKGV4aXN0aW5nLCBqc29uKTtcbiAgICAgICAgfVxuICAgICAgICBlID0gZXhpc3Rpbmc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlID0gY3kuYWRkKGpzb24pO1xuICAgICAgfVxuICAgICAgaWYgKGUuaXNOb2RlKCkpIHtcbiAgICAgICAgYWxsTm9kZXMubWVyZ2UoZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkLm9yaWdpbmFsRW5kcykge1xuICAgICAgICAvLyBhbGwgbm9kZXMgc2hvdWxkIGJlIGluIHRoZSBtZW1vcnkgKGluIGN5IG9yIG5vdClcbiAgICAgICAgbGV0IHNyYyA9IGFsbE5vZGVzLiRpZChkLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5pZCk7XG4gICAgICAgIGlmIChkLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5wYXJlbnQpIHtcbiAgICAgICAgICBub2RlMnBhcmVudFtkLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5pZF0gPSBkLm9yaWdpbmFsRW5kcy5zb3VyY2UuZGF0YS5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHRndCA9IGFsbE5vZGVzLiRpZChkLm9yaWdpbmFsRW5kcy50YXJnZXQuZGF0YS5pZCk7XG4gICAgICAgIGlmIChkLm9yaWdpbmFsRW5kcy50YXJnZXQuZGF0YS5wYXJlbnQpIHtcbiAgICAgICAgICBub2RlMnBhcmVudFtkLm9yaWdpbmFsRW5kcy50YXJnZXQuZGF0YS5pZF0gPSBkLm9yaWdpbmFsRW5kcy50YXJnZXQuZGF0YS5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZS5kYXRhKCdvcmlnaW5hbEVuZHMnLCB7IHNvdXJjZTogc3JjLCB0YXJnZXQ6IHRndCB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChkLmNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgIG5vZGVzMmNvbGxhcHNlLm1lcmdlKGUpO1xuICAgICAgICBqc29uMmN5Q29sbGVjdGlvbihkLmNvbGxhcHNlZENoaWxkcmVuLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50LCBpc092ZXJyaWRlRXhpc3RpbmcpO1xuICAgICAgICBjbGVhckNvbGxhcHNlTWV0YURhdGEoZSk7XG4gICAgICB9IGVsc2UgaWYgKGQuY29sbGFwc2VkRWRnZXMpIHtcbiAgICAgICAgZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycsIGpzb24yY3lDb2xsZWN0aW9uKGQuY29sbGFwc2VkRWRnZXMsIGFsbE5vZGVzLCBub2RlczJjb2xsYXBzZSwgbm9kZTJwYXJlbnQsIGlzT3ZlcnJpZGVFeGlzdGluZykpO1xuICAgICAgICAvLyBkZWxldGUgY29sbGFwc2VkIGVkZ2VzIGZyb20gY3lcbiAgICAgICAgY3kucmVtb3ZlKGUuZGF0YSgnY29sbGFwc2VkRWRnZXMnKSk7XG4gICAgICB9XG4gICAgICBlLnBvc2l0aW9uKHBvcyk7IC8vIGFkZGluZyBuZXcgZWxlbWVudHMgdG8gYSBjb21wb3VuZCBtaWdodCBjaGFuZ2UgaXRzIHBvc2l0aW9uXG4gICAgICBjb2xsLm1lcmdlKGUpO1xuICAgIH1cbiAgICByZXR1cm4gY29sbDtcbiAgfVxuXG4gIC8qKiBjbGVhcnMgYWxsIHRoZSBkYXRhIHJlbGF0ZWQgdG8gY29sbGFwc2VkIG5vZGVcbiAgICogQHBhcmFtICB7fSBlIGEgY3l0b3NjYXBlIGVsZW1lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGNsZWFyQ29sbGFwc2VNZXRhRGF0YShlKSB7XG4gICAgZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicsIG51bGwpO1xuICAgIGUucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xuICAgIGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJywgbnVsbCk7XG4gICAgZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScsIG51bGwpO1xuICAgIGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCcsIG51bGwpO1xuICAgIGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WScsIG51bGwpO1xuICAgIGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUnLCBudWxsKTtcbiAgfVxuXG4gIC8qKiBjb252ZXJ0cyBjeXRvc2NhcGUgY29sbGVjdGlvbiB0byBKU09OIGFycmF5Lihib3R0b20tdXAgcmVjdXJzaXZlKVxuICAgKiBAcGFyYW0gIHt9IGVsZW1zXG4gICAqL1xuICBmdW5jdGlvbiBjeUNvbGxlY3Rpb24ySnNvbihlbGVtcykge1xuICAgIGxldCByID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZWxlbSA9IGVsZW1zW2ldO1xuICAgICAgbGV0IGpzb25PYmogPSBudWxsO1xuICAgICAgaWYgKCFlbGVtLmNvbGxhcHNlZENoaWxkcmVuICYmICFlbGVtLmNvbGxhcHNlZEVkZ2VzKSB7XG4gICAgICAgIGpzb25PYmogPSBlbGVtLmN5Lmpzb24oKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGVsZW0uY29sbGFwc2VkQ2hpbGRyZW4pIHtcbiAgICAgICAgZWxlbS5jb2xsYXBzZWRDaGlsZHJlbiA9IGN5Q29sbGVjdGlvbjJKc29uKGhhbGZEZWVwQ29weUNvbGxlY3Rpb24oZWxlbS5jb2xsYXBzZWRDaGlsZHJlbikpO1xuICAgICAgICBqc29uT2JqID0gZWxlbS5jeS5qc29uKCk7XG4gICAgICAgIGpzb25PYmouZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IGVsZW0uY29sbGFwc2VkQ2hpbGRyZW47XG4gICAgICB9IGVsc2UgaWYgKGVsZW0uY29sbGFwc2VkRWRnZXMpIHtcbiAgICAgICAgZWxlbS5jb2xsYXBzZWRFZGdlcyA9IGN5Q29sbGVjdGlvbjJKc29uKGhhbGZEZWVwQ29weUNvbGxlY3Rpb24oZWxlbS5jb2xsYXBzZWRFZGdlcykpO1xuICAgICAgICBqc29uT2JqID0gZWxlbS5jeS5qc29uKCk7XG4gICAgICAgIGpzb25PYmouZGF0YS5jb2xsYXBzZWRFZGdlcyA9IGVsZW0uY29sbGFwc2VkRWRnZXM7XG4gICAgICB9XG4gICAgICBpZiAoZWxlbS5vcmlnaW5hbEVuZHMpIHtcbiAgICAgICAgY29uc3Qgc3JjID0gZWxlbS5vcmlnaW5hbEVuZHMuc291cmNlLmpzb24oKTtcbiAgICAgICAgY29uc3QgdGd0ID0gZWxlbS5vcmlnaW5hbEVuZHMudGFyZ2V0Lmpzb24oKTtcbiAgICAgICAgaWYgKHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgICAgc3JjLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKHNyYy5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgICAgdGd0LmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBjeUNvbGxlY3Rpb24ySnNvbihoYWxmRGVlcENvcHlDb2xsZWN0aW9uKHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSk7XG4gICAgICAgIH1cbiAgICAgICAganNvbk9iai5kYXRhLm9yaWdpbmFsRW5kcyA9IHsgc291cmNlOiBzcmMsIHRhcmdldDogdGd0IH07XG4gICAgICB9XG4gICAgICByLnB1c2goanNvbk9iaik7XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cbiAgLyoqIHJldHVybnMgeyBjeTogYW55LCBjb2xsYXBzZWRFZGdlczogYW55LCBjb2xsYXBzZWRDaGlsZHJlbjogYW55LCBvcmlnaW5hbEVuZHM6IGFueSB9W11cbiAgICogZnJvbSBjeXRvc2NhcGUgY29sbGVjdGlvblxuICAgKiBAcGFyYW0gIHt9IGNvbFxuICAgKi9cbiAgZnVuY3Rpb24gaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihjb2wpIHtcbiAgICBsZXQgYXJyID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb2wubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyci5wdXNoKHsgY3k6IGNvbFtpXSwgY29sbGFwc2VkRWRnZXM6IGNvbFtpXS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpLCBjb2xsYXBzZWRDaGlsZHJlbjogY29sW2ldLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyksIG9yaWdpbmFsRW5kczogY29sW2ldLmRhdGEoJ29yaWdpbmFsRW5kcycpIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyO1xuICB9XG5cbiAgLyoqIHNhdmVzIHRoZSBzdHJpbmcgYXMgYSBmaWxlLlxuICAgKiBAcGFyYW0gIHt9IHN0ciBzdHJpbmdcbiAgICogQHBhcmFtICB7fSBmaWxlTmFtZSBzdHJpbmdcbiAgICovXG4gIGZ1bmN0aW9uIHN0cjJmaWxlKHN0ciwgZmlsZU5hbWUpIHtcbiAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW3N0cl0sIHsgdHlwZTogJ3RleHQvcGxhaW4nIH0pO1xuICAgIGNvbnN0IGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuICAgIGFuY2hvci5kb3dubG9hZCA9IGZpbGVOYW1lO1xuICAgIGFuY2hvci5ocmVmID0gKHdpbmRvdy5VUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICBhbmNob3IuZGF0YXNldC5kb3dubG9hZHVybCA9XG4gICAgICBbJ3RleHQvcGxhaW4nLCBhbmNob3IuZG93bmxvYWQsIGFuY2hvci5ocmVmXS5qb2luKCc6Jyk7XG4gICAgYW5jaG9yLmNsaWNrKCk7XG4gIH1cblxuICBmdW5jdGlvbiBvdmVycmlkZUpzb24yRWxlbShlbGVtLCBqc29uKSB7XG4gICAgY29uc3QgY29sbGFwc2VkQ2hpbGRyZW4gPSBlbGVtLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XG4gICAgY29uc3QgY29sbGFwc2VkRWRnZXMgPSBlbGVtLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJyk7XG4gICAgY29uc3Qgb3JpZ2luYWxFbmRzID0gZWxlbS5kYXRhKCdvcmlnaW5hbEVuZHMnKTtcbiAgICBlbGVtLmpzb24oanNvbik7XG4gICAgaWYgKGNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICBlbGVtLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJywgY29sbGFwc2VkQ2hpbGRyZW4pO1xuICAgIH1cbiAgICBpZiAoY29sbGFwc2VkRWRnZXMpIHtcbiAgICAgIGVsZW0uZGF0YSgnY29sbGFwc2VkRWRnZXMnLCBjb2xsYXBzZWRFZGdlcyk7XG4gICAgfVxuICAgIGlmIChvcmlnaW5hbEVuZHMpIHtcbiAgICAgIGVsZW0uZGF0YSgnb3JpZ2luYWxFbmRzJywgb3JpZ2luYWxFbmRzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuXG4gICAgLyoqIExvYWQgZWxlbWVudHMgZnJvbSBKU09OIGZvcm1hdHRlZCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAgICogRm9yIGNvbGxhcHNlZCBjb21wb3VuZHMsIGZpcnN0IGFkZCBhbGwgY29sbGFwc2VkIG5vZGVzIGFzIG5vcm1hbCBub2RlcyB0aGVuIGNvbGxhcHNlIHRoZW0uIFRoZW4gcmVwb3NpdGlvbiB0aGVtLlxuICAgICAqIEZvciBjb2xsYXBzZWQgZWRnZXMsIGZpcnN0IGFkZCBhbGwgb2YgdGhlIGVkZ2VzIHRoZW4gcmVtb3ZlIGNvbGxhcHNlZCBlZGdlcyBmcm9tIGN5dG9zY2FwZS5cbiAgICAgKiBGb3Igb3JpZ2luYWwgZW5kcywgcmVzdG9yZSB0aGVpciByZWZlcmVuY2UgdG8gY3l0b3NjYXBlIGVsZW1lbnRzXG4gICAgICogQHBhcmFtICB7fSB0eHQgc3RyaW5nXG4gICAgICovXG4gICAgbG9hZEpzb246IGZ1bmN0aW9uICh0eHQsIGlzT3ZlcnJpZGVFeGlzdGluZykge1xuICAgICAgY29uc3QgZmlsZUpTT04gPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAvLyBvcmlnaW5hbCBlbmRwb2ludHMgd29uJ3QgZXhpc3QgaW4gY3kuIFNvIGtlZXAgYSByZWZlcmVuY2UuXG4gICAgICBjb25zdCBub2RlUG9zaXRpb25zID0ge307XG4gICAgICBjb25zdCBhbGxOb2RlcyA9IGN5LmNvbGxlY3Rpb24oKTsgLy8gc29tZSBlbGVtZW50cyBhcmUgc3RvcmVkIGluIGN5LCBzb21lIGFyZSBkZWxldGVkIFxuICAgICAgY29uc3Qgbm9kZXMyY29sbGFwc2UgPSBjeS5jb2xsZWN0aW9uKCk7IC8vIHNvbWUgYXJlIGRlbGV0ZWQgXG4gICAgICBjb25zdCBub2RlMnBhcmVudCA9IHt9O1xuICAgICAgZm9yIChjb25zdCBuIG9mIGZpbGVKU09OLm5vZGVzKSB7XG4gICAgICAgIG5vZGVQb3NpdGlvbnNbbi5kYXRhLmlkXSA9IHsgeDogbi5wb3NpdGlvbi54LCB5OiBuLnBvc2l0aW9uLnkgfTtcbiAgICAgICAgaWYgKG4uZGF0YS5wYXJlbnQpIHtcbiAgICAgICAgICBub2RlMnBhcmVudFtuLmRhdGEuaWRdID0gbi5kYXRhLnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBleGlzdGluZyA9IGN5LiRpZChuLmRhdGEuaWQpO1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmIChleGlzdGluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaWYgKGlzT3ZlcnJpZGVFeGlzdGluZykge1xuICAgICAgICAgICAgb3ZlcnJpZGVKc29uMkVsZW0oZXhpc3RpbmcsIG4pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBub2RlID0gZXhpc3Rpbmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZSA9IGN5LmFkZChuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFsbE5vZGVzLm1lcmdlKG5vZGUpO1xuICAgICAgICBpZiAobm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpKSB7XG4gICAgICAgICAganNvbjJjeUNvbGxlY3Rpb24obm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50LCBpc092ZXJyaWRlRXhpc3RpbmcpO1xuICAgICAgICAgIG5vZGVzMmNvbGxhcHNlLm1lcmdlKG5vZGUpO1xuICAgICAgICAgIGNsZWFyQ29sbGFwc2VNZXRhRGF0YShub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBlIG9mIGZpbGVKU09OLmVkZ2VzKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gY3kuJGlkKGUuZGF0YS5pZCk7XG4gICAgICAgIGxldCBlZGdlID0gbnVsbDtcbiAgICAgICAgaWYgKGV4aXN0aW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpZiAoaXNPdmVycmlkZUV4aXN0aW5nKSB7XG4gICAgICAgICAgICBvdmVycmlkZUpzb24yRWxlbShleGlzdGluZywgZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVkZ2UgPSBleGlzdGluZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGdlID0gY3kuYWRkKGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlZGdlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJykpIHtcbiAgICAgICAgICBlZGdlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJywganNvbjJjeUNvbGxlY3Rpb24oZS5kYXRhLmNvbGxhcHNlZEVkZ2VzLCBhbGxOb2Rlcywgbm9kZXMyY29sbGFwc2UsIG5vZGUycGFyZW50LCBpc092ZXJyaWRlRXhpc3RpbmcpKTtcbiAgICAgICAgICBjeS5yZW1vdmUoZWRnZS5kYXRhKCdjb2xsYXBzZWRFZGdlcycpKTsgLy8gZGVsZXRlIGNvbGxhcHNlZCBlZGdlcyBmcm9tIGN5XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJykpIHtcbiAgICAgICAgICBjb25zdCBzcmNJZCA9IGUuZGF0YS5vcmlnaW5hbEVuZHMuc291cmNlLmRhdGEuaWQ7XG4gICAgICAgICAgY29uc3QgdGd0SWQgPSBlLmRhdGEub3JpZ2luYWxFbmRzLnRhcmdldC5kYXRhLmlkO1xuICAgICAgICAgIGUuZGF0YS5vcmlnaW5hbEVuZHMgPSB7IHNvdXJjZTogYWxsTm9kZXMuZmlsdGVyKCcjJyArIHNyY0lkKSwgdGFyZ2V0OiBhbGxOb2Rlcy5maWx0ZXIoJyMnICsgdGd0SWQpIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHNldCBwYXJlbnRzXG4gICAgICBmb3IgKGxldCBub2RlIGluIG5vZGUycGFyZW50KSB7XG4gICAgICAgIGNvbnN0IGVsZW0gPSBhbGxOb2Rlcy4kaWQobm9kZSk7XG4gICAgICAgIGlmIChlbGVtLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIGVsZW0ubW92ZSh7IHBhcmVudDogbm9kZTJwYXJlbnRbbm9kZV0gfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNvbGxhcHNlIHRoZSBjb2xsYXBzZWQgbm9kZXNcbiAgICAgIGFwaS5jb2xsYXBzZShub2RlczJjb2xsYXBzZSwgeyBsYXlvdXRCeTogbnVsbCwgZmlzaGV5ZTogZmFsc2UsIGFuaW1hdGU6IGZhbHNlIH0pO1xuXG4gICAgICAvLyBwb3NpdGlvbnMgbWlnaHQgYmUgY2hhbmdlZCBpbiBjb2xsYXBzZSBleHRlbnNpb25cbiAgICAgIGZvciAoY29uc3QgbiBvZiBmaWxlSlNPTi5ub2Rlcykge1xuICAgICAgICBjb25zdCBub2RlID0gY3kuJGlkKG4uZGF0YS5pZClcbiAgICAgICAgaWYgKG5vZGUuaXNDaGlsZGxlc3MoKSkge1xuICAgICAgICAgIGN5LiRpZChuLmRhdGEuaWQpLnBvc2l0aW9uKG5vZGVQb3NpdGlvbnNbbi5kYXRhLmlkXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGN5LmZpdCgpO1xuICAgIH0sXG5cblxuICAgIC8qKiBzYXZlcyBjeXRvc2NhcGUgZWxlbWVudHMgKGNvbGxlY3Rpb24pIGFzIEpTT05cbiAgICAgKiBjYWxscyBlbGVtZW50cycganNvbiBtZXRob2QgKGh0dHBzOi8vanMuY3l0b3NjYXBlLm9yZy8jZWxlLmpzb24pIHdoZW4gd2Uga2VlcCBhIGN5dG9zY2FwZSBlbGVtZW50IGluIHRoZSBkYXRhLiBcbiAgICAgKiBAcGFyYW0gIHt9IGVsZW1zIGN5dG9zY2FwZSBjb2xsZWN0aW9uXG4gICAgICogQHBhcmFtICB7fSBmaWxlbmFtZSBzdHJpbmdcbiAgICAgKi9cbiAgICBzYXZlSnNvbjogZnVuY3Rpb24gKGVsZW1zLCBmaWxlbmFtZSkge1xuICAgICAgaWYgKCFlbGVtcykge1xuICAgICAgICBlbGVtcyA9IGN5LiQoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5vZGVzID0gaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihlbGVtcy5ub2RlcygpKTtcbiAgICAgIGNvbnN0IGVkZ2VzID0gaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihlbGVtcy5lZGdlcygpKTtcbiAgICAgIGlmIChlZGdlcy5sZW5ndGggKyBub2Rlcy5sZW5ndGggPCAxKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYWNjb3JkaW5nIHRvIGN5dG9zY2FwZS5qcyBmb3JtYXRcbiAgICAgIGNvbnN0IG8gPSB7IG5vZGVzOiBbXSwgZWRnZXM6IFtdIH07XG4gICAgICBmb3IgKGNvbnN0IGUgb2YgZWRnZXMpIHtcbiAgICAgICAgaWYgKGUuY29sbGFwc2VkRWRnZXMpIHtcbiAgICAgICAgICBlLmNvbGxhcHNlZEVkZ2VzID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihlLmNvbGxhcHNlZEVkZ2VzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGUub3JpZ2luYWxFbmRzKSB7XG4gICAgICAgICAgY29uc3Qgc3JjID0gZS5vcmlnaW5hbEVuZHMuc291cmNlLmpzb24oKTtcbiAgICAgICAgICBjb25zdCB0Z3QgPSBlLm9yaWdpbmFsRW5kcy50YXJnZXQuanNvbigpO1xuICAgICAgICAgIGlmIChzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbikge1xuICAgICAgICAgICAgLy8gZS5vcmlnaW5hbEVuZHMuc291cmNlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gd2lsbCBiZSBjaGFuZ2VkXG4gICAgICAgICAgICBzcmMuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IGN5Q29sbGVjdGlvbjJKc29uKGhhbGZEZWVwQ29weUNvbGxlY3Rpb24oc3JjLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRndC5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgICAgICB0Z3QuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IGN5Q29sbGVjdGlvbjJKc29uKGhhbGZEZWVwQ29weUNvbGxlY3Rpb24odGd0LmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5vcmlnaW5hbEVuZHMgPSB7IHNvdXJjZTogc3JjLCB0YXJnZXQ6IHRndCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb25PYmogPSBlLmN5Lmpzb24oKTtcbiAgICAgICAganNvbk9iai5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gZS5jb2xsYXBzZWRFZGdlcztcbiAgICAgICAganNvbk9iai5kYXRhLm9yaWdpbmFsRW5kcyA9IGUub3JpZ2luYWxFbmRzO1xuICAgICAgICBvLmVkZ2VzLnB1c2goanNvbk9iaik7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMpIHtcbiAgICAgICAgaWYgKG4uY29sbGFwc2VkQ2hpbGRyZW4pIHtcbiAgICAgICAgICBuLmNvbGxhcHNlZENoaWxkcmVuID0gY3lDb2xsZWN0aW9uMkpzb24oaGFsZkRlZXBDb3B5Q29sbGVjdGlvbihuLmNvbGxhcHNlZENoaWxkcmVuKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbk9iaiA9IG4uY3kuanNvbigpO1xuICAgICAgICBqc29uT2JqLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBuLmNvbGxhcHNlZENoaWxkcmVuO1xuICAgICAgICBvLm5vZGVzLnB1c2goanNvbk9iaik7XG4gICAgICB9XG5cbiAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgZmlsZW5hbWUgPSAnZXhwYW5kLWNvbGxhcHNlLW91dHB1dC5qc29uJztcbiAgICAgIH1cbiAgICAgIHN0cjJmaWxlKEpTT04uc3RyaW5naWZ5KG8pLCBmaWxlbmFtZSk7XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNhdmVMb2FkVXRpbGl0aWVzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGFwaSkge1xuICBpZiAoY3kudW5kb1JlZG8gPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgdmFyIHVyID0gY3kudW5kb1JlZG8oe30sIHRydWUpO1xuXG4gIGZ1bmN0aW9uIGdldEVsZXMoX2VsZXMpIHtcbiAgICByZXR1cm4gKHR5cGVvZiBfZWxlcyA9PT0gXCJzdHJpbmdcIikgPyBjeS4kKF9lbGVzKSA6IF9lbGVzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Tm9kZVBvc2l0aW9ucygpIHtcbiAgICB2YXIgcG9zaXRpb25zID0ge307XG4gICAgdmFyIG5vZGVzID0gY3kubm9kZXMoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlbGUgPSBub2Rlc1tpXTtcbiAgICAgIHBvc2l0aW9uc1tlbGUuaWQoKV0gPSB7XG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHBvc2l0aW9ucztcbiAgfVxuXG4gIGZ1bmN0aW9uIHJldHVyblRvUG9zaXRpb25zKHBvc2l0aW9ucykge1xuICAgIHZhciBjdXJyZW50UG9zaXRpb25zID0ge307XG4gICAgY3kubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLnBvc2l0aW9ucyhmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICBjdXJyZW50UG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcbiAgICAgICAgeDogZWxlLnBvc2l0aW9uKFwieFwiKSxcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxuICAgICAgfTtcbiAgICAgIHZhciBwb3MgPSBwb3NpdGlvbnNbZWxlLmlkKCldO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeDogcG9zLngsXG4gICAgICAgIHk6IHBvcy55XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnM7XG4gIH1cblxuICB2YXIgc2Vjb25kVGltZU9wdHMgPSB7XG4gICAgbGF5b3V0Qnk6IG51bGwsXG4gICAgYW5pbWF0ZTogZmFsc2UsXG4gICAgZmlzaGV5ZTogZmFsc2VcbiAgfTtcblxuICBmdW5jdGlvbiBkb0l0KGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHZhciBub2RlcyA9IGdldEVsZXMoYXJncy5ub2Rlcyk7XG4gICAgICBpZiAoYXJncy5maXJzdFRpbWUpIHtcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zKCk7XG4gICAgICAgIHJlc3VsdC5ub2RlcyA9IGZ1bmMuaW5kZXhPZihcIkFsbFwiKSA+IDAgPyBhcGlbZnVuY10oYXJncy5vcHRpb25zKSA6IGFwaVtmdW5jXShub2RlcywgYXJncy5vcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9ucygpO1xuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKHNlY29uZFRpbWVPcHRzKSA6IGFwaVtmdW5jXShjeS5jb2xsZWN0aW9uKG5vZGVzKSwgc2Vjb25kVGltZU9wdHMpO1xuICAgICAgICByZXR1cm5Ub1Bvc2l0aW9ucyhhcmdzLm9sZERhdGEpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH1cblxuICB2YXIgYWN0aW9ucyA9IFtcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VSZWN1cnNpdmVseVwiLCBcImNvbGxhcHNlQWxsXCIsIFwiZXhwYW5kXCIsIFwiZXhwYW5kUmVjdXJzaXZlbHlcIiwgXCJleHBhbmRBbGxcIl07XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoaSA9PSAyKVxuICAgICAgdXIuYWN0aW9uKFwiY29sbGFwc2VBbGxcIiwgZG9JdChcImNvbGxhcHNlQWxsXCIpLCBkb0l0KFwiZXhwYW5kUmVjdXJzaXZlbHlcIikpO1xuICAgIGVsc2UgaWYoaSA9PSA1KVxuICAgICAgdXIuYWN0aW9uKFwiZXhwYW5kQWxsXCIsIGRvSXQoXCJleHBhbmRBbGxcIiksIGRvSXQoXCJjb2xsYXBzZVJlY3Vyc2l2ZWx5XCIpKTtcbiAgICBlbHNlXG4gICAgICB1ci5hY3Rpb24oYWN0aW9uc1tpXSwgZG9JdChhY3Rpb25zW2ldKSwgZG9JdChhY3Rpb25zWyhpICsgMykgJSA2XSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29sbGFwc2VFZGdlcyhhcmdzKXsgICAgXG4gICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gICAgdmFyIGVkZ2VzID0gYXJncy5lZGdlcztcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcbiAgICAgIHZhciBjb2xsYXBzZVJlc3VsdCA9IGFwaS5jb2xsYXBzZUVkZ2VzKGVkZ2VzLG9wdGlvbnMpOyAgICBcbiAgICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlUmVzdWx0LmVkZ2VzO1xuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VSZXN1bHQub2xkRWRnZXM7ICBcbiAgICAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcbiAgICB9ZWxzZXtcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IGVkZ2VzO1xuICAgICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcbiAgICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XG4gICAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICAgIH1cbiAgICAgXG4gICAgIFxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyhhcmdzKXtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcbiAgICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoYXJncy5ub2Rlcywgb3B0aW9ucyk7XG4gICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0LmVkZ2VzO1xuICAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5vbGRFZGdlcztcbiAgICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgIH1lbHNle1xuICAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICAgIH1cbiAgICBcbiAgICB9XG4gXG4gICAgcmV0dXJuIHJlc3VsdDtcblxuIH1cbiBmdW5jdGlvbiBjb2xsYXBzZUFsbEVkZ2VzKGFyZ3Mpe1xuICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gICB2YXIgcmVzdWx0ID0ge307XG4gICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICBpZihhcmdzLmZpcnN0VGltZSl7XG4gICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmNvbGxhcHNlQWxsRWRnZXMob3B0aW9ucyk7XG4gICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQuZWRnZXM7XG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQub2xkRWRnZXM7XG4gICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgfWVsc2V7XG4gICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcbiAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICAgIH1cbiAgIFxuICAgfVxuXG4gICByZXR1cm4gcmVzdWx0O1xuIH1cbiBmdW5jdGlvbiBleHBhbmRFZGdlcyhhcmdzKXsgICBcbiAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICAgdmFyIHJlc3VsdCA9e307XG4gIFxuICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgICB2YXIgZXhwYW5kUmVzdWx0ID0gYXBpLmV4cGFuZEVkZ2VzKGFyZ3MuZWRnZXMpO1xuICAgIHJlc3VsdC5lZGdlcyA9IGV4cGFuZFJlc3VsdC5lZGdlcztcbiAgICByZXN1bHQub2xkRWRnZXMgPSBleHBhbmRSZXN1bHQub2xkRWRnZXM7XG4gICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgIFxuICAgfWVsc2V7XG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcbiAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xuICAgICAgfVxuICBcbiAgIH1cblxuICAgcmV0dXJuIHJlc3VsdDtcbiB9XG4gZnVuY3Rpb24gZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMoYXJncyl7XG4gIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcbiAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mubm9kZXMsb3B0aW9ucyk7XG4gICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5lZGdlcztcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0Lm9sZEVkZ2VzO1xuICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICB9ZWxzZXtcbiAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XG4gICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XG4gICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICB9XG4gIFxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbiB9XG4gZnVuY3Rpb24gZXhwYW5kQWxsRWRnZXMoYXJncyl7XG4gIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcbiAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgdmFyIGV4cGFuZFJlc3VsdCA9IGFwaS5leHBhbmRBbGxFZGdlcyhvcHRpb25zKTtcbiAgIHJlc3VsdC5lZGdlcyA9IGV4cGFuZFJlc3VsdC5lZGdlcztcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGV4cGFuZFJlc3VsdC5vbGRFZGdlcztcbiAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcbiAgfWVsc2V7XG4gICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcbiAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XG4gICAgfVxuICAgXG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xuIH1cbiBcbiBcbiAgdXIuYWN0aW9uKFwiY29sbGFwc2VFZGdlc1wiLCBjb2xsYXBzZUVkZ2VzLCBleHBhbmRFZGdlcyk7XG4gIHVyLmFjdGlvbihcImV4cGFuZEVkZ2VzXCIsIGV4cGFuZEVkZ2VzLCBjb2xsYXBzZUVkZ2VzKTtcblxuICB1ci5hY3Rpb24oXCJjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzXCIsIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMsIGV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKTtcbiAgdXIuYWN0aW9uKFwiZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXNcIiwgZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMsIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMpO1xuXG4gIHVyLmFjdGlvbihcImNvbGxhcHNlQWxsRWRnZXNcIiwgY29sbGFwc2VBbGxFZGdlcywgZXhwYW5kQWxsRWRnZXMpO1xuICB1ci5hY3Rpb24oXCJleHBhbmRBbGxFZGdlc1wiLCBleHBhbmRBbGxFZGdlcywgY29sbGFwc2VBbGxFZGdlcyk7XG5cbiBcblxuXG4gIFxuXG5cbn07XG4iXX0=
