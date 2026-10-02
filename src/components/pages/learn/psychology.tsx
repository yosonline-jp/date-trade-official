import { LearningPage } from "./learning-page";
import { Separator } from "@/components/ui/separator";
export default function Lesson({ dashboard = false }: { dashboard?: boolean }) {
return <LearningPage topic="psychology" dashboard={dashboard} title="メンタル管理" subtitle="デイトレに必要な心理面を鍛える" intro={<p>デイトレードでは「心の安定」が勝ち続けるための鍵です。
				感情に流されず冷静に判断できるようになることが、最も重要なスキルの一つです。</p>} sections={["なぜメンタル管理が重要なのか？","トレードで陥りやすい心理的な落とし穴","メンタルを鍛えるための実践的トレーニング","メンタルが崩れたときのリセット方法","プロトレーダーに学ぶメンタル習慣"]}>
<section className="learning-section" id="lesson-1"><header><span>01</span><h2>なぜメンタル管理が重要なのか？</h2></header><div className="learning-section-content">
					<p>
						デイトレードは、常に価格が変動する不確実な環境での戦いです。
						どんなに優れた戦略を持っていても、「焦り」「欲」「恐怖」に支配されると、
						その戦略を守ることができなくなります。
					</p>
					<p>
						安定して勝てるトレーダーは、まず「メンタルの安定」を最優先にしています。
						メンタルが安定していれば、損切りも冷静に行え、次のチャンスを逃しません。
					</p>
				</div></section>
<section className="learning-section" id="lesson-2"><header><span>02</span><h2>トレードで陥りやすい心理的な落とし穴</h2></header><div className="learning-section-content">
					<ul className="list-disc pl-6 space-y-2">
						<li>
							<strong>損失回避バイアス：</strong>
							「損したくない」という心理が損切りを遅らせ、結果的に損失を拡大させる。
						</li>
						<li>
							<strong>報酬追求バイアス：</strong>
							勝った直後に「もっと稼げる」と感じ、無理なエントリーをしてしまう。
						</li>
						<li>
							<strong>後悔回避：</strong>
							「さっき買っておけば…」という思考が焦りを生み、冷静な判断を妨げる。
						</li>
						<li>
							<strong>ギャンブル化：</strong>
							連敗後に「取り返したい」という気持ちが膨らみ、ルールを破ってしまう。
						</li>
					</ul>
				</div></section>
<section className="learning-section" id="lesson-3"><header><span>03</span><h2>メンタルを鍛えるための実践的トレーニング</h2></header><div className="learning-section-content">
					<ol className="list-decimal pl-6 space-y-2">
						<li>
							<strong>トレード日誌をつける：</strong>
							感情の動きを記録し、自分の「弱点パターン」を可視化する。
						</li>
						<li>
							<strong>ルール化と自動化：</strong>
							エントリー・損切り・利確を明確に決め、感情が入る余地を減らす。
						</li>
						<li>
							<strong>呼吸と間を取る：</strong>
							エントリー前に深呼吸をし、5秒間の間を置く。衝動トレードを防ぐ。
						</li>
						<li>
							<strong>現実的な期待値を設定：</strong>
							「毎日勝つ」よりも「トータルで勝つ」を意識する。
						</li>
						<li>
							<strong>取引量をコントロール：</strong>
							不安を感じるロットサイズを避け、心が安定する範囲でトレードする。
						</li>
					</ol>
				</div></section>
<section className="learning-section" id="lesson-4"><header><span>04</span><h2>メンタルが崩れたときのリセット方法</h2></header><div className="learning-section-content">
					<p>
						どんなトレーダーでも、メンタルが乱れる日はあります。
						そのままトレードを続けると、さらに損失が膨らむリスクが高まります。
					</p>
					<ul className="list-disc pl-6 space-y-2">
						<li>いったんパソコンから離れ、深呼吸や散歩をする</li>
						<li>チャートを閉じて1日休む勇気を持つ</li>
						<li>
							大きな損失を出したときは、金額ではなく「原因分析」に集中する
						</li>
						<li>信頼できる仲間やメンターに相談する</li>
					</ul>
					<p>
						大切なのは「再起の早さ」ではなく、「再発を防ぐ学び」です。
						焦らずにリセットし、冷静さを取り戻すことが最優先です。
					</p>
				</div></section>
<section className="learning-section" id="lesson-5"><header><span>05</span><h2>プロトレーダーに学ぶメンタル習慣</h2></header><div className="learning-section-content">
					<ul className="list-disc pl-6 space-y-2">
						<li>毎日同じ時間に相場を確認し、規則的な生活リズムを維持する</li>
						<li>トレード結果に一喜一憂せず、ルール遵守を成功とみなす</li>
						<li>「勝ち負け」ではなく「再現性」を重視する</li>
						<li>精神的な負担を減らすために、チャートの見過ぎを防ぐ</li>
					</ul>
					<Separator className="my-3" />
					<p>
						安定して勝ち続けるトレーダーほど、シンプルで冷静なメンタル管理を徹底しています。
						トレードを「仕事」として捉え、淡々とこなす姿勢が長期的な成功を支えています。
					</p>
				</div></section>
<p className="learning-disclaimer">
				※
				本ページは心理的サポートの参考情報です。投資判断はご自身の責任で行ってください。
			</p>
</LearningPage>;
}
