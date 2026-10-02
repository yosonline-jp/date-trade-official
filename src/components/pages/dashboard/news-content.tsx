/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { PlateEditor } from "@/components/editor/plate-editor";
import { saveNews } from "@/app/actions/news";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

type NewsContentFormProps = {
	id?: number;
	edit: boolean;
	defaultValue: Content[];
	header: headerDetail;
};

export type Content = {
	content: contentValue[];
};

type contentValue = {
	children: childrenValue[];
	type: string;
};

type childrenValue = {
	text: string;
};

type headerDetail = {
	title: string;
	description: string;
};

const NewsContentForm = ({
	id,
	defaultValue,
	header,
	edit = false,
}: NewsContentFormProps) => {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [content, setContent] = useState<Content[]>([]);
	const [headerDetail, setHeaderDetail] = useState<headerDetail>({
		title: "",
		description: "",
	});
	const handleContentChange = (html: any) => {
		setContent(html.value);
	};

	useEffect(() => {
		if (!header) {
			setHeaderDetail({
				title: "",
				description: "",
			});
		} else {
			setHeaderDetail(header);
		}
		if (Array.isArray(defaultValue) && !defaultValue.length) {
			setContent([
				// @ts-expect-error: defaultValue is an array
				{ children: [{ text: "" }], type: "p" },
			]);
			return;
		}
		setContent(defaultValue);
	}, [defaultValue, header]);

 const saveContent = async () => {
   if (saving) return;
   setSaving(true);
   try {
     await saveNews({id:edit ? id : undefined,header:headerDetail,content});
     toast({title:edit ? "記事を更新しました" : "記事を作成しました"});
     router.push("/dashboard/cms");
     router.refresh();
   } catch(error) {
     toast({title:"保存できませんでした",description:error instanceof Error ? error.message : "再度お試しください",variant:"destructive"});
   } finally { setSaving(false); }
 };
	return (
		<div>
			<Accordion type="single" collapsible defaultValue="item-1">
				<AccordionItem value="item-1">
					<AccordionTrigger>ヘッダー編集</AccordionTrigger>
					<AccordionContent>
						<div className="flex flex-col space-y-4 p-2">
							<Label>タイトル</Label>
							<Input
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									setHeaderDetail({
										...headerDetail,
										title: e.target.value,
									});
								}}
								value={headerDetail.title}
							></Input>
							<Label>詳細</Label>
							<Textarea
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
									setHeaderDetail({
										...headerDetail,
										description: e.target.value,
									});
								}}
								value={headerDetail.description}
							></Textarea>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
			{content && content.length > 0 && (
				<PlateEditor defaultValue={content} onChange={handleContentChange} />
			)}
			<div className="flex w-full flex-row items-center justify-end space-x-4">
				<Button className="mt-4" type="button" onClick={saveContent} disabled={saving}>
					{saving ? "保存中…" : "公開して保存"}
				</Button>
			</div>
		</div>
	);
};

export default NewsContentForm;

