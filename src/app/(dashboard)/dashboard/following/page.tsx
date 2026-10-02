import ProfileConnections from "@/components/pages/follow/profile-connections";

export const revalidate = 0;
export const metadata = { title: "フォロー中 | デイトレード.net" };

export default function FollowingPage() {
  return <ProfileConnections mode="following" />;
}
