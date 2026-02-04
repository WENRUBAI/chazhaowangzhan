import { ScriptClient } from "@/app/studio/script/ScriptClient";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function ScriptPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="脚本工厂"
        description="按 10–12 分钟结构分段写稿，并把对照卡来源自动带进脚本，方便核对出处。"
      />
      <ScriptClient />
    </div>
  );
}

