import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, ArrowRightLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
    baseYield: number
    targetYield: number
    onChange: (newYield: number) => void
}

export function ProductionScaler({ baseYield, targetYield, onChange }: Props) {
    const isScaling = targetYield !== baseYield

    const toggleScaling = () => {
        if (isScaling) {
            onChange(baseYield)
        } else {
            // No action needed, user will change value
        }
    }

    const handleTargetChange = (val: number) => {
        if (val >= 0) onChange(val)
    }

    return (
        <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-lg border border-slate-200">
            <Button
                variant={isScaling ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs gap-1 ${isScaling ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "text-slate-500"}`}
                onClick={toggleScaling}
            >
                <ArrowRightLeft className="h-3 w-3" />
                {isScaling ? "Escalando" : "Escalar"}
            </Button>

            <div className="flex items-center gap-1 pl-1 pr-2">
                <Users className="h-3 w-3 text-slate-400" />
                {isScaling ? (
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-500">Base: {baseYield} →</span>
                        <Input
                            type="number"
                            className="h-6 w-14 text-center text-xs font-bold bg-white border-indigo-200 focus-visible:ring-indigo-500"
                            value={targetYield}
                            onChange={(e) => handleTargetChange(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                ) : (
                    <span className="text-xs font-medium text-slate-600">{baseYield} Raciones</span>
                )}
            </div>

            {isScaling && targetYield !== baseYield && (
                <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 text-indigo-600 bg-white ml-1">
                    x{(targetYield / baseYield).toFixed(1)}
                </Badge>
            )}
        </div>
    )
}
