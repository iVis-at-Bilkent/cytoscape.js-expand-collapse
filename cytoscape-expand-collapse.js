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

module.exports = function (params, cy, api, $) {
  var fn = params;

  var eMouseOver, eMouseOut, ePosition, eRemove, eTap, eZoom, eAdd, eFree;
  var nodeWithRenderedCue;
  
  var functions = {
    init: function () {
      var self = this;
      var opts = params;
      var $container = this;
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

      function clearDraws() {
        var w = $container.width();
        var h = $container.height();

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
        if (!isCollapsed && options().expandCueImage) {
          var img=new Image();
          img.src = options().expandCueImage;
          ctx.drawImage(img, expandcollapseCenterX, expandcollapseCenterY, rectSize, rectSize);
        }
        else if (isCollapsed && options().collapseCueImage) {
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
        cy.bind('zoom pan', eZoom = function () {
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

		cy.on('mousemove', function(e){
			if(!isInsideCompound(nodeWithRenderedCue, e)){
				clearDraws()
			}
			else if(nodeWithRenderedCue){
				drawExpandCollapseCue(nodeWithRenderedCue);
			}
		});

		cy.on('mouseover', 'node', eMouseOver = function (e) {
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
		cy.on('mousedown', function(e){
			oldMousePos = e.renderedPosition || e.cyRenderedPosition
		});
		cy.on('mouseup', function(e){
			currMousePos = e.renderedPosition || e.cyRenderedPosition
		});

		cy.on('drag', 'node', eMouseOut = function (e) {
			clearDraws();
		});

		cy.on('position', 'node', ePosition = function () {
			if (nodeWithRenderedCue)
				clearDraws();
		});
        
        // If compounds are resized position event is not triggered though the position of the node is changed.
        // Therefore, we listen to noderesize.resizedrag event here and if the node is a compound we do what is supposed be done in position event.
        cy.on("noderesize.resizedrag", function(e, type, node){ 
            if (node.isParent() && nodeWithRenderedCue) {
                clearDraws();
            }
        });

		cy.on('remove', 'node', eRemove = function () {
			clearDraws();
			nodeWithRenderedCue = null;
		});

		var ur;
		cy.on('select', 'node', function(){
			if (this.length > cy.nodes(":selected").length)
				this.unselect();
		});

		cy.on('tap', Tap = function (event) {
			var node = nodeWithRenderedCue;
			if (node){
				var expandcollapseRenderedStartX = node._private.data.expandcollapseRenderedStartX;
				var expandcollapseRenderedStartY = node._private.data.expandcollapseRenderedStartY;
				var expandcollapseRenderedRectSize = node._private.data.expandcollapseRenderedCueSize;
				var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
				var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;
                
                var cyRenderedPos = event.renderedPosition || event.cyRenderedPosition;
				var cyRenderedPosX = cyRenderedPos.x;
				var cyRenderedPosY = cyRenderedPos.y;
				var factor = (options().expandCollapseCueSensitivity - 1) / 2;

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
      x: node.position('x') - node.data('position-before-collapse').x,
      y: node.position('y') - node.data('position-before-collapse').y
    };

    node.removeData("infoLabel");
    node.removeClass('cy-expand-collapse-collapsed-node');

    node.trigger("expandcollapse.beforeexpand");
    node._private.data.collapsedChildren.restore();
    this.repairEdges(node);
    node._private.data.collapsedChildren = null;
    node.trigger("expandcollapse.afterexpand");


    elementUtilities.moveNodes(positionDiff, node.children());
    node.trigger("position"); // position not triggered by default when nodes are moved
    node.removeData('position-before-collapse');
    
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
        this.expandNode(node, options.fisheye, true, options.animate, options.layoutBy);
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
    this.simpleCollapseGivenNodes(nodes, options);
    cy.endBatch();

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
  expandNode: function (node, applyFishEyeView, single, animate, layoutBy) {
    var self = this;
    
    // If animate parameter is not set do these operations in a batch. Note that this parameter is unset 
    // if more then one node to be expanded (independant of related user option)
    if( !animate ) {
      cy.startBatch();
    }

    var commonExpandOperation = function (node, applyFishEyeView, single, animate, layoutBy) {
      if (applyFishEyeView) {

        node.data('width-before-fisheye', node.data('size-before-collapse').w);
        node.data('height-before-fisheye', node.data('size-before-collapse').h);
        
        // Fisheye view expand the node.
        // The first paramter indicates the node to apply fisheye view, the third parameter indicates the node
        // to be expanded after fisheye view is applied.
        self.fishEyeViewExpandGivenNode(node, single, node, animate, layoutBy);
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
          x1: node.position('x') - node.data('size-before-collapse').w / 2 - padding,
          x2: node.position('x') + node.data('size-before-collapse').w / 2 + padding,
          y1: node.position('y') - node.data('size-before-collapse').h / 2 - padding,
          y2: node.position('y') + node.data('size-before-collapse').h / 2 + padding
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
                commonExpandOperation(node, applyFishEyeView, single, animate, layoutBy);
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
      }
      
      // If animating is not true we need to call commonExpandOperation here
      if (!animating) {
        commonExpandOperation(node, applyFishEyeView, single, animate, layoutBy);
      }
      
      if( !animate ) {
        cy.endBatch();
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
      node.data('x-before-fisheye', this.xPositionInParent(node));
      node.data('y-before-fisheye', this.yPositionInParent(node));
      node.data('width-before-fisheye', node.outerWidth());
      node.data('height-before-fisheye', node.outerHeight());

      if (node.parent()[0] != null) {
        this.storeWidthHeight(node.parent()[0]);
      }
    }

  },
  /*
   * Apply fisheye view to the given node. nodeToExpand will be expanded after the operation. 
   * The other parameter are to be passed by parameters directly in internal function calls.
   */
  fishEyeViewExpandGivenNode: function (node, single, nodeToExpand, animate, layoutBy) {
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
      
      // Move the sibling in the special way
      this.fishEyeViewMoveNode(sibling, T_x, T_y, nodeToExpand, single, animate, layoutBy);
    }

    // If there is no sibling call expand node base function here else it is to be called one of fishEyeViewMoveNode() calls
    if (siblings.length == 0) {
      this.expandNodeBaseFunction(nodeToExpand, single, layoutBy);
    }

    if (node.parent()[0] != null) {
      // Apply fisheye view to the parent node as well ( If exists )
      this.fishEyeViewExpandGivenNode(node.parent()[0], single, nodeToExpand, animate, layoutBy);
    }

    return node;
  },
  getSiblings: function (node) {
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
   * Moves the node by moving its descandents. Movement is animated if both single and animate flags are truthy.
   */
  fishEyeViewMoveNode: function (node, T_x, T_y, nodeToExpand, single, animate, layoutBy) {
    var childrenList = node.children();
    var self = this;
    
    /*
     * If the node is simple move itself directly else move it by moving its children by a self recursive call
     */
    if (childrenList.length == 0) {
      var newPosition = {x: node.position('x') + T_x, y: node.position('y') + T_y};
      if (!single || !animate) {
        node.position(newPosition);
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
          duration: 1000
        });
      }
    }
    else {
      for (var i = 0; i < childrenList.length; i++) {
        this.fishEyeViewMoveNode(childrenList[i], T_x, T_y, nodeToExpand, single, animate, layoutBy);
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
    
    while( !current.inside() ) {
      current = current.parent();
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

    var expandCollapseUtilities;
    var undoRedoUtilities = _dereq_('./undoRedoUtilities');
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
    
    // creates and returns the API instance for the extension
    function createExtensionAPI(cy) {
      var api = {}; // API to be returned
      // set functions
    
      // set all options at once
      api.setOptions = function(opts) {
        options = opts;
      };

      // set the option whose name is given
      api.setOption = function (name, value) {
        options[name] = value;
      };

      // Collection functions

      // collapse given eles extend options with given param
      api.collapse = function (_eles, opts) {
        var eles = this.collapsibleNodes(_eles);
        var tempOptions = setOptions(opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.collapseGivenNodes(eles, tempOptions);
      };

      // collapse given eles recursively extend options with given param
      api.collapseRecursively = function (_eles, opts) {
        var eles = this.collapsibleNodes(_eles);
        var tempOptions = setOptions(opts);
        evalOptions(tempOptions);

        return this.collapse(eles.union(eles.descendants()), tempOptions);
      };

      // expand given eles extend options with given param
      api.expand = function (_eles, opts) {
        var eles = this.expandableNodes(_eles);
        var tempOptions = setOptions(opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.expandGivenNodes(eles, tempOptions);
      };

      // expand given eles recusively extend options with given param
      api.expandRecursively = function (_eles, opts) {
        var eles = this.expandableNodes(_eles);
        var tempOptions = setOptions(opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.expandAllNodes(eles, tempOptions);
      };


      // Core functions

      // collapse all collapsible nodes
      api.collapseAll = function (opts) {
        var tempOptions = setOptions(opts);
        evalOptions(tempOptions);

        return this.collapseRecursively(this.collapsibleNodes(), tempOptions);
      };

      // expand all expandable nodes
      api.expandAll = function (opts) {
        var tempOptions = setOptions(opts);
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
      
      // This method works problematic TODO fix related bugs and expose it
      // Unbinds cue events
//      api.disableCue = function() {
//        if (options.cueEnabled) {
//          cueUtilities('unbind', cy);
//          options.cueEnabled = false;
//        }
//      }
      
      return api; // Return the API instance
    }
    
    var api; // Define the api instance
    
    // register the extension cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      // If opts is not 'get' that is it is a real options object then initilize the extension
      if (opts !== 'get') {
        var cy = this;
        options = setOptions(opts);
        
        expandCollapseUtilities = _dereq_('./expandCollapseUtilities')(cy);
        api = createExtensionAPI(cy); // creates and returns the API instance for the extension
        undoRedoUtilities(cy, api);

        if(options.cueEnabled)
          cueUtilities(options, cy, api, $);


        options.ready();
      }

      return api; // Expose the API to the users
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2VsZW1lbnRVdGlsaXRpZXMuanMiLCJzcmMvZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvdW5kb1JlZG9VdGlsaXRpZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0ge1xuICBlcXVhbEJvdW5kaW5nQm94ZXM6IGZ1bmN0aW9uKGJiMSwgYmIyKXtcbiAgICAgIHJldHVybiBiYjEueDEgPT0gYmIyLngxICYmIGJiMS54MiA9PSBiYjIueDIgJiYgYmIxLnkxID09IGJiMi55MSAmJiBiYjEueTIgPT0gYmIyLnkyO1xuICB9LFxuICBnZXRVbmlvbjogZnVuY3Rpb24oYmIxLCBiYjIpe1xuICAgICAgdmFyIHVuaW9uID0ge1xuICAgICAgeDE6IE1hdGgubWluKGJiMS54MSwgYmIyLngxKSxcbiAgICAgIHgyOiBNYXRoLm1heChiYjEueDIsIGJiMi54MiksXG4gICAgICB5MTogTWF0aC5taW4oYmIxLnkxLCBiYjIueTEpLFxuICAgICAgeTI6IE1hdGgubWF4KGJiMS55MiwgYmIyLnkyKSxcbiAgICB9O1xuXG4gICAgdW5pb24udyA9IHVuaW9uLngyIC0gdW5pb24ueDE7XG4gICAgdW5pb24uaCA9IHVuaW9uLnkyIC0gdW5pb24ueTE7XG5cbiAgICByZXR1cm4gdW5pb247XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYm91bmRpbmdCb3hVdGlsaXRpZXM7IiwidmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xyXG52YXIgZWxlbWVudFV0aWxpdGllcztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3ksIGFwaSwgJCkge1xyXG4gIHZhciBmbiA9IHBhcmFtcztcclxuXHJcbiAgdmFyIGVNb3VzZU92ZXIsIGVNb3VzZU91dCwgZVBvc2l0aW9uLCBlUmVtb3ZlLCBlVGFwLCBlWm9vbSwgZUFkZCwgZUZyZWU7XHJcbiAgdmFyIG5vZGVXaXRoUmVuZGVyZWRDdWU7XHJcbiAgXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICB2YXIgb3B0cyA9IHBhcmFtcztcclxuICAgICAgdmFyICRjb250YWluZXIgPSB0aGlzO1xyXG4gICAgICB2YXIgJGNhbnZhcyA9ICQoJzxjYW52YXM+PC9jYW52YXM+Jyk7XHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XHJcblxyXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcclxuXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICRjb250YWluZXIud2lkdGgoKSlcclxuICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAndG9wJzogMCxcclxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxyXG4gICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcclxuXHJcbiAgICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICd0b3AnOiAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCksXHJcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgO1xyXG5cclxuICAgICAgICAgIC8vIHJlZnJlc2ggdGhlIGN1ZXMgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYoY3kpe1xyXG4gICAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIDApO1xyXG5cclxuICAgICAgfSwgMjUwKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgX3NpemVDYW52YXMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgJCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3lleHBhbmRjb2xsYXBzZScpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZXhwYW5kY29sbGFwc2UnKS5vcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gY2xlYXJEcmF3cygpIHtcclxuICAgICAgICB2YXIgdyA9ICRjb250YWluZXIud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKSB7XHJcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgICAgIHZhciBjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbjtcclxuICAgICAgICB2YXIgaGFzQ2hpbGRyZW4gPSBjaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHNpbXBsZSBub2RlIHdpdGggbm8gY29sbGFwc2VkIGNoaWxkcmVuIHJldHVybiBkaXJlY3RseVxyXG4gICAgICAgIGlmICghaGFzQ2hpbGRyZW4gJiYgY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGlzQ29sbGFwc2VkID0gbm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcblxyXG4gICAgICAgIC8vRHJhdyBleHBhbmQtY29sbGFwc2UgcmVjdGFuZ2xlc1xyXG4gICAgICAgIHZhciByZWN0U2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNpemU7XHJcbiAgICAgICAgdmFyIGxpbmVTaXplID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlTGluZVNpemU7XHJcbiAgICAgICAgdmFyIGRpZmY7XHJcblxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WDtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VTdGFydFk7XHJcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlRW5kWDtcclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VFbmRZO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xyXG5cclxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VDZW50ZXJYO1xyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclk7XHJcbiAgICAgICAgdmFyIGN1ZUNlbnRlcjtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uID09PSAndG9wLWxlZnQnKSB7XHJcbiAgICAgICAgICB2YXIgb2Zmc2V0ID0gMTtcclxuICAgICAgICAgIHZhciBzaXplID0gY3kuem9vbSgpIDwgMSA/IHJlY3RTaXplIC8gKDIqY3kuem9vbSgpKSA6IHJlY3RTaXplIC8gMjtcclxuXHJcbiAgICAgICAgICB2YXIgeCA9IG5vZGUucG9zaXRpb24oJ3gnKSAtIG5vZGUud2lkdGgoKSAvIDIgLSBwYXJzZUZsb2F0KG5vZGUuY3NzKCdwYWRkaW5nLWxlZnQnKSkgXHJcbiAgICAgICAgICAgICAgICAgICsgcGFyc2VGbG9hdChub2RlLmNzcygnYm9yZGVyLXdpZHRoJykpICsgc2l6ZSArIG9mZnNldDtcclxuICAgICAgICAgIHZhciB5ID0gbm9kZS5wb3NpdGlvbigneScpIC0gbm9kZS5oZWlnaHQoKSAvIDIgLSBwYXJzZUZsb2F0KG5vZGUuY3NzKCdwYWRkaW5nLXRvcCcpKSBcclxuICAgICAgICAgICAgICAgICAgKyBwYXJzZUZsb2F0KG5vZGUuY3NzKCdib3JkZXItd2lkdGgnKSkgKyBzaXplICsgb2Zmc2V0O1xyXG5cclxuICAgICAgICAgIGN1ZUNlbnRlciA9IHtcclxuICAgICAgICAgICAgeCA6IHgsXHJcbiAgICAgICAgICAgIHkgOiB5XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucygpLmV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb247XHJcbiAgICAgICAgICBjdWVDZW50ZXIgPSB0eXBlb2Ygb3B0aW9uID09PSAnZnVuY3Rpb24nID8gb3B0aW9uLmNhbGwodGhpcywgbm9kZSkgOiBvcHRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlciA9IGVsZW1lbnRVdGlsaXRpZXMuY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihjdWVDZW50ZXIpO1xyXG5cclxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHNpemVzXHJcbiAgICAgICAgcmVjdFNpemUgPSBNYXRoLm1heChyZWN0U2l6ZSwgcmVjdFNpemUgKiBjeS56b29tKCkpO1xyXG4gICAgICAgIGxpbmVTaXplID0gTWF0aC5tYXgobGluZVNpemUsIGxpbmVTaXplICogY3kuem9vbSgpKTtcclxuICAgICAgICBkaWZmID0gKHJlY3RTaXplIC0gbGluZVNpemUpIC8gMjtcclxuXHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VDZW50ZXJYID0gZXhwYW5kY29sbGFwc2VDZW50ZXIueDtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZUNlbnRlclkgPSBleHBhbmRjb2xsYXBzZUNlbnRlci55O1xyXG5cclxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZVN0YXJ0WSA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWSAtIHJlY3RTaXplIC8gMjtcclxuICAgICAgICBleHBhbmRjb2xsYXBzZUVuZFggPSBleHBhbmRjb2xsYXBzZVN0YXJ0WCArIHJlY3RTaXplO1xyXG4gICAgICAgIGV4cGFuZGNvbGxhcHNlRW5kWSA9IGV4cGFuZGNvbGxhcHNlU3RhcnRZICsgcmVjdFNpemU7XHJcbiAgICAgICAgZXhwYW5kY29sbGFwc2VSZWN0U2l6ZSA9IHJlY3RTaXplO1xyXG5cclxuICAgICAgICAvLyBEcmF3IGV4cGFuZC9jb2xsYXBzZSBjdWUgaWYgc3BlY2lmaWVkIHVzZSBhbiBpbWFnZSBlbHNlIHJlbmRlciBpdCBpbiB0aGUgZGVmYXVsdCB3YXlcclxuICAgICAgICBpZiAoIWlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5leHBhbmRDdWVJbWFnZSkge1xyXG4gICAgICAgICAgdmFyIGltZz1uZXcgSW1hZ2UoKTtcclxuICAgICAgICAgIGltZy5zcmMgPSBvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2U7XHJcbiAgICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgZXhwYW5kY29sbGFwc2VDZW50ZXJYLCBleHBhbmRjb2xsYXBzZUNlbnRlclksIHJlY3RTaXplLCByZWN0U2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlzQ29sbGFwc2VkICYmIG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlKSB7XHJcbiAgICAgICAgICB2YXIgaW1nPW5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgaW1nLnNyYyA9IG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlO1xyXG4gICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSwgcmVjdFNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHZhciBvbGRGaWxsU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xyXG4gICAgICAgICAgdmFyIG9sZFdpZHRoID0gY3R4LmxpbmVXaWR0aDtcclxuICAgICAgICAgIHZhciBvbGRTdHJva2VTdHlsZSA9IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgICAgICAgIGN0eC5lbGxpcHNlKGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSAvIDIsIHJlY3RTaXplIC8gMiwgMCwgMCwgMiAqIE1hdGguUEkpO1xyXG4gICAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IE1hdGgubWF4KDIuNiwgMi42ICogY3kuem9vbSgpKTtcclxuXHJcbiAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xyXG4gICAgICAgICAgY3R4LmxpbmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGxpbmVTaXplICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xyXG5cclxuICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGxpbmVTaXplICsgZGlmZik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZVN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZEZpbGxTdHlsZTtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XHJcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgPSBleHBhbmRjb2xsYXBzZVN0YXJ0WTtcclxuICAgICAgICBub2RlLl9wcml2YXRlLmRhdGEuZXhwYW5kY29sbGFwc2VSZW5kZXJlZEN1ZVNpemUgPSBleHBhbmRjb2xsYXBzZVJlY3RTaXplO1xyXG4gICAgICAgIFxyXG4gICAgICAgIG5vZGVXaXRoUmVuZGVyZWRDdWUgPSBub2RlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB7XHJcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBlWm9vbSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggbm9kZVdpdGhSZW5kZXJlZEN1ZSApIHtcclxuICAgICAgICAgICAgY2xlYXJEcmF3cygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHRcdC8vIGNoZWNrIGlmIG1vdXNlIGlzIGluc2lkZSBnaXZlbiBub2RlXHJcblx0XHR2YXIgaXNJbnNpZGVDb21wb3VuZCA9IGZ1bmN0aW9uKG5vZGUsIGUpe1xyXG5cdFx0XHRpZiAobm9kZSl7XHJcblx0XHRcdFx0dmFyIGN1cnJNb3VzZVBvcyA9IGUucG9zaXRpb24gfHwgZS5jeVBvc2l0aW9uO1xyXG5cdFx0XHRcdHZhciB0b3BMZWZ0ID0ge1xyXG5cdFx0XHRcdFx0eDogKG5vZGUucG9zaXRpb24oXCJ4XCIpIC0gbm9kZS53aWR0aCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctbGVmdCcpKSksXHJcblx0XHRcdFx0XHR5OiAobm9kZS5wb3NpdGlvbihcInlcIikgLSBub2RlLmhlaWdodCgpIC8gMiAtIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctdG9wJykpKX07XHJcblx0XHRcdFx0dmFyIGJvdHRvbVJpZ2h0ID0ge1xyXG5cdFx0XHRcdFx0eDogKG5vZGUucG9zaXRpb24oXCJ4XCIpICsgbm9kZS53aWR0aCgpIC8gMiArIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctcmlnaHQnKSkpLFxyXG5cdFx0XHRcdFx0eTogKG5vZGUucG9zaXRpb24oXCJ5XCIpICsgbm9kZS5oZWlnaHQoKSAvIDIrIHBhcnNlRmxvYXQobm9kZS5jc3MoJ3BhZGRpbmctYm90dG9tJykpKX07XHJcblxyXG5cdFx0XHRcdGlmIChjdXJyTW91c2VQb3MueCA+PSB0b3BMZWZ0LnggJiYgY3Vyck1vdXNlUG9zLnkgPj0gdG9wTGVmdC55ICYmXHJcblx0XHRcdFx0XHRjdXJyTW91c2VQb3MueCA8PSBib3R0b21SaWdodC54ICYmIGN1cnJNb3VzZVBvcy55IDw9IGJvdHRvbVJpZ2h0Lnkpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y3kub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRpZighaXNJbnNpZGVDb21wb3VuZChub2RlV2l0aFJlbmRlcmVkQ3VlLCBlKSl7XHJcblx0XHRcdFx0Y2xlYXJEcmF3cygpXHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihub2RlV2l0aFJlbmRlcmVkQ3VlKXtcclxuXHRcdFx0XHRkcmF3RXhwYW5kQ29sbGFwc2VDdWUobm9kZVdpdGhSZW5kZXJlZEN1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGN5Lm9uKCdtb3VzZW92ZXInLCAnbm9kZScsIGVNb3VzZU92ZXIgPSBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHR2YXIgbm9kZSA9IHRoaXM7XHJcblx0XHRcdC8vIGNsZWFyIGRyYXdzIGlmIGFueVxyXG5cdFx0XHRpZiAoYXBpLmlzQ29sbGFwc2libGUobm9kZSkgfHwgYXBpLmlzRXhwYW5kYWJsZShub2RlKSl7XHJcblx0XHRcdFx0aWYgKCBub2RlV2l0aFJlbmRlcmVkQ3VlICYmIG5vZGVXaXRoUmVuZGVyZWRDdWUuaWQoKSAhPSBub2RlLmlkKCkgKSB7XHJcblx0XHRcdFx0XHRjbGVhckRyYXdzKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmFyIG9sZE1vdXNlUG9zID0gbnVsbCwgY3Vyck1vdXNlUG9zID0gbnVsbDtcclxuXHRcdGN5Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0b2xkTW91c2VQb3MgPSBlLnJlbmRlcmVkUG9zaXRpb24gfHwgZS5jeVJlbmRlcmVkUG9zaXRpb25cclxuXHRcdH0pO1xyXG5cdFx0Y3kub24oJ21vdXNldXAnLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y3Vyck1vdXNlUG9zID0gZS5yZW5kZXJlZFBvc2l0aW9uIHx8IGUuY3lSZW5kZXJlZFBvc2l0aW9uXHJcblx0XHR9KTtcclxuXHJcblx0XHRjeS5vbignZHJhZycsICdub2RlJywgZU1vdXNlT3V0ID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0Y2xlYXJEcmF3cygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y3kub24oJ3Bvc2l0aW9uJywgJ25vZGUnLCBlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKVxyXG5cdFx0XHRcdGNsZWFyRHJhd3MoKTtcclxuXHRcdH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIGNvbXBvdW5kcyBhcmUgcmVzaXplZCBwb3NpdGlvbiBldmVudCBpcyBub3QgdHJpZ2dlcmVkIHRob3VnaCB0aGUgcG9zaXRpb24gb2YgdGhlIG5vZGUgaXMgY2hhbmdlZC5cclxuICAgICAgICAvLyBUaGVyZWZvcmUsIHdlIGxpc3RlbiB0byBub2RlcmVzaXplLnJlc2l6ZWRyYWcgZXZlbnQgaGVyZSBhbmQgaWYgdGhlIG5vZGUgaXMgYSBjb21wb3VuZCB3ZSBkbyB3aGF0IGlzIHN1cHBvc2VkIGJlIGRvbmUgaW4gcG9zaXRpb24gZXZlbnQuXHJcbiAgICAgICAgY3kub24oXCJub2RlcmVzaXplLnJlc2l6ZWRyYWdcIiwgZnVuY3Rpb24oZSwgdHlwZSwgbm9kZSl7IFxyXG4gICAgICAgICAgICBpZiAobm9kZS5pc1BhcmVudCgpICYmIG5vZGVXaXRoUmVuZGVyZWRDdWUpIHtcclxuICAgICAgICAgICAgICAgIGNsZWFyRHJhd3MoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHRcdGN5Lm9uKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGNsZWFyRHJhd3MoKTtcclxuXHRcdFx0bm9kZVdpdGhSZW5kZXJlZEN1ZSA9IG51bGw7XHJcblx0XHR9KTtcclxuXHJcblx0XHR2YXIgdXI7XHJcblx0XHRjeS5vbignc2VsZWN0JywgJ25vZGUnLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRpZiAodGhpcy5sZW5ndGggPiBjeS5ub2RlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGgpXHJcblx0XHRcdFx0dGhpcy51bnNlbGVjdCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y3kub24oJ3RhcCcsIFRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG5cdFx0XHR2YXIgbm9kZSA9IG5vZGVXaXRoUmVuZGVyZWRDdWU7XHJcblx0XHRcdGlmIChub2RlKXtcclxuXHRcdFx0XHR2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYO1xyXG5cdFx0XHRcdHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZID0gbm9kZS5fcHJpdmF0ZS5kYXRhLmV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFk7XHJcblx0XHRcdFx0dmFyIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSA9IG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZTtcclxuXHRcdFx0XHR2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xyXG5cdFx0XHRcdHZhciBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSA9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHZhciBjeVJlbmRlcmVkUG9zID0gZXZlbnQucmVuZGVyZWRQb3NpdGlvbiB8fCBldmVudC5jeVJlbmRlcmVkUG9zaXRpb247XHJcblx0XHRcdFx0dmFyIGN5UmVuZGVyZWRQb3NYID0gY3lSZW5kZXJlZFBvcy54O1xyXG5cdFx0XHRcdHZhciBjeVJlbmRlcmVkUG9zWSA9IGN5UmVuZGVyZWRQb3MueTtcclxuXHRcdFx0XHR2YXIgZmFjdG9yID0gKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5IC0gMSkgLyAyO1xyXG5cclxuXHRcdFx0XHRpZiAoIChNYXRoLmFicyhvbGRNb3VzZVBvcy54IC0gY3Vyck1vdXNlUG9zLngpIDwgNSAmJiBNYXRoLmFicyhvbGRNb3VzZVBvcy55IC0gY3Vyck1vdXNlUG9zLnkpIDwgNSlcclxuXHRcdFx0XHRcdCYmIGN5UmVuZGVyZWRQb3NYID49IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRTdGFydFggLSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcclxuXHRcdFx0XHRcdCYmIGN5UmVuZGVyZWRQb3NYIDw9IGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRFbmRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcblx0XHRcdFx0XHQmJiBjeVJlbmRlcmVkUG9zWSA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXHJcblx0XHRcdFx0XHQmJiBjeVJlbmRlcmVkUG9zWSA8PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkRW5kWSArIGV4cGFuZGNvbGxhcHNlUmVuZGVyZWRSZWN0U2l6ZSAqIGZhY3Rvcikge1xyXG5cdFx0XHRcdFx0aWYob3B0cy51bmRvYWJsZSAmJiAhdXIpXHJcblx0XHRcdFx0XHRcdHVyID0gY3kudW5kb1JlZG8oe1xyXG5cdFx0XHRcdFx0XHRcdGRlZmF1bHRBY3Rpb25zOiBmYWxzZVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGlmKGFwaS5pc0NvbGxhcHNpYmxlKG5vZGUpKVxyXG5cdFx0XHRcdFx0XHRpZiAob3B0cy51bmRvYWJsZSl7XHJcblx0XHRcdFx0XHRcdFx0dXIuZG8oXCJjb2xsYXBzZVwiLCB7XHJcblx0XHRcdFx0XHRcdFx0XHRub2Rlczogbm9kZSxcclxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnM6IG9wdHNcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRcdFx0YXBpLmNvbGxhcHNlKG5vZGUsIG9wdHMpO1xyXG5cdFx0XHRcdGVsc2UgaWYoYXBpLmlzRXhwYW5kYWJsZShub2RlKSlcclxuXHRcdFx0XHRcdGlmIChvcHRzLnVuZG9hYmxlKVxyXG5cdFx0XHRcdFx0XHR1ci5kbyhcImV4cGFuZFwiLCB7XHJcblx0XHRcdFx0XHRcdFx0bm9kZXM6IG5vZGUsXHJcblx0XHRcdFx0XHRcdFx0b3B0aW9uczogb3B0c1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdFx0YXBpLmV4cGFuZChub2RlLCBvcHRzKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgICRjb250YWluZXIuZGF0YSgnY3lleHBhbmRjb2xsYXBzZScsIGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBjeSA9IHRoaXMuY3l0b3NjYXBlKCdnZXQnKTtcclxuICAgICAgICBjeS5vZmYoJ21vdXNlb3ZlcicsICdub2RlJywgZU1vdXNlT3ZlcilcclxuICAgICAgICAgIC5vZmYoJ21vdXNlb3V0IHRhcGRyYWdvdXQnLCAnbm9kZScsIGVNb3VzZU91dClcclxuICAgICAgICAgIC5vZmYoJ3Bvc2l0aW9uJywgJ25vZGUnLCBlUG9zaXRpb24pXHJcbiAgICAgICAgICAub2ZmKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUpXHJcbiAgICAgICAgICAub2ZmKCd0YXAnLCAnbm9kZScsIGVUYXApXHJcbiAgICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGVBZGQpXHJcbiAgICAgICAgICAub2ZmKCdmcmVlJywgJ25vZGUnLCBlRnJlZSk7XHJcblxyXG4gICAgICAgIGN5LnVuYmluZChcInpvb20gcGFuXCIsIGVab29tKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkoJChjeS5jb250YWluZXIoKSksIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBhcmd1bWVudHMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkLmVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWV4cGFuZC1jb2xsYXBzZScpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICQodGhpcyk7XHJcbn07XHJcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxyXG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcclxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxyXG4gICAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XHJcbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xyXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XHJcbiAgICovXHJcbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cclxuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xyXG5cclxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xyXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcclxuICAgICAgICAgIG5hdGl2ZU5vdyA9IERhdGUubm93O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXHJcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRGF0ZVxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XHJcbiAgICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xyXG4gICAqIH0sIF8ubm93KCkpO1xyXG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcclxuICAgKi9cclxuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcclxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcclxuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXHJcbiAgICogZGVsYXllZCBpbnZvY2F0aW9ucy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYFxyXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcclxuICAgKiBgZnVuY2AgaW52b2NhdGlvbi5cclxuICAgKlxyXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxyXG4gICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcclxuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICpcclxuICAgKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKVxyXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcclxuICAgKiAgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcclxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xyXG4gICAqXHJcbiAgICogLy8gaW52b2tlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xyXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcclxuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcclxuICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xyXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcclxuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xyXG4gICAqICAgJ21heFdhaXQnOiAxMDAwXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gY2FuY2VsIGEgZGVib3VuY2VkIGNhbGxcclxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xyXG4gICAqXHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XHJcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xyXG4gICAqICAgICB0b2RvQ2hhbmdlcy5jYW5jZWwoKTtcclxuICAgKiAgIH1cclxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXHJcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxyXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcclxuICAgKiBkZWxldGUgbW9kZWxzLnRvZG87XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGFyZ3MsXHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcclxuICAgICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgICBzdGFtcCxcclxuICAgICAgICAgICAgdGhpc0FyZyxcclxuICAgICAgICAgICAgdGltZW91dElkLFxyXG4gICAgICAgICAgICB0cmFpbGluZ0NhbGwsXHJcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxyXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XHJcbiAgICB9XHJcbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xyXG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcclxuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xyXG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xyXG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XHJcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcclxuICAgICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYW5jZWwoKSB7XHJcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgbGFzdENhbGxlZCA9IDA7XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcclxuICAgICAgaWYgKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfVxyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XHJcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xyXG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xyXG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xyXG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XHJcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIHN0YW1wID0gbm93KCk7XHJcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xyXG4gICAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcclxuXHJcbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiBtYXhXYWl0O1xyXG5cclxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xyXG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICByZXR1cm4gZGVib3VuY2VkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cclxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBMYW5nXHJcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3Qoe30pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KDEpO1xyXG4gICAqIC8vID0+IGZhbHNlXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXHJcbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cclxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xyXG4gICAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWJvdW5jZTtcclxuXHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsImZ1bmN0aW9uIGVsZW1lbnRVdGlsaXRpZXMoY3kpIHtcclxuIHJldHVybiB7XHJcbiAgbW92ZU5vZGVzOiBmdW5jdGlvbiAocG9zaXRpb25EaWZmLCBub2Rlcywgbm90Q2FsY1RvcE1vc3ROb2Rlcykge1xyXG4gICAgdmFyIHRvcE1vc3ROb2RlcyA9IG5vdENhbGNUb3BNb3N0Tm9kZXMgPyBub2RlcyA6IHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gdG9wTW9zdE5vZGVzW2ldO1xyXG4gICAgICB2YXIgb2xkWCA9IG5vZGUucG9zaXRpb24oXCJ4XCIpO1xyXG4gICAgICB2YXIgb2xkWSA9IG5vZGUucG9zaXRpb24oXCJ5XCIpO1xyXG4gICAgICBub2RlLnBvc2l0aW9uKHtcclxuICAgICAgICB4OiBvbGRYICsgcG9zaXRpb25EaWZmLngsXHJcbiAgICAgICAgeTogb2xkWSArIHBvc2l0aW9uRGlmZi55XHJcbiAgICAgIH0pO1xyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgdmFyIG5vZGVzTWFwID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgcGFyZW50ID0gZWxlLnBhcmVudCgpWzBdO1xyXG4gICAgICB3aGlsZSAocGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICBpZiAobm9kZXNNYXBbcGFyZW50LmlkKCldKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQoKVswXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByb290cztcclxuICB9LFxyXG4gIHJlYXJyYW5nZTogZnVuY3Rpb24gKGxheW91dEJ5KSB7XHJcbiAgICBpZiAodHlwZW9mIGxheW91dEJ5ID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgbGF5b3V0QnkoKTtcclxuICAgIH0gZWxzZSBpZiAobGF5b3V0QnkgIT0gbnVsbCkge1xyXG4gICAgICB2YXIgbGF5b3V0ID0gY3kubGF5b3V0KGxheW91dEJ5KTtcclxuICAgICAgaWYgKGxheW91dCAmJiBsYXlvdXQucnVuKSB7XHJcbiAgICAgICAgbGF5b3V0LnJ1bigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uOiBmdW5jdGlvbiAobW9kZWxQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XHJcbiAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB4LFxyXG4gICAgICB5OiB5XHJcbiAgICB9O1xyXG4gIH1cclxuIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZWxlbWVudFV0aWxpdGllcztcclxuIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9ib3VuZGluZ0JveFV0aWxpdGllcycpO1xyXG5cclxuLy8gRXhwYW5kIGNvbGxhcHNlIHV0aWxpdGllc1xyXG5mdW5jdGlvbiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyhjeSkge1xyXG52YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcclxucmV0dXJuIHtcclxuICAvL3RoZSBudW1iZXIgb2Ygbm9kZXMgbW92aW5nIGFuaW1hdGVkbHkgYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvblxyXG4gIGFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQ6IDAsXHJcbiAgLypcclxuICAgKiBBIGZ1bnRpb24gYmFzaWNseSBleHBhbmRpbmcgYSBub2RlLCBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5LlxyXG4gICAqIFNpbmdsZSBwYXJhbWV0ZXIgaW5kaWNhdGVzIGlmIHRoZSBub2RlIGlzIGV4cGFuZGVkIGFsb25lIGFuZCBpZiBpdCBpcyB0cnV0aHkgdGhlbiBsYXlvdXRCeSBwYXJhbWV0ZXIgaXMgY29uc2lkZXJlZCB0b1xyXG4gICAqIHBlcmZvcm0gbGF5b3V0IGFmdGVyIGV4cGFuZC5cclxuICAgKi9cclxuICBleHBhbmROb2RlQmFzZUZ1bmN0aW9uOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBsYXlvdXRCeSkge1xyXG4gICAgaWYgKCFub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pe1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2NoZWNrIGhvdyB0aGUgcG9zaXRpb24gb2YgdGhlIG5vZGUgaXMgY2hhbmdlZFxyXG4gICAgdmFyIHBvc2l0aW9uRGlmZiA9IHtcclxuICAgICAgeDogbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKS54LFxyXG4gICAgICB5OiBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpLnlcclxuICAgIH07XHJcblxyXG4gICAgbm9kZS5yZW1vdmVEYXRhKFwiaW5mb0xhYmVsXCIpO1xyXG4gICAgbm9kZS5yZW1vdmVDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcblxyXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYmVmb3JlZXhwYW5kXCIpO1xyXG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLnJlc3RvcmUoKTtcclxuICAgIHRoaXMucmVwYWlyRWRnZXMobm9kZSk7XHJcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xyXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmRcIik7XHJcblxyXG5cclxuICAgIGVsZW1lbnRVdGlsaXRpZXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgbm9kZS5jaGlsZHJlbigpKTtcclxuICAgIG5vZGUudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBub2RlcyBhcmUgbW92ZWRcclxuICAgIG5vZGUucmVtb3ZlRGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJyk7XHJcbiAgICBcclxuICAgIC8vIElmIGV4cGFuZCBpcyBjYWxsZWQganVzdCBmb3Igb25lIG5vZGUgdGhlbiBjYWxsIGVuZCBvcGVyYXRpb24gdG8gcGVyZm9ybSBsYXlvdXRcclxuICAgIGlmIChzaW5nbGUpIHtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24obGF5b3V0QnkpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLypcclxuICAgKiBBIGhlbHBlciBmdW5jdGlvbiB0byBjb2xsYXBzZSBnaXZlbiBub2RlcyBpbiBhIHNpbXBsZSB3YXkgKFdpdGhvdXQgcGVyZm9ybWluZyBsYXlvdXQgYWZ0ZXJ3YXJkKVxyXG4gICAqIEl0IGNvbGxhcHNlcyBhbGwgcm9vdCBub2RlcyBib3R0b20gdXAuXHJcbiAgICovXHJcbiAgc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xyXG4gICAgbm9kZXMuZGF0YShcImNvbGxhcHNlXCIsIHRydWUpO1xyXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcm9vdCA9IHJvb3RzW2ldO1xyXG4gICAgICBcclxuICAgICAgLy8gQ29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlclxyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gZXhwYW5kIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXHJcbiAgICogSXQgZXhwYW5kcyBhbGwgdG9wIG1vc3Qgbm9kZXMgdG9wIGRvd24uXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgbm9kZXMuZGF0YShcImV4cGFuZFwiLCB0cnVlKTsgLy8gTWFyayB0aGF0IHRoZSBub2RlcyBhcmUgc3RpbGwgdG8gYmUgZXhwYW5kZWRcclxuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTsgLy8gRm9yIGVhY2ggcm9vdCBub2RlIGV4cGFuZCB0b3AgZG93blxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBFeHBhbmRzIGFsbCBub2RlcyBieSBleHBhbmRpbmcgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duIHdpdGggdGhlaXIgZGVzY2VuZGFudHMuXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcclxuICAgIGlmIChub2RlcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG5vZGVzID0gY3kubm9kZXMoKTtcclxuICAgIH1cclxuICAgIHZhciBvcnBoYW5zO1xyXG4gICAgb3JwaGFucyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIHZhciBleHBhbmRTdGFjayA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gb3JwaGFuc1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXhwYW5kU3RhY2s7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoZSBvcGVyYXRpb24gdG8gYmUgcGVyZm9ybWVkIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQgcmVhcnJhbmdlIG5vZGVzIGJ5IGxheW91dEJ5IHBhcmFtZXRlci5cclxuICAgKi9cclxuICBlbmRPcGVyYXRpb246IGZ1bmN0aW9uIChsYXlvdXRCeSkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgY3kucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcclxuICAgICAgfSwgMCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIENhbGxzIHNpbXBsZSBleHBhbmRBbGxOb2Rlcy4gVGhlbiBwZXJmb3JtcyBlbmQgb3BlcmF0aW9uLlxyXG4gICAqL1xyXG4gIGV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xyXG4gICAgdmFyIGV4cGFuZGVkU3RhY2sgPSB0aGlzLnNpbXBsZUV4cGFuZEFsbE5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xyXG5cclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gZXhwYW5kZWRTdGFjaztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogRXhwYW5kcyB0aGUgcm9vdCBhbmQgaXRzIGNvbGxhcHNlZCBkZXNjZW5kZW50cyBpbiB0b3AgZG93biBvcmRlci5cclxuICAgKi9cclxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7XHJcbiAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgZXhwYW5kU3RhY2sucHVzaChyb290KTtcclxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKG5vZGUsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL0V4cGFuZCB0aGUgZ2l2ZW4gbm9kZXMgcGVyZm9ybSBlbmQgb3BlcmF0aW9uIGFmdGVyIGV4cGFuZGF0aW9uXHJcbiAgZXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7XHJcbiAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHRvIGV4cGFuZCB3ZSBuZWVkIHRvIGFuaW1hdGUgZm9yIGZpc2hleWUgdmlldywgYnV0IGlmIHRoZXJlIGFyZSBtb3JlIHRoZW4gb25lIG5vZGUgd2UgZG8gbm90XHJcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgbm9kZSA9IG5vZGVzWzBdO1xyXG4gICAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgICAvLyBFeHBhbmQgdGhlIGdpdmVuIG5vZGUgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhhdCB0aGUgbm9kZSBpcyBzaW1wbGUgd2hpY2ggZW5zdXJlcyB0aGF0IGZpc2hleWUgcGFyYW1ldGVyIHdpbGwgYmUgY29uc2lkZXJlZFxyXG4gICAgICAgIHRoaXMuZXhwYW5kTm9kZShub2RlLCBvcHRpb25zLmZpc2hleWUsIHRydWUsIG9wdGlvbnMuYW5pbWF0ZSwgb3B0aW9ucy5sYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuICAgIH0gXHJcbiAgICBlbHNlIHtcclxuICAgICAgLy8gRmlyc3QgZXhwYW5kIGdpdmVuIG5vZGVzIGFuZCB0aGVuIHBlcmZvcm0gbGF5b3V0IGFjY29yZGluZyB0byB0aGUgbGF5b3V0QnkgcGFyYW1ldGVyXHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIGdpdmVuIG5vZGVzIHRoZW4gcGVyZm9ybSBlbmQgb3BlcmF0aW9uXHJcbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcclxuICAgIC8qXHJcbiAgICAgKiBJbiBjb2xsYXBzZSBvcGVyYXRpb24gdGhlcmUgaXMgbm8gZmlzaGV5ZSB2aWV3IHRvIGJlIGFwcGxpZWQgc28gdGhlcmUgaXMgbm8gYW5pbWF0aW9uIHRvIGJlIGRlc3Ryb3llZCBoZXJlLiBXZSBjYW4gZG8gdGhpcyBcclxuICAgICAqIGluIGEgYmF0Y2guXHJcbiAgICAgKi8gXHJcbiAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICB0aGlzLnNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucyk7XHJcbiAgICBjeS5lbmRCYXRjaCgpO1xyXG5cclxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSB0aGUgc3R5bGVcclxuICAgIGN5LnN0eWxlKCkudXBkYXRlKCk7XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XHJcbiAgY29sbGFwc2VCb3R0b21VcDogZnVuY3Rpb24gKHJvb3QpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKG5vZGUpO1xyXG4gICAgfVxyXG4gICAgLy9JZiB0aGUgcm9vdCBpcyBhIGNvbXBvdW5kIG5vZGUgdG8gYmUgY29sbGFwc2VkIHRoZW4gY29sbGFwc2UgaXRcclxuICAgIGlmIChyb290LmRhdGEoXCJjb2xsYXBzZVwiKSAmJiByb290LmNoaWxkcmVuKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICB0aGlzLmNvbGxhcHNlTm9kZShyb290KTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiY29sbGFwc2VcIik7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2V4cGFuZCB0aGUgbm9kZXMgaW4gdG9wIGRvd24gb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxyXG4gIGV4cGFuZFRvcERvd246IGZ1bmN0aW9uIChyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG4gICAgaWYgKHJvb3QuZGF0YShcImV4cGFuZFwiKSAmJiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICAvLyBFeHBhbmQgdGhlIHJvb3QgYW5kIHVubWFyayBpdHMgZXhwYW5kIGRhdGEgdG8gc3BlY2lmeSB0aGF0IGl0IGlzIG5vIG1vcmUgdG8gYmUgZXhwYW5kZWRcclxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiZXhwYW5kXCIpO1xyXG4gICAgfVxyXG4gICAgLy8gTWFrZSBhIHJlY3Vyc2l2ZSBjYWxsIGZvciBjaGlsZHJlbiBvZiByb290XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihub2RlKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vIENvbnZlcnN0IHRoZSByZW5kZXJlZCBwb3NpdGlvbiB0byBtb2RlbCBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gZ2xvYmFsIHBhbiBhbmQgem9vbSB2YWx1ZXNcclxuICBjb252ZXJ0VG9Nb2RlbFBvc2l0aW9uOiBmdW5jdGlvbiAocmVuZGVyZWRQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcclxuICAgIHZhciB5ID0gKHJlbmRlcmVkUG9zaXRpb24ueSAtIHBhbi55KSAvIHpvb207XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogeCxcclxuICAgICAgeTogeVxyXG4gICAgfTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZS4gSXQgY29uc2lkZXJzIGFwcGx5RmlzaEV5ZVZpZXcsIGFuaW1hdGUgYW5kIGxheW91dEJ5IHBhcmFtZXRlcnMuXHJcbiAgICogSXQgYWxzbyBjb25zaWRlcnMgc2luZ2xlIHBhcmFtZXRlciB3aGljaCBpbmRpY2F0ZXMgaWYgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGFsb25lLiBJZiB0aGlzIHBhcmFtZXRlciBpcyB0cnV0aHkgYWxvbmcgd2l0aCBcclxuICAgKiBhcHBseUZpc2hFeWVWaWV3IHBhcmFtZXRlciB0aGVuIHRoZSBzdGF0ZSBvZiB2aWV3IHBvcnQgaXMgdG8gYmUgY2hhbmdlZCB0byBoYXZlIGV4dHJhIHNwYWNlIG9uIHRoZSBzY3JlZW4gKGlmIG5lZWRlZCkgYmVmb3JlIGFwcGxpeWluZyB0aGVcclxuICAgKiBmaXNoZXllIHZpZXcuXHJcbiAgICovXHJcbiAgZXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXcsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIFxyXG4gICAgLy8gSWYgYW5pbWF0ZSBwYXJhbWV0ZXIgaXMgbm90IHNldCBkbyB0aGVzZSBvcGVyYXRpb25zIGluIGEgYmF0Y2guIE5vdGUgdGhhdCB0aGlzIHBhcmFtZXRlciBpcyB1bnNldCBcclxuICAgIC8vIGlmIG1vcmUgdGhlbiBvbmUgbm9kZSB0byBiZSBleHBhbmRlZCAoaW5kZXBlbmRhbnQgb2YgcmVsYXRlZCB1c2VyIG9wdGlvbilcclxuICAgIGlmKCAhYW5pbWF0ZSApIHtcclxuICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjb21tb25FeHBhbmRPcGVyYXRpb24gPSBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSkge1xyXG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlldykge1xyXG5cclxuICAgICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncpO1xyXG4gICAgICAgIG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpc2hleWUgdmlldyBleHBhbmQgdGhlIG5vZGUuXHJcbiAgICAgICAgLy8gVGhlIGZpcnN0IHBhcmFtdGVyIGluZGljYXRlcyB0aGUgbm9kZSB0byBhcHBseSBmaXNoZXllIHZpZXcsIHRoZSB0aGlyZCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoZSBub2RlXHJcbiAgICAgICAgLy8gdG8gYmUgZXhwYW5kZWQgYWZ0ZXIgZmlzaGV5ZSB2aWV3IGlzIGFwcGxpZWQuXHJcbiAgICAgICAgc2VsZi5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLCBzaW5nbGUsIG5vZGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gSWYgb25lIG9mIHRoZXNlIHBhcmFtZXRlcnMgaXMgdHJ1dGh5IGl0IG1lYW5zIHRoYXQgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbiBpcyBhbHJlYWR5IHRvIGJlIGNhbGxlZC5cclxuICAgICAgLy8gSG93ZXZlciBpZiBub25lIG9mIHRoZW0gaXMgdHJ1dGh5IHdlIG5lZWQgdG8gY2FsbCBpdCBoZXJlLlxyXG4gICAgICBpZiAoIXNpbmdsZSB8fCAhYXBwbHlGaXNoRXllVmlldyB8fCAhYW5pbWF0ZSkge1xyXG4gICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlLCBzaW5nbGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5zdG9yZVdpZHRoSGVpZ2h0KG5vZGUpO1xyXG4gICAgICB2YXIgYW5pbWF0aW5nID0gZmFsc2U7IC8vIFZhcmlhYmxlIHRvIGNoZWNrIGlmIHRoZXJlIGlzIGEgY3VycmVudCBhbmltYXRpb24sIGlmIHRoZXJlIGlzIGNvbW1vbkV4cGFuZE9wZXJhdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbmltYXRpb25cclxuICAgICAgXHJcbiAgICAgIC8vIElmIHRoZSBub2RlIGlzIHRoZSBvbmx5IG5vZGUgdG8gZXhwYW5kIGFuZCBmaXNoZXllIHZpZXcgc2hvdWxkIGJlIGFwcGxpZWQsIHRoZW4gY2hhbmdlIHRoZSBzdGF0ZSBvZiB2aWV3cG9ydCBcclxuICAgICAgLy8gdG8gY3JlYXRlIG1vcmUgc3BhY2Ugb24gc2NyZWVuIChJZiBuZWVkZWQpXHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3ICYmIHNpbmdsZSkge1xyXG4gICAgICAgIHZhciB0b3BMZWZ0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IDAsIHk6IDB9KTtcclxuICAgICAgICB2YXIgYm90dG9tUmlnaHRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvTW9kZWxQb3NpdGlvbih7eDogY3kud2lkdGgoKSwgeTogY3kuaGVpZ2h0KCl9KTtcclxuICAgICAgICB2YXIgcGFkZGluZyA9IDgwO1xyXG4gICAgICAgIHZhciBiYiA9IHtcclxuICAgICAgICAgIHgxOiB0b3BMZWZ0UG9zaXRpb24ueCxcclxuICAgICAgICAgIHgyOiBib3R0b21SaWdodFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB5MTogdG9wTGVmdFBvc2l0aW9uLnksXHJcbiAgICAgICAgICB5MjogYm90dG9tUmlnaHRQb3NpdGlvbi55XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIG5vZGVCQiA9IHtcclxuICAgICAgICAgIHgxOiBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykudyAvIDIgLSBwYWRkaW5nLFxyXG4gICAgICAgICAgeDI6IG5vZGUucG9zaXRpb24oJ3gnKSArIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS53IC8gMiArIHBhZGRpbmcsXHJcbiAgICAgICAgICB5MTogbm9kZS5wb3NpdGlvbigneScpIC0gbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmggLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHkyOiBub2RlLnBvc2l0aW9uKCd5JykgKyBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykuaCAvIDIgKyBwYWRkaW5nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVuaW9uQkIgPSBib3VuZGluZ0JveFV0aWxpdGllcy5nZXRVbmlvbihub2RlQkIsIGJiKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBJZiB0aGVzZSBiYm94ZXMgYXJlIG5vdCBlcXVhbCB0aGVuIHdlIG5lZWQgdG8gY2hhbmdlIHRoZSB2aWV3cG9ydCBzdGF0ZSAoYnkgcGFuIGFuZCB6b29tKVxyXG4gICAgICAgIGlmICghYm91bmRpbmdCb3hVdGlsaXRpZXMuZXF1YWxCb3VuZGluZ0JveGVzKHVuaW9uQkIsIGJiKSkge1xyXG4gICAgICAgICAgdmFyIHZpZXdQb3J0ID0gY3kuZ2V0Rml0Vmlld3BvcnQodW5pb25CQiwgMTApO1xyXG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgICAgYW5pbWF0aW5nID0gYW5pbWF0ZTsgLy8gU2lnbmFsIHRoYXQgdGhlcmUgaXMgYW4gYW5pbWF0aW9uIG5vdyBhbmQgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxyXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhbmltYXRlIGR1cmluZyBwYW4gYW5kIHpvb21cclxuICAgICAgICAgIGlmIChhbmltYXRlKSB7XHJcbiAgICAgICAgICAgIGN5LmFuaW1hdGUoe1xyXG4gICAgICAgICAgICAgIHBhbjogdmlld1BvcnQucGFuLFxyXG4gICAgICAgICAgICAgIHpvb206IHZpZXdQb3J0Lnpvb20sXHJcbiAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICBkdXJhdGlvbjogMTAwMFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjeS56b29tKHZpZXdQb3J0Lnpvb20pO1xyXG4gICAgICAgICAgICBjeS5wYW4odmlld1BvcnQucGFuKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIElmIGFuaW1hdGluZyBpcyBub3QgdHJ1ZSB3ZSBuZWVkIHRvIGNhbGwgY29tbW9uRXhwYW5kT3BlcmF0aW9uIGhlcmVcclxuICAgICAgaWYgKCFhbmltYXRpbmcpIHtcclxuICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmKCAhYW5pbWF0ZSApIHtcclxuICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlIHdpdGhvdXQgcGVyZm9ybWluZyBlbmQgb3BlcmF0aW9uXHJcbiAgY29sbGFwc2VOb2RlOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XHJcbiAgICAgIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJywge1xyXG4gICAgICAgIHg6IG5vZGUucG9zaXRpb24oKS54LFxyXG4gICAgICAgIHk6IG5vZGUucG9zaXRpb24oKS55XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScsIHtcclxuICAgICAgICB3OiBub2RlLm91dGVyV2lkdGgoKSxcclxuICAgICAgICBoOiBub2RlLm91dGVySGVpZ2h0KClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XHJcblxyXG4gICAgICBjaGlsZHJlbi51bnNlbGVjdCgpO1xyXG4gICAgICBjaGlsZHJlbi5jb25uZWN0ZWRFZGdlcygpLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZVwiKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMuYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuKG5vZGUpO1xyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKG5vZGUsIG5vZGUpO1xyXG4gICAgICBub2RlLmFkZENsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcclxuXHJcbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2VcIik7XHJcbiAgICAgIFxyXG4gICAgICBub2RlLnBvc2l0aW9uKG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykpO1xyXG5cclxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgc3RvcmVXaWR0aEhlaWdodDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgaWYgKG5vZGUgIT0gbnVsbCkge1xyXG4gICAgICBub2RlLmRhdGEoJ3gtYmVmb3JlLWZpc2hleWUnLCB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpKTtcclxuICAgICAgbm9kZS5kYXRhKCd5LWJlZm9yZS1maXNoZXllJywgdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKSk7XHJcbiAgICAgIG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnLCBub2RlLm91dGVyV2lkdGgoKSk7XHJcbiAgICAgIG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJywgbm9kZS5vdXRlckhlaWdodCgpKTtcclxuXHJcbiAgICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZS5wYXJlbnQoKVswXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfSxcclxuICAvKlxyXG4gICAqIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgZ2l2ZW4gbm9kZS4gbm9kZVRvRXhwYW5kIHdpbGwgYmUgZXhwYW5kZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbi4gXHJcbiAgICogVGhlIG90aGVyIHBhcmFtZXRlciBhcmUgdG8gYmUgcGFzc2VkIGJ5IHBhcmFtZXRlcnMgZGlyZWN0bHkgaW4gaW50ZXJuYWwgZnVuY3Rpb24gY2FsbHMuXHJcbiAgICovXHJcbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpIHtcclxuICAgIHZhciBzaWJsaW5ncyA9IHRoaXMuZ2V0U2libGluZ3Mobm9kZSk7XHJcblxyXG4gICAgdmFyIHhfYSA9IHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcbiAgICB2YXIgeV9hID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcclxuXHJcbiAgICB2YXIgZF94X2xlZnQgPSBNYXRoLmFicygobm9kZS5kYXRhKCd3aWR0aC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlcldpZHRoKCkpIC8gMik7XHJcbiAgICB2YXIgZF94X3JpZ2h0ID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeV91cHBlciA9IE1hdGguYWJzKChub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeV9sb3dlciA9IE1hdGguYWJzKChub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScpIC0gbm9kZS5vdXRlckhlaWdodCgpKSAvIDIpO1xyXG5cclxuICAgIHZhciBhYnNfZGlmZl9vbl94ID0gTWF0aC5hYnMobm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJykgLSB4X2EpO1xyXG4gICAgdmFyIGFic19kaWZmX29uX3kgPSBNYXRoLmFicyhub2RlLmRhdGEoJ3ktYmVmb3JlLWZpc2hleWUnKSAtIHlfYSk7XHJcblxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gTEVGVFxyXG4gICAgaWYgKG5vZGUuZGF0YSgneC1iZWZvcmUtZmlzaGV5ZScpID4geF9hKSB7XHJcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgKyBhYnNfZGlmZl9vbl94O1xyXG4gICAgICBkX3hfcmlnaHQgPSBkX3hfcmlnaHQgLSBhYnNfZGlmZl9vbl94O1xyXG4gICAgfVxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gUklHSFRcclxuICAgIGVsc2Uge1xyXG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0IC0gYWJzX2RpZmZfb25feDtcclxuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0ICsgYWJzX2RpZmZfb25feDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBVUFxyXG4gICAgaWYgKG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScpID4geV9hKSB7XHJcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciArIGFic19kaWZmX29uX3k7XHJcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciAtIGFic19kaWZmX29uX3k7XHJcbiAgICB9XHJcbiAgICAvLyBDZW50ZXIgd2VudCB0byBET1dOXHJcbiAgICBlbHNlIHtcclxuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyIC0gYWJzX2RpZmZfb25feTtcclxuICAgICAgZF95X2xvd2VyID0gZF95X2xvd2VyICsgYWJzX2RpZmZfb25feTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgeFBvc0luUGFyZW50U2libGluZyA9IFtdO1xyXG4gICAgdmFyIHlQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpYmxpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHhQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnhQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XHJcbiAgICAgIHlQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnlQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgc2libGluZyA9IHNpYmxpbmdzW2ldO1xyXG5cclxuICAgICAgdmFyIHhfYiA9IHhQb3NJblBhcmVudFNpYmxpbmdbaV07XHJcbiAgICAgIHZhciB5X2IgPSB5UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xyXG5cclxuICAgICAgdmFyIHNsb3BlID0gKHlfYiAtIHlfYSkgLyAoeF9iIC0geF9hKTtcclxuXHJcbiAgICAgIHZhciBkX3ggPSAwO1xyXG4gICAgICB2YXIgZF95ID0gMDtcclxuICAgICAgdmFyIFRfeCA9IDA7XHJcbiAgICAgIHZhciBUX3kgPSAwO1xyXG5cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMRUZUXHJcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcclxuICAgICAgICBkX3ggPSBkX3hfbGVmdDtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFJJR0hUXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGRfeCA9IGRfeF9yaWdodDtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFVQUEVSIHNpZGVcclxuICAgICAgaWYgKHlfYSA+IHlfYikge1xyXG4gICAgICAgIGRfeSA9IGRfeV91cHBlcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExPV0VSIHNpZGVcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZF95ID0gZF95X2xvd2VyO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaXNGaW5pdGUoc2xvcGUpKSB7XHJcbiAgICAgICAgVF94ID0gTWF0aC5taW4oZF94LCAoZF95IC8gTWF0aC5hYnMoc2xvcGUpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzbG9wZSAhPT0gMCkge1xyXG4gICAgICAgIFRfeSA9IE1hdGgubWluKGRfeSwgKGRfeCAqIE1hdGguYWJzKHNsb3BlKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoeF9hID4geF9iKSB7XHJcbiAgICAgICAgVF94ID0gLTEgKiBUX3g7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcclxuICAgICAgICBUX3kgPSAtMSAqIFRfeTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gTW92ZSB0aGUgc2libGluZyBpbiB0aGUgc3BlY2lhbCB3YXlcclxuICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKHNpYmxpbmcsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIHRoZXJlIGlzIG5vIHNpYmxpbmcgY2FsbCBleHBhbmQgbm9kZSBiYXNlIGZ1bmN0aW9uIGhlcmUgZWxzZSBpdCBpcyB0byBiZSBjYWxsZWQgb25lIG9mIGZpc2hFeWVWaWV3TW92ZU5vZGUoKSBjYWxsc1xyXG4gICAgaWYgKHNpYmxpbmdzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgLy8gQXBwbHkgZmlzaGV5ZSB2aWV3IHRvIHRoZSBwYXJlbnQgbm9kZSBhcyB3ZWxsICggSWYgZXhpc3RzIClcclxuICAgICAgdGhpcy5maXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZShub2RlLnBhcmVudCgpWzBdLCBzaW5nbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH0sXHJcbiAgZ2V0U2libGluZ3M6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICB2YXIgc2libGluZ3M7XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gPT0gbnVsbCkge1xyXG4gICAgICBzaWJsaW5ncyA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICAgICAgdmFyIG9ycGhhbnMgPSBjeS5ub2RlcygpLm9ycGhhbnMoKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChvcnBoYW5zW2ldICE9IG5vZGUpIHtcclxuICAgICAgICAgIHNpYmxpbmdzID0gc2libGluZ3MuYWRkKG9ycGhhbnNbaV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2libGluZ3MgPSBub2RlLnNpYmxpbmdzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNpYmxpbmdzO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBNb3ZlIG5vZGUgb3BlcmF0aW9uIHNwZWNpYWxpemVkIGZvciBmaXNoIGV5ZSB2aWV3IGV4cGFuZCBvcGVyYXRpb25cclxuICAgKiBNb3ZlcyB0aGUgbm9kZSBieSBtb3ZpbmcgaXRzIGRlc2NhbmRlbnRzLiBNb3ZlbWVudCBpcyBhbmltYXRlZCBpZiBib3RoIHNpbmdsZSBhbmQgYW5pbWF0ZSBmbGFncyBhcmUgdHJ1dGh5LlxyXG4gICAqL1xyXG4gIGZpc2hFeWVWaWV3TW92ZU5vZGU6IGZ1bmN0aW9uIChub2RlLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7XHJcbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbigpO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgXHJcbiAgICAvKlxyXG4gICAgICogSWYgdGhlIG5vZGUgaXMgc2ltcGxlIG1vdmUgaXRzZWxmIGRpcmVjdGx5IGVsc2UgbW92ZSBpdCBieSBtb3ZpbmcgaXRzIGNoaWxkcmVuIGJ5IGEgc2VsZiByZWN1cnNpdmUgY2FsbFxyXG4gICAgICovXHJcbiAgICBpZiAoY2hpbGRyZW5MaXN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHZhciBuZXdQb3NpdGlvbiA9IHt4OiBub2RlLnBvc2l0aW9uKCd4JykgKyBUX3gsIHk6IG5vZGUucG9zaXRpb24oJ3knKSArIFRfeX07XHJcbiAgICAgIGlmICghc2luZ2xlIHx8ICFhbmltYXRlKSB7XHJcbiAgICAgICAgbm9kZS5wb3NpdGlvbihuZXdQb3NpdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgdGhpcy5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50Kys7XHJcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcclxuICAgICAgICAgIHBvc2l0aW9uOiBuZXdQb3NpdGlvbixcclxuICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xyXG4gICAgICAgICAgICBpZiAoc2VsZi5hbmltYXRlZGx5TW92aW5nTm9kZUNvdW50ID4gMCB8fCAhbm9kZVRvRXhwYW5kLmhhc0NsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKSkge1xyXG5cclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIElmIGFsbCBub2RlcyBhcmUgbW92ZWQgd2UgYXJlIHJlYWR5IHRvIGV4cGFuZCBzbyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb25cclxuICAgICAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBsYXlvdXRCeSk7XHJcblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgIGR1cmF0aW9uOiAxMDAwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShjaGlsZHJlbkxpc3RbaV0sIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICB4UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XHJcbiAgICB2YXIgeF9hID0gMC4wO1xyXG5cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHhfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneCcpICsgKHBhcmVudC53aWR0aCgpIC8gMik7XHJcbiAgICB9XHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICB4X2EgPSBub2RlLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHhfYTtcclxuICB9LFxyXG4gIHlQb3NpdGlvbkluUGFyZW50OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXHJcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcclxuXHJcbiAgICB2YXIgeV9hID0gMC4wO1xyXG5cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxyXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHlfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneScpICsgKHBhcmVudC5oZWlnaHQoKSAvIDIpO1xyXG4gICAgfVxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeV9hID0gbm9kZS5wb3NpdGlvbigneScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB5X2E7XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIG5vZGUgcGFyYW1ldGVyIGNhbGwgdGhpcyBtZXRob2RcclxuICAgKiB3aXRoIHRoZSBzYW1lIHJvb3QgcGFyYW1ldGVyLFxyXG4gICAqIHJlbW92ZSB0aGUgY2hpbGQgYW5kIGFkZCB0aGUgcmVtb3ZlZCBjaGlsZCB0byB0aGUgY29sbGFwc2VkY2hpbGRyZW4gZGF0YVxyXG4gICAqIG9mIHRoZSByb290IHRvIHJlc3RvcmUgdGhlbSBpbiB0aGUgY2FzZSBvZiBleHBhbmRhdGlvblxyXG4gICAqIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiBrZWVwcyB0aGUgbm9kZXMgdG8gcmVzdG9yZSB3aGVuIHRoZVxyXG4gICAqIHJvb3QgaXMgZXhwYW5kZWRcclxuICAgKi9cclxuICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4oY2hpbGQsIHJvb3QpO1xyXG4gICAgICB2YXIgcmVtb3ZlZENoaWxkID0gY2hpbGQucmVtb3ZlKCk7XHJcbiAgICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJlbW92ZWRDaGlsZDtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4udW5pb24ocmVtb3ZlZENoaWxkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgaXNNZXRhRWRnZTogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgcmV0dXJuIGVkZ2UuaGFzQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xyXG4gIH0sXHJcbiAgYmFycm93RWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgcmVsYXRlZE5vZGVzID0gbm9kZS5kZXNjZW5kYW50cygpO1xyXG4gICAgdmFyIGVkZ2VzID0gcmVsYXRlZE5vZGVzLmVkZ2VzV2l0aChjeS5ub2RlcygpLm5vdChyZWxhdGVkTm9kZXMudW5pb24obm9kZSkpKTtcclxuICAgIFxyXG4gICAgdmFyIHJlbGF0ZWROb2RlTWFwID0ge307XHJcbiAgICBcclxuICAgIHJlbGF0ZWROb2Rlcy5lYWNoKGZ1bmN0aW9uKGVsZSwgaSkge1xyXG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICByZWxhdGVkTm9kZU1hcFtlbGUuaWQoKV0gPSB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcclxuICAgICAgdmFyIHNvdXJjZSA9IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgIHZhciB0YXJnZXQgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCF0aGlzLmlzTWV0YUVkZ2UoZWRnZSkpIHsgLy8gaXMgb3JpZ2luYWxcclxuICAgICAgICB2YXIgb3JpZ2luYWxFbmRzRGF0YSA9IHtcclxuICAgICAgICAgIHNvdXJjZTogc291cmNlLFxyXG4gICAgICAgICAgdGFyZ2V0OiB0YXJnZXRcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVkZ2UuYWRkQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xyXG4gICAgICAgIGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJywgb3JpZ2luYWxFbmRzRGF0YSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGVkZ2UubW92ZSh7XHJcbiAgICAgICAgdGFyZ2V0OiAhcmVsYXRlZE5vZGVNYXBbdGFyZ2V0LmlkKCldID8gdGFyZ2V0LmlkKCkgOiBub2RlLmlkKCksXHJcbiAgICAgICAgc291cmNlOiAhcmVsYXRlZE5vZGVNYXBbc291cmNlLmlkKCldID8gc291cmNlLmlkKCkgOiBub2RlLmlkKClcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBmaW5kTmV3RW5kOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgY3VycmVudCA9IG5vZGU7XHJcbiAgICBcclxuICAgIHdoaWxlKCAhY3VycmVudC5pbnNpZGUoKSApIHtcclxuICAgICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50KCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBjdXJyZW50O1xyXG4gIH0sXHJcbiAgcmVwYWlyRWRnZXM6IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciBjb25uZWN0ZWRNZXRhRWRnZXMgPSBub2RlLmNvbm5lY3RlZEVkZ2VzKCcuY3ktZXhwYW5kLWNvbGxhcHNlLW1ldGEtZWRnZScpO1xyXG4gICAgXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbm5lY3RlZE1ldGFFZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGNvbm5lY3RlZE1ldGFFZGdlc1tpXTtcclxuICAgICAgdmFyIG9yaWdpbmFsRW5kcyA9IGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJyk7XHJcbiAgICAgIHZhciBjdXJyZW50U3JjSWQgPSBlZGdlLmRhdGEoJ3NvdXJjZScpO1xyXG4gICAgICB2YXIgY3VycmVudFRndElkID0gZWRnZS5kYXRhKCd0YXJnZXQnKTtcclxuICAgICAgXHJcbiAgICAgIGlmICggY3VycmVudFNyY0lkID09PSBub2RlLmlkKCkgKSB7XHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZSh7XHJcbiAgICAgICAgICBzb3VyY2U6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMuc291cmNlKS5pZCgpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZSh7XHJcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMuZmluZE5ld0VuZChvcmlnaW5hbEVuZHMudGFyZ2V0KS5pZCgpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmICggZWRnZS5kYXRhKCdzb3VyY2UnKSA9PT0gb3JpZ2luYWxFbmRzLnNvdXJjZS5pZCgpICYmIGVkZ2UuZGF0YSgndGFyZ2V0JykgPT09IG9yaWdpbmFsRW5kcy50YXJnZXQuaWQoKSApIHtcclxuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XHJcbiAgICAgICAgZWRnZS5yZW1vdmVEYXRhKCdvcmlnaW5hbEVuZHMnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLypub2RlIGlzIGFuIG91dGVyIG5vZGUgb2Ygcm9vdFxyXG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxyXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXHJcbiAgaXNPdXRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCByb290KSB7Ly8qLy9cclxuICAgIHZhciB0ZW1wID0gbm9kZTtcclxuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRlbXAgPT0gcm9vdCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcztcclxuIiwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUsICQpIHtcclxuXHJcbiAgICBpZiAoIWN5dG9zY2FwZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBleHBhbmRDb2xsYXBzZVV0aWxpdGllcztcclxuICAgIHZhciB1bmRvUmVkb1V0aWxpdGllcyA9IHJlcXVpcmUoJy4vdW5kb1JlZG9VdGlsaXRpZXMnKTtcclxuICAgIHZhciBjdWVVdGlsaXRpZXMgPSByZXF1aXJlKFwiLi9jdWVVdGlsaXRpZXNcIik7XHJcblxyXG4gICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZS4gSXQncyBqdXN0IGxheW91dCBvcHRpb25zIG9yIHdob2xlIGxheW91dCBmdW5jdGlvbi4gQ2hvb3NlIHlvdXIgc2lkZSFcclxuICAgICAgZmlzaGV5ZTogdHJ1ZSwgLy8gd2hldGhlciB0byBwZXJmb3JtIGZpc2hleWUgdmlldyBhZnRlciBleHBhbmQvY29sbGFwc2UgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXHJcbiAgICAgIGFuaW1hdGU6IHRydWUsIC8vIHdoZXRoZXIgdG8gYW5pbWF0ZSBvbiBkcmF3aW5nIGNoYW5nZXMgeW91IGNhbiBzcGVjaWZ5IGEgZnVuY3Rpb24gdG9vXHJcbiAgICAgIHJlYWR5OiBmdW5jdGlvbiAoKSB7IH0sIC8vIGNhbGxiYWNrIHdoZW4gZXhwYW5kL2NvbGxhcHNlIGluaXRpYWxpemVkXHJcbiAgICAgIHVuZG9hYmxlOiB0cnVlLCAvLyBhbmQgaWYgdW5kb1JlZG9FeHRlbnNpb24gZXhpc3RzLFxyXG5cclxuICAgICAgY3VlRW5hYmxlZDogdHJ1ZSwgLy8gV2hldGhlciBjdWVzIGFyZSBlbmFibGVkXHJcbiAgICAgIGV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb246ICd0b3AtbGVmdCcsIC8vIGRlZmF1bHQgY3VlIHBvc2l0aW9uIGlzIHRvcCBsZWZ0IHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHBlciBub2RlIHRvb1xyXG4gICAgICBleHBhbmRDb2xsYXBzZUN1ZVNpemU6IDEyLCAvLyBzaXplIG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVcclxuICAgICAgZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTogOCwgLy8gc2l6ZSBvZiBsaW5lcyB1c2VkIGZvciBkcmF3aW5nIHBsdXMtbWludXMgaWNvbnNcclxuICAgICAgZXhwYW5kQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgZXhwYW5kIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBleHBhbmQgY3VlXHJcbiAgICAgIGNvbGxhcHNlQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgY29sbGFwc2UgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGNvbGxhcHNlIGN1ZVxyXG4gICAgICBleHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5OiAxIC8vIHNlbnNpdGl2aXR5IG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVzXHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIHNldE9wdGlvbnMoZnJvbSkge1xyXG4gICAgICB2YXIgdGVtcE9wdHMgPSB7fTtcclxuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXHJcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuXHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBmcm9tKVxyXG4gICAgICAgIGlmICh0ZW1wT3B0cy5oYXNPd25Qcm9wZXJ0eShrZXkpKVxyXG4gICAgICAgICAgdGVtcE9wdHNba2V5XSA9IGZyb21ba2V5XTtcclxuICAgICAgcmV0dXJuIHRlbXBPcHRzO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBldmFsdWF0ZSBzb21lIHNwZWNpZmljIG9wdGlvbnMgaW4gY2FzZSBvZiB0aGV5IGFyZSBzcGVjaWZpZWQgYXMgZnVuY3Rpb25zIHRvIGJlIGR5bmFtaWNhbGx5IGNoYW5nZWRcclxuICAgIGZ1bmN0aW9uIGV2YWxPcHRpb25zKG9wdGlvbnMpIHtcclxuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcclxuICAgICAgdmFyIGZpc2hleWUgPSB0eXBlb2Ygb3B0aW9ucy5maXNoZXllID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5maXNoZXllLmNhbGwoKSA6IG9wdGlvbnMuZmlzaGV5ZTtcclxuICAgICAgXHJcbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XHJcbiAgICAgIG9wdGlvbnMuZmlzaGV5ZSA9IGZpc2hleWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlRXh0ZW5zaW9uQVBJKGN5KSB7XHJcbiAgICAgIHZhciBhcGkgPSB7fTsgLy8gQVBJIHRvIGJlIHJldHVybmVkXHJcbiAgICAgIC8vIHNldCBmdW5jdGlvbnNcclxuICAgIFxyXG4gICAgICAvLyBzZXQgYWxsIG9wdGlvbnMgYXQgb25jZVxyXG4gICAgICBhcGkuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuICAgICAgICBvcHRpb25zID0gb3B0cztcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIHNldCB0aGUgb3B0aW9uIHdob3NlIG5hbWUgaXMgZ2l2ZW5cclxuICAgICAgYXBpLnNldE9wdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xyXG4gICAgICAgIG9wdGlvbnNbbmFtZV0gPSB2YWx1ZTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIENvbGxlY3Rpb24gZnVuY3Rpb25zXHJcblxyXG4gICAgICAvLyBjb2xsYXBzZSBnaXZlbiBlbGVzIGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cclxuICAgICAgYXBpLmNvbGxhcHNlID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XHJcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGNvbGxhcHNlIGdpdmVuIGVsZXMgcmVjdXJzaXZlbHkgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxyXG4gICAgICBhcGkuY29sbGFwc2VSZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2UoZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBleHBhbmQgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5leHBhbmQgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcclxuICAgICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKF9lbGVzKTtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZXhwYW5kIGdpdmVuIGVsZXMgcmVjdXNpdmVseSBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXHJcbiAgICAgIGFwaS5leHBhbmRSZWN1cnNpdmVseSA9IGZ1bmN0aW9uIChfZWxlcywgb3B0cykge1xyXG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoX2VsZXMpO1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kQWxsTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuXHJcbiAgICAgIC8vIENvcmUgZnVuY3Rpb25zXHJcblxyXG4gICAgICAvLyBjb2xsYXBzZSBhbGwgY29sbGFwc2libGUgbm9kZXNcclxuICAgICAgYXBpLmNvbGxhcHNlQWxsID0gZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGFwc2VSZWN1cnNpdmVseSh0aGlzLmNvbGxhcHNpYmxlTm9kZXMoKSwgdGVtcE9wdGlvbnMpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gZXhwYW5kIGFsbCBleHBhbmRhYmxlIG5vZGVzXHJcbiAgICAgIGFwaS5leHBhbmRBbGwgPSBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5leHBhbmRSZWN1cnNpdmVseSh0aGlzLmV4cGFuZGFibGVOb2RlcygpLCB0ZW1wT3B0aW9ucyk7XHJcbiAgICAgIH07XHJcblxyXG5cclxuICAgICAgLy8gVXRpbGl0eSBmdW5jdGlvbnNcclxuXHJcbiAgICAgIC8vIHJldHVybnMgaWYgdGhlIGdpdmVuIG5vZGUgaXMgZXhwYW5kYWJsZVxyXG4gICAgICBhcGkuaXNFeHBhbmRhYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyByZXR1cm5zIGlmIHRoZSBnaXZlbiBub2RlIGlzIGNvbGxhcHNpYmxlXHJcbiAgICAgIGFwaS5pc0NvbGxhcHNpYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gIXRoaXMuaXNFeHBhbmRhYmxlKG5vZGUpICYmIG5vZGUuaXNQYXJlbnQoKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIGdldCBjb2xsYXBzaWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcclxuICAgICAgYXBpLmNvbGxhcHNpYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub2RlcyA9IF9ub2RlcyA/IF9ub2RlcyA6IGN5Lm5vZGVzKCk7XHJcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgICAgIGVsZSA9IGk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gc2VsZi5pc0NvbGxhcHNpYmxlKGVsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBnZXQgZXhwYW5kYWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcclxuICAgICAgYXBpLmV4cGFuZGFibGVOb2RlcyA9IGZ1bmN0aW9uIChfbm9kZXMpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vZGVzID0gX25vZGVzID8gX25vZGVzIDogY3kubm9kZXMoKTtcclxuICAgICAgICByZXR1cm4gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcclxuICAgICAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgZWxlID0gaTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBzZWxmLmlzRXhwYW5kYWJsZShlbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgICAgLy8gR2V0IHRoZSBjaGlsZHJlbiBvZiB0aGUgZ2l2ZW4gY29sbGFwc2VkIG5vZGUgd2hpY2ggYXJlIHJlbW92ZWQgZHVyaW5nIGNvbGxhcHNlIG9wZXJhdGlvblxyXG4gICAgICBhcGkuZ2V0Q29sbGFwc2VkQ2hpbGRyZW4gPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJyk7XHJcbiAgICAgIH07XHJcbiAgICAgIFxyXG4gICAgICAvLyBUaGlzIG1ldGhvZCB3b3JrcyBwcm9ibGVtYXRpYyBUT0RPIGZpeCByZWxhdGVkIGJ1Z3MgYW5kIGV4cG9zZSBpdFxyXG4gICAgICAvLyBVbmJpbmRzIGN1ZSBldmVudHNcclxuLy8gICAgICBhcGkuZGlzYWJsZUN1ZSA9IGZ1bmN0aW9uKCkge1xyXG4vLyAgICAgICAgaWYgKG9wdGlvbnMuY3VlRW5hYmxlZCkge1xyXG4vLyAgICAgICAgICBjdWVVdGlsaXRpZXMoJ3VuYmluZCcsIGN5KTtcclxuLy8gICAgICAgICAgb3B0aW9ucy5jdWVFbmFibGVkID0gZmFsc2U7XHJcbi8vICAgICAgICB9XHJcbi8vICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIGFwaTsgLy8gUmV0dXJuIHRoZSBBUEkgaW5zdGFuY2VcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGFwaTsgLy8gRGVmaW5lIHRoZSBhcGkgaW5zdGFuY2VcclxuICAgIFxyXG4gICAgLy8gcmVnaXN0ZXIgdGhlIGV4dGVuc2lvbiBjeS5leHBhbmRDb2xsYXBzZSgpXHJcbiAgICBjeXRvc2NhcGUoXCJjb3JlXCIsIFwiZXhwYW5kQ29sbGFwc2VcIiwgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgLy8gSWYgb3B0cyBpcyBub3QgJ2dldCcgdGhhdCBpcyBpdCBpcyBhIHJlYWwgb3B0aW9ucyBvYmplY3QgdGhlbiBpbml0aWxpemUgdGhlIGV4dGVuc2lvblxyXG4gICAgICBpZiAob3B0cyAhPT0gJ2dldCcpIHtcclxuICAgICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICAgIG9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9leHBhbmRDb2xsYXBzZVV0aWxpdGllcycpKGN5KTtcclxuICAgICAgICBhcGkgPSBjcmVhdGVFeHRlbnNpb25BUEkoY3kpOyAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHRoZSBBUEkgaW5zdGFuY2UgZm9yIHRoZSBleHRlbnNpb25cclxuICAgICAgICB1bmRvUmVkb1V0aWxpdGllcyhjeSwgYXBpKTtcclxuXHJcbiAgICAgICAgaWYob3B0aW9ucy5jdWVFbmFibGVkKVxyXG4gICAgICAgICAgY3VlVXRpbGl0aWVzKG9wdGlvbnMsIGN5LCBhcGksICQpO1xyXG5cclxuXHJcbiAgICAgICAgb3B0aW9ucy5yZWFkeSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gYXBpOyAvLyBFeHBvc2UgdGhlIEFQSSB0byB0aGUgdXNlcnNcclxuICAgIH0pO1xyXG4gIH07XHJcbiAgXHJcblxyXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWV4cGFuZC1jb2xsYXBzZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgalF1ZXJ5ICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgICByZWdpc3RlcihjeXRvc2NhcGUsIGpRdWVyeSk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGFwaSkge1xyXG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7fSwgdHJ1ZSk7XHJcblxyXG4gIGZ1bmN0aW9uIGdldEVsZXMoX2VsZXMpIHtcclxuICAgIHJldHVybiAodHlwZW9mIF9lbGVzID09PSBcInN0cmluZ1wiKSA/IGN5LiQoX2VsZXMpIDogX2VsZXM7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXROb2RlUG9zaXRpb25zKCkge1xyXG4gICAgdmFyIHBvc2l0aW9ucyA9IHt9O1xyXG4gICAgdmFyIG5vZGVzID0gY3kubm9kZXMoKTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlbGUgPSBub2Rlc1tpXTtcclxuICAgICAgcG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcclxuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxyXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcG9zaXRpb25zO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmV0dXJuVG9Qb3NpdGlvbnMocG9zaXRpb25zKSB7XHJcbiAgICB2YXIgY3VycmVudFBvc2l0aW9ucyA9IHt9O1xyXG4gICAgY3kubm9kZXMoKS5wb3NpdGlvbnMoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICBjdXJyZW50UG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcclxuICAgICAgICB4OiBlbGUucG9zaXRpb24oXCJ4XCIpLFxyXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcclxuICAgICAgfTtcclxuICAgICAgdmFyIHBvcyA9IHBvc2l0aW9uc1tlbGUuaWQoKV07XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogcG9zLngsXHJcbiAgICAgICAgeTogcG9zLnlcclxuICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjdXJyZW50UG9zaXRpb25zO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlY29uZFRpbWVPcHRzID0ge1xyXG4gICAgbGF5b3V0Qnk6IG51bGwsXHJcbiAgICBhbmltYXRlOiBmYWxzZSxcclxuICAgIGZpc2hleWU6IGZhbHNlXHJcbiAgfTtcclxuXHJcbiAgZnVuY3Rpb24gZG9JdChmdW5jKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICB2YXIgbm9kZXMgPSBnZXRFbGVzKGFyZ3Mubm9kZXMpO1xyXG4gICAgICBpZiAoYXJncy5maXJzdFRpbWUpIHtcclxuICAgICAgICByZXN1bHQub2xkRGF0YSA9IGdldE5vZGVQb3NpdGlvbnMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKGFyZ3Mub3B0aW9ucykgOiBhcGlbZnVuY10obm9kZXMsIGFyZ3Mub3B0aW9ucyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gZnVuYy5pbmRleE9mKFwiQWxsXCIpID4gMCA/IGFwaVtmdW5jXShzZWNvbmRUaW1lT3B0cykgOiBhcGlbZnVuY10oY3kuY29sbGVjdGlvbihub2RlcyksIHNlY29uZFRpbWVPcHRzKTtcclxuICAgICAgICByZXR1cm5Ub1Bvc2l0aW9ucyhhcmdzLm9sZERhdGEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHZhciBhY3Rpb25zID0gW1wiY29sbGFwc2VcIiwgXCJjb2xsYXBzZVJlY3Vyc2l2ZWx5XCIsIFwiY29sbGFwc2VBbGxcIiwgXCJleHBhbmRcIiwgXCJleHBhbmRSZWN1cnNpdmVseVwiLCBcImV4cGFuZEFsbFwiXTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB1ci5hY3Rpb24oYWN0aW9uc1tpXSwgZG9JdChhY3Rpb25zW2ldKSwgZG9JdChhY3Rpb25zWyhpICsgMykgJSA2XSkpO1xyXG4gIH1cclxuXHJcbn07XHJcbiJdfQ==
