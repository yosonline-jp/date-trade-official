import ProfileConnections from "@/components/pages/follow/profile-connections";

export const revalidate = 0;
export const metadata = { title: "フォロワー | デイトレード.net" };

export default function FollowersPage() {
  return <ProfileConnections mode="followers" />;
}
