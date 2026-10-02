"use client";

const ShareBtn = ({ content, url }: { content: string; url: string }) => {
  const shareFriendCode = async (type: "x" | "line") => {
    const pageUrl = encodeURIComponent(url);
    if (type === "x") {
      const text = encodeURIComponent(
        `${content}\n\n#GodotGames #GodotTutorial #Godot #GodotEngine #development #gamedev #indiedev\n\n`
      );
      const twitterShareUrl = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${text}`;
      window.open(twitterShareUrl, "_blank");
    } else if (type === "line") {
      const text = encodeURIComponent(
        `${content}\n\n#GodotGames #GodotTutorial #Godot #GodotEngine #development #gamedev #indiedev\n\n`
      );
      const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${pageUrl}&text=${text}`;
      window.open(lineShareUrl, "_blank");
    }
  };

  return (
    <div className="flex flex-row space-x-2">
      <button
        type="button"
        className="rounded-md bg-black px-3.5 py-2.5 text-xs font-bold text-white hover:bg-black"
        onClick={() => shareFriendCode("x")}
      >
        X
      </button>
      <button
        type="button"
        className=" rounded-md bg-green-500 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-green-600"
        onClick={() => shareFriendCode("line")}
      >
        L
      </button>
    </div>
  );
};

export default ShareBtn;
