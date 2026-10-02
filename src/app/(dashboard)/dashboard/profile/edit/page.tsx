import ProfileForm from "@/components/pages/dashboard/profile/profile-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
	title: "プロフィール編集 | デイトレード.net",
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

	const { data: profile, error } = await supabase
		.from("users")
		.select("*")
		.eq("id", user.id)
		.maybeSingle();

	if (error || !profile) {
		return redirect("/sign-in");
	}

	return <ProfileForm profile={profile} />;
};

export default GenerateContentByIdIndex;
