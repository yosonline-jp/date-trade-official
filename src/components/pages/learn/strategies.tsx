import { LearningPage } from "./learning-page";
import { Separator } from "@/components/ui/separator";
export default function Lesson({ dashboard = false }: { dashboard?: boolean }) {
return <LearningPage topic="strategies" dashboard={dashboard} title="トレード戦略" subtitle="スキャルピングや順張りなど実践的な戦略" intro={<p>デイトレードでは、短時間で利益を狙うための「戦略」が重要です。
				ここでは代表的なトレード手法を紹介し、それぞれの特徴と注意点を学びましょう。</p>} sections={["トレード戦略とは？","スキャルピング（数秒〜数分の短期取引）","順張り（トレンドフォロー）","逆張り（リバウンド狙い）","ブレイクアウト戦略（節目突破の瞬間を狙う）","自分に合った戦略を選ぶポイント"]}>
<section className="learning-section" id="lesson-1"><header><span>01</span><h2>トレード戦略とは？</h2></header><div className="learning-section-content">
					<p>
						トレード戦略とは、「どのタイミングで売買を行うか」を決めるための明確なルールです。
						感情に流されず、一定の基準に基づいて取引することで、安定した成果を目指します。
					</p>
					<p>
						自分に合った戦略を見つけるには、時間・リスク許容度・資金量を考慮することが大切です。
					</p>
				</div></section>
<section className="learning-section" id="lesson-2"><header><span>02</span><h2>スキャルピング（数秒〜数分の短期取引）</h2></header><div className="learning-section-content">
					<p>
						スキャルピングは、数秒〜数分の間に小さな値幅を積み重ねて利益を出す超短期トレードです。
						高い集中力とスピードが求められます。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>1回あたりの利益は数円〜数十円程度</li>
						<li>1日に数十〜数百回取引することもある</li>
						<li>板情報・歩み値・出来高を重視する</li>
					</ul>
					<p>
						取引コスト（手数料やスプレッド）が大きな影響を与えるため、低コストの証券会社を選ぶことが重要です。
					</p>
				</div></section>
<section className="learning-section" id="lesson-3"><header><span>03</span><h2>順張り（トレンドフォロー）</h2></header><div className="learning-section-content">
					<p>
						順張りは、上昇トレンドなら「買い」、下降トレンドなら「売り」で流れに乗る戦略です。
						「トレンドは継続する」という考えに基づいています。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>移動平均線の傾きやブレイクアウトを確認してエントリー</li>
						<li>損切りラインを明確にして、トレンド転換に注意</li>
						<li>ニュースや出来高を合わせて判断するのも有効</li>
					</ul>
					<p>
						トレンドを捉えられれば大きな利益を得られますが、ダマシ（急反転）に注意が必要です。
					</p>
				</div></section>
<section className="learning-section" id="lesson-4"><header><span>04</span><h2>逆張り（リバウンド狙い）</h2></header><div className="learning-section-content">
					<p>
						逆張りは、急落後の反発や、過熱した上昇後の反転を狙う戦略です。
						「行き過ぎた価格は戻る」という発想でエントリーします。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>RSI（相対力指数）やボリンジャーバンドを活用</li>
						<li>下落トレンド中の逆張りは危険（落ちるナイフ）</li>
						<li>小さく入り、反発を確認してから買い増しするのが安全</li>
					</ul>
					<p>
						タイミングを間違えると損失が拡大しやすいため、初心者は慎重に使う必要があります。
					</p>
				</div></section>
<section className="learning-section" id="lesson-5"><header><span>05</span><h2>ブレイクアウト戦略（節目突破の瞬間を狙う）</h2></header><div className="learning-section-content">
					<p>
						ブレイクアウト戦略は、株価が「重要なライン（高値・安値・レジスタンス）」を超えた瞬間にエントリーする手法です。
						トレンド初動を捉えることができます。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>出来高の増加を伴うブレイクは信頼性が高い</li>
						<li>ダマシを避けるため、終値でのブレイク確認が有効</li>
						<li>短期トレンド転換時に特に効果的</li>
					</ul>
					<p>
						トレンドフォローの一種として、初心者にも比較的取り組みやすい戦略です。
					</p>
				</div></section>
<section className="learning-section" id="lesson-6"><header><span>06</span><h2>自分に合った戦略を選ぶポイント</h2></header><div className="learning-section-content">
					<ol className="list-decimal pl-6 space-y-1">
						<li>取引に使える時間（リアルタイム対応できるか）</li>
						<li>資金量とリスク許容度</li>
						<li>性格（慎重型か、攻めるタイプか）</li>
						<li>得意な分析手法（チャート・ニュース・ファンダ）</li>
					</ol>
					<Separator className="my-3" />
					<p>
						まずは1つの戦略に集中して検証を行い、
						「自分の得意パターン」を見つけていくことが成功の近道です。
					</p>
				</div></section>
<p className="learning-disclaimer">
				※
				本ページの内容は投資助言を目的としたものではありません。投資は自己判断で行いましょう。
			</p>
</LearningPage>;
}
