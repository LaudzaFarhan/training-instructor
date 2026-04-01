import React, { useMemo } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card } from "../../common/Card";

export const SimplePreviewView = ({ oldCurriculum, newCurriculum }) => {
    const differences = useMemo(() => {
        const diffs = [];
        const getUnits = (curr) =>
            new Map((curr || []).map((u) => [u.unitName, u]));
        const oldMap = getUnits(oldCurriculum);
        const newMap = getUnits(newCurriculum);
        const allNames = new Set([...oldMap.keys(), ...newMap.keys()]);
        allNames.forEach((name) => {
            const o = oldMap.get(name);
            const n = newMap.get(name);
            if (!o && n)
                diffs.push({ type: "Added", msg: `Unit "${name}" was added.` });
            else if (o && !n)
                diffs.push({ type: "Deleted", msg: `Unit "${name}" was removed.` });
            else if (o && n) {
                const getChalls = (u) =>
                    new Map(u.challenges.map((c) => [c.challengeName, c]));
                const ocMap = getChalls(o);
                const ncMap = getChalls(n);
                const allChalls = new Set([...ocMap.keys(), ...ncMap.keys()]);
                allChalls.forEach((cName) => {
                    if (!ocMap.get(cName) && ncMap.get(cName))
                        diffs.push({
                            type: "Added",
                            msg: `Challenge "${cName}" added to ${name}.`,
                        });
                    else if (ocMap.get(cName) && !ncMap.get(cName))
                        diffs.push({
                            type: "Deleted",
                            msg: `Challenge "${cName}" removed from ${name}.`,
                        });
                });
            }
        });
        return diffs;
    }, [oldCurriculum, newCurriculum]);
    return (
        <Card className="h-full overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
                Curriculum Diff Report
            </h3>
            {differences.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                    No structural differences found.
                </div>
            ) : (
                <div className="space-y-3">
                    {differences.map((diff, i) => (
                        <div
                            key={i}
                            className={`p-3 rounded-lg border-l-4 flex items-center gap-3 ${diff.type === "Added"
                                    ? "bg-emerald-50 border-emerald-500"
                                    : "bg-red-50 border-red-500"
                                }`}>
                            {diff.type === "Added" ? (
                                <PlusCircle className="text-emerald-600" />
                            ) : (
                                <Trash2 className="text-red-600" />
                            )}
                            <span className="text-slate-700">{diff.msg}</span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};
