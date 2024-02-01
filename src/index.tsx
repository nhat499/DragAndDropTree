import { Box } from "@mui/material";
import { ReactNode, useCallback, useMemo, useState } from "react";
import SortableTreeNode, {
  RenderNodeDisplayProps,
  SortableTreeNodeProps,
} from "./SortableTreeNode";
import { FoundNode, findNodeIndex, findNodeRecursion } from "./utils";

export interface TreeDataProps<TData> {
  data: TData;
  id: string;
  children: Array<TreeDataProps<TData>>;
}

export interface SortableTreeProps<TData extends object> {
  /** Whether the tree should allow nesting of tree nodes. */
  allowNesting?: boolean;
  /** Whether the tree is in an editable state or read-only state. */
  editMode: boolean;
  /** The data representing the current state of the tree. */
  treeData: TreeDataProps<TData>;
  /** The React DND item type: https://react-dnd.github.io/react-dnd/docs/overview#items-and-types */
  group: SortableTreeNodeProps<TData>["itemTypes"];
  /** Callback that is fired when an item is dropped. */
  onDrop?: SortableTreeNodeProps<TData>["onDrop"];
  /**  Callback that is fired when a drag is cancelled (a drag ends over an undroppable position). */
  onDragCancel?: SortableTreeNodeProps<TData>["onDragCancel"];
  /** Callback that is fired when a node is hovered over another node in the tree. */
  onMoveNode?: (
    dragNode: FoundNode<TData>,
    hoverNode: FoundNode<TData>
  ) => void;
  /** Callback that is fired when a node is nested inside of another node. */
  onNestedNode?: (
    dragNode: FoundNode<TData>,
    hoverNode: FoundNode<TData>
  ) => void;
  /** A state setting function to update the tree. */
  setTreeData: React.Dispatch<React.SetStateAction<TreeDataProps<TData>>>;
  /** A render prop used to render each individual node in the tree. */
  RenderNodeDisplay: (props: NodeDisplayProps<TData>) => ReactNode;
  /** Custom styling applied to a node as it is being dragged. */
  dragStyle?: SortableTreeNodeProps<TData>["dragStyle"];
  /** An array of keys corresponding to keys in the tree data that should be used for memoization. */
  memoKeys?: TreeNodeProps<TData>["memoKeys"];
}

const SortableTree = <TData extends object>({
  allowNesting = false,
  group,
  editMode,
  treeData,
  onDrop,
  onMoveNode,
  setTreeData,
  onNestedNode,
  RenderNodeDisplay,
  onDragCancel,
  dragStyle,
  memoKeys,
}: SortableTreeProps<TData>) => {
  const moveNode = useCallback(
    (dragId: string, hoverId: string) => {
      setTreeData((prevTree) => {
        const treeDataCopy: TreeDataProps<TData> = structuredClone(prevTree);
        // get nodes
        const { curr, hover } = findNodeRecursion(
          treeDataCopy,
          dragId,
          hoverId,
          treeDataCopy.children,
          { curr: undefined, hover: undefined }
        );

        if (!curr || !hover) {
          // error: should know when dragging and when hover on something
          return prevTree;
        }

        // dragging child out of parent
        if (hover.node.id === curr.parentNode.id) {
          hover.parentNode.children.splice(hover.index, 0, curr.node);
          curr.parentNode.children.splice(curr.index, 1);
          return treeDataCopy;
        }

        if (onMoveNode) {
          onMoveNode(curr, hover);
        }
        // dragging between sibling
        const temp = curr.parentNode.children.splice(curr.index, 1);
        hover.parentNode.children.splice(hover.index, 0, ...temp);
        return treeDataCopy;
      });
    },
    [onMoveNode, setTreeData]
  );

  const nestNode = useCallback(
    (dragId: string, hoverId: string, index: number | undefined = 0) => {
      setTreeData((prevTree) => {
        const treeDataCopy: TreeDataProps<TData> = structuredClone(prevTree);
        // get nodes
        const { curr, hover } = findNodeRecursion(
          treeDataCopy,
          dragId,
          hoverId,
          [treeDataCopy],
          { curr: undefined, hover: undefined }
        );

        if (!curr || !hover || curr.node.id === hover.parentNode.id) {
          return prevTree;
        }

        if (onNestedNode) {
          onNestedNode(curr, hover);
        }

        const deleted = curr.parentNode.children.splice(curr.index, 1);
        hover.node.children.splice(index, 0, ...deleted);
        return treeDataCopy;
      });
    },
    [onNestedNode, setTreeData]
  );

  // find find parentnode and nodeIndex
  const findNodePlacement = useCallback(
    (nodeId: string) => {
      return findNodeIndex(nodeId, treeData);
    },
    [treeData]
  );

  return (
    <TreeBranch<TData>
      memoKeys={memoKeys}
      dragStyle={dragStyle}
      nest={allowNesting}
      itemTypes={group}
      onDrop={onDrop}
      RenderNodeDisplay={RenderNodeDisplay}
      findNodePlacement={findNodePlacement}
      onDragCancel={onDragCancel}
      editMode={editMode}
      subTree={treeData}
      parentId={treeData.id}
      moveNode={moveNode}
      nestNode={nestNode}
    />
  );
};

