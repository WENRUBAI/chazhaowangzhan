import { StudioNav } from "@/components/StudioNav";
import { ReaderClient } from "@/app/studio/reader/ReaderClient";

export default function ReaderPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const urlParam = searchParams?.url;
  const url = Array.isArray(urlParam) ? urlParam[0] : urlParam;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">古籍阅读器</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          把古籍页面转成可复制的文字版，并保留出处与链接，方便做对照卡和写稿。
        </p>
        <StudioNav />
      </div>
      <ReaderClient url={url ?? ""} />
    </div>
  );
}

