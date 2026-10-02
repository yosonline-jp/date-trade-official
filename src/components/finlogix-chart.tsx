"use client";

import { useEffect, useRef, useState } from "react";

type FinlogixWidgetProps = {
	widgetId?: string;
	type?: string;
	language?: string;
	showBrand?: boolean;
	isShowTradeButton?: boolean;
	isShowBeneathLink?: boolean;
	isShowDataFromACYInfo?: boolean;
	symbolName?: string;
	hasSearchBar?: boolean;
	hasSymbolName?: boolean;
	hasSymbolChange?: boolean;
	hasButton?: boolean;
	chartShape?: string;
	timePeriod?: string;
	isAdaptive?: boolean;
};

export default function FinlogixWidget({
	widgetId = "7fb147bc-bf62-4921-ae6c-01652d34b9fc",
	type = "BigChart",
	language = "ja",
	showBrand = true,
	isShowTradeButton = true,
	isShowBeneathLink = true,
	isShowDataFromACYInfo = true,
	symbolName = "Apple",
	hasSearchBar = false,
	hasSymbolName = false,
	hasSymbolChange = false,
	hasButton = false,
	chartShape = "candles",
	timePeriod = "D1",
	isAdaptive = true,
}: FinlogixWidgetProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadWidget = async () => {
			try {
				// 外部スクリプトを読み込む
				const script = document.createElement("script");
				script.src = "https://widget.finlogix.com/Widget.js";
				script.async = true;

				script.onload = () => {
					try {
						if (window.Widget && containerRef.current && isMounted) {
							window.Widget.init({
								widgetId,
								type,
								language,
								showBrand,
								isShowTradeButton,
								isShowBeneathLink,
								isShowDataFromACYInfo,
								symbolName,
								hasSearchBar,
								hasSymbolName,
								hasSymbolChange,
								hasButton,
								chartShape,
								timePeriod,
								isAdaptive,
							});
						}

						console.log(window.Widget);
					} catch (e) {
						console.error("Finlogix Widget Error:", e);
						if (isMounted) setError(true);
					}
				};

				script.onerror = () => {
					if (isMounted) setError(true);
				};

				document.body.appendChild(script);
			} catch (e) {
				console.error("Finlogix Widget Load Error:", e);
				if (isMounted) setError(true);
			}
		};

		loadWidget();

		return () => {
			isMounted = false;
		};
	}, [
		widgetId,
		type,
		language,
		showBrand,
		isShowTradeButton,
		isShowBeneathLink,
		isShowDataFromACYInfo,
		symbolName,
		hasSearchBar,
		hasSymbolName,
		hasSymbolChange,
		hasButton,
		chartShape,
		timePeriod,
		isAdaptive,
	]);

	// if (loading) {
	// 	return (
	// 		<div className="p-4 bg-gray-50 text-center text-gray-600 rounded-md">
	// 			チャートを読み込み中です…
	// 		</div>
	// 	);
	// }

	if (error) {
		return (
			<div className="p-4 bg-gray-100 text-center text-gray-700 rounded-md">
				この銘柄のチャートをお見せできません。
			</div>
		);
	}

	return (
		<div className="mb-8 w-full h-[500px]">
			<div ref={containerRef} className="finlogix-container" />
		</div>
	);
}
