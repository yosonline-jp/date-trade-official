"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type FinlogixEconomicCalendarProps = {
	widgetId?: string;
	type?: string;
	language?: string;
	showBrand?: boolean;
	isShowTradeButton?: boolean;
	isShowBeneathLink?: boolean;
	isShowDataFromACYInfo?: boolean;
	isAdaptive?: boolean;
};

export default function FinlogixEconomicCalendar({
	widgetId = "7fb147bc-bf62-4921-ae6c-01652d34b9fc",
	type = "EconomicCalendar",
	language = "ja",
	showBrand = true,
	isShowTradeButton = true,
	isShowBeneathLink = true,
	isShowDataFromACYInfo = true,
	isAdaptive = true,
}: FinlogixEconomicCalendarProps) {
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
								showBrand,
								isShowTradeButton,
								isShowBeneathLink,
								isShowDataFromACYInfo,
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
		showBrand,
		isShowTradeButton,
		isShowBeneathLink,
		isShowDataFromACYInfo,
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
		<div className="mb-8 w-full h-[500px] rounded-lg overflow-hidden">
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
