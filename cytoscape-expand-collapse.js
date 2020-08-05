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

      cy.on('remove', 'node', data.eRemove = function () {
        clearDraws();
      });

      var ur;
      cy.on('select unselect', data.eSelect = function () {
        if (nodeWithRenderedCue) {
          clearDraws();
        }
        var isOnly1Selected = cy.$(':selected').length == 1;
        var isOnly1SelectedCompundNode = cy.nodes(':parent').filter(':selected').length == 1 && isOnly1Selected;
        var isOnly1SelectedCollapsedNode = cy.nodes('.cy-expand-collapse-collapsed-node').filter(':selected').length == 1 && isOnly1Selected;
        if (isOnly1SelectedCollapsedNode || isOnly1SelectedCompundNode) {
          drawExpandCollapseCue(cy.nodes(':selected')[0]);
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

      cy.on('position', 'node', data.ePosition = debounce2(data.eSelect, CUE_POS_UPDATE_DELAY, clearDraws));

      cy.on('pan zoom', data.ePosition);

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
        .off('position', 'node', data.ePosition)
        .off('pan zoom', data.ePosition)
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
        .on('position', 'node', data.ePosition)
        .on('pan zoom', data.ePosition)
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

},{"./boundingBoxUtilities":1,"./elementUtilities":5}],7:[function(_dereq_,module,exports){
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

},{"./cueUtilities":2,"./expandCollapseUtilities":6,"./undoRedoUtilities":8}],8:[function(_dereq_,module,exports){
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2RlYm91bmNlMi5qcyIsInNyYy9lbGVtZW50VXRpbGl0aWVzLmpzIiwic3JjL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3VuZG9SZWRvVXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzl6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0ge1xyXG4gIGVxdWFsQm91bmRpbmdCb3hlczogZnVuY3Rpb24oYmIxLCBiYjIpe1xyXG4gICAgICByZXR1cm4gYmIxLngxID09IGJiMi54MSAmJiBiYjEueDIgPT0gYmIyLngyICYmIGJiMS55MSA9PSBiYjIueTEgJiYgYmIxLnkyID09IGJiMi55MjtcclxuICB9LFxyXG4gIGdldFVuaW9uOiBmdW5jdGlvbihiYjEsIGJiMil7XHJcbiAgICAgIHZhciB1bmlvbiA9IHtcclxuICAgICAgeDE6IE1hdGgubWluKGJiMS54MSwgYmIyLngxKSxcclxuICAgICAgeDI6IE1hdGgubWF4KGJiMS54MiwgYmIyLngyKSxcclxuICAgICAgeTE6IE1hdGgubWluKGJiMS55MSwgYmIyLnkxKSxcclxuICAgICAgeTI6IE1hdGgubWF4KGJiMS55MiwgYmIyLnkyKSxcclxuICAgIH07XHJcblxyXG4gICAgdW5pb24udyA9IHVuaW9uLngyIC0gdW5pb24ueDE7XHJcbiAgICB1bmlvbi5oID0gdW5pb24ueTIgLSB1bmlvbi55MTtcclxuXHJcbiAgICByZXR1cm4gdW5pb247XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib3VuZGluZ0JveFV0aWxpdGllczsiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBkZWJvdW5jZTIgPSByZXF1aXJlKCcuL2RlYm91bmNlMicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGFyYW1zLCBjeSwgYXBpKSB7XHJcbiAgdmFyIGVsZW1lbnRVdGlsaXRpZXM7XHJcbiAgdmFyIGZuID0gcGFyYW1zO1xyXG4gIGNvbnN0IENVRV9QT1NfVVBEQVRFX0RFTEFZID0gMTAwO1xyXG4gIHZhciBub2RlV2l0aFJlbmRlcmVkQ3VlO1xyXG5cclxuICBjb25zdCBnZXREYXRhID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNjcmF0Y2ggPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xyXG4gICAgcmV0dXJuIHNjcmF0Y2ggJiYgc2NyYXRjaC5jdWVVdGlsaXRpZXM7XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XHJcbiAgICBpZiAoc2NyYXRjaCA9PSBudWxsKSB7XHJcbiAgICAgIHNjcmF0Y2ggPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICBzY3JhdGNoLmN1ZVV0aWxpdGllcyA9IGRhdGE7XHJcbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHNjcmF0Y2gpO1xyXG4gIH07XHJcblxyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciAkY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICRjYW52YXMuY2xhc3NMaXN0LmFkZChcImV4cGFuZC1jb2xsYXBzZS1jYW52YXNcIik7XHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gY3kuY29udGFpbmVyKCk7XHJcbiAgICAgIHZhciBjdHggPSAkY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXMpO1xyXG5cclxuICAgICAgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcclxuXHJcbiAgICAgIHZhciBvZmZzZXQgPSBmdW5jdGlvbiAoZWx0KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBlbHQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB0b3A6IHJlY3QudG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcclxuICAgICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgJGNhbnZhcy5oZWlnaHQgPSBjeS5jb250YWluZXIoKS5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgJGNhbnZhcy53aWR0aCA9IGN5LmNvbnRhaW5lcigpLm9mZnNldFdpZHRoO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUudG9wID0gMDtcclxuICAgICAgICAkY2FudmFzLnN0eWxlLmxlZnQgPSAwO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUuekluZGV4ID0gb3B0aW9ucygpLnpJbmRleDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSBvZmZzZXQoJGNhbnZhcyk7XHJcbiAgICAgICAgICB2YXIgY29udGFpbmVyQmIgPSBvZmZzZXQoJGNvbnRhaW5lcik7XHJcbiAgICAgICAgICAkY2FudmFzLnN0eWxlLnRvcCA9IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKTtcclxuICAgICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpO1xyXG5cclxuICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYgKGN5KSB7XHJcbiAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMCk7XHJcblxyXG4gICAgICB9LCAyNTApO1xyXG5cclxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcclxuICAgICAgICBfc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBzaXplQ2FudmFzKCk7XHJcblxyXG4gICAgICB2YXIgZGF0YSA9IHt9O1xyXG5cclxuICAgICAgLy8gaWYgdGhlcmUgYXJlIGV2ZW50cyBmaWVsZCBpbiBkYXRhIHVuYmluZCB0aGVtIGhlcmVcclxuICAgICAgLy8gdG8gcHJldmVudCBiaW5kaW5nIHRoZSBzYW1lIGV2ZW50IG11bHRpcGxlIHRpbWVzXHJcbiAgICAgIC8vIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xyXG4gICAgICAvLyAgIGZ1bmN0aW9uc1sndW5iaW5kJ10uYXBwbHkoICRjb250YWluZXIgKTtcclxuICAgICAgLy8gfVxyXG5cclxuICAgICAgZnVuY3Rpb24gb3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5vcHRpb25zO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBjbGVhckRyYXdzKCkge1xyXG4gICAgICAgIHZhciB3ID0gY3kud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9IGN5LmhlaWdodCgpO1xyXG5cclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xyXG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSkge1xyXG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XHJcbiAgICAgICAgdmFyIGhhc0NoaWxkcmVuID0gY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbiAhPSB1bmRlZmluZWQgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2ltcGxlIG5vZGUgd2l0aCBubyBjb2xsYXBzZWQgY2hpbGRyZW4gcmV0dXJuIGRpcmVjdGx5XHJcbiAgICAgICAgaWYgKCFoYXNDaGlsZHJlbiAmJiAhY29sbGFwc2VkQ2hpbGRyZW4pIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBpc0NvbGxhcHNlZCA9IG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG5cclxuICAgICAgICAvL0RyYXcgZXhwYW5kLWNvbGxhcHNlIHJlY3RhbmdsZXNcclxuICAgICAgICB2YXIgcmVjdFNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVTaXplO1xyXG4gICAgICAgIHZhciBsaW5lU2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplO1xyXG5cclxuICAgICAgICB2YXIgY3VlQ2VudGVyO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb24gPT09ICd0b3AtbGVmdCcpIHtcclxuICAgICAgICAgIHZhciBvZmZzZXQgPSAxO1xyXG4gICAgICAgICAgdmFyIHNpemUgPSBjeS56b29tKCkgPCAxID8gcmVjdFNpemUgLyAoMiAqIGN5Lnpvb20oKSkgOiByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgICB2YXIgbm9kZUJvcmRlcldpZCA9IHBhcnNlRmxvYXQobm9kZS5jc3MoJ2JvcmRlci13aWR0aCcpKTtcclxuICAgICAgICAgIHZhciB4ID0gbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS53aWR0aCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctbGVmdCcpKVxyXG4gICAgICAgICAgICArIG5vZGVCb3JkZXJXaWQgKyBzaXplICsgb2Zmc2V0O1xyXG4gICAgICAgICAgdmFyIHkgPSBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmhlaWdodCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctdG9wJykpXHJcbiAgICAgICAgICAgICsgbm9kZUJvcmRlcldpZCArIHNpemUgKyBvZmZzZXQ7XHJcblxyXG4gICAgICAgICAgY3VlQ2VudGVyID0geyB4OiB4LCB5OiB5IH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHZhciBvcHRpb24gPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjtcclxuICAgICAgICAgIGN1ZUNlbnRlciA9IHR5cGVvZiBvcHRpb24gPT09ICdmdW5jdGlvbicgPyBvcHRpb24uY2FsbCh0aGlzLCBub2RlKSA6IG9wdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlciA9IGVsZW1lbnRVdGlsaXRpZXMuY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihjdWVDZW50ZXIpO1xyXG5cclxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHNpemVzXHJcbiAgICAgICAgcmVjdFNpemUgPSBNYXRoLm1heChyZWN0U2l6ZSwgcmVjdFNpemUgKiBjeS56b29tKCkpO1xyXG4gICAgICAgIGxpbmVTaXplID0gTWF0aC5tYXgobGluZVNpemUsIGxpbmVTaXplICogY3kuem9vbSgpKTtcclxuICAgICAgICB2YXIgZGlmZiA9IChyZWN0U2l6ZSAtIGxpbmVTaXplKSAvIDI7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclggPSBleHBhbmRjb2xsYXBzZUNlbnRlci54O1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclkgPSBleHBhbmRjb2xsYXBzZUNlbnRlci55O1xyXG5cclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFggPSBleHBhbmRjb2xsYXBzZUNlbnRlclggLSByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRZID0gZXhwYW5kY29sbGFwc2VDZW50ZXJZIC0gcmVjdFNpemUgLyAyO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlY3RTaXplID0gcmVjdFNpemU7XHJcblxyXG4gICAgICAgIC8vIERyYXcgZXhwYW5kL2NvbGxhcHNlIGN1ZSBpZiBzcGVjaWZpZWQgdXNlIGFuIGltYWdlIGVsc2UgcmVuZGVyIGl0IGluIHRoZSBkZWZhdWx0IHdheVxyXG4gICAgICAgIGlmIChpc0NvbGxhcHNlZCAmJiBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UpIHtcclxuICAgICAgICAgIGRyYXdJbWcob3B0aW9ucygpLmV4cGFuZEN1ZUltYWdlLCBleHBhbmRjb2xsYXBzZVN0YXJ0WCwgZXhwYW5kY29sbGFwc2VTdGFydFksIHJlY3RTaXplLCByZWN0U2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFpc0NvbGxhcHNlZCAmJiBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSkge1xyXG4gICAgICAgICAgZHJhd0ltZyhvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZSwgZXhwYW5kY29sbGFwc2VTdGFydFgsIGV4cGFuZGNvbGxhcHNlU3RhcnRZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHZhciBvbGRGaWxsU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xyXG4gICAgICAgICAgdmFyIG9sZFdpZHRoID0gY3R4LmxpbmVXaWR0aDtcclxuICAgICAgICAgIHZhciBvbGRTdHJva2VTdHlsZSA9IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgICAgICAgIGN0eC5lbGxpcHNlKGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSAvIDIsIHJlY3RTaXplIC8gMiwgMCwgMCwgMiAqIE1hdGguUEkpO1xyXG4gICAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IE1hdGgubWF4KDIuNiwgMi42ICogY3kuem9vbSgpKTtcclxuXHJcbiAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xyXG4gICAgICAgICAgY3R4LmxpbmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGxpbmVTaXplICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xyXG5cclxuICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUgPSBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xyXG5cclxuICAgICAgICBub2RlV2l0aFJlbmRlcmVkQ3VlID0gbm9kZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gZHJhd0ltZyhpbWdTcmMsIHgsIHksIHcsIGgpIHtcclxuICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKHcsIGgpO1xyXG4gICAgICAgIGltZy5zcmMgPSBpbWdTcmM7XHJcbiAgICAgICAgaW1nLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCB4LCB5LCB3LCBoKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjeS5vbigncmVzaXplJywgZGF0YS5lQ3lSZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAobm9kZVdpdGhSZW5kZXJlZEN1ZSkge1xyXG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgb2xkTW91c2VQb3MgPSBudWxsLCBjdXJyTW91c2VQb3MgPSBudWxsO1xyXG4gICAgICBjeS5vbignbW91c2Vkb3duJywgZGF0YS5lTW91c2VEb3duID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBvbGRNb3VzZVBvcyA9IGUucmVuZGVyZWRQb3NpdGlvbiB8fCBlLmN5UmVuZGVyZWRQb3NpdGlvblxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKCdtb3VzZXVwJywgZGF0YS5lTW91c2VVcCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgY3Vyck1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgdXI7XHJcbiAgICAgIGN5Lm9uKCdzZWxlY3QgdW5zZWxlY3QnLCBkYXRhLmVTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKG5vZGVXaXRoUmVuZGVyZWRDdWUpIHtcclxuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGlzT25seTFTZWxlY3RlZCA9IGN5LiQoJzpzZWxlY3RlZCcpLmxlbmd0aCA9PSAxO1xyXG4gICAgICAgIHZhciBpc09ubHkxU2VsZWN0ZWRDb21wdW5kTm9kZSA9IGN5Lm5vZGVzKCc6cGFyZW50JykuZmlsdGVyKCc6c2VsZWN0ZWQnKS5sZW5ndGggPT0gMSAmJiBpc09ubHkxU2VsZWN0ZWQ7XHJcbiAgICAgICAgdmFyIGlzT25seTFTZWxlY3RlZENvbGxhcHNlZE5vZGUgPSBjeS5ub2RlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpLmZpbHRlcignOnNlbGVjdGVkJykubGVuZ3RoID09IDEgJiYgaXNPbmx5MVNlbGVjdGVkO1xyXG4gICAgICAgIGlmIChpc09ubHkxU2VsZWN0ZWRDb2xsYXBzZWROb2RlIHx8IGlzT25seTFTZWxlY3RlZENvbXB1bmROb2RlKSB7XHJcbiAgICAgICAgICBkcmF3RXhwYW5kQ29sbGFwc2VDdWUoY3kubm9kZXMoJzpzZWxlY3RlZCcpWzBdKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kub24oJ3RhcCcsIGRhdGEuZVRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZVdpdGhSZW5kZXJlZEN1ZTtcclxuICAgICAgICBpZiAoIW5vZGUpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFgnKTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WScpO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgPSBub2RlLmRhdGEoJ2V4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplJyk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xyXG5cclxuICAgICAgICB2YXIgY3lSZW5kZXJlZFBvcyA9IGV2ZW50LnJlbmRlcmVkUG9zaXRpb24gfHwgZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uO1xyXG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zWCA9IGN5UmVuZGVyZWRQb3MueDtcclxuICAgICAgICB2YXIgY3lSZW5kZXJlZFBvc1kgPSBjeVJlbmRlcmVkUG9zLnk7XHJcbiAgICAgICAgdmFyIG9wdHMgPSBvcHRpb25zKCk7XHJcbiAgICAgICAgdmFyIGZhY3RvciA9IChvcHRzLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XHJcblxyXG4gICAgICAgIGlmICgoTWF0aC5hYnMob2xkTW91c2VQb3MueCAtIGN1cnJNb3VzZVBvcy54KSA8IDUgJiYgTWF0aC5hYnMob2xkTW91c2VQb3MueSAtIGN1cnJNb3VzZVBvcy55KSA8IDUpXHJcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3IpIHtcclxuICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlICYmICF1cikge1xyXG4gICAgICAgICAgICB1ciA9IGN5LnVuZG9SZWRvKHsgZGVmYXVsdEFjdGlvbnM6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChhcGkuaXNDb2xsYXBzaWJsZShub2RlKSkge1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKCk7XHJcbiAgICAgICAgICAgIGlmIChvcHRzLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgICAgdXIuZG8oXCJjb2xsYXBzZVwiLCB7XHJcbiAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG9wdHNcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBhcGkuY29sbGFwc2Uobm9kZSwgb3B0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKGFwaS5pc0V4cGFuZGFibGUobm9kZSkpIHtcclxuICAgICAgICAgICAgY2xlYXJEcmF3cygpO1xyXG4gICAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgIHVyLmRvKFwiZXhwYW5kXCIsIHsgbm9kZXM6IG5vZGUsIG9wdGlvbnM6IG9wdHMgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgYXBpLmV4cGFuZChub2RlLCBvcHRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKG5vZGUuc2VsZWN0YWJsZSgpKSB7XHJcbiAgICAgICAgICAgIG5vZGUudW5zZWxlY3RpZnkoKTtcclxuICAgICAgICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24gPSBkZWJvdW5jZTIoZGF0YS5lU2VsZWN0LCBDVUVfUE9TX1VQREFURV9ERUxBWSwgY2xlYXJEcmF3cykpO1xyXG5cclxuICAgICAgY3kub24oJ3BhbiB6b29tJywgZGF0YS5lUG9zaXRpb24pO1xyXG5cclxuICAgICAgY3kub24oJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kIGV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2UnLCAnbm9kZScsIGRhdGEuZUFmdGVyRXhwYW5kQ29sbGFwc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGRlbGF5ID0gNTAgKyBwYXJhbXMuYW5pbWF0ZSA/IHBhcmFtcy5hbmltYXRpb25EdXJhdGlvbiA6IDA7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZSh0aGlzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBkZWxheSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXHJcbiAgICAgIGRhdGEuaGFzRXZlbnRGaWVsZHMgPSB0cnVlO1xyXG4gICAgICBzZXREYXRhKGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyB2YXIgJGNvbnRhaW5lciA9IHRoaXM7XHJcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xyXG5cclxuICAgICAgaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byB1bmJpbmQgZG9lcyBub3QgZXhpc3QnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5LnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJyk7XHJcblxyXG4gICAgICBjeS5vZmYoJ21vdXNlZG93bicsICdub2RlJywgZGF0YS5lTW91c2VEb3duKVxyXG4gICAgICAgIC5vZmYoJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXHJcbiAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUpXHJcbiAgICAgICAgLm9mZigndGFwJywgJ25vZGUnLCBkYXRhLmVUYXApXHJcbiAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXHJcbiAgICAgICAgLm9mZigncG9zaXRpb24nLCAnbm9kZScsIGRhdGEuZVBvc2l0aW9uKVxyXG4gICAgICAgIC5vZmYoJ3BhbiB6b29tJywgZGF0YS5lUG9zaXRpb24pXHJcbiAgICAgICAgLm9mZignc2VsZWN0IHVuc2VsZWN0JywgZGF0YS5lU2VsZWN0KVxyXG4gICAgICAgIC5vZmYoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kIGV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2UnLCAnbm9kZScsIGRhdGEuZUFmdGVyRXhwYW5kQ29sbGFwc2UpXHJcbiAgICAgICAgLm9mZignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcclxuICAgICAgICAub2ZmKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSk7XHJcbiAgICB9LFxyXG4gICAgcmViaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xyXG5cclxuICAgICAgaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50cyB0byByZWJpbmQgZG9lcyBub3QgZXhpc3QnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcclxuICAgICAgICAub24oJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXHJcbiAgICAgICAgLm9uKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcclxuICAgICAgICAub24oJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxyXG4gICAgICAgIC5vbignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXHJcbiAgICAgICAgLm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24pXHJcbiAgICAgICAgLm9uKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKVxyXG4gICAgICAgIC5vbignc2VsZWN0IHVuc2VsZWN0JywgZGF0YS5lU2VsZWN0KVxyXG4gICAgICAgIC5vbignZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmQgZXhwYW5kY29sbGFwc2UuYWZ0ZXJjb2xsYXBzZScsICdub2RlJywgZGF0YS5lQWZ0ZXJFeHBhbmRDb2xsYXBzZSlcclxuICAgICAgICAub24oJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUpXHJcbiAgICAgICAgLm9uKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KGN5LmNvbnRhaW5lcigpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseShjeS5jb250YWluZXIoKSwgYXJndW1lbnRzKTtcclxuICB9XHJcbiAgdGhyb3cgbmV3IEVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWV4cGFuZC1jb2xsYXBzZScpO1xyXG5cclxufTtcclxuIiwidmFyIGRlYm91bmNlID0gKGZ1bmN0aW9uICgpIHtcclxuICAvKipcclxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XHJcbiAgICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxyXG4gICAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XHJcbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cclxuICAgKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXHJcbiAgICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cclxuICAgKi9cclxuICAvKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xyXG4gIHZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XHJcblxyXG4gIC8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXHJcbiAgdmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxyXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcclxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBEYXRlXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcclxuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XHJcbiAgICogfSwgXy5ub3coKSk7XHJcbiAgICogLy8gPT4gbG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxyXG4gICAqL1xyXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxyXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xyXG4gICAqIGludm9rZWQuIFRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gY29tZXMgd2l0aCBhIGBjYW5jZWxgIG1ldGhvZCB0byBjYW5jZWxcclxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXHJcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqIFN1YnNlcXVlbnQgY2FsbHMgdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdFxyXG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxyXG4gICAqXHJcbiAgICogKipOb3RlOioqIElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAsIGBmdW5jYCBpcyBpbnZva2VkXHJcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xyXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKlxyXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXHJcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBGdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZVxyXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxyXG4gICAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XHJcbiAgICpcclxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXHJcbiAgICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xyXG4gICAqICAgJ2xlYWRpbmcnOiB0cnVlLFxyXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXHJcbiAgICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xyXG4gICAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XHJcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxyXG4gICAqIHZhciB0b2RvQ2hhbmdlcyA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDEwMDApO1xyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscy50b2RvLCB0b2RvQ2hhbmdlcyk7XHJcbiAgICpcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcclxuICAgKiAgIGlmIChfLmZpbmQoY2hhbmdlcywgeyAndXNlcic6ICd0b2RvJywgJ3R5cGUnOiAnZGVsZXRlJ30pKSB7XHJcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xyXG4gICAqICAgfVxyXG4gICAqIH0sIFsnZGVsZXRlJ10pO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYXQgc29tZSBwb2ludCBgbW9kZWxzLnRvZG9gIGlzIGNoYW5nZWRcclxuICAgKiBtb2RlbHMudG9kby5jb21wbGV0ZWQgPSB0cnVlO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYmVmb3JlIDEgc2Vjb25kIGhhcyBwYXNzZWQgYG1vZGVscy50b2RvYCBpcyBkZWxldGVkXHJcbiAgICogLy8gd2hpY2ggY2FuY2VscyB0aGUgZGVib3VuY2VkIGB0b2RvQ2hhbmdlc2AgY2FsbFxyXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcclxuICAgKi9cclxuICBmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XHJcbiAgICB2YXIgYXJncyxcclxuICAgICAgICAgICAgbWF4VGltZW91dElkLFxyXG4gICAgICAgICAgICByZXN1bHQsXHJcbiAgICAgICAgICAgIHN0YW1wLFxyXG4gICAgICAgICAgICB0aGlzQXJnLFxyXG4gICAgICAgICAgICB0aW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcclxuICAgICAgICAgICAgbGFzdENhbGxlZCA9IDAsXHJcbiAgICAgICAgICAgIG1heFdhaXQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xyXG5cclxuICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcclxuICAgIH1cclxuICAgIHdhaXQgPSB3YWl0IDwgMCA/IDAgOiAoK3dhaXQgfHwgMCk7XHJcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xyXG4gICAgICB2YXIgbGVhZGluZyA9IHRydWU7XHJcbiAgICAgIHRyYWlsaW5nID0gZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XHJcbiAgICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcclxuICAgICAgbWF4V2FpdCA9ICdtYXhXYWl0JyBpbiBvcHRpb25zICYmIG5hdGl2ZU1heCgrb3B0aW9ucy5tYXhXYWl0IHx8IDAsIHdhaXQpO1xyXG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcclxuICAgICAgaWYgKHRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBsYXN0Q2FsbGVkID0gMDtcclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlKGlzQ2FsbGVkLCBpZCkge1xyXG4gICAgICBpZiAoaWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgICB9XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVsYXllZCgpIHtcclxuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93KCkgLSBzdGFtcCk7XHJcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XHJcbiAgICAgICAgY29tcGxldGUodHJhaWxpbmdDYWxsLCBtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1heERlbGF5ZWQoKSB7XHJcbiAgICAgIGNvbXBsZXRlKHRyYWlsaW5nLCB0aW1lb3V0SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlYm91bmNlZCgpIHtcclxuICAgICAgYXJncyA9IGFyZ3VtZW50cztcclxuICAgICAgc3RhbXAgPSBub3coKTtcclxuICAgICAgdGhpc0FyZyA9IHRoaXM7XHJcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xyXG5cclxuICAgICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXHJcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XHJcblxyXG4gICAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XHJcbiAgICAgICAgaXNDYWxsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcclxuICAgIHJldHVybiBkZWJvdW5jZWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxyXG4gICAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IExhbmdcclxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCh7fSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdChbMSwgMiwgM10pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoMSk7XHJcbiAgICogLy8gPT4gZmFsc2VcclxuICAgKi9cclxuICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cclxuICAgIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxyXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XHJcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGRlYm91bmNlO1xyXG5cclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7IiwidmFyIGRlYm91bmNlMiA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogU2xpZ2h0bHkgbW9kaWZpZWQgdmVyc2lvbiBvZiBkZWJvdW5jZS4gQ2FsbHMgZm4yIGF0IHRoZSBiZWdpbm5pbmcgb2YgZnJlcXVlbnQgY2FsbHMgdG8gZm4xXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBjYXRlZ29yeSBGdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuMSBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuMiBUaGUgZnVuY3Rpb24gdG8gY2FsbCB0aGUgYmVnaW5uaW5nIG9mIGZyZXF1ZW50IGNhbGxzIHRvIGZuMVxyXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cclxuICAgKi9cclxuICBmdW5jdGlvbiBkZWJvdW5jZTIoZm4xLCB3YWl0LCBmbjIpIHtcclxuICAgIGxldCB0aW1lb3V0O1xyXG4gICAgbGV0IGlzSW5pdCA9IHRydWU7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcclxuICAgICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGltZW91dCA9IG51bGw7XHJcbiAgICAgICAgZm4xLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xyXG4gICAgICAgIGlzSW5pdCA9IHRydWU7XHJcbiAgICAgIH07XHJcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xyXG4gICAgICBpZiAoaXNJbml0KSB7XHJcbiAgICAgICAgZm4yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xyXG4gICAgICAgIGlzSW5pdCA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuICByZXR1cm4gZGVib3VuY2UyO1xyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTI7IiwiZnVuY3Rpb24gZWxlbWVudFV0aWxpdGllcyhjeSkge1xyXG4gcmV0dXJuIHtcclxuICBtb3ZlTm9kZXM6IGZ1bmN0aW9uIChwb3NpdGlvbkRpZmYsIG5vZGVzLCBub3RDYWxjVG9wTW9zdE5vZGVzKSB7XHJcbiAgICB2YXIgdG9wTW9zdE5vZGVzID0gbm90Q2FsY1RvcE1vc3ROb2RlcyA/IG5vZGVzIDogdGhpcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgdmFyIG5vblBhcmVudHMgPSB0b3BNb3N0Tm9kZXMubm90KFwiOnBhcmVudFwiKTsgXHJcbiAgICAvLyBtb3ZpbmcgcGFyZW50cyBzcG9pbHMgcG9zaXRpb25pbmcsIHNvIG1vdmUgb25seSBub25wYXJlbnRzXHJcbiAgICBub25QYXJlbnRzLnBvc2l0aW9ucyhmdW5jdGlvbihlbGUsIGkpe1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IG5vblBhcmVudHNbaV0ucG9zaXRpb24oXCJ4XCIpICsgcG9zaXRpb25EaWZmLngsXHJcbiAgICAgICAgeTogbm9uUGFyZW50c1tpXS5wb3NpdGlvbihcInlcIikgKyBwb3NpdGlvbkRpZmYueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvcE1vc3ROb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IHRvcE1vc3ROb2Rlc1tpXTtcclxuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgICB0aGlzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIGNoaWxkcmVuLCB0cnVlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIGdldFRvcE1vc3ROb2RlczogZnVuY3Rpb24gKG5vZGVzKSB7Ly8qLy9cclxuICAgIHZhciBub2Rlc01hcCA9IHt9O1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBub2Rlc01hcFtub2Rlc1tpXS5pZCgpXSA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgcm9vdHMgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcclxuICAgICAgd2hpbGUgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKG5vZGVzTWFwW3BhcmVudC5pZCgpXSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcm9vdHM7XHJcbiAgfSxcclxuICByZWFycmFuZ2U6IGZ1bmN0aW9uIChsYXlvdXRCeSkge1xyXG4gICAgaWYgKHR5cGVvZiBsYXlvdXRCeSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIGxheW91dEJ5KCk7XHJcbiAgICB9IGVsc2UgaWYgKGxheW91dEJ5ICE9IG51bGwpIHtcclxuICAgICAgdmFyIGxheW91dCA9IGN5LmxheW91dChsYXlvdXRCeSk7XHJcbiAgICAgIGlmIChsYXlvdXQgJiYgbGF5b3V0LnJ1bikge1xyXG4gICAgICAgIGxheW91dC5ydW4oKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbjogZnVuY3Rpb24gKG1vZGVsUG9zaXRpb24pIHtcclxuICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xyXG4gICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogeCxcclxuICAgICAgeTogeVxyXG4gICAgfTtcclxuICB9XHJcbiB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGVsZW1lbnRVdGlsaXRpZXM7XHJcbiIsInZhciBib3VuZGluZ0JveFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vYm91bmRpbmdCb3hVdGlsaXRpZXMnKTtcclxuXHJcbi8vIEV4cGFuZCBjb2xsYXBzZSB1dGlsaXRpZXNcclxuZnVuY3Rpb24gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMoY3kpIHtcclxudmFyIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XHJcbnJldHVybiB7XHJcbiAgLy90aGUgbnVtYmVyIG9mIG5vZGVzIG1vdmluZyBhbmltYXRlZGx5IGFmdGVyIGV4cGFuZCBvcGVyYXRpb25cclxuICBhbmltYXRlZGx5TW92aW5nTm9kZUNvdW50OiAwLFxyXG4gIC8qXHJcbiAgICogQSBmdW50aW9uIGJhc2ljbHkgZXhwYW5kaW5nIGEgbm9kZSwgaXQgaXMgdG8gYmUgY2FsbGVkIHdoZW4gYSBub2RlIGlzIGV4cGFuZGVkIGFueXdheS5cclxuICAgKiBTaW5nbGUgcGFyYW1ldGVyIGluZGljYXRlcyBpZiB0aGUgbm9kZSBpcyBleHBhbmRlZCBhbG9uZSBhbmQgaWYgaXQgaXMgdHJ1dGh5IHRoZW4gbGF5b3V0QnkgcGFyYW1ldGVyIGlzIGNvbnNpZGVyZWQgdG9cclxuICAgKiBwZXJmb3JtIGxheW91dCBhZnRlciBleHBhbmQuXHJcbiAgICovXHJcbiAgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbjogZnVuY3Rpb24gKG5vZGUsIHNpbmdsZSwgbGF5b3V0QnkpIHtcclxuICAgIGlmICghbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vY2hlY2sgaG93IHRoZSBwb3NpdGlvbiBvZiB0aGUgbm9kZSBpcyBjaGFuZ2VkXHJcbiAgICB2YXIgcG9zaXRpb25EaWZmID0ge1xyXG4gICAgICB4OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggLSBub2RlLl9wcml2YXRlLmRhdGFbJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZSddLngsXHJcbiAgICAgIHk6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSAtIG5vZGUuX3ByaXZhdGUuZGF0YVsncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJ10ueVxyXG4gICAgfTtcclxuXHJcbiAgICBub2RlLnJlbW92ZURhdGEoXCJpbmZvTGFiZWxcIik7XHJcbiAgICBub2RlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcclxuXHJcbiAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5iZWZvcmVleHBhbmRcIik7XHJcbiAgICB2YXIgcmVzdG9yZWROb2RlcyA9IG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbjtcclxuICAgIHJlc3RvcmVkTm9kZXMucmVzdG9yZSgpO1xyXG4gICAgdmFyIHBhcmVudERhdGEgPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGE7XHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcmVzdG9yZWROb2Rlcy5sZW5ndGg7IGkrKyl7XHJcbiAgICAgIGRlbGV0ZSBwYXJlbnREYXRhW3Jlc3RvcmVkTm9kZXNbaV0uaWQoKV07XHJcbiAgICB9XHJcbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGEgPSBwYXJlbnREYXRhO1xyXG4gICAgdGhpcy5yZXBhaXJFZGdlcyhub2RlKTtcclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IG51bGw7XHJcblxyXG4gICAgZWxlbWVudFV0aWxpdGllcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBub2RlLmNoaWxkcmVuKCkpO1xyXG4gICAgbm9kZS5yZW1vdmVEYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKTtcclxuXHJcbiAgICBub2RlLnRyaWdnZXIoXCJwb3NpdGlvblwiKTsgLy8gcG9zaXRpb24gbm90IHRyaWdnZXJlZCBieSBkZWZhdWx0IHdoZW4gbm9kZXMgYXJlIG1vdmVkXHJcbiAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZFwiKTtcclxuXHJcbiAgICAvLyBJZiBleHBhbmQgaXMgY2FsbGVkIGp1c3QgZm9yIG9uZSBub2RlIHRoZW4gY2FsbCBlbmQgb3BlcmF0aW9uIHRvIHBlcmZvcm0gbGF5b3V0XHJcbiAgICBpZiAoc2luZ2xlKSB7XHJcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKGxheW91dEJ5LCBub2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8qXHJcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gY29sbGFwc2UgZ2l2ZW4gbm9kZXMgaW4gYSBzaW1wbGUgd2F5IChXaXRob3V0IHBlcmZvcm1pbmcgbGF5b3V0IGFmdGVyd2FyZClcclxuICAgKiBJdCBjb2xsYXBzZXMgYWxsIHJvb3Qgbm9kZXMgYm90dG9tIHVwLlxyXG4gICAqL1xyXG4gIHNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzKSB7Ly8qLy9cclxuICAgIG5vZGVzLmRhdGEoXCJjb2xsYXBzZVwiLCB0cnVlKTtcclxuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcclxuICAgICAgXHJcbiAgICAgIC8vIENvbGxhcHNlIHRoZSBub2RlcyBpbiBib3R0b20gdXAgb3JkZXJcclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKHJvb3QpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEEgaGVscGVyIGZ1bmN0aW9uIHRvIGV4cGFuZCBnaXZlbiBub2RlcyBpbiBhIHNpbXBsZSB3YXkgKFdpdGhvdXQgcGVyZm9ybWluZyBsYXlvdXQgYWZ0ZXJ3YXJkKVxyXG4gICAqIEl0IGV4cGFuZHMgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duLlxyXG4gICAqL1xyXG4gIHNpbXBsZUV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuICAgIG5vZGVzLmRhdGEoXCJleHBhbmRcIiwgdHJ1ZSk7IC8vIE1hcmsgdGhhdCB0aGUgbm9kZXMgYXJlIHN0aWxsIHRvIGJlIGV4cGFuZGVkXHJcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7IC8vIEZvciBlYWNoIHJvb3Qgbm9kZSBleHBhbmQgdG9wIGRvd25cclxuICAgIH1cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogRXhwYW5kcyBhbGwgbm9kZXMgYnkgZXhwYW5kaW5nIGFsbCB0b3AgbW9zdCBub2RlcyB0b3AgZG93biB3aXRoIHRoZWlyIGRlc2NlbmRhbnRzLlxyXG4gICAqL1xyXG4gIHNpbXBsZUV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcbiAgICBpZiAobm9kZXMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBub2RlcyA9IGN5Lm5vZGVzKCk7XHJcbiAgICB9XHJcbiAgICB2YXIgb3JwaGFucztcclxuICAgIG9ycGhhbnMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICB2YXIgZXhwYW5kU3RhY2sgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IG9ycGhhbnNbaV07XHJcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGV4cGFuZFN0YWNrO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBUaGUgb3BlcmF0aW9uIHRvIGJlIHBlcmZvcm1lZCBhZnRlciBleHBhbmQvY29sbGFwc2UuIEl0IHJlYXJyYW5nZSBub2RlcyBieSBsYXlvdXRCeSBwYXJhbWV0ZXIuXHJcbiAgICovXHJcbiAgZW5kT3BlcmF0aW9uOiBmdW5jdGlvbiAobGF5b3V0QnksIG5vZGVzKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjeS5yZWFkeShmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZWxlbWVudFV0aWxpdGllcy5yZWFycmFuZ2UobGF5b3V0QnkpO1xyXG4gICAgICAgIGlmKGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQpe1xyXG4gICAgICAgICAgbm9kZXMuc2VsZWN0aWZ5KCk7XHJcbiAgICAgICAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnNlbGVjdGFibGVDaGFuZ2VkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LCAwKTtcclxuICAgICAgXHJcbiAgICB9KTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogQ2FsbHMgc2ltcGxlIGV4cGFuZEFsbE5vZGVzLiBUaGVuIHBlcmZvcm1zIGVuZCBvcGVyYXRpb24uXHJcbiAgICovXHJcbiAgZXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXHJcbiAgICB2YXIgZXhwYW5kZWRTdGFjayA9IHRoaXMuc2ltcGxlRXhwYW5kQWxsTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XHJcblxyXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gZXhwYW5kZWRTdGFjaztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogRXhwYW5kcyB0aGUgcm9vdCBhbmQgaXRzIGNvbGxhcHNlZCBkZXNjZW5kZW50cyBpbiB0b3AgZG93biBvcmRlci5cclxuICAgKi9cclxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcbiAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgZXhwYW5kU3RhY2sucHVzaChyb290KTtcclxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKG5vZGUsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL0V4cGFuZCB0aGUgZ2l2ZW4gbm9kZXMgcGVyZm9ybSBlbmQgb3BlcmF0aW9uIGFmdGVyIGV4cGFuZGF0aW9uXHJcbiAgZXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7XHJcbiAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHRvIGV4cGFuZCB3ZSBuZWVkIHRvIGFuaW1hdGUgZm9yIGZpc2hleWUgdmlldywgYnV0IGlmIHRoZXJlIGFyZSBtb3JlIHRoZW4gb25lIG5vZGUgd2UgZG8gbm90XHJcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgbm9kZSA9IG5vZGVzWzBdO1xyXG4gICAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgICAvLyBFeHBhbmQgdGhlIGdpdmVuIG5vZGUgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhhdCB0aGUgbm9kZSBpcyBzaW1wbGUgd2hpY2ggZW5zdXJlcyB0aGF0IGZpc2hleWUgcGFyYW1ldGVyIHdpbGwgYmUgY29uc2lkZXJlZFxyXG4gICAgICAgIHRoaXMuZXhwYW5kTm9kZShub2RlLCBvcHRpb25zLmZpc2hleWUsIHRydWUsIG9wdGlvbnMuYW5pbWF0ZSwgb3B0aW9ucy5sYXlvdXRCeSwgb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgIH0gXHJcbiAgICBlbHNlIHtcclxuICAgICAgLy8gRmlyc3QgZXhwYW5kIGdpdmVuIG5vZGVzIGFuZCB0aGVuIHBlcmZvcm0gbGF5b3V0IGFjY29yZGluZyB0byB0aGUgbGF5b3V0QnkgcGFyYW1ldGVyXHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gbm9kZXM7XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlcyB0aGVuIHBlcmZvcm0gZW5kIG9wZXJhdGlvblxyXG4gIGNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7XHJcbiAgICAvKlxyXG4gICAgICogSW4gY29sbGFwc2Ugb3BlcmF0aW9uIHRoZXJlIGlzIG5vIGZpc2hleWUgdmlldyB0byBiZSBhcHBsaWVkIHNvIHRoZXJlIGlzIG5vIGFuaW1hdGlvbiB0byBiZSBkZXN0cm95ZWQgaGVyZS4gV2UgY2FuIGRvIHRoaXMgXHJcbiAgICAgKiBpbiBhIGJhdGNoLlxyXG4gICAgICovIFxyXG4gICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgdGhpcy5zaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXMobm9kZXMvKiwgb3B0aW9ucyovKTtcclxuICAgIGN5LmVuZEJhdGNoKCk7XHJcblxyXG4gICAgbm9kZXMudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBjb2xsYXBzZU5vZGUgaXMgY2FsbGVkXHJcbiAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XHJcblxyXG4gICAgLy8gVXBkYXRlIHRoZSBzdHlsZVxyXG4gICAgY3kuc3R5bGUoKS51cGRhdGUoKTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcclxuICBjb2xsYXBzZUJvdHRvbVVwOiBmdW5jdGlvbiAocm9vdCkge1xyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAobm9kZSk7XHJcbiAgICB9XHJcbiAgICAvL0lmIHRoZSByb290IGlzIGEgY29tcG91bmQgbm9kZSB0byBiZSBjb2xsYXBzZWQgdGhlbiBjb2xsYXBzZSBpdFxyXG4gICAgaWYgKHJvb3QuZGF0YShcImNvbGxhcHNlXCIpICYmIHJvb3QuY2hpbGRyZW4oKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHRoaXMuY29sbGFwc2VOb2RlKHJvb3QpO1xyXG4gICAgICByb290LnJlbW92ZURhdGEoXCJjb2xsYXBzZVwiKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vZXhwYW5kIHRoZSBub2RlcyBpbiB0b3AgZG93biBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XHJcbiAgZXhwYW5kVG9wRG93bjogZnVuY3Rpb24gKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcbiAgICBpZiAocm9vdC5kYXRhKFwiZXhwYW5kXCIpICYmIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIC8vIEV4cGFuZCB0aGUgcm9vdCBhbmQgdW5tYXJrIGl0cyBleHBhbmQgZGF0YSB0byBzcGVjaWZ5IHRoYXQgaXQgaXMgbm8gbW9yZSB0byBiZSBleHBhbmRlZFxyXG4gICAgICB0aGlzLmV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgICByb290LnJlbW92ZURhdGEoXCJleHBhbmRcIik7XHJcbiAgICB9XHJcbiAgICAvLyBNYWtlIGEgcmVjdXJzaXZlIGNhbGwgZm9yIGNoaWxkcmVuIG9mIHJvb3RcclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKG5vZGUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy8gQ29udmVyc3QgdGhlIHJlbmRlcmVkIHBvc2l0aW9uIHRvIG1vZGVsIHBvc2l0aW9uIGFjY29yZGluZyB0byBnbG9iYWwgcGFuIGFuZCB6b29tIHZhbHVlc1xyXG4gIGNvbnZlcnRUb01vZGVsUG9zaXRpb246IGZ1bmN0aW9uIChyZW5kZXJlZFBvc2l0aW9uKSB7XHJcbiAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICB2YXIgeCA9IChyZW5kZXJlZFBvc2l0aW9uLnggLSBwYW4ueCkgLyB6b29tO1xyXG4gICAgdmFyIHkgPSAocmVuZGVyZWRQb3NpdGlvbi55IC0gcGFuLnkpIC8gem9vbTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB4LFxyXG4gICAgICB5OiB5XHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBUaGlzIG1ldGhvZCBleHBhbmRzIHRoZSBnaXZlbiBub2RlLiBJdCBjb25zaWRlcnMgYXBwbHlGaXNoRXllVmlldywgYW5pbWF0ZSBhbmQgbGF5b3V0QnkgcGFyYW1ldGVycy5cclxuICAgKiBJdCBhbHNvIGNvbnNpZGVycyBzaW5nbGUgcGFyYW1ldGVyIHdoaWNoIGluZGljYXRlcyBpZiB0aGlzIG5vZGUgaXMgZXhwYW5kZWQgYWxvbmUuIElmIHRoaXMgcGFyYW1ldGVyIGlzIHRydXRoeSBhbG9uZyB3aXRoIFxyXG4gICAqIGFwcGx5RmlzaEV5ZVZpZXcgcGFyYW1ldGVyIHRoZW4gdGhlIHN0YXRlIG9mIHZpZXcgcG9ydCBpcyB0byBiZSBjaGFuZ2VkIHRvIGhhdmUgZXh0cmEgc3BhY2Ugb24gdGhlIHNjcmVlbiAoaWYgbmVlZGVkKSBiZWZvcmUgYXBwbGl5aW5nIHRoZVxyXG4gICAqIGZpc2hleWUgdmlldy5cclxuICAgKi9cclxuICBleHBhbmROb2RlOiBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIFxyXG4gICAgdmFyIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xyXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlldykge1xyXG5cclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gPSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udztcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmg7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRmlzaGV5ZSB2aWV3IGV4cGFuZCB0aGUgbm9kZS5cclxuICAgICAgICAvLyBUaGUgZmlyc3QgcGFyYW10ZXIgaW5kaWNhdGVzIHRoZSBub2RlIHRvIGFwcGx5IGZpc2hleWUgdmlldywgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhlIG5vZGVcclxuICAgICAgICAvLyB0byBiZSBleHBhbmRlZCBhZnRlciBmaXNoZXllIHZpZXcgaXMgYXBwbGllZC5cclxuICAgICAgICBzZWxmLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUsIHNpbmdsZSwgbm9kZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gSWYgb25lIG9mIHRoZXNlIHBhcmFtZXRlcnMgaXMgdHJ1dGh5IGl0IG1lYW5zIHRoYXQgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbiBpcyBhbHJlYWR5IHRvIGJlIGNhbGxlZC5cclxuICAgICAgLy8gSG93ZXZlciBpZiBub25lIG9mIHRoZW0gaXMgdHJ1dGh5IHdlIG5lZWQgdG8gY2FsbCBpdCBoZXJlLlxyXG4gICAgICBpZiAoIXNpbmdsZSB8fCAhYXBwbHlGaXNoRXllVmlldyB8fCAhYW5pbWF0ZSkge1xyXG4gICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlLCBzaW5nbGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUpO1xyXG4gICAgICB2YXIgYW5pbWF0aW5nID0gZmFsc2U7IC8vIFZhcmlhYmxlIHRvIGNoZWNrIGlmIHRoZXJlIGlzIGEgY3VycmVudCBhbmltYXRpb24sIGlmIHRoZXJlIGlzIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbmltYXRpb25cclxuICAgICAgXHJcbiAgICAgIC8vIElmIHRoZSBub2RlIGlzIHRoZSBvbmx5IG5vZGUgdG8gZXhwYW5kIGFuZCBmaXNoZXllIHZpZXcgc2hvdWxkIGJlIGFwcGxpZWQsIHRoZW4gY2hhbmdlIHRoZSBzdGF0ZSBvZiB2aWV3cG9ydCBcclxuICAgICAgLy8gdG8gY3JlYXRlIG1vcmUgc3BhY2Ugb24gc2NyZWVuIChJZiBuZWVkZWQpXHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3ICYmIHNpbmdsZSkge1xyXG4gICAgICAgIHZhciB0b3BMZWZ0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IDAsIHk6IDB9KTtcclxuICAgICAgICB2YXIgYm90dG9tUmlnaHRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogY3kud2lkdGgoKSwgeTogY3kuaGVpZ2h0KCl9KTtcclxuICAgICAgICB2YXIgcGFkZGluZyA9IDgwO1xyXG4gICAgICAgIHZhciBiYiA9IHtcclxuICAgICAgICAgIHgxOiB0b3BMZWZ0UG9zaXRpb24ueCxcclxuICAgICAgICAgIHgyOiBib3R0b21SaWdodFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB5MTogdG9wTGVmdFBvc2l0aW9uLnksXHJcbiAgICAgICAgICB5MjogYm90dG9tUmlnaHRQb3NpdGlvbi55XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIG5vZGVCQiA9IHtcclxuICAgICAgICAgIHgxOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggLSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udyAvIDIgLSBwYWRkaW5nLFxyXG4gICAgICAgICAgeDI6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCArIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53IC8gMiArIHBhZGRpbmcsXHJcbiAgICAgICAgICB5MTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmggLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHkyOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgKyBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaCAvIDIgKyBwYWRkaW5nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVuaW9uQkIgPSBib3VuZGluZ0JveFV0aWxpdGllcy5nZXRVbmlvbihub2RlQkIsIGJiKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBJZiB0aGVzZSBiYm94ZXMgYXJlIG5vdCBlcXVhbCB0aGVuIHdlIG5lZWQgdG8gY2hhbmdlIHRoZSB2aWV3cG9ydCBzdGF0ZSAoYnkgcGFuIGFuZCB6b29tKVxyXG4gICAgICAgIGlmICghYm91bmRpbmdCb3hVdGlsaXRpZXMuZXF1YWxCb3VuZGluZ0JveGVzKHVuaW9uQkIsIGJiKSkge1xyXG4gICAgICAgICAgdmFyIHZpZXdQb3J0ID0gY3kuZ2V0Rml0Vmlld3BvcnQodW5pb25CQiwgMTApO1xyXG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgICAgYW5pbWF0aW5nID0gYW5pbWF0ZTsgLy8gU2lnbmFsIHRoYXQgdGhlcmUgaXMgYW4gYW5pbWF0aW9uIG5vdyBhbmQgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxyXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhbmltYXRlIGR1cmluZyBwYW4gYW5kIHpvb21cclxuICAgICAgICAgIGlmIChhbmltYXRlKSB7XHJcbiAgICAgICAgICAgIGN5LmFuaW1hdGUoe1xyXG4gICAgICAgICAgICAgIHBhbjogdmlld1BvcnQucGFuLFxyXG4gICAgICAgICAgICAgIHpvb206IHZpZXdQb3J0Lnpvb20sXHJcbiAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDEwMDBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY3kuem9vbSh2aWV3UG9ydC56b29tKTtcclxuICAgICAgICAgICAgY3kucGFuKHZpZXdQb3J0LnBhbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiBhbmltYXRpbmcgaXMgbm90IHRydWUgd2UgbmVlZCB0byBjYWxsIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiBoZXJlXHJcbiAgICAgIGlmICghYW5pbWF0aW5nKSB7XHJcbiAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZSB3aXRob3V0IHBlcmZvcm1pbmcgZW5kIG9wZXJhdGlvblxyXG4gIGNvbGxhcHNlTm9kZTogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScsIHtcclxuICAgICAgICB4OiBub2RlLnBvc2l0aW9uKCkueCxcclxuICAgICAgICB5OiBub2RlLnBvc2l0aW9uKCkueVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnLCB7XHJcbiAgICAgICAgdzogbm9kZS5vdXRlcldpZHRoKCksXHJcbiAgICAgICAgaDogbm9kZS5vdXRlckhlaWdodCgpXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG5cclxuICAgICAgY2hpbGRyZW4udW5zZWxlY3QoKTtcclxuICAgICAgY2hpbGRyZW4uY29ubmVjdGVkRWRnZXMoKS51bnNlbGVjdCgpO1xyXG5cclxuICAgICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYmVmb3JlY29sbGFwc2VcIik7XHJcbiAgICAgIFxyXG4gICAgICB0aGlzLmJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbihub2RlKTtcclxuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihub2RlLCBub2RlKTtcclxuICAgICAgbm9kZS5hZGRDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcblxyXG4gICAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlXCIpO1xyXG4gICAgICBcclxuICAgICAgbm9kZS5wb3NpdGlvbihub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpKTtcclxuXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIHN0b3JlV2lkdGhIZWlnaHQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIGlmIChub2RlICE9IG51bGwpIHtcclxuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSA9IHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUub3V0ZXJXaWR0aCgpO1xyXG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5vdXRlckhlaWdodCgpO1xyXG5cclxuICAgICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlLnBhcmVudCgpWzBdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9LFxyXG4gIC8qXHJcbiAgICogQXBwbHkgZmlzaGV5ZSB2aWV3IHRvIHRoZSBnaXZlbiBub2RlLiBub2RlVG9FeHBhbmQgd2lsbCBiZSBleHBhbmRlZCBhZnRlciB0aGUgb3BlcmF0aW9uLiBcclxuICAgKiBUaGUgb3RoZXIgcGFyYW1ldGVyIGFyZSB0byBiZSBwYXNzZWQgYnkgcGFyYW1ldGVycyBkaXJlY3RseSBpbiBpbnRlcm5hbCBmdW5jdGlvbiBjYWxscy5cclxuICAgKi9cclxuICBmaXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZTogZnVuY3Rpb24gKG5vZGUsIHNpbmdsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuICAgIHZhciBzaWJsaW5ncyA9IHRoaXMuZ2V0U2libGluZ3Mobm9kZSk7XHJcblxyXG4gICAgdmFyIHhfYSA9IHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcbiAgICB2YXIgeV9hID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuXHJcbiAgICB2YXIgZF94X2xlZnQgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XHJcbiAgICB2YXIgZF94X3JpZ2h0ID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeV91cHBlciA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeV9sb3dlciA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xyXG5cclxuICAgIHZhciBhYnNfZGlmZl9vbl94ID0gTWF0aC5hYnMobm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gLSB4X2EpO1xyXG4gICAgdmFyIGFic19kaWZmX29uX3kgPSBNYXRoLmFicyhub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSAtIHlfYSk7XHJcblxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gTEVGVFxyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddID4geF9hKSB7XHJcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgKyBhYnNfZGlmZl9vbl94O1xyXG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgLSBhYnNfZGlmZl9vbl94O1xyXG4gICAgfVxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gUklHSFRcclxuICAgIGVsc2Uge1xyXG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0IC0gYWJzX2RpZmZfb25feDtcclxuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0ICsgYWJzX2RpZmZfb25feDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBVUFxyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddID4geV9hKSB7XHJcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciArIGFic19kaWZmX29uX3k7XHJcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciAtIGFic19kaWZmX29uX3k7XHJcbiAgICB9XHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBET1dOXHJcbiAgICBlbHNlIHtcclxuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyIC0gYWJzX2RpZmZfb25feTtcclxuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyICsgYWJzX2RpZmZfb25feTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgeFBvc0luUGFyZW50U2libGluZyA9IFtdO1xyXG4gICAgdmFyIHlQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHhQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnhQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XHJcbiAgICAgIHlQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnlQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgc2libGluZyA9IHNpYmxpbmdzW2ldO1xyXG5cclxuICAgICAgdmFyIHhfYiA9IHhQb3NJblBhcmVudFNpYmxpbmdbaV07XHJcbiAgICAgIHZhciB5X2IgPSB5UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xyXG5cclxuICAgICAgdmFyIHNsb3BlID0gKHlfYiAtIHlfYSkgLyAoeF9iIC0geF9hKTtcclxuXHJcbiAgICAgIHZhciBkX3ggPSAwO1xyXG4gICAgICB2YXIgZF95ID0gMDtcclxuICAgICAgdmFyIFRfeCA9IDA7XHJcbiAgICAgIHZhciBUX3kgPSAwO1xyXG5cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMRUZUXHJcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcclxuICAgICAgICBkX3ggPSBkX3hfbGVmdDtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFJJR0hUXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGRfeCA9IGRfeF9yaWdodDtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFVQUEVSIHNpZGVcclxuICAgICAgaWYgKHlfYSA+IHlfYikge1xyXG4gICAgICAgIGRfeSA9IGRfeV91cHBlcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExPV0VSIHNpZGVcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZF95ID0gZF95X2xvd2VyO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaXNGaW5pdGUoc2xvcGUpKSB7XHJcbiAgICAgICAgVF94ID0gTWF0aC5taW4oZF94LCAoZF95IC8gTWF0aC5hYnMoc2xvcGUpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzbG9wZSAhPT0gMCkge1xyXG4gICAgICAgIFRfeSA9IE1hdGgubWluKGRfeSwgKGRfeCAqIE1hdGguYWJzKHNsb3BlKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoeF9hID4geF9iKSB7XHJcbiAgICAgICAgVF94ID0gLTEgKiBUX3g7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcclxuICAgICAgICBUX3kgPSAtMSAqIFRfeTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gTW92ZSB0aGUgc2libGluZyBpbiB0aGUgc3BlY2lhbCB3YXlcclxuICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKHNpYmxpbmcsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiB0aGVyZSBpcyBubyBzaWJsaW5nIGNhbGwgZXhwYW5kIG5vZGUgYmFzZSBmdW5jdGlvbiBoZXJlIGVsc2UgaXQgaXMgdG8gYmUgY2FsbGVkIG9uZSBvZiBmaXNoRXllVmlld01vdmVOb2RlKCkgY2FsbHNcclxuICAgIGlmIChzaWJsaW5ncy5sZW5ndGggPT0gMCkge1xyXG4gICAgICB0aGlzLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGUsIGxheW91dEJ5KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XHJcbiAgICAgIC8vIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgcGFyZW50IG5vZGUgYXMgd2VsbCAoIElmIGV4aXN0cyApXHJcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZS5wYXJlbnQoKVswXSwgc2luZ2xlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfSxcclxuICBnZXRTaWJsaW5nczogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgIHZhciBzaWJsaW5ncztcclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSA9PSBudWxsKSB7XHJcbiAgICAgIHZhciBvcnBoYW5zID0gY3kubm9kZXMoXCI6dmlzaWJsZVwiKS5vcnBoYW5zKCk7XHJcbiAgICAgIHNpYmxpbmdzID0gb3JwaGFucy5kaWZmZXJlbmNlKG5vZGUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2libGluZ3MgPSBub2RlLnNpYmxpbmdzKFwiOnZpc2libGVcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNpYmxpbmdzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBNb3ZlIG5vZGUgb3BlcmF0aW9uIHNwZWNpYWxpemVkIGZvciBmaXNoIGV5ZSB2aWV3IGV4cGFuZCBvcGVyYXRpb25cclxuICAgKiBNb3ZlcyB0aGUgbm9kZSBieSBtb3ZpbmcgaXRzIGRlc2NhbmRlbnRzLiBNb3ZlbWVudCBpcyBhbmltYXRlZCBpZiBib3RoIHNpbmdsZSBhbmQgYW5pbWF0ZSBmbGFncyBhcmUgdHJ1dGh5LlxyXG4gICAqL1xyXG4gIGZpc2hFeWVWaWV3TW92ZU5vZGU6IGZ1bmN0aW9uIChub2RlLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xyXG4gICAgdmFyIGNoaWxkcmVuTGlzdCA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgIGlmKG5vZGUuaXNQYXJlbnQoKSl7XHJcbiAgICAgICBjaGlsZHJlbkxpc3QgPSBub2RlLmNoaWxkcmVuKFwiOnZpc2libGVcIik7XHJcbiAgICB9XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBcclxuICAgIC8qXHJcbiAgICAgKiBJZiB0aGUgbm9kZSBpcyBzaW1wbGUgbW92ZSBpdHNlbGYgZGlyZWN0bHkgZWxzZSBtb3ZlIGl0IGJ5IG1vdmluZyBpdHMgY2hpbGRyZW4gYnkgYSBzZWxmIHJlY3Vyc2l2ZSBjYWxsXHJcbiAgICAgKi9cclxuICAgIGlmIChjaGlsZHJlbkxpc3QubGVuZ3RoID09IDApIHtcclxuICAgICAgdmFyIG5ld1Bvc2l0aW9uID0ge3g6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCArIFRfeCwgeTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ICsgVF95fTtcclxuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggPSBuZXdQb3NpdGlvbi54O1xyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSA9IG5ld1Bvc2l0aW9uLnk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgdGhpcy5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50Kys7XHJcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcclxuICAgICAgICAgIHBvc2l0aW9uOiBuZXdQb3NpdGlvbixcclxuICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xyXG4gICAgICAgICAgICBpZiAoc2VsZi5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50ID4gMCB8fCAhbm9kZVRvRXhwYW5kLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKSkge1xyXG5cclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIElmIGFsbCBub2RlcyBhcmUgbW92ZWQgd2UgYXJlIHJlYWR5IHRvIGV4cGFuZCBzbyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb25cclxuICAgICAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBsYXlvdXRCeSk7XHJcblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25EdXJhdGlvbiB8fCAxMDAwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShjaGlsZHJlbkxpc3RbaV0sIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgeFBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xyXG4gICAgdmFyIHhfYSA9IDAuMDtcclxuXHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICB4X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3gnKSArIChwYXJlbnQud2lkdGgoKSAvIDIpO1xyXG4gICAgfVxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeF9hID0gbm9kZS5wb3NpdGlvbigneCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB4X2E7XHJcbiAgfSxcclxuICB5UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XHJcblxyXG4gICAgdmFyIHlfYSA9IDAuMDtcclxuXHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICB5X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3knKSArIChwYXJlbnQuaGVpZ2h0KCkgLyAyKTtcclxuICAgIH1cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHlfYSA9IG5vZGUucG9zaXRpb24oJ3knKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geV9hO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBmb3IgYWxsIGNoaWxkcmVuIG9mIHRoZSBub2RlIHBhcmFtZXRlciBjYWxsIHRoaXMgbWV0aG9kXHJcbiAgICogd2l0aCB0aGUgc2FtZSByb290IHBhcmFtZXRlcixcclxuICAgKiByZW1vdmUgdGhlIGNoaWxkIGFuZCBhZGQgdGhlIHJlbW92ZWQgY2hpbGQgdG8gdGhlIGNvbGxhcHNlZGNoaWxkcmVuIGRhdGFcclxuICAgKiBvZiB0aGUgcm9vdCB0byByZXN0b3JlIHRoZW0gaW4gdGhlIGNhc2Ugb2YgZXhwYW5kYXRpb25cclxuICAgKiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4ga2VlcHMgdGhlIG5vZGVzIHRvIHJlc3RvcmUgd2hlbiB0aGVcclxuICAgKiByb290IGlzIGV4cGFuZGVkXHJcbiAgICovXHJcbiAgcmVtb3ZlQ2hpbGRyZW46IGZ1bmN0aW9uIChub2RlLCByb290KSB7XHJcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKGNoaWxkLCByb290KTtcclxuICAgICAgdmFyIHBhcmVudERhdGEgPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGE7XHJcbiAgICAgIHBhcmVudERhdGFbY2hpbGQuaWQoKV0gPSBjaGlsZC5wYXJlbnQoKTtcclxuICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhID0gcGFyZW50RGF0YTtcclxuICAgICAgdmFyIHJlbW92ZWRDaGlsZCA9IGNoaWxkLnJlbW92ZSgpO1xyXG4gICAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkQ2hpbGQ7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHJlbW92ZWRDaGlsZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGlzTWV0YUVkZ2U6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIHJldHVybiBlZGdlLmhhc0NsYXNzKFwiY3ktZXhwYW5kLWNvbGxhcHNlLW1ldGEtZWRnZVwiKTtcclxuICB9LFxyXG4gIGJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbjogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgdmFyIHJlbGF0ZWROb2RlcyA9IG5vZGUuZGVzY2VuZGFudHMoKTtcclxuICAgIHZhciBlZGdlcyA9IHJlbGF0ZWROb2Rlcy5lZGdlc1dpdGgoY3kubm9kZXMoKS5ub3QocmVsYXRlZE5vZGVzLnVuaW9uKG5vZGUpKSk7XHJcbiAgICBcclxuICAgIHZhciByZWxhdGVkTm9kZU1hcCA9IHt9O1xyXG4gICAgXHJcbiAgICByZWxhdGVkTm9kZXMuZWFjaChmdW5jdGlvbihlbGUsIGkpIHtcclxuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIGVsZSA9IGk7XHJcbiAgICAgIH1cclxuICAgICAgcmVsYXRlZE5vZGVNYXBbZWxlLmlkKCldID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS50YXJnZXQoKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghdGhpcy5pc01ldGFFZGdlKGVkZ2UpKSB7IC8vIGlzIG9yaWdpbmFsXHJcbiAgICAgICAgdmFyIG9yaWdpbmFsRW5kc0RhdGEgPSB7XHJcbiAgICAgICAgICBzb3VyY2U6IHNvdXJjZSxcclxuICAgICAgICAgIHRhcmdldDogdGFyZ2V0XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICBlZGdlLmFkZENsYXNzKFwiY3ktZXhwYW5kLWNvbGxhcHNlLW1ldGEtZWRnZVwiKTtcclxuICAgICAgICBlZGdlLmRhdGEoJ29yaWdpbmFsRW5kcycsIG9yaWdpbmFsRW5kc0RhdGEpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBlZGdlLm1vdmUoe1xyXG4gICAgICAgIHRhcmdldDogIXJlbGF0ZWROb2RlTWFwW3RhcmdldC5pZCgpXSA/IHRhcmdldC5pZCgpIDogbm9kZS5pZCgpLFxyXG4gICAgICAgIHNvdXJjZTogIXJlbGF0ZWROb2RlTWFwW3NvdXJjZS5pZCgpXSA/IHNvdXJjZS5pZCgpIDogbm9kZS5pZCgpXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZmluZE5ld0VuZDogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgdmFyIGN1cnJlbnQgPSBub2RlO1xyXG4gICAgdmFyIHBhcmVudERhdGEgPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGE7XHJcbiAgICB2YXIgcGFyZW50ID0gcGFyZW50RGF0YVtjdXJyZW50LmlkKCldO1xyXG4gICAgXHJcbiAgICB3aGlsZSggIWN1cnJlbnQuaW5zaWRlKCkgKSB7XHJcbiAgICAgIGN1cnJlbnQgPSBwYXJlbnQ7XHJcbiAgICAgIHBhcmVudCA9IHBhcmVudERhdGFbcGFyZW50LmlkKCldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gY3VycmVudDtcclxuICB9LFxyXG4gIHJlcGFpckVkZ2VzOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgY29ubmVjdGVkTWV0YUVkZ2VzID0gbm9kZS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcclxuICAgIFxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25uZWN0ZWRNZXRhRWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVkZ2UgPSBjb25uZWN0ZWRNZXRhRWRnZXNbaV07XHJcbiAgICAgIHZhciBvcmlnaW5hbEVuZHMgPSBlZGdlLmRhdGEoJ29yaWdpbmFsRW5kcycpO1xyXG4gICAgICB2YXIgY3VycmVudFNyY0lkID0gZWRnZS5kYXRhKCdzb3VyY2UnKTtcclxuICAgICAgdmFyIGN1cnJlbnRUZ3RJZCA9IGVkZ2UuZGF0YSgndGFyZ2V0Jyk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIGN1cnJlbnRTcmNJZCA9PT0gbm9kZS5pZCgpICkge1xyXG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUoe1xyXG4gICAgICAgICAgc291cmNlOiB0aGlzLmZpbmROZXdFbmQob3JpZ2luYWxFbmRzLnNvdXJjZSkuaWQoKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUoe1xyXG4gICAgICAgICAgdGFyZ2V0OiB0aGlzLmZpbmROZXdFbmQob3JpZ2luYWxFbmRzLnRhcmdldCkuaWQoKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIGVkZ2UuZGF0YSgnc291cmNlJykgPT09IG9yaWdpbmFsRW5kcy5zb3VyY2UuaWQoKSAmJiBlZGdlLmRhdGEoJ3RhcmdldCcpID09PSBvcmlnaW5hbEVuZHMudGFyZ2V0LmlkKCkgKSB7XHJcbiAgICAgICAgZWRnZS5yZW1vdmVDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLW1ldGEtZWRnZScpO1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlRGF0YSgnb3JpZ2luYWxFbmRzJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIC8qbm9kZSBpcyBhbiBvdXRlciBub2RlIG9mIHJvb3RcclxuICAgaWYgcm9vdCBpcyBub3QgaXQncyBhbmNoZXN0b3JcclxuICAgYW5kIGl0IGlzIG5vdCB0aGUgcm9vdCBpdHNlbGYqL1xyXG4gIGlzT3V0ZXJOb2RlOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkgey8vKi8vXHJcbiAgICB2YXIgdGVtcCA9IG5vZGU7XHJcbiAgICB3aGlsZSAodGVtcCAhPSBudWxsKSB7XHJcbiAgICAgIGlmICh0ZW1wID09IHJvb3QpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgdGVtcCA9IHRlbXAucGFyZW50KClbMF07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9LFxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgY29sbGFwc2VkIGNoaWxkcmVuIC0gaW5jbHVkaW5nIG5lc3RlZCBvbmVzXHJcbiAgICogQHBhcmFtIG5vZGUgOiBhIGNvbGxhcHNlZCBub2RlXHJcbiAgICogQHBhcmFtIGNvbGxhcHNlZENoaWxkcmVuIDogYSBjb2xsZWN0aW9uIHRvIHN0b3JlIHRoZSByZXN1bHRcclxuICAgKiBAcmV0dXJuIDogY29sbGFwc2VkIGNoaWxkcmVuXHJcbiAgICovXHJcbiAgZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseTogZnVuY3Rpb24obm9kZSwgY29sbGFwc2VkQ2hpbGRyZW4pe1xyXG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpIHx8IFtdO1xyXG4gICAgdmFyIGk7XHJcbiAgICBmb3IgKGk9MDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKXtcclxuICAgICAgaWYgKGNoaWxkcmVuW2ldLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJykpe1xyXG4gICAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24odGhpcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KGNoaWxkcmVuW2ldLCBjb2xsYXBzZWRDaGlsZHJlbikpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24oY2hpbGRyZW5baV0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNvbGxhcHNlZENoaWxkcmVuO1xyXG4gIH0sXHJcbiAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gc3RhcnQgc2VjdGlvbiBlZGdlIGV4cGFuZCBjb2xsYXBzZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xyXG4gIGNvbGxhcHNlR2l2ZW5FZGdlczogZnVuY3Rpb24gKGVkZ2VzLCBvcHRpb25zKSB7XHJcbiAgICBlZGdlcy51bnNlbGVjdCgpO1xyXG4gICAgdmFyIG5vZGVzID0gZWRnZXMuY29ubmVjdGVkTm9kZXMoKTtcclxuICAgIHZhciBlZGdlc1RvQ29sbGFwc2UgPSB7fTtcclxuICAgIC8vIGdyb3VwIGVkZ2VzIGJ5IHR5cGUgaWYgdGhpcyBvcHRpb24gaXMgc2V0IHRvIHRydWVcclxuICAgIGlmIChvcHRpb25zLmdyb3VwRWRnZXNPZlNhbWVUeXBlT25Db2xsYXBzZSkge1xyXG4gICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICAgICAgdmFyIGVkZ2VUeXBlID0gXCJ1bmtub3duXCI7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuZWRnZVR5cGVJbmZvICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGVkZ2VUeXBlID0gb3B0aW9ucy5lZGdlVHlwZUluZm8gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9wdGlvbnMuZWRnZVR5cGVJbmZvLmNhbGwoZWRnZSkgOiBlZGdlLmRhdGEoKVtvcHRpb25zLmVkZ2VUeXBlSW5mb107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2UuaGFzT3duUHJvcGVydHkoZWRnZVR5cGUpKSB7XHJcbiAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLmVkZ2VzID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5lZGdlcy5hZGQoZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZGlyZWN0aW9uVHlwZSA9PSBcInVuaWRpcmVjdGlvblwiICYmIChlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLnNvdXJjZSAhPSBlZGdlLnNvdXJjZSgpLmlkKCkgfHwgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS50YXJnZXQgIT0gZWRnZS50YXJnZXQoKS5pZCgpKSkge1xyXG4gICAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLmRpcmVjdGlvblR5cGUgPSBcImJpZGlyZWN0aW9uXCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHZhciBlZGdlc1ggPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICAgICAgICBlZGdlc1ggPSBlZGdlc1guYWRkKGVkZ2UpO1xyXG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXSA9IHsgZWRnZXM6IGVkZ2VzWCwgZGlyZWN0aW9uVHlwZTogXCJ1bmlkaXJlY3Rpb25cIiwgc291cmNlOiBlZGdlLnNvdXJjZSgpLmlkKCksIHRhcmdldDogZWRnZS50YXJnZXQoKS5pZCgpIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXSA9IHsgZWRnZXM6IGVkZ2VzLCBkaXJlY3Rpb25UeXBlOiBcInVuaWRpcmVjdGlvblwiLCBzb3VyY2U6IGVkZ2VzWzBdLnNvdXJjZSgpLmlkKCksIHRhcmdldDogZWRnZXNbMF0udGFyZ2V0KCkuaWQoKSB9XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS5kaXJlY3Rpb25UeXBlID09IFwidW5pZGlyZWN0aW9uXCIgJiYgKGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0uc291cmNlICE9IGVkZ2VzW2ldLnNvdXJjZSgpLmlkKCkgfHwgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS50YXJnZXQgIT0gZWRnZXNbaV0udGFyZ2V0KCkuaWQoKSkpIHtcclxuICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0uZGlyZWN0aW9uVHlwZSA9IFwiYmlkaXJlY3Rpb25cIjtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciByZXN1bHQgPSB7IGVkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCkgfVxyXG4gICAgdmFyIG5ld0VkZ2VzID0gW107XHJcbiAgICBmb3IgKGNvbnN0IGVkZ2VHcm91cFR5cGUgaW4gZWRnZXNUb0NvbGxhcHNlKSB7XHJcbiAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZWRnZXMubGVuZ3RoIDwgMikge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGVkZ2VzLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmJlZm9yZWNvbGxhcHNlZWRnZScpO1xyXG4gICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcyk7XHJcbiAgICAgIHZhciBuZXdFZGdlID0ge307XHJcbiAgICAgIG5ld0VkZ2UuZ3JvdXAgPSBcImVkZ2VzXCI7XHJcbiAgICAgIG5ld0VkZ2UuZGF0YSA9IHt9O1xyXG4gICAgICBuZXdFZGdlLmRhdGEuc291cmNlID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLnNvdXJjZTtcclxuICAgICAgbmV3RWRnZS5kYXRhLnRhcmdldCA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS50YXJnZXQ7XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5pZCA9IFwiY29sbGFwc2VkRWRnZV9cIiArIG5vZGVzWzBdLmlkKCkgKyBcIl9cIiArIG5vZGVzWzFdLmlkKCkgKyBcIl9cIiArIGVkZ2VHcm91cFR5cGUgKyBcIl9cIiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIERhdGUubm93KCkpO1xyXG4gICAgICBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMgPSBjeS5jb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgICBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcy5hZGQoZWRnZSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gdGhpcy5jaGVjazRuZXN0ZWRDb2xsYXBzZShuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgdmFyIGVkZ2VzVHlwZUZpZWxkID0gXCJlZGdlVHlwZVwiO1xyXG4gICAgICBpZiAob3B0aW9ucy5lZGdlVHlwZUluZm8gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGVkZ2VzVHlwZUZpZWxkID0gb3B0aW9ucy5lZGdlVHlwZUluZm8gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGVkZ2VUeXBlRmllbGQgOiBvcHRpb25zLmVkZ2VUeXBlSW5mbztcclxuICAgICAgfVxyXG4gICAgICBuZXdFZGdlLmRhdGFbZWRnZXNUeXBlRmllbGRdID0gZWRnZUdyb3VwVHlwZTtcclxuXHJcbiAgICAgIG5ld0VkZ2UuZGF0YVtcImRpcmVjdGlvblR5cGVcIl0gPSBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZGlyZWN0aW9uVHlwZTtcclxuICAgICAgbmV3RWRnZS5jbGFzc2VzID0gXCJjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLWVkZ2VcIjtcclxuXHJcbiAgICAgIG5ld0VkZ2VzLnB1c2gobmV3RWRnZSk7XHJcbiAgICAgIGN5LnJlbW92ZShlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZWRnZXMpO1xyXG4gICAgICBlZGdlcy50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlZWRnZScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc3VsdC5lZGdlcyA9IGN5LmFkZChuZXdFZGdlcyk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH0sXHJcblxyXG4gIGNoZWNrNG5lc3RlZENvbGxhcHNlOiBmdW5jdGlvbihlZGdlczJjb2xsYXBzZSwgb3B0aW9ucyl7XHJcbiAgICBpZiAob3B0aW9ucy5hbGxvd05lc3RlZEVkZ2VDb2xsYXBzZSkge1xyXG4gICAgICByZXR1cm4gZWRnZXMyY29sbGFwc2U7XHJcbiAgICB9XHJcbiAgICBsZXQgciA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWRnZXMyY29sbGFwc2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IGN1cnIgPSBlZGdlczJjb2xsYXBzZVtpXTtcclxuICAgICAgbGV0IGNvbGxhcHNlZEVkZ2VzID0gY3Vyci5kYXRhKCdjb2xsYXBzZWRFZGdlcycpO1xyXG4gICAgICBpZiAoY29sbGFwc2VkRWRnZXMgJiYgY29sbGFwc2VkRWRnZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHIgPSByLmFkZChjb2xsYXBzZWRFZGdlcyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgciA9IHIuYWRkKGN1cnIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcjtcclxuICB9LFxyXG5cclxuICBleHBhbmRFZGdlOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgZWRnZS51bnNlbGVjdCgpO1xyXG4gICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9XHJcbiAgICB2YXIgZWRnZXMgPSBlZGdlLmRhdGEoJ2NvbGxhcHNlZEVkZ2VzJyk7XHJcbiAgICBpZiAoZWRnZXMgIT09IHVuZGVmaW5lZCAmJiBlZGdlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGVkZ2UudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYmVmb3JlZXhwYW5kZWRnZScpO1xyXG4gICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKGVkZ2UpO1xyXG4gICAgICBjeS5yZW1vdmUoZWRnZSk7XHJcbiAgICAgIHJlc3VsdC5lZGdlcyA9IGN5LmFkZChlZGdlcyk7XHJcbiAgICAgIGVkZ2UudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmRlZGdlJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH0sXHJcblxyXG4gIC8vaWYgdGhlIGVkZ2VzIGFyZSBvbmx5IGJldHdlZW4gdHdvIG5vZGVzICh2YWxpZCBmb3IgY29sbHBhc2luZykgcmV0dXJucyB0aGUgdHdvIG5vZGVzIGVsc2UgaXQgcmV0dXJucyBmYWxzZVxyXG4gIGlzVmFsaWRFZGdlc0ZvckNvbGxhcHNlOiBmdW5jdGlvbiAoZWRnZXMpIHtcclxuICAgIHZhciBlbmRQb2ludHMgPSB0aGlzLmdldEVkZ2VzRGlzdGluY3RFbmRQb2ludHMoZWRnZXMpO1xyXG4gICAgaWYgKGVuZFBvaW50cy5sZW5ndGggIT0gMikge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZW5kUG9pbnRzO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8vcmV0dXJucyBhIGxpc3Qgb2YgZGlzdGluY3QgZW5kcG9pbnRzIG9mIGEgc2V0IG9mIGVkZ2VzLlxyXG4gIGdldEVkZ2VzRGlzdGluY3RFbmRQb2ludHM6IGZ1bmN0aW9uIChlZGdlcykge1xyXG4gICAgdmFyIGVuZFBvaW50cyA9IFtdO1xyXG4gICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgICBpZiAoIXRoaXMuY29udGFpbnNFbGVtZW50KGVuZFBvaW50cywgZWRnZS5zb3VyY2UoKSkpIHtcclxuICAgICAgICBlbmRQb2ludHMucHVzaChlZGdlLnNvdXJjZSgpKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIXRoaXMuY29udGFpbnNFbGVtZW50KGVuZFBvaW50cywgZWRnZS50YXJnZXQoKSkpIHtcclxuICAgICAgICBlbmRQb2ludHMucHVzaChlZGdlLnRhcmdldCgpKTtcclxuXHJcbiAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgcmV0dXJuIGVuZFBvaW50cztcclxuICB9LFxyXG5cclxuICAvL2Z1bmN0aW9uIHRvIGNoZWNrIGlmIGEgbGlzdCBvZiBlbGVtZW50cyBjb250YWlucyB0aGUgZ2l2ZW4gZWxlbWVudCBieSBsb29raW5nIGF0IGlkKClcclxuICBjb250YWluc0VsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50cywgZWxlbWVudCkge1xyXG4gICAgdmFyIGV4aXN0cyA9IGZhbHNlO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAoZWxlbWVudHNbaV0uaWQoKSA9PSBlbGVtZW50LmlkKCkpIHtcclxuICAgICAgICBleGlzdHMgPSB0cnVlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXhpc3RzO1xyXG4gIH1cclxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBlbmQgc2VjdGlvbiBlZGdlIGV4cGFuZCBjb2xsYXBzZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xyXG59XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcztcclxuIiwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUpIHtcclxuXHJcbiAgICBpZiAoIWN5dG9zY2FwZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciB1bmRvUmVkb1V0aWxpdGllcyA9IHJlcXVpcmUoJy4vdW5kb1JlZG9VdGlsaXRpZXMnKTtcclxuICAgIHZhciBjdWVVdGlsaXRpZXMgPSByZXF1aXJlKFwiLi9jdWVVdGlsaXRpZXNcIik7XHJcblxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBleHRlbmRCeSkge1xyXG4gICAgICB2YXIgdGVtcE9wdHMgPSB7fTtcclxuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXHJcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuXHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBleHRlbmRCeSlcclxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcclxuICAgICAgICAgIHRlbXBPcHRzW2tleV0gPSBleHRlbmRCeVtrZXldO1xyXG4gICAgICByZXR1cm4gdGVtcE9wdHM7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIGV2YWx1YXRlIHNvbWUgc3BlY2lmaWMgb3B0aW9ucyBpbiBjYXNlIG9mIHRoZXkgYXJlIHNwZWNpZmllZCBhcyBmdW5jdGlvbnMgdG8gYmUgZHluYW1pY2FsbHkgY2hhbmdlZFxyXG4gICAgZnVuY3Rpb24gZXZhbE9wdGlvbnMob3B0aW9ucykge1xyXG4gICAgICB2YXIgYW5pbWF0ZSA9IHR5cGVvZiBvcHRpb25zLmFuaW1hdGUgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmFuaW1hdGUuY2FsbCgpIDogb3B0aW9ucy5hbmltYXRlO1xyXG4gICAgICB2YXIgZmlzaGV5ZSA9IHR5cGVvZiBvcHRpb25zLmZpc2hleWUgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmZpc2hleWUuY2FsbCgpIDogb3B0aW9ucy5maXNoZXllO1xyXG4gICAgICBcclxuICAgICAgb3B0aW9ucy5hbmltYXRlID0gYW5pbWF0ZTtcclxuICAgICAgb3B0aW9ucy5maXNoZXllID0gZmlzaGV5ZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gY3JlYXRlcyBhbmQgcmV0dXJucyB0aGUgQVBJIGluc3RhbmNlIGZvciB0aGUgZXh0ZW5zaW9uXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVFeHRlbnNpb25BUEkoY3ksIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKSB7XHJcbiAgICAgIHZhciBhcGkgPSB7fTsgLy8gQVBJIHRvIGJlIHJldHVybmVkXHJcbiAgICAgIC8vIHNldCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGhhbmRsZU5ld09wdGlvbnMoIG9wdHMgKSB7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRPcHRzID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICBpZiAoIG9wdHMuY3VlRW5hYmxlZCAmJiAhY3VycmVudE9wdHMuY3VlRW5hYmxlZCApIHtcclxuICAgICAgICAgIGFwaS5lbmFibGVDdWUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoICFvcHRzLmN1ZUVuYWJsZWQgJiYgY3VycmVudE9wdHMuY3VlRW5hYmxlZCApIHtcclxuICAgICAgICAgIGFwaS5kaXNhYmxlQ3VlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBzZXQgYWxsIG9wdGlvbnMgYXQgb25jZVxyXG4gICAgICBhcGkuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG9wdHMpO1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgb3B0cyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZXh0ZW5kT3B0aW9ucyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBleHRlbmRPcHRpb25zKCBvcHRpb25zLCBvcHRzICk7XHJcbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhuZXdPcHRpb25zKTtcclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG5ld09wdGlvbnMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBzZXQgdGhlIG9wdGlvbiB3aG9zZSBuYW1lIGlzIGdpdmVuXHJcbiAgICAgIGFwaS5zZXRPcHRpb24gPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcclxuICAgICAgICB2YXIgb3B0cyA9IHt9O1xyXG4gICAgICAgIG9wdHNbIG5hbWUgXSA9IHZhbHVlO1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBleHRlbmRPcHRpb25zKCBvcHRpb25zLCBvcHRzICk7XHJcblxyXG4gICAgICAgIGhhbmRsZU5ld09wdGlvbnMobmV3T3B0aW9ucyk7XHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBuZXdPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIENvbGxlY3Rpb24gZnVuY3Rpb25zXHJcblxyXG4gICAgICAvLyBjb2xsYXBzZSBnaXZlbiBlbGVzIGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cclxuICAgICAgYXBpLmNvbGxhcHNlID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XHJcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBjb2xsYXBzZSBnaXZlbiBlbGVzIHJlY3Vyc2l2ZWx5IGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cclxuICAgICAgYXBpLmNvbGxhcHNlUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuY29sbGFwc2libGVOb2RlcyhfZWxlcyk7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XHJcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZShlbGVzLnVuaW9uKGVsZXMuZGVzY2VuZGFudHMoKSksIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGV4cGFuZCBnaXZlbiBlbGVzIGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cclxuICAgICAgYXBpLmV4cGFuZCA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZXhwYW5kIGdpdmVuIGVsZXMgcmVjdXNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5leHBhbmRSZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEFsbE5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcblxyXG4gICAgICAvLyBDb3JlIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgYWxsIGNvbGxhcHNpYmxlIG5vZGVzXHJcbiAgICAgIGFwaS5jb2xsYXBzZUFsbCA9IGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XHJcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZVJlY3Vyc2l2ZWx5KHRoaXMuY29sbGFwc2libGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBleHBhbmQgYWxsIGV4cGFuZGFibGUgbm9kZXNcclxuICAgICAgYXBpLmV4cGFuZEFsbCA9IGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XHJcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5leHBhbmRSZWN1cnNpdmVseSh0aGlzLmV4cGFuZGFibGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG5cclxuICAgICAgLy8gVXRpbGl0eSBmdW5jdGlvbnNcclxuXHJcbiAgICAgIC8vIHJldHVybnMgaWYgdGhlIGdpdmVuIG5vZGUgaXMgZXhwYW5kYWJsZVxyXG4gICAgICBhcGkuaXNFeHBhbmRhYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGNvbGxhcHNpYmxlXHJcbiAgICAgIGFwaS5pc0NvbGxhcHNpYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gIXRoaXMuaXNFeHBhbmRhYmxlKG5vZGUpICYmIG5vZGUuaXNQYXJlbnQoKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGdldCBjb2xsYXBzaWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcclxuICAgICAgYXBpLmNvbGxhcHNpYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub2RlcyA9IF9ub2RlcyA/IF9ub2RlcyA6IGN5Lm5vZGVzKCk7XHJcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgICAgIGVsZSA9IGk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gc2VsZi5pc0NvbGxhcHNpYmxlKGVsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBnZXQgZXhwYW5kYWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcclxuICAgICAgYXBpLmV4cGFuZGFibGVOb2RlcyA9IGZ1bmN0aW9uIChfbm9kZXMpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vZGVzID0gX25vZGVzID8gX25vZGVzIDogY3kubm9kZXMoKTtcclxuICAgICAgICByZXR1cm4gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcclxuICAgICAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgZWxlID0gaTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBzZWxmLmlzRXhwYW5kYWJsZShlbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgICAgLy8gR2V0IHRoZSBjaGlsZHJlbiBvZiB0aGUgZ2l2ZW4gY29sbGFwc2VkIG5vZGUgd2hpY2ggYXJlIHJlbW92ZWQgZHVyaW5nIGNvbGxhcHNlIG9wZXJhdGlvblxyXG4gICAgICBhcGkuZ2V0Q29sbGFwc2VkQ2hpbGRyZW4gPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiByZWN1cnNpdmVseSBpbmNsdWRpbmcgbmVzdGVkIGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAgICAgKiBSZXR1cm5lZCB2YWx1ZSBpbmNsdWRlcyBlZGdlcyBhbmQgbm9kZXMsIHVzZSBzZWxlY3RvciB0byBnZXQgZWRnZXMgb3Igbm9kZXNcclxuICAgICAgICogQHBhcmFtIG5vZGUgOiBhIGNvbGxhcHNlZCBub2RlXHJcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAgICAgKi9cclxuICAgICAgYXBpLmdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KG5vZGUsIGNvbGxhcHNlZENoaWxkcmVuKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8qKiBHZXQgY29sbGFwc2VkIGNoaWxkcmVuIG9mIGFsbCBjb2xsYXBzZWQgbm9kZXMgcmVjdXJzaXZlbHkgaW5jbHVkaW5nIG5lc3RlZCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICogUmV0dXJuZWQgdmFsdWUgaW5jbHVkZXMgZWRnZXMgYW5kIG5vZGVzLCB1c2Ugc2VsZWN0b3IgdG8gZ2V0IGVkZ2VzIG9yIG5vZGVzXHJcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAgICAgKi9cclxuICAgICAgYXBpLmdldEFsbENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHkgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICB2YXIgY29sbGFwc2VkTm9kZXMgPSBjeS5ub2RlcyhcIi5jeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGVcIik7XHJcbiAgICAgICAgdmFyIGo7XHJcbiAgICAgICAgZm9yIChqPTA7IGogPCBjb2xsYXBzZWROb2Rlcy5sZW5ndGg7IGorKyl7XHJcbiAgICAgICAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24odGhpcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KGNvbGxhcHNlZE5vZGVzW2pdKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcclxuICAgICAgfTtcclxuICAgICAgLy8gVGhpcyBtZXRob2QgZm9yY2VzIHRoZSB2aXN1YWwgY3VlIHRvIGJlIGNsZWFyZWQuIEl0IGlzIHRvIGJlIGNhbGxlZCBpbiBleHRyZW1lIGNhc2VzXHJcbiAgICAgIGFwaS5jbGVhclZpc3VhbEN1ZSA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICBjeS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmRpc2FibGVDdWUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY3VlRW5hYmxlZCkge1xyXG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCd1bmJpbmQnLCBjeSwgYXBpKTtcclxuICAgICAgICAgIG9wdGlvbnMuY3VlRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5lbmFibGVDdWUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgaWYgKCFvcHRpb25zLmN1ZUVuYWJsZWQpIHtcclxuICAgICAgICAgIGN1ZVV0aWxpdGllcygncmViaW5kJywgY3ksIGFwaSk7XHJcbiAgICAgICAgICBvcHRpb25zLmN1ZUVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5nZXRQYXJlbnQgPSBmdW5jdGlvbihub2RlSWQpIHtcclxuICAgICAgICBpZihjeS5nZXRFbGVtZW50QnlJZChub2RlSWQpWzBdID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgdmFyIHBhcmVudERhdGEgPSBnZXRTY3JhdGNoKGN5LCAncGFyZW50RGF0YScpO1xyXG4gICAgICAgICAgcmV0dXJuIHBhcmVudERhdGFbbm9kZUlkXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgIHJldHVybiBjeS5nZXRFbGVtZW50QnlJZChub2RlSWQpLnBhcmVudCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5jb2xsYXBzZUVkZ2VzID0gZnVuY3Rpb24oZWRnZXMsb3B0cyl7ICAgICBcclxuICAgICAgICB2YXIgcmVzdWx0ID0gICAge2VkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCl9O1xyXG4gICAgICAgIGlmKGVkZ2VzLmxlbmd0aCA8IDIpIHJldHVybiByZXN1bHQgO1xyXG4gICAgICAgIGlmKGVkZ2VzLmNvbm5lY3RlZE5vZGVzKCkubGVuZ3RoID4gMikgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTsgXHJcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG4gICAgICBhcGkuZXhwYW5kRWRnZXMgPSBmdW5jdGlvbihlZGdlcyl7ICAgIFxyXG4gICAgICAgIHZhciByZXN1bHQgPSAgICB7ZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKX0gICAgXHJcbiAgICAgICAgaWYoZWRnZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDsgXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9pZih0eXBlb2YgZWRnZXNbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJyl7Ly9jb2xsZWN0aW9uIG9mIGVkZ2VzIGlzIHBhc3NlZFxyXG4gICAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKXtcclxuICAgICAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEVkZ2UoZWRnZSk7XHJcbiAgICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcclxuICAgICAgICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQub2xkRWRnZXMpO1xyXG4gICAgICAgICAgIFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAvKiAgfWVsc2V7Ly9vbmUgZWRnZSBwYXNzZWRcclxuICAgICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRFZGdlKGVkZ2VzKTtcclxuICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcclxuICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgIH0gKi9cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgIFxyXG4gICAgICB9O1xyXG4gICAgICBhcGkuY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyA9IGZ1bmN0aW9uKG5vZGVzLCBvcHRzKXtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTsgXHJcbiAgICAgICAgZnVuY3Rpb24gcGFpcndpc2UobGlzdCkge1xyXG4gICAgICAgICAgdmFyIHBhaXJzID0gW107XHJcbiAgICAgICAgICBsaXN0XHJcbiAgICAgICAgICAgIC5zbGljZSgwLCBsaXN0Lmxlbmd0aCAtIDEpXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uIChmaXJzdCwgbikge1xyXG4gICAgICAgICAgICAgIHZhciB0YWlsID0gbGlzdC5zbGljZShuICsgMSwgbGlzdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgIHRhaWwuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgcGFpcnMucHVzaChbZmlyc3QsIGl0ZW1dKVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgcmV0dXJuIHBhaXJzO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKG5vZGVzKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0ge2VkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCl9O1xyXG4gICAgICAgIG5vZGVzUGFpcnMuZm9yRWFjaChmdW5jdGlvbihub2RlUGFpcil7XHJcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnW3NvdXJjZSA9IFwiJysgbm9kZVBhaXJbMV0uaWQoKSsnXCJdLFt0YXJnZXQgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXScpOyAgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKGVkZ2VzLmxlbmd0aCA+PSAyKXtcclxuICAgICAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpXHJcbiAgICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcclxuICAgICAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpO1xyXG4gICAgICAgICAgfSAgICBcclxuICAgICAgICAgXHJcbiAgICAgICAgfS5iaW5kKHRoaXMpKTsgICAgICAgXHJcbiAgICAgXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuXHJcbiAgICAgIH07XHJcbiAgICAgIGFwaS5leHBhbmRFZGdlc0JldHdlZW5Ob2RlcyA9IGZ1bmN0aW9uKG5vZGVzKXtcclxuICAgICAgICBpZihub2Rlcy5sZW5ndGggPD0gMSkgY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICAgIHZhciBlZGdlc1RvRXhwYW5kID0gY3kuY29sbGVjdGlvbigpO1xyXG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcclxuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xyXG4gICAgICAgICAgbGlzdFxyXG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcclxuICAgICAgICAgICAgICB2YXIgdGFpbCA9IGxpc3Quc2xpY2UobiArIDEsIGxpc3QubGVuZ3RoKTtcclxuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIHJldHVybiBwYWlycztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy92YXIgcmVzdWx0ID0ge2VkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCl9ICAgOyAgICAgXHJcbiAgICAgICAgdmFyIG5vZGVzUGFpcnMgPSBwYWlyd2lzZShub2Rlcyk7XHJcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVQYWlyKXtcclxuICAgICAgICAgIHZhciBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCcuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlW3NvdXJjZSA9IFwiJysgbm9kZVBhaXJbMV0uaWQoKSsnXCJdLFt0YXJnZXQgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXScpOyAgXHJcbiAgICAgICAgICBlZGdlc1RvRXhwYW5kID0gZWRnZXNUb0V4cGFuZC51bmlvbihlZGdlcyk7ICAgICAgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICAgIC8vcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChlZGdlc1RvRXhwYW5kKTtcclxuICAgICAgICAvL3Jlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQodGhpcy5leHBhbmRFZGdlcyhlZGdlc1RvRXhwYW5kKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kRWRnZXMoZWRnZXNUb0V4cGFuZCk7XHJcbiAgICAgIH07XHJcbiAgICAgIGFwaS5jb2xsYXBzZUFsbEVkZ2VzID0gZnVuY3Rpb24ob3B0cyl7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7IFxyXG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcclxuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xyXG4gICAgICAgICAgbGlzdFxyXG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcclxuICAgICAgICAgICAgICB2YXIgdGFpbCA9IGxpc3Quc2xpY2UobiArIDEsIGxpc3QubGVuZ3RoKTtcclxuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIHJldHVybiBwYWlycztcclxuICAgICAgICB9IFxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoY3kuZWRnZXMoKS5jb25uZWN0ZWROb2RlcygpLG9wdHMpO1xyXG4gICAgICAgLyogIHZhciBub2Rlc1BhaXJzID0gcGFpcndpc2UoY3kuZWRnZXMoKS5jb25uZWN0ZWROb2RlcygpKTtcclxuICAgICAgICBub2Rlc1BhaXJzLmZvckVhY2goZnVuY3Rpb24obm9kZVBhaXIpe1xyXG4gICAgICAgICAgdmFyIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJ1tzb3VyY2UgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXSxbdGFyZ2V0ID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0nKTsgICAgICAgICBcclxuICAgICAgICAgIGlmKGVkZ2VzLmxlbmd0aCA+PTIpe1xyXG4gICAgICAgICAgICBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuRWRnZXMoZWRnZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgIH0uYmluZCh0aGlzKSk7ICovXHJcblxyXG4gICAgICB9OyBcclxuICAgICAgYXBpLmV4cGFuZEFsbEVkZ2VzID0gZnVuY3Rpb24oKXsgICAgICAgXHJcbiAgICAgICAgdmFyIGVkZ2VzID0gY3kuZWRnZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlXCIpO1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB7ZWRnZXM6Y3kuY29sbGVjdGlvbigpLCBvbGRFZGdlcyA6IGN5LmNvbGxlY3Rpb24oKX07XHJcbiAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IHRoaXMuZXhwYW5kRWRnZXMoZWRnZXMpO1xyXG4gICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcclxuICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7ICAgXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgfTtcclxuXHJcbiAgICAgXHJcbiAgICAgXHJcbiAgICAgIHJldHVybiBhcGk7IC8vIFJldHVybiB0aGUgQVBJIGluc3RhbmNlXHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IHRoZSB3aG9sZSBzY3JhdGNocGFkIHJlc2VydmVkIGZvciB0aGlzIGV4dGVuc2lvbiAob24gYW4gZWxlbWVudCBvciBjb3JlKSBvciBnZXQgYSBzaW5nbGUgcHJvcGVydHkgb2YgaXRcclxuICAgIGZ1bmN0aW9uIGdldFNjcmF0Y2ggKGN5T3JFbGUsIG5hbWUpIHtcclxuICAgICAgaWYgKGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHt9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHNjcmF0Y2ggPSBjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XHJcbiAgICAgIHZhciByZXRWYWwgPSAoIG5hbWUgPT09IHVuZGVmaW5lZCApID8gc2NyYXRjaCA6IHNjcmF0Y2hbbmFtZV07XHJcbiAgICAgIHJldHVybiByZXRWYWw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2V0IGEgc2luZ2xlIHByb3BlcnR5IG9uIHNjcmF0Y2hwYWQgb2YgYW4gZWxlbWVudCBvciB0aGUgY29yZVxyXG4gICAgZnVuY3Rpb24gc2V0U2NyYXRjaCAoY3lPckVsZSwgbmFtZSwgdmFsKSB7XHJcbiAgICAgIGdldFNjcmF0Y2goY3lPckVsZSlbbmFtZV0gPSB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVnaXN0ZXIgdGhlIGV4dGVuc2lvbiBjeS5leHBhbmRDb2xsYXBzZSgpXHJcbiAgICBjeXRvc2NhcGUoXCJjb3JlXCIsIFwiZXhwYW5kQ29sbGFwc2VcIiwgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuXHJcbiAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKSB8fCB7XHJcbiAgICAgICAgbGF5b3V0Qnk6IG51bGwsIC8vIGZvciByZWFycmFuZ2UgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCdzIGp1c3QgbGF5b3V0IG9wdGlvbnMgb3Igd2hvbGUgbGF5b3V0IGZ1bmN0aW9uLiBDaG9vc2UgeW91ciBzaWRlIVxyXG4gICAgICAgIGZpc2hleWU6IHRydWUsIC8vIHdoZXRoZXIgdG8gcGVyZm9ybSBmaXNoZXllIHZpZXcgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlIHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHRvb1xyXG4gICAgICAgIGFuaW1hdGU6IHRydWUsIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSBvbiBkcmF3aW5nIGNoYW5nZXMgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXHJcbiAgICAgICAgYW5pbWF0aW9uRHVyYXRpb246IDEwMDAsIC8vIHdoZW4gYW5pbWF0ZSBpcyB0cnVlLCB0aGUgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzIG9mIHRoZSBhbmltYXRpb25cclxuICAgICAgICByZWFkeTogZnVuY3Rpb24gKCkgeyB9LCAvLyBjYWxsYmFjayB3aGVuIGV4cGFuZC9jb2xsYXBzZSBpbml0aWFsaXplZFxyXG4gICAgICAgIHVuZG9hYmxlOiB0cnVlLCAvLyBhbmQgaWYgdW5kb1JlZG9FeHRlbnNpb24gZXhpc3RzLFxyXG5cclxuICAgICAgICBjdWVFbmFibGVkOiB0cnVlLCAvLyBXaGV0aGVyIGN1ZXMgYXJlIGVuYWJsZWRcclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uOiAndG9wLWxlZnQnLCAvLyBkZWZhdWx0IGN1ZSBwb3NpdGlvbiBpcyB0b3AgbGVmdCB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiBwZXIgbm9kZSB0b29cclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNpemU6IDEyLCAvLyBzaXplIG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVcclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplOiA4LCAvLyBzaXplIG9mIGxpbmVzIHVzZWQgZm9yIGRyYXdpbmcgcGx1cy1taW51cyBpY29uc1xyXG4gICAgICAgIGV4cGFuZEN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGV4cGFuZCBpY29uIGlmIHVuZGVmaW5lZCBkcmF3IHJlZ3VsYXIgZXhwYW5kIGN1ZVxyXG4gICAgICAgIGNvbGxhcHNlQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgY29sbGFwc2UgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGNvbGxhcHNlIGN1ZVxyXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHk6IDEsIC8vIHNlbnNpdGl2aXR5IG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVzXHJcbiAgICAgICBcclxuICAgICAgICBlZGdlVHlwZUluZm8gOiBcImVkZ2VUeXBlXCIsIC8vdGhlIG5hbWUgb2YgdGhlIGZpZWxkIHRoYXQgaGFzIHRoZSBlZGdlIHR5cGUsIHJldHJpZXZlZCBmcm9tIGVkZ2UuZGF0YSgpLCBjYW4gYmUgYSBmdW5jdGlvblxyXG4gICAgICAgIGdyb3VwRWRnZXNPZlNhbWVUeXBlT25Db2xsYXBzZTogZmFsc2UsXHJcbiAgICAgICAgYWxsb3dOZXN0ZWRFZGdlQ29sbGFwc2U6IHRydWUsXHJcbiAgICAgICAgekluZGV4OiA5OTkgLy8gei1pbmRleCB2YWx1ZSBvZiB0aGUgY2FudmFzIGluIHdoaWNoIGN1ZSDEsW1hZ2VzIGFyZSBkcmF3blxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gSWYgb3B0cyBpcyBub3QgJ2dldCcgdGhhdCBpcyBpdCBpcyBhIHJlYWwgb3B0aW9ucyBvYmplY3QgdGhlbiBpbml0aWxpemUgdGhlIGV4dGVuc2lvblxyXG4gICAgICBpZiAob3B0cyAhPT0gJ2dldCcpIHtcclxuICAgICAgICBvcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuXHJcbiAgICAgICAgdmFyIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9leHBhbmRDb2xsYXBzZVV0aWxpdGllcycpKGN5KTtcclxuICAgICAgICB2YXIgYXBpID0gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5LCBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyk7IC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxyXG5cclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnYXBpJywgYXBpKTtcclxuXHJcbiAgICAgICAgdW5kb1JlZG9VdGlsaXRpZXMoY3ksIGFwaSk7XHJcblxyXG4gICAgICAgIGN1ZVV0aWxpdGllcyhvcHRpb25zLCBjeSwgYXBpKTtcclxuXHJcbiAgICAgICAgLy8gaWYgdGhlIGN1ZSBpcyBub3QgZW5hYmxlZCB1bmJpbmQgY3VlIGV2ZW50c1xyXG4gICAgICAgIGlmKCFvcHRpb25zLmN1ZUVuYWJsZWQpIHtcclxuICAgICAgICAgIGN1ZVV0aWxpdGllcygndW5iaW5kJywgY3ksIGFwaSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIG9wdGlvbnMucmVhZHkgKSB7XHJcbiAgICAgICAgICBvcHRpb25zLnJlYWR5KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgcGFyZW50RGF0YSA9IHt9O1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdwYXJlbnREYXRhJywgcGFyZW50RGF0YSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBnZXRTY3JhdGNoKGN5LCAnYXBpJyk7IC8vIEV4cG9zZSB0aGUgQVBJIHRvIHRoZSB1c2Vyc1xyXG4gICAgfSk7XHJcbiAgfTtcclxuICBcclxuXHJcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZXhwYW5kLWNvbGxhcHNlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnKSB7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXHJcbiAgICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGFwaSkge1xyXG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7fSwgdHJ1ZSk7XHJcblxyXG4gIGZ1bmN0aW9uIGdldEVsZXMoX2VsZXMpIHtcclxuICAgIHJldHVybiAodHlwZW9mIF9lbGVzID09PSBcInN0cmluZ1wiKSA/IGN5LiQoX2VsZXMpIDogX2VsZXM7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXROb2RlUG9zaXRpb25zKCkge1xyXG4gICAgdmFyIHBvc2l0aW9ucyA9IHt9O1xyXG4gICAgdmFyIG5vZGVzID0gY3kubm9kZXMoKTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlbGUgPSBub2Rlc1tpXTtcclxuICAgICAgcG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcclxuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxyXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcG9zaXRpb25zO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmV0dXJuVG9Qb3NpdGlvbnMocG9zaXRpb25zKSB7XHJcbiAgICB2YXIgY3VycmVudFBvc2l0aW9ucyA9IHt9O1xyXG4gICAgY3kubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLnBvc2l0aW9ucyhmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRQb3NpdGlvbnNbZWxlLmlkKCldID0ge1xyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcG9zID0gcG9zaXRpb25zW2VsZS5pZCgpXTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBwb3MueCxcclxuICAgICAgICB5OiBwb3MueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnM7XHJcbiAgfVxyXG5cclxuICB2YXIgc2Vjb25kVGltZU9wdHMgPSB7XHJcbiAgICBsYXlvdXRCeTogbnVsbCxcclxuICAgIGFuaW1hdGU6IGZhbHNlLFxyXG4gICAgZmlzaGV5ZTogZmFsc2VcclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBkb0l0KGZ1bmMpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICAgIHZhciBub2RlcyA9IGdldEVsZXMoYXJncy5ub2Rlcyk7XHJcbiAgICAgIGlmIChhcmdzLmZpcnN0VGltZSkge1xyXG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9ucygpO1xyXG4gICAgICAgIHJlc3VsdC5ub2RlcyA9IGZ1bmMuaW5kZXhPZihcIkFsbFwiKSA+IDAgPyBhcGlbZnVuY10oYXJncy5vcHRpb25zKSA6IGFwaVtmdW5jXShub2RlcywgYXJncy5vcHRpb25zKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHQub2xkRGF0YSA9IGdldE5vZGVQb3NpdGlvbnMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKHNlY29uZFRpbWVPcHRzKSA6IGFwaVtmdW5jXShjeS5jb2xsZWN0aW9uKG5vZGVzKSwgc2Vjb25kVGltZU9wdHMpO1xyXG4gICAgICAgIHJldHVyblRvUG9zaXRpb25zKGFyZ3Mub2xkRGF0YSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdmFyIGFjdGlvbnMgPSBbXCJjb2xsYXBzZVwiLCBcImNvbGxhcHNlUmVjdXJzaXZlbHlcIiwgXCJjb2xsYXBzZUFsbFwiLCBcImV4cGFuZFwiLCBcImV4cGFuZFJlY3Vyc2l2ZWx5XCIsIFwiZXhwYW5kQWxsXCJdO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmKGkgPT0gMilcclxuICAgICAgdXIuYWN0aW9uKFwiY29sbGFwc2VBbGxcIiwgZG9JdChcImNvbGxhcHNlQWxsXCIpLCBkb0l0KFwiZXhwYW5kUmVjdXJzaXZlbHlcIikpO1xyXG4gICAgZWxzZSBpZihpID09IDUpXHJcbiAgICAgIHVyLmFjdGlvbihcImV4cGFuZEFsbFwiLCBkb0l0KFwiZXhwYW5kQWxsXCIpLCBkb0l0KFwiY29sbGFwc2VSZWN1cnNpdmVseVwiKSk7XHJcbiAgICBlbHNlXHJcbiAgICAgIHVyLmFjdGlvbihhY3Rpb25zW2ldLCBkb0l0KGFjdGlvbnNbaV0pLCBkb0l0KGFjdGlvbnNbKGkgKyAzKSAlIDZdKSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjb2xsYXBzZUVkZ2VzKGFyZ3MpeyAgICBcclxuICAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xyXG4gICAgdmFyIGVkZ2VzID0gYXJncy5lZGdlcztcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIFxyXG4gICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gICAgaWYoYXJncy5maXJzdFRpbWUpe1xyXG4gICAgICB2YXIgY29sbGFwc2VSZXN1bHQgPSBhcGkuY29sbGFwc2VFZGdlcyhlZGdlcyxvcHRpb25zKTsgICAgXHJcbiAgICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlUmVzdWx0LmVkZ2VzO1xyXG4gICAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZVJlc3VsdC5vbGRFZGdlczsgIFxyXG4gICAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gZWRnZXM7XHJcbiAgICAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XHJcbiAgICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xyXG4gICAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcclxuICAgICAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XHJcbiAgICAgIH1cclxuICAgICBcclxuICAgICBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuICBmdW5jdGlvbiBjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mpe1xyXG4gICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XHJcbiAgICBpZihhcmdzLmZpcnN0VGltZSl7XHJcbiAgICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoYXJncy5ub2Rlcywgb3B0aW9ucyk7XHJcbiAgICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQuZWRnZXM7XHJcbiAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQub2xkRWRnZXM7XHJcbiAgICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcclxuICAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xyXG4gICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xyXG4gICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XHJcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcclxuICAgICAgfVxyXG4gICAgXHJcbiAgICB9XHJcbiBcclxuICAgIHJldHVybiByZXN1bHQ7XHJcblxyXG4gfVxyXG4gZnVuY3Rpb24gY29sbGFwc2VBbGxFZGdlcyhhcmdzKXtcclxuICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XHJcbiAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gICBpZihhcmdzLmZpcnN0VGltZSl7XHJcbiAgICB2YXIgY29sbGFwc2VBbGxSZXN1bHQgPSBhcGkuY29sbGFwc2VBbGxFZGdlcyhvcHRpb25zKTtcclxuICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0LmVkZ2VzO1xyXG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQub2xkRWRnZXM7XHJcbiAgICByZXN1bHQuZmlyc3RUaW1lID0gZmFsc2U7XHJcbiAgIH1lbHNle1xyXG4gICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcclxuICAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XHJcbiAgICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XHJcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcclxuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xyXG4gICAgICB9XHJcbiAgIFxyXG4gICB9XHJcblxyXG4gICByZXR1cm4gcmVzdWx0O1xyXG4gfVxyXG4gZnVuY3Rpb24gZXhwYW5kRWRnZXMoYXJncyl7ICAgXHJcbiAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xyXG4gICB2YXIgcmVzdWx0ID17fTtcclxuICBcclxuICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gICBpZihhcmdzLmZpcnN0VGltZSl7XHJcbiAgICAgdmFyIGV4cGFuZFJlc3VsdCA9IGFwaS5leHBhbmRFZGdlcyhhcmdzLmVkZ2VzKTtcclxuICAgIHJlc3VsdC5lZGdlcyA9IGV4cGFuZFJlc3VsdC5lZGdlcztcclxuICAgIHJlc3VsdC5vbGRFZGdlcyA9IGV4cGFuZFJlc3VsdC5vbGRFZGdlcztcclxuICAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcclxuICAgIFxyXG4gICB9ZWxzZXtcclxuICAgIHJlc3VsdC5vbGRFZGdlcyA9IGFyZ3MuZWRnZXM7XHJcbiAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xyXG4gICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XHJcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcclxuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xyXG4gICAgICB9XHJcbiAgXHJcbiAgIH1cclxuXHJcbiAgIHJldHVybiByZXN1bHQ7XHJcbiB9XHJcbiBmdW5jdGlvbiBleHBhbmRFZGdlc0JldHdlZW5Ob2RlcyhhcmdzKXtcclxuICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcclxuICB2YXIgcmVzdWx0ID0ge307XHJcbiAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gIGlmKGFyZ3MuZmlyc3RUaW1lKXtcclxuICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mubm9kZXMsb3B0aW9ucyk7XHJcbiAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0LmVkZ2VzO1xyXG4gICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5vbGRFZGdlcztcclxuICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xyXG4gIH1lbHNle1xyXG4gICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xyXG4gICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xyXG4gICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcclxuICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcclxuICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcclxuICAgIH1cclxuICBcclxuICB9XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbiB9XHJcbiBmdW5jdGlvbiBleHBhbmRBbGxFZGdlcyhhcmdzKXtcclxuICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcclxuICB2YXIgcmVzdWx0ID0ge307XHJcbiAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gIGlmKGFyZ3MuZmlyc3RUaW1lKXtcclxuICAgdmFyIGV4cGFuZFJlc3VsdCA9IGFwaS5leHBhbmRBbGxFZGdlcyhvcHRpb25zKTtcclxuICAgcmVzdWx0LmVkZ2VzID0gZXhwYW5kUmVzdWx0LmVkZ2VzO1xyXG4gICByZXN1bHQub2xkRWRnZXMgPSBleHBhbmRSZXN1bHQub2xkRWRnZXM7XHJcbiAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcclxuICB9ZWxzZXtcclxuICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcclxuICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcclxuICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XHJcbiAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XHJcbiAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XHJcbiAgICB9XHJcbiAgIFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxuIH1cclxuIFxyXG4gXHJcbiAgdXIuYWN0aW9uKFwiY29sbGFwc2VFZGdlc1wiLCBjb2xsYXBzZUVkZ2VzLCBleHBhbmRFZGdlcyk7XHJcbiAgdXIuYWN0aW9uKFwiZXhwYW5kRWRnZXNcIiwgZXhwYW5kRWRnZXMsIGNvbGxhcHNlRWRnZXMpO1xyXG5cclxuICB1ci5hY3Rpb24oXCJjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzXCIsIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMsIGV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKTtcclxuICB1ci5hY3Rpb24oXCJleHBhbmRFZGdlc0JldHdlZW5Ob2Rlc1wiLCBleHBhbmRFZGdlc0JldHdlZW5Ob2RlcywgY29sbGFwc2VFZGdlc0JldHdlZW5Ob2Rlcyk7XHJcblxyXG4gIHVyLmFjdGlvbihcImNvbGxhcHNlQWxsRWRnZXNcIiwgY29sbGFwc2VBbGxFZGdlcywgZXhwYW5kQWxsRWRnZXMpO1xyXG4gIHVyLmFjdGlvbihcImV4cGFuZEFsbEVkZ2VzXCIsIGV4cGFuZEFsbEVkZ2VzLCBjb2xsYXBzZUFsbEVkZ2VzKTtcclxuXHJcbiBcclxuXHJcblxyXG4gIFxyXG5cclxuXHJcbn07XHJcbiJdfQ==
