import ProfileOverview from "@/components/pages/profile-overview";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { isUUID } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import FollowButton from "@/components/pages/follow/follow-btn";
import { isFollowing } from "@/app/actions/follow";
import { ProfileJournal } from "@/components/pages/traders/profile-journal";
import { getProfileJournal } from "@/lib/profile-journal";

export const revalidate = 0;

type TradersPageParams = {
	// Match Next's generated PageProps where `params` is a Promise-wrapped SegmentParams
	params?: Promise<Record<string, string | string[] | undefined>>;
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const GenerateContentByIdIndex = async ({ params, searchParams }: TradersPageParams) => {
	const resolvedParams = (await params) as Record<string, string>;
	const { slug } = resolvedParams;
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	

	let member = null;
	if (isUUID(slug)) {
		const { data: userData } = await supabase
			.from("users")
			.select("*")
			.eq("id", slug)
			.maybeSingle();
		if (userData) member = userData;
	} else {
		const { data: userData } = await supabase
			.from("users")
			.select("*")
			.eq("account", slug)
			.maybeSingle();
		if (userData) member = userData;
	}

	if (!member) notFound();
	const followingStatus = await isFollowing(member.id);

	// ✅ フォロワー・フォロー中の数を取得
	const { count: followersCount } = await supabase
		.from("follows")
		.select("*", { count: "exact", head: true })
		.eq("following_id", member.id); // 自分をフォローしている人

	const { count: followingCount } = await supabase
		.from("follows")
		.select("*", { count: "exact", head: true })
		.eq("follower_id", member.id); // 自分がフォローしている人

	const journal = await getProfileJournal(member.id, (await searchParams) ?? {});

  return (
    <div className="profile-page">
      <Link className="profile-back" href="/dashboard/traders"><ArrowLeft size={15} />トレーダー一覧に戻る</Link>
      <ProfileOverview member={member} stats={[
        { label: "フォロー中", value: followingCount },
        { label: "フォロワー", value: followersCount },
        { label: "トレード記録", value: journal.counts.real + journal.counts.demo },
      ]} actions={user && user.id !== member.id ? <FollowButton targetUserId={member.id} initialIsFollowing={followingStatus} currentUserId={user.id} /> : undefined} />
      <ProfileJournal {...journal} basePath={"/dashboard/traders/" + encodeURIComponent(slug)} />
    </div>
  );
};

export default GenerateContentByIdIndex;
