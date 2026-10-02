"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Minimal input shape for each candle
export type CandleRaw = {
	high: number;
	low: number;
	open: number;
	close: number;
	ts: number; // unix seconds
	[k: string]: unknown;
};

// Shape passed to recharts (open/close grouped into an array)
export type CandleDatum = Omit<CandleRaw, "open" | "close"> & {
	openClose: [number, number];
	ema5?: number;
	ema25?: number;
	ema75?: number;
};

// Define the shape of the data
export type VolumeData = {
	timestamp: number;
	volume: number;
};

// Convert the provided data into the format suitable for the chart
const transformData = (
	timestamps: number[],
	volumes: number[]
): VolumeData[] => {
	return timestamps.map((timestamp, index) => ({
		timestamp,
		volume: volumes[index] || 0, // Replace null with 0 for missing data
	}));
};

export type VolumeChartData = {
	timestamps: number[];
	volumes: number[];
};

const VolumeChart: React.FC<{
	VolumeData: VolumeChartData;
	width?: number | string;
	height?: number;
}> = ({ VolumeData, width = "100", height = 300 }) => {
	const data = useMemo(
		() => transformData(VolumeData.timestamps, VolumeData.volumes),
		[VolumeData.timestamps, VolumeData.volumes]
	);

	return (
		<div className="rounded-lg bg-muted/30 border mt-8">
			<ResponsiveContainer width={`${Number(width)}%`} height={height}>
			<BarChart
				height={height}
				data={data}
				margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="#27374b" vertical={false} />
				<XAxis
					dataKey="timestamp"
					tickFormatter={(timestamp) =>
						new Date(timestamp * 1000).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
					}
					fontSize={12}
					stroke="#8096ae" tickLine={false} axisLine={false}
				/>
				<YAxis fontSize={12}
					stroke="#8096ae" tickLine={false} axisLine={false} />
				{/* change volume to 出来高 */}
				<Tooltip
					content={({ payload }) => {
						if (payload && payload.length) {
							const date = new Date(
								payload[0].payload.timestamp * 1000
							).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
							const volume = payload[0].payload.volume.toLocaleString();
							return (
								<div className="bg-secondary p-2 border rounded shadow text-sm">
									<p>{`日付: ${date}`}</p>
									<p>{`出来高: ${volume}`}</p>
								</div>
							);
						}
						return null;
					}}
				/>
				<Bar dataKey="volume" fill="#529f92" radius={[2, 2, 0, 0]} />
			</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default VolumeChart;
