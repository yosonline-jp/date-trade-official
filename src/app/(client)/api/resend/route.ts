/** The unused legacy GET endpoint must not trigger outbound email. */
export async function GET() {
  return Response.json({error:"このエンドポイントは廃止されました。"},{status:410});
}
