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
;
(function () {
  'use strict';

  var expandCollapseUtilities = _dereq_('./expandCollapseUtilities');
  var undoRedoUtilities = _dereq_('./undoRedoUtilities');

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
      undoable: true // and if undoRedoExtension exists
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

      undoRedoUtilities(options.undoable);

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

},{"./expandCollapseUtilities":3,"./undoRedoUtilities":5}],5:[function(_dereq_,module,exports){
module.exports = function (undoable) {
  if (!undoable || cy.undoRedo == null)
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
        result.nodes = nodes[func]();
      } else {
        result.oldData = getNodePositionsAndSizes();
        result.nodes = nodes[func](secondTimeOpts);
        returnToPositionsAndSizes(args.oldData);
      }

      return result;
    };
  }

  var actions = ["collapse", "collapseAll", "expand", "expandAll"];

  for (var i = 0; i < actions.length; i++)
    ur.action(actions[i], doIt(actions[i]), doIt(actions[(i + 2) % 4]));

};
},{}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvZWxlbWVudFV0aWxpdGllcy5qcyIsInNyYy9leHBhbmRDb2xsYXBzZVV0aWxpdGllcy5qcyIsInNyYy9pbmRleC5qcyIsInNyYy91bmRvUmVkb1V0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0ge1xyXG4gIGVxdWFsQm91bmRpbmdCb3hlczogZnVuY3Rpb24oYmIxLCBiYjIpe1xyXG4gICAgICByZXR1cm4gYmIxLngxID09IGJiMi54MSAmJiBiYjEueDIgPT0gYmIyLngyICYmIGJiMS55MSA9PSBiYjIueTEgJiYgYmIxLnkyID09IGJiMi55MjtcclxuICB9LFxyXG4gIGdldFVuaW9uOiBmdW5jdGlvbihiYjEsIGJiMil7XHJcbiAgICAgIHZhciB1bmlvbiA9IHtcclxuICAgICAgeDE6IE1hdGgubWluKGJiMS54MSwgYmIyLngxKSxcclxuICAgICAgeDI6IE1hdGgubWF4KGJiMS54MiwgYmIyLngyKSxcclxuICAgICAgeTE6IE1hdGgubWluKGJiMS55MSwgYmIyLnkxKSxcclxuICAgICAgeTI6IE1hdGgubWF4KGJiMS55MiwgYmIyLnkyKSxcclxuICAgIH07XHJcblxyXG4gICAgdW5pb24udyA9IHVuaW9uLngyIC0gdW5pb24ueDE7XHJcbiAgICB1bmlvbi5oID0gdW5pb24ueTIgLSB1bmlvbi55MTtcclxuXHJcbiAgICByZXR1cm4gdW5pb247XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib3VuZGluZ0JveFV0aWxpdGllczsiLCJ2YXIgZWxlbWVudFV0aWxpdGllcyA9IHtcclxuICBtb3ZlTm9kZXM6IGZ1bmN0aW9uIChwb3NpdGlvbkRpZmYsIG5vZGVzLCBub3RDYWxjVG9wTW9zdE5vZGVzKSB7XHJcbiAgICB2YXIgdG9wTW9zdE5vZGVzID0gbm90Q2FsY1RvcE1vc3ROb2RlcyA/IG5vZGVzIDogdGhpcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3BNb3N0Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIG5vZGUgPSB0b3BNb3N0Tm9kZXNbaV07XHJcbiAgICAgIHZhciBvbGRYID0gbm9kZS5wb3NpdGlvbihcInhcIik7XHJcbiAgICAgIHZhciBvbGRZID0gbm9kZS5wb3NpdGlvbihcInlcIik7XHJcbiAgICAgIG5vZGUucG9zaXRpb24oe1xyXG4gICAgICAgIHg6IG9sZFggKyBwb3NpdGlvbkRpZmYueCxcclxuICAgICAgICB5OiBvbGRZICsgcG9zaXRpb25EaWZmLnlcclxuICAgICAgfSk7XHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgICAgdGhpcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBjaGlsZHJlbiwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZXRUb3BNb3N0Tm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICB2YXIgbm9kZXNNYXAgPSB7fTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcclxuICAgICAgd2hpbGUgKHBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKG5vZGVzTWFwW3BhcmVudC5pZCgpXSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcm9vdHM7XHJcbiAgfSxcclxuICByZWFycmFuZ2U6IGZ1bmN0aW9uIChsYXlvdXRCeSkgey8vKi8vXHJcbiAgICBpZiAodHlwZW9mIGxheW91dEJ5ID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgbGF5b3V0QnkoKTtcclxuICAgIH0gZWxzZSBpZiAobGF5b3V0QnkgIT0gbnVsbCkge1xyXG4gICAgICBjeS5sYXlvdXQobGF5b3V0QnkpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZWxlbWVudFV0aWxpdGllcztcclxuIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9ib3VuZGluZ0JveFV0aWxpdGllcycpO1xyXG52YXIgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpO1xyXG5cclxuLy8gRXhwYW5kIGNvbGxhcHNlIHV0aWxpdGllc1xyXG52YXIgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMgPSB7XHJcbiAgZWRnZXNUb1JlcGFpcjogbnVsbCxcclxuICAvL3RoZSBudW1iZXIgb2Ygbm9kZXMgbW92aW5nIGFuaW1hdGVkbHkgYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvblxyXG4gIGFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQ6IDAsXHJcbiAgLy9UaGlzIGlzIGEgbWFwIHdoaWNoIGtlZXBzIHRoZSBpbmZvcm1hdGlvbiBvZiBjb2xsYXBzZWQgbWV0YSBlZGdlcyB0byBoYW5kbGUgdGhlbSBjb3JyZWN0bHlcclxuICBjb2xsYXBzZWRNZXRhRWRnZXNJbmZvOiB7fSxcclxuICAvL1RoaXMgbWFwIGtlZXBzIHRyYWNrIG9mIHRoZSBtZXRhIGxldmVscyBvZiBlZGdlcyBieSB0aGVpciBpZCdzXHJcbiAgZWRnZXNNZXRhTGV2ZWxzOiB7fSxcclxuICAvL1RoaXMgbWV0aG9kIGNoYW5nZXMgc291cmNlIG9yIHRhcmdldCBpZCBvZiB0aGUgY29sbGFwc2VkIGVkZ2UgZGF0YSBrZXB0IGluIHRoZSBkYXRhIG9mIHRoZSBub2RlXHJcbiAgLy93aXRoIGlkIG9mIGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXHJcbiAgYWx0ZXJTb3VyY2VPclRhcmdldE9mQ29sbGFwc2VkRWRnZTogZnVuY3Rpb24gKGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkLCBlZGdlSWQsIHNvdXJjZU9yVGFyZ2V0KSB7Ly8qLy9cclxuICAgIHZhciBub2RlID0gY3kuZ2V0RWxlbWVudEJ5SWQoY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQpWzBdO1xyXG4gICAgdmFyIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgY29sbGFwc2VkRWRnZSA9IGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXTtcclxuICAgICAgaWYgKGNvbGxhcHNlZEVkZ2UuX3ByaXZhdGUuZGF0YS5pZCA9PSBlZGdlSWQpIHtcclxuICAgICAgICBjb2xsYXBzZWRFZGdlLl9wcml2YXRlLmRhdGFbc291cmNlT3JUYXJnZXRdID0gY29sbGFwc2VkRWRnZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZE5vZGVCZWZvcmVCZWNhbWluZ01ldGE7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIC8vQSBmdW50aW9uIGJhc2ljbHkgZXhwYW5kaW5nIGEgbm9kZSBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5XHJcbiAgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbjogZnVuY3Rpb24gKG5vZGUsIHRyaWdnZXJMYXlvdXQsIHNpbmdsZSwgbGF5b3V0QnkpIHsvLyovL1xyXG4gICAgLy9jaGVjayBob3cgdGhlIHBvc2l0aW9uIG9mIHRoZSBub2RlIGlzIGNoYW5nZWRcclxuICAgIHZhciBwb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgIHg6IG5vZGUucG9zaXRpb24oJ3gnKSAtIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykueCxcclxuICAgICAgeTogbm9kZS5wb3NpdGlvbigneScpIC0gbm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKS55XHJcbiAgICB9O1xyXG5cclxuICAgIG5vZGUucmVtb3ZlRGF0YShcImluZm9MYWJlbFwiKTtcclxuICAgIG5vZGUuZGF0YSgnZXhwYW5kZWQtY29sbGFwc2VkJywgJ2V4cGFuZGVkJyk7XHJcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4ubm9kZXMoKS5yZXN0b3JlKCk7XHJcbiAgICB0aGlzLnJlcGFpckVkZ2VzT2ZDb2xsYXBzZWRDaGlsZHJlbihub2RlKTtcclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IG51bGw7XHJcblxyXG4gICAgY3kubm9kZXMoKS51cGRhdGVDb21wb3VuZEJvdW5kcygpO1xyXG5cclxuICAgIC8vRG9uJ3Qgc2hvdyBjaGlsZHJlbiBpbmZvIHdoZW4gdGhlIGNvbXBsZXggbm9kZSBpcyBleHBhbmRlZFxyXG4gICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5zYmduY2xhc3MgPT0gXCJjb21wbGV4XCIpIHtcclxuICAgICAgbm9kZS5yZW1vdmVTdHlsZSgnY29udGVudCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGVsZW1lbnRVdGlsaXRpZXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgbm9kZS5jaGlsZHJlbigpKTtcclxuICAgIG5vZGUucmVtb3ZlRGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJyk7XHJcblxyXG4gICAgaWYgKHNpbmdsZSlcclxuICAgICAgdGhpcy5lbmRPcGVyYXRpb24oKTtcclxuICAgIC8vIHJlZnJlc2hQYWRkaW5ncygpO1xyXG4gICAgaWYgKHRyaWdnZXJMYXlvdXQpIHsgLy8qLyovKmFzZHNhZGRhXHJcbiAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcclxuXHJcbiAgICB9XHJcbiAgfSxcclxuICBzaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2Rlcykgey8vKi8vXHJcbiAgICBub2Rlcy5kYXRhKFwiY29sbGFwc2VcIiwgdHJ1ZSk7XHJcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XHJcbiAgICAgIHRoaXMuY29sbGFwc2VCb3R0b21VcChyb290KTtcclxuICAgIH1cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIHNpbXBsZUV4cGFuZEdpdmVuTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xyXG4gICAgbm9kZXMuZGF0YShcImV4cGFuZFwiLCB0cnVlKTtcclxuICAgIHZhciByb290cyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRUb3BEb3duKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIHNpbXBsZUV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIGlmIChub2RlcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG5vZGVzID0gY3kubm9kZXMoKTtcclxuICAgIH1cclxuICAgIHZhciBvcnBoYW5zO1xyXG4gICAgb3JwaGFucyA9IGVsZW1lbnRVdGlsaXRpZXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKTtcclxuICAgIHZhciBleHBhbmRTdGFjayA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcnBoYW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciByb290ID0gb3JwaGFuc1tpXTtcclxuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXhwYW5kU3RhY2s7XHJcbiAgfSxcclxuICBiZWdpbk9wZXJhdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5lZGdlc1RvUmVwYWlyID0gY3kuY29sbGVjdGlvbigpO1xyXG4gIH0sXHJcbiAgZW5kT3BlcmF0aW9uOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmVkZ2VzVG9SZXBhaXIucmVzdG9yZSgpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVkZ2VzVG9SZXBhaXIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVkZ2UgPSB0aGlzLmVkZ2VzVG9SZXBhaXJbaV07XHJcbiAgICAgIGlmICh0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID09IG51bGwgfHwgdGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZS5pZCgpXSA9PSAwKSB7XHJcbiAgICAgICAgZWRnZS5yZW1vdmVDbGFzcyhcIm1ldGFcIik7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcIm1ldGFcIik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IGN5LmNvbGxlY3Rpb24oKTtcclxuICB9LFxyXG4gIGV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xyXG4gICAgdGhpcy5iZWdpbk9wZXJhdGlvbigpO1xyXG4gICAgY3kudHJpZ2dlcihcImJlZm9yZUV4cGFuZFwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcclxuICAgIHZhciBleHBhbmRlZFN0YWNrID0gdGhpcy5zaW1wbGVFeHBhbmRBbGxOb2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcclxuICAgIGN5LnRyaWdnZXIoXCJhZnRlckV4cGFuZFwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcclxuXHJcbiAgICB0aGlzLmVuZE9wZXJhdGlvbigpO1xyXG5cclxuICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKG9wdGlvbnMubGF5b3V0QnkpO1xyXG5cclxuICAgIC8qXHJcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICovXHJcbiAgICByZXR1cm4gZXhwYW5kZWRTdGFjaztcclxuICB9LFxyXG4gIGV4cGFuZEFsbFRvcERvd246IGZ1bmN0aW9uIChyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHsvLyovL1xyXG4gICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XHJcbiAgICAgIGV4cGFuZFN0YWNrLnB1c2gocm9vdCk7XHJcbiAgICAgIHRoaXMuc2ltcGxlRXhwYW5kTm9kZShyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihub2RlLCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9FeHBhbmQgdGhlIGdpdmVuIG5vZGVzIHBlcmZvcm0gaW5jcmVtZW50YWwgbGF5b3V0IGFmdGVyIGV4cGFuZGF0aW9uXHJcbiAgZXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7Ly8qLy9cclxuICAgIHRoaXMuYmVnaW5PcGVyYXRpb24oKTtcclxuICAgIGN5LnRyaWdnZXIoXCJiZWZvcmVFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcbiAgICBpZiAobm9kZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIHRoaXMuZXhwYW5kTm9kZShub2Rlc1swXSwgb3B0aW9ucy5maXNoZXllLCBvcHRpb25zLmFuaW1hdGUsIG9wdGlvbnMubGF5b3V0QnkpO1xyXG4gICAgICBjeS50cmlnZ2VyKFwiYWZ0ZXJFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcblxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zaW1wbGVFeHBhbmRHaXZlbk5vZGVzKG5vZGVzLCBvcHRpb25zLmZpc2hleWUpO1xyXG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbigpO1xyXG4gICAgICBjeS50cmlnZ2VyKFwiYWZ0ZXJFeHBhbmRcIiwgW25vZGVzLCBvcHRpb25zXSk7XHJcblxyXG4gICAgICBlbGVtZW50VXRpbGl0aWVzLnJlYXJyYW5nZShvcHRpb25zLmxheW91dEJ5KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cclxuICAgICAqL1xyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZXMgdGhlbiBtYWtlIGluY3JlbWVudGFsIGxheW91dFxyXG4gIGNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBvcHRpb25zKSB7Ly8qLy9cclxuICAgIHRoaXMuYmVnaW5PcGVyYXRpb24oKTtcclxuICAgIGN5LnRyaWdnZXIoXCJiZWZvcmVDb2xsYXBzZVwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcclxuICAgIHRoaXMuc2ltcGxlQ29sbGFwc2VHaXZlbk5vZGVzKG5vZGVzLCBvcHRpb25zKTtcclxuICAgIGN5LnRyaWdnZXIoXCJiZWZvcmVDb2xsYXBzZVwiLCBbbm9kZXMsIG9wdGlvbnNdKTtcclxuXHJcbiAgICB0aGlzLmVuZE9wZXJhdGlvbigpO1xyXG4gICAgZWxlbWVudFV0aWxpdGllcy5yZWFycmFuZ2Uob3B0aW9ucy5sYXlvdXRCeSk7XHJcblxyXG4gICAgLypcclxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBub2RlcztcclxuICB9LFxyXG4gIC8vY29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XHJcbiAgY29sbGFwc2VCb3R0b21VcDogZnVuY3Rpb24gKHJvb3QpIHsvLyovL1xyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmNvbGxhcHNlQm90dG9tVXAobm9kZSk7XHJcbiAgICB9XHJcbiAgICAvL0lmIHRoZSByb290IGlzIGEgY29tcG91bmQgbm9kZSB0byBiZSBjb2xsYXBzZWQgdGhlbiBjb2xsYXBzZSBpdFxyXG4gICAgaWYgKHJvb3QuZGF0YShcImNvbGxhcHNlXCIpICYmIHJvb3QuY2hpbGRyZW4oKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHRoaXMuc2ltcGxlQ29sbGFwc2VOb2RlKHJvb3QpO1xyXG4gICAgICByb290LnJlbW92ZURhdGEoXCJjb2xsYXBzZVwiKTtcclxuICAgIH1cclxuICB9LFxyXG4gIC8vZXhwYW5kIHRoZSBub2RlcyBpbiB0b3AgZG93biBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XHJcbiAgZXhwYW5kVG9wRG93bjogZnVuY3Rpb24gKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKSB7Ly8qLy9cclxuICAgIGlmIChyb290LmRhdGEoXCJleHBhbmRcIikgJiYgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5zaW1wbGVFeHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcclxuICAgICAgcm9vdC5yZW1vdmVEYXRhKFwiZXhwYW5kXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24obm9kZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBleHBhbmROb2RlOiBmdW5jdGlvbiAobm9kZSwgZmlzaGV5ZSwgYW5pbWF0ZSwgbGF5b3V0QnkpIHtcclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZE5vZGUobm9kZSwgZmlzaGV5ZSwgdHJ1ZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG5cclxuICAgICAgLypcclxuICAgICAgICogcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxyXG4gICAgICAgKi9cclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcbiAgfSxcclxuICBjb252ZXJ0VG9Nb2RlbFBvc2l0aW9uOiBmdW5jdGlvbiAocmVuZGVyZWRQb3NpdGlvbikge1xyXG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcclxuICAgIHZhciB5ID0gKHJlbmRlcmVkUG9zaXRpb24ueSAtIHBhbi55KSAvIHpvb207XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogeCxcclxuICAgICAgeTogeVxyXG4gICAgfTtcclxuICB9LFxyXG4gIC8qXHJcbiAgICpcclxuICAgKiBUaGlzIG1ldGhvZCBleHBhbmRzIHRoZSBnaXZlbiBub2RlXHJcbiAgICogd2l0aG91dCBtYWtpbmcgaW5jcmVtZW50YWwgbGF5b3V0XHJcbiAgICogYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvbiBpdCB3aWxsIGJlIHNpbXBseVxyXG4gICAqIHVzZWQgdG8gdW5kbyB0aGUgY29sbGFwc2Ugb3BlcmF0aW9uXHJcbiAgICovXHJcbiAgc2ltcGxlRXhwYW5kTm9kZTogZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7Ly8qLy9cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB2YXIgY29tbW9uRXhwYW5kT3BlcmF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7XHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xyXG5cclxuICAgICAgICBub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncpO1xyXG4gICAgICAgIG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJywgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmgpO1xyXG5cclxuICAgICAgICBzZWxmLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgbm9kZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIXNpbmdsZU5vdFNpbXBsZSB8fCAhYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUgfHwgIWFuaW1hdGUpIHtcclxuICAgICAgICBzZWxmLmV4cGFuZE5vZGVCYXNlRnVuY3Rpb24obm9kZSwgc2luZ2xlTm90U2ltcGxlLCBzaW5nbGVOb3RTaW1wbGUsIGxheW91dEJ5KTsgLy8qKioqKlxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZSk7XHJcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSAmJiBzaW5nbGVOb3RTaW1wbGUpIHtcclxuICAgICAgICB2YXIgdG9wTGVmdFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9Nb2RlbFBvc2l0aW9uKHt4OiAwLCB5OiAwfSk7XHJcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XHJcbiAgICAgICAgdmFyIHBhZGRpbmcgPSA4MDtcclxuICAgICAgICB2YXIgYmIgPSB7XHJcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXHJcbiAgICAgICAgICB4MjogYm90dG9tUmlnaHRQb3NpdGlvbi54LFxyXG4gICAgICAgICAgeTE6IHRvcExlZnRQb3NpdGlvbi55LFxyXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBub2RlQkIgPSB7XHJcbiAgICAgICAgICB4MTogbm9kZS5wb3NpdGlvbigneCcpIC0gbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLncgLyAyIC0gcGFkZGluZyxcclxuICAgICAgICAgIHgyOiBub2RlLnBvc2l0aW9uKCd4JykgKyBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJykudyAvIDIgKyBwYWRkaW5nLFxyXG4gICAgICAgICAgeTE6IG5vZGUucG9zaXRpb24oJ3knKSAtIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnKS5oIC8gMiAtIHBhZGRpbmcsXHJcbiAgICAgICAgICB5Mjogbm9kZS5wb3NpdGlvbigneScpICsgbm9kZS5kYXRhKCdzaXplLWJlZm9yZS1jb2xsYXBzZScpLmggLyAyICsgcGFkZGluZ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciB1bmlvbkJCID0gYm91bmRpbmdCb3hVdGlsaXRpZXMuZ2V0VW5pb24obm9kZUJCLCBiYik7XHJcbiAgICAgICAgdmFyIGFuaW1hdGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoIWJvdW5kaW5nQm94VXRpbGl0aWVzLmVxdWFsQm91bmRpbmdCb3hlcyh1bmlvbkJCLCBiYikpIHtcclxuICAgICAgICAgIHZhciB2aWV3UG9ydCA9IGN5LmdldEZpdFZpZXdwb3J0KHVuaW9uQkIsIDEwKTtcclxuICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgIGFuaW1hdGluZyA9IGFuaW1hdGU7XHJcbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICBjeS5hbmltYXRlKHtcclxuICAgICAgICAgICAgICBwYW46IHZpZXdQb3J0LnBhbixcclxuICAgICAgICAgICAgICB6b29tOiB2aWV3UG9ydC56b29tLFxyXG4gICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgYW5pbWF0ZSwgbGF5b3V0QnkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiAxMDAwXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN5Lnpvb20odmlld1BvcnQuem9vbSk7XHJcbiAgICAgICAgICAgIGN5LnBhbih2aWV3UG9ydC5wYW4pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWFuaW1hdGluZykge1xyXG4gICAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgY29tbW9uRXhwYW5kT3BlcmF0aW9uKG5vZGUsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZSB3aXRob3V0IG1ha2luZyBpbmNyZW1lbnRhbCBsYXlvdXRcclxuICBzaW1wbGVDb2xsYXBzZU5vZGU6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICBub2RlLmRhdGEoJ3Bvc2l0aW9uLWJlZm9yZS1jb2xsYXBzZScsIHtcclxuICAgICAgICB4OiBub2RlLnBvc2l0aW9uKCkueCxcclxuICAgICAgICB5OiBub2RlLnBvc2l0aW9uKCkueVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5vZGUuZGF0YSgnc2l6ZS1iZWZvcmUtY29sbGFwc2UnLCB7XHJcbiAgICAgICAgdzogbm9kZS5vdXRlcldpZHRoKCksXHJcbiAgICAgICAgaDogbm9kZS5vdXRlckhlaWdodCgpXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbm9kZS5jaGlsZHJlbigpLnVuc2VsZWN0KCk7XHJcbiAgICAgIG5vZGUuY2hpbGRyZW4oKS5jb25uZWN0ZWRFZGdlcygpLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICBub2RlLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcsICdjb2xsYXBzZWQnKTtcclxuXHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuXHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4obm9kZSwgY2hpbGQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKG5vZGUsIG5vZGUpO1xyXG4gICAgICAvLyByZWZyZXNoUGFkZGluZ3MoKTtcclxuXHJcbiAgICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGEuc2JnbmNsYXNzID09IFwiY29tcGxleFwiKSB7XHJcbiAgICAgICAgbm9kZS5hZGRDbGFzcygnY2hhbmdlQ29udGVudCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBub2RlLnBvc2l0aW9uKG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJykpO1xyXG5cclxuICAgICAgLy9yZXR1cm4gdGhlIG5vZGUgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXHJcbiAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgc3RvcmVXaWR0aEhlaWdodDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgaWYgKG5vZGUgIT0gbnVsbCkge1xyXG4gICAgICBub2RlLmRhdGEoJ3gtYmVmb3JlLWZpc2hleWUnLCB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpKTtcclxuICAgICAgbm9kZS5kYXRhKCd5LWJlZm9yZS1maXNoZXllJywgdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKSk7XHJcbiAgICAgIG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnLCBub2RlLm91dGVyV2lkdGgoKSk7XHJcbiAgICAgIG5vZGUuZGF0YSgnaGVpZ2h0LWJlZm9yZS1maXNoZXllJywgbm9kZS5vdXRlckhlaWdodCgpKTtcclxuXHJcbiAgICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcclxuICAgICAgICB0aGlzLnN0b3JlV2lkdGhIZWlnaHQobm9kZS5wYXJlbnQoKVswXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfSxcclxuICBmaXNoRXllVmlld0V4cGFuZEdpdmVuTm9kZTogZnVuY3Rpb24gKG5vZGUsIHNpbmdsZU5vdFNpbXBsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSkgey8vKi8vXHJcbiAgICB2YXIgc2libGluZ3MgPSB0aGlzLmdldFNpYmxpbmdzKG5vZGUpO1xyXG5cclxuICAgIHZhciB4X2EgPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xyXG4gICAgdmFyIHlfYSA9IHRoaXMueVBvc2l0aW9uSW5QYXJlbnQobm9kZSk7XHJcblxyXG4gICAgdmFyIGRfeF9sZWZ0ID0gTWF0aC5hYnMoKG5vZGUuZGF0YSgnd2lkdGgtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xyXG4gICAgdmFyIGRfeF9yaWdodCA9IE1hdGguYWJzKChub2RlLmRhdGEoJ3dpZHRoLWJlZm9yZS1maXNoZXllJykgLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcclxuICAgIHZhciBkX3lfdXBwZXIgPSBNYXRoLmFicygobm9kZS5kYXRhKCdoZWlnaHQtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcclxuICAgIHZhciBkX3lfbG93ZXIgPSBNYXRoLmFicygobm9kZS5kYXRhKCdoZWlnaHQtYmVmb3JlLWZpc2hleWUnKSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcclxuXHJcbiAgICB2YXIgYWJzX2RpZmZfb25feCA9IE1hdGguYWJzKG5vZGUuZGF0YSgneC1iZWZvcmUtZmlzaGV5ZScpIC0geF9hKTtcclxuICAgIHZhciBhYnNfZGlmZl9vbl95ID0gTWF0aC5hYnMobm9kZS5kYXRhKCd5LWJlZm9yZS1maXNoZXllJykgLSB5X2EpO1xyXG5cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIExFRlRcclxuICAgIGlmIChub2RlLmRhdGEoJ3gtYmVmb3JlLWZpc2hleWUnKSA+IHhfYSkge1xyXG4gICAgICBkX3hfbGVmdCA9IGRfeF9sZWZ0ICsgYWJzX2RpZmZfb25feDtcclxuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0IC0gYWJzX2RpZmZfb25feDtcclxuICAgIH1cclxuICAgIC8vIENlbnRlciB3ZW50IHRvIFJJR0hUXHJcbiAgICBlbHNlIHtcclxuICAgICAgZF94X2xlZnQgPSBkX3hfbGVmdCAtIGFic19kaWZmX29uX3g7XHJcbiAgICAgIGRfeF9yaWdodCA9IGRfeF9yaWdodCArIGFic19kaWZmX29uX3g7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gVVBcclxuICAgIGlmIChub2RlLmRhdGEoJ3ktYmVmb3JlLWZpc2hleWUnKSA+IHlfYSkge1xyXG4gICAgICBkX3lfdXBwZXIgPSBkX3lfdXBwZXIgKyBhYnNfZGlmZl9vbl95O1xyXG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgLSBhYnNfZGlmZl9vbl95O1xyXG4gICAgfVxyXG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gRE9XTlxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciAtIGFic19kaWZmX29uX3k7XHJcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciArIGFic19kaWZmX29uX3k7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHhQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcclxuICAgIHZhciB5UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWJsaW5ncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB4UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy54UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xyXG4gICAgICB5UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy55UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHNpYmxpbmcgPSBzaWJsaW5nc1tpXTtcclxuXHJcbiAgICAgIHZhciB4X2IgPSB4UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xyXG4gICAgICB2YXIgeV9iID0geVBvc0luUGFyZW50U2libGluZ1tpXTtcclxuXHJcbiAgICAgIHZhciBzbG9wZSA9ICh5X2IgLSB5X2EpIC8gKHhfYiAtIHhfYSk7XHJcblxyXG4gICAgICB2YXIgZF94ID0gMDtcclxuICAgICAgdmFyIGRfeSA9IDA7XHJcbiAgICAgIHZhciBUX3ggPSAwO1xyXG4gICAgICB2YXIgVF95ID0gMDtcclxuXHJcbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTEVGVFxyXG4gICAgICBpZiAoeF9hID4geF9iKSB7XHJcbiAgICAgICAgZF94ID0gZF94X2xlZnQ7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBSSUdIVFxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBkX3ggPSBkX3hfcmlnaHQ7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBVUFBFUiBzaWRlXHJcbiAgICAgIGlmICh5X2EgPiB5X2IpIHtcclxuICAgICAgICBkX3kgPSBkX3lfdXBwZXI7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBMT1dFUiBzaWRlXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGRfeSA9IGRfeV9sb3dlcjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGlzRmluaXRlKHNsb3BlKSkge1xyXG4gICAgICAgIFRfeCA9IE1hdGgubWluKGRfeCwgKGRfeSAvIE1hdGguYWJzKHNsb3BlKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2xvcGUgIT09IDApIHtcclxuICAgICAgICBUX3kgPSBNYXRoLm1pbihkX3ksIChkX3ggKiBNYXRoLmFicyhzbG9wZSkpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHhfYSA+IHhfYikge1xyXG4gICAgICAgIFRfeCA9IC0xICogVF94O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoeV9hID4geV9iKSB7XHJcbiAgICAgICAgVF95ID0gLTEgKiBUX3k7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZmlzaEV5ZVZpZXdNb3ZlTm9kZShzaWJsaW5nLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KClbMF0gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUucGFyZW50KClbMF0sIHNpbmdsZU5vdFNpbXBsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfSxcclxuICBnZXRTaWJsaW5nczogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgdmFyIHNpYmxpbmdzO1xyXG5cclxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdID09IG51bGwpIHtcclxuICAgICAgc2libGluZ3MgPSBjeS5jb2xsZWN0aW9uKCk7XHJcbiAgICAgIHZhciBvcnBoYW5zID0gY3kubm9kZXMoKS5vcnBoYW5zKCk7XHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ycGhhbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAob3JwaGFuc1tpXSAhPSBub2RlKSB7XHJcbiAgICAgICAgICBzaWJsaW5ncyA9IHNpYmxpbmdzLmFkZChvcnBoYW5zW2ldKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNpYmxpbmdzID0gbm9kZS5zaWJsaW5ncygpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzaWJsaW5ncztcclxuICB9LFxyXG4gIC8qXHJcbiAgICogTW92ZSBub2RlIG9wZXJhdGlvbiBzcGVjaWFsaXplZCBmb3IgZmlzaCBleWUgdmlldyBleHBhbmQgb3BlcmF0aW9uXHJcbiAgICogTW92ZXMgdGhlIG5vZGUgYnkgbW92aW5nIGl0cyBkZXNjYW5kZW50cy4gTW92ZW1lbnQgaXMgYW5pbWF0ZWQgaWYgc2luZ2xlTm90U2ltcGxlIGZsYWcgaXMgdHJ1dGh5LlxyXG4gICAqL1xyXG4gIGZpc2hFeWVWaWV3TW92ZU5vZGU6IGZ1bmN0aW9uIChub2RlLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KSB7Ly8qLy9cclxuICAgIHZhciBjaGlsZHJlbkxpc3QgPSBub2RlLmNoaWxkcmVuKCk7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgaWYgKGNoaWxkcmVuTGlzdC5sZW5ndGggPT0gMCkge1xyXG4gICAgICB2YXIgbmV3UG9zaXRpb24gPSB7eDogbm9kZS5wb3NpdGlvbigneCcpICsgVF94LCB5OiBub2RlLnBvc2l0aW9uKCd5JykgKyBUX3l9O1xyXG4gICAgICBpZiAoIXNpbmdsZU5vdFNpbXBsZSB8fCAhYW5pbWF0ZSkge1xyXG4gICAgICAgIG5vZGUucG9zaXRpb24obmV3UG9zaXRpb24pO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCsrO1xyXG4gICAgICAgIG5vZGUuYW5pbWF0ZSh7XHJcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXHJcbiAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQtLTtcclxuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgbm9kZVRvRXhwYW5kLmRhdGEoJ2V4cGFuZGVkLWNvbGxhcHNlZCcpID09PSAnZXhwYW5kZWQnKSB7XHJcblxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGVUb0V4cGFuZCwgc2luZ2xlTm90U2ltcGxlLCB0cnVlLCBsYXlvdXRCeSk7XHJcblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgIGR1cmF0aW9uOiAxMDAwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB0aGlzLmZpc2hFeWVWaWV3TW92ZU5vZGUoY2hpbGRyZW5MaXN0W2ldLCBUX3gsIFRfeSwgbm9kZVRvRXhwYW5kLCBzaW5nbGVOb3RTaW1wbGUsIGFuaW1hdGUsIGxheW91dEJ5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgeFBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cclxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCgpWzBdO1xyXG4gICAgdmFyIHhfYSA9IDAuMDtcclxuXHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICB4X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3gnKSArIChwYXJlbnQud2lkdGgoKSAvIDIpO1xyXG4gICAgfVxyXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeF9hID0gbm9kZS5wb3NpdGlvbigneCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB4X2E7XHJcbiAgfSxcclxuICB5UG9zaXRpb25JblBhcmVudDogZnVuY3Rpb24gKG5vZGUpIHsvLyovL1xyXG4gICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50KClbMF07XHJcblxyXG4gICAgdmFyIHlfYSA9IDAuMDtcclxuXHJcbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcclxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICB5X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3knKSArIChwYXJlbnQuaGVpZ2h0KCkgLyAyKTtcclxuICAgIH1cclxuICAgIC8vIEdpdmVuIG5vZGUgaXMgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHlfYSA9IG5vZGUucG9zaXRpb24oJ3knKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geV9hO1xyXG4gIH0sXHJcbiAgLypcclxuICAgKiBmb3IgYWxsIGNoaWxkcmVuIG9mIHRoZSBub2RlIHBhcmFtZXRlciBjYWxsIHRoaXMgbWV0aG9kXHJcbiAgICogd2l0aCB0aGUgc2FtZSByb290IHBhcmFtZXRlcixcclxuICAgKiByZW1vdmUgdGhlIGNoaWxkIGFuZCBhZGQgdGhlIHJlbW92ZWQgY2hpbGQgdG8gdGhlIGNvbGxhcHNlZGNoaWxkcmVuIGRhdGFcclxuICAgKiBvZiB0aGUgcm9vdCB0byByZXN0b3JlIHRoZW0gaW4gdGhlIGNhc2Ugb2YgZXhwYW5kYXRpb25cclxuICAgKiByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4ga2VlcHMgdGhlIG5vZGVzIHRvIHJlc3RvcmUgd2hlbiB0aGVcclxuICAgKiByb290IGlzIGV4cGFuZGVkXHJcbiAgICovXHJcbiAgcmVtb3ZlQ2hpbGRyZW46IGZ1bmN0aW9uIChub2RlLCByb290KSB7Ly8qLy9cclxuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICAgIHRoaXMucmVtb3ZlQ2hpbGRyZW4oY2hpbGQsIHJvb3QpO1xyXG4gICAgICB2YXIgcmVtb3ZlZENoaWxkID0gY2hpbGQucmVtb3ZlKCk7XHJcbiAgICAgIGlmIChyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJlbW92ZWRDaGlsZDtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSByb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4udW5pb24ocmVtb3ZlZENoaWxkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLypcclxuICAgKiBUaGlzIG1ldGhvZCBsZXQgdGhlIHJvb3QgcGFyYW1ldGVyIHRvIGJhcnJvdyB0aGUgZWRnZXMgY29ubmVjdGVkIHRvIHRoZVxyXG4gICAqIGNoaWxkIG5vZGUgb3IgYW55IG5vZGUgaW5zaWRlIGNoaWxkIG5vZGUgaWYgdGhlIGFueSBvbmUgdGhlIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICogaXMgYW4gb3V0ZXIgbm9kZSBvZiB0aGUgcm9vdCBub2RlIGluIG90aGVyIHdvcmQgaXQgY3JlYXRlIG1ldGEgZWRnZXNcclxuICAgKi9cclxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uIChyb290LCBjaGlsZE5vZGUpIHsvLyovL1xyXG4gICAgdmFyIGNoaWxkcmVuID0gY2hpbGROb2RlLmNoaWxkcmVuKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICB0aGlzLmJhcnJvd0VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbihyb290LCBjaGlsZCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGVkZ2VzID0gY2hpbGROb2RlLmNvbm5lY3RlZEVkZ2VzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLmRhdGEoXCJzb3VyY2VcIik7XHJcbiAgICAgIHZhciB0YXJnZXQgPSBlZGdlLmRhdGEoXCJ0YXJnZXRcIik7XHJcbiAgICAgIHZhciBzb3VyY2VOb2RlID0gZWRnZS5zb3VyY2UoKTtcclxuICAgICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgICB2YXIgbmV3RWRnZSA9IGpRdWVyeS5leHRlbmQodHJ1ZSwge30sIGVkZ2UuanNvbnMoKVswXSk7XHJcblxyXG4gICAgICAvL0luaXRpbGl6ZSB0aGUgbWV0YSBsZXZlbCBvZiB0aGlzIGVkZ2UgaWYgaXQgaXMgbm90IGluaXRpbGl6ZWQgeWV0XHJcbiAgICAgIGlmICh0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID09IG51bGwpIHtcclxuICAgICAgICB0aGlzLmVkZ2VzTWV0YUxldmVsc1tlZGdlLmlkKCldID0gMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLypJZiB0aGUgZWRnZSBpcyBtZXRhIGFuZCBoYXMgZGlmZmVyZW50IHNvdXJjZSBhbmQgdGFyZ2V0cyB0aGVuIGhhbmRsZSB0aGlzIGNhc2UgYmVjYXVzZSBpZlxyXG4gICAgICAgKiB0aGUgb3RoZXIgZW5kIG9mIHRoaXMgZWRnZSBpcyByZW1vdmVkIGJlY2F1c2Ugb2YgdGhlIHJlYXNvbiB0aGF0IGl0J3MgcGFyZW50IGlzXHJcbiAgICAgICAqIGJlaW5nIGNvbGxhcHNlZCBhbmQgdGhpcyBub2RlIGlzIGV4cGFuZGVkIGJlZm9yZSBvdGhlciBlbmQgaXMgc3RpbGwgY29sbGFwc2VkIHRoaXMgY2F1c2VzXHJcbiAgICAgICAqIHRoYXQgdGhpcyBlZGdlIGNhbm5vdCBiZSByZXN0b3JlZCBhcyBvbmUgZW5kIG5vZGUgb2YgaXQgZG9lcyBub3QgZXhpc3RzLlxyXG4gICAgICAgKiBDcmVhdGUgYSBjb2xsYXBzZWQgbWV0YSBlZGdlIGluZm8gZm9yIHRoaXMgZWRnZSBhbmQgYWRkIHRoaXMgaW5mbyB0byBjb2xsYXBzZWRNZXRhRWRnZXNJbmZvXHJcbiAgICAgICAqIG1hcC4gVGhpcyBpbmZvIGluY2x1ZGVzIGNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkKHRoZSBub2RlIHdoaWNoIGlzIGJlaW5nIGNvbGxhcHNlZCksXHJcbiAgICAgICAqIG90aGVyRW5kKHRoZSBvdGhlciBlbmQgb2YgdGhpcyBlZGdlKSBhbmQgb2xkT3duZXIodGhlIG93bmVyIG9mIHRoaXMgZWRnZSB3aGljaCB3aWxsIGJlY29tZVxyXG4gICAgICAgKiBhbiBvbGQgb3duZXIgYWZ0ZXIgY29sbGFwc2Ugb3BlcmF0aW9uKVxyXG4gICAgICAgKi9cclxuICAgICAgaWYgKHRoaXMuZWRnZXNNZXRhTGV2ZWxzW2VkZ2UuaWQoKV0gIT0gMCAmJiBzb3VyY2UgIT0gdGFyZ2V0KSB7XHJcbiAgICAgICAgdmFyIG90aGVyRW5kID0gbnVsbDtcclxuICAgICAgICB2YXIgb2xkT3duZXIgPSBudWxsO1xyXG4gICAgICAgIGlmIChzb3VyY2UgPT0gY2hpbGROb2RlLmlkKCkpIHtcclxuICAgICAgICAgIG90aGVyRW5kID0gdGFyZ2V0O1xyXG4gICAgICAgICAgb2xkT3duZXIgPSBzb3VyY2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHRhcmdldCA9PSBjaGlsZE5vZGUuaWQoKSkge1xyXG4gICAgICAgICAgb3RoZXJFbmQgPSBzb3VyY2U7XHJcbiAgICAgICAgICBvbGRPd25lciA9IHRhcmdldDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGluZm8gPSB7XHJcbiAgICAgICAgICBjcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZDogcm9vdC5pZCgpLFxyXG4gICAgICAgICAgb3RoZXJFbmQ6IG90aGVyRW5kLFxyXG4gICAgICAgICAgb2xkT3duZXI6IG9sZE93bmVyXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAodGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bb3RoZXJFbmRdID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bcm9vdC5pZCgpXSA9IHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL3RoZSBpbmZvcm1hdGlvbiBzaG91bGQgYmUgcmVhY2hhYmxlIGJ5IGVkZ2UgaWQgYW5kIG5vZGUgaWQnc1xyXG4gICAgICAgIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tyb290LmlkKCldW290aGVyRW5kXSA9IGluZm87XHJcbiAgICAgICAgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW290aGVyRW5kXVtyb290LmlkKCldID0gaW5mbztcclxuICAgICAgICB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZS5pZCgpXSA9IGluZm87XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciByZW1vdmVkRWRnZSA9IGVkZ2UucmVtb3ZlKCk7XHJcbiAgICAgIC8vc3RvcmUgdGhlIGRhdGEgb2YgdGhlIG9yaWdpbmFsIGVkZ2VcclxuICAgICAgLy90byByZXN0b3JlIHdoZW4gdGhlIG5vZGUgaXMgZXhwYW5kZWRcclxuICAgICAgaWYgKHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPT0gbnVsbCkge1xyXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSByZW1vdmVkRWRnZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICByb290Ll9wcml2YXRlLmRhdGEuZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID1cclxuICAgICAgICAgICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4udW5pb24ocmVtb3ZlZEVkZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL0RvIG5vdCBoYW5kbGUgdGhlIGlubmVyIGVkZ2VzXHJcbiAgICAgIGlmICghdGhpcy5pc091dGVyTm9kZShzb3VyY2VOb2RlLCByb290KSAmJiAhdGhpcy5pc091dGVyTm9kZSh0YXJnZXROb2RlLCByb290KSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL0lmIHRoZSBjaGFuZ2Ugc291cmNlIGFuZC9vciB0YXJnZXQgb2YgdGhlIGVkZ2UgaW4gdGhlXHJcbiAgICAgIC8vY2FzZSBvZiB0aGV5IGFyZSBlcXVhbCB0byB0aGUgaWQgb2YgdGhlIGNvbGxhcHNlZCBjaGlsZFxyXG4gICAgICBpZiAoc291cmNlID09IGNoaWxkTm9kZS5pZCgpKSB7XHJcbiAgICAgICAgc291cmNlID0gcm9vdC5pZCgpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0YXJnZXQgPT0gY2hpbGROb2RlLmlkKCkpIHtcclxuICAgICAgICB0YXJnZXQgPSByb290LmlkKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vcHJlcGFyZSB0aGUgbmV3IGVkZ2UgYnkgY2hhbmdpbmcgdGhlIG9sZGVyIHNvdXJjZSBhbmQvb3IgdGFyZ2V0XHJcbiAgICAgIG5ld0VkZ2UuZGF0YS5wb3J0c291cmNlID0gc291cmNlO1xyXG4gICAgICBuZXdFZGdlLmRhdGEucG9ydHRhcmdldCA9IHRhcmdldDtcclxuICAgICAgbmV3RWRnZS5kYXRhLnNvdXJjZSA9IHNvdXJjZTtcclxuICAgICAgbmV3RWRnZS5kYXRhLnRhcmdldCA9IHRhcmdldDtcclxuICAgICAgLy9yZW1vdmUgdGhlIG9sZGVyIGVkZ2UgYW5kIGFkZCB0aGUgbmV3IG9uZVxyXG4gICAgICBjeS5hZGQobmV3RWRnZSk7XHJcbiAgICAgIHZhciBuZXdDeUVkZ2UgPSBjeS5lZGdlcygpW2N5LmVkZ2VzKCkubGVuZ3RoIC0gMV07XHJcbiAgICAgIC8vSWYgdGhpcyBlZGdlIGhhcyBub3QgbWV0YSBjbGFzcyBwcm9wZXJ0aWVzIG1ha2UgaXQgbWV0YVxyXG4gICAgICBpZiAodGhpcy5lZGdlc01ldGFMZXZlbHNbbmV3Q3lFZGdlLmlkKCldID09IDApIHtcclxuICAgICAgICBuZXdDeUVkZ2UuYWRkQ2xhc3MoXCJtZXRhXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vSW5jcmVhc2UgdGhlIG1ldGEgbGV2ZWwgb2YgdGhpcyBlZGdlIGJ5IDFcclxuICAgICAgdGhpcy5lZGdlc01ldGFMZXZlbHNbbmV3Q3lFZGdlLmlkKCldKys7XHJcbiAgICAgIG5ld0N5RWRnZS5kYXRhKFwiY29sbGFwc2VkTm9kZUJlZm9yZUJlY2FtaW5nTWV0YVwiLCBjaGlsZE5vZGUuaWQoKSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICAvKlxyXG4gICAqIFRoaXMgbWV0aG9kIHJlcGFpcnMgdGhlIGVkZ2VzIG9mIHRoZSBjb2xsYXBzZWQgY2hpbGRyZW4gb2YgdGhlIGdpdmVuIG5vZGVcclxuICAgKiB3aGVuIHRoZSBub2RlIGlzIGJlaW5nIGV4cGFuZGVkLCB0aGUgbWV0YSBlZGdlcyBjcmVhdGVkIHdoaWxlIHRoZSBub2RlIGlzXHJcbiAgICogYmVpbmcgY29sbGFwc2VkIGFyZSBoYW5kbGVkIGluIHRoaXMgbWV0aG9kXHJcbiAgICovXHJcbiAgcmVwYWlyRWRnZXNPZkNvbGxhcHNlZENoaWxkcmVuOiBmdW5jdGlvbiAobm9kZSkgeyAvLyovL1xyXG4gICAgdmFyIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbiA9IG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW47XHJcbiAgICBpZiAoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbGxhcHNlZE1ldGFFZGdlSW5mb09mTm9kZSA9IHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tub2RlLmlkKCldO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgLy9IYW5kbGUgY29sbGFwc2VkIG1ldGEgZWRnZSBpbmZvIGlmIGl0IGlzIHJlcXVpcmVkXHJcbiAgICAgIGlmIChjb2xsYXBzZWRNZXRhRWRnZUluZm9PZk5vZGUgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZF0gIT0gbnVsbCkge1xyXG4gICAgICAgIHZhciBpbmZvID0gdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2VkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkXTtcclxuICAgICAgICAvL0lmIHRoZSBtZXRhIGVkZ2UgaXMgbm90IGNyZWF0ZWQgYmVjYXVzZSBvZiB0aGUgcmVhc29uIHRoYXQgdGhpcyBub2RlIGlzIGNvbGxhcHNlZFxyXG4gICAgICAgIC8vaGFuZGxlIGl0IGJ5IGNoYW5naW5nIHNvdXJjZSBvciB0YXJnZXQgb2YgcmVsYXRlZCBlZGdlIGRhdGFzXHJcbiAgICAgICAgaWYgKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQgIT0gbm9kZS5pZCgpKSB7XHJcbiAgICAgICAgICBpZiAoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuc291cmNlID09IGluZm8ub2xkT3duZXIpIHtcclxuICAgICAgICAgICAgZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuc291cmNlID0gaW5mby5jcmVhdGVkV2hpbGVCZWluZ0NvbGxhcHNlZDtcclxuICAgICAgICAgICAgdGhpcy5hbHRlclNvdXJjZU9yVGFyZ2V0T2ZDb2xsYXBzZWRFZGdlKGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRcclxuICAgICAgICAgICAgICAgICAgICAsIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLmlkLCBcInRhcmdldFwiKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9PSBpbmZvLm9sZE93bmVyKSB7XHJcbiAgICAgICAgICAgIGVkZ2VzT2Zjb2xsYXBzZWRDaGlsZHJlbltpXS5fcHJpdmF0ZS5kYXRhLnRhcmdldCA9IGluZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWx0ZXJTb3VyY2VPclRhcmdldE9mQ29sbGFwc2VkRWRnZShpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXHJcbiAgICAgICAgICAgICAgICAgICAgLCBlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW5baV0uX3ByaXZhdGUuZGF0YS5pZCwgXCJzb3VyY2VcIik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vRGVsZXRlIHRoZSByZWxhdGVkIGNvbGxhcHNlZE1ldGFFZGdlc0luZm8ncyBhcyB0aGV5IGFyZSBoYW5kbGVkXHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY29sbGFwc2VkTWV0YUVkZ2VzSW5mb1tpbmZvLmNyZWF0ZWRXaGlsZUJlaW5nQ29sbGFwc2VkXVtpbmZvLm90aGVyRW5kXTtcclxuICAgICAgICBkZWxldGUgdGhpcy5jb2xsYXBzZWRNZXRhRWRnZXNJbmZvW2luZm8ub3RoZXJFbmRdW2luZm8uY3JlYXRlZFdoaWxlQmVpbmdDb2xsYXBzZWRdO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxhcHNlZE1ldGFFZGdlc0luZm9bZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBvbGRFZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQoZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWQpO1xyXG4gICAgICAvL0lmIHRoZSBlZGdlIGlzIGFscmVhZHkgaW4gdGhlIGdyYXBoIHJlbW92ZSBpdCBhbmQgZGVjcmVhc2UgaXQncyBtZXRhIGxldmVsXHJcbiAgICAgIGlmIChvbGRFZGdlICE9IG51bGwgJiYgb2xkRWRnZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdGhpcy5lZGdlc01ldGFMZXZlbHNbZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuW2ldLl9wcml2YXRlLmRhdGEuaWRdLS07XHJcbiAgICAgICAgb2xkRWRnZS5yZW1vdmUoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qZWRnZXNPZmNvbGxhcHNlZENoaWxkcmVuLnJlc3RvcmUoKTsqL1xyXG5cclxuICAgIC8vQ2hlY2sgZm9yIG1ldGEgbGV2ZWxzIG9mIGVkZ2VzIGFuZCBoYW5kbGUgdGhlIGNoYW5nZXNcclxuICAgIHRoaXMuZWRnZXNUb1JlcGFpciA9IHRoaXMuZWRnZXNUb1JlcGFpci51bmlvbihlZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4pO1xyXG5cclxuICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5lZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xyXG4gIH0sXHJcbiAgLypub2RlIGlzIGFuIG91dGVyIG5vZGUgb2Ygcm9vdFxyXG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxyXG4gICBhbmQgaXQgaXMgbm90IHRoZSByb290IGl0c2VsZiovXHJcbiAgaXNPdXRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCByb290KSB7Ly8qLy9cclxuICAgIHZhciB0ZW1wID0gbm9kZTtcclxuICAgIHdoaWxlICh0ZW1wICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRlbXAgPT0gcm9vdCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXM7IiwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgdmFyIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9leHBhbmRDb2xsYXBzZVV0aWxpdGllcycpO1xyXG4gIHZhciB1bmRvUmVkb1V0aWxpdGllcyA9IHJlcXVpcmUoJy4vdW5kb1JlZG9VdGlsaXRpZXMnKTtcclxuXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUpIHtcclxuXHJcbiAgICBpZiAoIWN5dG9zY2FwZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBjeTtcclxuICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICBsYXlvdXRCeTogbnVsbCwgLy8gZm9yIHJlYXJyYW5nZSBhZnRlciBleHBhbmQvY29sbGFwc2VcclxuICAgICAgZmlzaGV5ZTogdHJ1ZSxcclxuICAgICAgYW5pbWF0ZTogdHJ1ZSxcclxuICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgfSxcclxuICAgICAgdW5kb2FibGU6IHRydWUgLy8gYW5kIGlmIHVuZG9SZWRvRXh0ZW5zaW9uIGV4aXN0c1xyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBzZXRPcHRpb25zKGZyb20pIHtcclxuICAgICAgdmFyIHRlbXBPcHRzID0ge307XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKVxyXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XHJcblxyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gZnJvbSlcclxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcclxuICAgICAgICAgIHRlbXBPcHRzW2tleV0gPSBmcm9tW2tleV07XHJcbiAgICAgIHJldHVybiB0ZW1wT3B0cztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdGFwcGVkQmVmb3JlO1xyXG4gICAgdmFyIHRhcHBlZFRpbWVvdXQ7XHJcblxyXG4gICAgLy8gY3kuZXhwYW5kQ29sbGFwc2UoKVxyXG4gICAgY3l0b3NjYXBlKFwiY29yZVwiLCBcImV4cGFuZENvbGxhcHNlXCIsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIGN5ID0gdGhpcztcclxuICAgICAgb3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICB1bmRvUmVkb1V0aWxpdGllcyhvcHRpb25zLnVuZG9hYmxlKTtcclxuXHJcbiAgICAgIC8vIHRlc3QgZm9yIGV4cGFuZC1jb2xsYXBzZVxyXG4gICAgICBjeS5vbigndGFwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHRhcHBlZE5vdyA9IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgIGlmICh0YXBwZWRUaW1lb3V0ICYmIHRhcHBlZEJlZm9yZSkge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRhcHBlZFRpbWVvdXQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGFwcGVkQmVmb3JlID09PSB0YXBwZWROb3cpIHtcclxuICAgICAgICAgIHRhcHBlZE5vdy50cmlnZ2VyKCdkb3VibGVUYXAnKTtcclxuICAgICAgICAgIHRhcHBlZEJlZm9yZSA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRhcHBlZFRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGFwcGVkQmVmb3JlID0gbnVsbDtcclxuICAgICAgICAgIH0sIDMwMCk7XHJcbiAgICAgICAgICB0YXBwZWRCZWZvcmUgPSB0YXBwZWROb3c7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGN5Lm9uKFwiZG91YmxlVGFwXCIsICc6cGFyZW50LCBbZXhwYW5kZWQtY29sbGFwc2VkXScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgaWYgKGUuY3lUYXJnZXQuZGF0YShcImV4cGFuZGVkLWNvbGxhcHNlZFwiKSA9PSBcImNvbGxhcHNlZFwiKSB7XHJcbiAgICAgICAgICBlLmN5VGFyZ2V0LmV4cGFuZCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBlLmN5VGFyZ2V0LmNvbGxhcHNlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG9wdGlvbnMucmVhZHkoKTtcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2xsZWN0aW9uIGZ1bmN0aW9uc1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2Uob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzZScsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2VBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzZUFsbCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBlbGVzID0gdGhpcy5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy51bmlvbihlbGVzLmRlc2NlbmRhbnRzKCkpLmNvbGxhcHNlKHRlbXBPcHRpb25zKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvbGxlY3Rpb24nLCAnZXhwYW5kJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzLmV4cGFuZGFibGVOb2RlcygpO1xyXG4gICAgICB2YXIgdGVtcE9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xyXG5cclxuICAgICAgcmV0dXJuIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmV4cGFuZEdpdmVuTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZWxlcy5leHBhbmRBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdleHBhbmRBbGwnLCBmdW5jdGlvbiAob3B0cykge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXMuZXhwYW5kYWJsZU5vZGVzKCk7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kQWxsTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIENvcmUgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gY3kuY29sbGFwc2VBbGwob3B0aW9ucylcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdjb2xsYXBzZUFsbCcsIGZ1bmN0aW9uIChvcHRzKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IHNldE9wdGlvbnMob3B0cyk7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5jb2xsYXBzaWJsZU5vZGVzKCkuY29sbGFwc2VBbGwodGVtcE9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gY3kuZXhwYW5kQWxsKG9wdGlvbnMpXHJcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZXhwYW5kQWxsJywgZnVuY3Rpb24gKG9wdHMpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgdmFyIHRlbXBPcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcclxuXHJcbiAgICAgIHJldHVybiBjeS5ub2RlcygpLmV4cGFuZGFibGVOb2RlcygpLmV4cGFuZEFsbCgpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXHJcblxyXG4gICAgLy8gZWxlLmlzQ29sbGFwc2libGUoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2lzRXhwYW5kYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gKGVsZS5kYXRhKFwiZXhwYW5kZWQtY29sbGFwc2VkXCIpID09PSBcImNvbGxhcHNlZFwiKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZS5pc0V4cGFuZGFibGUoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2lzQ29sbGFwc2libGUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBlbGUgPSB0aGlzO1xyXG4gICAgICByZXR1cm4gIWVsZS5pc0V4cGFuZGFibGUoKSAmJiBlbGUuaXNQYXJlbnQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuY29sbGFwc2VkKClcclxuICAgIGN5dG9zY2FwZSgnY29sbGVjdGlvbicsICdjb2xsYXBzaWJsZU5vZGVzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgZWxlcyA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gZWxlcy5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuaXNDb2xsYXBzaWJsZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGVsZXMuZXhwYW5kZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb2xsZWN0aW9uJywgJ2V4cGFuZGFibGVOb2RlcycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIGVsZXMgPSB0aGlzO1xyXG5cclxuICAgICAgcmV0dXJuIGVsZXMuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmlzRXhwYW5kYWJsZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgLy8gZWxlcy5jb2xsYXBzZWQoKVxyXG4gICAgY3l0b3NjYXBlKCdjb3JlJywgJ2NvbGxhcHNpYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5jb2xsYXBzaWJsZU5vZGVzKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBlbGVzLmV4cGFuZGVkKClcclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdleHBhbmRhYmxlTm9kZXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcblxyXG4gICAgICByZXR1cm4gY3kubm9kZXMoKS5leHBhbmRhYmxlTm9kZXMoKTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWV4cGFuZC1jb2xsYXBzZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodW5kb2FibGUpIHtcclxuICBpZiAoIXVuZG9hYmxlIHx8IGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZVxyXG4gIH0pO1xyXG5cclxuICBmdW5jdGlvbiBnZXRFbGVzKF9lbGVzKSB7XHJcbiAgICByZXR1cm4gKHR5cGVvZiBfZWxlcyA9PT0gXCJzdHJpbmdcIikgPyBjeS4kKF9lbGVzKSA6IF9lbGVzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Tm9kZVBvc2l0aW9uc0FuZFNpemVzKCkge1xyXG4gICAgdmFyIHBvc2l0aW9uc0FuZFNpemVzID0ge307XHJcbiAgICB2YXIgbm9kZXMgPSBjeS5ub2RlcygpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVsZSA9IG5vZGVzW2ldO1xyXG4gICAgICBwb3NpdGlvbnNBbmRTaXplc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgd2lkdGg6IGVsZS53aWR0aCgpLFxyXG4gICAgICAgIGhlaWdodDogZWxlLmhlaWdodCgpLFxyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwb3NpdGlvbnNBbmRTaXplcztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJldHVyblRvUG9zaXRpb25zQW5kU2l6ZXMobm9kZXNEYXRhKSB7XHJcbiAgICB2YXIgY3VycmVudFBvc2l0aW9uc0FuZFNpemVzID0ge307XHJcbiAgICBjeS5ub2RlcygpLnBvc2l0aW9ucyhmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplc1tlbGUuaWQoKV0gPSB7XHJcbiAgICAgICAgd2lkdGg6IGVsZS53aWR0aCgpLFxyXG4gICAgICAgIGhlaWdodDogZWxlLmhlaWdodCgpLFxyXG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXHJcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZGF0YSA9IG5vZGVzRGF0YVtlbGUuaWQoKV07XHJcbiAgICAgIGVsZS5fcHJpdmF0ZS5kYXRhLndpZHRoID0gZGF0YS53aWR0aDtcclxuICAgICAgZWxlLl9wcml2YXRlLmRhdGEuaGVpZ2h0ID0gZGF0YS5oZWlnaHQ7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogZGF0YS54LFxyXG4gICAgICAgIHk6IGRhdGEueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnNBbmRTaXplcztcclxuICB9XHJcblxyXG4gIHZhciBzZWNvbmRUaW1lT3B0cyA9IHtcclxuICAgIGxheW91dEJ5OiBudWxsLFxyXG4gICAgYW5pbWF0ZTogZmFsc2UsXHJcbiAgICBmaXNoZXllOiBmYWxzZVxyXG4gIH07XHJcblxyXG4gIGZ1bmN0aW9uIGRvSXQoZnVuYykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgICAgdmFyIG5vZGVzID0gZ2V0RWxlcyhhcmdzLm5vZGVzKTtcclxuICAgICAgaWYgKGFyZ3MuZmlyc3RUaW1lKSB7XHJcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zQW5kU2l6ZXMoKTtcclxuICAgICAgICByZXN1bHQubm9kZXMgPSBub2Rlc1tmdW5jXSgpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9uc0FuZFNpemVzKCk7XHJcbiAgICAgICAgcmVzdWx0Lm5vZGVzID0gbm9kZXNbZnVuY10oc2Vjb25kVGltZU9wdHMpO1xyXG4gICAgICAgIHJldHVyblRvUG9zaXRpb25zQW5kU2l6ZXMoYXJncy5vbGREYXRhKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB2YXIgYWN0aW9ucyA9IFtcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VBbGxcIiwgXCJleHBhbmRcIiwgXCJleHBhbmRBbGxcIl07XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0aW9ucy5sZW5ndGg7IGkrKylcclxuICAgIHVyLmFjdGlvbihhY3Rpb25zW2ldLCBkb0l0KGFjdGlvbnNbaV0pLCBkb0l0KGFjdGlvbnNbKGkgKyAyKSAlIDRdKSk7XHJcblxyXG59OyJdfQ==
