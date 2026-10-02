import { LearningPage } from "./learning-page";
import { Separator } from "@/components/ui/separator";
export default function Lesson({ dashboard = false }: { dashboard?: boolean }) {
return <LearningPage topic="basics" dashboard={dashboard} title="デイトレード基礎" subtitle="初心者向けの基礎知識を学ぼう" intro={<p>デイトレードは、1日の中で売買を完結させる短期取引のスタイルです。
				ここでは、初心者の方が安全に始めるための基本的な考え方を紹介します。</p>} sections={["デイトレードとは？","必要な環境を整えよう","基本的な注文の種類","初心者がやりがちな失敗","学び方のステップ"]}>
<section className="learning-section" id="lesson-1"><header><span>01</span><h2>デイトレードとは？</h2></header><div className="learning-section-content">
					<p>
						デイトレードとは、株式をその日のうちに「買って売る」または「売って買い戻す」ことで
						利益を狙う取引スタイルです。翌日にポジションを持ち越さないのが特徴で、
						相場の短期的な値動きを利用します。
					</p>
					<p>
						取引時間中のわずかな値動き（1〜2％程度）を狙うため、
						素早い判断力とリスク管理が求められます。
					</p>
				</div></section>
<section className="learning-section" id="lesson-2"><header><span>02</span><h2>必要な環境を整えよう</h2></header><div className="learning-section-content">
					<p>
						デイトレードを行うには、以下のような環境を整えることが重要です。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>高速で安定したインターネット回線</li>
						<li>複数のチャートを同時に表示できるPCモニター</li>
						<li>証券会社の取引ツール（例：SBI証券のHYPER SBIなど）</li>
						<li>ニュース・株価速報を確認できる情報サイト</li>
					</ul>
					<p>
						これらを整えることで、タイムラグなく価格の変動に対応できるようになります。
					</p>
				</div></section>
<section className="learning-section" id="lesson-3"><header><span>03</span><h2>基本的な注文の種類</h2></header><div className="learning-section-content">
					<p>
						デイトレードでは、発注方法を理解することが非常に大切です。
						特に初心者は、以下の3つをまず覚えましょう。
					</p>
					<ul className="list-decimal pl-6 space-y-1">
						<li>
							<strong>成行注文：</strong> 価格を指定せず、すぐに約定する注文。
						</li>
						<li>
							<strong>指値注文：</strong> 自分が希望する価格でのみ約定する注文。
						</li>
						<li>
							<strong>逆指値注文：</strong>{" "}
							一定の価格に達したら自動的に売買する注文（損切りに便利）。
						</li>
					</ul>
					<p>これらを使い分けることで、思わぬ損失を防ぎやすくなります。</p>
				</div></section>
<section className="learning-section" id="lesson-4"><header><span>04</span><h2>初心者がやりがちな失敗</h2></header><div className="learning-section-content">
					<ul className="list-disc pl-6 space-y-1">
						<li>損切りが遅れて、損失が拡大してしまう</li>
						<li>1つの銘柄に集中しすぎて、リスクを分散できない</li>
						<li>感情的になって取引を続けてしまう</li>
						<li>チャートや出来高を確認せずにエントリーしてしまう</li>
					</ul>
					<p>
						失敗を防ぐためには、「ルールを決めて守る」ことが何よりも大切です。
					</p>
				</div></section>
<section className="learning-section" id="lesson-5"><header><span>05</span><h2>学び方のステップ</h2></header><div className="learning-section-content">
					<ol className="list-decimal pl-6 space-y-1">
						<li>少額またはデモトレードで練習する</li>
						<li>チャート分析（ローソク足・出来高・移動平均線など）を学ぶ</li>
						<li>ニュースや決算を通じて「材料と値動き」の関係を理解する</li>
						<li>トレード日誌をつけて、毎日の振り返りを行う</li>
					</ol>
					<Separator className="my-3" />
					<p>継続的な学習と記録の積み重ねが、安定したトレード力を育てます。</p>
				</div></section>
<p className="learning-disclaimer">
				※
				本ページの内容は投資助言を目的としたものではありません。投資は自己責任で行いましょう。
			</p>
</LearningPage>;
}
