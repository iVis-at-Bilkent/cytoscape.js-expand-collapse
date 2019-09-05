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

  var nodeWithRenderedCue, preventDrawing = false;

  const getData = function(){
    var scratch = cy.scratch('_cyExpandCollapse');
    return scratch && scratch.cueUtilities;
  };

  const setData = function( data ){
    var scratch = cy.scratch('_cyExpandCollapse');
    if (scratch == null) {
      scratch = {};
    }

    scratch.cueUtilities = data;
    cy.scratch('_cyExpandCollapse', scratch);
  };

  var functions = {
    init: function () {
      var self = this;
      var $canvas = document.createElement('canvas');
      var $container = cy.container();
      var ctx = $canvas.getContext( '2d' );
      $container.append($canvas);

      elementUtilities = _dereq_('./elementUtilities')(cy);

      var offset = function(elt) {
          var rect = elt.getBoundingClientRect();

          return {
            top: rect.top + document.documentElement.scrollTop,
            left: rect.left + document.documentElement.scrollLeft
          }
      }

      var _sizeCanvas = debounce(function () {
        $canvas.height = cy.height();
        $canvas.width = cy.width();
        $canvas.style.position = 'absolute';
        $canvas.style.top = 0;
        $canvas.style.left = 0;
        $canvas.style.zIndex = 999;

        setTimeout(function () {
          var canvasBb = offset($canvas);
          var containerBb = offset($container);
          $canvas.style.top = -(canvasBb.top - containerBb.top);
          $canvas.style.left = -(canvasBb.left - containerBb.left);

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

      var data = {};

      // if there are events field in data unbind them here
      // to prevent binding the same event multiple times
      // if (!data.hasEventFields) {
      //   functions['unbind'].apply( $container );
      // }
      window.addEventListener('resize', data.eWindowResize = function () {
        sizeCanvas();
      });

      function options() {
        return cy.scratch('_cyExpandCollapse').options;
      }

      function clearDraws() {
        var w = cy.width();
        var h = cy.height();

        ctx.clearRect(0, 0, w, h);
      }

      function drawExpandCollapseCue(node) {
        var children = node.children();
        var collapsedChildren = node._private.data.collapsedChildren;
        var hasChildren = children != null && children.length > 0;
        // If this is a simple node with no collapsed children return directly
        if (!hasChildren && collapsedChildren == null) {
          return;
        }

        var isCollapsed = node.hasClass('cy-expand-collapse-collapsed-node');

        //Draw expand-collapse rectangles
        var rectSize = options().expandCollapseCueSize;
        var lineSize = options().expandCollapseCueLineSize;
        var diff;

        var expandcollapseStartX;
        var expandcollapseStartY;
        var expandcollapseEndX;
        var expandcollapseEndY;
        var expandcollapseRectSize;

        var expandcollapseCenterX;
        var expandcollapseCenterY;
        var cueCenter;

        if (options().expandCollapseCuePosition === 'top-left') {
          var offset = 1;
          var size = cy.zoom() < 1 ? rectSize / (2*cy.zoom()) : rectSize / 2;

          var x = node.position('x') - node.width() / 2 - parseFloat(node.css('padding-left'))
                  + parseFloat(node.css('border-width')) + size + offset;
          var y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
                  + parseFloat(node.css('border-width')) + size + offset;

          cueCenter = {
            x : x,
            y : y
          };
        } else {
          var option = options().expandCollapseCuePosition;
          cueCenter = typeof option === 'function' ? option.call(this, node) : option;
        }

        var expandcollapseCenter = elementUtilities.convertToRenderedPosition(cueCenter);

        // convert to rendered sizes
        rectSize = Math.max(rectSize, rectSize * cy.zoom());
        lineSize = Math.max(lineSize, lineSize * cy.zoom());
        diff = (rectSize - lineSize) / 2;

        expandcollapseCenterX = expandcollapseCenter.x;
        expandcollapseCenterY = expandcollapseCenter.y;

        expandcollapseStartX = expandcollapseCenterX - rectSize / 2;
        expandcollapseStartY = expandcollapseCenterY - rectSize / 2;
        expandcollapseEndX = expandcollapseStartX + rectSize;
        expandcollapseEndY = expandcollapseStartY + rectSize;
        expandcollapseRectSize = rectSize;

        // Draw expand/collapse cue if specified use an image else render it in the default way
        if (isCollapsed && options().expandCueImage) {
          var img=new Image();
          img.src = options().expandCueImage;
          ctx.drawImage(img, expandcollapseStartX,  expandcollapseStartY, rectSize, rectSize);
        }
        else if (!isCollapsed && options().collapseCueImage) {
          var img=new Image();
          img.src = options().collapseCueImage;
          ctx.drawImage(img, expandcollapseStartX,  expandcollapseStartY, rectSize, rectSize);
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

      {
        cy.on('expandcollapse.clearvisualcue', function() {

          if ( nodeWithRenderedCue ) {
            clearDraws();
          }
        });

        cy.bind('zoom pan', data.eZoom = function () {
          if ( nodeWithRenderedCue ) {
            clearDraws();
          }
        });

		// check if mouse is inside given node
		var isInsideCompound = function(node, e){
			if (node){
				var currMousePos = e.position || e.cyPosition;
				var topLeft = {
					x: (node.position("x") - node.width() / 2 - parseFloat(node.css('padding-left'))),
					y: (node.position("y") - node.height() / 2 - parseFloat(node.css('padding-top')))};
				var bottomRight = {
					x: (node.position("x") + node.width() / 2 + parseFloat(node.css('padding-right'))),
					y: (node.position("y") + node.height() / 2+ parseFloat(node.css('padding-bottom')))};

				if (currMousePos.x >= topLeft.x && currMousePos.y >= topLeft.y &&
					currMousePos.x <= bottomRight.x && currMousePos.y <= bottomRight.y){
					return true;
				}
			}
			return false;
		};

		cy.on('mousemove', 'node', data.eMouseMove= function(e){
			if(!isInsideCompound(nodeWithRenderedCue, e)){
				clearDraws()
			}
			else if(nodeWithRenderedCue && !preventDrawing){
				drawExpandCollapseCue(nodeWithRenderedCue);
			}
		});

		cy.on('mouseover', 'node', data.eMouseOver = function (e) {
			var node = this;
			// clear draws if any
			if (api.isCollapsible(node) || api.isExpandable(node)){
				if ( nodeWithRenderedCue && nodeWithRenderedCue.id() != node.id() ) {
					clearDraws();
				}
				drawExpandCollapseCue(node);
			}
		});

		var oldMousePos = null, currMousePos = null;
		cy.on('mousedown', 'node', data.eMouseDown = function(e){
			oldMousePos = e.renderedPosition || e.cyRenderedPosition
		});
		cy.on('mouseup', 'node', data.eMouseUp = function(e){
			currMousePos = e.renderedPosition || e.cyRenderedPosition
		});

		cy.on('grab', 'node', data.eGrab = function (e) {
			preventDrawing = true;
		});

		cy.on('free', 'node', data.eFree = function (e) {
			preventDrawing = false;
		});

		cy.on('position', 'node', data.ePosition = function () {
			if (nodeWithRenderedCue)
				clearDraws();
		});

		cy.on('remove', 'node', data.eRemove = function () {
			clearDraws();
			nodeWithRenderedCue = null;
		});

		var ur;
		cy.on('select', 'node', data.eSelect = function(){
			if (this.length > cy.nodes(":selected").length)
				this.unselect();
		});

		cy.on('tap', 'node', data.eTap = function (event) {
			var node = nodeWithRenderedCue;
      var opts = options();
			if (node){
				var expandcollapseRenderedStartX = node._private.data.expandcollapseRenderedStartX;
				var expandcollapseRenderedStartY = node._private.data.expandcollapseRenderedStartY;
				var expandcollapseRenderedRectSize = node._private.data.expandcollapseRenderedCueSize;
				var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
				var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;
                
                var cyRenderedPos = event.renderedPosition || event.cyRenderedPosition;
				var cyRenderedPosX = cyRenderedPos.x;
				var cyRenderedPosY = cyRenderedPos.y;
				var factor = (opts.expandCollapseCueSensitivity - 1) / 2;

				if ( (Math.abs(oldMousePos.x - currMousePos.x) < 5 && Math.abs(oldMousePos.y - currMousePos.y) < 5)
					&& cyRenderedPosX >= expandcollapseRenderedStartX - expandcollapseRenderedRectSize * factor
					&& cyRenderedPosX <= expandcollapseRenderedEndX + expandcollapseRenderedRectSize * factor
					&& cyRenderedPosY >= expandcollapseRenderedStartY - expandcollapseRenderedRectSize * factor
					&& cyRenderedPosY <= expandcollapseRenderedEndY + expandcollapseRenderedRectSize * factor) {
					if(opts.undoable && !ur)
						ur = cy.undoRedo({
							defaultActions: false
						});
					if(api.isCollapsible(node))
						if (opts.undoable){
							ur.do("collapse", {
								nodes: node,
								options: opts
							});
						}
						else
							api.collapse(node, opts);
				else if(api.isExpandable(node))
					if (opts.undoable)
						ur.do("expand", {
							nodes: node,
							options: opts
						});
					else
						api.expand(node, opts);
					}
			}
		});
      }

      // write options to data
      data.hasEventFields = true;
      setData( data );
    },
    unbind: function () {
        // var $container = this;
        var data = getData();

        if (!data.hasEventFields) {
          console.log( 'events to unbind does not exist' );
          return;
        }

        cy.trigger('expandcollapse.clearvisualcue');

        cy.off('mouseover', 'node', data.eMouseOver)
          .off('mousemove', 'node', data.eMouseMove)
          .off('mousedown', 'node', data.eMouseDown)
          .off('mouseup', 'node', data.eMouseUp)
          .off('free', 'node', data.eFree)
          .off('grab', 'node', data.eGrab)
          .off('position', 'node', data.ePosition)
          .off('remove', 'node', data.eRemove)
          .off('tap', 'node', data.eTap)
          .off('add', 'node', data.eAdd)
          .off('select', 'node', data.eSelect)
          .off('free', 'node', data.eFree)
          .off('zoom pan', data.eZoom);

      window.removeEventListener('resize', data.eWindowResize);
    },
    rebind: function () {
      var data = getData();

      if (!data.hasEventFields) {
        console.log( 'events to rebind does not exist' );
        return;
      }

      cy.on('mouseover', 'node', data.eMouseOver)
        .on('mousemove', 'node', data.eMouseMove)
        .on('mousedown', 'node', data.eMouseDown)
        .on('mouseup', 'node', data.eMouseUp)
        .on('free', 'node', data.eFree)
        .on('grab', 'node', data.eGrab)
        .on('position', 'node', data.ePosition)
        .on('remove', 'node', data.eRemove)
        .on('tap', 'node', data.eTap)
        .on('add', 'node', data.eAdd)
        .on('select', 'node', data.eSelect)
        .on('free', 'node', data.eFree)
        .on('zoom pan', data.eZoom);

      window.addEventListener('resize', data.eWindowResize);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(cy.container(), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(cy.container(), arguments);
  } else {
    throw new Error('No such function `' + fn + '` for cytoscape.js-expand-collapse');
  }

  return this;
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
    topMostNodes.positions(function(ele, i){
      return {
        x: topMostNodes[i].position("x") + positionDiff.x,
        y: topMostNodes[i].position("y") + positionDiff.y
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
      this.endOperation(layoutBy);
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
  endOperation: function (layoutBy) {
    var self = this;
    cy.ready(function () {
      setTimeout(function() {
        elementUtilities.rearrange(layoutBy);
      }, 0);
      
    });
  },
  /*
   * Calls simple expandAllNodes. Then performs end operation.
   */
  expandAllNodes: function (nodes, options) {//*//
    var expandedStack = this.simpleExpandAllNodes(nodes, options.fisheye);

    this.endOperation(options.layoutBy);

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
      this.endOperation(options.layoutBy);
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
    this.endOperation(options.layoutBy);

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
  }
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
        expandCollapseCueSensitivity: 1 // sensitivity of expand-collapse cues
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
    cy.nodes().positions(function (ele, i) {
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
    ur.action(actions[i], doIt(actions[i]), doIt(actions[(i + 3) % 6]));
  }

};

},{}]},{},[6])(6)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2VsZW1lbnRVdGlsaXRpZXMuanMiLCJzcmMvZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvdW5kb1JlZG9VdGlsaXRpZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxcUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSB7XHJcbiAgZXF1YWxCb3VuZGluZ0JveGVzOiBmdW5jdGlvbihiYjEsIGJiMil7XHJcbiAgICAgIHJldHVybiBiYjEueDEgPT0gYmIyLngxICYmIGJiMS54MiA9PSBiYjIueDIgJiYgYmIxLnkxID09IGJiMi55MSAmJiBiYjEueTIgPT0gYmIyLnkyO1xyXG4gIH0sXHJcbiAgZ2V0VW5pb246IGZ1bmN0aW9uKGJiMSwgYmIyKXtcclxuICAgICAgdmFyIHVuaW9uID0ge1xyXG4gICAgICB4MTogTWF0aC5taW4oYmIxLngxLCBiYjIueDEpLFxyXG4gICAgICB4MjogTWF0aC5tYXgoYmIxLngyLCBiYjIueDIpLFxyXG4gICAgICB5MTogTWF0aC5taW4oYmIxLnkxLCBiYjIueTEpLFxyXG4gICAgICB5MjogTWF0aC5tYXgoYmIxLnkyLCBiYjIueTIpLFxyXG4gICAgfTtcclxuXHJcbiAgICB1bmlvbi53ID0gdW5pb24ueDIgLSB1bmlvbi54MTtcclxuICAgIHVuaW9uLmggPSB1bmlvbi55MiAtIHVuaW9uLnkxO1xyXG5cclxuICAgIHJldHVybiB1bmlvbjtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJvdW5kaW5nQm94VXRpbGl0aWVzOyIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3ksIGFwaSkge1xyXG4gIHZhciBlbGVtZW50VXRpbGl0aWVzO1xyXG4gIHZhciBmbiA9IHBhcmFtcztcclxuXHJcbiAgdmFyIG5vZGVXaXRoUmVuZGVyZWRDdWUsIHByZXZlbnREcmF3aW5nID0gZmFsc2U7XHJcblxyXG4gIGNvbnN0IGdldERhdGEgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIHNjcmF0Y2ggPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xyXG4gICAgcmV0dXJuIHNjcmF0Y2ggJiYgc2NyYXRjaC5jdWVVdGlsaXRpZXM7XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc2V0RGF0YSA9IGZ1bmN0aW9uKCBkYXRhICl7XHJcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XHJcbiAgICBpZiAoc2NyYXRjaCA9PSBudWxsKSB7XHJcbiAgICAgIHNjcmF0Y2ggPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICBzY3JhdGNoLmN1ZVV0aWxpdGllcyA9IGRhdGE7XHJcbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHNjcmF0Y2gpO1xyXG4gIH07XHJcblxyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyICRjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgdmFyICRjb250YWluZXIgPSBjeS5jb250YWluZXIoKTtcclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXMuZ2V0Q29udGV4dCggJzJkJyApO1xyXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcclxuXHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XHJcblxyXG4gICAgICB2YXIgb2Zmc2V0ID0gZnVuY3Rpb24oZWx0KSB7XHJcbiAgICAgICAgICB2YXIgcmVjdCA9IGVsdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0b3A6IHJlY3QudG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcclxuICAgICAgICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnRcclxuICAgICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICRjYW52YXMuaGVpZ2h0ID0gY3kuaGVpZ2h0KCk7XHJcbiAgICAgICAgJGNhbnZhcy53aWR0aCA9IGN5LndpZHRoKCk7XHJcbiAgICAgICAgJGNhbnZhcy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcbiAgICAgICAgJGNhbnZhcy5zdHlsZS50b3AgPSAwO1xyXG4gICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IDA7XHJcbiAgICAgICAgJGNhbnZhcy5zdHlsZS56SW5kZXggPSA5OTk7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGNhbnZhc0JiID0gb2Zmc2V0KCRjYW52YXMpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gb2Zmc2V0KCRjb250YWluZXIpO1xyXG4gICAgICAgICAgJGNhbnZhcy5zdHlsZS50b3AgPSAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCk7XHJcbiAgICAgICAgICAkY2FudmFzLnN0eWxlLmxlZnQgPSAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KTtcclxuXHJcbiAgICAgICAgICAvLyByZWZyZXNoIHRoZSBjdWVzIG9uIGNhbnZhcyByZXNpemVcclxuICAgICAgICAgIGlmKGN5KXtcclxuICAgICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCAwKTtcclxuXHJcbiAgICAgIH0sIDI1MCk7XHJcblxyXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xyXG4gICAgICAgIF9zaXplQ2FudmFzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNpemVDYW52YXMoKTtcclxuXHJcbiAgICAgIHZhciBkYXRhID0ge307XHJcblxyXG4gICAgICAvLyBpZiB0aGVyZSBhcmUgZXZlbnRzIGZpZWxkIGluIGRhdGEgdW5iaW5kIHRoZW0gaGVyZVxyXG4gICAgICAvLyB0byBwcmV2ZW50IGJpbmRpbmcgdGhlIHNhbWUgZXZlbnQgbXVsdGlwbGUgdGltZXNcclxuICAgICAgLy8gaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XHJcbiAgICAgIC8vICAgZnVuY3Rpb25zWyd1bmJpbmQnXS5hcHBseSggJGNvbnRhaW5lciApO1xyXG4gICAgICAvLyB9XHJcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBkYXRhLmVXaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIG9wdGlvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykub3B0aW9ucztcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gY2xlYXJEcmF3cygpIHtcclxuICAgICAgICB2YXIgdyA9IGN5LndpZHRoKCk7XHJcbiAgICAgICAgdmFyIGggPSBjeS5oZWlnaHQoKTtcclxuXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGUpIHtcclxuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgICAgIHZhciBoYXNDaGlsZHJlbiA9IGNoaWxkcmVuICE9IG51bGwgJiYgY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2ltcGxlIG5vZGUgd2l0aCBubyBjb2xsYXBzZWQgY2hpbGRyZW4gcmV0dXJuIGRpcmVjdGx5XHJcbiAgICAgICAgaWYgKCFoYXNDaGlsZHJlbiAmJiBjb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgaXNDb2xsYXBzZWQgPSBub2RlLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcclxuXHJcbiAgICAgICAgLy9EcmF3IGV4cGFuZC1jb2xsYXBzZSByZWN0YW5nbGVzXHJcbiAgICAgICAgdmFyIHJlY3RTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlU2l6ZTtcclxuICAgICAgICB2YXIgbGluZVNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTtcclxuICAgICAgICB2YXIgZGlmZjtcclxuXHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VFbmRYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUVuZFk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlUmVjdFNpemU7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclg7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWTtcclxuICAgICAgICB2YXIgY3VlQ2VudGVyO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb24gPT09ICd0b3AtbGVmdCcpIHtcclxuICAgICAgICAgIHZhciBvZmZzZXQgPSAxO1xyXG4gICAgICAgICAgdmFyIHNpemUgPSBjeS56b29tKCkgPCAxID8gcmVjdFNpemUgLyAoMipjeS56b29tKCkpIDogcmVjdFNpemUgLyAyO1xyXG5cclxuICAgICAgICAgIHZhciB4ID0gbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS53aWR0aCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctbGVmdCcpKVxyXG4gICAgICAgICAgICAgICAgICArIHBhcnNlRmxvYXQobm9kZS5jc3MoJ2JvcmRlci13aWR0aCcpKSArIHNpemUgKyBvZmZzZXQ7XHJcbiAgICAgICAgICB2YXIgeSA9IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuaGVpZ2h0KCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy10b3AnKSlcclxuICAgICAgICAgICAgICAgICAgKyBwYXJzZUZsb2F0KG5vZGUuY3NzKCdib3JkZXItd2lkdGgnKSkgKyBzaXplICsgb2Zmc2V0O1xyXG5cclxuICAgICAgICAgIGN1ZUNlbnRlciA9IHtcclxuICAgICAgICAgICAgeCA6IHgsXHJcbiAgICAgICAgICAgIHkgOiB5XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XHJcbiAgICAgICAgICBjdWVDZW50ZXIgPSB0eXBlb2Ygb3B0aW9uID09PSAnZnVuY3Rpb24nID8gb3B0aW9uLmNhbGwodGhpcywgbm9kZSkgOiBvcHRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VDZW50ZXIgPSBlbGVtZW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oY3VlQ2VudGVyKTtcclxuXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBzaXplc1xyXG4gICAgICAgIHJlY3RTaXplID0gTWF0aC5tYXgocmVjdFNpemUsIHJlY3RTaXplICogY3kuem9vbSgpKTtcclxuICAgICAgICBsaW5lU2l6ZSA9IE1hdGgubWF4KGxpbmVTaXplLCBsaW5lU2l6ZSAqIGN5Lnpvb20oKSk7XHJcbiAgICAgICAgZGlmZiA9IChyZWN0U2l6ZSAtIGxpbmVTaXplKSAvIDI7XHJcblxyXG4gICAgICAgIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLng7XHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJZID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueTtcclxuXHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VTdGFydFggPSBleHBhbmRjb2xsYXBzZUNlbnRlclggLSByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VTdGFydFkgPSBleHBhbmRjb2xsYXBzZUNlbnRlclkgLSByZWN0U2l6ZSAvIDI7XHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VFbmRYID0gZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZTtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZUVuZFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplO1xyXG4gICAgICAgIGV4cGFuZGNvbGxhcHNlUmVjdFNpemUgPSByZWN0U2l6ZTtcclxuXHJcbiAgICAgICAgLy8gRHJhdyBleHBhbmQvY29sbGFwc2UgY3VlIGlmIHNwZWNpZmllZCB1c2UgYW4gaW1hZ2UgZWxzZSByZW5kZXIgaXQgaW4gdGhlIGRlZmF1bHQgd2F5XHJcbiAgICAgICAgaWYgKGlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZSkge1xyXG4gICAgICAgICAgdmFyIGltZz1uZXcgSW1hZ2UoKTtcclxuICAgICAgICAgIGltZy5zcmMgPSBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2U7XHJcbiAgICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgZXhwYW5kY29sbGFwc2VTdGFydFgsICBleHBhbmRjb2xsYXBzZVN0YXJ0WSwgcmVjdFNpemUsIHJlY3RTaXplKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIWlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlKSB7XHJcbiAgICAgICAgICB2YXIgaW1nPW5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgaW1nLnNyYyA9IG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlO1xyXG4gICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIGV4cGFuZGNvbGxhcHNlU3RhcnRYLCAgZXhwYW5kY29sbGFwc2VTdGFydFksIHJlY3RTaXplLCByZWN0U2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgdmFyIG9sZEZpbGxTdHlsZSA9IGN0eC5maWxsU3R5bGU7XHJcbiAgICAgICAgICB2YXIgb2xkV2lkdGggPSBjdHgubGluZVdpZHRoO1xyXG4gICAgICAgICAgdmFyIG9sZFN0cm9rZVN0eWxlID0gY3R4LnN0cm9rZVN0eWxlO1xyXG5cclxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgICAgY3R4LmVsbGlwc2UoZXhwYW5kY29sbGFwc2VDZW50ZXJYLCBleHBhbmRjb2xsYXBzZUNlbnRlclksIHJlY3RTaXplIC8gMiwgcmVjdFNpemUgLyAyLCAwLCAwLCAyICogTWF0aC5QSSk7XHJcbiAgICAgICAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gTWF0aC5tYXgoMi42LCAyLjYgKiBjeS56b29tKCkpO1xyXG5cclxuICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XHJcbiAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgbGluZVNpemUgKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XHJcblxyXG4gICAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XHJcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgZGlmZik7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgbGluZVNpemUgKyBkaWZmKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gb2xkU3Ryb2tlU3R5bGU7XHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gb2xkRmlsbFN0eWxlO1xyXG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IG9sZFdpZHRoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBleHBhbmRjb2xsYXBzZVN0YXJ0WDtcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZO1xyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZSA9IGV4cGFuZGNvbGxhcHNlUmVjdFNpemU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbm9kZVdpdGhSZW5kZXJlZEN1ZSA9IG5vZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHtcclxuICAgICAgICBjeS5vbignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICBpZiAoIG5vZGVXaXRoUmVuZGVyZWRDdWUgKSB7XHJcbiAgICAgICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBkYXRhLmVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCBub2RlV2l0aFJlbmRlcmVkQ3VlICkge1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG5cdFx0Ly8gY2hlY2sgaWYgbW91c2UgaXMgaW5zaWRlIGdpdmVuIG5vZGVcclxuXHRcdHZhciBpc0luc2lkZUNvbXBvdW5kID0gZnVuY3Rpb24obm9kZSwgZSl7XHJcblx0XHRcdGlmIChub2RlKXtcclxuXHRcdFx0XHR2YXIgY3Vyck1vdXNlUG9zID0gZS5wb3NpdGlvbiB8fCBlLmN5UG9zaXRpb247XHJcblx0XHRcdFx0dmFyIHRvcExlZnQgPSB7XHJcblx0XHRcdFx0XHR4OiAobm9kZS5wb3NpdGlvbihcInhcIikgLSBub2RlLndpZHRoKCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1sZWZ0JykpKSxcclxuXHRcdFx0XHRcdHk6IChub2RlLnBvc2l0aW9uKFwieVwiKSAtIG5vZGUuaGVpZ2h0KCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy10b3AnKSkpfTtcclxuXHRcdFx0XHR2YXIgYm90dG9tUmlnaHQgPSB7XHJcblx0XHRcdFx0XHR4OiAobm9kZS5wb3NpdGlvbihcInhcIikgKyBub2RlLndpZHRoKCkgLyAyICsgcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1yaWdodCcpKSksXHJcblx0XHRcdFx0XHR5OiAobm9kZS5wb3NpdGlvbihcInlcIikgKyBub2RlLmhlaWdodCgpIC8gMisgcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1ib3R0b20nKSkpfTtcclxuXHJcblx0XHRcdFx0aWYgKGN1cnJNb3VzZVBvcy54ID49IHRvcExlZnQueCAmJiBjdXJyTW91c2VQb3MueSA+PSB0b3BMZWZ0LnkgJiZcclxuXHRcdFx0XHRcdGN1cnJNb3VzZVBvcy54IDw9IGJvdHRvbVJpZ2h0LnggJiYgY3Vyck1vdXNlUG9zLnkgPD0gYm90dG9tUmlnaHQueSl7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjeS5vbignbW91c2Vtb3ZlJywgJ25vZGUnLCBkYXRhLmVNb3VzZU1vdmU9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRpZighaXNJbnNpZGVDb21wb3VuZChub2RlV2l0aFJlbmRlcmVkQ3VlLCBlKSl7XHJcblx0XHRcdFx0Y2xlYXJEcmF3cygpXHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihub2RlV2l0aFJlbmRlcmVkQ3VlICYmICFwcmV2ZW50RHJhd2luZyl7XHJcblx0XHRcdFx0ZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGVXaXRoUmVuZGVyZWRDdWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjeS5vbignbW91c2VvdmVyJywgJ25vZGUnLCBkYXRhLmVNb3VzZU92ZXIgPSBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHR2YXIgbm9kZSA9IHRoaXM7XHJcblx0XHRcdC8vIGNsZWFyIGRyYXdzIGlmIGFueVxyXG5cdFx0XHRpZiAoYXBpLmlzQ29sbGFwc2libGUobm9kZSkgfHwgYXBpLmlzRXhwYW5kYWJsZShub2RlKSl7XHJcblx0XHRcdFx0aWYgKCBub2RlV2l0aFJlbmRlcmVkQ3VlICYmIG5vZGVXaXRoUmVuZGVyZWRDdWUuaWQoKSAhPSBub2RlLmlkKCkgKSB7XHJcblx0XHRcdFx0XHRjbGVhckRyYXdzKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmFyIG9sZE1vdXNlUG9zID0gbnVsbCwgY3Vyck1vdXNlUG9zID0gbnVsbDtcclxuXHRcdGN5Lm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93biA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRvbGRNb3VzZVBvcyA9IGUucmVuZGVyZWRQb3NpdGlvbiB8fCBlLmN5UmVuZGVyZWRQb3NpdGlvblxyXG5cdFx0fSk7XHJcblx0XHRjeS5vbignbW91c2V1cCcsICdub2RlJywgZGF0YS5lTW91c2VVcCA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRjdXJyTW91c2VQb3MgPSBlLnJlbmRlcmVkUG9zaXRpb24gfHwgZS5jeVJlbmRlcmVkUG9zaXRpb25cclxuXHRcdH0pO1xyXG5cclxuXHRcdGN5Lm9uKCdncmFiJywgJ25vZGUnLCBkYXRhLmVHcmFiID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0cHJldmVudERyYXdpbmcgPSB0cnVlO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y3kub24oJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUgPSBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRwcmV2ZW50RHJhd2luZyA9IGZhbHNlO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y3kub24oJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKG5vZGVXaXRoUmVuZGVyZWRDdWUpXHJcblx0XHRcdFx0Y2xlYXJEcmF3cygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y3kub24oJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRjbGVhckRyYXdzKCk7XHJcblx0XHRcdG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBudWxsO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmFyIHVyO1xyXG5cdFx0Y3kub24oJ3NlbGVjdCcsICdub2RlJywgZGF0YS5lU2VsZWN0ID0gZnVuY3Rpb24oKXtcclxuXHRcdFx0aWYgKHRoaXMubGVuZ3RoID4gY3kubm9kZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoKVxyXG5cdFx0XHRcdHRoaXMudW5zZWxlY3QoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGN5Lm9uKCd0YXAnLCAnbm9kZScsIGRhdGEuZVRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG5cdFx0XHR2YXIgbm9kZSA9IG5vZGVXaXRoUmVuZGVyZWRDdWU7XHJcbiAgICAgIHZhciBvcHRzID0gb3B0aW9ucygpO1xyXG5cdFx0XHRpZiAobm9kZSl7XHJcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WDtcclxuXHRcdFx0XHR2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZO1xyXG5cdFx0XHRcdHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemU7XHJcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcclxuXHRcdFx0XHR2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB2YXIgY3lSZW5kZXJlZFBvcyA9IGV2ZW50LnJlbmRlcmVkUG9zaXRpb24gfHwgZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uO1xyXG5cdFx0XHRcdHZhciBjeVJlbmRlcmVkUG9zWCA9IGN5UmVuZGVyZWRQb3MueDtcclxuXHRcdFx0XHR2YXIgY3lSZW5kZXJlZFBvc1kgPSBjeVJlbmRlcmVkUG9zLnk7XHJcblx0XHRcdFx0dmFyIGZhY3RvciA9IChvcHRzLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XHJcblxyXG5cdFx0XHRcdGlmICggKE1hdGguYWJzKG9sZE1vdXNlUG9zLnggLSBjdXJyTW91c2VQb3MueCkgPCA1ICYmIE1hdGguYWJzKG9sZE1vdXNlUG9zLnkgLSBjdXJyTW91c2VQb3MueSkgPCA1KVxyXG5cdFx0XHRcdFx0JiYgY3lSZW5kZXJlZFBvc1ggPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxyXG5cdFx0XHRcdFx0JiYgY3lSZW5kZXJlZFBvc1ggPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuXHRcdFx0XHRcdCYmIGN5UmVuZGVyZWRQb3NZID49IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgLSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuXHRcdFx0XHRcdCYmIGN5UmVuZGVyZWRQb3NZIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yKSB7XHJcblx0XHRcdFx0XHRpZihvcHRzLnVuZG9hYmxlICYmICF1cilcclxuXHRcdFx0XHRcdFx0dXIgPSBjeS51bmRvUmVkbyh7XHJcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdEFjdGlvbnM6IGZhbHNlXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0aWYoYXBpLmlzQ29sbGFwc2libGUobm9kZSkpXHJcblx0XHRcdFx0XHRcdGlmIChvcHRzLnVuZG9hYmxlKXtcclxuXHRcdFx0XHRcdFx0XHR1ci5kbyhcImNvbGxhcHNlXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRcdG5vZGVzOiBub2RlLFxyXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9uczogb3B0c1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdFx0XHRhcGkuY29sbGFwc2Uobm9kZSwgb3B0cyk7XHJcblx0XHRcdFx0ZWxzZSBpZihhcGkuaXNFeHBhbmRhYmxlKG5vZGUpKVxyXG5cdFx0XHRcdFx0aWYgKG9wdHMudW5kb2FibGUpXHJcblx0XHRcdFx0XHRcdHVyLmRvKFwiZXhwYW5kXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRub2Rlczogbm9kZSxcclxuXHRcdFx0XHRcdFx0XHRvcHRpb25zOiBvcHRzXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0XHRhcGkuZXhwYW5kKG5vZGUsIG9wdHMpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXHJcbiAgICAgIGRhdGEuaGFzRXZlbnRGaWVsZHMgPSB0cnVlO1xyXG4gICAgICBzZXREYXRhKCBkYXRhICk7XHJcbiAgICB9LFxyXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLy8gdmFyICRjb250YWluZXIgPSB0aGlzO1xyXG4gICAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xyXG5cclxuICAgICAgICBpZiAoIWRhdGEuaGFzRXZlbnRGaWVsZHMpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCAnZXZlbnRzIHRvIHVuYmluZCBkb2VzIG5vdCBleGlzdCcgKTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN5LnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmNsZWFydmlzdWFsY3VlJyk7XHJcblxyXG4gICAgICAgIGN5Lm9mZignbW91c2VvdmVyJywgJ25vZGUnLCBkYXRhLmVNb3VzZU92ZXIpXHJcbiAgICAgICAgICAub2ZmKCdtb3VzZW1vdmUnLCAnbm9kZScsIGRhdGEuZU1vdXNlTW92ZSlcclxuICAgICAgICAgIC5vZmYoJ21vdXNlZG93bicsICdub2RlJywgZGF0YS5lTW91c2VEb3duKVxyXG4gICAgICAgICAgLm9mZignbW91c2V1cCcsICdub2RlJywgZGF0YS5lTW91c2VVcClcclxuICAgICAgICAgIC5vZmYoJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUpXHJcbiAgICAgICAgICAub2ZmKCdncmFiJywgJ25vZGUnLCBkYXRhLmVHcmFiKVxyXG4gICAgICAgICAgLm9mZigncG9zaXRpb24nLCAnbm9kZScsIGRhdGEuZVBvc2l0aW9uKVxyXG4gICAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUpXHJcbiAgICAgICAgICAub2ZmKCd0YXAnLCAnbm9kZScsIGRhdGEuZVRhcClcclxuICAgICAgICAgIC5vZmYoJ2FkZCcsICdub2RlJywgZGF0YS5lQWRkKVxyXG4gICAgICAgICAgLm9mZignc2VsZWN0JywgJ25vZGUnLCBkYXRhLmVTZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCdmcmVlJywgJ25vZGUnLCBkYXRhLmVGcmVlKVxyXG4gICAgICAgICAgLm9mZignem9vbSBwYW4nLCBkYXRhLmVab29tKTtcclxuXHJcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBkYXRhLmVXaW5kb3dSZXNpemUpO1xyXG4gICAgfSxcclxuICAgIHJlYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZGF0YSA9IGdldERhdGEoKTtcclxuXHJcbiAgICAgIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCAnZXZlbnRzIHRvIHJlYmluZCBkb2VzIG5vdCBleGlzdCcgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGN5Lm9uKCdtb3VzZW92ZXInLCAnbm9kZScsIGRhdGEuZU1vdXNlT3ZlcilcclxuICAgICAgICAub24oJ21vdXNlbW92ZScsICdub2RlJywgZGF0YS5lTW91c2VNb3ZlKVxyXG4gICAgICAgIC5vbignbW91c2Vkb3duJywgJ25vZGUnLCBkYXRhLmVNb3VzZURvd24pXHJcbiAgICAgICAgLm9uKCdtb3VzZXVwJywgJ25vZGUnLCBkYXRhLmVNb3VzZVVwKVxyXG4gICAgICAgIC5vbignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcclxuICAgICAgICAub24oJ2dyYWInLCAnbm9kZScsIGRhdGEuZUdyYWIpXHJcbiAgICAgICAgLm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24pXHJcbiAgICAgICAgLm9uKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcclxuICAgICAgICAub24oJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxyXG4gICAgICAgIC5vbignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXHJcbiAgICAgICAgLm9uKCdzZWxlY3QnLCAnbm9kZScsIGRhdGEuZVNlbGVjdClcclxuICAgICAgICAub24oJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUpXHJcbiAgICAgICAgLm9uKCd6b29tIHBhbicsIGRhdGEuZVpvb20pO1xyXG5cclxuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRhdGEuZVdpbmRvd1Jlc2l6ZSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KGN5LmNvbnRhaW5lcigpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseShjeS5jb250YWluZXIoKSwgYXJndW1lbnRzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWV4cGFuZC1jb2xsYXBzZScpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxyXG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcclxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxyXG4gICAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XHJcbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xyXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XHJcbiAgICovXHJcbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cclxuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xyXG5cclxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xyXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcclxuICAgICAgICAgIG5hdGl2ZU5vdyA9IERhdGUubm93O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXHJcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRGF0ZVxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XHJcbiAgICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xyXG4gICAqIH0sIF8ubm93KCkpO1xyXG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcclxuICAgKi9cclxuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcclxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcclxuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXHJcbiAgICogZGVsYXllZCBpbnZvY2F0aW9ucy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYFxyXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcclxuICAgKiBgZnVuY2AgaW52b2NhdGlvbi5cclxuICAgKlxyXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxyXG4gICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcclxuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICpcclxuICAgKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKVxyXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcclxuICAgKiAgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcclxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xyXG4gICAqXHJcbiAgICogLy8gaW52b2tlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xyXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcclxuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcclxuICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xyXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcclxuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xyXG4gICAqICAgJ21heFdhaXQnOiAxMDAwXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gY2FuY2VsIGEgZGVib3VuY2VkIGNhbGxcclxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xyXG4gICAqXHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XHJcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xyXG4gICAqICAgICB0b2RvQ2hhbmdlcy5jYW5jZWwoKTtcclxuICAgKiAgIH1cclxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXHJcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxyXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcclxuICAgKiBkZWxldGUgbW9kZWxzLnRvZG87XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGFyZ3MsXHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcclxuICAgICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgICBzdGFtcCxcclxuICAgICAgICAgICAgdGhpc0FyZyxcclxuICAgICAgICAgICAgdGltZW91dElkLFxyXG4gICAgICAgICAgICB0cmFpbGluZ0NhbGwsXHJcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxyXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XHJcbiAgICB9XHJcbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xyXG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcclxuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xyXG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xyXG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XHJcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcclxuICAgICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYW5jZWwoKSB7XHJcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgbGFzdENhbGxlZCA9IDA7XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcclxuICAgICAgaWYgKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfVxyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XHJcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xyXG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xyXG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xyXG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XHJcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIHN0YW1wID0gbm93KCk7XHJcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xyXG4gICAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcclxuXHJcbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiBtYXhXYWl0O1xyXG5cclxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xyXG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICByZXR1cm4gZGVib3VuY2VkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cclxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBMYW5nXHJcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3Qoe30pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KDEpO1xyXG4gICAqIC8vID0+IGZhbHNlXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXHJcbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cclxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xyXG4gICAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWJvdW5jZTtcclxuXHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsImZ1bmN0aW9uIGVsZW1lbnRVdGlsaXRpZXMoY3kpIHtcclxuIHJldHVybiB7XHJcbiAgbW92ZU5vZGVzOiBmdW5jdGlvbiAocG9zaXRpb25EaWZmLCBub2Rlcywgbm90Q2FsY1RvcE1vc3ROb2Rlcykge1xyXG4gICAgdmFyIHRvcE1vc3ROb2RlcyA9IG5vdENhbGNUb3BNb3N0Tm9kZXMgPyBub2RlcyA6IHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIHRvcE1vc3ROb2Rlcy5wb3NpdGlvbnMoZnVuY3Rpb24oZWxlLCBpKXtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB4OiB0b3BNb3N0Tm9kZXNbaV0ucG9zaXRpb24oXCJ4XCIpICsgcG9zaXRpb25EaWZmLngsXHJcbiAgICAgICAgeTogdG9wTW9zdE5vZGVzW2ldLnBvc2l0aW9uKFwieVwiKSArIHBvc2l0aW9uRGlmZi55XHJcbiAgICAgIH07XHJcbiAgICB9KTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gdG9wTW9zdE5vZGVzW2ldO1xyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgdmFyIG5vZGVzTWFwID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgcGFyZW50ID0gZWxlLnBhcmVudCgpWzBdO1xyXG4gICAgICB3aGlsZSAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICBpZiAobm9kZXNNYXBbcGFyZW50LmlkKCldKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQoKVswXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByb290cztcclxuICB9LFxyXG4gIHJlYXJyYW5nZTogZnVuY3Rpb24gKGxheW91dEJ5KSB7XHJcbiAgICBpZiAodHlwZW9mIGxheW91dEJ5ID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgbGF5b3V0QnkoKTtcclxuICAgIH0gZWxzZSBpZiAobGF5b3V0QnkgIT0gbnVsbCkge1xyXG4gICAgICB2YXIgbGF5b3V0ID0gY3kubGF5b3V0KGxheW91dEJ5KTtcclxuICAgICAgaWYgKGxheW91dCAmJiBsYXlvdXQucnVuKSB7XHJcbiAgICAgICAgbGF5b3V0LnJ1bigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uOiBmdW5jdGlvbiAobW9kZWxQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XHJcbiAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB4LFxyXG4gICAgICB5OiB5XHJcbiAgICB9O1xyXG4gIH1cclxuIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZWxlbWVudFV0aWxpdGllcztcclxuIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9ib3VuZGluZ0JveFV0aWxpdGllcycpO1xyXG5cclxuLy8gRXhwYW5kIGNvbGxhcHNlIHV0aWxpdGllc1xyXG5mdW5jdGlvbiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyhjeSkge1xyXG52YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcclxucmV0dXJuIHtcclxuICAvL3RoZSBudW1iZXIgb2Ygbm9kZXMgbW92aW5nIGFuaW1hdGVkbHkgYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvblxyXG4gIGFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQ6IDAsXHJcbiAgLypcclxuICAgKiBBIGZ1bnRpb24gYmFzaWNseSBleHBhbmRpbmcgYSBub2RlLCBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5LlxyXG4gICAqIFNpbmdsZSBwYXJhbWV0ZXIgaW5kaWNhdGVzIGlmIHRoZSBub2RlIGlzIGV4cGFuZGVkIGFsb25lIGFuZCBpZiBpdCBpcyB0cnV0aHkgdGhlbiBsYXlvdXRCeSBwYXJhbWV0ZXIgaXMgY29uc2lkZXJlZCB0b1xyXG4gICAqIHBlcmZvcm0gbGF5b3V0IGFmdGVyIGV4cGFuZC5cclxuICAgKi9cclxuICBleHBhbmROb2RlQmFzZUZ1bmN0aW9uOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBsYXlvdXRCeSkge1xyXG4gICAgaWYgKCFub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pe1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy9jaGVjayBob3cgdGhlIHBvc2l0aW9uIG9mIHRoZSBub2RlIGlzIGNoYW5nZWRcclxuICAgIHZhciBwb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgIHg6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCAtIG5vZGUuX3ByaXZhdGUuZGF0YVsncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJ10ueCxcclxuICAgICAgeTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS55XHJcbiAgICB9O1xyXG5cclxuICAgIG5vZGUucmVtb3ZlRGF0YShcImluZm9MYWJlbFwiKTtcclxuICAgIG5vZGUucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG5cclxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWV4cGFuZFwiKTtcclxuICAgIHZhciByZXN0b3JlZE5vZGVzID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuO1xyXG4gICAgcmVzdG9yZWROb2Rlcy5yZXN0b3JlKCk7XHJcbiAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCByZXN0b3JlZE5vZGVzLmxlbmd0aDsgaSsrKXtcclxuICAgICAgZGVsZXRlIHBhcmVudERhdGFbcmVzdG9yZWROb2Rlc1tpXS5pZCgpXTtcclxuICAgIH1cclxuICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XHJcbiAgICB0aGlzLnJlcGFpckVkZ2VzKG5vZGUpO1xyXG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gbnVsbDtcclxuXHJcbiAgICBlbGVtZW50VXRpbGl0aWVzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIG5vZGUuY2hpbGRyZW4oKSk7XHJcbiAgICBub2RlLnJlbW92ZURhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpO1xyXG5cclxuICAgIG5vZGUudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBub2RlcyBhcmUgbW92ZWRcclxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kXCIpO1xyXG5cclxuICAgIC8vIElmIGV4cGFuZCBpcyBjYWxsZWQganVzdCBmb3Igb25lIG5vZGUgdGhlbiBjYWxsIGVuZCBvcGVyYXRpb24gdG8gcGVyZm9ybSBsYXlvdXRcclxuICAgIGlmIChzaW5nbGUpIHtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24obGF5b3V0QnkpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLypcclxuICAgKiBBIGhlbHBlciBmdW5jdGlvbiB0byBjb2xsYXBzZSBnaXZlbiBub2RlcyBpbiBhIHNpbXBsZSB3YXkgKFdpdGhvdXQgcGVyZm9ybWluZyBsYXlvdXQgYWZ0ZXJ3YXJkKVxyXG4gICAqIEl0IGNvbGxhcHNlcyBhbGwgcm9vdCBub2RlcyBib3R0b20gdXAuXHJcbiAgICovXHJcbiAgc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgbm9kZXMuZGF0YShcImNvbGxhcHNlXCIsIHRydWUpO1xyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICBcclxuICAgICAgLy8gQ29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlclxyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gZXhwYW5kIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXHJcbiAgICogSXQgZXhwYW5kcyBhbGwgdG9wIG1vc3Qgbm9kZXMgdG9wIGRvd24uXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgbm9kZXMuZGF0YShcImV4cGFuZFwiLCB0cnVlKTsgLy8gTWFyayB0aGF0IHRoZSBub2RlcyBhcmUgc3RpbGwgdG8gYmUgZXhwYW5kZWRcclxuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTsgLy8gRm9yIGVhY2ggcm9vdCBub2RlIGV4cGFuZCB0b3AgZG93blxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBFeHBhbmRzIGFsbCBub2RlcyBieSBleHBhbmRpbmcgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duIHdpdGggdGhlaXIgZGVzY2VuZGFudHMuXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuICAgIGlmIChub2RlcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG5vZGVzID0gY3kubm9kZXMoKTtcclxuICAgIH1cclxuICAgIHZhciBvcnBoYW5zO1xyXG4gICAgb3JwaGFucyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIHZhciBleHBhbmRTdGFjayA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gb3JwaGFuc1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXhwYW5kU3RhY2s7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoZSBvcGVyYXRpb24gdG8gYmUgcGVyZm9ybWVkIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQgcmVhcnJhbmdlIG5vZGVzIGJ5IGxheW91dEJ5IHBhcmFtZXRlci5cclxuICAgKi9cclxuICBlbmRPcGVyYXRpb246IGZ1bmN0aW9uIChsYXlvdXRCeSkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgY3kucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcclxuICAgICAgfSwgMCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIENhbGxzIHNpbXBsZSBleHBhbmRBbGxOb2Rlcy4gVGhlbiBwZXJmb3JtcyBlbmQgb3BlcmF0aW9uLlxyXG4gICAqL1xyXG4gIGV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xyXG4gICAgdmFyIGV4cGFuZGVkU3RhY2sgPSB0aGlzLnNpbXBsZUV4cGFuZEFsbE5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xyXG5cclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gZXhwYW5kZWRTdGFjaztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogRXhwYW5kcyB0aGUgcm9vdCBhbmQgaXRzIGNvbGxhcHNlZCBkZXNjZW5kZW50cyBpbiB0b3AgZG93biBvcmRlci5cclxuICAgKi9cclxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcbiAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgZXhwYW5kU3RhY2sucHVzaChyb290KTtcclxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKG5vZGUsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL0V4cGFuZCB0aGUgZ2l2ZW4gbm9kZXMgcGVyZm9ybSBlbmQgb3BlcmF0aW9uIGFmdGVyIGV4cGFuZGF0aW9uXHJcbiAgZXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7XHJcbiAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHRvIGV4cGFuZCB3ZSBuZWVkIHRvIGFuaW1hdGUgZm9yIGZpc2hleWUgdmlldywgYnV0IGlmIHRoZXJlIGFyZSBtb3JlIHRoZW4gb25lIG5vZGUgd2UgZG8gbm90XHJcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgbm9kZSA9IG5vZGVzWzBdO1xyXG4gICAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgICAvLyBFeHBhbmQgdGhlIGdpdmVuIG5vZGUgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhhdCB0aGUgbm9kZSBpcyBzaW1wbGUgd2hpY2ggZW5zdXJlcyB0aGF0IGZpc2hleWUgcGFyYW1ldGVyIHdpbGwgYmUgY29uc2lkZXJlZFxyXG4gICAgICAgIHRoaXMuZXhwYW5kTm9kZShub2RlLCBvcHRpb25zLmZpc2hleWUsIHRydWUsIG9wdGlvbnMuYW5pbWF0ZSwgb3B0aW9ucy5sYXlvdXRCeSwgb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgIH0gXHJcbiAgICBlbHNlIHtcclxuICAgICAgLy8gRmlyc3QgZXhwYW5kIGdpdmVuIG5vZGVzIGFuZCB0aGVuIHBlcmZvcm0gbGF5b3V0IGFjY29yZGluZyB0byB0aGUgbGF5b3V0QnkgcGFyYW1ldGVyXHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGVzIHRoZW4gcGVyZm9ybSBlbmQgb3BlcmF0aW9uXHJcbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcclxuICAgIC8qXHJcbiAgICAgKiBJbiBjb2xsYXBzZSBvcGVyYXRpb24gdGhlcmUgaXMgbm8gZmlzaGV5ZSB2aWV3IHRvIGJlIGFwcGxpZWQgc28gdGhlcmUgaXMgbm8gYW5pbWF0aW9uIHRvIGJlIGRlc3Ryb3llZCBoZXJlLiBXZSBjYW4gZG8gdGhpcyBcclxuICAgICAqIGluIGEgYmF0Y2guXHJcbiAgICAgKi8gXHJcbiAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICB0aGlzLnNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2Rlcyhub2Rlcy8qLCBvcHRpb25zKi8pO1xyXG4gICAgY3kuZW5kQmF0Y2goKTtcclxuXHJcbiAgICBub2Rlcy50cmlnZ2VyKFwicG9zaXRpb25cIik7IC8vIHBvc2l0aW9uIG5vdCB0cmlnZ2VyZWQgYnkgZGVmYXVsdCB3aGVuIGNvbGxhcHNlTm9kZSBpcyBjYWxsZWRcclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSB0aGUgc3R5bGVcclxuICAgIGN5LnN0eWxlKCkudXBkYXRlKCk7XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XHJcbiAgY29sbGFwc2VCb3R0b21VcDogZnVuY3Rpb24gKHJvb3QpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKG5vZGUpO1xyXG4gICAgfVxyXG4gICAgLy9JZiB0aGUgcm9vdCBpcyBhIGNvbXBvdW5kIG5vZGUgdG8gYmUgY29sbGFwc2VkIHRoZW4gY29sbGFwc2UgaXRcclxuICAgIGlmIChyb290LmRhdGEoXCJjb2xsYXBzZVwiKSAmJiByb290LmNoaWxkcmVuKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICB0aGlzLmNvbGxhcHNlTm9kZShyb290KTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiY29sbGFwc2VcIik7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2V4cGFuZCB0aGUgbm9kZXMgaW4gdG9wIGRvd24gb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxyXG4gIGV4cGFuZFRvcERvd246IGZ1bmN0aW9uIChyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgaWYgKHJvb3QuZGF0YShcImV4cGFuZFwiKSAmJiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICAvLyBFeHBhbmQgdGhlIHJvb3QgYW5kIHVubWFyayBpdHMgZXhwYW5kIGRhdGEgdG8gc3BlY2lmeSB0aGF0IGl0IGlzIG5vIG1vcmUgdG8gYmUgZXhwYW5kZWRcclxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiZXhwYW5kXCIpO1xyXG4gICAgfVxyXG4gICAgLy8gTWFrZSBhIHJlY3Vyc2l2ZSBjYWxsIGZvciBjaGlsZHJlbiBvZiByb290XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihub2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vIENvbnZlcnN0IHRoZSByZW5kZXJlZCBwb3NpdGlvbiB0byBtb2RlbCBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gZ2xvYmFsIHBhbiBhbmQgem9vbSB2YWx1ZXNcclxuICBjb252ZXJ0VG9Nb2RlbFBvc2l0aW9uOiBmdW5jdGlvbiAocmVuZGVyZWRQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcclxuICAgIHZhciB5ID0gKHJlbmRlcmVkUG9zaXRpb24ueSAtIHBhbi55KSAvIHpvb207XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogeCxcclxuICAgICAgeTogeVxyXG4gICAgfTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZS4gSXQgY29uc2lkZXJzIGFwcGx5RmlzaEV5ZVZpZXcsIGFuaW1hdGUgYW5kIGxheW91dEJ5IHBhcmFtZXRlcnMuXHJcbiAgICogSXQgYWxzbyBjb25zaWRlcnMgc2luZ2xlIHBhcmFtZXRlciB3aGljaCBpbmRpY2F0ZXMgaWYgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGFsb25lLiBJZiB0aGlzIHBhcmFtZXRlciBpcyB0cnV0aHkgYWxvbmcgd2l0aCBcclxuICAgKiBhcHBseUZpc2hFeWVWaWV3IHBhcmFtZXRlciB0aGVuIHRoZSBzdGF0ZSBvZiB2aWV3IHBvcnQgaXMgdG8gYmUgY2hhbmdlZCB0byBoYXZlIGV4dHJhIHNwYWNlIG9uIHRoZSBzY3JlZW4gKGlmIG5lZWRlZCkgYmVmb3JlIGFwcGxpeWluZyB0aGVcclxuICAgKiBmaXNoZXllIHZpZXcuXHJcbiAgICovXHJcbiAgZXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBcclxuICAgIHZhciBjb21tb25FeHBhbmRPcGVyYXRpb24gPSBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXcpIHtcclxuXHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLnc7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpc2hleWUgdmlldyBleHBhbmQgdGhlIG5vZGUuXHJcbiAgICAgICAgLy8gVGhlIGZpcnN0IHBhcmFtdGVyIGluZGljYXRlcyB0aGUgbm9kZSB0byBhcHBseSBmaXNoZXllIHZpZXcsIHRoZSB0aGlyZCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoZSBub2RlXHJcbiAgICAgICAgLy8gdG8gYmUgZXhwYW5kZWQgYWZ0ZXIgZmlzaGV5ZSB2aWV3IGlzIGFwcGxpZWQuXHJcbiAgICAgICAgc2VsZi5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLCBzaW5nbGUsIG5vZGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIElmIG9uZSBvZiB0aGVzZSBwYXJhbWV0ZXJzIGlzIHRydXRoeSBpdCBtZWFucyB0aGF0IGV4cGFuZE5vZGVCYXNlRnVuY3Rpb24gaXMgYWxyZWFkeSB0byBiZSBjYWxsZWQuXHJcbiAgICAgIC8vIEhvd2V2ZXIgaWYgbm9uZSBvZiB0aGVtIGlzIHRydXRoeSB3ZSBuZWVkIHRvIGNhbGwgaXQgaGVyZS5cclxuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFwcGx5RmlzaEV5ZVZpZXcgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZSwgc2luZ2xlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlKTtcclxuICAgICAgdmFyIGFuaW1hdGluZyA9IGZhbHNlOyAvLyBWYXJpYWJsZSB0byBjaGVjayBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgYW5pbWF0aW9uLCBpZiB0aGVyZSBpcyBjb21tb25FeHBhbmRPcGVyYXRpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW5pbWF0aW9uXHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiB0aGUgbm9kZSBpcyB0aGUgb25seSBub2RlIHRvIGV4cGFuZCBhbmQgZmlzaGV5ZSB2aWV3IHNob3VsZCBiZSBhcHBsaWVkLCB0aGVuIGNoYW5nZSB0aGUgc3RhdGUgb2Ygdmlld3BvcnQgXHJcbiAgICAgIC8vIHRvIGNyZWF0ZSBtb3JlIHNwYWNlIG9uIHNjcmVlbiAoSWYgbmVlZGVkKVxyXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlldyAmJiBzaW5nbGUpIHtcclxuICAgICAgICB2YXIgdG9wTGVmdFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiAwLCB5OiAwfSk7XHJcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XHJcbiAgICAgICAgdmFyIHBhZGRpbmcgPSA4MDtcclxuICAgICAgICB2YXIgYmIgPSB7XHJcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB4MjogYm90dG9tUmlnaHRQb3NpdGlvbi54LFxyXG4gICAgICAgICAgeTE6IHRvcExlZnRQb3NpdGlvbi55LFxyXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBub2RlQkIgPSB7XHJcbiAgICAgICAgICB4MTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLncgLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHgyOiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggKyBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10udyAvIDIgKyBwYWRkaW5nLFxyXG4gICAgICAgICAgeTE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiAtIHBhZGRpbmcsXHJcbiAgICAgICAgICB5Mjogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ICsgbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLmggLyAyICsgcGFkZGluZ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciB1bmlvbkJCID0gYm91bmRpbmdCb3hVdGlsaXRpZXMuZ2V0VW5pb24obm9kZUJCLCBiYik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSWYgdGhlc2UgYmJveGVzIGFyZSBub3QgZXF1YWwgdGhlbiB3ZSBuZWVkIHRvIGNoYW5nZSB0aGUgdmlld3BvcnQgc3RhdGUgKGJ5IHBhbiBhbmQgem9vbSlcclxuICAgICAgICBpZiAoIWJvdW5kaW5nQm94VXRpbGl0aWVzLmVxdWFsQm91bmRpbmdCb3hlcyh1bmlvbkJCLCBiYikpIHtcclxuICAgICAgICAgIHZhciB2aWV3UG9ydCA9IGN5LmdldEZpdFZpZXdwb3J0KHVuaW9uQkIsIDEwKTtcclxuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgIGFuaW1hdGluZyA9IGFuaW1hdGU7IC8vIFNpZ25hbCB0aGF0IHRoZXJlIGlzIGFuIGFuaW1hdGlvbiBub3cgYW5kIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbmltYXRpb25cclxuICAgICAgICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gYW5pbWF0ZSBkdXJpbmcgcGFuIGFuZCB6b29tXHJcbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICBjeS5hbmltYXRlKHtcclxuICAgICAgICAgICAgICBwYW46IHZpZXdQb3J0LnBhbixcclxuICAgICAgICAgICAgICB6b29tOiB2aWV3UG9ydC56b29tLFxyXG4gICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25EdXJhdGlvbiB8fCAxMDAwXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN5Lnpvb20odmlld1BvcnQuem9vbSk7XHJcbiAgICAgICAgICAgIGN5LnBhbih2aWV3UG9ydC5wYW4pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gSWYgYW5pbWF0aW5nIGlzIG5vdCB0cnVlIHdlIG5lZWQgdG8gY2FsbCBjb21tb25FeHBhbmRPcGVyYXRpb24gaGVyZVxyXG4gICAgICBpZiAoIWFuaW1hdGluZykge1xyXG4gICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGUgd2l0aG91dCBwZXJmb3JtaW5nIGVuZCBvcGVyYXRpb25cclxuICBjb2xsYXBzZU5vZGU6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnLCB7XHJcbiAgICAgICAgeDogbm9kZS5wb3NpdGlvbigpLngsXHJcbiAgICAgICAgeTogbm9kZS5wb3NpdGlvbigpLnlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHc6IG5vZGUub3V0ZXJXaWR0aCgpLFxyXG4gICAgICAgIGg6IG5vZGUub3V0ZXJIZWlnaHQoKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuXHJcbiAgICAgIGNoaWxkcmVuLnVuc2VsZWN0KCk7XHJcbiAgICAgIGNoaWxkcmVuLmNvbm5lY3RlZEVkZ2VzKCkudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWNvbGxhcHNlXCIpO1xyXG4gICAgICBcclxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4obm9kZSk7XHJcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4obm9kZSwgbm9kZSk7XHJcbiAgICAgIG5vZGUuYWRkQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG5cclxuICAgICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJjb2xsYXBzZVwiKTtcclxuICAgICAgXHJcbiAgICAgIG5vZGUucG9zaXRpb24obm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKSk7XHJcblxyXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICBzdG9yZVdpZHRoSGVpZ2h0OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICBpZiAobm9kZSAhPSBudWxsKSB7XHJcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gPSBub2RlLm91dGVyV2lkdGgoKTtcclxuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSA9IG5vZGUub3V0ZXJIZWlnaHQoKTtcclxuXHJcbiAgICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZS5wYXJlbnQoKVswXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgZ2l2ZW4gbm9kZS4gbm9kZVRvRXhwYW5kIHdpbGwgYmUgZXhwYW5kZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbi4gXHJcbiAgICogVGhlIG90aGVyIHBhcmFtZXRlciBhcmUgdG8gYmUgcGFzc2VkIGJ5IHBhcmFtZXRlcnMgZGlyZWN0bHkgaW4gaW50ZXJuYWwgZnVuY3Rpb24gY2FsbHMuXHJcbiAgICovXHJcbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcbiAgICB2YXIgc2libGluZ3MgPSB0aGlzLmdldFNpYmxpbmdzKG5vZGUpO1xyXG5cclxuICAgIHZhciB4X2EgPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG4gICAgdmFyIHlfYSA9IHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcblxyXG4gICAgdmFyIGRfeF9sZWZ0ID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeF9yaWdodCA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcclxuICAgIHZhciBkX3lfdXBwZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcclxuICAgIHZhciBkX3lfbG93ZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcclxuXHJcbiAgICB2YXIgYWJzX2RpZmZfb25feCA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddIC0geF9hKTtcclxuICAgIHZhciBhYnNfZGlmZl9vbl95ID0gTWF0aC5hYnMobm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gLSB5X2EpO1xyXG5cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIExFRlRcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSA+IHhfYSkge1xyXG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0ICsgYWJzX2RpZmZfb25feDtcclxuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0IC0gYWJzX2RpZmZfb25feDtcclxuICAgIH1cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIFJJR0hUXHJcbiAgICBlbHNlIHtcclxuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCAtIGFic19kaWZmX29uX3g7XHJcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCArIGFic19kaWZmX29uX3g7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gVVBcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSA+IHlfYSkge1xyXG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgKyBhYnNfZGlmZl9vbl95O1xyXG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgLSBhYnNfZGlmZl9vbl95O1xyXG4gICAgfVxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gRE9XTlxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciAtIGFic19kaWZmX29uX3k7XHJcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciArIGFic19kaWZmX29uX3k7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHhQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcclxuICAgIHZhciB5UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB4UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy54UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xyXG4gICAgICB5UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy55UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHNpYmxpbmcgPSBzaWJsaW5nc1tpXTtcclxuXHJcbiAgICAgIHZhciB4X2IgPSB4UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xyXG4gICAgICB2YXIgeV9iID0geVBvc0luUGFyZW50U2libGluZ1tpXTtcclxuXHJcbiAgICAgIHZhciBzbG9wZSA9ICh5X2IgLSB5X2EpIC8gKHhfYiAtIHhfYSk7XHJcblxyXG4gICAgICB2YXIgZF94ID0gMDtcclxuICAgICAgdmFyIGRfeSA9IDA7XHJcbiAgICAgIHZhciBUX3ggPSAwO1xyXG4gICAgICB2YXIgVF95ID0gMDtcclxuXHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTEVGVFxyXG4gICAgICBpZiAoeF9hID4geF9iKSB7XHJcbiAgICAgICAgZF94ID0gZF94X2xlZnQ7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBSSUdIVFxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBkX3ggPSBkX3hfcmlnaHQ7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBVUFBFUiBzaWRlXHJcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcclxuICAgICAgICBkX3kgPSBkX3lfdXBwZXI7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMT1dFUiBzaWRlXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGRfeSA9IGRfeV9sb3dlcjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGlzRmluaXRlKHNsb3BlKSkge1xyXG4gICAgICAgIFRfeCA9IE1hdGgubWluKGRfeCwgKGRfeSAvIE1hdGguYWJzKHNsb3BlKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2xvcGUgIT09IDApIHtcclxuICAgICAgICBUX3kgPSBNYXRoLm1pbihkX3ksIChkX3ggKiBNYXRoLmFicyhzbG9wZSkpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHhfYSA+IHhfYikge1xyXG4gICAgICAgIFRfeCA9IC0xICogVF94O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoeV9hID4geV9iKSB7XHJcbiAgICAgICAgVF95ID0gLTEgKiBUX3k7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIE1vdmUgdGhlIHNpYmxpbmcgaW4gdGhlIHNwZWNpYWwgd2F5XHJcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShzaWJsaW5nLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gc2libGluZyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb24gaGVyZSBlbHNlIGl0IGlzIHRvIGJlIGNhbGxlZCBvbmUgb2YgZmlzaEV5ZVZpZXdNb3ZlTm9kZSgpIGNhbGxzXHJcbiAgICBpZiAoc2libGluZ3MubGVuZ3RoID09IDApIHtcclxuICAgICAgdGhpcy5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBsYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xyXG4gICAgICAvLyBBcHBseSBmaXNoZXllIHZpZXcgdG8gdGhlIHBhcmVudCBub2RlIGFzIHdlbGwgKCBJZiBleGlzdHMgKVxyXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUucGFyZW50KClbMF0sIHNpbmdsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH0sXHJcbiAgZ2V0U2libGluZ3M6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICB2YXIgc2libGluZ3M7XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gPT0gbnVsbCkge1xyXG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKFwiOnZpc2libGVcIikub3JwaGFucygpO1xyXG4gICAgICBzaWJsaW5ncyA9IG9ycGhhbnMuZGlmZmVyZW5jZShub2RlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNpYmxpbmdzID0gbm9kZS5zaWJsaW5ncyhcIjp2aXNpYmxlXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzaWJsaW5ncztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogTW92ZSBub2RlIG9wZXJhdGlvbiBzcGVjaWFsaXplZCBmb3IgZmlzaCBleWUgdmlldyBleHBhbmQgb3BlcmF0aW9uXHJcbiAgICogTW92ZXMgdGhlIG5vZGUgYnkgbW92aW5nIGl0cyBkZXNjYW5kZW50cy4gTW92ZW1lbnQgaXMgYW5pbWF0ZWQgaWYgYm90aCBzaW5nbGUgYW5kIGFuaW1hdGUgZmxhZ3MgYXJlIHRydXRoeS5cclxuICAgKi9cclxuICBmaXNoRXllVmlld01vdmVOb2RlOiBmdW5jdGlvbiAobm9kZSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuICAgIHZhciBjaGlsZHJlbkxpc3QgPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICBpZihub2RlLmlzUGFyZW50KCkpe1xyXG4gICAgICAgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbihcIjp2aXNpYmxlXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgXHJcbiAgICAvKlxyXG4gICAgICogSWYgdGhlIG5vZGUgaXMgc2ltcGxlIG1vdmUgaXRzZWxmIGRpcmVjdGx5IGVsc2UgbW92ZSBpdCBieSBtb3ZpbmcgaXRzIGNoaWxkcmVuIGJ5IGEgc2VsZiByZWN1cnNpdmUgY2FsbFxyXG4gICAgICovXHJcbiAgICBpZiAoY2hpbGRyZW5MaXN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHZhciBuZXdQb3NpdGlvbiA9IHt4OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnggKyBUX3gsIHk6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSArIFRfeX07XHJcbiAgICAgIGlmICghc2luZ2xlIHx8ICFhbmltYXRlKSB7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ID0gbmV3UG9zaXRpb24ueDtcclxuICAgICAgICBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgPSBuZXdQb3NpdGlvbi55O1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCsrO1xyXG4gICAgICAgIG5vZGUuYW5pbWF0ZSh7XHJcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXHJcbiAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQtLTtcclxuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgIW5vZGVUb0V4cGFuZC5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcclxuXHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBJZiBhbGwgbm9kZXMgYXJlIG1vdmVkIHdlIGFyZSByZWFkeSB0byBleHBhbmQgc28gY2FsbCBleHBhbmQgbm9kZSBiYXNlIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xyXG5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICBkdXJhdGlvbjogYW5pbWF0aW9uRHVyYXRpb24gfHwgMTAwMFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoY2hpbGRyZW5MaXN0W2ldLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHhQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuICAgIHZhciB4X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeF9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd4JykgKyAocGFyZW50LndpZHRoKCkgLyAyKTtcclxuICAgIH1cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucG9zaXRpb24oJ3gnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geF9hO1xyXG4gIH0sXHJcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xyXG5cclxuICAgIHZhciB5X2EgPSAwLjA7XHJcblxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgeV9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd5JykgKyAocGFyZW50LmhlaWdodCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHlfYTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxyXG4gICAqIHdpdGggdGhlIHNhbWUgcm9vdCBwYXJhbWV0ZXIsXHJcbiAgICogcmVtb3ZlIHRoZSBjaGlsZCBhbmQgYWRkIHRoZSByZW1vdmVkIGNoaWxkIHRvIHRoZSBjb2xsYXBzZWRjaGlsZHJlbiBkYXRhXHJcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXHJcbiAgICogcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuIGtlZXBzIHRoZSBub2RlcyB0byByZXN0b3JlIHdoZW4gdGhlXHJcbiAgICogcm9vdCBpcyBleHBhbmRlZFxyXG4gICAqL1xyXG4gIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkge1xyXG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihjaGlsZCwgcm9vdCk7XHJcbiAgICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xyXG4gICAgICBwYXJlbnREYXRhW2NoaWxkLmlkKCldID0gY2hpbGQucGFyZW50KCk7XHJcbiAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XHJcbiAgICAgIHZhciByZW1vdmVkQ2hpbGQgPSBjaGlsZC5yZW1vdmUoKTtcclxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZENoaWxkO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi51bmlvbihyZW1vdmVkQ2hpbGQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBpc01ldGFFZGdlOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICByZXR1cm4gZWRnZS5oYXNDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XHJcbiAgfSxcclxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciByZWxhdGVkTm9kZXMgPSBub2RlLmRlc2NlbmRhbnRzKCk7XHJcbiAgICB2YXIgZWRnZXMgPSByZWxhdGVkTm9kZXMuZWRnZXNXaXRoKGN5Lm5vZGVzKCkubm90KHJlbGF0ZWROb2Rlcy51bmlvbihub2RlKSkpO1xyXG4gICAgXHJcbiAgICB2YXIgcmVsYXRlZE5vZGVNYXAgPSB7fTtcclxuICAgIFxyXG4gICAgcmVsYXRlZE5vZGVzLmVhY2goZnVuY3Rpb24oZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlbGF0ZWROb2RlTWFwW2VsZS5pZCgpXSA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgc291cmNlID0gZWRnZS5zb3VyY2UoKTtcclxuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXRoaXMuaXNNZXRhRWRnZShlZGdlKSkgeyAvLyBpcyBvcmlnaW5hbFxyXG4gICAgICAgIHZhciBvcmlnaW5hbEVuZHNEYXRhID0ge1xyXG4gICAgICAgICAgc291cmNlOiBzb3VyY2UsXHJcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XHJcbiAgICAgICAgZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnLCBvcmlnaW5hbEVuZHNEYXRhKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgZWRnZS5tb3ZlKHtcclxuICAgICAgICB0YXJnZXQ6ICFyZWxhdGVkTm9kZU1hcFt0YXJnZXQuaWQoKV0gPyB0YXJnZXQuaWQoKSA6IG5vZGUuaWQoKSxcclxuICAgICAgICBzb3VyY2U6ICFyZWxhdGVkTm9kZU1hcFtzb3VyY2UuaWQoKV0gPyBzb3VyY2UuaWQoKSA6IG5vZGUuaWQoKVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9LFxyXG4gIGZpbmROZXdFbmQ6IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciBjdXJyZW50ID0gbm9kZTtcclxuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xyXG4gICAgdmFyIHBhcmVudCA9IHBhcmVudERhdGFbY3VycmVudC5pZCgpXTtcclxuICAgIFxyXG4gICAgd2hpbGUoICFjdXJyZW50Lmluc2lkZSgpICkge1xyXG4gICAgICBjdXJyZW50ID0gcGFyZW50O1xyXG4gICAgICBwYXJlbnQgPSBwYXJlbnREYXRhW3BhcmVudC5pZCgpXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgfSxcclxuICByZXBhaXJFZGdlczogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgdmFyIGNvbm5lY3RlZE1ldGFFZGdlcyA9IG5vZGUuY29ubmVjdGVkRWRnZXMoJy5jeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XHJcbiAgICBcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29ubmVjdGVkTWV0YUVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gY29ubmVjdGVkTWV0YUVkZ2VzW2ldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxFbmRzID0gZWRnZS5kYXRhKCdvcmlnaW5hbEVuZHMnKTtcclxuICAgICAgdmFyIGN1cnJlbnRTcmNJZCA9IGVkZ2UuZGF0YSgnc291cmNlJyk7XHJcbiAgICAgIHZhciBjdXJyZW50VGd0SWQgPSBlZGdlLmRhdGEoJ3RhcmdldCcpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCBjdXJyZW50U3JjSWQgPT09IG5vZGUuaWQoKSApIHtcclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcclxuICAgICAgICAgIHNvdXJjZTogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy5zb3VyY2UpLmlkKClcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcclxuICAgICAgICAgIHRhcmdldDogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy50YXJnZXQpLmlkKClcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYgKCBlZGdlLmRhdGEoJ3NvdXJjZScpID09PSBvcmlnaW5hbEVuZHMuc291cmNlLmlkKCkgJiYgZWRnZS5kYXRhKCd0YXJnZXQnKSA9PT0gb3JpZ2luYWxFbmRzLnRhcmdldC5pZCgpICkge1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcclxuICAgICAgICBlZGdlLnJlbW92ZURhdGEoJ29yaWdpbmFsRW5kcycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKm5vZGUgaXMgYW4gb3V0ZXIgbm9kZSBvZiByb290XHJcbiAgIGlmIHJvb3QgaXMgbm90IGl0J3MgYW5jaGVzdG9yXHJcbiAgIGFuZCBpdCBpcyBub3QgdGhlIHJvb3QgaXRzZWxmKi9cclxuICBpc091dGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xyXG4gICAgdmFyIHRlbXAgPSBub2RlO1xyXG4gICAgd2hpbGUgKHRlbXAgIT0gbnVsbCkge1xyXG4gICAgICBpZiAodGVtcCA9PSByb290KSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSxcclxuICAvKipcclxuICAgKiBHZXQgYWxsIGNvbGxhcHNlZCBjaGlsZHJlbiAtIGluY2x1ZGluZyBuZXN0ZWQgb25lc1xyXG4gICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxyXG4gICAqIEBwYXJhbSBjb2xsYXBzZWRDaGlsZHJlbiA6IGEgY29sbGVjdGlvbiB0byBzdG9yZSB0aGUgcmVzdWx0XHJcbiAgICogQHJldHVybiA6IGNvbGxhcHNlZCBjaGlsZHJlblxyXG4gICAqL1xyXG4gIGdldENvbGxhcHNlZENoaWxkcmVuUmVjdXJzaXZlbHk6IGZ1bmN0aW9uKG5vZGUsIGNvbGxhcHNlZENoaWxkcmVuKXtcclxuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKSB8fCBbXTtcclxuICAgIHZhciBpO1xyXG4gICAgZm9yIChpPTA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XHJcbiAgICAgIGlmIChjaGlsZHJlbltpXS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpKXtcclxuICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjaGlsZHJlbltpXSwgY29sbGFwc2VkQ2hpbGRyZW4pKTtcclxuICAgICAgfVxyXG4gICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKGNoaWxkcmVuW2ldKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcclxuICB9XHJcbn1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXM7XHJcbiIsIjtcclxuKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcclxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiAoY3l0b3NjYXBlKSB7XHJcblxyXG4gICAgaWYgKCFjeXRvc2NhcGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcclxuXHJcbiAgICB2YXIgdW5kb1JlZG9VdGlsaXRpZXMgPSByZXF1aXJlKCcuL3VuZG9SZWRvVXRpbGl0aWVzJyk7XHJcbiAgICB2YXIgY3VlVXRpbGl0aWVzID0gcmVxdWlyZShcIi4vY3VlVXRpbGl0aWVzXCIpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGV4dGVuZE9wdGlvbnMob3B0aW9ucywgZXh0ZW5kQnkpIHtcclxuICAgICAgdmFyIHRlbXBPcHRzID0ge307XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKVxyXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XHJcblxyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gZXh0ZW5kQnkpXHJcbiAgICAgICAgaWYgKHRlbXBPcHRzLmhhc093blByb3BlcnR5KGtleSkpXHJcbiAgICAgICAgICB0ZW1wT3B0c1trZXldID0gZXh0ZW5kQnlba2V5XTtcclxuICAgICAgcmV0dXJuIHRlbXBPcHRzO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBldmFsdWF0ZSBzb21lIHNwZWNpZmljIG9wdGlvbnMgaW4gY2FzZSBvZiB0aGV5IGFyZSBzcGVjaWZpZWQgYXMgZnVuY3Rpb25zIHRvIGJlIGR5bmFtaWNhbGx5IGNoYW5nZWRcclxuICAgIGZ1bmN0aW9uIGV2YWxPcHRpb25zKG9wdGlvbnMpIHtcclxuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcclxuICAgICAgdmFyIGZpc2hleWUgPSB0eXBlb2Ygb3B0aW9ucy5maXNoZXllID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5maXNoZXllLmNhbGwoKSA6IG9wdGlvbnMuZmlzaGV5ZTtcclxuICAgICAgXHJcbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XHJcbiAgICAgIG9wdGlvbnMuZmlzaGV5ZSA9IGZpc2hleWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5LCBleHBhbmRDb2xsYXBzZVV0aWxpdGllcykge1xyXG4gICAgICB2YXIgYXBpID0ge307IC8vIEFQSSB0byBiZSByZXR1cm5lZFxyXG4gICAgICAvLyBzZXQgZnVuY3Rpb25zXHJcblxyXG4gICAgICBmdW5jdGlvbiBoYW5kbGVOZXdPcHRpb25zKCBvcHRzICkge1xyXG4gICAgICAgIHZhciBjdXJyZW50T3B0cyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgaWYgKCBvcHRzLmN1ZUVuYWJsZWQgJiYgIWN1cnJlbnRPcHRzLmN1ZUVuYWJsZWQgKSB7XHJcbiAgICAgICAgICBhcGkuZW5hYmxlQ3VlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCAhb3B0cy5jdWVFbmFibGVkICYmIGN1cnJlbnRPcHRzLmN1ZUVuYWJsZWQgKSB7XHJcbiAgICAgICAgICBhcGkuZGlzYWJsZUN1ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gc2V0IGFsbCBvcHRpb25zIGF0IG9uY2VcclxuICAgICAgYXBpLnNldE9wdGlvbnMgPSBmdW5jdGlvbihvcHRzKSB7XHJcbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhvcHRzKTtcclxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdHMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXBpLmV4dGVuZE9wdGlvbnMgPSBmdW5jdGlvbihvcHRzKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyggb3B0aW9ucywgb3B0cyApO1xyXG4gICAgICAgIGhhbmRsZU5ld09wdGlvbnMobmV3T3B0aW9ucyk7XHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBuZXdPcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gc2V0IHRoZSBvcHRpb24gd2hvc2UgbmFtZSBpcyBnaXZlblxyXG4gICAgICBhcGkuc2V0T3B0aW9uID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIG9wdHMgPSB7fTtcclxuICAgICAgICBvcHRzWyBuYW1lIF0gPSB2YWx1ZTtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyggb3B0aW9ucywgb3B0cyApO1xyXG5cclxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG5ld09wdGlvbnMpO1xyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5jb2xsYXBzZSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5jb2xsYXBzZUdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyByZWN1cnNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5jb2xsYXBzZVJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XHJcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2UoZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5leHBhbmQgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGV4cGFuZCBnaXZlbiBlbGVzIHJlY3VzaXZlbHkgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxyXG4gICAgICBhcGkuZXhwYW5kUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XHJcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcclxuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRBbGxOb2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG5cclxuICAgICAgLy8gQ29yZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgIC8vIGNvbGxhcHNlIGFsbCBjb2xsYXBzaWJsZSBub2Rlc1xyXG4gICAgICBhcGkuY29sbGFwc2VBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2VSZWN1cnNpdmVseSh0aGlzLmNvbGxhcHNpYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZXhwYW5kIGFsbCBleHBhbmRhYmxlIG5vZGVzXHJcbiAgICAgIGFwaS5leHBhbmRBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVjdXJzaXZlbHkodGhpcy5leHBhbmRhYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuXHJcbiAgICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXHJcblxyXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGV4cGFuZGFibGVcclxuICAgICAgYXBpLmlzRXhwYW5kYWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gcmV0dXJucyBpZiB0aGUgZ2l2ZW4gbm9kZSBpcyBjb2xsYXBzaWJsZVxyXG4gICAgICBhcGkuaXNDb2xsYXBzaWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuICF0aGlzLmlzRXhwYW5kYWJsZShub2RlKSAmJiBub2RlLmlzUGFyZW50KCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBnZXQgY29sbGFwc2libGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXHJcbiAgICAgIGFwaS5jb2xsYXBzaWJsZU5vZGVzID0gZnVuY3Rpb24gKF9ub2Rlcykge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xyXG4gICAgICAgIHJldHVybiBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBlbGUgPSBpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHNlbGYuaXNDb2xsYXBzaWJsZShlbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZ2V0IGV4cGFuZGFibGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXHJcbiAgICAgIGFwaS5leHBhbmRhYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub2RlcyA9IF9ub2RlcyA/IF9ub2RlcyA6IGN5Lm5vZGVzKCk7XHJcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgICAgIGVsZSA9IGk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gc2VsZi5pc0V4cGFuZGFibGUoZWxlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfTtcclxuICAgICAgXHJcbiAgICAgIC8vIEdldCB0aGUgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIGNvbGxhcHNlZCBub2RlIHdoaWNoIGFyZSByZW1vdmVkIGR1cmluZyBjb2xsYXBzZSBvcGVyYXRpb25cclxuICAgICAgYXBpLmdldENvbGxhcHNlZENoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLyoqIEdldCBjb2xsYXBzZWQgY2hpbGRyZW4gcmVjdXJzaXZlbHkgaW5jbHVkaW5nIG5lc3RlZCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICogUmV0dXJuZWQgdmFsdWUgaW5jbHVkZXMgZWRnZXMgYW5kIG5vZGVzLCB1c2Ugc2VsZWN0b3IgdG8gZ2V0IGVkZ2VzIG9yIG5vZGVzXHJcbiAgICAgICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxyXG4gICAgICAgKiBAcmV0dXJuIGFsbCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICovXHJcbiAgICAgIGFwaS5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShub2RlLCBjb2xsYXBzZWRDaGlsZHJlbik7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiBvZiBhbGwgY29sbGFwc2VkIG5vZGVzIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXHJcbiAgICAgICAqIFJldHVybmVkIHZhbHVlIGluY2x1ZGVzIGVkZ2VzIGFuZCBub2RlcywgdXNlIHNlbGVjdG9yIHRvIGdldCBlZGdlcyBvciBub2Rlc1xyXG4gICAgICAgKiBAcmV0dXJuIGFsbCBjb2xsYXBzZWQgY2hpbGRyZW5cclxuICAgICAgICovXHJcbiAgICAgIGFwaS5nZXRBbGxDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24oKXtcclxuICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICAgICAgdmFyIGNvbGxhcHNlZE5vZGVzID0gY3kubm9kZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlXCIpO1xyXG4gICAgICAgIHZhciBqO1xyXG4gICAgICAgIGZvciAoaj0wOyBqIDwgY29sbGFwc2VkTm9kZXMubGVuZ3RoOyBqKyspe1xyXG4gICAgICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjb2xsYXBzZWROb2Rlc1tqXSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICAgIH07XHJcbiAgICAgIC8vIFRoaXMgbWV0aG9kIGZvcmNlcyB0aGUgdmlzdWFsIGN1ZSB0byBiZSBjbGVhcmVkLiBJdCBpcyB0byBiZSBjYWxsZWQgaW4gZXh0cmVtZSBjYXNlc1xyXG4gICAgICBhcGkuY2xlYXJWaXN1YWxDdWUgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgY3kudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFwaS5kaXNhYmxlQ3VlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIGlmIChvcHRpb25zLmN1ZUVuYWJsZWQpIHtcclxuICAgICAgICAgIGN1ZVV0aWxpdGllcygndW5iaW5kJywgY3ksIGFwaSk7XHJcbiAgICAgICAgICBvcHRpb25zLmN1ZUVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZW5hYmxlQ3VlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xyXG4gICAgICAgIGlmICghb3B0aW9ucy5jdWVFbmFibGVkKSB7XHJcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3JlYmluZCcsIGN5LCBhcGkpO1xyXG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhcGkuZ2V0UGFyZW50ID0gZnVuY3Rpb24obm9kZUlkKSB7XHJcbiAgICAgICAgaWYoY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKVswXSA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIHZhciBwYXJlbnREYXRhID0gZ2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnKTtcclxuICAgICAgICAgIHJldHVybiBwYXJlbnREYXRhW25vZGVJZF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICByZXR1cm4gY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKS5wYXJlbnQoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4gYXBpOyAvLyBSZXR1cm4gdGhlIEFQSSBpbnN0YW5jZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCB0aGUgd2hvbGUgc2NyYXRjaHBhZCByZXNlcnZlZCBmb3IgdGhpcyBleHRlbnNpb24gKG9uIGFuIGVsZW1lbnQgb3IgY29yZSkgb3IgZ2V0IGEgc2luZ2xlIHByb3BlcnR5IG9mIGl0XHJcbiAgICBmdW5jdGlvbiBnZXRTY3JhdGNoIChjeU9yRWxlLCBuYW1lKSB7XHJcbiAgICAgIGlmIChjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGN5T3JFbGUuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnLCB7fSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBzY3JhdGNoID0gY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xyXG4gICAgICB2YXIgcmV0VmFsID0gKCBuYW1lID09PSB1bmRlZmluZWQgKSA/IHNjcmF0Y2ggOiBzY3JhdGNoW25hbWVdO1xyXG4gICAgICByZXR1cm4gcmV0VmFsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNldCBhIHNpbmdsZSBwcm9wZXJ0eSBvbiBzY3JhdGNocGFkIG9mIGFuIGVsZW1lbnQgb3IgdGhlIGNvcmVcclxuICAgIGZ1bmN0aW9uIHNldFNjcmF0Y2ggKGN5T3JFbGUsIG5hbWUsIHZhbCkge1xyXG4gICAgICBnZXRTY3JhdGNoKGN5T3JFbGUpW25hbWVdID0gdmFsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJlZ2lzdGVyIHRoZSBleHRlbnNpb24gY3kuZXhwYW5kQ29sbGFwc2UoKVxyXG4gICAgY3l0b3NjYXBlKFwiY29yZVwiLCBcImV4cGFuZENvbGxhcHNlXCIsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJykgfHwge1xyXG4gICAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQncyBqdXN0IGxheW91dCBvcHRpb25zIG9yIHdob2xlIGxheW91dCBmdW5jdGlvbi4gQ2hvb3NlIHlvdXIgc2lkZSFcclxuICAgICAgICBmaXNoZXllOiB0cnVlLCAvLyB3aGV0aGVyIHRvIHBlcmZvcm0gZmlzaGV5ZSB2aWV3IGFmdGVyIGV4cGFuZC9jb2xsYXBzZSB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiB0b29cclxuICAgICAgICBhbmltYXRlOiB0cnVlLCAvLyB3aGV0aGVyIHRvIGFuaW1hdGUgb24gZHJhd2luZyBjaGFuZ2VzIHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHRvb1xyXG4gICAgICAgIGFuaW1hdGlvbkR1cmF0aW9uOiAxMDAwLCAvLyB3aGVuIGFuaW1hdGUgaXMgdHJ1ZSwgdGhlIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyBvZiB0aGUgYW5pbWF0aW9uXHJcbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHsgfSwgLy8gY2FsbGJhY2sgd2hlbiBleHBhbmQvY29sbGFwc2UgaW5pdGlhbGl6ZWRcclxuICAgICAgICB1bmRvYWJsZTogdHJ1ZSwgLy8gYW5kIGlmIHVuZG9SZWRvRXh0ZW5zaW9uIGV4aXN0cyxcclxuXHJcbiAgICAgICAgY3VlRW5hYmxlZDogdHJ1ZSwgLy8gV2hldGhlciBjdWVzIGFyZSBlbmFibGVkXHJcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjogJ3RvcC1sZWZ0JywgLy8gZGVmYXVsdCBjdWUgcG9zaXRpb24gaXMgdG9wIGxlZnQgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gcGVyIG5vZGUgdG9vXHJcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVTaXplOiAxMiwgLy8gc2l6ZSBvZiBleHBhbmQtY29sbGFwc2UgY3VlXHJcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTogOCwgLy8gc2l6ZSBvZiBsaW5lcyB1c2VkIGZvciBkcmF3aW5nIHBsdXMtbWludXMgaWNvbnNcclxuICAgICAgICBleHBhbmRDdWVJbWFnZTogdW5kZWZpbmVkLCAvLyBpbWFnZSBvZiBleHBhbmQgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGV4cGFuZCBjdWVcclxuICAgICAgICBjb2xsYXBzZUN1ZUltYWdlOiB1bmRlZmluZWQsIC8vIGltYWdlIG9mIGNvbGxhcHNlIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBjb2xsYXBzZSBjdWVcclxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5OiAxIC8vIHNlbnNpdGl2aXR5IG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVzXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBJZiBvcHRzIGlzIG5vdCAnZ2V0JyB0aGF0IGlzIGl0IGlzIGEgcmVhbCBvcHRpb25zIG9iamVjdCB0aGVuIGluaXRpbGl6ZSB0aGUgZXh0ZW5zaW9uXHJcbiAgICAgIGlmIChvcHRzICE9PSAnZ2V0Jykge1xyXG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xyXG5cclxuICAgICAgICB2YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzJykoY3kpO1xyXG4gICAgICAgIHZhciBhcGkgPSBjcmVhdGVFeHRlbnNpb25BUEkoY3ksIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKTsgLy8gY3JlYXRlcyBhbmQgcmV0dXJucyB0aGUgQVBJIGluc3RhbmNlIGZvciB0aGUgZXh0ZW5zaW9uXHJcblxyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdhcGknLCBhcGkpO1xyXG5cclxuICAgICAgICB1bmRvUmVkb1V0aWxpdGllcyhjeSwgYXBpKTtcclxuXHJcbiAgICAgICAgY3VlVXRpbGl0aWVzKG9wdGlvbnMsIGN5LCBhcGkpO1xyXG5cclxuICAgICAgICAvLyBpZiB0aGUgY3VlIGlzIG5vdCBlbmFibGVkIHVuYmluZCBjdWUgZXZlbnRzXHJcbiAgICAgICAgaWYoIW9wdGlvbnMuY3VlRW5hYmxlZCkge1xyXG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCd1bmJpbmQnLCBjeSwgYXBpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICggb3B0aW9ucy5yZWFkeSApIHtcclxuICAgICAgICAgIG9wdGlvbnMucmVhZHkoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHZhciBwYXJlbnREYXRhID0ge307XHJcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnLCBwYXJlbnREYXRhKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGdldFNjcmF0Y2goY3ksICdhcGknKTsgLy8gRXhwb3NlIHRoZSBBUEkgdG8gdGhlIHVzZXJzXHJcbiAgICB9KTtcclxuICB9O1xyXG4gIFxyXG5cclxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXHJcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1leHBhbmQtY29sbGFwc2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiByZWdpc3RlcjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgICAgcmVnaXN0ZXIoY3l0b3NjYXBlKTtcclxuICB9XHJcblxyXG59KSgpO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgYXBpKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHt9LCB0cnVlKTtcclxuXHJcbiAgZnVuY3Rpb24gZ2V0RWxlcyhfZWxlcykge1xyXG4gICAgcmV0dXJuICh0eXBlb2YgX2VsZXMgPT09IFwic3RyaW5nXCIpID8gY3kuJChfZWxlcykgOiBfZWxlcztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldE5vZGVQb3NpdGlvbnMoKSB7XHJcbiAgICB2YXIgcG9zaXRpb25zID0ge307XHJcbiAgICB2YXIgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVsZSA9IG5vZGVzW2ldO1xyXG4gICAgICBwb3NpdGlvbnNbZWxlLmlkKCldID0ge1xyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwb3NpdGlvbnM7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXR1cm5Ub1Bvc2l0aW9ucyhwb3NpdGlvbnMpIHtcclxuICAgIHZhciBjdXJyZW50UG9zaXRpb25zID0ge307XHJcbiAgICBjeS5ub2RlcygpLnBvc2l0aW9ucyhmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRQb3NpdGlvbnNbZWxlLmlkKCldID0ge1xyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcG9zID0gcG9zaXRpb25zW2VsZS5pZCgpXTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBwb3MueCxcclxuICAgICAgICB5OiBwb3MueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnM7XHJcbiAgfVxyXG5cclxuICB2YXIgc2Vjb25kVGltZU9wdHMgPSB7XHJcbiAgICBsYXlvdXRCeTogbnVsbCxcclxuICAgIGFuaW1hdGU6IGZhbHNlLFxyXG4gICAgZmlzaGV5ZTogZmFsc2VcclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBkb0l0KGZ1bmMpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICAgIHZhciBub2RlcyA9IGdldEVsZXMoYXJncy5ub2Rlcyk7XHJcbiAgICAgIGlmIChhcmdzLmZpcnN0VGltZSkge1xyXG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9ucygpO1xyXG4gICAgICAgIHJlc3VsdC5ub2RlcyA9IGZ1bmMuaW5kZXhPZihcIkFsbFwiKSA+IDAgPyBhcGlbZnVuY10oYXJncy5vcHRpb25zKSA6IGFwaVtmdW5jXShub2RlcywgYXJncy5vcHRpb25zKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHQub2xkRGF0YSA9IGdldE5vZGVQb3NpdGlvbnMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKHNlY29uZFRpbWVPcHRzKSA6IGFwaVtmdW5jXShjeS5jb2xsZWN0aW9uKG5vZGVzKSwgc2Vjb25kVGltZU9wdHMpO1xyXG4gICAgICAgIHJldHVyblRvUG9zaXRpb25zKGFyZ3Mub2xkRGF0YSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdmFyIGFjdGlvbnMgPSBbXCJjb2xsYXBzZVwiLCBcImNvbGxhcHNlUmVjdXJzaXZlbHlcIiwgXCJjb2xsYXBzZUFsbFwiLCBcImV4cGFuZFwiLCBcImV4cGFuZFJlY3Vyc2l2ZWx5XCIsIFwiZXhwYW5kQWxsXCJdO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgIHVyLmFjdGlvbihhY3Rpb25zW2ldLCBkb0l0KGFjdGlvbnNbaV0pLCBkb0l0KGFjdGlvbnNbKGkgKyAzKSAlIDZdKSk7XHJcbiAgfVxyXG5cclxufTtcclxuIl19
