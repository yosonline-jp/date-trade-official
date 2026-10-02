"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// <!-- Finlogix Widget BEGIN-->
// <div class="finlogix-container"></div>
// <script type="text/javascript" src="https://widget.finlogix.com/Widget.js"></script>
// <script type="text/javascript">
// 		Widget.init({
// 				widgetId: "7fb147bc-bf62-4921-ae6c-01652d34b9fc",
// 				type: "BigChart",
// 				language: "ja",
// 				symbolName: "Apple",
// 				hasSearchBar: false,
// 				hasSymbolName: false,
// 				hasSymbolChange: false,
// 				hasButton: false,
// 				chartShape: "candles",
// 				timePeriod: "D1",
// 				isAdaptive: true
// 		});
// </script>
// <!-- Finlogix Widget END-->

type FinlogixChartProps = {
	widgetId?: string;
	type?: string;
	symbolName?: string;
	language?: string;
	hasSearchBar?: boolean;
	hasSymbolName?: boolean;
	hasSymbolChange?: boolean;
	hasButton?: boolean;
	chartShape?: string;
	timePeriod?: string;
	isAdaptive?: boolean;
};

export default function FinlogixChart({
	widgetId = "7fb147bc-bf62-4921-ae6c-01652d34b9fc",
	type = "BigChart",
	language = "ja",
	symbolName = "JP225",
	hasSearchBar = true,
	hasSymbolName = true,
	hasSymbolChange = true,
	hasButton = false,
	chartShape = "candles",
	timePeriod = "D1",
	isAdaptive = true,
}: FinlogixChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadWidget = async () => {
			try {
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
								symbolName,
								hasSearchBar,
								hasSymbolName,
								hasSymbolChange,
								hasButton,
								chartShape,
								timePeriod,
								isAdaptive,
							});
							setLoading(false);
						}
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
		symbolName,
		hasSearchBar,
		hasSymbolName,
		hasSymbolChange,
		hasButton,
		chartShape,
		timePeriod,
		isAdaptive,
	]);

	if (error) {
		return (
			<div className="p-4 bg-gray-100 text-center text-gray-700 rounded-md">
				この銘柄のチャートをお見せできません。
			</div>
		);
	}

	return (
		<div className="mb-8 w-full h-[700px] rounded-lg">
			{loading && (
				<div className="flex items-center justify-center h-full">
					<Loader2 className="w-12 h-12 animate-spin" />
				</div>
			)}
			<div
				ref={containerRef}
				className="finlogix-container"
				style={{ display: loading ? "none" : "block" }}
			/>
		</div>
	);
}
