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