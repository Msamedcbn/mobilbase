import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

interface TelemetryPoint {
  timestamp: string;
  cpuLoad: number;
  memoryUsed: number;
  memoryTotal: number;
  apiRequestRate: number;
}

export async function GET() {
  // Guard access: only PLATFORM_OWNER and ADMIN allowed (Decision D11)
  const auth = requireRole(["PLATFORM_OWNER", "ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const points: TelemetryPoint[] = [];
    const now = new Date();
    
    // Generate exactly 30 data points representing 5-minute intervals (Decision D12)
    // Soft degradation / fallback is built-in: returns safe simulated data (Decision D10)
    for (let i = 29; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      
      // Generate smooth fluctuations using sine/cosine curves based on the index to look clean on graphs
      const baseCpu = 25 + Math.sin(i * 0.5) * 10;
      const randomCpu = Math.floor(Math.random() * 8) - 4;
      const cpuLoad = Math.max(5, Math.min(95, Math.round(baseCpu + randomCpu)));

      const memoryTotal = 8.0;
      const baseMem = 3.2 + Math.cos(i * 0.4) * 0.5;
      const randomMem = parseFloat((Math.random() * 0.2 - 0.1).toFixed(2));
      const memoryUsed = parseFloat(Math.max(1.0, Math.min(7.8, baseMem + randomMem)).toFixed(2));

      const baseApi = 35 + Math.sin(i * 0.8) * 15;
      const randomApi = Math.floor(Math.random() * 10) - 5;
      const apiRequestRate = Math.max(0, Math.round(baseApi + randomApi));

      points.push({
        timestamp: time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        cpuLoad,
        memoryUsed,
        memoryTotal,
        apiRequestRate,
      });
    }

    return NextResponse.json({ success: true, telemetry: points });
  } catch (error: any) {
    console.error("[studio/infrastructure] GET", error);
    // Soft degradation: return safe fallback even if generation fails (Decision D10)
    return NextResponse.json({
      success: true,
      telemetry: Array.from({ length: 30 }).map((_, i) => ({
        timestamp: `${i}:00`,
        cpuLoad: 20,
        memoryUsed: 3.0,
        memoryTotal: 8.0,
        apiRequestRate: 15,
      })),
    });
  }
}
