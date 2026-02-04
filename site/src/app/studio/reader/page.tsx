import { ReaderClient } from "@/app/studio/reader/ReaderClient";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function ReaderPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const urlParam = searchParams?.url;
  const url = Array.isArray(urlParam) ? urlParam[0] : urlParam;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="古籍阅读器"
        description="把古籍页面转成可复制的文字版，并保留出处与链接，方便做对照卡和写稿。"
      />
      <ReaderClient url={url ?? ""} />
    </div>
  );
}
