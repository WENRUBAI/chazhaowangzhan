import { LibraryClient } from "@/app/studio/library/LibraryClient";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="材料库"
        description="把史料/研究/解读集中管理，并按朝代、人物、事件与相似维度检索。"
      />
      <LibraryClient />
    </div>
  );
}

