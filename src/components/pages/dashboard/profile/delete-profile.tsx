"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteUser } from "@/app/actions/user";

const DeleteProfileBtn = () => {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const getUserInfo = async () => {
    await deleteUser();
  };

  return (
    <>
      <Button
        className="font-extrabold text-white"
        variant="destructive"
        onClick={() => {
          setOpenConfirmDialog(true);
        }}
      >
        アカウントを削除する
      </Button>
      <ConfirmDialog
        title="アカウントを削除しますか？"
        description="アカウントを削除すると、全てのデータが削除されます"
        open={openConfirmDialog}
        closeText="キャンセル"
        confirmText="削除する"
        onOpenChange={setOpenConfirmDialog}
        confirmAction={getUserInfo}
      />
    </>
  );
};

export default DeleteProfileBtn;
