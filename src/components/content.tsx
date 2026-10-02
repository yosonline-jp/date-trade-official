/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Pencil } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ShowPlateEditor } from "./editor/show-editor";
import { PlateEditor } from "./editor/plate-editor";

type ContentFormProps = {
  id: number;
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

const ContentForm = ({ id, defaultValue, header }: ContentFormProps) => {
  const supabase = createClient();
  const [editMode, setEditMode] = useState(false);
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
    if (
      JSON.stringify(defaultValue) === JSON.stringify(content) &&
      header.title === headerDetail.title &&
      header.description === headerDetail.description
    ) {
      toast({
        title: "更新する内容がありません",
        description: "更新する内容を入力してください",
      });
      return;
    }

    await supabase
      .from("g_pages")
      .update([
        {
          status: "hidden",
        },
      ])
      .match({
        id,
      });

    const { data, error } = await supabase
      .from("g_pages")
      .insert([
        {
          content,
          status: "published",
          header: headerDetail,
          title: headerDetail.title,
        },
      ])
      .select("id")
      .single();

    if (error) {
      toast({
        title: "更新に失敗しました",
        description: "もう一度お試しください",
      });
    }

    // --- Change log --- //
    const { data: log } = await supabase
      .from("g_log")
      .select("id")
      .match({
        page: id,
      })
      .maybeSingle();

    if (log && data) {
      await supabase
        .from("g_log")
        .update({
          page: data.id,
        })
        .match({
          id: log.id,
        });
    }
    // --- End log --- //

    toast({
      title: "更新しました",
      description:
        "更新していただきありがとうございます\n2秒後にリロードします",
    });
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const cancelEdit = () => {
    setContent(defaultValue);
    setHeaderDetail(header);
    const showContent = document.getElementById("show-content");
    if (showContent) {
      showContent.style.display = "block";
    }
    setEditMode(false);
  };

  return (
    <div>
      {editMode ? (
        <>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>ヘッダー編集</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col space-y-4 p-2">
                  <Label>タイトル</Label>
                  <Input
                    onChange={(e) => {
                      setHeaderDetail({
                        ...headerDetail,
                        title: e.target.value,
                      });
                    }}
                    value={headerDetail.title}
                  ></Input>
                  <Label>詳細</Label>
                  <Textarea
                    onChange={(e) => {
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

          <PlateEditor defaultValue={content} onChange={handleContentChange} />
          <div className="flex w-full flex-row items-center justify-end space-x-4">
            <Button className="mt-4" type="button" onClick={cancelEdit}>
              キャンセル
            </Button>
            <Button className="mt-4" type="button" onClick={saveContent}>
              保存
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex w-full items-center justify-end">
            <Button
              onClick={() => {
                // get  id "show-content" and hide it as react
                const showContent = document.getElementById("show-content");
                if (showContent) {
                  showContent.style.display = "none";
                }
                setEditMode(true);
              }}
            >
              <Pencil />
            </Button>
          </div>
          <div id="show-content">
            <ShowPlateEditor defaultValue={defaultValue} />
          </div>
        </>
      )}
    </div>
  );
};

export default ContentForm;
