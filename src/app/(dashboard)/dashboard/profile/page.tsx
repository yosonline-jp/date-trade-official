import ProfileOverview from "@/components/pages/profile-overview";
import { PencilLine } from "lucide-react";
import DeleteProfileBtn from "@/components/pages/dashboard/profile/delete-profile";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
	title: "プロフィール | デイトレード.net",
	description: "",
};

const GenerateContentByIdIndex = async () => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect("/sign-in");
	}

	const { data: userProfile, error } = await supabase
		.from("users")
		.select("*")
		.eq("id", user.id)
		.maybeSingle();

	if (error || !userProfile) {
		return redirect("/sign-in");
	}

  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
  ]);
  return (
    <div className="profile-page">
      <div className="page-heading"><div><p className="eyebrow">MY ACCOUNT</p><h2 className="profile-page-title">マイプロフィール</h2></div></div>
      <ProfileOverview member={userProfile} stats={[
        { label: "フォロー中", value: followingCount, href: "/dashboard/following" },
        { label: "フォロワー", value: followersCount, href: "/dashboard/followers" },
      ]} actions={<Link className="terminal-button profile-edit-link" href="/dashboard/profile/edit"><PencilLine size={15} />プロフィールを編集</Link>} />
      <div className="profile-account-settings"><span>アカウント管理</span><DeleteProfileBtn /></div>
    </div>
  );
};

export default GenerateContentByIdIndex;
