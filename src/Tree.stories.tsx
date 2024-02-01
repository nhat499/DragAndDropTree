import { Box, IconButton } from "@mui/material";
import { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import SortableTree, { TreeDataProps } from ".";

import { DownIcon } from "../SvgIcon";

const meta: Meta<typeof SortableTree> = {
  component: SortableTree,
};

export default meta;

type Story = StoryObj<typeof SortableTree>;

interface TreeDataType {
  text: string;
}

export const Primary: Story = {
  args: {
    editMode: true,
  },
  render: (args) => {
    const treeObject: TreeDataProps<TreeDataType> = {
      id: "root",
      data: {
        text: "",
      },
      children: [
        {
          id: "1",
          data: {
            text: "shrek",
          },
          children: [
            {
              id: "9",
              children: [],
              data: {
                text: "patrick",
              },
            },
            {
              id: "2",
              data: {
                text: "fiona",
              },
              children: [],
            },
          ],
        },

        {
          id: "3",
          data: {
            text: "squidward",
          },
          children: [
            {
              id: "4",
              data: {
                text: "plankton",
              },
              children: [],
            },
            {
              id: "6",
              children: [],
              data: {
                text: "tentacles",
              },
            },
          ],
        },
      ],
    };

    const [treeData, setTreeData] =
      useState<TreeDataProps<TreeDataType>>(treeObject);

    return (
      <DndProvider debugMode={true} backend={HTML5Backend}>
        <SortableTree<TreeDataType>
          dragStyle={{ border: "1px solid gray" }}
          allowNesting={true}
          group="visualEditor"
          treeData={treeData}
          memoKeys={["text"]}
          setTreeData={setTreeData}
          editMode={args.editMode}
          RenderNodeDisplay={({
            dragRef,
            dropRef,
            isDragging,
            editMode,
            isShowChildren,
            numChildren,
            parentId,
            index,
            setIsShowChildren,
            node,
          }) => {
            return (
              <Box ref={dropRef}>
                <Box
                  ref={dragRef}
                  sx={{
                    border: "1px solid gray",
                    padding: "0px 10px 0px 10px",
                    height: "30px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div ref={editMode ? dragRef : undefined}>[drag]</div>
                    <div>{node.data.text}</div>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {numChildren > 0 && numChildren}
                    {numChildren > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setIsShowChildren(!isShowChildren);
                        }}
                      >
                        <DownIcon
                          sx={{
                            height: "18px",
                            width: "18px",
                          }}
                          transform={isShowChildren ? "rotate(180)" : ""}
                        />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          }}
        />
      </DndProvider>
    );
  },
};
