/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useUpload from "@/hooks/use-upload";
import { ProfileFormType, ProfileSchema } from "@/validations/profile";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Camera, Check, Globe2, Instagram, Loader2, Trash2, UserRound } from "lucide-react";
import { updateUser } from "@/app/actions/user";

type ProfileFormProps = {
	profile: any;
};

const ProfileForm = ({ profile }: ProfileFormProps) => {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const { uploadImage } = useUpload();
	const profileImage = useRef<HTMLInputElement>(null);
	const form = useForm<ProfileFormType>({
		resolver: zodResolver(ProfileSchema),
		defaultValues: {
			nickname: profile.nickname || "名無し",
			bio: profile.bio || "",
			web_url: profile.web_url || "",
			x_url: profile.x_url || "",
			instagram_url: profile.instagram_url || "",
			account: profile.account || "",
		},
	});

	const deleteImage = async () => {
		try {
			setIsLoading(true);
			const supabase = createClient();
			const { error } = await supabase
				.from("users")
				.update({
					avatar: null,
				})
				.match({ id: profile.id });
			if (error) throw error;
			toast({
				title: "完了",
				description: "画像を削除しました",
			});
			router.refresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "エラー",
				description: "エラーが発生しました。もう一度お試しください",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const file = e.target.files[0];
			if (file) {
				try {
					setIsLoading(true);
					const supabase = createClient();
					const imageUrl = await uploadImage(file, "profile");
					if (!imageUrl) throw new Error("Image upload failed");
					const { error } = await supabase
						.from("users")
						.update({
							avatar: imageUrl,
						})
						.match({ id: profile.id });
					if (error) throw error;
					toast({
						title: "完了",
						description: "画像を更新しました",
					});
					router.refresh();
				} catch (error) {
					toast({
						variant: "destructive",
						title: "エラー",
						description: "エラーが発生しました。もう一度お試しください",
					});
				} finally {
					setIsLoading(false);
				}
			}
		}
	};

	const onSubmit = async (data: ProfileFormType) => {
		try {
			setIsLoading(true);
			await updateUser(data);
			toast({
				title: "完了",
				description: "ユーザー詳細を更新しました",
			});
			router.push("/dashboard/profile");
		} catch (error: any) {
			if (error.code === "23505") {
				// focus account and show message
				form.setError("account", {
					type: "manual",
					message: "アカウント名が既に使用されています",
				});
				toast({
					variant: "destructive",
					title: "",
					description: "アカウント名が既に使用されています",
				});
			} else {
				toast({
					variant: "destructive",
					title: "エラー",
					description: "エラーが発生しました。もう一度お試しください",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

  const nickname = form.watch("nickname");
  const bio = form.watch("bio");
  const socialFields = [
    { name: "web_url" as const, label: "ウェブサイト", placeholder: "https://example.com", icon: Globe2, maxLength: 100 },
    { name: "x_url" as const, label: "X / Twitter", placeholder: "https://x.com/username", icon: ArrowUpRight, maxLength: 50 },
    { name: "instagram_url" as const, label: "Instagram", placeholder: "https://www.instagram.com/username", icon: Instagram, maxLength: 50 },
  ];
  return (
    <div className="profile-page profile-editor">
      <Link className="profile-back" href="/dashboard/profile"><ArrowLeft size={15} />プロフィールに戻る</Link>
      <div className="page-heading"><div><p className="eyebrow">PROFILE SETTINGS</p><h1>プロフィールを編集<span className="heading-dot">.</span></h1><p>あなたのことを、トレーダー仲間に。</p></div></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="profile-edit-layout">
          <aside className="terminal-panel profile-photo-panel">
            <p className="eyebrow">PROFILE PHOTO</p>
            <h2>プロフィール画像</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="profile-photo-trigger" disabled={isLoading} aria-label="プロフィール画像を変更">
                  <Avatar className="profile-edit-avatar"><AvatarImage src={profile.avatar || undefined} alt={profile.nickname || "プロフィール画像"} /><AvatarFallback>{nickname?.substring(0, 1) || <UserRound size={38} />}</AvatarFallback></Avatar>
                  <span className="profile-camera">{isLoading ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem disabled={isLoading} onClick={() => profileImage.current?.click()}><Camera size={15} />画像を変更する</DropdownMenuItem>
                <DropdownMenuItem disabled={isLoading || !profile.avatar} onClick={deleteImage} className="text-red-400"><Trash2 size={15} />画像を削除する</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="profile-photo-name">{nickname || "名無し"}</p>
            {profile.account && <p className="profile-handle">@{profile.account}</p>}
            <Button type="button" variant="outline" className="profile-photo-button" onClick={() => profileImage.current?.click()} disabled={isLoading}><Camera size={15} />画像を変更</Button>
            <p className="profile-field-hint">画像の変更はすぐに保存されます。</p>
            <Input ref={profileImage} className="hidden" type="file" accept="image/*" aria-label="プロフィール画像を選択" disabled={isLoading} onChange={handleImageChange} />
          </aside>
          <div className="profile-edit-content">
            <fieldset disabled={isLoading}>
              <section className="terminal-panel profile-form-panel">
                <div className="profile-form-section-title"><span><UserRound size={19} /></span><div><p className="eyebrow">ABOUT YOU</p><h2>基本情報</h2></div></div>
                <FormField control={form.control} name="nickname" render={({ field }) => (
                  <FormItem><div className="profile-field-heading"><FormLabel>ニックネーム <span className="profile-required">必須</span></FormLabel><span>{nickname?.length ?? 0} / 20</span></div><FormControl><Input placeholder="ニックネームを入力" maxLength={20} autoComplete="nickname" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem><div className="profile-field-heading"><FormLabel>自己紹介</FormLabel><span>{bio?.length ?? 0} / 300</span></div><FormControl><Textarea rows={6} maxLength={300} placeholder="トレードスタイルや興味のある銘柄など、自由にご紹介ください。" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </section>
              <section className="terminal-panel profile-form-panel">
                <div className="profile-form-section-title"><span><Globe2 size={19} /></span><div><p className="eyebrow">CONNECT</p><h2>ウェブサイト・SNS</h2></div><span className="profile-optional">任意</span></div>
                {socialFields.map(({ name, label, placeholder, icon: Icon, maxLength }) => <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem><FormLabel className="profile-social-label"><Icon size={15} />{label}</FormLabel><FormControl><Input placeholder={placeholder} maxLength={maxLength} inputMode="url" autoCapitalize="none" spellCheck={false} {...field} /></FormControl><FormMessage /></FormItem>
                )} />)}
              </section>
            </fieldset>
            <div className="profile-save-bar"><p>基本情報・SNSは保存後に反映されます。</p><div><Button type="button" variant="outline" disabled={isLoading} onClick={() => router.push("/dashboard/profile")}>キャンセル</Button><Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{isLoading ? "更新中..." : "変更を保存"}</Button></div></div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProfileForm;
