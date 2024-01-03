import { Box } from "@mui/material";
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import Node, {
  NodeContainerProps,
  NodeProps,
  RenderNodeDisplayProps,
} from "./Node";
import { FoundNode, findNodeIndex, findNodeRecursion } from "./util";

export interface TreeDataProps<TData> {
  data: TData;
  id: string;
  children: Array<TreeDataProps<TData>>;
}

export interface DNDProps<TData> {
  nest?: boolean;
  editMode: boolean;
  onDrop?: NodeProps<TData>["onDrop"];
  treeData: TreeDataProps<TData>;
  group: NodeProps<TData>["itemTypes"];
  onDragCancel?: NodeProps<TData>["onDragCancel"];
  onMoveNode?: (
    dragNode: FoundNode<TData>,
    hoverNode: FoundNode<TData>
  ) => void;
  onNestedNode?: (
    dragNode: FoundNode<TData>,
    hoverNode: FoundNode<TData>
  ) => void;
  setTreeData: (value: TreeDataProps<TData>) => void;
  RenderNodeDisplay: (props: NodeDisplayProps<TData>) => ReactNode;
  dragStyle?: NodeContainerProps["dragStyle"];
}

const DND = <TData,>({
  nest = false,
  group,
  editMode,
  treeData,
  onDrop,
  onMoveNode,
  setTreeData,
  onNestedNode, // when drag item get nest on to another
  RenderNodeDisplay,
  onDragCancel,
  dragStyle,
}: DNDProps<TData>) => {
  const requestedFrame = useRef<number | undefined>();

  const drawFrame = useCallback((newTreeData: TreeDataProps<TData>): void => {
    setTreeData(newTreeData);
    requestedFrame.current = undefined;
  }, []);

  const scheduleUpdate = useCallback((newTreeData: TreeDataProps<TData>) => {
    if (!requestedFrame.current) {
      const requestFrame = requestAnimationFrame(() => drawFrame(newTreeData));
      requestedFrame.current = requestFrame;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (requestedFrame.current !== undefined) {
        cancelAnimationFrame(requestedFrame.current);
      }
    };
  }, []);

  const moveNode = useCallback(
    (dragId: string, hoverId: string) => {
      const treeDataCopy: TreeDataProps<TData> = structuredClone(treeData);

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
        return;
      }

      // dragging child out of parent
      if (hover.node.id === curr.parentNode.id) {
        hover.parentNode.children.splice(hover.index, 0, curr.node);
        curr.parentNode.children.splice(curr.index, 1);
        setTreeData(treeDataCopy);
        return;
      }

      if (onMoveNode) {
        onMoveNode(curr, hover);
      }

      // dragging between sibling
      const temp = curr.parentNode.children.splice(curr.index, 1);
      hover.parentNode.children.splice(hover.index, 0, ...temp);
      scheduleUpdate(treeDataCopy);
    },
    [treeData, onMoveNode, scheduleUpdate, setTreeData]
  );

  const nestNode = useCallback(
    (dragId: string, hoverId: string, index: number | undefined = 0) => {
      const treeDataCopy: TreeDataProps<TData> = structuredClone(treeData);

      // get nodes
      const { curr, hover } = findNodeRecursion(
        treeDataCopy,
        dragId,
        hoverId,
        [treeDataCopy],
        { curr: undefined, hover: undefined }
      );

      if (!curr || !hover || curr.node.id === hover.parentNode.id) {
        return;
      }

      if (onNestedNode) {
        onNestedNode(curr, hover);
      }

      const deleted = curr.parentNode.children.splice(curr.index, 1);
      hover.node.children.splice(index, 0, ...deleted);
      scheduleUpdate(treeDataCopy);
    },
    [treeData, onNestedNode, scheduleUpdate]
    // [treeData, findNodeRecursion, onNestedNode, onMoveNode, moveNode]
  );

  // find find parentnode and nodeIndex
  const findNodePlacement = useCallback(
    (nodeId: string) => {
      return findNodeIndex(nodeId, treeData);
    },
    [treeData]
  );

  return (
    <RenderSubNodes<TData>
      dragStyle={dragStyle}
      nest={nest}
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

export default DND;
interface renderSubnodesProps<TData> {
  parentId: string;
  editMode: boolean;
  onDrop?: NodeProps<TData>["onDrop"];
  onDragCancel: NodeProps<TData>["onDragCancel"];
  nest: NodeProps<TData>["isNestAble"];
  subTree: TreeDataProps<TData>;
  findNodePlacement: NodeProps<TData>["findNodePlacement"];
  nestNode: NodeProps<TData>["nestNode"];
  moveNode?: NodeProps<TData>["moveNode"];
  itemTypes: NodeProps<TData>["itemTypes"];
  RenderNodeDisplay: DNDProps<TData>["RenderNodeDisplay"];
  dragStyle: NodeContainerProps["dragStyle"];
}

const RenderSubNodes = <TData,>(props: renderSubnodesProps<TData>) => {
  const { subTree } = props;

  return (
    <Box overflow={"hidden"}>
      {subTree.children.map((node: TreeDataProps<TData>, index) => {
        return (
          <RenderNode<TData>
            {...props}
            key={node.id}
            location={{ parentId: subTree.id, index }}
            node={node}
            numChildren={node.children.length}
            index={index}
          >
            <RenderSubNodes {...props} subTree={node} parentId={node.id} />
          </RenderNode>
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

export interface RenderNodeProps<TData> {
  location: { parentId: string; index: number };
  index: number;
  parentId: string;
  editMode: boolean;
  numChildren: number;
  node: NodeProps<TData>["node"];
  children: NodeProps<TData>["children"];
  itemTypes: NodeProps<TData>["itemTypes"];
  findNodePlacement: NodeProps<TData>["findNodePlacement"];
  nest: NodeProps<TData>["isNestAble"];
  nestNode: NodeProps<TData>["nestNode"];
  moveNode?: NodeProps<TData>["moveNode"];
  onDrop?: NodeProps<TData>["onDrop"];
  onDragCancel?: NodeProps<TData>["onDragCancel"];
  RenderNodeDisplay: DNDProps<TData>["RenderNodeDisplay"];
  dragStyle: NodeContainerProps["dragStyle"];
}

const RenderNode = function RenderNode<TData>({
  location,
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
}: RenderNodeProps<TData>) {
  const [isShowChildren, setIsShowChildren] = useState<boolean>(true);

  const memoNode = useMemo(() => {
    return (
      <Node
        dragStyle={dragStyle}
        findNodePlacement={findNodePlacement}
        node={node}
        key={node.id}
        draggable={editMode}
        isNestAble={nest}
        nestNode={nestNode}
        moveNode={moveNode}
        onDrop={onDrop}
        itemTypes={itemTypes}
        isShowChildren={isShowChildren}
        setIsShowChildren={setIsShowChildren}
        onDragCancel={onDragCancel}
        nodeDisplay={({ dragRef, isDragging }: RenderNodeDisplayProps) =>
          RenderNodeDisplay({
            index,
            dragRef,
            isDragging,
            parentId,
            editMode,
            isShowChildren,
            numChildren,
            setIsShowChildren,
            node,
          })
        }
      >
        {children}
      </Node>
    );
  }, [
    editMode,
    location.parentId,
    location.index,
    JSON.stringify(node.children, (key, value) => {
      if (key === "data") {
        return undefined;
      }
      return value;
    }),
  ]);

  return memoNode;
};
