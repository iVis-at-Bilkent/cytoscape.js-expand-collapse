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
      $canvas.classList.add("expand-collapse-canvas");
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
        cy.on('resize', data.eCyResize = function () {
          sizeCanvas();
        });

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
		cy.on('mousedown', data.eMouseDown = function(e){
			oldMousePos = e.renderedPosition || e.cyRenderedPosition
		});
		cy.on('mouseup', data.eMouseUp = function(e){
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

		cy.on('tap', data.eTap = function (event) {
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
          
            if(node.selectable()){
              node.unselectify();
              cy.scratch('_cyExpandCollapse').selectableChanged = true;
            }          
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
          .off('zoom pan', data.eZoom)
          .off('resize', data.eCyResize);
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
        .on('zoom pan', data.eZoom)
        .on('resize', data.eCyResize);
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
  /*********** start section edge expand collapse  */
  collapseGivenEdges :  function(edges, options){
    var nodes = this.isValidEdgesForCollapse(edges);
    if(!nodes){
      return;
    }
    var edgesToCollapse = {};
   
    //group edges by type if this option is set to true
    if(options.GroupEdgesOfSameTypeOnCollapse){      
      edges.forEach(function(edge){
        var edgeType = options.edgeTypeInfo instanceof Function ? options.edgeTypeInfo.call(edge) : edge.data()[options.edgeTypeInfo];
        if(edgesToCollapse.hasOwnProperty(edgeType)){
          edgesToCollapse[edgeType].push(edge);
        }else{
          edgesToCollapse[edgeType] = [].concat([edge]); 
        }
      });
    }else{
      edgesToCollapse["unknown"] = edges;
    }

    var newEdges = [];
    for(const edgeGroupType in edgesToCollapse){
      var newEdge = {};
      newEdge.data = {};
      newEdge.data.source = nodes[0].id();
      newEdge.data.target = nodes[1].id();
      newEdge.data.id = "collapsedEdge_"+nodes[0].id() + "_"+nodes[1].id()+"_"+edgeGroupType;

      newEdge.data.collapsedEdges = [];
      edgesToCollapse[edgeGroupType].forEach(function(edge){
        newEdge.data.collapsedEdges.push({data: edge.data(),classes:edge.classes()});
      });
     
      var edgesTypeField = options.edgeTypeInfo instanceof Function ? "edgeType" : options.edgeTypeInfo;
      newEdge.data[edgesTypeField] = edgeGroupType;
      newEdge.classes = "collapsedEdge";
     
      newEdges.push(newEdge);
    }
   
    cy.remove(edges);
    cy.add(newEdges);
    
    return newEdges;
  },

  expandEdge : function(edge){
    var edges = edge.data().collapsedEdges;        
        if(edges != undefined && edges.length > 0){
          cy.remove(edge);
          var restoredEdges = [];
          edges.forEach(function(restoredEdge){
            restoredEdge.group = "edges";
            restoredEdges.push(restoredEdge);
          });
          cy.add(restoredEdges);
        }
  },

  //if the edges are only between two nodes (valid for collpasing) returns the two nodes else it returns false
  isValidEdgesForCollapse : function(edges){
    var endPoints = this.getEdgesDistinctEndPoints(edges);
    if(endPoints.length != 2){
      return false;
    }else{
      return endPoints;
    }
  },

  //returns a list of distinct endpoints of a set of edges.
  getEdgesDistinctEndPoints : function(edges){
    var endPoints = [];
    edges.forEach(function(edge){
      if(!this.containsElement(endPoints,edge.source())){
        endPoints.push(edge.source());
      }
      
      if(!this.containsElement(endPoints,edge.target())){
        endPoints.push(edge.target());
      }
      
    }.bind(this));

    return endPoints;

  },

  //function to check if a list of elements contains the given element by looking at id()
  containsElement : function(elements, element){
    var exists = false;
    for(var i = 0 ; i<elements.length ; i++){
      if(elements[i].id() == element.id()){
        exists = true;
        break;
      }
    }
    return exists;
  }
  /***********end section edge expand collapse */
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
        if(edges.length < 2) return;
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);       
     

        return expandCollapseUtilities.collapseGivenEdges(edges, tempOptions);
      };
      api.collapseEdgesBetweenNodes = function(nodes, opts){
     
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
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');         
          this.collapseEdges(edges, opts);
        }.bind(this));       
     
      

      };

      api.collapseAllEdges = function(options){

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
        var nodesPairs = pairwise(cy.edges().connectedNodes());
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');         
          this.collapseEdges(edges, options);
        }.bind(this));

      };

      api.expandEdge = function(edge){        

        return expandCollapseUtilities.expandEdge(edge);
      };

      api.expandEdges = function(edges){        

        edges.forEach(function(edge){
          expandCollapseUtilities.expandEdge(edge);
        })
      };

      api.expandAllEdges = function(){
        var edges = cy.edges(".collapsedEdge");
       edges.forEach(function(edge){
         this.expandEdge(edge);
       }.bind(this));

       
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
       
        edgeTypeInfo : 'edgeType', //the name of the field that has the edge type, retrieved from edge.data(), can be a function
        GroupEdgesOfSameTypeOnCollapse : false,
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

};

},{}]},{},[6])(6)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2VsZW1lbnRVdGlsaXRpZXMuanMiLCJzcmMvZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvdW5kb1JlZG9VdGlsaXRpZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNweEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSB7XG4gIGVxdWFsQm91bmRpbmdCb3hlczogZnVuY3Rpb24oYmIxLCBiYjIpe1xuICAgICAgcmV0dXJuIGJiMS54MSA9PSBiYjIueDEgJiYgYmIxLngyID09IGJiMi54MiAmJiBiYjEueTEgPT0gYmIyLnkxICYmIGJiMS55MiA9PSBiYjIueTI7XG4gIH0sXG4gIGdldFVuaW9uOiBmdW5jdGlvbihiYjEsIGJiMil7XG4gICAgICB2YXIgdW5pb24gPSB7XG4gICAgICB4MTogTWF0aC5taW4oYmIxLngxLCBiYjIueDEpLFxuICAgICAgeDI6IE1hdGgubWF4KGJiMS54MiwgYmIyLngyKSxcbiAgICAgIHkxOiBNYXRoLm1pbihiYjEueTEsIGJiMi55MSksXG4gICAgICB5MjogTWF0aC5tYXgoYmIxLnkyLCBiYjIueTIpLFxuICAgIH07XG5cbiAgICB1bmlvbi53ID0gdW5pb24ueDIgLSB1bmlvbi54MTtcbiAgICB1bmlvbi5oID0gdW5pb24ueTIgLSB1bmlvbi55MTtcblxuICAgIHJldHVybiB1bmlvbjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBib3VuZGluZ0JveFV0aWxpdGllczsiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3ksIGFwaSkge1xuICB2YXIgZWxlbWVudFV0aWxpdGllcztcbiAgdmFyIGZuID0gcGFyYW1zO1xuXG4gIHZhciBub2RlV2l0aFJlbmRlcmVkQ3VlLCBwcmV2ZW50RHJhd2luZyA9IGZhbHNlO1xuXG4gIGNvbnN0IGdldERhdGEgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzY3JhdGNoID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKTtcbiAgICByZXR1cm4gc2NyYXRjaCAmJiBzY3JhdGNoLmN1ZVV0aWxpdGllcztcbiAgfTtcblxuICBjb25zdCBzZXREYXRhID0gZnVuY3Rpb24oIGRhdGEgKXtcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XG4gICAgaWYgKHNjcmF0Y2ggPT0gbnVsbCkge1xuICAgICAgc2NyYXRjaCA9IHt9O1xuICAgIH1cblxuICAgIHNjcmF0Y2guY3VlVXRpbGl0aWVzID0gZGF0YTtcbiAgICBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHNjcmF0Y2gpO1xuICB9O1xuXG4gIHZhciBmdW5jdGlvbnMgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyICRjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICRjYW52YXMuY2xhc3NMaXN0LmFkZChcImV4cGFuZC1jb2xsYXBzZS1jYW52YXNcIik7XG4gICAgICB2YXIgJGNvbnRhaW5lciA9IGN5LmNvbnRhaW5lcigpO1xuICAgICAgdmFyIGN0eCA9ICRjYW52YXMuZ2V0Q29udGV4dCggJzJkJyApO1xuICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGNhbnZhcyk7XG5cbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XG5cbiAgICAgIHZhciBvZmZzZXQgPSBmdW5jdGlvbihlbHQpIHtcbiAgICAgICAgICB2YXIgcmVjdCA9IGVsdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3A6IHJlY3QudG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcbiAgICAgICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICRjYW52YXMuaGVpZ2h0ID0gY3kuY29udGFpbmVyKCkub2Zmc2V0SGVpZ2h0O1xuICAgICAgICAkY2FudmFzLndpZHRoID0gY3kuY29udGFpbmVyKCkub2Zmc2V0V2lkdGg7XG4gICAgICAgICRjYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAkY2FudmFzLnN0eWxlLnRvcCA9IDA7XG4gICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IDA7XG4gICAgICAgICRjYW52YXMuc3R5bGUuekluZGV4ID0gb3B0aW9ucygpLnpJbmRleDtcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSBvZmZzZXQoJGNhbnZhcyk7XG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gb2Zmc2V0KCRjb250YWluZXIpO1xuICAgICAgICAgICRjYW52YXMuc3R5bGUudG9wID0gLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApO1xuICAgICAgICAgICRjYW52YXMuc3R5bGUubGVmdCA9IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpO1xuXG4gICAgICAgICAgLy8gcmVmcmVzaCB0aGUgY3VlcyBvbiBjYW52YXMgcmVzaXplXG4gICAgICAgICAgaWYoY3kpe1xuICAgICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuXG4gICAgICB9LCAyNTApO1xuXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xuICAgICAgICBfc2l6ZUNhbnZhcygpO1xuICAgICAgfVxuXG4gICAgICBzaXplQ2FudmFzKCk7XG5cbiAgICAgIHZhciBkYXRhID0ge307XG5cbiAgICAgIC8vIGlmIHRoZXJlIGFyZSBldmVudHMgZmllbGQgaW4gZGF0YSB1bmJpbmQgdGhlbSBoZXJlXG4gICAgICAvLyB0byBwcmV2ZW50IGJpbmRpbmcgdGhlIHNhbWUgZXZlbnQgbXVsdGlwbGUgdGltZXNcbiAgICAgIC8vIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xuICAgICAgLy8gICBmdW5jdGlvbnNbJ3VuYmluZCddLmFwcGx5KCAkY29udGFpbmVyICk7XG4gICAgICAvLyB9XG5cbiAgICAgIGZ1bmN0aW9uIG9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLm9wdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNsZWFyRHJhd3MoKSB7XG4gICAgICAgIHZhciB3ID0gY3kud2lkdGgoKTtcbiAgICAgICAgdmFyIGggPSBjeS5oZWlnaHQoKTtcblxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZSkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbjtcbiAgICAgICAgdmFyIGhhc0NoaWxkcmVuID0gY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbi5sZW5ndGggPiAwO1xuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2ltcGxlIG5vZGUgd2l0aCBubyBjb2xsYXBzZWQgY2hpbGRyZW4gcmV0dXJuIGRpcmVjdGx5XG4gICAgICAgIGlmICghaGFzQ2hpbGRyZW4gJiYgY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpc0NvbGxhcHNlZCA9IG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xuXG4gICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xuICAgICAgICB2YXIgcmVjdFNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVTaXplO1xuICAgICAgICB2YXIgbGluZVNpemUgPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTtcbiAgICAgICAgdmFyIGRpZmY7XG5cbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRYO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFk7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUVuZFg7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUVuZFk7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xuXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclg7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclk7XG4gICAgICAgIHZhciBjdWVDZW50ZXI7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uID09PSAndG9wLWxlZnQnKSB7XG4gICAgICAgICAgdmFyIG9mZnNldCA9IDE7XG4gICAgICAgICAgdmFyIHNpemUgPSBjeS56b29tKCkgPCAxID8gcmVjdFNpemUgLyAoMipjeS56b29tKCkpIDogcmVjdFNpemUgLyAyO1xuXG4gICAgICAgICAgdmFyIHggPSBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLndpZHRoKCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1sZWZ0JykpXG4gICAgICAgICAgICAgICAgICArIHBhcnNlRmxvYXQobm9kZS5jc3MoJ2JvcmRlci13aWR0aCcpKSArIHNpemUgKyBvZmZzZXQ7XG4gICAgICAgICAgdmFyIHkgPSBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmhlaWdodCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctdG9wJykpXG4gICAgICAgICAgICAgICAgICArIHBhcnNlRmxvYXQobm9kZS5jc3MoJ2JvcmRlci13aWR0aCcpKSArIHNpemUgKyBvZmZzZXQ7XG5cbiAgICAgICAgICBjdWVDZW50ZXIgPSB7XG4gICAgICAgICAgICB4IDogeCxcbiAgICAgICAgICAgIHkgOiB5XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XG4gICAgICAgICAgY3VlQ2VudGVyID0gdHlwZW9mIG9wdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbi5jYWxsKHRoaXMsIG5vZGUpIDogb3B0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyID0gZWxlbWVudFV0aWxpdGllcy5jb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKGN1ZUNlbnRlcik7XG5cbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBzaXplc1xuICAgICAgICByZWN0U2l6ZSA9IE1hdGgubWF4KHJlY3RTaXplLCByZWN0U2l6ZSAqIGN5Lnpvb20oKSk7XG4gICAgICAgIGxpbmVTaXplID0gTWF0aC5tYXgobGluZVNpemUsIGxpbmVTaXplICogY3kuem9vbSgpKTtcbiAgICAgICAgZGlmZiA9IChyZWN0U2l6ZSAtIGxpbmVTaXplKSAvIDI7XG5cbiAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJYID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueDtcbiAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJZID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueTtcblxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcbiAgICAgICAgZXhwYW5kY29sbGFwc2VTdGFydFkgPSBleHBhbmRjb2xsYXBzZUNlbnRlclkgLSByZWN0U2l6ZSAvIDI7XG4gICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWCA9IGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemU7XG4gICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemU7XG4gICAgICAgIGV4cGFuZGNvbGxhcHNlUmVjdFNpemUgPSByZWN0U2l6ZTtcblxuICAgICAgICAvLyBEcmF3IGV4cGFuZC9jb2xsYXBzZSBjdWUgaWYgc3BlY2lmaWVkIHVzZSBhbiBpbWFnZSBlbHNlIHJlbmRlciBpdCBpbiB0aGUgZGVmYXVsdCB3YXlcbiAgICAgICAgaWYgKGlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZSkge1xuICAgICAgICAgIHZhciBpbWc9bmV3IEltYWdlKCk7XG4gICAgICAgICAgaW1nLnNyYyA9IG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZTtcbiAgICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgZXhwYW5kY29sbGFwc2VTdGFydFgsICBleHBhbmRjb2xsYXBzZVN0YXJ0WSwgcmVjdFNpemUsIHJlY3RTaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghaXNDb2xsYXBzZWQgJiYgb3B0aW9ucygpLmNvbGxhcHNlQ3VlSW1hZ2UpIHtcbiAgICAgICAgICB2YXIgaW1nPW5ldyBJbWFnZSgpO1xuICAgICAgICAgIGltZy5zcmMgPSBvcHRpb25zKCkuY29sbGFwc2VDdWVJbWFnZTtcbiAgICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgZXhwYW5kY29sbGFwc2VTdGFydFgsICBleHBhbmRjb2xsYXBzZVN0YXJ0WSwgcmVjdFNpemUsIHJlY3RTaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB2YXIgb2xkRmlsbFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcbiAgICAgICAgICB2YXIgb2xkV2lkdGggPSBjdHgubGluZVdpZHRoO1xuICAgICAgICAgIHZhciBvbGRTdHJva2VTdHlsZSA9IGN0eC5zdHJva2VTdHlsZTtcblxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xuXG4gICAgICAgICAgY3R4LmVsbGlwc2UoZXhwYW5kY29sbGFwc2VDZW50ZXJYLCBleHBhbmRjb2xsYXBzZUNlbnRlclksIHJlY3RTaXplIC8gMiwgcmVjdFNpemUgLyAyLCAwLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgY3R4LmZpbGwoKTtcblxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcblxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwid2hpdGVcIjtcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gTWF0aC5tYXgoMi42LCAyLjYgKiBjeS56b29tKCkpO1xuXG4gICAgICAgICAgY3R4Lm1vdmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGRpZmYsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemUgLyAyKTtcbiAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgbGluZVNpemUgKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XG5cbiAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyByZWN0U2l6ZSAvIDIsIGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgZGlmZik7XG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgICAgIGN0eC5zdHJva2UoKTtcblxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRGaWxsU3R5bGU7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IG9sZFdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBleHBhbmRjb2xsYXBzZVN0YXJ0WDtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRDdWVTaXplID0gZXhwYW5kY29sbGFwc2VSZWN0U2l6ZTtcbiAgICAgICAgXG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBub2RlO1xuICAgICAgfVxuXG4gICAgICB7XG4gICAgICAgIGN5Lm9uKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzaXplQ2FudmFzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScsIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgaWYgKCBub2RlV2l0aFJlbmRlcmVkQ3VlICkge1xuICAgICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBkYXRhLmVab29tID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICggbm9kZVdpdGhSZW5kZXJlZEN1ZSApIHtcbiAgICAgICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cdFx0Ly8gY2hlY2sgaWYgbW91c2UgaXMgaW5zaWRlIGdpdmVuIG5vZGVcblx0XHR2YXIgaXNJbnNpZGVDb21wb3VuZCA9IGZ1bmN0aW9uKG5vZGUsIGUpe1xuXHRcdFx0aWYgKG5vZGUpe1xuXHRcdFx0XHR2YXIgY3Vyck1vdXNlUG9zID0gZS5wb3NpdGlvbiB8fCBlLmN5UG9zaXRpb247XG5cdFx0XHRcdHZhciB0b3BMZWZ0ID0ge1xuXHRcdFx0XHRcdHg6IChub2RlLnBvc2l0aW9uKFwieFwiKSAtIG5vZGUud2lkdGgoKSAvIDIgLSBwYXJzZUZsb2F0KG5vZGUuY3NzKCdwYWRkaW5nLWxlZnQnKSkpLFxuXHRcdFx0XHRcdHk6IChub2RlLnBvc2l0aW9uKFwieVwiKSAtIG5vZGUuaGVpZ2h0KCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy10b3AnKSkpfTtcblx0XHRcdFx0dmFyIGJvdHRvbVJpZ2h0ID0ge1xuXHRcdFx0XHRcdHg6IChub2RlLnBvc2l0aW9uKFwieFwiKSArIG5vZGUud2lkdGgoKSAvIDIgKyBwYXJzZUZsb2F0KG5vZGUuY3NzKCdwYWRkaW5nLXJpZ2h0JykpKSxcblx0XHRcdFx0XHR5OiAobm9kZS5wb3NpdGlvbihcInlcIikgKyBub2RlLmhlaWdodCgpIC8gMisgcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1ib3R0b20nKSkpfTtcblxuXHRcdFx0XHRpZiAoY3Vyck1vdXNlUG9zLnggPj0gdG9wTGVmdC54ICYmIGN1cnJNb3VzZVBvcy55ID49IHRvcExlZnQueSAmJlxuXHRcdFx0XHRcdGN1cnJNb3VzZVBvcy54IDw9IGJvdHRvbVJpZ2h0LnggJiYgY3Vyck1vdXNlUG9zLnkgPD0gYm90dG9tUmlnaHQueSl7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9O1xuXG5cdFx0Y3kub24oJ21vdXNlbW92ZScsICdub2RlJywgZGF0YS5lTW91c2VNb3ZlPSBmdW5jdGlvbihlKXtcblx0XHRcdGlmKCFpc0luc2lkZUNvbXBvdW5kKG5vZGVXaXRoUmVuZGVyZWRDdWUsIGUpKXtcblx0XHRcdFx0Y2xlYXJEcmF3cygpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKG5vZGVXaXRoUmVuZGVyZWRDdWUgJiYgIXByZXZlbnREcmF3aW5nKXtcblx0XHRcdFx0ZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGVXaXRoUmVuZGVyZWRDdWUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Y3kub24oJ21vdXNlb3ZlcicsICdub2RlJywgZGF0YS5lTW91c2VPdmVyID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBub2RlID0gdGhpcztcblx0XHRcdC8vIGNsZWFyIGRyYXdzIGlmIGFueVxuXHRcdFx0aWYgKGFwaS5pc0NvbGxhcHNpYmxlKG5vZGUpIHx8IGFwaS5pc0V4cGFuZGFibGUobm9kZSkpe1xuXHRcdFx0XHRpZiAoIG5vZGVXaXRoUmVuZGVyZWRDdWUgJiYgbm9kZVdpdGhSZW5kZXJlZEN1ZS5pZCgpICE9IG5vZGUuaWQoKSApIHtcblx0XHRcdFx0XHRjbGVhckRyYXdzKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZHJhd0V4cGFuZENvbGxhcHNlQ3VlKG5vZGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dmFyIG9sZE1vdXNlUG9zID0gbnVsbCwgY3Vyck1vdXNlUG9zID0gbnVsbDtcblx0XHRjeS5vbignbW91c2Vkb3duJywgZGF0YS5lTW91c2VEb3duID0gZnVuY3Rpb24oZSl7XG5cdFx0XHRvbGRNb3VzZVBvcyA9IGUucmVuZGVyZWRQb3NpdGlvbiB8fCBlLmN5UmVuZGVyZWRQb3NpdGlvblxuXHRcdH0pO1xuXHRcdGN5Lm9uKCdtb3VzZXVwJywgZGF0YS5lTW91c2VVcCA9IGZ1bmN0aW9uKGUpe1xuXHRcdFx0Y3Vyck1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXG5cdFx0fSk7XG5cblx0XHRjeS5vbignZ3JhYicsICdub2RlJywgZGF0YS5lR3JhYiA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRwcmV2ZW50RHJhd2luZyA9IHRydWU7XG5cdFx0fSk7XG5cblx0XHRjeS5vbignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRwcmV2ZW50RHJhd2luZyA9IGZhbHNlO1xuXHRcdH0pO1xuXG5cdFx0Y3kub24oJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKVxuXHRcdFx0XHRjbGVhckRyYXdzKCk7XG5cdFx0fSk7XG5cblx0XHRjeS5vbigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjbGVhckRyYXdzKCk7XG5cdFx0XHRub2RlV2l0aFJlbmRlcmVkQ3VlID0gbnVsbDtcblx0XHR9KTtcblxuXHRcdHZhciB1cjtcblx0XHRjeS5vbignc2VsZWN0JywgJ25vZGUnLCBkYXRhLmVTZWxlY3QgPSBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKHRoaXMubGVuZ3RoID4gY3kubm9kZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoKVxuXHRcdFx0XHR0aGlzLnVuc2VsZWN0KCk7XG5cdFx0fSk7XG5cblx0XHRjeS5vbigndGFwJywgZGF0YS5lVGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHR2YXIgbm9kZSA9IG5vZGVXaXRoUmVuZGVyZWRDdWU7ICAgICAgXG4gICAgICB2YXIgb3B0cyA9IG9wdGlvbnMoKTtcblx0XHRcdGlmIChub2RlKXtcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WDtcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WTtcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZTtcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRZID0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgY3lSZW5kZXJlZFBvcyA9IGV2ZW50LnJlbmRlcmVkUG9zaXRpb24gfHwgZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uO1xuXHRcdFx0XHR2YXIgY3lSZW5kZXJlZFBvc1ggPSBjeVJlbmRlcmVkUG9zLng7XG5cdFx0XHRcdHZhciBjeVJlbmRlcmVkUG9zWSA9IGN5UmVuZGVyZWRQb3MueTtcblx0XHRcdFx0dmFyIGZhY3RvciA9IChvcHRzLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XG5cblx0XHRcdFx0aWYgKCAoTWF0aC5hYnMob2xkTW91c2VQb3MueCAtIGN1cnJNb3VzZVBvcy54KSA8IDUgJiYgTWF0aC5hYnMob2xkTW91c2VQb3MueSAtIGN1cnJNb3VzZVBvcy55KSA8IDUpXG5cdFx0XHRcdFx0JiYgY3lSZW5kZXJlZFBvc1ggPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxuXHRcdFx0XHRcdCYmIGN5UmVuZGVyZWRQb3NYIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXG5cdFx0XHRcdFx0JiYgY3lSZW5kZXJlZFBvc1kgPj0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSAtIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3RvclxuXHRcdFx0XHRcdCYmIGN5UmVuZGVyZWRQb3NZIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yKSB7XG5cdFx0XHRcdFx0aWYob3B0cy51bmRvYWJsZSAmJiAhdXIpXG5cdFx0XHRcdFx0XHR1ciA9IGN5LnVuZG9SZWRvKHtcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdEFjdGlvbnM6IGZhbHNlXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRpZihhcGkuaXNDb2xsYXBzaWJsZShub2RlKSlcblx0XHRcdFx0XHRcdGlmIChvcHRzLnVuZG9hYmxlKXtcblx0XHRcdFx0XHRcdFx0dXIuZG8oXCJjb2xsYXBzZVwiLCB7XG5cdFx0XHRcdFx0XHRcdFx0bm9kZXM6IG5vZGUsXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9uczogb3B0c1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0YXBpLmNvbGxhcHNlKG5vZGUsIG9wdHMpO1xuXHRcdFx0XHRlbHNlIGlmKGFwaS5pc0V4cGFuZGFibGUobm9kZSkpXG5cdFx0XHRcdFx0aWYgKG9wdHMudW5kb2FibGUpXG5cdFx0XHRcdFx0XHR1ci5kbyhcImV4cGFuZFwiLCB7XG5cdFx0XHRcdFx0XHRcdG5vZGVzOiBub2RlLFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zOiBvcHRzXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRhcGkuZXhwYW5kKG5vZGUsIG9wdHMpO1xuICAgICAgICAgIFxuICAgICAgICAgICAgaWYobm9kZS5zZWxlY3RhYmxlKCkpe1xuICAgICAgICAgICAgICBub2RlLnVuc2VsZWN0aWZ5KCk7XG4gICAgICAgICAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSAgICAgICAgICBcblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxuICAgICAgZGF0YS5oYXNFdmVudEZpZWxkcyA9IHRydWU7XG4gICAgICBzZXREYXRhKCBkYXRhICk7XG4gICAgfSxcbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gdmFyICRjb250YWluZXIgPSB0aGlzO1xuICAgICAgICB2YXIgZGF0YSA9IGdldERhdGEoKTtcblxuICAgICAgICBpZiAoIWRhdGEuaGFzRXZlbnRGaWVsZHMpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyggJ2V2ZW50cyB0byB1bmJpbmQgZG9lcyBub3QgZXhpc3QnICk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY3kudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnKTtcblxuICAgICAgICBjeS5vZmYoJ21vdXNlb3ZlcicsICdub2RlJywgZGF0YS5lTW91c2VPdmVyKVxuICAgICAgICAgIC5vZmYoJ21vdXNlbW92ZScsICdub2RlJywgZGF0YS5lTW91c2VNb3ZlKVxuICAgICAgICAgIC5vZmYoJ21vdXNlZG93bicsICdub2RlJywgZGF0YS5lTW91c2VEb3duKVxuICAgICAgICAgIC5vZmYoJ21vdXNldXAnLCAnbm9kZScsIGRhdGEuZU1vdXNlVXApXG4gICAgICAgICAgLm9mZignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcbiAgICAgICAgICAub2ZmKCdncmFiJywgJ25vZGUnLCBkYXRhLmVHcmFiKVxuICAgICAgICAgIC5vZmYoJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbilcbiAgICAgICAgICAub2ZmKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSlcbiAgICAgICAgICAub2ZmKCd0YXAnLCAnbm9kZScsIGRhdGEuZVRhcClcbiAgICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGRhdGEuZUFkZClcbiAgICAgICAgICAub2ZmKCdzZWxlY3QnLCAnbm9kZScsIGRhdGEuZVNlbGVjdClcbiAgICAgICAgICAub2ZmKCdmcmVlJywgJ25vZGUnLCBkYXRhLmVGcmVlKVxuICAgICAgICAgIC5vZmYoJ3pvb20gcGFuJywgZGF0YS5lWm9vbSlcbiAgICAgICAgICAub2ZmKCdyZXNpemUnLCBkYXRhLmVDeVJlc2l6ZSk7XG4gICAgfSxcbiAgICByZWJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXRhID0gZ2V0RGF0YSgpO1xuXG4gICAgICBpZiAoIWRhdGEuaGFzRXZlbnRGaWVsZHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coICdldmVudHMgdG8gcmViaW5kIGRvZXMgbm90IGV4aXN0JyApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGN5Lm9uKCdtb3VzZW92ZXInLCAnbm9kZScsIGRhdGEuZU1vdXNlT3ZlcilcbiAgICAgICAgLm9uKCdtb3VzZW1vdmUnLCAnbm9kZScsIGRhdGEuZU1vdXNlTW92ZSlcbiAgICAgICAgLm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcbiAgICAgICAgLm9uKCdtb3VzZXVwJywgJ25vZGUnLCBkYXRhLmVNb3VzZVVwKVxuICAgICAgICAub24oJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUpXG4gICAgICAgIC5vbignZ3JhYicsICdub2RlJywgZGF0YS5lR3JhYilcbiAgICAgICAgLm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24pXG4gICAgICAgIC5vbigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUpXG4gICAgICAgIC5vbigndGFwJywgJ25vZGUnLCBkYXRhLmVUYXApXG4gICAgICAgIC5vbignYWRkJywgJ25vZGUnLCBkYXRhLmVBZGQpXG4gICAgICAgIC5vbignc2VsZWN0JywgJ25vZGUnLCBkYXRhLmVTZWxlY3QpXG4gICAgICAgIC5vbignZnJlZScsICdub2RlJywgZGF0YS5lRnJlZSlcbiAgICAgICAgLm9uKCd6b29tIHBhbicsIGRhdGEuZVpvb20pXG4gICAgICAgIC5vbigncmVzaXplJywgZGF0YS5lQ3lSZXNpemUpO1xuICAgIH1cbiAgfTtcblxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KGN5LmNvbnRhaW5lcigpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KGN5LmNvbnRhaW5lcigpLCBhcmd1bWVudHMpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1leHBhbmQtY29sbGFwc2UnKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICAgKi9cbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IERhdGVcbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XG4gICAqIH0sIF8ubm93KCkpO1xuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gICAqL1xuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxuICAgKlxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gICAqXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xuICAgKlxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICogICAnbGVhZGluZyc6IHRydWUsXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcbiAgICpcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xuICAgKiAgIH1cbiAgICogfSwgWydkZWxldGUnXSk7XG4gICAqXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XG4gICAqXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXJncyxcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgIHN0YW1wLFxuICAgICAgICAgICAgdGhpc0FyZyxcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgICB9XG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgbGFzdENhbGxlZCA9IDA7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICAgIH1cbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHN0YW1wID0gbm93KCk7XG4gICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xuXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XG5cbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIHJldHVybiBkZWJvdW5jZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KHt9KTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc09iamVjdCgxKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGRlYm91bmNlO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsImZ1bmN0aW9uIGVsZW1lbnRVdGlsaXRpZXMoY3kpIHtcbiByZXR1cm4ge1xuICBtb3ZlTm9kZXM6IGZ1bmN0aW9uIChwb3NpdGlvbkRpZmYsIG5vZGVzLCBub3RDYWxjVG9wTW9zdE5vZGVzKSB7XG4gICAgdmFyIHRvcE1vc3ROb2RlcyA9IG5vdENhbGNUb3BNb3N0Tm9kZXMgPyBub2RlcyA6IHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcbiAgICB0b3BNb3N0Tm9kZXMucG9zaXRpb25zKGZ1bmN0aW9uKGVsZSwgaSl7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiB0b3BNb3N0Tm9kZXNbaV0ucG9zaXRpb24oXCJ4XCIpICsgcG9zaXRpb25EaWZmLngsXG4gICAgICAgIHk6IHRvcE1vc3ROb2Rlc1tpXS5wb3NpdGlvbihcInlcIikgKyBwb3NpdGlvbkRpZmYueVxuICAgICAgfTtcbiAgICB9KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvcE1vc3ROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSB0b3BNb3N0Tm9kZXNbaV07XG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gICAgICB0aGlzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIGNoaWxkcmVuLCB0cnVlKTtcbiAgICB9XG4gIH0sXG4gIGdldFRvcE1vc3ROb2RlczogZnVuY3Rpb24gKG5vZGVzKSB7Ly8qLy9cbiAgICB2YXIgbm9kZXNNYXAgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBub2Rlc01hcFtub2Rlc1tpXS5pZCgpXSA9IHRydWU7XG4gICAgfVxuICAgIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50KClbMF07XG4gICAgICB3aGlsZSAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG5vZGVzTWFwW3BhcmVudC5pZCgpXSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiByb290cztcbiAgfSxcbiAgcmVhcnJhbmdlOiBmdW5jdGlvbiAobGF5b3V0QnkpIHtcbiAgICBpZiAodHlwZW9mIGxheW91dEJ5ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGxheW91dEJ5KCk7XG4gICAgfSBlbHNlIGlmIChsYXlvdXRCeSAhPSBudWxsKSB7XG4gICAgICB2YXIgbGF5b3V0ID0gY3kubGF5b3V0KGxheW91dEJ5KTtcbiAgICAgIGlmIChsYXlvdXQgJiYgbGF5b3V0LnJ1bikge1xuICAgICAgICBsYXlvdXQucnVuKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uOiBmdW5jdGlvbiAobW9kZWxQb3NpdGlvbikge1xuICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcblxuICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xuICAgIHZhciB5ID0gbW9kZWxQb3NpdGlvbi55ICogem9vbSArIHBhbi55O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5XG4gICAgfTtcbiAgfVxuIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZWxlbWVudFV0aWxpdGllcztcbiIsInZhciBib3VuZGluZ0JveFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vYm91bmRpbmdCb3hVdGlsaXRpZXMnKTtcblxuLy8gRXhwYW5kIGNvbGxhcHNlIHV0aWxpdGllc1xuZnVuY3Rpb24gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMoY3kpIHtcbnZhciBlbGVtZW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbGl0aWVzJykoY3kpO1xucmV0dXJuIHtcbiAgLy90aGUgbnVtYmVyIG9mIG5vZGVzIG1vdmluZyBhbmltYXRlZGx5IGFmdGVyIGV4cGFuZCBvcGVyYXRpb25cbiAgYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudDogMCxcbiAgLypcbiAgICogQSBmdW50aW9uIGJhc2ljbHkgZXhwYW5kaW5nIGEgbm9kZSwgaXQgaXMgdG8gYmUgY2FsbGVkIHdoZW4gYSBub2RlIGlzIGV4cGFuZGVkIGFueXdheS5cbiAgICogU2luZ2xlIHBhcmFtZXRlciBpbmRpY2F0ZXMgaWYgdGhlIG5vZGUgaXMgZXhwYW5kZWQgYWxvbmUgYW5kIGlmIGl0IGlzIHRydXRoeSB0aGVuIGxheW91dEJ5IHBhcmFtZXRlciBpcyBjb25zaWRlcmVkIHRvXG4gICAqIHBlcmZvcm0gbGF5b3V0IGFmdGVyIGV4cGFuZC5cbiAgICovXG4gIGV4cGFuZE5vZGVCYXNlRnVuY3Rpb246IGZ1bmN0aW9uIChub2RlLCBzaW5nbGUsIGxheW91dEJ5KSB7XG4gICAgaWYgKCFub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pe1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vY2hlY2sgaG93IHRoZSBwb3NpdGlvbiBvZiB0aGUgbm9kZSBpcyBjaGFuZ2VkXG4gICAgdmFyIHBvc2l0aW9uRGlmZiA9IHtcbiAgICAgIHg6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCAtIG5vZGUuX3ByaXZhdGUuZGF0YVsncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJ10ueCxcbiAgICAgIHk6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSAtIG5vZGUuX3ByaXZhdGUuZGF0YVsncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJ10ueVxuICAgIH07XG5cbiAgICBub2RlLnJlbW92ZURhdGEoXCJpbmZvTGFiZWxcIik7XG4gICAgbm9kZS5yZW1vdmVDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XG5cbiAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5iZWZvcmVleHBhbmRcIik7XG4gICAgdmFyIHJlc3RvcmVkTm9kZXMgPSBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW47XG4gICAgcmVzdG9yZWROb2Rlcy5yZXN0b3JlKCk7XG4gICAgdmFyIHBhcmVudERhdGEgPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpLnBhcmVudERhdGE7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHJlc3RvcmVkTm9kZXMubGVuZ3RoOyBpKyspe1xuICAgICAgZGVsZXRlIHBhcmVudERhdGFbcmVzdG9yZWROb2Rlc1tpXS5pZCgpXTtcbiAgICB9XG4gICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhID0gcGFyZW50RGF0YTtcbiAgICB0aGlzLnJlcGFpckVkZ2VzKG5vZGUpO1xuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IG51bGw7XG5cbiAgICBlbGVtZW50VXRpbGl0aWVzLm1vdmVOb2Rlcyhwb3NpdGlvbkRpZmYsIG5vZGUuY2hpbGRyZW4oKSk7XG4gICAgbm9kZS5yZW1vdmVEYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKTtcblxuICAgIG5vZGUudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBub2RlcyBhcmUgbW92ZWRcbiAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZFwiKTtcblxuICAgIC8vIElmIGV4cGFuZCBpcyBjYWxsZWQganVzdCBmb3Igb25lIG5vZGUgdGhlbiBjYWxsIGVuZCBvcGVyYXRpb24gdG8gcGVyZm9ybSBsYXlvdXRcbiAgICBpZiAoc2luZ2xlKSB7XG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbihsYXlvdXRCeSwgbm9kZSk7XG4gICAgfVxuICB9LFxuICAvKlxuICAgKiBBIGhlbHBlciBmdW5jdGlvbiB0byBjb2xsYXBzZSBnaXZlbiBub2RlcyBpbiBhIHNpbXBsZSB3YXkgKFdpdGhvdXQgcGVyZm9ybWluZyBsYXlvdXQgYWZ0ZXJ3YXJkKVxuICAgKiBJdCBjb2xsYXBzZXMgYWxsIHJvb3Qgbm9kZXMgYm90dG9tIHVwLlxuICAgKi9cbiAgc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xuICAgIG5vZGVzLmRhdGEoXCJjb2xsYXBzZVwiLCB0cnVlKTtcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcbiAgICAgIFxuICAgICAgLy8gQ29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKHJvb3QpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gbm9kZXM7XG4gIH0sXG4gIC8qXG4gICAqIEEgaGVscGVyIGZ1bmN0aW9uIHRvIGV4cGFuZCBnaXZlbiBub2RlcyBpbiBhIHNpbXBsZSB3YXkgKFdpdGhvdXQgcGVyZm9ybWluZyBsYXlvdXQgYWZ0ZXJ3YXJkKVxuICAgKiBJdCBleHBhbmRzIGFsbCB0b3AgbW9zdCBub2RlcyB0b3AgZG93bi5cbiAgICovXG4gIHNpbXBsZUV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcbiAgICBub2Rlcy5kYXRhKFwiZXhwYW5kXCIsIHRydWUpOyAvLyBNYXJrIHRoYXQgdGhlIG5vZGVzIGFyZSBzdGlsbCB0byBiZSBleHBhbmRlZFxuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTsgLy8gRm9yIGVhY2ggcm9vdCBub2RlIGV4cGFuZCB0b3AgZG93blxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG4gIH0sXG4gIC8qXG4gICAqIEV4cGFuZHMgYWxsIG5vZGVzIGJ5IGV4cGFuZGluZyBhbGwgdG9wIG1vc3Qgbm9kZXMgdG9wIGRvd24gd2l0aCB0aGVpciBkZXNjZW5kYW50cy5cbiAgICovXG4gIHNpbXBsZUV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XG4gICAgaWYgKG5vZGVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5vZGVzID0gY3kubm9kZXMoKTtcbiAgICB9XG4gICAgdmFyIG9ycGhhbnM7XG4gICAgb3JwaGFucyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcbiAgICB2YXIgZXhwYW5kU3RhY2sgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ycGhhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByb290ID0gb3JwaGFuc1tpXTtcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gZXhwYW5kU3RhY2s7XG4gIH0sXG4gIC8qXG4gICAqIFRoZSBvcGVyYXRpb24gdG8gYmUgcGVyZm9ybWVkIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQgcmVhcnJhbmdlIG5vZGVzIGJ5IGxheW91dEJ5IHBhcmFtZXRlci5cbiAgICovXG4gIGVuZE9wZXJhdGlvbjogZnVuY3Rpb24gKGxheW91dEJ5LCBub2Rlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBjeS5yZWFkeShmdW5jdGlvbiAoKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShsYXlvdXRCeSk7XG4gICAgICAgIGlmKGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQpe1xuICAgICAgICAgIG5vZGVzLnNlbGVjdGlmeSgpO1xuICAgICAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSwgMCk7XG4gICAgICBcbiAgICB9KTtcbiAgfSxcbiAgLypcbiAgICogQ2FsbHMgc2ltcGxlIGV4cGFuZEFsbE5vZGVzLiBUaGVuIHBlcmZvcm1zIGVuZCBvcGVyYXRpb24uXG4gICAqL1xuICBleHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7Ly8qLy9cbiAgICB2YXIgZXhwYW5kZWRTdGFjayA9IHRoaXMuc2ltcGxlRXhwYW5kQWxsTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XG5cbiAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XG5cbiAgICAvKlxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXG4gICAgICovXG4gICAgcmV0dXJuIGV4cGFuZGVkU3RhY2s7XG4gIH0sXG4gIC8qXG4gICAqIEV4cGFuZHMgdGhlIHJvb3QgYW5kIGl0cyBjb2xsYXBzZWQgZGVzY2VuZGVudHMgaW4gdG9wIGRvd24gb3JkZXIuXG4gICAqL1xuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XG4gICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICBleHBhbmRTdGFjay5wdXNoKHJvb3QpO1xuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcbiAgICB9XG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24obm9kZSwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcbiAgICB9XG4gIH0sXG4gIC8vRXhwYW5kIHRoZSBnaXZlbiBub2RlcyBwZXJmb3JtIGVuZCBvcGVyYXRpb24gYWZ0ZXIgZXhwYW5kYXRpb25cbiAgZXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB0byBleHBhbmQgd2UgbmVlZCB0byBhbmltYXRlIGZvciBmaXNoZXllIHZpZXcsIGJ1dCBpZiB0aGVyZSBhcmUgbW9yZSB0aGVuIG9uZSBub2RlIHdlIGRvIG5vdFxuICAgIGlmIChub2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIFxuICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXTtcbiAgICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgICAvLyBFeHBhbmQgdGhlIGdpdmVuIG5vZGUgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhhdCB0aGUgbm9kZSBpcyBzaW1wbGUgd2hpY2ggZW5zdXJlcyB0aGF0IGZpc2hleWUgcGFyYW1ldGVyIHdpbGwgYmUgY29uc2lkZXJlZFxuICAgICAgICB0aGlzLmV4cGFuZE5vZGUobm9kZSwgb3B0aW9ucy5maXNoZXllLCB0cnVlLCBvcHRpb25zLmFuaW1hdGUsIG9wdGlvbnMubGF5b3V0QnksIG9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuICAgIH0gXG4gICAgZWxzZSB7XG4gICAgICAvLyBGaXJzdCBleHBhbmQgZ2l2ZW4gbm9kZXMgYW5kIHRoZW4gcGVyZm9ybSBsYXlvdXQgYWNjb3JkaW5nIHRvIHRoZSBsYXlvdXRCeSBwYXJhbWV0ZXJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXG4gICAgICovXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9LFxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlcyB0aGVuIHBlcmZvcm0gZW5kIG9wZXJhdGlvblxuICBjb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykge1xuICAgIC8qXG4gICAgICogSW4gY29sbGFwc2Ugb3BlcmF0aW9uIHRoZXJlIGlzIG5vIGZpc2hleWUgdmlldyB0byBiZSBhcHBsaWVkIHNvIHRoZXJlIGlzIG5vIGFuaW1hdGlvbiB0byBiZSBkZXN0cm95ZWQgaGVyZS4gV2UgY2FuIGRvIHRoaXMgXG4gICAgICogaW4gYSBiYXRjaC5cbiAgICAgKi8gXG4gICAgY3kuc3RhcnRCYXRjaCgpO1xuICAgIHRoaXMuc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzKG5vZGVzLyosIG9wdGlvbnMqLyk7XG4gICAgY3kuZW5kQmF0Y2goKTtcblxuICAgIG5vZGVzLnRyaWdnZXIoXCJwb3NpdGlvblwiKTsgLy8gcG9zaXRpb24gbm90IHRyaWdnZXJlZCBieSBkZWZhdWx0IHdoZW4gY29sbGFwc2VOb2RlIGlzIGNhbGxlZFxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcblxuICAgIC8vIFVwZGF0ZSB0aGUgc3R5bGVcbiAgICBjeS5zdHlsZSgpLnVwZGF0ZSgpO1xuXG4gICAgLypcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLy9jb2xsYXBzZSB0aGUgbm9kZXMgaW4gYm90dG9tIHVwIG9yZGVyIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3RcbiAgY29sbGFwc2VCb3R0b21VcDogZnVuY3Rpb24gKHJvb3QpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChub2RlKTtcbiAgICB9XG4gICAgLy9JZiB0aGUgcm9vdCBpcyBhIGNvbXBvdW5kIG5vZGUgdG8gYmUgY29sbGFwc2VkIHRoZW4gY29sbGFwc2UgaXRcbiAgICBpZiAocm9vdC5kYXRhKFwiY29sbGFwc2VcIikgJiYgcm9vdC5jaGlsZHJlbigpLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuY29sbGFwc2VOb2RlKHJvb3QpO1xuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiY29sbGFwc2VcIik7XG4gICAgfVxuICB9LFxuICAvL2V4cGFuZCB0aGUgbm9kZXMgaW4gdG9wIGRvd24gb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxuICBleHBhbmRUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcbiAgICBpZiAocm9vdC5kYXRhKFwiZXhwYW5kXCIpICYmIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICAvLyBFeHBhbmQgdGhlIHJvb3QgYW5kIHVubWFyayBpdHMgZXhwYW5kIGRhdGEgdG8gc3BlY2lmeSB0aGF0IGl0IGlzIG5vIG1vcmUgdG8gYmUgZXhwYW5kZWRcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgICByb290LnJlbW92ZURhdGEoXCJleHBhbmRcIik7XG4gICAgfVxuICAgIC8vIE1ha2UgYSByZWN1cnNpdmUgY2FsbCBmb3IgY2hpbGRyZW4gb2Ygcm9vdFxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKG5vZGUpO1xuICAgIH1cbiAgfSxcbiAgLy8gQ29udmVyc3QgdGhlIHJlbmRlcmVkIHBvc2l0aW9uIHRvIG1vZGVsIHBvc2l0aW9uIGFjY29yZGluZyB0byBnbG9iYWwgcGFuIGFuZCB6b29tIHZhbHVlc1xuICBjb252ZXJ0VG9Nb2RlbFBvc2l0aW9uOiBmdW5jdGlvbiAocmVuZGVyZWRQb3NpdGlvbikge1xuICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcbiAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcblxuICAgIHZhciB4ID0gKHJlbmRlcmVkUG9zaXRpb24ueCAtIHBhbi54KSAvIHpvb207XG4gICAgdmFyIHkgPSAocmVuZGVyZWRQb3NpdGlvbi55IC0gcGFuLnkpIC8gem9vbTtcblxuICAgIHJldHVybiB7XG4gICAgICB4OiB4LFxuICAgICAgeTogeVxuICAgIH07XG4gIH0sXG4gIC8qXG4gICAqIFRoaXMgbWV0aG9kIGV4cGFuZHMgdGhlIGdpdmVuIG5vZGUuIEl0IGNvbnNpZGVycyBhcHBseUZpc2hFeWVWaWV3LCBhbmltYXRlIGFuZCBsYXlvdXRCeSBwYXJhbWV0ZXJzLlxuICAgKiBJdCBhbHNvIGNvbnNpZGVycyBzaW5nbGUgcGFyYW1ldGVyIHdoaWNoIGluZGljYXRlcyBpZiB0aGlzIG5vZGUgaXMgZXhwYW5kZWQgYWxvbmUuIElmIHRoaXMgcGFyYW1ldGVyIGlzIHRydXRoeSBhbG9uZyB3aXRoIFxuICAgKiBhcHBseUZpc2hFeWVWaWV3IHBhcmFtZXRlciB0aGVuIHRoZSBzdGF0ZSBvZiB2aWV3IHBvcnQgaXMgdG8gYmUgY2hhbmdlZCB0byBoYXZlIGV4dHJhIHNwYWNlIG9uIHRoZSBzY3JlZW4gKGlmIG5lZWRlZCkgYmVmb3JlIGFwcGxpeWluZyB0aGVcbiAgICogZmlzaGV5ZSB2aWV3LlxuICAgKi9cbiAgZXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIHZhciBjb21tb25FeHBhbmRPcGVyYXRpb24gPSBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3KSB7XG5cbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLnc7XG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gPSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpc2hleWUgdmlldyBleHBhbmQgdGhlIG5vZGUuXG4gICAgICAgIC8vIFRoZSBmaXJzdCBwYXJhbXRlciBpbmRpY2F0ZXMgdGhlIG5vZGUgdG8gYXBwbHkgZmlzaGV5ZSB2aWV3LCB0aGUgdGhpcmQgcGFyYW1ldGVyIGluZGljYXRlcyB0aGUgbm9kZVxuICAgICAgICAvLyB0byBiZSBleHBhbmRlZCBhZnRlciBmaXNoZXllIHZpZXcgaXMgYXBwbGllZC5cbiAgICAgICAgc2VsZi5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLCBzaW5nbGUsIG5vZGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIElmIG9uZSBvZiB0aGVzZSBwYXJhbWV0ZXJzIGlzIHRydXRoeSBpdCBtZWFucyB0aGF0IGV4cGFuZE5vZGVCYXNlRnVuY3Rpb24gaXMgYWxyZWFkeSB0byBiZSBjYWxsZWQuXG4gICAgICAvLyBIb3dldmVyIGlmIG5vbmUgb2YgdGhlbSBpcyB0cnV0aHkgd2UgbmVlZCB0byBjYWxsIGl0IGhlcmUuXG4gICAgICBpZiAoIXNpbmdsZSB8fCAhYXBwbHlGaXNoRXllVmlldyB8fCAhYW5pbWF0ZSkge1xuICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZSwgc2luZ2xlLCBsYXlvdXRCeSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUpO1xuICAgICAgdmFyIGFuaW1hdGluZyA9IGZhbHNlOyAvLyBWYXJpYWJsZSB0byBjaGVjayBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgYW5pbWF0aW9uLCBpZiB0aGVyZSBpcyBjb21tb25FeHBhbmRPcGVyYXRpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW5pbWF0aW9uXG4gICAgICBcbiAgICAgIC8vIElmIHRoZSBub2RlIGlzIHRoZSBvbmx5IG5vZGUgdG8gZXhwYW5kIGFuZCBmaXNoZXllIHZpZXcgc2hvdWxkIGJlIGFwcGxpZWQsIHRoZW4gY2hhbmdlIHRoZSBzdGF0ZSBvZiB2aWV3cG9ydCBcbiAgICAgIC8vIHRvIGNyZWF0ZSBtb3JlIHNwYWNlIG9uIHNjcmVlbiAoSWYgbmVlZGVkKVxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXcgJiYgc2luZ2xlKSB7XG4gICAgICAgIHZhciB0b3BMZWZ0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IDAsIHk6IDB9KTtcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XG4gICAgICAgIHZhciBwYWRkaW5nID0gODA7XG4gICAgICAgIHZhciBiYiA9IHtcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXG4gICAgICAgICAgeDI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueCxcbiAgICAgICAgICB5MTogdG9wTGVmdFBvc2l0aW9uLnksXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBub2RlQkIgPSB7XG4gICAgICAgICAgeDE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53IC8gMiAtIHBhZGRpbmcsXG4gICAgICAgICAgeDI6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCArIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53IC8gMiArIHBhZGRpbmcsXG4gICAgICAgICAgeTE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiAtIHBhZGRpbmcsXG4gICAgICAgICAgeTI6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSArIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiArIHBhZGRpbmdcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdW5pb25CQiA9IGJvdW5kaW5nQm94VXRpbGl0aWVzLmdldFVuaW9uKG5vZGVCQiwgYmIpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgdGhlc2UgYmJveGVzIGFyZSBub3QgZXF1YWwgdGhlbiB3ZSBuZWVkIHRvIGNoYW5nZSB0aGUgdmlld3BvcnQgc3RhdGUgKGJ5IHBhbiBhbmQgem9vbSlcbiAgICAgICAgaWYgKCFib3VuZGluZ0JveFV0aWxpdGllcy5lcXVhbEJvdW5kaW5nQm94ZXModW5pb25CQiwgYmIpKSB7XG4gICAgICAgICAgdmFyIHZpZXdQb3J0ID0gY3kuZ2V0Rml0Vmlld3BvcnQodW5pb25CQiwgMTApO1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICBhbmltYXRpbmcgPSBhbmltYXRlOyAvLyBTaWduYWwgdGhhdCB0aGVyZSBpcyBhbiBhbmltYXRpb24gbm93IGFuZCBjb21tb25FeHBhbmRPcGVyYXRpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW5pbWF0aW9uXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhbmltYXRlIGR1cmluZyBwYW4gYW5kIHpvb21cbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xuICAgICAgICAgICAgY3kuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgIHBhbjogdmlld1BvcnQucGFuLFxuICAgICAgICAgICAgICB6b29tOiB2aWV3UG9ydC56b29tLFxuICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDEwMDBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGN5Lnpvb20odmlld1BvcnQuem9vbSk7XG4gICAgICAgICAgICBjeS5wYW4odmlld1BvcnQucGFuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSWYgYW5pbWF0aW5nIGlzIG5vdCB0cnVlIHdlIG5lZWQgdG8gY2FsbCBjb21tb25FeHBhbmRPcGVyYXRpb24gaGVyZVxuICAgICAgaWYgKCFhbmltYXRpbmcpIHtcbiAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH0sXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGUgd2l0aG91dCBwZXJmb3JtaW5nIGVuZCBvcGVyYXRpb25cbiAgY29sbGFwc2VOb2RlOiBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xuICAgICAgbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnLCB7XG4gICAgICAgIHg6IG5vZGUucG9zaXRpb24oKS54LFxuICAgICAgICB5OiBub2RlLnBvc2l0aW9uKCkueVxuICAgICAgfSk7XG5cbiAgICAgIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnLCB7XG4gICAgICAgIHc6IG5vZGUub3V0ZXJXaWR0aCgpLFxuICAgICAgICBoOiBub2RlLm91dGVySGVpZ2h0KClcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG5cbiAgICAgIGNoaWxkcmVuLnVuc2VsZWN0KCk7XG4gICAgICBjaGlsZHJlbi5jb25uZWN0ZWRFZGdlcygpLnVuc2VsZWN0KCk7XG5cbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWNvbGxhcHNlXCIpO1xuICAgICAgXG4gICAgICB0aGlzLmJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbihub2RlKTtcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4obm9kZSwgbm9kZSk7XG4gICAgICBub2RlLmFkZENsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcblxuICAgICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJjb2xsYXBzZVwiKTtcbiAgICAgIFxuICAgICAgbm9kZS5wb3NpdGlvbihub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpKTtcblxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH0sXG4gIHN0b3JlV2lkdGhIZWlnaHQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICBpZiAobm9kZSAhPSBudWxsKSB7XG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3gtYmVmb3JlLWZpc2hleWUnXSA9IHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSA9IHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gPSBub2RlLm91dGVyV2lkdGgoKTtcbiAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gPSBub2RlLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUucGFyZW50KClbMF0pO1xuICAgICAgfVxuICAgIH1cblxuICB9LFxuICAvKlxuICAgKiBBcHBseSBmaXNoZXllIHZpZXcgdG8gdGhlIGdpdmVuIG5vZGUuIG5vZGVUb0V4cGFuZCB3aWxsIGJlIGV4cGFuZGVkIGFmdGVyIHRoZSBvcGVyYXRpb24uIFxuICAgKiBUaGUgb3RoZXIgcGFyYW1ldGVyIGFyZSB0byBiZSBwYXNzZWQgYnkgcGFyYW1ldGVycyBkaXJlY3RseSBpbiBpbnRlcm5hbCBmdW5jdGlvbiBjYWxscy5cbiAgICovXG4gIGZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xuICAgIHZhciBzaWJsaW5ncyA9IHRoaXMuZ2V0U2libGluZ3Mobm9kZSk7XG5cbiAgICB2YXIgeF9hID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcbiAgICB2YXIgeV9hID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcblxuICAgIHZhciBkX3hfbGVmdCA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcbiAgICB2YXIgZF94X3JpZ2h0ID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xuICAgIHZhciBkX3lfdXBwZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcbiAgICB2YXIgZF95X2xvd2VyID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XG5cbiAgICB2YXIgYWJzX2RpZmZfb25feCA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddIC0geF9hKTtcbiAgICB2YXIgYWJzX2RpZmZfb25feSA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddIC0geV9hKTtcblxuICAgIC8vIENlbnRlciB3ZW50IHRvIExFRlRcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gPiB4X2EpIHtcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgKyBhYnNfZGlmZl9vbl94O1xuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0IC0gYWJzX2RpZmZfb25feDtcbiAgICB9XG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gUklHSFRcbiAgICBlbHNlIHtcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgLSBhYnNfZGlmZl9vbl94O1xuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0ICsgYWJzX2RpZmZfb25feDtcbiAgICB9XG5cbiAgICAvLyBDZW50ZXIgd2VudCB0byBVUFxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSA+IHlfYSkge1xuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyICsgYWJzX2RpZmZfb25feTtcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciAtIGFic19kaWZmX29uX3k7XG4gICAgfVxuICAgIC8vIENlbnRlciB3ZW50IHRvIERPV05cbiAgICBlbHNlIHtcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciAtIGFic19kaWZmX29uX3k7XG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgKyBhYnNfZGlmZl9vbl95O1xuICAgIH1cblxuICAgIHZhciB4UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XG4gICAgdmFyIHlQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHhQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnhQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XG4gICAgICB5UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy55UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3NbaV07XG5cbiAgICAgIHZhciB4X2IgPSB4UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xuICAgICAgdmFyIHlfYiA9IHlQb3NJblBhcmVudFNpYmxpbmdbaV07XG5cbiAgICAgIHZhciBzbG9wZSA9ICh5X2IgLSB5X2EpIC8gKHhfYiAtIHhfYSk7XG5cbiAgICAgIHZhciBkX3ggPSAwO1xuICAgICAgdmFyIGRfeSA9IDA7XG4gICAgICB2YXIgVF94ID0gMDtcbiAgICAgIHZhciBUX3kgPSAwO1xuXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExFRlRcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcbiAgICAgICAgZF94ID0gZF94X2xlZnQ7XG4gICAgICB9XG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFJJR0hUXG4gICAgICBlbHNlIHtcbiAgICAgICAgZF94ID0gZF94X3JpZ2h0O1xuICAgICAgfVxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBVUFBFUiBzaWRlXG4gICAgICBpZiAoeV9hID4geV9iKSB7XG4gICAgICAgIGRfeSA9IGRfeV91cHBlcjtcbiAgICAgIH1cbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTE9XRVIgc2lkZVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRfeSA9IGRfeV9sb3dlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRmluaXRlKHNsb3BlKSkge1xuICAgICAgICBUX3ggPSBNYXRoLm1pbihkX3gsIChkX3kgLyBNYXRoLmFicyhzbG9wZSkpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNsb3BlICE9PSAwKSB7XG4gICAgICAgIFRfeSA9IE1hdGgubWluKGRfeSwgKGRfeCAqIE1hdGguYWJzKHNsb3BlKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoeF9hID4geF9iKSB7XG4gICAgICAgIFRfeCA9IC0xICogVF94O1xuICAgICAgfVxuXG4gICAgICBpZiAoeV9hID4geV9iKSB7XG4gICAgICAgIFRfeSA9IC0xICogVF95O1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBNb3ZlIHRoZSBzaWJsaW5nIGluIHRoZSBzcGVjaWFsIHdheVxuICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKHNpYmxpbmcsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBzaWJsaW5nIGNhbGwgZXhwYW5kIG5vZGUgYmFzZSBmdW5jdGlvbiBoZXJlIGVsc2UgaXQgaXMgdG8gYmUgY2FsbGVkIG9uZSBvZiBmaXNoRXllVmlld01vdmVOb2RlKCkgY2FsbHNcbiAgICBpZiAoc2libGluZ3MubGVuZ3RoID09IDApIHtcbiAgICAgIHRoaXMuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xuICAgIH1cblxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcbiAgICAgIC8vIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgcGFyZW50IG5vZGUgYXMgd2VsbCAoIElmIGV4aXN0cyApXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUucGFyZW50KClbMF0sIHNpbmdsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9LFxuICBnZXRTaWJsaW5nczogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICB2YXIgc2libGluZ3M7XG5cbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSA9PSBudWxsKSB7XG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKFwiOnZpc2libGVcIikub3JwaGFucygpO1xuICAgICAgc2libGluZ3MgPSBvcnBoYW5zLmRpZmZlcmVuY2Uobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNpYmxpbmdzID0gbm9kZS5zaWJsaW5ncyhcIjp2aXNpYmxlXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBzaWJsaW5ncztcbiAgfSxcbiAgLypcbiAgICogTW92ZSBub2RlIG9wZXJhdGlvbiBzcGVjaWFsaXplZCBmb3IgZmlzaCBleWUgdmlldyBleHBhbmQgb3BlcmF0aW9uXG4gICAqIE1vdmVzIHRoZSBub2RlIGJ5IG1vdmluZyBpdHMgZGVzY2FuZGVudHMuIE1vdmVtZW50IGlzIGFuaW1hdGVkIGlmIGJvdGggc2luZ2xlIGFuZCBhbmltYXRlIGZsYWdzIGFyZSB0cnV0aHkuXG4gICAqL1xuICBmaXNoRXllVmlld01vdmVOb2RlOiBmdW5jdGlvbiAobm9kZSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gY3kuY29sbGVjdGlvbigpO1xuICAgIGlmKG5vZGUuaXNQYXJlbnQoKSl7XG4gICAgICAgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbihcIjp2aXNpYmxlXCIpO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgLypcbiAgICAgKiBJZiB0aGUgbm9kZSBpcyBzaW1wbGUgbW92ZSBpdHNlbGYgZGlyZWN0bHkgZWxzZSBtb3ZlIGl0IGJ5IG1vdmluZyBpdHMgY2hpbGRyZW4gYnkgYSBzZWxmIHJlY3Vyc2l2ZSBjYWxsXG4gICAgICovXG4gICAgaWYgKGNoaWxkcmVuTGlzdC5sZW5ndGggPT0gMCkge1xuICAgICAgdmFyIG5ld1Bvc2l0aW9uID0ge3g6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCArIFRfeCwgeTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ICsgVF95fTtcbiAgICAgIGlmICghc2luZ2xlIHx8ICFhbmltYXRlKSB7XG4gICAgICAgIG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCA9IG5ld1Bvc2l0aW9uLng7XG4gICAgICAgIG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSA9IG5ld1Bvc2l0aW9uLnk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50Kys7XG4gICAgICAgIG5vZGUuYW5pbWF0ZSh7XG4gICAgICAgICAgcG9zaXRpb246IG5ld1Bvc2l0aW9uLFxuICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQtLTtcbiAgICAgICAgICAgIGlmIChzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQgPiAwIHx8ICFub2RlVG9FeHBhbmQuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpKSB7XG5cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBhbGwgbm9kZXMgYXJlIG1vdmVkIHdlIGFyZSByZWFkeSB0byBleHBhbmQgc28gY2FsbCBleHBhbmQgbm9kZSBiYXNlIGZ1bmN0aW9uXG4gICAgICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGUsIGxheW91dEJ5KTtcblxuICAgICAgICAgIH1cbiAgICAgICAgfSwge1xuICAgICAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25EdXJhdGlvbiB8fCAxMDAwXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW5MaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShjaGlsZHJlbkxpc3RbaV0sIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHhQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XG4gICAgdmFyIHhfYSA9IDAuMDtcblxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xuICAgICAgeF9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd4JykgKyAocGFyZW50LndpZHRoKCkgLyAyKTtcbiAgICB9XG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcblxuICAgIGVsc2Uge1xuICAgICAgeF9hID0gbm9kZS5wb3NpdGlvbigneCcpO1xuICAgIH1cblxuICAgIHJldHVybiB4X2E7XG4gIH0sXG4gIHlQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XG5cbiAgICB2YXIgeV9hID0gMC4wO1xuXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICB5X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3knKSArIChwYXJlbnQuaGVpZ2h0KCkgLyAyKTtcbiAgICB9XG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcblxuICAgIGVsc2Uge1xuICAgICAgeV9hID0gbm9kZS5wb3NpdGlvbigneScpO1xuICAgIH1cblxuICAgIHJldHVybiB5X2E7XG4gIH0sXG4gIC8qXG4gICAqIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIG5vZGUgcGFyYW1ldGVyIGNhbGwgdGhpcyBtZXRob2RcbiAgICogd2l0aCB0aGUgc2FtZSByb290IHBhcmFtZXRlcixcbiAgICogcmVtb3ZlIHRoZSBjaGlsZCBhbmQgYWRkIHRoZSByZW1vdmVkIGNoaWxkIHRvIHRoZSBjb2xsYXBzZWRjaGlsZHJlbiBkYXRhXG4gICAqIG9mIHRoZSByb290IHRvIHJlc3RvcmUgdGhlbSBpbiB0aGUgY2FzZSBvZiBleHBhbmRhdGlvblxuICAgKiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4ga2VlcHMgdGhlIG5vZGVzIHRvIHJlc3RvcmUgd2hlbiB0aGVcbiAgICogcm9vdCBpcyBleHBhbmRlZFxuICAgKi9cbiAgcmVtb3ZlQ2hpbGRyZW46IGZ1bmN0aW9uIChub2RlLCByb290KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihjaGlsZCwgcm9vdCk7XG4gICAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcbiAgICAgIHBhcmVudERhdGFbY2hpbGQuaWQoKV0gPSBjaGlsZC5wYXJlbnQoKTtcbiAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XG4gICAgICB2YXIgcmVtb3ZlZENoaWxkID0gY2hpbGQucmVtb3ZlKCk7XG4gICAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZENoaWxkO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi51bmlvbihyZW1vdmVkQ2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgaXNNZXRhRWRnZTogZnVuY3Rpb24oZWRnZSkge1xuICAgIHJldHVybiBlZGdlLmhhc0NsYXNzKFwiY3ktZXhwYW5kLWNvbGxhcHNlLW1ldGEtZWRnZVwiKTtcbiAgfSxcbiAgYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIHJlbGF0ZWROb2RlcyA9IG5vZGUuZGVzY2VuZGFudHMoKTtcbiAgICB2YXIgZWRnZXMgPSByZWxhdGVkTm9kZXMuZWRnZXNXaXRoKGN5Lm5vZGVzKCkubm90KHJlbGF0ZWROb2Rlcy51bmlvbihub2RlKSkpO1xuICAgIFxuICAgIHZhciByZWxhdGVkTm9kZU1hcCA9IHt9O1xuICAgIFxuICAgIHJlbGF0ZWROb2Rlcy5lYWNoKGZ1bmN0aW9uKGVsZSwgaSkge1xuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBlbGUgPSBpO1xuICAgICAgfVxuICAgICAgcmVsYXRlZE5vZGVNYXBbZWxlLmlkKCldID0gdHJ1ZTtcbiAgICB9KTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuICAgICAgdmFyIHNvdXJjZSA9IGVkZ2Uuc291cmNlKCk7XG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS50YXJnZXQoKTtcbiAgICAgIFxuICAgICAgaWYgKCF0aGlzLmlzTWV0YUVkZ2UoZWRnZSkpIHsgLy8gaXMgb3JpZ2luYWxcbiAgICAgICAgdmFyIG9yaWdpbmFsRW5kc0RhdGEgPSB7XG4gICAgICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICAgICAgdGFyZ2V0OiB0YXJnZXRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGVkZ2UuYWRkQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xuICAgICAgICBlZGdlLmRhdGEoJ29yaWdpbmFsRW5kcycsIG9yaWdpbmFsRW5kc0RhdGEpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBlZGdlLm1vdmUoe1xuICAgICAgICB0YXJnZXQ6ICFyZWxhdGVkTm9kZU1hcFt0YXJnZXQuaWQoKV0gPyB0YXJnZXQuaWQoKSA6IG5vZGUuaWQoKSxcbiAgICAgICAgc291cmNlOiAhcmVsYXRlZE5vZGVNYXBbc291cmNlLmlkKCldID8gc291cmNlLmlkKCkgOiBub2RlLmlkKClcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgZmluZE5ld0VuZDogZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBjdXJyZW50ID0gbm9kZTtcbiAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcbiAgICB2YXIgcGFyZW50ID0gcGFyZW50RGF0YVtjdXJyZW50LmlkKCldO1xuICAgIFxuICAgIHdoaWxlKCAhY3VycmVudC5pbnNpZGUoKSApIHtcbiAgICAgIGN1cnJlbnQgPSBwYXJlbnQ7XG4gICAgICBwYXJlbnQgPSBwYXJlbnREYXRhW3BhcmVudC5pZCgpXTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGN1cnJlbnQ7XG4gIH0sXG4gIHJlcGFpckVkZ2VzOiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGNvbm5lY3RlZE1ldGFFZGdlcyA9IG5vZGUuY29ubmVjdGVkRWRnZXMoJy5jeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25uZWN0ZWRNZXRhRWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlZGdlID0gY29ubmVjdGVkTWV0YUVkZ2VzW2ldO1xuICAgICAgdmFyIG9yaWdpbmFsRW5kcyA9IGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJyk7XG4gICAgICB2YXIgY3VycmVudFNyY0lkID0gZWRnZS5kYXRhKCdzb3VyY2UnKTtcbiAgICAgIHZhciBjdXJyZW50VGd0SWQgPSBlZGdlLmRhdGEoJ3RhcmdldCcpO1xuICAgICAgXG4gICAgICBpZiAoIGN1cnJlbnRTcmNJZCA9PT0gbm9kZS5pZCgpICkge1xuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKHtcbiAgICAgICAgICBzb3VyY2U6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMuc291cmNlKS5pZCgpXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZSh7XG4gICAgICAgICAgdGFyZ2V0OiB0aGlzLmZpbmROZXdFbmQob3JpZ2luYWxFbmRzLnRhcmdldCkuaWQoKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKCBlZGdlLmRhdGEoJ3NvdXJjZScpID09PSBvcmlnaW5hbEVuZHMuc291cmNlLmlkKCkgJiYgZWRnZS5kYXRhKCd0YXJnZXQnKSA9PT0gb3JpZ2luYWxFbmRzLnRhcmdldC5pZCgpICkge1xuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XG4gICAgICAgIGVkZ2UucmVtb3ZlRGF0YSgnb3JpZ2luYWxFbmRzJyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAvKm5vZGUgaXMgYW4gb3V0ZXIgbm9kZSBvZiByb290XG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxuICAgYW5kIGl0IGlzIG5vdCB0aGUgcm9vdCBpdHNlbGYqL1xuICBpc091dGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xuICAgIHZhciB0ZW1wID0gbm9kZTtcbiAgICB3aGlsZSAodGVtcCAhPSBudWxsKSB7XG4gICAgICBpZiAodGVtcCA9PSByb290KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgLyoqXG4gICAqIEdldCBhbGwgY29sbGFwc2VkIGNoaWxkcmVuIC0gaW5jbHVkaW5nIG5lc3RlZCBvbmVzXG4gICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxuICAgKiBAcGFyYW0gY29sbGFwc2VkQ2hpbGRyZW4gOiBhIGNvbGxlY3Rpb24gdG8gc3RvcmUgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJuIDogY29sbGFwc2VkIGNoaWxkcmVuXG4gICAqL1xuICBnZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5OiBmdW5jdGlvbihub2RlLCBjb2xsYXBzZWRDaGlsZHJlbil7XG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpIHx8IFtdO1xuICAgIHZhciBpO1xuICAgIGZvciAoaT0wOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgaWYgKGNoaWxkcmVuW2ldLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJykpe1xuICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjaGlsZHJlbltpXSwgY29sbGFwc2VkQ2hpbGRyZW4pKTtcbiAgICAgIH1cbiAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24oY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XG4gIH0sXG4gIC8qKioqKioqKioqKiBzdGFydCBzZWN0aW9uIGVkZ2UgZXhwYW5kIGNvbGxhcHNlICAqL1xuICBjb2xsYXBzZUdpdmVuRWRnZXMgOiAgZnVuY3Rpb24oZWRnZXMsIG9wdGlvbnMpe1xuICAgIHZhciBub2RlcyA9IHRoaXMuaXNWYWxpZEVkZ2VzRm9yQ29sbGFwc2UoZWRnZXMpO1xuICAgIGlmKCFub2Rlcyl7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBlZGdlc1RvQ29sbGFwc2UgPSB7fTtcbiAgIFxuICAgIC8vZ3JvdXAgZWRnZXMgYnkgdHlwZSBpZiB0aGlzIG9wdGlvbiBpcyBzZXQgdG8gdHJ1ZVxuICAgIGlmKG9wdGlvbnMuR3JvdXBFZGdlc09mU2FtZVR5cGVPbkNvbGxhcHNlKXsgICAgICBcbiAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSl7XG4gICAgICAgIHZhciBlZGdlVHlwZSA9IG9wdGlvbnMuZWRnZVR5cGVJbmZvIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcHRpb25zLmVkZ2VUeXBlSW5mby5jYWxsKGVkZ2UpIDogZWRnZS5kYXRhKClbb3B0aW9ucy5lZGdlVHlwZUluZm9dO1xuICAgICAgICBpZihlZGdlc1RvQ29sbGFwc2UuaGFzT3duUHJvcGVydHkoZWRnZVR5cGUpKXtcbiAgICAgICAgICBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLnB1c2goZWRnZSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0gPSBbXS5jb25jYXQoW2VkZ2VdKTsgXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXSA9IGVkZ2VzO1xuICAgIH1cblxuICAgIHZhciBuZXdFZGdlcyA9IFtdO1xuICAgIGZvcihjb25zdCBlZGdlR3JvdXBUeXBlIGluIGVkZ2VzVG9Db2xsYXBzZSl7XG4gICAgICB2YXIgbmV3RWRnZSA9IHt9O1xuICAgICAgbmV3RWRnZS5kYXRhID0ge307XG4gICAgICBuZXdFZGdlLmRhdGEuc291cmNlID0gbm9kZXNbMF0uaWQoKTtcbiAgICAgIG5ld0VkZ2UuZGF0YS50YXJnZXQgPSBub2Rlc1sxXS5pZCgpO1xuICAgICAgbmV3RWRnZS5kYXRhLmlkID0gXCJjb2xsYXBzZWRFZGdlX1wiK25vZGVzWzBdLmlkKCkgKyBcIl9cIitub2Rlc1sxXS5pZCgpK1wiX1wiK2VkZ2VHcm91cFR5cGU7XG5cbiAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IFtdO1xuICAgICAgZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmZvckVhY2goZnVuY3Rpb24oZWRnZSl7XG4gICAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcy5wdXNoKHtkYXRhOiBlZGdlLmRhdGEoKSxjbGFzc2VzOmVkZ2UuY2xhc3NlcygpfSk7XG4gICAgICB9KTtcbiAgICAgXG4gICAgICB2YXIgZWRnZXNUeXBlRmllbGQgPSBvcHRpb25zLmVkZ2VUeXBlSW5mbyBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gXCJlZGdlVHlwZVwiIDogb3B0aW9ucy5lZGdlVHlwZUluZm87XG4gICAgICBuZXdFZGdlLmRhdGFbZWRnZXNUeXBlRmllbGRdID0gZWRnZUdyb3VwVHlwZTtcbiAgICAgIG5ld0VkZ2UuY2xhc3NlcyA9IFwiY29sbGFwc2VkRWRnZVwiO1xuICAgICBcbiAgICAgIG5ld0VkZ2VzLnB1c2gobmV3RWRnZSk7XG4gICAgfVxuICAgXG4gICAgY3kucmVtb3ZlKGVkZ2VzKTtcbiAgICBjeS5hZGQobmV3RWRnZXMpO1xuICAgIFxuICAgIHJldHVybiBuZXdFZGdlcztcbiAgfSxcblxuICBleHBhbmRFZGdlIDogZnVuY3Rpb24oZWRnZSl7XG4gICAgdmFyIGVkZ2VzID0gZWRnZS5kYXRhKCkuY29sbGFwc2VkRWRnZXM7ICAgICAgICBcbiAgICAgICAgaWYoZWRnZXMgIT0gdW5kZWZpbmVkICYmIGVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgICAgIGN5LnJlbW92ZShlZGdlKTtcbiAgICAgICAgICB2YXIgcmVzdG9yZWRFZGdlcyA9IFtdO1xuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24ocmVzdG9yZWRFZGdlKXtcbiAgICAgICAgICAgIHJlc3RvcmVkRWRnZS5ncm91cCA9IFwiZWRnZXNcIjtcbiAgICAgICAgICAgIHJlc3RvcmVkRWRnZXMucHVzaChyZXN0b3JlZEVkZ2UpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGN5LmFkZChyZXN0b3JlZEVkZ2VzKTtcbiAgICAgICAgfVxuICB9LFxuXG4gIC8vaWYgdGhlIGVkZ2VzIGFyZSBvbmx5IGJldHdlZW4gdHdvIG5vZGVzICh2YWxpZCBmb3IgY29sbHBhc2luZykgcmV0dXJucyB0aGUgdHdvIG5vZGVzIGVsc2UgaXQgcmV0dXJucyBmYWxzZVxuICBpc1ZhbGlkRWRnZXNGb3JDb2xsYXBzZSA6IGZ1bmN0aW9uKGVkZ2VzKXtcbiAgICB2YXIgZW5kUG9pbnRzID0gdGhpcy5nZXRFZGdlc0Rpc3RpbmN0RW5kUG9pbnRzKGVkZ2VzKTtcbiAgICBpZihlbmRQb2ludHMubGVuZ3RoICE9IDIpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIGVuZFBvaW50cztcbiAgICB9XG4gIH0sXG5cbiAgLy9yZXR1cm5zIGEgbGlzdCBvZiBkaXN0aW5jdCBlbmRwb2ludHMgb2YgYSBzZXQgb2YgZWRnZXMuXG4gIGdldEVkZ2VzRGlzdGluY3RFbmRQb2ludHMgOiBmdW5jdGlvbihlZGdlcyl7XG4gICAgdmFyIGVuZFBvaW50cyA9IFtdO1xuICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSl7XG4gICAgICBpZighdGhpcy5jb250YWluc0VsZW1lbnQoZW5kUG9pbnRzLGVkZ2Uuc291cmNlKCkpKXtcbiAgICAgICAgZW5kUG9pbnRzLnB1c2goZWRnZS5zb3VyY2UoKSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKCF0aGlzLmNvbnRhaW5zRWxlbWVudChlbmRQb2ludHMsZWRnZS50YXJnZXQoKSkpe1xuICAgICAgICBlbmRQb2ludHMucHVzaChlZGdlLnRhcmdldCgpKTtcbiAgICAgIH1cbiAgICAgIFxuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICByZXR1cm4gZW5kUG9pbnRzO1xuXG4gIH0sXG5cbiAgLy9mdW5jdGlvbiB0byBjaGVjayBpZiBhIGxpc3Qgb2YgZWxlbWVudHMgY29udGFpbnMgdGhlIGdpdmVuIGVsZW1lbnQgYnkgbG9va2luZyBhdCBpZCgpXG4gIGNvbnRhaW5zRWxlbWVudCA6IGZ1bmN0aW9uKGVsZW1lbnRzLCBlbGVtZW50KXtcbiAgICB2YXIgZXhpc3RzID0gZmFsc2U7XG4gICAgZm9yKHZhciBpID0gMCA7IGk8ZWxlbWVudHMubGVuZ3RoIDsgaSsrKXtcbiAgICAgIGlmKGVsZW1lbnRzW2ldLmlkKCkgPT0gZWxlbWVudC5pZCgpKXtcbiAgICAgICAgZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBleGlzdHM7XG4gIH1cbiAgLyoqKioqKioqKioqZW5kIHNlY3Rpb24gZWRnZSBleHBhbmQgY29sbGFwc2UgKi9cbn1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcztcbiIsIjtcbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUpIHtcblxuICAgIGlmICghY3l0b3NjYXBlKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcblxuICAgIHZhciB1bmRvUmVkb1V0aWxpdGllcyA9IHJlcXVpcmUoJy4vdW5kb1JlZG9VdGlsaXRpZXMnKTtcbiAgICB2YXIgY3VlVXRpbGl0aWVzID0gcmVxdWlyZShcIi4vY3VlVXRpbGl0aWVzXCIpO1xuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBleHRlbmRCeSkge1xuICAgICAgdmFyIHRlbXBPcHRzID0ge307XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucylcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcblxuICAgICAgZm9yICh2YXIga2V5IGluIGV4dGVuZEJ5KVxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcbiAgICAgICAgICB0ZW1wT3B0c1trZXldID0gZXh0ZW5kQnlba2V5XTtcbiAgICAgIHJldHVybiB0ZW1wT3B0cztcbiAgICB9XG4gICAgXG4gICAgLy8gZXZhbHVhdGUgc29tZSBzcGVjaWZpYyBvcHRpb25zIGluIGNhc2Ugb2YgdGhleSBhcmUgc3BlY2lmaWVkIGFzIGZ1bmN0aW9ucyB0byBiZSBkeW5hbWljYWxseSBjaGFuZ2VkXG4gICAgZnVuY3Rpb24gZXZhbE9wdGlvbnMob3B0aW9ucykge1xuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcbiAgICAgIHZhciBmaXNoZXllID0gdHlwZW9mIG9wdGlvbnMuZmlzaGV5ZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZmlzaGV5ZS5jYWxsKCkgOiBvcHRpb25zLmZpc2hleWU7XG4gICAgICBcbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XG4gICAgICBvcHRpb25zLmZpc2hleWUgPSBmaXNoZXllO1xuICAgIH1cbiAgICBcbiAgICAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHRoZSBBUEkgaW5zdGFuY2UgZm9yIHRoZSBleHRlbnNpb25cbiAgICBmdW5jdGlvbiBjcmVhdGVFeHRlbnNpb25BUEkoY3ksIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzKSB7XG4gICAgICB2YXIgYXBpID0ge307IC8vIEFQSSB0byBiZSByZXR1cm5lZFxuICAgICAgLy8gc2V0IGZ1bmN0aW9uc1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVOZXdPcHRpb25zKCBvcHRzICkge1xuICAgICAgICB2YXIgY3VycmVudE9wdHMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICBpZiAoIG9wdHMuY3VlRW5hYmxlZCAmJiAhY3VycmVudE9wdHMuY3VlRW5hYmxlZCApIHtcbiAgICAgICAgICBhcGkuZW5hYmxlQ3VlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoICFvcHRzLmN1ZUVuYWJsZWQgJiYgY3VycmVudE9wdHMuY3VlRW5hYmxlZCApIHtcbiAgICAgICAgICBhcGkuZGlzYWJsZUN1ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCBhbGwgb3B0aW9ucyBhdCBvbmNlXG4gICAgICBhcGkuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhvcHRzKTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBvcHRzKTtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHRlbmRPcHRpb25zID0gZnVuY3Rpb24ob3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyggb3B0aW9ucywgb3B0cyApO1xuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG5ld09wdGlvbnMpO1xuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG5ld09wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICAvLyBzZXQgdGhlIG9wdGlvbiB3aG9zZSBuYW1lIGlzIGdpdmVuXG4gICAgICBhcGkuc2V0T3B0aW9uID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHZhciBvcHRzID0ge307XG4gICAgICAgIG9wdHNbIG5hbWUgXSA9IHZhbHVlO1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBleHRlbmRPcHRpb25zKCBvcHRpb25zLCBvcHRzICk7XG5cbiAgICAgICAgaGFuZGxlTmV3T3B0aW9ucyhuZXdPcHRpb25zKTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnLCBuZXdPcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIENvbGxlY3Rpb24gZnVuY3Rpb25zXG5cbiAgICAgIC8vIGNvbGxhcHNlIGdpdmVuIGVsZXMgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxuICAgICAgYXBpLmNvbGxhcHNlID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBjb2xsYXBzZSBnaXZlbiBlbGVzIHJlY3Vyc2l2ZWx5IGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cbiAgICAgIGFwaS5jb2xsYXBzZVJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2UoZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXG4gICAgICBhcGkuZXhwYW5kID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoX2VsZXMpO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kR2l2ZW5Ob2RlcyhlbGVzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyByZWN1c2l2ZWx5IGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cbiAgICAgIGFwaS5leHBhbmRSZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBldmFsT3B0aW9ucyh0ZW1wT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEFsbE5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cblxuICAgICAgLy8gQ29yZSBmdW5jdGlvbnNcblxuICAgICAgLy8gY29sbGFwc2UgYWxsIGNvbGxhcHNpYmxlIG5vZGVzXG4gICAgICBhcGkuY29sbGFwc2VBbGwgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZVJlY3Vyc2l2ZWx5KHRoaXMuY29sbGFwc2libGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBleHBhbmQgYWxsIGV4cGFuZGFibGUgbm9kZXNcbiAgICAgIGFwaS5leHBhbmRBbGwgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5leHBhbmRSZWN1cnNpdmVseSh0aGlzLmV4cGFuZGFibGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXG5cbiAgICAgIC8vIHJldHVybnMgaWYgdGhlIGdpdmVuIG5vZGUgaXMgZXhwYW5kYWJsZVxuICAgICAgYXBpLmlzRXhwYW5kYWJsZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIHJldHVybnMgaWYgdGhlIGdpdmVuIG5vZGUgaXMgY29sbGFwc2libGVcbiAgICAgIGFwaS5pc0NvbGxhcHNpYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLmlzRXhwYW5kYWJsZShub2RlKSAmJiBub2RlLmlzUGFyZW50KCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBnZXQgY29sbGFwc2libGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXG4gICAgICBhcGkuY29sbGFwc2libGVOb2RlcyA9IGZ1bmN0aW9uIChfbm9kZXMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbm9kZXMgPSBfbm9kZXMgPyBfbm9kZXMgOiBjeS5ub2RlcygpO1xuICAgICAgICByZXR1cm4gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcbiAgICAgICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBlbGUgPSBpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc2VsZi5pc0NvbGxhcHNpYmxlKGVsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgLy8gZ2V0IGV4cGFuZGFibGUgb25lcyBpbnNpZGUgZ2l2ZW4gbm9kZXMgaWYgbm9kZXMgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQgY29uc2lkZXIgYWxsIG5vZGVzXG4gICAgICBhcGkuZXhwYW5kYWJsZU5vZGVzID0gZnVuY3Rpb24gKF9ub2Rlcykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBub2RlcyA9IF9ub2RlcyA/IF9ub2RlcyA6IGN5Lm5vZGVzKCk7XG4gICAgICAgIHJldHVybiBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xuICAgICAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGVsZSA9IGk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLmlzRXhwYW5kYWJsZShlbGUpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBcbiAgICAgIC8vIEdldCB0aGUgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIGNvbGxhcHNlZCBub2RlIHdoaWNoIGFyZSByZW1vdmVkIGR1cmluZyBjb2xsYXBzZSBvcGVyYXRpb25cbiAgICAgIGFwaS5nZXRDb2xsYXBzZWRDaGlsZHJlbiA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XG4gICAgICB9O1xuXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiByZWN1cnNpdmVseSBpbmNsdWRpbmcgbmVzdGVkIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICogUmV0dXJuZWQgdmFsdWUgaW5jbHVkZXMgZWRnZXMgYW5kIG5vZGVzLCB1c2Ugc2VsZWN0b3IgdG8gZ2V0IGVkZ2VzIG9yIG5vZGVzXG4gICAgICAgKiBAcGFyYW0gbm9kZSA6IGEgY29sbGFwc2VkIG5vZGVcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICovXG4gICAgICBhcGkuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gY3kuY29sbGVjdGlvbigpO1xuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShub2RlLCBjb2xsYXBzZWRDaGlsZHJlbik7XG4gICAgICB9O1xuXG4gICAgICAvKiogR2V0IGNvbGxhcHNlZCBjaGlsZHJlbiBvZiBhbGwgY29sbGFwc2VkIG5vZGVzIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKiBSZXR1cm5lZCB2YWx1ZSBpbmNsdWRlcyBlZGdlcyBhbmQgbm9kZXMsIHVzZSBzZWxlY3RvciB0byBnZXQgZWRnZXMgb3Igbm9kZXNcbiAgICAgICAqIEByZXR1cm4gYWxsIGNvbGxhcHNlZCBjaGlsZHJlblxuICAgICAgICovXG4gICAgICBhcGkuZ2V0QWxsQ29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICAgICAgdmFyIGNvbGxhcHNlZE5vZGVzID0gY3kubm9kZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlXCIpO1xuICAgICAgICB2YXIgajtcbiAgICAgICAgZm9yIChqPTA7IGogPCBjb2xsYXBzZWROb2Rlcy5sZW5ndGg7IGorKyl7XG4gICAgICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjb2xsYXBzZWROb2Rlc1tqXSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb2xsYXBzZWRDaGlsZHJlbjtcbiAgICAgIH07XG4gICAgICAvLyBUaGlzIG1ldGhvZCBmb3JjZXMgdGhlIHZpc3VhbCBjdWUgdG8gYmUgY2xlYXJlZC4gSXQgaXMgdG8gYmUgY2FsbGVkIGluIGV4dHJlbWUgY2FzZXNcbiAgICAgIGFwaS5jbGVhclZpc3VhbEN1ZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgY3kudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnKTtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5kaXNhYmxlQ3VlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuY3VlRW5hYmxlZCkge1xuICAgICAgICAgIGN1ZVV0aWxpdGllcygndW5iaW5kJywgY3ksIGFwaSk7XG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGFwaS5lbmFibGVDdWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuY3VlRW5hYmxlZCkge1xuICAgICAgICAgIGN1ZVV0aWxpdGllcygncmViaW5kJywgY3ksIGFwaSk7XG4gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgYXBpLmdldFBhcmVudCA9IGZ1bmN0aW9uKG5vZGVJZCkge1xuICAgICAgICBpZihjeS5nZXRFbGVtZW50QnlJZChub2RlSWQpWzBdID09PSB1bmRlZmluZWQpe1xuICAgICAgICAgIHZhciBwYXJlbnREYXRhID0gZ2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnKTtcbiAgICAgICAgICByZXR1cm4gcGFyZW50RGF0YVtub2RlSWRdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgcmV0dXJuIGN5LmdldEVsZW1lbnRCeUlkKG5vZGVJZCkucGFyZW50KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGFwaS5jb2xsYXBzZUVkZ2VzID0gZnVuY3Rpb24oZWRnZXMsb3B0cyl7ICAgICAgICBcbiAgICAgICAgaWYoZWRnZXMubGVuZ3RoIDwgMikgcmV0dXJuO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7ICAgICAgIFxuICAgICBcblxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbkVkZ2VzKGVkZ2VzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuICAgICAgYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMgPSBmdW5jdGlvbihub2Rlcywgb3B0cyl7XG4gICAgIFxuICAgICAgICBmdW5jdGlvbiBwYWlyd2lzZShsaXN0KSB7XG4gICAgICAgICAgdmFyIHBhaXJzID0gW107XG4gICAgICAgICAgbGlzdFxuICAgICAgICAgICAgLnNsaWNlKDAsIGxpc3QubGVuZ3RoIC0gMSlcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uIChmaXJzdCwgbikge1xuICAgICAgICAgICAgICB2YXIgdGFpbCA9IGxpc3Quc2xpY2UobiArIDEsIGxpc3QubGVuZ3RoKTtcbiAgICAgICAgICAgICAgdGFpbC5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgcGFpcnMucHVzaChbZmlyc3QsIGl0ZW1dKVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIHBhaXJzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBub2Rlc1BhaXJzID0gcGFpcndpc2Uobm9kZXMpO1xuICAgICAgICBub2Rlc1BhaXJzLmZvckVhY2goZnVuY3Rpb24obm9kZVBhaXIpe1xuICAgICAgICAgIHZhciBlZGdlcyA9IG5vZGVQYWlyWzBdLmNvbm5lY3RlZEVkZ2VzKCdbc291cmNlID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0sW3RhcmdldCA9IFwiJysgbm9kZVBhaXJbMV0uaWQoKSsnXCJdJyk7ICAgICAgICAgXG4gICAgICAgICAgdGhpcy5jb2xsYXBzZUVkZ2VzKGVkZ2VzLCBvcHRzKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTsgICAgICAgXG4gICAgIFxuICAgICAgXG5cbiAgICAgIH07XG5cbiAgICAgIGFwaS5jb2xsYXBzZUFsbEVkZ2VzID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgICAgICAgZnVuY3Rpb24gcGFpcndpc2UobGlzdCkge1xuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xuICAgICAgICAgIGxpc3RcbiAgICAgICAgICAgIC5zbGljZSgwLCBsaXN0Lmxlbmd0aCAtIDEpXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgIHRhaWwuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBwYWlycztcbiAgICAgICAgfSAgICAgICAgXG4gICAgICAgIHZhciBub2Rlc1BhaXJzID0gcGFpcndpc2UoY3kuZWRnZXMoKS5jb25uZWN0ZWROb2RlcygpKTtcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVQYWlyKXtcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnW3NvdXJjZSA9IFwiJysgbm9kZVBhaXJbMV0uaWQoKSsnXCJdLFt0YXJnZXQgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXScpOyAgICAgICAgIFxuICAgICAgICAgIHRoaXMuY29sbGFwc2VFZGdlcyhlZGdlcywgb3B0aW9ucyk7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHBhbmRFZGdlID0gZnVuY3Rpb24oZWRnZSl7ICAgICAgICBcblxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlKTtcbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHBhbmRFZGdlcyA9IGZ1bmN0aW9uKGVkZ2VzKXsgICAgICAgIFxuXG4gICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSl7XG4gICAgICAgICAgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlKTtcbiAgICAgICAgfSlcbiAgICAgIH07XG5cbiAgICAgIGFwaS5leHBhbmRBbGxFZGdlcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBlZGdlcyA9IGN5LmVkZ2VzKFwiLmNvbGxhcHNlZEVkZ2VcIik7XG4gICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKXtcbiAgICAgICAgIHRoaXMuZXhwYW5kRWRnZShlZGdlKTtcbiAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgXG4gICAgICB9O1xuICAgICBcbiAgICAgIHJldHVybiBhcGk7IC8vIFJldHVybiB0aGUgQVBJIGluc3RhbmNlXG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSB3aG9sZSBzY3JhdGNocGFkIHJlc2VydmVkIGZvciB0aGlzIGV4dGVuc2lvbiAob24gYW4gZWxlbWVudCBvciBjb3JlKSBvciBnZXQgYSBzaW5nbGUgcHJvcGVydHkgb2YgaXRcbiAgICBmdW5jdGlvbiBnZXRTY3JhdGNoIChjeU9yRWxlLCBuYW1lKSB7XG4gICAgICBpZiAoY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHt9KTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNjcmF0Y2ggPSBjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XG4gICAgICB2YXIgcmV0VmFsID0gKCBuYW1lID09PSB1bmRlZmluZWQgKSA/IHNjcmF0Y2ggOiBzY3JhdGNoW25hbWVdO1xuICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBzaW5nbGUgcHJvcGVydHkgb24gc2NyYXRjaHBhZCBvZiBhbiBlbGVtZW50IG9yIHRoZSBjb3JlXG4gICAgZnVuY3Rpb24gc2V0U2NyYXRjaCAoY3lPckVsZSwgbmFtZSwgdmFsKSB7XG4gICAgICBnZXRTY3JhdGNoKGN5T3JFbGUpW25hbWVdID0gdmFsO1xuICAgIH1cblxuICAgIC8vIHJlZ2lzdGVyIHRoZSBleHRlbnNpb24gY3kuZXhwYW5kQ29sbGFwc2UoKVxuICAgIGN5dG9zY2FwZShcImNvcmVcIiwgXCJleHBhbmRDb2xsYXBzZVwiLCBmdW5jdGlvbiAob3B0cykge1xuICAgICAgdmFyIGN5ID0gdGhpcztcblxuICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpIHx8IHtcbiAgICAgICAgbGF5b3V0Qnk6IG51bGwsIC8vIGZvciByZWFycmFuZ2UgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCdzIGp1c3QgbGF5b3V0IG9wdGlvbnMgb3Igd2hvbGUgbGF5b3V0IGZ1bmN0aW9uLiBDaG9vc2UgeW91ciBzaWRlIVxuICAgICAgICBmaXNoZXllOiB0cnVlLCAvLyB3aGV0aGVyIHRvIHBlcmZvcm0gZmlzaGV5ZSB2aWV3IGFmdGVyIGV4cGFuZC9jb2xsYXBzZSB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiB0b29cbiAgICAgICAgYW5pbWF0ZTogdHJ1ZSwgLy8gd2hldGhlciB0byBhbmltYXRlIG9uIGRyYXdpbmcgY2hhbmdlcyB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiB0b29cbiAgICAgICAgYW5pbWF0aW9uRHVyYXRpb246IDEwMDAsIC8vIHdoZW4gYW5pbWF0ZSBpcyB0cnVlLCB0aGUgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzIG9mIHRoZSBhbmltYXRpb25cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHsgfSwgLy8gY2FsbGJhY2sgd2hlbiBleHBhbmQvY29sbGFwc2UgaW5pdGlhbGl6ZWRcbiAgICAgICAgdW5kb2FibGU6IHRydWUsIC8vIGFuZCBpZiB1bmRvUmVkb0V4dGVuc2lvbiBleGlzdHMsXG5cbiAgICAgICAgY3VlRW5hYmxlZDogdHJ1ZSwgLy8gV2hldGhlciBjdWVzIGFyZSBlbmFibGVkXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb246ICd0b3AtbGVmdCcsIC8vIGRlZmF1bHQgY3VlIHBvc2l0aW9uIGlzIHRvcCBsZWZ0IHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHBlciBub2RlIHRvb1xuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNpemU6IDEyLCAvLyBzaXplIG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTogOCwgLy8gc2l6ZSBvZiBsaW5lcyB1c2VkIGZvciBkcmF3aW5nIHBsdXMtbWludXMgaWNvbnNcbiAgICAgICAgZXhwYW5kQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgZXhwYW5kIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBleHBhbmQgY3VlXG4gICAgICAgIGNvbGxhcHNlQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgY29sbGFwc2UgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGNvbGxhcHNlIGN1ZVxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5OiAxLCAvLyBzZW5zaXRpdml0eSBvZiBleHBhbmQtY29sbGFwc2UgY3Vlc1xuICAgICAgIFxuICAgICAgICBlZGdlVHlwZUluZm8gOiAnZWRnZVR5cGUnLCAvL3RoZSBuYW1lIG9mIHRoZSBmaWVsZCB0aGF0IGhhcyB0aGUgZWRnZSB0eXBlLCByZXRyaWV2ZWQgZnJvbSBlZGdlLmRhdGEoKSwgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgR3JvdXBFZGdlc09mU2FtZVR5cGVPbkNvbGxhcHNlIDogZmFsc2UsXG4gICAgICAgIHpJbmRleDogOTk5IC8vIHotaW5kZXggdmFsdWUgb2YgdGhlIGNhbnZhcyBpbiB3aGljaCBjdWUgxLFtYWdlcyBhcmUgZHJhd25cbiAgICAgIH07XG5cbiAgICAgIC8vIElmIG9wdHMgaXMgbm90ICdnZXQnIHRoYXQgaXMgaXQgaXMgYSByZWFsIG9wdGlvbnMgb2JqZWN0IHRoZW4gaW5pdGlsaXplIHRoZSBleHRlbnNpb25cbiAgICAgIGlmIChvcHRzICE9PSAnZ2V0Jykge1xuICAgICAgICBvcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcblxuICAgICAgICB2YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzJykoY3kpO1xuICAgICAgICB2YXIgYXBpID0gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5LCBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyk7IC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxuXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdhcGknLCBhcGkpO1xuXG4gICAgICAgIHVuZG9SZWRvVXRpbGl0aWVzKGN5LCBhcGkpO1xuXG4gICAgICAgIGN1ZVV0aWxpdGllcyhvcHRpb25zLCBjeSwgYXBpKTtcblxuICAgICAgICAvLyBpZiB0aGUgY3VlIGlzIG5vdCBlbmFibGVkIHVuYmluZCBjdWUgZXZlbnRzXG4gICAgICAgIGlmKCFvcHRpb25zLmN1ZUVuYWJsZWQpIHtcbiAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3VuYmluZCcsIGN5LCBhcGkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBvcHRpb25zLnJlYWR5ICkge1xuICAgICAgICAgIG9wdGlvbnMucmVhZHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgb3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHBhcmVudERhdGEgPSB7fTtcbiAgICAgICAgc2V0U2NyYXRjaChjeSwgJ3BhcmVudERhdGEnLCBwYXJlbnREYXRhKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGdldFNjcmF0Y2goY3ksICdhcGknKTsgLy8gRXhwb3NlIHRoZSBBUEkgdG8gdGhlIHVzZXJzXG4gICAgfSk7XG4gIH07XG4gIFxuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZXhwYW5kLWNvbGxhcHNlJywgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xuICAgIH0pO1xuICB9XG5cbiAgICBpZiAodHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcbiAgICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSk7XG4gIH1cblxufSkoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCBhcGkpIHtcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHt9LCB0cnVlKTtcblxuICBmdW5jdGlvbiBnZXRFbGVzKF9lbGVzKSB7XG4gICAgcmV0dXJuICh0eXBlb2YgX2VsZXMgPT09IFwic3RyaW5nXCIpID8gY3kuJChfZWxlcykgOiBfZWxlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE5vZGVQb3NpdGlvbnMoKSB7XG4gICAgdmFyIHBvc2l0aW9ucyA9IHt9O1xuICAgIHZhciBub2RlcyA9IGN5Lm5vZGVzKCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZWxlID0gbm9kZXNbaV07XG4gICAgICBwb3NpdGlvbnNbZWxlLmlkKCldID0ge1xuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxuICAgICAgICB5OiBlbGUucG9zaXRpb24oXCJ5XCIpXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBwb3NpdGlvbnM7XG4gIH1cblxuICBmdW5jdGlvbiByZXR1cm5Ub1Bvc2l0aW9ucyhwb3NpdGlvbnMpIHtcbiAgICB2YXIgY3VycmVudFBvc2l0aW9ucyA9IHt9O1xuICAgIGN5Lm5vZGVzKCkubm90KFwiOnBhcmVudFwiKS5wb3NpdGlvbnMoZnVuY3Rpb24gKGVsZSwgaSkge1xuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBlbGUgPSBpO1xuICAgICAgfVxuICAgICAgY3VycmVudFBvc2l0aW9uc1tlbGUuaWQoKV0gPSB7XG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcbiAgICAgIH07XG4gICAgICB2YXIgcG9zID0gcG9zaXRpb25zW2VsZS5pZCgpXTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IHBvcy54LFxuICAgICAgICB5OiBwb3MueVxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjdXJyZW50UG9zaXRpb25zO1xuICB9XG5cbiAgdmFyIHNlY29uZFRpbWVPcHRzID0ge1xuICAgIGxheW91dEJ5OiBudWxsLFxuICAgIGFuaW1hdGU6IGZhbHNlLFxuICAgIGZpc2hleWU6IGZhbHNlXG4gIH07XG5cbiAgZnVuY3Rpb24gZG9JdChmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICB2YXIgbm9kZXMgPSBnZXRFbGVzKGFyZ3Mubm9kZXMpO1xuICAgICAgaWYgKGFyZ3MuZmlyc3RUaW1lKSB7XG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9ucygpO1xuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKGFyZ3Mub3B0aW9ucykgOiBhcGlbZnVuY10obm9kZXMsIGFyZ3Mub3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQub2xkRGF0YSA9IGdldE5vZGVQb3NpdGlvbnMoKTtcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGFwaVtmdW5jXShzZWNvbmRUaW1lT3B0cykgOiBhcGlbZnVuY10oY3kuY29sbGVjdGlvbihub2RlcyksIHNlY29uZFRpbWVPcHRzKTtcbiAgICAgICAgcmV0dXJuVG9Qb3NpdGlvbnMoYXJncy5vbGREYXRhKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9XG5cbiAgdmFyIGFjdGlvbnMgPSBbXCJjb2xsYXBzZVwiLCBcImNvbGxhcHNlUmVjdXJzaXZlbHlcIiwgXCJjb2xsYXBzZUFsbFwiLCBcImV4cGFuZFwiLCBcImV4cGFuZFJlY3Vyc2l2ZWx5XCIsIFwiZXhwYW5kQWxsXCJdO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIGlmKGkgPT0gMilcbiAgICAgIHVyLmFjdGlvbihcImNvbGxhcHNlQWxsXCIsIGRvSXQoXCJjb2xsYXBzZUFsbFwiKSwgZG9JdChcImV4cGFuZFJlY3Vyc2l2ZWx5XCIpKTtcbiAgICBlbHNlIGlmKGkgPT0gNSlcbiAgICAgIHVyLmFjdGlvbihcImV4cGFuZEFsbFwiLCBkb0l0KFwiZXhwYW5kQWxsXCIpLCBkb0l0KFwiY29sbGFwc2VSZWN1cnNpdmVseVwiKSk7XG4gICAgZWxzZVxuICAgICAgdXIuYWN0aW9uKGFjdGlvbnNbaV0sIGRvSXQoYWN0aW9uc1tpXSksIGRvSXQoYWN0aW9uc1soaSArIDMpICUgNl0pKTtcbiAgfVxuXG59O1xuIl19
