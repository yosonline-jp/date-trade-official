"use client";

import { changeUserType } from "@/app/actions/user";
import { Button } from "@/components/ui/button";

const ChangeType = () => {
  return (
    <div className="w-full border rounded p-4">
      <div className="w-full flex flex-col lg:flex-row items-center justify-between">
        <div className="flex flex-col gap-2">
          <p>あなたは開発者ですか？</p>
          <p className="text-xs">＊開発者はゲームを公開することができます。</p>
        </div>
        <div className="flex flex-row gap-2 items-center justify-center">
          <Button
            onClick={() => {
              changeUserType("developer");
            }}
            className="font-bold"
          >
            はい
          </Button>
          <Button
            onClick={() => {
              changeUserType("player");
            }}
            className="font-bold"
          >
            いいえ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangeType;
