/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Plate } from "@udecode/plate/react";

import { useCreateEditor } from "@/components/editor/use-create-editor";
// import { SettingsDialog } from "@/components/editor/settings";
import { Editor, EditorContainer } from "@/components/plate-ui/editor";

type PlateEditorProps = {
	defaultValue?: any;
	onChange?: (value: any) => void;
};

export function PlateEditor({ defaultValue, onChange }: PlateEditorProps) {
	const editor = useCreateEditor(defaultValue);

	return (
		<DndProvider backend={HTML5Backend}>
			<Plate
				editor={editor}
				onChange={(value) => {
					onChange?.(value);
				}}
			>
				<EditorContainer>
					<Editor
						className="p-2 rounded-t-none border border-t-0"
						variant="none"
					/>
				</EditorContainer>

				{/* <SettingsDialog /> */}
			</Plate>
		</DndProvider>
	);
}
