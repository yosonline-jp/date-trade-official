import {createClient} from "@/utils/supabase/server";
export async function GET(request:Request) {
 const params=new URL(request.url).searchParams;
 const requested=Number(params.get("page")||1);
 const page=Number.isFinite(requested)?Math.max(1,Math.min(1000,Math.floor(requested))):1;
 const search=(params.get("search")||"").slice(0,80).replace(/[%_,().]/g,"");
 const db=await createClient();
 let query=db.from("stocks").select("*").order("code").range((page-1)*20,page*20-1);
 if(search)query=query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
 const {data,error}=await query;
 if(error)return Response.json({error:"銘柄を取得できませんでした。"},{status:503});
 return Response.json(data);
}
