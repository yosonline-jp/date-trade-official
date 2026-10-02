import React from "react";
import { Vortex } from "../ui/vortex";

export function VortexMain() {
	return (
		<div className="w-full h-[32rem]">
			<div className="absolute left-0 mx-auto rounded-md h-[32rem] overflow-hidden w-full">
				<Vortex className="flex items-center flex-col justify-center px-2 md:px-10 py-4 h-full w-screen">
					<h1 className="text-2xl md:text-4xl font-bold text-center">
						デイトレードの実績を
						<br className="md:hidden" />
						記録・分析しよう！
					</h1>
					<h2 className="text-sm md:text-2xl max-w-xl mt-6 text-center">
						デイトレード.netは、あなたのトレード結果をシンプルに管理できるアプリ。
						<br />
						損益、勝率、取引メモを自動で整理し、次のトレードに活かそう！
					</h2>
				</Vortex>
			</div>
		</div>
	);
}
