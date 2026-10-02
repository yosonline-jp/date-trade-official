import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export default function FundamentalIntroSection() {
	return (
		<section className="py-20">
			<div className="mx-auto">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold mb-4">
						ファンダメンタル分析で企業価値を見極める
					</h2>
					<p className="text-lg">
						企業の財務状況や業績をもとに、株価の適正価値を判断する分析方法を学べます。
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					<Card className="shadow-sm hover:shadow-md transition-all rounded-2xl">
						<CardHeader>
							<h3 className="text-xl font-semibold">基礎をしっかり理解</h3>
						</CardHeader>
						<CardContent>
							<p className="text-sm mb-4">
								ファンダメンタル分析の基礎から、初心者でも理解しやすい形で紹介します。
							</p>
							<div className="flex flex-wrap gap-2">
								<Badge className="bg-blue-100 text-blue-800">PER</Badge>
								<Badge className="bg-green-100 text-green-800">PBR</Badge>
								<Badge className="bg-yellow-100 text-yellow-800">ROE</Badge>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-sm hover:shadow-md transition-all rounded-2xl">
						<CardHeader>
							<h3 className="text-xl font-semibold">企業価値を見抜く力</h3>
						</CardHeader>
						<CardContent>
							<p className="text-sm mb-4">
								財務情報・業界動向・経済要因を総合的に判断して、割安株と成長企業を見つけるヒントを学べます。
							</p>
							<Badge className="bg-red-100 text-red-800">配当利回り</Badge>
						</CardContent>
					</Card>

					<Card className="shadow-sm hover:shadow-md transition-all rounded-2xl">
						<CardHeader>
							<h3 className="text-xl font-semibold">AIで効率分析</h3>
						</CardHeader>
						<CardContent>
							<p className="text-sm mb-4">
								AIが財務指標を自動で評価し、銘柄分析をサポート。初心者でも簡単に企業分析ができます。
							</p>
							<Link
								href="/fundamental-analysis"
								className="inline-flex items-center"
							>
								<Button>
									<ArrowRight className="w-4 h-4 ml-1" />
									分析ページへ
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
