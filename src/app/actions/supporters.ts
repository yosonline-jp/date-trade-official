"use server";

export const getBuyMeSupports = async () => {
  // curl https://developers.buymeacoffee.com/api/v1/subscriptions?status=active \
  // -H "Authorization: Bearer ACCESS_TOKEN" \
  // -X GET
  const supporters = await fetch(
    "https://api.buymeacoffee.com/v1/subscriptions?status=active",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.BUYME_API_KEY}`,
      },
    }
  );

  console.log(supporters);

  return supporters.json();
};
