/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { PlateEditor } from "@/components/editor/plate-editor";
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
import Image from "next/image";
import { saveTechnicalAnalysis } from "@/app/actions/technical";
import { createClient } from "@/utils/supabase/client";

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

type HeaderDetail = {
	title: string;
	description: string;
	thumbnail?: string | null;
};

type TechnicalFormProps = {
	id?: number;
	edit: boolean;
	defaultValue: Content[];
	header: HeaderDetail;
};

const TechnicalForm = ({
	id,
	defaultValue,
	header,
	edit = false,
}: TechnicalFormProps) => {
	const router = useRouter();
	const supabase = createClient();

	const [content, setContent] = useState<Content[]>(defaultValue || []);
	const [headerDetail, setHeaderDetail] = useState<HeaderDetail>(
		header || { title: "", description: "", thumbnail: null }
	);
	const [uploading, setUploading] = useState(false);

	useEffect(() => {
		setHeaderDetail(header || { title: "", description: "", thumbnail: null });
		setContent(
			defaultValue || [{ content: [{ type: "p", children: [{ text: "" }] }] }]
		);
	}, [defaultValue, header]);

	const handleContentChange = (html: any) => setContent(html.value);

	/** ✅ サムネイルアップロード */
	const handleThumbnailUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		try {
			const file = e.target.files?.[0];
			if (!file) return;

			setUploading(true);
			const fileName = `${Date.now()}_${file.name}`;
			const { error } = await supabase.storage
				.from("thumbnails")
				.upload(fileName, file);

			if (error) throw error;

			const {
				data: { publicUrl },
			} = supabase.storage.from("thumbnails").getPublicUrl(fileName);

			setHeaderDetail({ ...headerDetail, thumbnail: publicUrl });
			toast({ title: "サムネイルをアップロードしました" });
		} catch (error) {
			console.error(error);
			toast({
				title: "アップロード失敗",
				description: "画像のアップロードに失敗しました",
			});
		} finally {
			setUploading(false);
		}
	};

	/** ✅ 保存処理（Action呼び出し） */
	const handleSave = async () => {
		try {
			await saveTechnicalAnalysis({
				id,
				header: headerDetail,
				content,
			});
			toast({
				title: `${edit ? "更新" : "作成"}しました`,
				description: "ページをリロードします",
			});
			router.push("/dashboard/technical");
		} catch (error: any) {
			toast({
				title: "保存に失敗しました",
				description: error.message || "もう一度お試しください",
			});
		}
	};

	return (
		<div>
			{/* Accordion: Header編集 */}
			<Accordion type="single" collapsible>
				<AccordionItem value="item-1">
					<AccordionTrigger>ヘッダー編集</AccordionTrigger>
					<AccordionContent>
						<div className="flex flex-col space-y-4 p-2">
							<Label>タイトル</Label>
							<Input
								value={headerDetail.title}
								onChange={(e) =>
									setHeaderDetail({ ...headerDetail, title: e.target.value })
								}
							/>

							<Label>詳細</Label>
							<Textarea
								value={headerDetail.description}
								onChange={(e) =>
									setHeaderDetail({
										...headerDetail,
										description: e.target.value,
									})
								}
							/>

							<Label>サムネイル画像</Label>
							<Input
								type="file"
								accept="image/*"
								onChange={handleThumbnailUpload}
								disabled={uploading}
							/>
							{headerDetail.thumbnail && (
								<div className="mt-2">
									<Image
										src={headerDetail.thumbnail}
										alt="thumbnail"
										width={200}
										height={120}
										className="rounded shadow-md"
									/>
								</div>
							)}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			{/* Editor */}
			{/* {content && content.length > 0 && ( */}
			<div className="mt-4">
				<PlateEditor defaultValue={content} onChange={handleContentChange} />
			</div>
			{/* )} */}

			{/* 保存ボタン */}
			<div className="flex justify-end space-x-4">
				<Button
					className="mt-4"
					type="button"
					onClick={handleSave}
					disabled={uploading}
				>
					{uploading ? "アップロード中..." : "保存"}
				</Button>
			</div>
		</div>
	);
};

export default TechnicalForm;
