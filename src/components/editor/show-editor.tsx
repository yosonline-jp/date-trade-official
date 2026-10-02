/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Plate } from "@udecode/plate/react";

import { useCreateEditor } from "@/components/editor/use-create-editor";
import { Editor, EditorContainer } from "@/components/plate-ui/editor";

type PlateEditorProps = {
  defaultValue?: any;
};

export function ShowPlateEditor({ defaultValue }: PlateEditorProps) {
  const editor = useCreateEditor(defaultValue);

  return (
    <DndProvider backend={HTML5Backend}>
      <Plate editor={editor} readOnly>
        <EditorContainer>
          <Editor variant="none" readOnly />
        </EditorContainer>
      </Plate>
    </DndProvider>
  );
}
