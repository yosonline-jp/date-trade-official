"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountDeletionDialog } from "./account-deletion-dialog";
import { deleteUser } from "@/app/actions/user";

const DeleteProfileBtn = () => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const onOpenChange = (value: boolean) => {
    if (inFlight.current) return;
    setOpen(value);
    setConfirmation("");
    setError(null);
  };

  const onConfirm = async () => {
    if (inFlight.current || confirmation !== "削除する") return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await deleteUser(confirmation);
      if ("error" in result) {
        setError(result.error);
      } else {
        // A full navigation also drops cached pages containing the deleted user's data.
        window.location.replace("/");
        return;
      }
    } catch {
      setError(
        "通信エラーが発生しました。削除状況を確認してから、再度お試しください。",
      );
    }
    inFlight.current = false;
    setPending(false);
  };

  return (
    <>
      <AccountDeletionDialog
        trigger={
          <Button variant="destructive" disabled={pending}>
            <Trash2 aria-hidden="true" />
            アカウントを削除する
          </Button>
        }
        open={open}
        pending={pending}
        error={error}
        confirmation={confirmation}
        onOpenChange={onOpenChange}
        onConfirmationChange={setConfirmation}
        onConfirm={onConfirm}
      />
    </>
  );
};

export default DeleteProfileBtn;
