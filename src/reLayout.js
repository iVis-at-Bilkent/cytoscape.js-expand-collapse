function moveNodes(positionDiff, nodes, notCalcTopMostNodes) {
  var topMostNodes = notCalcTopMostNodes ? nodes : getTopMostNodes(nodes);
  var nonParents = topMostNodes.not(":parent");
  // moving parents spoils positioning, so move only nonparents
  nonParents.positions(function (ele, i) {
    return {
      x: nonParents[i].position("x") + positionDiff.x,
      y: nonParents[i].position("y") + positionDiff.y,
    };
  });
  for (var i = 0; i < topMostNodes.length; i++) {
    var node = topMostNodes[i];
    var children = node.children();
    moveNodes(positionDiff, children, true);
  }
}

function getTopMostNodes(nodes) {
  //*//
  var nodesMap = {};
  for (var i = 0; i < nodes.length; i++) {
    nodesMap[nodes[i].id()] = true;
  }
  var roots = nodes.filter(function (ele, i) {
    if (typeof ele === "number") {
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
}

const reLayout = function (layout) {
  return new Promise((resolve) => {
    layout.on("layoutstop", resolve);
    layout.run();
  });
};

function segregateNodesByGroups(nodes) {
  // Create a map to store nodes by their parent group at each level
  const levelGroups = {};
  // Filter out default nodes and process each node
  const filteredNodes = nodes.filter((node) => node.data().type !== "default");

  // First, organize nodes by their parent groups
  filteredNodes.forEach((node) => {
    const parentId = node.data().parent;

    // Level 1 (root level)
    if (parentId === undefined) {
      if (!levelGroups[1]) {
        levelGroups[1] = {
          root: [],
        };
      }
      levelGroups[1].root.push(node);
    }
    // Other levels
    else {
      // Calculate level based on the number of '::' in the parent
      const level = parentId.split("::").length + 1;

      if (!levelGroups[level]) {
        levelGroups[level] = {};
      }

      // Group by parent
      if (!levelGroups[level][parentId]) {
        levelGroups[level][parentId] = [];
      }
      levelGroups[level][parentId].push(node);
    }
  });

  // Convert the level groups to the required output format
  const result = Object.keys(levelGroups)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((level, index) => ({
      level: index + 1, // Explicitly set length to 1, 2, etc.
      items:
        level === "1"
          ? [levelGroups[level].root] // For length 1, combine everything into a single group
          : Object.values(levelGroups[level]),
    }))
    .reverse();

  return result ?? [];
}

async function layout(cy, layoutBy) {
  const dummyNodes = cy.nodes().filter((node) => node.data().type === "fake");

  if (dummyNodes.length) {
    return;
  }
  const segregatedNodes = segregateNodesByGroups(cy.nodes());

  for (let i = 0; i < segregatedNodes.length; i++) {
    let removedCollection = cy.collection();
    let siblingCollection = cy.collection();
    let newGroupLevelNodesCollection = cy.collection();
    for (let j = 0; j < segregatedNodes[i].items.length; j++) {
      const groupLevelNodes = segregatedNodes[i].items[j];

      const newGroupLevelNodes = groupLevelNodes.map((node) => {
        //If it is a expanded node
        if (
          !node.hasClass("cy-expand-collapse-collapsed-node") &&
          node.isParent()
        ) {
          const siblingNodeId = `sibling ${node.data().id}`;
          const siblingNode = {
            group: "nodes",
            data: {
              id: siblingNodeId,
              parent: node.data().parent,
              type: "fake",
              label: `sibling ${node.data().label}`,
            },
            style: {
              width: node.boundingBox().w,
              height: node.boundingBox().h,
              padding: 0,
              "min-width": 0,
              "border-width": 0,
              shape: "round-rectangle",
              "background-color": "#3A444B",
              "background-opacity": 0.48,
            },
            position: {
              x: node.position("x"),
              y: node.position("y"),
            },
          };

          cy.add(siblingNode);
          const removedNode = node.remove();
          removedCollection = removedCollection.union(removedNode);
          const sib = cy.getElementById(siblingNodeId);
          siblingCollection = siblingCollection.union(sib);
          return sib;
        }
        return node;
      });
      newGroupLevelNodesCollection =
        newGroupLevelNodesCollection.union(newGroupLevelNodes);
    }

    if (removedCollection.length === 0 && segregatedNodes.length === 1) {
      const reArrange = newGroupLevelNodesCollection.layout(layoutBy);

      await reLayout(reArrange);
    } else if (removedCollection.length > 0) {
      const reArrange = newGroupLevelNodesCollection.layout(layoutBy);

      await reLayout(reArrange);

      removedCollection.restore();
      removedCollection.forEach((removedNode) => {
        if (
          removedNode.group() !== "edges" ||
          removedNode.data()?.type === "default"
        ) {
          const siblingNodeId = `sibling ${removedNode.data().id}`;
          const siblingNode = cy.getElementById(siblingNodeId);
          if (siblingNode?.length) {
            const multiplier = {
              x: removedNode.position().x < siblingNode.position().x ? 1 : -1,
              y: removedNode.position().y < siblingNode.position().y ? 1 : -1,
            };
            const positionDiff = {
              x:
                multiplier.x === 1
                  ? siblingNode.position().x - removedNode.position().x
                  : (removedNode.position().x - siblingNode.position().x) * -1,
              y:
                multiplier.y === 1
                  ? siblingNode.position().y - removedNode.position().y
                  : (removedNode.position().y - siblingNode.position().y) * -1,
            };
            moveNodes(positionDiff, removedNode.children(), undefined);
          }
        }
      });
      siblingCollection.remove();
    }
  }
}

module.exports = layout;
module.exports.reLayout = reLayout;
