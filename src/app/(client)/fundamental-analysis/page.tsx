import AnalysisForm from "@/components/analysis-form";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "ファンダメンタル分析 | デイトレード.net",
	description:
		"ファンダメンタル分析は、企業の財務状況や経済状況を分析して、その企業の株式の適正価格を評価する手法です。収益性、財務健全性、市場での競争力、マクロ経済要因などを考慮します。",
};

const AIConsultationPage = async () => {
	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">
				ファンダメンタル分析とは？
			</h1>
			<div className="space-y-6">
				<Card className="shadow-sm border border-gray-100 hover:shadow-md transition-all">
					<CardHeader>
						<h2 className="text-2xl font-semibold">
							ファンダメンタル分析とは？
						</h2>
					</CardHeader>
					<CardContent>
						<p className="">
							ファンダメンタル分析は、企業の財務状況や経済状況を分析して、その企業の株式の適正価格を評価する手法です。主に以下の要素を考慮します：
						</p>
						<ul className="list-dis`c list-inside mt-4 ">
							<li>収益性（売上高、純利益など）</li>
							<li>財務健全性（負債比率、自己資本比率など）</li>
							<li>市場での競争力</li>
							<li>マクロ経済要因（景気動向、金利など）</li>
						</ul>
					</CardContent>
				</Card>

				<Card className="shadow-sm border border-gray-100 hover:shadow-md transition-all">
					<CardHeader>
						<h2 className="text-2xl font-semibold">主な指標</h2>
					</CardHeader>
					<CardContent>
						<p className="">
							ファンダメンタル分析でよく使用される指標には以下があります：
						</p>
						<ul className="list-disc list-inside mt-4  space-y-2">
							<li>
								<Badge className="bg-blue-100 text-blue-800">PER</Badge>
								（株価収益率）：株価が1株当たりの利益の何倍かを示す指標。
							</li>
							<li>
								<Badge className="bg-green-100 text-green-800">PBR</Badge>
								（株価純資産倍率）：株価が1株当たりの純資産の何倍かを示す指標。
							</li>
							<li>
								<Badge className="bg-yellow-100 text-yellow-800">ROE</Badge>
								（自己資本利益率）：自己資本に対する純利益の割合を示す指標。
							</li>
							<li>
								<Badge className="bg-red-100 text-red-800">配当利回り</Badge>
								：株価に対する年間配当金の割合を示す指標。
							</li>
						</ul>
					</CardContent>
				</Card>

				<Card className="shadow-sm border border-gray-100 hover:shadow-md transition-all">
					<CardHeader>
						<h2 className="text-2xl font-semibold">分析の手順</h2>
					</CardHeader>
					<CardContent>
						<p className="">
							ファンダメンタル分析を行う際の基本的な手順は以下の通りです：
						</p>
						<ol className="list-decimal list-inside mt-4 ">
							<li>企業の財務諸表を確認する。</li>
							<li>業界や市場の動向を調査する。</li>
							<li>経済指標や金利動向を考慮する。</li>
							<li>収集した情報を基に株式の適正価格を評価する。</li>
						</ol>
					</CardContent>
				</Card>
				<AnalysisForm />
			</div>
		</div>
	);
};
export default AIConsultationPage;
