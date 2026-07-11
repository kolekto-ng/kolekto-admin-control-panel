import { useEffect, useState, type ComponentType } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  Table as TableIcon,
  Palette,
  MousePointerClick,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Braces,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FileUpload, type FileUploadResult } from "./FileUpload";
import { listMergeTags, type MergeTag } from "@/pages/communications/api";

const BRAND_COLORS = [
  { label: "Kolekto Orange", value: "#F6A623" },
  { label: "Kolekto Green", value: "#3E9D4A" },
  { label: "Dark Gray", value: "#333333" },
  { label: "Black", value: "#1f2937" },
];

function buildButtonHtml(label: string, url: string) {
  const safeLabel = label || "Click here";
  const safeUrl = url || "#";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;"><tr><td style="border-radius:8px;background:#F6A623;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1a1a1a;text-decoration:none;border-radius:8px;">${safeLabel}</a></td></tr></table>`;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<FileUploadResult>;
  className?: string;
}

export function RichTextEditor({ value, onChange, onUploadImage, className }: RichTextEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState(value);
  const [mergeTags, setMergeTags] = useState<MergeTag[]>([]);

  useEffect(() => {
    listMergeTags().then(setMergeTags).catch(() => {});
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[280px] focus:outline-none px-4 py-3",
      },
    },
  });

  // Keep the editor in sync when a template/draft is loaded asynchronously
  // after the editor has already mounted (e.g. "Use template" selection).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) return null;

  const toggleHtmlMode = () => {
    if (!htmlMode) {
      setHtmlDraft(editor.getHTML());
      setHtmlMode(true);
    } else {
      editor.commands.setContent(htmlDraft || "");
      onChange(htmlDraft || "");
      setHtmlMode(false);
    }
  };

  const insertLink = (url: string) => {
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className={cn("rounded-md border", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={Bold} label="Bold" />
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={Italic} label="Italic" />
        <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} icon={UnderlineIcon} label="Underline" />
        <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} icon={Strikethrough} label="Strikethrough" />

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={Heading1} label="Heading 1" />
        <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} label="Heading 2" />
        <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} icon={Heading3} label="Heading 3" />

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={List} label="Bullet list" />
        <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={ListOrdered} label="Numbered list" />
        <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={Quote} label="Quote" />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="Divider" />

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Popover>
          <PopoverTrigger asChild>
            <span>
              <ToolbarButton active={editor.isActive("link")} icon={LinkIcon} label="Link" />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2" align="start">
            <Label htmlFor="rte-link-url">Link URL</Label>
            <LinkForm defaultValue={editor.getAttributes("link").href || ""} onSubmit={insertLink} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <span>
              <ToolbarButton icon={ImageIcon} label="Image" />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="start">
            <Label>Insert image</Label>
            {onUploadImage ? (
              <FileUpload
                accept="image/png,image/jpeg,image/webp,image/gif"
                maxSizeBytes={10 * 1024 * 1024}
                label="Upload an image"
                onUpload={onUploadImage}
                onUploaded={(result) => editor.chain().focus().setImage({ src: result.url }).run()}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Save this campaign as a draft first to enable image uploads.</p>
            )}
            <ImageUrlForm onSubmit={(url) => editor.chain().focus().setImage({ src: url }).run()} />
          </PopoverContent>
        </Popover>

        <ToolbarButton onClick={insertTable} icon={TableIcon} label="Table" />

        <Popover>
          <PopoverTrigger asChild>
            <span>
              <ToolbarButton icon={Palette} label="Text color" />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <Label>Brand colors</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  className="h-7 w-7 rounded-full border"
                  style={{ backgroundColor: c.value }}
                  onClick={() => editor.chain().focus().setColor(c.value).run()}
                />
              ))}
              <button
                type="button"
                title="Reset color"
                className="h-7 w-7 rounded-full border bg-white text-[10px] text-muted-foreground"
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                Reset
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <span>
              <ToolbarButton icon={MousePointerClick} label="CTA Button" />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2" align="start">
            <Label>Insert CTA button</Label>
            <CtaButtonForm onSubmit={(label, url) => editor.chain().focus().insertContent(buildButtonHtml(label, url)).run()} />
          </PopoverContent>
        </Popover>

        {mergeTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <span>
                <ToolbarButton icon={Braces} label="Personalization" />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-1 p-2" align="start">
              <div className="px-1 pb-1">
                <p className="text-sm font-medium">Insert personalization</p>
                <p className="text-xs text-muted-foreground">
                  Add <code className="rounded bg-muted px-1">|Fallback text</code> before the closing braces for a default value, e.g.{" "}
                  <code className="rounded bg-muted px-1">{"{{first_name|Valued Customer}}"}</code>
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {Object.entries(groupMergeTagsByCategory(mergeTags)).map(([category, tags]) => (
                  <div key={category} className="mb-1">
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                    {tags.map((tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => editor.chain().focus().insertContent(`{{${tag.key}}}`).run()}
                      >
                        <span>{tag.label}</span>
                        <code className="text-xs text-muted-foreground">{`{{${tag.key}}}`}</code>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton active={htmlMode} onClick={toggleHtmlMode} icon={Code2} label="HTML source" />
      </div>

      {htmlMode ? (
        <Textarea
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
          className="min-h-[280px] rounded-none border-0 font-mono text-xs focus-visible:ring-0"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}

function groupMergeTagsByCategory(tags: MergeTag[]): Record<string, MergeTag[]> {
  const groups: Record<string, MergeTag[]> = {};
  for (const tag of tags) {
    if (!groups[tag.category]) groups[tag.category] = [];
    groups[tag.category].push(tag);
  }
  return groups;
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function LinkForm({ defaultValue, onSubmit }: { defaultValue: string; onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState(defaultValue);
  return (
    <div className="flex gap-2">
      <Input id="rte-link-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      <Button type="button" size="sm" onClick={() => onSubmit(url)}>
        Apply
      </Button>
    </div>
  );
}

function ImageUrlForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex gap-2">
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste an image URL" />
      <Button type="button" size="sm" variant="outline" disabled={!url} onClick={() => onSubmit(url)}>
        Insert
      </Button>
    </div>
  );
}

function CtaButtonForm({ onSubmit }: { onSubmit: (label: string, url: string) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="space-y-2">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Button label (e.g. View Collection)" />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      <Button type="button" size="sm" className="w-full" disabled={!label || !url} onClick={() => onSubmit(label, url)}>
        Insert button
      </Button>
    </div>
  );
}
