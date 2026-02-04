import { StudioNav } from "@/components/StudioNav";
import { ScriptClient } from "@/app/studio/script/ScriptClient";

export default function ScriptPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">脚本工厂</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          按 10–12 分钟结构分段写稿，并把对照卡来源自动带进脚本，方便核对出处。
        </p>
        <StudioNav />
      </div>
      <ScriptClient />
    </div>
  );
}

