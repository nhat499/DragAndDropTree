import { TreeDataProps } from "./DNDTree";

export interface FoundNode<TData> {
  parentNode: TreeDataProps<TData>;
  index: number;
  node: TreeDataProps<TData>;
}

// find 2 node: drag and hover
export const findNodeRecursion = <TData>(
  parentNode: TreeDataProps<TData>,
  currId: string,
  hoverId: string,
  treeNode: Array<TreeDataProps<TData>>,
  result: {
    curr: FoundNode<TData> | undefined;
    hover: FoundNode<TData> | undefined;
  }
) => {
  for (let index = 0; index < treeNode.length; index++) {
    const node = treeNode[index];
    if (node.id === hoverId) {
      result.hover = { parentNode, index, node };
      if (result.curr) {
        return result;
      } else {
        findNodeRecursion(node, currId, hoverId, node.children, result);
      }
    } else if (node.id === currId) {
      result.curr = { parentNode, index, node };
      if (result.hover) {
        return result;
      } else {
        findNodeRecursion(node, currId, hoverId, node.children, result);
      }
    } else if (node.children.length > 0) {
      result = findNodeRecursion(node, currId, hoverId, node.children, result);
    }
  }
  return result;
};

// find 1 node
export const findNode = <TData>(
  nodeId: string,
  treeNode: TreeDataProps<TData>
) => {
  if (treeNode.id === nodeId) {
    return treeNode;
  }
  let res: TreeDataProps<TData> | undefined;
  for (let index = 0; !res && index < treeNode.children.length; index++) {
    const node = treeNode.children[index];

    res = findNode(nodeId, node);
  }
  return res;
};

export const findNodeIndex = <TData>(
  nodeId: string,
  treeNode: TreeDataProps<TData>
) => {
  let res: { id: string; index: number } | undefined;
  for (let index = 0; !res && index < treeNode.children.length; index++) {
    const node = treeNode.children[index];
    if (node.id === nodeId) {
      return { id: treeNode.id, index };
    }
    res = findNodeIndex(nodeId, node);
  }
  return res;
};

export function deleteSelectedNode<TData>(
  treeData: TreeDataProps<TData>,
  selectedNode: { [key: string]: string } | string[],
  previous?: TreeDataProps<TData>,
  currIndex?: number
) {
  if (treeData.id in selectedNode && currIndex !== undefined && previous) {
    previous.children.splice(currIndex, 1);
  } else {
    for (let i = treeData.children.length - 1; i >= 0; i--) {
      const node = treeData.children[i];
      deleteSelectedNode(node, selectedNode, treeData, i);
    }
  }
}
