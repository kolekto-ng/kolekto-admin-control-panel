import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { TextAlign } from "@tiptap/extension-text-align";
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
  FileCode2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
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
import { isFullHtmlDocument, isMissingUnsubscribe } from "@/lib/emailHtml";
import { renderMergeTags, buildSampleData, findUnknownMergeTags } from "@/lib/mergeTags";
import "./editor-content.css";

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

  // A finished email document is edited as SOURCE, never through ProseMirror.
  // See isFullHtmlDocument for why. Detected from the content itself so an
  // existing campaign reopens in the right surface with no stored flag.
  const [docMode, setDocMode] = useState(() => isFullHtmlDocument(value));
  const [docDraft, setDocDraft] = useState(value);
  const [showDocPreview, setShowDocPreview] = useState(true);
  // The preview resolves merge tags by default: a preview that shows
  // "Hello {{first_name}}," is not showing what the recipient gets.
  const [previewResolved, setPreviewResolved] = useState(true);
  const docTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listMergeTags().then(setMergeTags).catch(() => {});
  }, []);

  // The last HTML this editor itself emitted upward. Used to tell an "echo"
  // of our own onChange apart from a genuinely external content change — see
  // the sync effect below for why that distinction matters.
  const lastEmittedRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextStyle,
      Color,
      // Without this extension there is no textAlign attribute in the
      // schema at all — which is the whole alignment bug. Two separate
      // symptoms came from the one omission: the toolbar could not apply
      // alignment (no command existed), and ProseMirror DROPPED any
      // text-align it met while parsing, so pasting aligned HTML, loading a
      // template that used it, or round-tripping through HTML source mode
      // all silently flattened everything back to left.
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        // Explicit email-matching typography rather than Tailwind `prose`,
        // which styled the editor like an article and left alignment to
        // browser defaults. See editor-content.css.
        class: "kolekto-email-editor min-h-[280px] px-4 py-3",
      },
    },
  });

  // Keep the editor in sync when content is loaded/replaced from OUTSIDE the
  // editor (a draft arriving from the server, "Use template", applying HTML
  // source mode).
  //
  // The comparison is against the last value we emitted, NOT against
  // editor.getHTML(). Comparing to getHTML() meant that any time the parent's
  // `value` and the editor's serialization disagreed — which happens
  // routinely, because ProseMirror normalizes the HTML it round-trips — this
  // effect fired setContent on a keystroke. setContent rebuilds the document
  // and drops the selection, so the caret jumped to the top of the body while
  // the admin was typing. That is the "text doesn't stay where I put it"
  // half of the reported editor bug, and it is independent of alignment.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return; // our own echo — ignore
    lastEmittedRef.current = value;

    // A full document arriving from outside (a loaded draft, a template)
    // switches the surface instead of being parsed. Handing it to
    // setContent would flatten it against the ProseMirror schema — the exact
    // data loss this mode exists to prevent.
    if (isFullHtmlDocument(value)) {
      setDocMode(true);
      setDocDraft(value);
      return;
    }

    setDocMode(false);
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  // Merge tags resolved with the server's own sample values, so the preview
  // shows the email as a recipient receives it rather than as source.
  const docPreviewHtml = useMemo(
    () => renderMergeTags(docDraft, buildSampleData(mergeTags)),
    [docDraft, mergeTags],
  );

  // Tags the catalog doesn't know are almost always typos, and they resolve to
  // an EMPTY string on send — a silent gap in the copy rather than an error.
  const unknownTags = useMemo(
    () => (mergeTags.length > 0 ? findUnknownMergeTags(docDraft, mergeTags) : []),
    [docDraft, mergeTags],
  );

  if (!editor) return null;

  const toggleHtmlMode = () => {
    if (!htmlMode) {
      setHtmlDraft(editor.getHTML());
      setHtmlMode(true);
      return;
    }

    // This is the path an admin actually uses to paste a designed email:
    // open the source view, paste, apply. If what they pasted is a whole
    // document, hand it to document mode VERBATIM. Previously it went
    // straight into setContent and came back out as a table stub.
    if (isFullHtmlDocument(htmlDraft)) {
      setDocMode(true);
      setDocDraft(htmlDraft);
      setHtmlMode(false);
      lastEmittedRef.current = htmlDraft;
      onChange(htmlDraft);
      return;
    }

    // setContent emits an update, which routes through onUpdate and
    // propagates the PARSED html upward. Calling onChange(htmlDraft)
    // as well would push the raw draft up instead, leaving the parent
    // holding markup the editor had already normalized — and that
    // mismatch is exactly what the sync effect above then tried to
    // "correct" on the next keystroke.
    editor.commands.setContent(htmlDraft || "");
    setHtmlMode(false);
  };

  const updateDocDraft = (next: string) => {
    setDocDraft(next);
    lastEmittedRef.current = next;
    onChange(next);
  };

  /** Inserts a merge tag at the caret, the way the rich-text toolbar does. */
  const insertDocMergeTag = (key: string) => {
    const el = docTextareaRef.current;
    const token = `{{${key}}}`;

    if (!el) {
      updateDocDraft(docDraft + token);
      return;
    }

    const start = el.selectionStart ?? docDraft.length;
    const end = el.selectionEnd ?? start;
    const next = docDraft.slice(0, start) + token + docDraft.slice(end);
    updateDocDraft(next);

    // Restore focus and put the caret after the inserted tag, so several tags
    // can be inserted in a row without re-clicking into the textarea.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const leaveDocMode = () => {
    // Converting a document to rich text is lossy and irreversible, so it is
    // an explicit, confirmed action rather than something that can happen by
    // accident.
    const ok = window.confirm(
      "Switching to the rich-text editor will simplify this email: its <style> block, " +
      "nested table layout and presentational attributes will be dropped, because the " +
      "editor cannot represent them.\n\nContinue?",
    );
    if (!ok) return;
    setDocMode(false);
    setHtmlDraft(docDraft);
    setHtmlMode(true);
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

  if (docMode) {
    return (
      <div className={cn("rounded-md border", className)}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 p-2">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-kolekto-orange" />
            <span className="text-sm font-medium">Full HTML email</span>
            <span className="text-xs text-muted-foreground">sent exactly as written</span>
          </div>
          <div className="flex items-center gap-1">
            {mergeTags.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5">
                    <Braces className="h-4 w-4" /> Personalization
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-1 p-2" align="end">
                  <div className="px-1 pb-1">
                    <p className="text-sm font-medium">Insert personalization</p>
                    <p className="text-xs text-muted-foreground">
                      Inserted at the cursor. Add{" "}
                      <code className="rounded bg-muted px-1">|Fallback text</code> before the
                      closing braces for a default, e.g.{" "}
                      <code className="rounded bg-muted px-1">{"{{first_name|there}}"}</code>
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {Object.entries(groupMergeTagsByCategory(mergeTags)).map(([category, tags]) => (
                      <div key={category} className="mb-1">
                        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {category}
                        </p>
                        {tags.map((tag) => (
                          <button
                            key={tag.key}
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                            onClick={() => insertDocMergeTag(tag.key)}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowDocPreview((v) => !v)}>
              {showDocPreview ? "Hide preview" : "Show preview"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={leaveDocMode}>
              Use rich text
            </Button>
          </div>
        </div>

        <div className={cn("grid", showDocPreview && "lg:grid-cols-2")}>
          <Textarea
            ref={docTextareaRef}
            value={docDraft}
            onChange={(e) => updateDocDraft(e.target.value)}
            spellCheck={false}
            className="min-h-[420px] rounded-none border-0 font-mono text-xs focus-visible:ring-0"
            placeholder="Paste your complete HTML email here…"
          />
          {showDocPreview && (
            <div className="flex min-h-[420px] flex-col lg:border-l">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-3 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {previewResolved ? "Preview — sample data" : "Preview — raw tags"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setPreviewResolved((v) => !v)}
                >
                  {previewResolved ? "Show raw tags" : "Show sample data"}
                </Button>
              </div>
              {/* sandbox="" gives the frame an opaque origin with no script
                  execution and no access to this page. It also stops links in
                  the email from navigating the admin SPA — an <a href>
                  rendered inline previously hijacked the router. */}
              <iframe
                title="Email preview"
                srcDoc={previewResolved ? docPreviewHtml : docDraft}
                sandbox=""
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          )}
        </div>

        <div className="space-y-1 border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <p>
            Personalization works anywhere in the HTML — use the{" "}
            <strong>Personalization</strong> menu above, or type{" "}
            <code className="rounded bg-muted px-1">{"{{first_name}}"}</code> directly. Tags are
            replaced per recipient when the campaign is sent.
          </p>
          {unknownTags.length > 0 && (
            <p className="text-amber-700">
              Unrecognized tag{unknownTags.length > 1 ? "s" : ""}:{" "}
              {unknownTags.map((k) => (
                <code key={k} className="mr-1 rounded bg-muted px-1">{`{{${k}}}`}</code>
              ))}
              — these send as empty text. Check the spelling against the Personalization menu.
            </p>
          )}
          {isMissingUnsubscribe(docDraft) && (
            <p className="text-amber-700">
              No unsubscribe link found. Add{" "}
              <code className="rounded bg-muted px-1">{"{{unsubscribe_link}}"}</code> — the Kolekto
              footer is not added to a full HTML email.
            </p>
          )}
        </div>
      </div>
    );
  }

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

        {/* Alignment. `isActive({ textAlign })` reads the attribute the
            TextAlign extension registers, so these light up correctly for
            both paragraphs and headings. */}
        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          icon={AlignLeft}
          label="Align left"
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          icon={AlignCenter}
          label="Align center"
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          icon={AlignRight}
          label="Align right"
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          icon={AlignJustify}
          label="Justify"
        />

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
