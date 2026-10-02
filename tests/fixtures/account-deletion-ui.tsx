"use client";
import { useState } from "react";
import { AccountDeletionDialog } from "@/components/pages/dashboard/profile/account-deletion-dialog";
export default function Harness() {
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState<string | null>(null);
  return (
    <main style={{ padding: 32, background: "#101b28", minHeight: "100vh" }}>
      <AccountDeletionDialog
        trigger={<button>アカウントを削除する</button>}
        open={open}
        pending={pending}
        confirmation={confirmation}
        error={error}
        onOpenChange={(value) => {
          setOpen(value);
          setConfirmation("");
          setError(null);
        }}
        onConfirmationChange={setConfirmation}
        onConfirm={() => {
          setPending(true);
          setTimeout(() => {
            setPending(false);
            setError(
              "画像を削除できませんでした。アカウントは残っています。再度お試しください。",
            );
          }, 1200);
        }}
      />
    </main>
  );
}
