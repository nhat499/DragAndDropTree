import { Box, BoxProps } from "@mui/material";
import { ReactNode, RefObject, memo, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TreeDataProps } from "./DNDTree";

export const INDENTATION = 40;

export interface RenderNodeDisplayProps {
  isDragging: boolean;
  dragRef: RefObject<HTMLDivElement>;
}

export interface NodeProps<TData> {
  itemTypes: string;
  draggable: boolean;
  children: ReactNode;
  onDrop?: (dragId: string, locationId: string, LocationIndex: number) => void;
  node: TreeDataProps<TData>;
  isShowChildren: boolean;
  findNodePlacement: (
    nodeId: string
  ) => { id: string; index: number } | undefined;
  onDragCancel?: (id: string, draggedId: string, index?: number) => void;
  isNestAble: boolean;
  setIsShowChildren: (value: boolean) => void;
  moveNode?: (id: string, hoverId: string) => void;
  nestNode: (id: string, draggedId: string, index?: number) => void;
  nodeDisplay: (value: RenderNodeDisplayProps) => ReactNode;
  dragStyle: NodeContainerProps["dragStyle"];
}

// drag drop item info
interface Item {
  id: string;
  originalIndex: number;
}

const Node = <TData,>({
  itemTypes,
  node,
  children,
  isShowChildren,
  setIsShowChildren,
  findNodePlacement,
  onDragCancel,
  moveNode,
  nestNode, // when node is drag "INDENTATION" space to the right
  isNestAble,
  nodeDisplay,
  onDrop,
  draggable,
  dragStyle,
}: NodeProps<TData>) => {
  const { id } = node;
  const location = findNodePlacement(id); // get the parent node and its child's Index of id
  const dragRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag(
    {
      type: itemTypes,
      item: { id, location },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      isDragging: (monitor) => id === monitor.getItem().id,
      canDrag(monitor) {
        return draggable;
      },

      end(draggedItem, monitor) {
        // event when drop outside of container
        const { id, location } = draggedItem;
        if (!monitor.didDrop() && location && nestNode) {
          // reset tree to previous state
          nestNode(id, location.id, location.index);
          if (onDragCancel) {
            onDragCancel(id, location.id, location.index);
          }
        }
      },
    },
    [id, location, moveNode, nestNode, node, draggable, onDrop, useDrop]
  );

  const [, drop] = useDrop(
    () => ({
      accept: itemTypes,
      hover({ id: dragId, originalIndex }: Item, monitor) {
        if (!dropRef.current) {
          return;
        }

        const hoverBoundingRect = dropRef.current.getBoundingClientRect();
        const x = monitor.getSourceClientOffset()?.x as number;

        // drag on the right and not it self
        if (
          isNestAble &&
          dragId !== id &&
          x - INDENTATION > hoverBoundingRect.x
        ) {
          // if Right of hover bounding rect: nest
          if (node.children.length > 0 && node.children[0].id === dragId) {
            return;
          }

          setIsShowChildren(true);
          nestNode(dragId, node.id);
        } else if (moveNode && dragId !== id) {
          moveNode(dragId, node.id);
        }
      },
      drop(item, monitor) {
        // event when drop inside of container
        if (onDrop && location) {
          onDrop(item.id, location.id, location.index);
        }
      },
    }),
    [
      id,
      findNodePlacement,
      moveNode,
      nestNode,
      node,
      draggable,
      onDrop,
      useDrag,
    ]
  );

  drag(dragRef);
  drop(dropRef);

  return (
    <NodeContainer isDragging={isDragging} dragStyle={dragStyle}>
      <Box ref={preview}>
        <Box ref={dropRef}>{nodeDisplay({ dragRef, isDragging })}</Box>
      </Box>

      <ChildrenNode isDragging={isDragging} isShowChildren={isShowChildren}>
        {children}
      </ChildrenNode>
    </NodeContainer>
  );
};

export default memo(Node);

export interface NodeContainerProps {
  children: ReactNode;
  isDragging: boolean;
  dragStyle?: BoxProps["sx"];
}
const NodeContainer = ({
  children,
  isDragging,
  dragStyle,
}: NodeContainerProps) => {
  return (
    <Box
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          marginTop: "5px",
        },
        isDragging && {
          opacity: isDragging ? 0.5 : 1,
        },
        ...(isDragging
          ? Array.isArray(dragStyle)
            ? dragStyle
            : [dragStyle]
          : []),
      ]}
    >
      {children}
    </Box>
  );
};

interface ChildrenNodeProps {
  children: ReactNode;
  isShowChildren: boolean;
  isDragging: boolean;
}

const ChildrenNode = ({
  children,
  isShowChildren,
  isDragging,
}: ChildrenNodeProps) => {
  return isShowChildren ? (
    <Box
      style={{
        marginLeft: `${INDENTATION}px`,
        pointerEvents: isDragging ? "none" : undefined,
      }}
    >
      {children}
    </Box>
  ) : (
    <></>
  );
};
