import { Box, BoxProps } from "@mui/material";
import { ReactNode, RefObject, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TreeDataProps } from ".";

export const INDENTATION = 40;

export interface RenderNodeDisplayProps {
  isDragging: boolean;
  dragRef: RefObject<HTMLDivElement>;
  dropRef: RefObject<HTMLDivElement>;
}

// drag drop item info
interface DraggedItem {
  id: string;
  originalIndex: number;
}

export interface SortableTreeNodeProps<TData> {
  /** The React DND item type: https://react-dnd.github.io/react-dnd/docs/overview#items-and-types */
  itemTypes: string;
  /** Whether the node is currently allowed to be dragged. */
  draggable: boolean;
  /** Callback fired when a node is dropped onto another node. */
  onDrop?: (
    /** The drag id of the dropped node. */
    dragId: string,
    /** The id of the node that the dragged node was dropped onto. */
    locationId: string,
    /** The index of the node that the dragged node was dropped onto. */
    LocationIndex: number
  ) => void;
  /** The data associated with the node. */
  node: TreeDataProps<TData>;
  /** Whether children of this node should be visible. */
  isShowChildren: boolean;
  /** A function that returns the id and index given a node's id. */
  findNodePlacement: (nodeId: string) =>
    | {
        id: string;
        index: number;
      }
    | undefined;
  /** Callback fired when a drag ends over a non-droppable area. */
  onDragCancel?: (id: string, draggedId: string, index?: number) => void;
  /** Whether or not the node supports nesting. */
  isNestable: boolean;
  /** A state setting function for the isShowChildren prop. */
  setIsShowChildren: (value: boolean) => void;
  /** Callback fired when a node is moved. The id of the dragged node and the hovered node are provided as arguments to the handler. */
  moveNode?: (id: string, hoverId: string) => void;
  /** Callback fired when a node is nested. The id of the dragged node and the hovered node are provided as arguments to the handler. */
  nestNode: (id: string, draggedId: string, index?: number) => void;
  /** Render prop used to display the contents of the node. */
  nodeDisplay: (value: RenderNodeDisplayProps) => ReactNode;
  /** Styling applied to the dragged element as it is being moved. */
  dragStyle: BoxProps["sx"];

  children: ReactNode;
}

const SortableTreeNode = <TData,>({
  itemTypes,
  node,
  children,
  isShowChildren,
  setIsShowChildren,
  findNodePlacement,
  onDragCancel,
  moveNode,
  nestNode, // when node is drag "INDENTATION" space to the right
  isNestable,
  nodeDisplay,
  onDrop,
  draggable,
  dragStyle,
}: SortableTreeNodeProps<TData>) => {
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
      canDrag() {
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
      hover: ({ id: dragId }: DraggedItem, monitor) => {
        if (!dropRef.current) {
          return;
        }

        if (
          Math.abs(monitor.getInitialSourceClientOffset()?.y as number) <
          dropRef.current.clientHeight
        ) {
          return;
        }
        const hoverBoundingRect = dropRef.current.getBoundingClientRect();
        const x = monitor.getSourceClientOffset()?.x as number;

        // drag on the right and not it self
        if (
          isNestable &&
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
      drop: (item) => {
        // event when drop inside of container
        if (onDrop) {
          const location = findNodePlacement(item.id);
          if (!location) {
            throw new Error("i am error on drop");
          }
          onDrop(item.id, location.id, location.index);
        }
      },
    }),
    [
      id,
      location,
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
      <Box ref={preview}>{nodeDisplay({ dragRef, isDragging, dropRef })}</Box>

      {isShowChildren && (
        <Box
          style={{
            marginLeft: `${INDENTATION}px`,
            pointerEvents: isDragging ? "none" : undefined,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};

export default SortableTreeNode;
