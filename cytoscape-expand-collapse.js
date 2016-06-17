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
  }
};

module.exports = elementUtilities;

},{}],3:[function(_dereq_,module,exports){
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
      var newEdge = jQuery.extend(true, {}, edge.jsons()[0]);

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
},{"./boundingBoxUtilities":1,"./elementUtilities":2}],4:[function(_dereq_,module,exports){
var expandCollapseUtilities = _dereq_('./expandCollapseUtilities');

;
(function () {
  'use strict';

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
      }
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

    var tappedBefore;
    var tappedTimeout;

    // cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      cy = this;
      options = setOptions(opts);

      // test for expand-collapse
      cy.on('tap', function (event) {
        var tappedNow = event.cyTarget;
        if (tappedTimeout && tappedBefore) {
          clearTimeout(tappedTimeout);
        }
        if (tappedBefore === tappedNow) {
          tappedNow.trigger('doubleTap');
          tappedBefore = null;
        } else {
          tappedTimeout = setTimeout(function () {
            tappedBefore = null;
          }, 300);
          tappedBefore = tappedNow;
        }
      });

      cy.on("doubleTap", ':parent, [expanded-collapsed]', function (e) {
        if (e.cyTarget.data("expanded-collapsed") == "collapsed") {
          e.cyTarget.expand();
        } else {
          e.cyTarget.collapse();
        }
      });

      options.ready();

    });

    // Collection functions

    // eles.collapse(options)
    cytoscape('collection', 'collapse', function (opts) {
      var eles = this.collapsibleNodes();
      var tempOptions = setOptions(opts);

      return expandCollapseUtilities.collapseGivenNodes(eles, tempOptions);
    });

    // eles.collapseAll(options)
    cytoscape('collection', 'collapseAll', function (opts) {
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
    cytoscape('collection', 'expandAll', function (opts) {
      var eles = this.expandableNodes();
      var tempOptions = setOptions(opts);

      return expandCollapseUtilities.expandAllNodes(eles, tempOptions);
    });


    // Core functions

    // cy.collapseAll(options)
    cytoscape('core', 'collapseAll', function (opts) {
      var cy = this;
      var tempOptions = setOptions(opts);

      return cy.nodes().collapsibleNodes().collapseAll(tempOptions);
    });

    // cy.expandAll(options)
    cytoscape('core', 'expandAll', function (opts) {
      var cy = this;
      var tempOptions = setOptions(opts);

      return cy.nodes().expandableNodes().expandAll();
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

})();

},{"./expandCollapseUtilities":3}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvZWxlbWVudFV0aWxpdGllcy5qcyIsInNyYy9leHBhbmRDb2xsYXBzZVV0aWxpdGllcy5qcyIsInNyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0ge1xuICBlcXVhbEJvdW5kaW5nQm94ZXM6IGZ1bmN0aW9uKGJiMSwgYmIyKXtcbiAgICAgIHJldHVybiBiYjEueDEgPT0gYmIyLngxICYmIGJiMS54MiA9PSBiYjIueDIgJiYgYmIxLnkxID09IGJiMi55MSAmJiBiYjEueTIgPT0gYmIyLnkyO1xuICB9LFxuICBnZXRVbmlvbjogZnVuY3Rpb24oYmIxLCBiYjIpe1xuICAgICAgdmFyIHVuaW9uID0ge1xuICAgICAgeDE6IE1hdGgubWluKGJiMS54MSwgYmIyLngxKSxcbiAgICAgIHgyOiBNYXRoLm1heChiYjEueDIsIGJiMi54MiksXG4gICAgICB5MTogTWF0aC5taW4oYmIxLnkxLCBiYjIueTEpLFxuICAgICAgeTI6IE1hdGgubWF4KGJiMS55MiwgYmIyLnkyKSxcbiAgICB9O1xuXG4gICAgdW5pb24udyA9IHVuaW9uLngyIC0gdW5pb24ueDE7XG4gICAgdW5pb24uaCA9IHVuaW9uLnkyIC0gdW5pb24ueTE7XG5cbiAgICByZXR1cm4gdW5pb247XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYm91bmRpbmdCb3hVdGlsaXRpZXM7IiwidmFyIGVsZW1lbnRVdGlsaXRpZXMgPSB7XG4gIG1vdmVOb2RlczogZnVuY3Rpb24gKHBvc2l0aW9uRGlmZiwgbm9kZXMsIG5vdENhbGNUb3BNb3N0Tm9kZXMpIHtcbiAgICB2YXIgdG9wTW9zdE5vZGVzID0gbm90Q2FsY1RvcE1vc3ROb2RlcyA/IG5vZGVzIDogdGhpcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IHRvcE1vc3ROb2Rlc1tpXTtcbiAgICAgIHZhciBvbGRYID0gbm9kZS5wb3NpdGlvbihcInhcIik7XG4gICAgICB2YXIgb2xkWSA9IG5vZGUucG9zaXRpb24oXCJ5XCIpO1xuICAgICAgbm9kZS5wb3NpdGlvbih7XG4gICAgICAgIHg6IG9sZFggKyBwb3NpdGlvbkRpZmYueCxcbiAgICAgICAgeTogb2xkWSArIHBvc2l0aW9uRGlmZi55XG4gICAgICB9KTtcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xuICAgIH1cbiAgfSxcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xuICAgIHZhciBub2Rlc01hcCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcbiAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50KClbMF07XG4gICAgICB3aGlsZSAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG5vZGVzTWFwW3BhcmVudC5pZCgpXSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiByb290cztcbiAgfSxcbiAgcmVhcnJhbmdlOiBmdW5jdGlvbiAobGF5b3V0QnkpIHsvLyovL1xuICAgIGlmICh0eXBlb2YgbGF5b3V0QnkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgbGF5b3V0QnkoKTtcbiAgICB9IGVsc2UgaWYgKGxheW91dEJ5ICE9IG51bGwpIHtcbiAgICAgIGN5LmxheW91dChsYXlvdXRCeSk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVsZW1lbnRVdGlsaXRpZXM7XG4iLCJ2YXIgYm91bmRpbmdCb3hVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JvdW5kaW5nQm94VXRpbGl0aWVzJyk7XG52YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpO1xuXG4vLyBFeHBhbmQgY29sbGFwc2UgdXRpbGl0aWVzXG52YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSB7XG4gIGVkZ2VzVG9SZXBhaXI6IG51bGwsXG4gIC8vdGhlIG51bWJlciBvZiBub2RlcyBtb3ZpbmcgYW5pbWF0ZWRseSBhZnRlciBleHBhbmQgb3BlcmF0aW9uXG4gIGFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQ6IDAsXG4gIC8vVGhpcyBpcyBhIG1hcCB3aGljaCBrZWVwcyB0aGUgaW5mb3JtYXRpb24gb2YgY29sbGFwc2VkIG1ldGEgZWRnZXMgdG8gaGFuZGxlIHRoZW0gY29ycmVjdGx5XG4gIGNvbGxhcHNlZE1ldGFFZGdlc0luZm86IHt9LFxuICAvL1RoaXMgbWFwIGtlZXBzIHRyYWNrIG9mIHRoZSBtZXRhIGxldmVscyBvZiBlZGdlcyBieSB0aGVpciBpZCdzXG4gIGVkZ2VzTWV0YUxldmVsczoge30sXG4gIC8vVGhpcyBtZXRob2QgY2hhbmdlcyBzb3VyY2Ugb3IgdGFyZ2V0IGlkIG9mIHRoZSBjb2xsYXBzZWQgZWRnZSBkYXRhIGtlcHQgaW4gdGhlIGRhdGEgb2YgdGhlIG5vZGVcbiAgLy93aXRoIGlkIG9mIGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXG4gIGFsdGVyU291cmNlT3JUYXJnZXRPZkNvbGxhcHNlZEVkZ2U6IGZ1bmN0aW9uIChjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZCwgZWRnZUlkLCBzb3VyY2VPclRhcmdldCkgey8vKi8vXG4gICAgdmFyIG5vZGUgPSBjeS5nZXRFbGVtZW50QnlJZChjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZClbMF07XG4gICAgdmFyIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW47XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjb2xsYXBzZWRFZGdlID0gZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldO1xuICAgICAgaWYgKGNvbGxhcHNlZEVkZ2UuX3ByaXZhdGUuZGF0YS5pZCA9PSBlZGdlSWQpIHtcbiAgICAgICAgY29sbGFwc2VkRWRnZS5fcHJpdmF0ZS5kYXRhW3NvdXJjZU9yVGFyZ2V0XSA9IGNvbGxhcHNlZEVkZ2UuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWROb2RlQmVmb3JlQmVjYW1pbmdNZXRhO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIC8vQSBmdW50aW9uIGJhc2ljbHkgZXhwYW5kaW5nIGEgbm9kZSBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5XG4gIGV4cGFuZE5vZGVCYXNlRnVuY3Rpb246IGZ1bmN0aW9uIChub2RlLCB0cmlnZ2VyTGF5b3V0LCBzaW5nbGUsIGxheW91dEJ5KSB7Ly8qLy9cbiAgICAvL2NoZWNrIGhvdyB0aGUgcG9zaXRpb24gb2YgdGhlIG5vZGUgaXMgY2hhbmdlZFxuICAgIHZhciBwb3NpdGlvbkRpZmYgPSB7XG4gICAgICB4OiBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpLngsXG4gICAgICB5OiBub2RlLnBvc2l0aW9uKCd5JykgLSBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpLnlcbiAgICB9O1xuXG4gICAgbm9kZS5yZW1vdmVEYXRhKFwiaW5mb0xhYmVsXCIpO1xuICAgIG5vZGUuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJywgJ2V4cGFuZGVkJyk7XG4gICAgbm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLm5vZGVzKCkucmVzdG9yZSgpO1xuICAgIHRoaXMucmVwYWlyRWRnZXNPZkNvbGxhcHNlZENoaWxkcmVuKG5vZGUpO1xuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IG51bGw7XG5cbiAgICBjeS5ub2RlcygpLnVwZGF0ZUNvbXBvdW5kQm91bmRzKCk7XG5cbiAgICAvL0Rvbid0IHNob3cgY2hpbGRyZW4gaW5mbyB3aGVuIHRoZSBjb21wbGV4IG5vZGUgaXMgZXhwYW5kZWRcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLnNiZ25jbGFzcyA9PSBcImNvbXBsZXhcIikge1xuICAgICAgbm9kZS5yZW1vdmVTdHlsZSgnY29udGVudCcpO1xuICAgIH1cblxuICAgIGVsZW1lbnRVdGlsaXRpZXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgbm9kZS5jaGlsZHJlbigpKTtcbiAgICBub2RlLnJlbW92ZURhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScpO1xuXG4gICAgaWYgKHNpbmdsZSlcbiAgICAgIHRoaXMuZW5kT3BlcmF0aW9uKCk7XG4gICAgLy8gcmVmcmVzaFBhZGRpbmdzKCk7XG4gICAgaWYgKHRyaWdnZXJMYXlvdXQpIHsgLy8qLyovKmFzZHNhZGRhXG4gICAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShsYXlvdXRCeSk7XG5cbiAgICB9XG4gIH0sXG4gIHNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzKSB7Ly8qLy9cbiAgICBub2Rlcy5kYXRhKFwiY29sbGFwc2VcIiwgdHJ1ZSk7XG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAocm9vdCk7XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkgey8vKi8vXG4gICAgbm9kZXMuZGF0YShcImV4cGFuZFwiLCB0cnVlKTtcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcbiAgICAgIHRoaXMuZXhwYW5kVG9wRG93bihyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xuICAgIGlmIChub2RlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBub2RlcyA9IGN5Lm5vZGVzKCk7XG4gICAgfVxuICAgIHZhciBvcnBoYW5zO1xuICAgIG9ycGhhbnMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgdmFyIGV4cGFuZFN0YWNrID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcm9vdCA9IG9ycGhhbnNbaV07XG4gICAgICB0aGlzLmV4cGFuZEFsbFRvcERvd24ocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cGFuZFN0YWNrO1xuICB9LFxuICBiZWdpbk9wZXJhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgfSxcbiAgZW5kT3BlcmF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lZGdlc1RvUmVwYWlyLnJlc3RvcmUoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWRnZXNUb1JlcGFpci5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGVkZ2UgPSB0aGlzLmVkZ2VzVG9SZXBhaXJbaV07XG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZS5pZCgpXSA9PSBudWxsIHx8IHRoaXMuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gPT0gMCkge1xuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKFwibWV0YVwiKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBlZGdlLmFkZENsYXNzKFwibWV0YVwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5lZGdlc1RvUmVwYWlyID0gY3kuY29sbGVjdGlvbigpO1xuICB9LFxuICBleHBhbmRBbGxOb2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7Ly8qLy9cbiAgICB0aGlzLmJlZ2luT3BlcmF0aW9uKCk7XG4gICAgY3kudHJpZ2dlcihcImJlZm9yZUV4cGFuZFwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcbiAgICB2YXIgZXhwYW5kZWRTdGFjayA9IHRoaXMuc2ltcGxlRXhwYW5kQWxsTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XG4gICAgY3kudHJpZ2dlcihcImFmdGVyRXhwYW5kXCIsIFtub2Rlcywgb3B0aW9uc10pO1xuXG4gICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcblxuICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKG9wdGlvbnMubGF5b3V0QnkpO1xuXG4gICAgLypcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIHJldHVybiBleHBhbmRlZFN0YWNrO1xuICB9LFxuICBleHBhbmRBbGxUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgZXhwYW5kU3RhY2ssIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cbiAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIGV4cGFuZFN0YWNrLnB1c2gocm9vdCk7XG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihub2RlLCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgfSxcbiAgLy9FeHBhbmQgdGhlIGdpdmVuIG5vZGVzIHBlcmZvcm0gaW5jcmVtZW50YWwgbGF5b3V0IGFmdGVyIGV4cGFuZGF0aW9uXG4gIGV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXG4gICAgdGhpcy5iZWdpbk9wZXJhdGlvbigpO1xuICAgIGN5LnRyaWdnZXIoXCJiZWZvcmVFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XG4gICAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdGhpcy5leHBhbmROb2RlKG5vZGVzWzBdLCBvcHRpb25zLmZpc2hleWUsIG9wdGlvbnMuYW5pbWF0ZSwgb3B0aW9ucy5sYXlvdXRCeSk7XG4gICAgICBjeS50cmlnZ2VyKFwiYWZ0ZXJFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaW1wbGVFeHBhbmRHaXZlbk5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xuICAgICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcbiAgICAgIGN5LnRyaWdnZXIoXCJhZnRlckV4cGFuZFwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcblxuICAgICAgZWxlbWVudFV0aWxpdGllcy5yZWFycmFuZ2Uob3B0aW9ucy5sYXlvdXRCeSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZXMgdGhlbiBtYWtlIGluY3JlbWVudGFsIGxheW91dFxuICBjb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcywgb3B0aW9ucykgey8vKi8vXG4gICAgdGhpcy5iZWdpbk9wZXJhdGlvbigpO1xuICAgIGN5LnRyaWdnZXIoXCJiZWZvcmVDb2xsYXBzZVwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcbiAgICB0aGlzLnNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2Rlcyhub2Rlcywgb3B0aW9ucyk7XG4gICAgY3kudHJpZ2dlcihcImJlZm9yZUNvbGxhcHNlXCIsIFtub2Rlcywgb3B0aW9uc10pO1xuXG4gICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcbiAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcblxuICAgIC8qXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgKi9cbiAgICByZXR1cm4gbm9kZXM7XG4gIH0sXG4gIC8vY29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XG4gIGNvbGxhcHNlQm90dG9tVXA6IGZ1bmN0aW9uIChyb290KSB7Ly8qLy9cbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChub2RlKTtcbiAgICB9XG4gICAgLy9JZiB0aGUgcm9vdCBpcyBhIGNvbXBvdW5kIG5vZGUgdG8gYmUgY29sbGFwc2VkIHRoZW4gY29sbGFwc2UgaXRcbiAgICBpZiAocm9vdC5kYXRhKFwiY29sbGFwc2VcIikgJiYgcm9vdC5jaGlsZHJlbigpLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuc2ltcGxlQ29sbGFwc2VOb2RlKHJvb3QpO1xuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiY29sbGFwc2VcIik7XG4gICAgfVxuICB9LFxuICAvL2V4cGFuZCB0aGUgbm9kZXMgaW4gdG9wIGRvd24gb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxuICBleHBhbmRUb3BEb3duOiBmdW5jdGlvbiAocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xuICAgIGlmIChyb290LmRhdGEoXCJleHBhbmRcIikgJiYgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgICByb290LnJlbW92ZURhdGEoXCJleHBhbmRcIik7XG4gICAgfVxuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKG5vZGUpO1xuICAgIH1cbiAgfSxcbiAgZXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGZpc2hleWUsIGFuaW1hdGUsIGxheW91dEJ5KSB7XG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUobm9kZSwgZmlzaGV5ZSwgdHJ1ZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xuXG4gICAgICAvKlxuICAgICAgICogcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAgICovXG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH0sXG4gIGNvbnZlcnRUb01vZGVsUG9zaXRpb246IGZ1bmN0aW9uIChyZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcbiAgICB2YXIgeSA9IChyZW5kZXJlZFBvc2l0aW9uLnkgLSBwYW4ueSkgLyB6b29tO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5XG4gICAgfTtcbiAgfSxcbiAgLypcbiAgICpcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZVxuICAgKiB3aXRob3V0IG1ha2luZyBpbmNyZW1lbnRhbCBsYXlvdXRcbiAgICogYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvbiBpdCB3aWxsIGJlIHNpbXBseVxuICAgKiB1c2VkIHRvIHVuZG8gdGhlIGNvbGxhcHNlIG9wZXJhdGlvblxuICAgKi9cbiAgc2ltcGxlRXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7Ly8qLy9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29tbW9uRXhwYW5kT3BlcmF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7XG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcblxuICAgICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncpO1xuICAgICAgICBub2RlLmRhdGEoJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZScsIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oKTtcblxuICAgICAgICBzZWxmLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgbm9kZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXNpbmdsZU5vdFNpbXBsZSB8fCAhYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUgfHwgIWFuaW1hdGUpIHtcbiAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgc2luZ2xlTm90U2ltcGxlLCBsYXlvdXRCeSk7IC8vKioqKipcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZSk7XG4gICAgICBpZiAoYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUgJiYgc2luZ2xlTm90U2ltcGxlKSB7XG4gICAgICAgIHZhciB0b3BMZWZ0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IDAsIHk6IDB9KTtcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XG4gICAgICAgIHZhciBwYWRkaW5nID0gODA7XG4gICAgICAgIHZhciBiYiA9IHtcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXG4gICAgICAgICAgeDI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueCxcbiAgICAgICAgICB5MTogdG9wTGVmdFBvc2l0aW9uLnksXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBub2RlQkIgPSB7XG4gICAgICAgICAgeDE6IG5vZGUucG9zaXRpb24oJ3gnKSAtIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS53IC8gMiAtIHBhZGRpbmcsXG4gICAgICAgICAgeDI6IG5vZGUucG9zaXRpb24oJ3gnKSArIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS53IC8gMiArIHBhZGRpbmcsXG4gICAgICAgICAgeTE6IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oIC8gMiAtIHBhZGRpbmcsXG4gICAgICAgICAgeTI6IG5vZGUucG9zaXRpb24oJ3knKSArIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oIC8gMiArIHBhZGRpbmdcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdW5pb25CQiA9IGJvdW5kaW5nQm94VXRpbGl0aWVzLmdldFVuaW9uKG5vZGVCQiwgYmIpO1xuICAgICAgICB2YXIgYW5pbWF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKCFib3VuZGluZ0JveFV0aWxpdGllcy5lcXVhbEJvdW5kaW5nQm94ZXModW5pb25CQiwgYmIpKSB7XG4gICAgICAgICAgdmFyIHZpZXdQb3J0ID0gY3kuZ2V0Rml0Vmlld3BvcnQodW5pb25CQiwgMTApO1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICBhbmltYXRpbmcgPSBhbmltYXRlO1xuICAgICAgICAgIGlmIChhbmltYXRlKSB7XG4gICAgICAgICAgICBjeS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgcGFuOiB2aWV3UG9ydC5wYW4sXG4gICAgICAgICAgICAgIHpvb206IHZpZXdQb3J0Lnpvb20sXG4gICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBkdXJhdGlvbjogMTAwMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3kuem9vbSh2aWV3UG9ydC56b29tKTtcbiAgICAgICAgICAgIGN5LnBhbih2aWV3UG9ydC5wYW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFuaW1hdGluZykge1xuICAgICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xuICAgICAgfVxuXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfSxcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZSB3aXRob3V0IG1ha2luZyBpbmNyZW1lbnRhbCBsYXlvdXRcbiAgc2ltcGxlQ29sbGFwc2VOb2RlOiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XG4gICAgICBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScsIHtcbiAgICAgICAgeDogbm9kZS5wb3NpdGlvbigpLngsXG4gICAgICAgIHk6IG5vZGUucG9zaXRpb24oKS55XG4gICAgICB9KTtcblxuICAgICAgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScsIHtcbiAgICAgICAgdzogbm9kZS5vdXRlcldpZHRoKCksXG4gICAgICAgIGg6IG5vZGUub3V0ZXJIZWlnaHQoKVxuICAgICAgfSk7XG5cbiAgICAgIG5vZGUuY2hpbGRyZW4oKS51bnNlbGVjdCgpO1xuICAgICAgbm9kZS5jaGlsZHJlbigpLmNvbm5lY3RlZEVkZ2VzKCkudW5zZWxlY3QoKTtcblxuICAgICAgbm9kZS5kYXRhKCdleHBhbmRlZC1jb2xsYXBzZWQnLCAnY29sbGFwc2VkJyk7XG5cbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcblxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgICAgICB0aGlzLmJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbihub2RlLCBjaGlsZCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4obm9kZSwgbm9kZSk7XG4gICAgICAvLyByZWZyZXNoUGFkZGluZ3MoKTtcblxuICAgICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5zYmduY2xhc3MgPT0gXCJjb21wbGV4XCIpIHtcbiAgICAgICAgbm9kZS5hZGRDbGFzcygnY2hhbmdlQ29udGVudCcpO1xuICAgICAgfVxuXG4gICAgICBub2RlLnBvc2l0aW9uKG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykpO1xuXG4gICAgICAvL3JldHVybiB0aGUgbm9kZSB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfSxcbiAgc3RvcmVXaWR0aEhlaWdodDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xuICAgIGlmIChub2RlICE9IG51bGwpIHtcbiAgICAgIG5vZGUuZGF0YSgneC1iZWZvcmUtZmlzaGV5ZScsIHRoaXMueFBvc2l0aW9uSW5QYXJlbnQobm9kZSkpO1xuICAgICAgbm9kZS5kYXRhKCd5LWJlZm9yZS1maXNoZXllJywgdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKSk7XG4gICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5vdXRlcldpZHRoKCkpO1xuICAgICAgbm9kZS5kYXRhKCdoZWlnaHQtYmVmb3JlLWZpc2hleWUnLCBub2RlLm91dGVySGVpZ2h0KCkpO1xuXG4gICAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlLnBhcmVudCgpWzBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSxcbiAgZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGU6IGZ1bmN0aW9uIChub2RlLCBzaW5nbGVOb3RTaW1wbGUsIG5vZGVUb0V4cGFuZCwgYW5pbWF0ZSwgbGF5b3V0QnkpIHsvLyovL1xuICAgIHZhciBzaWJsaW5ncyA9IHRoaXMuZ2V0U2libGluZ3Mobm9kZSk7XG5cbiAgICB2YXIgeF9hID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcbiAgICB2YXIgeV9hID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcblxuICAgIHZhciBkX3hfbGVmdCA9IE1hdGguYWJzKChub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcbiAgICB2YXIgZF94X3JpZ2h0ID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xuICAgIHZhciBkX3lfdXBwZXIgPSBNYXRoLmFicygobm9kZS5kYXRhKCdoZWlnaHQtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcbiAgICB2YXIgZF95X2xvd2VyID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XG5cbiAgICB2YXIgYWJzX2RpZmZfb25feCA9IE1hdGguYWJzKG5vZGUuZGF0YSgneC1iZWZvcmUtZmlzaGV5ZScpIC0geF9hKTtcbiAgICB2YXIgYWJzX2RpZmZfb25feSA9IE1hdGguYWJzKG5vZGUuZGF0YSgneS1iZWZvcmUtZmlzaGV5ZScpIC0geV9hKTtcblxuICAgIC8vIENlbnRlciB3ZW50IHRvIExFRlRcbiAgICBpZiAobm9kZS5kYXRhKCd4LWJlZm9yZS1maXNoZXllJykgPiB4X2EpIHtcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgKyBhYnNfZGlmZl9vbl94O1xuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0IC0gYWJzX2RpZmZfb25feDtcbiAgICB9XG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gUklHSFRcbiAgICBlbHNlIHtcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgLSBhYnNfZGlmZl9vbl94O1xuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0ICsgYWJzX2RpZmZfb25feDtcbiAgICB9XG5cbiAgICAvLyBDZW50ZXIgd2VudCB0byBVUFxuICAgIGlmIChub2RlLmRhdGEoJ3ktYmVmb3JlLWZpc2hleWUnKSA+IHlfYSkge1xuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyICsgYWJzX2RpZmZfb25feTtcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciAtIGFic19kaWZmX29uX3k7XG4gICAgfVxuICAgIC8vIENlbnRlciB3ZW50IHRvIERPV05cbiAgICBlbHNlIHtcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciAtIGFic19kaWZmX29uX3k7XG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgKyBhYnNfZGlmZl9vbl95O1xuICAgIH1cblxuICAgIHZhciB4UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XG4gICAgdmFyIHlQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHhQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnhQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XG4gICAgICB5UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy55UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3NbaV07XG5cbiAgICAgIHZhciB4X2IgPSB4UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xuICAgICAgdmFyIHlfYiA9IHlQb3NJblBhcmVudFNpYmxpbmdbaV07XG5cbiAgICAgIHZhciBzbG9wZSA9ICh5X2IgLSB5X2EpIC8gKHhfYiAtIHhfYSk7XG5cbiAgICAgIHZhciBkX3ggPSAwO1xuICAgICAgdmFyIGRfeSA9IDA7XG4gICAgICB2YXIgVF94ID0gMDtcbiAgICAgIHZhciBUX3kgPSAwO1xuXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExFRlRcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcbiAgICAgICAgZF94ID0gZF94X2xlZnQ7XG4gICAgICB9XG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFJJR0hUXG4gICAgICBlbHNlIHtcbiAgICAgICAgZF94ID0gZF94X3JpZ2h0O1xuICAgICAgfVxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBVUFBFUiBzaWRlXG4gICAgICBpZiAoeV9hID4geV9iKSB7XG4gICAgICAgIGRfeSA9IGRfeV91cHBlcjtcbiAgICAgIH1cbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTE9XRVIgc2lkZVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRfeSA9IGRfeV9sb3dlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRmluaXRlKHNsb3BlKSkge1xuICAgICAgICBUX3ggPSBNYXRoLm1pbihkX3gsIChkX3kgLyBNYXRoLmFicyhzbG9wZSkpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNsb3BlICE9PSAwKSB7XG4gICAgICAgIFRfeSA9IE1hdGgubWluKGRfeSwgKGRfeCAqIE1hdGguYWJzKHNsb3BlKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoeF9hID4geF9iKSB7XG4gICAgICAgIFRfeCA9IC0xICogVF94O1xuICAgICAgfVxuXG4gICAgICBpZiAoeV9hID4geV9iKSB7XG4gICAgICAgIFRfeSA9IC0xICogVF95O1xuICAgICAgfVxuXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoc2libGluZywgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XG4gICAgfVxuXG5cbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XG4gICAgICB0aGlzLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUucGFyZW50KClbMF0sIHNpbmdsZU5vdFNpbXBsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH0sXG4gIGdldFNpYmxpbmdzOiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXG4gICAgdmFyIHNpYmxpbmdzO1xuXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gPT0gbnVsbCkge1xuICAgICAgc2libGluZ3MgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKCkub3JwaGFucygpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ycGhhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKG9ycGhhbnNbaV0gIT0gbm9kZSkge1xuICAgICAgICAgIHNpYmxpbmdzID0gc2libGluZ3MuYWRkKG9ycGhhbnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNpYmxpbmdzID0gbm9kZS5zaWJsaW5ncygpO1xuICAgIH1cblxuICAgIHJldHVybiBzaWJsaW5ncztcbiAgfSxcbiAgLypcbiAgICogTW92ZSBub2RlIG9wZXJhdGlvbiBzcGVjaWFsaXplZCBmb3IgZmlzaCBleWUgdmlldyBleHBhbmQgb3BlcmF0aW9uXG4gICAqIE1vdmVzIHRoZSBub2RlIGJ5IG1vdmluZyBpdHMgZGVzY2FuZGVudHMuIE1vdmVtZW50IGlzIGFuaW1hdGVkIGlmIHNpbmdsZU5vdFNpbXBsZSBmbGFnIGlzIHRydXRoeS5cbiAgICovXG4gIGZpc2hFeWVWaWV3TW92ZU5vZGU6IGZ1bmN0aW9uIChub2RlLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7Ly8qLy9cbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbigpO1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmIChjaGlsZHJlbkxpc3QubGVuZ3RoID09IDApIHtcbiAgICAgIHZhciBuZXdQb3NpdGlvbiA9IHt4OiBub2RlLnBvc2l0aW9uKCd4JykgKyBUX3gsIHk6IG5vZGUucG9zaXRpb24oJ3knKSArIFRfeX07XG4gICAgICBpZiAoIXNpbmdsZU5vdFNpbXBsZSB8fCAhYW5pbWF0ZSkge1xuICAgICAgICBub2RlLnBvc2l0aW9uKG5ld1Bvc2l0aW9uKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgbm9kZVRvRXhwYW5kLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcpID09PSAnZXhwYW5kZWQnKSB7XG5cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIHRydWUsIGxheW91dEJ5KTtcblxuICAgICAgICAgIH1cbiAgICAgICAgfSwge1xuICAgICAgICAgIGR1cmF0aW9uOiAxMDAwXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCBhbmltYXRlLCBsYXlvdXRCeSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICB4UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xuICAgIHZhciB4X2EgPSAwLjA7XG5cbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgIHhfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneCcpICsgKHBhcmVudC53aWR0aCgpIC8gMik7XG4gICAgfVxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXG5cbiAgICBlbHNlIHtcbiAgICAgIHhfYSA9IG5vZGUucG9zaXRpb24oJ3gnKTtcbiAgICB9XG5cbiAgICByZXR1cm4geF9hO1xuICB9LFxuICB5UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xuXG4gICAgdmFyIHlfYSA9IDAuMDtcblxuICAgIC8vIEdpdmVuIG5vZGUgaXMgbm90IGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xuICAgICAgeV9hID0gbm9kZS5yZWxhdGl2ZVBvc2l0aW9uKCd5JykgKyAocGFyZW50LmhlaWdodCgpIC8gMik7XG4gICAgfVxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXG5cbiAgICBlbHNlIHtcbiAgICAgIHlfYSA9IG5vZGUucG9zaXRpb24oJ3knKTtcbiAgICB9XG5cbiAgICByZXR1cm4geV9hO1xuICB9LFxuICAvKlxuICAgKiBmb3IgYWxsIGNoaWxkcmVuIG9mIHRoZSBub2RlIHBhcmFtZXRlciBjYWxsIHRoaXMgbWV0aG9kXG4gICAqIHdpdGggdGhlIHNhbWUgcm9vdCBwYXJhbWV0ZXIsXG4gICAqIHJlbW92ZSB0aGUgY2hpbGQgYW5kIGFkZCB0aGUgcmVtb3ZlZCBjaGlsZCB0byB0aGUgY29sbGFwc2VkY2hpbGRyZW4gZGF0YVxuICAgKiBvZiB0aGUgcm9vdCB0byByZXN0b3JlIHRoZW0gaW4gdGhlIGNhc2Ugb2YgZXhwYW5kYXRpb25cbiAgICogcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuIGtlZXBzIHRoZSBub2RlcyB0byByZXN0b3JlIHdoZW4gdGhlXG4gICAqIHJvb3QgaXMgZXhwYW5kZWRcbiAgICovXG4gIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSwgcm9vdCkgey8vKi8vXG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihjaGlsZCwgcm9vdCk7XG4gICAgICB2YXIgcmVtb3ZlZENoaWxkID0gY2hpbGQucmVtb3ZlKCk7XG4gICAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZENoaWxkO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi51bmlvbihyZW1vdmVkQ2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgLypcbiAgICogVGhpcyBtZXRob2QgbGV0IHRoZSByb290IHBhcmFtZXRlciB0byBiYXJyb3cgdGhlIGVkZ2VzIGNvbm5lY3RlZCB0byB0aGVcbiAgICogY2hpbGQgbm9kZSBvciBhbnkgbm9kZSBpbnNpZGUgY2hpbGQgbm9kZSBpZiB0aGUgYW55IG9uZSB0aGUgc291cmNlIGFuZCB0YXJnZXRcbiAgICogaXMgYW4gb3V0ZXIgbm9kZSBvZiB0aGUgcm9vdCBub2RlIGluIG90aGVyIHdvcmQgaXQgY3JlYXRlIG1ldGEgZWRnZXNcbiAgICovXG4gIGJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbjogZnVuY3Rpb24gKHJvb3QsIGNoaWxkTm9kZSkgey8vKi8vXG4gICAgdmFyIGNoaWxkcmVuID0gY2hpbGROb2RlLmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLmJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbihyb290LCBjaGlsZCk7XG4gICAgfVxuXG4gICAgdmFyIGVkZ2VzID0gY2hpbGROb2RlLmNvbm5lY3RlZEVkZ2VzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLmRhdGEoXCJzb3VyY2VcIik7XG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS5kYXRhKFwidGFyZ2V0XCIpO1xuICAgICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xuICAgICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xuICAgICAgdmFyIG5ld0VkZ2UgPSBqUXVlcnkuZXh0ZW5kKHRydWUsIHt9LCBlZGdlLmpzb25zKClbMF0pO1xuXG4gICAgICAvL0luaXRpbGl6ZSB0aGUgbWV0YSBsZXZlbCBvZiB0aGlzIGVkZ2UgaWYgaXQgaXMgbm90IGluaXRpbGl6ZWQgeWV0XG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZS5pZCgpXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gPSAwO1xuICAgICAgfVxuXG4gICAgICAvKklmIHRoZSBlZGdlIGlzIG1ldGEgYW5kIGhhcyBkaWZmZXJlbnQgc291cmNlIGFuZCB0YXJnZXRzIHRoZW4gaGFuZGxlIHRoaXMgY2FzZSBiZWNhdXNlIGlmXG4gICAgICAgKiB0aGUgb3RoZXIgZW5kIG9mIHRoaXMgZWRnZSBpcyByZW1vdmVkIGJlY2F1c2Ugb2YgdGhlIHJlYXNvbiB0aGF0IGl0J3MgcGFyZW50IGlzXG4gICAgICAgKiBiZWluZyBjb2xsYXBzZWQgYW5kIHRoaXMgbm9kZSBpcyBleHBhbmRlZCBiZWZvcmUgb3RoZXIgZW5kIGlzIHN0aWxsIGNvbGxhcHNlZCB0aGlzIGNhdXNlc1xuICAgICAgICogdGhhdCB0aGlzIGVkZ2UgY2Fubm90IGJlIHJlc3RvcmVkIGFzIG9uZSBlbmQgbm9kZSBvZiBpdCBkb2VzIG5vdCBleGlzdHMuXG4gICAgICAgKiBDcmVhdGUgYSBjb2xsYXBzZWQgbWV0YSBlZGdlIGluZm8gZm9yIHRoaXMgZWRnZSBhbmQgYWRkIHRoaXMgaW5mbyB0byBjb2xsYXBzZWRNZXRhRWRnZXNJbmZvXG4gICAgICAgKiBtYXAuIFRoaXMgaW5mbyBpbmNsdWRlcyBjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZCh0aGUgbm9kZSB3aGljaCBpcyBiZWluZyBjb2xsYXBzZWQpLFxuICAgICAgICogb3RoZXJFbmQodGhlIG90aGVyIGVuZCBvZiB0aGlzIGVkZ2UpIGFuZCBvbGRPd25lcih0aGUgb3duZXIgb2YgdGhpcyBlZGdlIHdoaWNoIHdpbGwgYmVjb21lXG4gICAgICAgKiBhbiBvbGQgb3duZXIgYWZ0ZXIgY29sbGFwc2Ugb3BlcmF0aW9uKVxuICAgICAgICovXG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZS5pZCgpXSAhPSAwICYmIHNvdXJjZSAhPSB0YXJnZXQpIHtcbiAgICAgICAgdmFyIG90aGVyRW5kID0gbnVsbDtcbiAgICAgICAgdmFyIG9sZE93bmVyID0gbnVsbDtcbiAgICAgICAgaWYgKHNvdXJjZSA9PSBjaGlsZE5vZGUuaWQoKSkge1xuICAgICAgICAgIG90aGVyRW5kID0gdGFyZ2V0O1xuICAgICAgICAgIG9sZE93bmVyID0gc291cmNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRhcmdldCA9PSBjaGlsZE5vZGUuaWQoKSkge1xuICAgICAgICAgIG90aGVyRW5kID0gc291cmNlO1xuICAgICAgICAgIG9sZE93bmVyID0gdGFyZ2V0O1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbmZvID0ge1xuICAgICAgICAgIGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkOiByb290LmlkKCksXG4gICAgICAgICAgb3RoZXJFbmQ6IG90aGVyRW5kLFxuICAgICAgICAgIG9sZE93bmVyOiBvbGRPd25lclxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXSA9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW3Jvb3QuaWQoKV0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgICAvL3RoZSBpbmZvcm1hdGlvbiBzaG91bGQgYmUgcmVhY2hhYmxlIGJ5IGVkZ2UgaWQgYW5kIG5vZGUgaWQnc1xuICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXVtvdGhlckVuZF0gPSBpbmZvO1xuICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bb3RoZXJFbmRdW3Jvb3QuaWQoKV0gPSBpbmZvO1xuICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZS5pZCgpXSA9IGluZm87XG4gICAgICB9XG5cbiAgICAgIHZhciByZW1vdmVkRWRnZSA9IGVkZ2UucmVtb3ZlKCk7XG4gICAgICAvL3N0b3JlIHRoZSBkYXRhIG9mIHRoZSBvcmlnaW5hbCBlZGdlXG4gICAgICAvL3RvIHJlc3RvcmUgd2hlbiB0aGUgbm9kZSBpcyBleHBhbmRlZFxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZEVkZ2U7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9XG4gICAgICAgICAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbi51bmlvbihyZW1vdmVkRWRnZSk7XG4gICAgICB9XG5cbiAgICAgIC8vRG8gbm90IGhhbmRsZSB0aGUgaW5uZXIgZWRnZXNcbiAgICAgIGlmICghdGhpcy5pc091dGVyTm9kZShzb3VyY2VOb2RlLCByb290KSAmJiAhdGhpcy5pc091dGVyTm9kZSh0YXJnZXROb2RlLCByb290KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy9JZiB0aGUgY2hhbmdlIHNvdXJjZSBhbmQvb3IgdGFyZ2V0IG9mIHRoZSBlZGdlIGluIHRoZVxuICAgICAgLy9jYXNlIG9mIHRoZXkgYXJlIGVxdWFsIHRvIHRoZSBpZCBvZiB0aGUgY29sbGFwc2VkIGNoaWxkXG4gICAgICBpZiAoc291cmNlID09IGNoaWxkTm9kZS5pZCgpKSB7XG4gICAgICAgIHNvdXJjZSA9IHJvb3QuaWQoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXJnZXQgPT0gY2hpbGROb2RlLmlkKCkpIHtcbiAgICAgICAgdGFyZ2V0ID0gcm9vdC5pZCgpO1xuICAgICAgfVxuXG4gICAgICAvL3ByZXBhcmUgdGhlIG5ldyBlZGdlIGJ5IGNoYW5naW5nIHRoZSBvbGRlciBzb3VyY2UgYW5kL29yIHRhcmdldFxuICAgICAgbmV3RWRnZS5kYXRhLnBvcnRzb3VyY2UgPSBzb3VyY2U7XG4gICAgICBuZXdFZGdlLmRhdGEucG9ydHRhcmdldCA9IHRhcmdldDtcbiAgICAgIG5ld0VkZ2UuZGF0YS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICBuZXdFZGdlLmRhdGEudGFyZ2V0ID0gdGFyZ2V0O1xuICAgICAgLy9yZW1vdmUgdGhlIG9sZGVyIGVkZ2UgYW5kIGFkZCB0aGUgbmV3IG9uZVxuICAgICAgY3kuYWRkKG5ld0VkZ2UpO1xuICAgICAgdmFyIG5ld0N5RWRnZSA9IGN5LmVkZ2VzKClbY3kuZWRnZXMoKS5sZW5ndGggLSAxXTtcbiAgICAgIC8vSWYgdGhpcyBlZGdlIGhhcyBub3QgbWV0YSBjbGFzcyBwcm9wZXJ0aWVzIG1ha2UgaXQgbWV0YVxuICAgICAgaWYgKHRoaXMuZWRnZXNNZXRhTGV2ZWxzW25ld0N5RWRnZS5pZCgpXSA9PSAwKSB7XG4gICAgICAgIG5ld0N5RWRnZS5hZGRDbGFzcyhcIm1ldGFcIik7XG4gICAgICB9XG4gICAgICAvL0luY3JlYXNlIHRoZSBtZXRhIGxldmVsIG9mIHRoaXMgZWRnZSBieSAxXG4gICAgICB0aGlzLmVkZ2VzTWV0YUxldmVsc1tuZXdDeUVkZ2UuaWQoKV0rKztcbiAgICAgIG5ld0N5RWRnZS5kYXRhKFwiY29sbGFwc2VkTm9kZUJlZm9yZUJlY2FtaW5nTWV0YVwiLCBjaGlsZE5vZGUuaWQoKSk7XG4gICAgfVxuICB9LFxuICAvKlxuICAgKiBUaGlzIG1ldGhvZCByZXBhaXJzIHRoZSBlZGdlcyBvZiB0aGUgY29sbGFwc2VkIGNoaWxkcmVuIG9mIHRoZSBnaXZlbiBub2RlXG4gICAqIHdoZW4gdGhlIG5vZGUgaXMgYmVpbmcgZXhwYW5kZWQsIHRoZSBtZXRhIGVkZ2VzIGNyZWF0ZWQgd2hpbGUgdGhlIG5vZGUgaXNcbiAgICogYmVpbmcgY29sbGFwc2VkIGFyZSBoYW5kbGVkIGluIHRoaXMgbWV0aG9kXG4gICAqL1xuICByZXBhaXJFZGdlc09mQ29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uIChub2RlKSB7IC8vKi8vXG4gICAgdmFyIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW47XG4gICAgaWYgKGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBjb2xsYXBzZWRNZXRhRWRnZUluZm9PZk5vZGUgPSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bbm9kZS5pZCgpXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgLy9IYW5kbGUgY29sbGFwc2VkIG1ldGEgZWRnZSBpbmZvIGlmIGl0IGlzIHJlcXVpcmVkXG4gICAgICBpZiAoY29sbGFwc2VkTWV0YUVkZ2VJbmZvT2ZOb2RlICE9IG51bGwgJiZcbiAgICAgICAgICAgICAgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkXSAhPSBudWxsKSB7XG4gICAgICAgIHZhciBpbmZvID0gdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkXTtcbiAgICAgICAgLy9JZiB0aGUgbWV0YSBlZGdlIGlzIG5vdCBjcmVhdGVkIGJlY2F1c2Ugb2YgdGhlIHJlYXNvbiB0aGF0IHRoaXMgbm9kZSBpcyBjb2xsYXBzZWRcbiAgICAgICAgLy9oYW5kbGUgaXQgYnkgY2hhbmdpbmcgc291cmNlIG9yIHRhcmdldCBvZiByZWxhdGVkIGVkZ2UgZGF0YXNcbiAgICAgICAgaWYgKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQgIT0gbm9kZS5pZCgpKSB7XG4gICAgICAgICAgaWYgKGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnNvdXJjZSA9PSBpbmZvLm9sZE93bmVyKSB7XG4gICAgICAgICAgICBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5zb3VyY2UgPSBpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkO1xuICAgICAgICAgICAgdGhpcy5hbHRlclNvdXJjZU9yVGFyZ2V0T2ZDb2xsYXBzZWRFZGdlKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRcbiAgICAgICAgICAgICAgICAgICAgLCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZCwgXCJ0YXJnZXRcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9PSBpbmZvLm9sZE93bmVyKSB7XG4gICAgICAgICAgICBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS50YXJnZXQgPSBpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkO1xuICAgICAgICAgICAgdGhpcy5hbHRlclNvdXJjZU9yVGFyZ2V0T2ZDb2xsYXBzZWRFZGdlKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRcbiAgICAgICAgICAgICAgICAgICAgLCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZCwgXCJzb3VyY2VcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vRGVsZXRlIHRoZSByZWxhdGVkIGNvbGxhcHNlZE1ldGFFZGdlc0luZm8ncyBhcyB0aGV5IGFyZSBoYW5kbGVkXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9baW5mby5jcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZF1baW5mby5vdGhlckVuZF07XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9baW5mby5vdGhlckVuZF1baW5mby5jcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZF07XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdO1xuICAgICAgfVxuICAgICAgdmFyIG9sZEVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZCk7XG4gICAgICAvL0lmIHRoZSBlZGdlIGlzIGFscmVhZHkgaW4gdGhlIGdyYXBoIHJlbW92ZSBpdCBhbmQgZGVjcmVhc2UgaXQncyBtZXRhIGxldmVsXG4gICAgICBpZiAob2xkRWRnZSAhPSBudWxsICYmIG9sZEVkZ2UubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZF0tLTtcbiAgICAgICAgb2xkRWRnZS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKmVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbi5yZXN0b3JlKCk7Ki9cblxuICAgIC8vQ2hlY2sgZm9yIG1ldGEgbGV2ZWxzIG9mIGVkZ2VzIGFuZCBoYW5kbGUgdGhlIGNoYW5nZXNcbiAgICB0aGlzLmVkZ2VzVG9SZXBhaXIgPSB0aGlzLmVkZ2VzVG9SZXBhaXIudW5pb24oZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuKTtcblxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xuICB9LFxuICAvKm5vZGUgaXMgYW4gb3V0ZXIgbm9kZSBvZiByb290XG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxuICAgYW5kIGl0IGlzIG5vdCB0aGUgcm9vdCBpdHNlbGYqL1xuICBpc091dGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xuICAgIHZhciB0ZW1wID0gbm9kZTtcbiAgICB3aGlsZSAodGVtcCAhPSBudWxsKSB7XG4gICAgICBpZiAodGVtcCA9PSByb290KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllczsiLCJ2YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzJyk7XHJcblxyXG47XHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSkge1xyXG5cclxuICAgIGlmICghY3l0b3NjYXBlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXHJcblxyXG4gICAgdmFyIGN5O1xyXG4gICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgIGxheW91dEJ5OiBudWxsLCAvLyBmb3IgcmVhcnJhbmdlIGFmdGVyIGV4cGFuZC9jb2xsYXBzZVxyXG4gICAgICBmaXNoZXllOiB0cnVlLFxyXG4gICAgICBhbmltYXRlOiB0cnVlLFxyXG4gICAgICByZWFkeTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIHNldE9wdGlvbnMoZnJvbSkge1xyXG4gICAgICB2YXIgdGVtcE9wdHMgPSB7fTtcclxuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXHJcbiAgICAgICAgdGVtcE9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuXHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBmcm9tKVxyXG4gICAgICAgIGlmICh0ZW1wT3B0cy5oYXNPd25Qcm9wZXJ0eShrZXkpKVxyXG4gICAgICAgICAgdGVtcE9wdHNba2V5XSA9IGZyb21ba2V5XTtcclxuICAgICAgcmV0dXJuIHRlbXBPcHRzO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0YXBwZWRCZWZvcmU7XHJcbiAgICB2YXIgdGFwcGVkVGltZW91dDtcclxuXHJcbiAgICAvLyBjeS5leHBhbmRDb2xsYXBzZSgpXHJcbiAgICBjeXRvc2NhcGUoXCJjb3JlXCIsIFwiZXhwYW5kQ29sbGFwc2VcIiwgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgY3kgPSB0aGlzO1xyXG4gICAgICBvcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIC8vIHRlc3QgZm9yIGV4cGFuZC1jb2xsYXBzZVxyXG4gICAgICBjeS5vbigndGFwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHRhcHBlZE5vdyA9IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgIGlmICh0YXBwZWRUaW1lb3V0ICYmIHRhcHBlZEJlZm9yZSkge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRhcHBlZFRpbWVvdXQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGFwcGVkQmVmb3JlID09PSB0YXBwZWROb3cpIHtcclxuICAgICAgICAgIHRhcHBlZE5vdy50cmlnZ2VyKCdkb3VibGVUYXAnKTtcclxuICAgICAgICAgIHRhcHBlZEJlZm9yZSA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRhcHBlZFRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGFwcGVkQmVmb3JlID0gbnVsbDtcclxuICAgICAgICAgIH0sIDMwMCk7XHJcbiAgICAgICAgICB0YXBwZWRCZWZvcmUgPSB0YXBwZWROb3c7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKFwiZG91YmxlVGFwXCIsICc6cGFyZW50LCBbZXhwYW5kZWQtY29sbGFwc2VkXScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgaWYgKGUuY3lUYXJnZXQuZGF0YShcImV4cGFuZGVkLWNvbGxhcHNlZFwiKSA9PSBcImNvbGxhcHNlZFwiKSB7XHJcbiAgICAgICAgICBlLmN5VGFyZ2V0LmV4cGFuZCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBlLmN5VGFyZ2V0LmNvbGxhcHNlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG9wdGlvbnMucmVhZHkoKTtcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2Uob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzZScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2VBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzZUFsbCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLmNvbGxhcHNlKHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnZXhwYW5kJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzLmV4cGFuZGFibGVOb2RlcygpO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG5cclxuICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmRBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdleHBhbmRBbGwnLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kQWxsTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIENvcmUgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gY3kuY29sbGFwc2VBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdjb2xsYXBzZUFsbCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5jb2xsYXBzaWJsZU5vZGVzKCkuY29sbGFwc2VBbGwodGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gY3kuZXhwYW5kQWxsKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZXhwYW5kQWxsJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBjeS5ub2RlcygpLmV4cGFuZGFibGVOb2RlcygpLmV4cGFuZEFsbCgpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gZWxlLmlzQ29sbGFwc2libGUoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2lzRXhwYW5kYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gKGVsZS5kYXRhKFwiZXhwYW5kZWQtY29sbGFwc2VkXCIpID09PSBcImNvbGxhcHNlZFwiKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZS5pc0V4cGFuZGFibGUoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2lzQ29sbGFwc2libGUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBlbGUgPSB0aGlzO1xyXG4gICAgICByZXR1cm4gIWVsZS5pc0V4cGFuZGFibGUoKSAmJiBlbGUuaXNQYXJlbnQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2VkKClcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzaWJsZU5vZGVzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuaXNDb2xsYXBzaWJsZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2V4cGFuZGFibGVOb2RlcycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIGVsZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmlzRXhwYW5kYWJsZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgLy8gZWxlcy5jb2xsYXBzZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb3JlJywgJ2NvbGxhcHNpYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmV4cGFuZGVkKClcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdleHBhbmRhYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5leHBhbmRhYmxlTm9kZXMoKTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWV4cGFuZC1jb2xsYXBzZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIl19
