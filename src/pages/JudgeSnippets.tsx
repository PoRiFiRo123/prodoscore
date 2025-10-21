import { JudgeSnippetsManager } from "@/components/JudgeSnippetsManager";

const JudgeSnippetsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Quick Snippets</h1>
      <JudgeSnippetsManager />
    </div>
  );
};

export default JudgeSnippetsPage;
