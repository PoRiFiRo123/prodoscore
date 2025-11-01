import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Eye, Code, Loader2, CheckCircle, XCircle } from "lucide-react";
import { markdownToHtml, createEmailTemplate } from "@/lib/emailService";

interface EmailComposerProps {
  onSend: (subject: string, content: string) => Promise<void>;
  defaultSubject?: string;
  defaultContent?: string;
}

export default function EmailComposer({ onSend, defaultSubject = "", defaultContent = "" }: EmailComposerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [content, setContent] = useState(defaultContent);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      setSendStatus("error");
      return;
    }

    setSending(true);
    setSendStatus("idle");

    try {
      await onSend(subject, content);
      setSendStatus("success");

      // Reset form after successful send
      setTimeout(() => {
        setSubject("");
        setContent("");
        setSendStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Send error:", error);
      setSendStatus("error");
    } finally {
      setSending(false);
    }
  };

  const htmlPreview = markdownToHtml(content);
  const fullEmailHtml = createEmailTemplate(htmlPreview, subject);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
          <CardDescription>
            Write your email using Markdown formatting. Use **bold**, *italic*, [links](url), and more!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              disabled={sending}
            />
          </div>

          {/* Markdown Editor/Preview */}
          <div className="space-y-2">
            <Label>Email Content</Label>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="write">
                  <Code className="h-4 w-4 mr-2" />
                  Write
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="mt-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your email content using Markdown...

**Examples:**
- **Bold text**
- *Italic text*
- [Link text](https://example.com)
- # Heading 1
- ## Heading 2
- ### Heading 3
- * Bullet point"
                  className="min-h-[400px] font-mono text-sm"
                  disabled={sending}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  💡 Tip: Use Markdown syntax for formatting. Switch to Preview to see how it looks.
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-2">
                <div className="min-h-[400px] border rounded-md p-4 bg-muted/20 overflow-auto">
                  {content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-20">
                      No content to preview. Start writing in the Write tab.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Markdown Cheatsheet */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Markdown Quick Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <code className="bg-background px-1 py-0.5 rounded">**bold**</code>
                  <span className="ml-1 text-muted-foreground">→ <strong>bold</strong></span>
                </div>
                <div>
                  <code className="bg-background px-1 py-0.5 rounded">*italic*</code>
                  <span className="ml-1 text-muted-foreground">→ <em>italic</em></span>
                </div>
                <div>
                  <code className="bg-background px-1 py-0.5 rounded">[link](url)</code>
                  <span className="ml-1 text-muted-foreground">→ link</span>
                </div>
                <div>
                  <code className="bg-background px-1 py-0.5 rounded"># Heading</code>
                  <span className="ml-1 text-muted-foreground">→ H1</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send Status */}
          {sendStatus === "success" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email sent successfully!
              </AlertDescription>
            </Alert>
          )}

          {sendStatus === "error" && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Failed to send email. Please check all fields and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Send Button */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !content.trim()}
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview (HTML) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Full Email Preview</CardTitle>
          <CardDescription className="text-xs">
            This is how the email will look with the template applied
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md bg-gray-50 overflow-auto max-h-[500px]">
            <iframe
              srcDoc={fullEmailHtml}
              title="Email Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