export default SortableTree;

interface TreeBranchProps<TData extends object> {
  parentId: string;
  subTree: TreeDataProps<TData>;
  editMode: boolean;
  onDrop?: SortableTreeNodeProps<TData>["onDrop"];
  onDragCancel: SortableTreeNodeProps<TData>["onDragCancel"];
  nest: SortableTreeNodeProps<TData>["isNestable"];
  findNodePlacement: SortableTreeNodeProps<TData>["findNodePlacement"];
  nestNode: SortableTreeNodeProps<TData>["nestNode"];
  moveNode?: SortableTreeNodeProps<TData>["moveNode"];
  itemTypes: SortableTreeNodeProps<TData>["itemTypes"];
  RenderNodeDisplay: SortableTreeProps<TData>["RenderNodeDisplay"];
  dragStyle: SortableTreeNodeProps<TData>["dragStyle"];
  memoKeys?: TreeNodeProps<TData>["memoKeys"];
}

const TreeBranch = <TData extends object>(props: TreeBranchProps<TData>) => {
  const { subTree } = props;

  return (
    <Box overflow={"hidden"}>
      {subTree.children.map((node: TreeDataProps<TData>, index) => {
        return (
          <TreeLeaf<TData>
            {...props}
            key={node.id}
            node={node}
            numChildren={node.children.length}
            index={index}
          >
            <TreeBranch
              {...props}
              key={index}
              subTree={node}
              parentId={node.id}
            />
          </TreeLeaf>
        );
      })}
    </Box>
  );
};

export interface NodeDisplayProps<TData> extends RenderNodeDisplayProps {
  node: TreeDataProps<TData>;
  index: number;
  parentId: string;
  editMode: boolean;
  numChildren: number;
  isShowChildren: boolean;
  setIsShowChildren: (value: boolean) => void;
}

export interface TreeNodeProps<TData extends object> {
  index: number;
  parentId: string;
  editMode: boolean;
  numChildren: number;
  node: SortableTreeNodeProps<TData>["node"];
  children: SortableTreeNodeProps<TData>["children"];
  itemTypes: SortableTreeNodeProps<TData>["itemTypes"];
  findNodePlacement: SortableTreeNodeProps<TData>["findNodePlacement"];
  nest: SortableTreeNodeProps<TData>["isNestable"];
  nestNode: SortableTreeNodeProps<TData>["nestNode"];
  moveNode?: SortableTreeNodeProps<TData>["moveNode"];
  onDrop?: SortableTreeNodeProps<TData>["onDrop"];
  onDragCancel?: SortableTreeNodeProps<TData>["onDragCancel"];
  RenderNodeDisplay: SortableTreeProps<TData>["RenderNodeDisplay"];
  dragStyle: SortableTreeNodeProps<TData>["dragStyle"];
  memoKeys?: Array<keyof TData>;
}

const TreeLeaf = <TData extends object>({
  node,
  index,
  nest,
  editMode,
  children,
  parentId,
  itemTypes,
  numChildren,
  findNodePlacement,
  onDragCancel,
  nestNode,
  moveNode,
  onDrop,
  RenderNodeDisplay,
  dragStyle,
  memoKeys,
}: TreeNodeProps<TData>) => {
  const [isShowChildren, setIsShowChildren] = useState<boolean>(true);

  let allKeys = Object.keys(node.data);
  allKeys = allKeys.filter((value) => {
    return !memoKeys?.includes(value as keyof TData);
  });

  const memoString = JSON.stringify(node, (key: string, value: unknown) => {
    if (allKeys.includes(key)) {
      return undefined;
    } else {
      return value;
    }
  });

  const memoNode = useMemo(() => {
    return (
      <SortableTreeNode
        dragStyle={dragStyle}
        findNodePlacement={findNodePlacement}
        node={node}
        key={node.id}
        draggable={editMode}
        isNestable={nest}
        nestNode={nestNode}
        moveNode={moveNode}
        onDrop={onDrop}
        itemTypes={itemTypes}
        isShowChildren={isShowChildren}
        setIsShowChildren={setIsShowChildren}
        onDragCancel={onDragCancel}
        nodeDisplay={({ dragRef, isDragging, dropRef }) => {
          return RenderNodeDisplay({
            dropRef,
            index,
            dragRef,
            isDragging,
            parentId,
            editMode,
            isShowChildren,
            numChildren,
            setIsShowChildren,
            node,
          });
        }}
      >
        {children}
      </SortableTreeNode>
    );
  }, [editMode, index, node.id, parentId, isShowChildren, memoString]);

  return memoNode;
};
