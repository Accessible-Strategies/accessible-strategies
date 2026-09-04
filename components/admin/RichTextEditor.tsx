'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExt from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import InsertLinkModal from '@/components/admin/InsertLinkModal';
import MediaBrowser, { type MediaItem } from '@/components/admin/MediaBrowser';
import { QuoteIcon, ListUlIcon, ListOlIcon, LinkIcon, ImageIcon } from '@/components/icons/Icons';

interface RichTextEditorProps {
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  mediaFolder?: string;
  /** Accessible name for the editable region and toolbar — e.g. "Body". */
  ariaLabel?:  string;
}

function ToolbarBtn({
  label, title, active, disabled, onClick,
}: {
  label:    React.ReactNode;
  title?:   string;
  active?:  boolean;
  disabled?: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`icon-hover${active ? ' settings-option--active' : ''}`}
      style={{ minWidth: '32px', fontWeight: 600, width: 'auto', padding: '0 10px', fontSize: 'var(--as-text-xs)' }}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: '1px', height: '20px', flexShrink: 0, backgroundColor: 'var(--as-border)', margin: '0 4px' }} />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  mediaFolder = 'general',
  ariaLabel = 'Rich text content',
}: RichTextEditorProps) {
  const [linkModalOpen, setLinkModalOpen]   = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const isLocalChange = useRef(false);
  const initialised    = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading:   { levels: [2, 3] },
        codeBlock: false,
        code:      false,
        link:      false,
        underline: false,
      }),
      LinkExt.configure({
        openOnClick:    false,
        autolink:       true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Underline,
      Image.configure({ HTMLAttributes: { loading: 'lazy' } }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class:              'as-rte-content',
        'data-placeholder': placeholder,
        role:               'textbox',
        'aria-multiline':   'true',
        'aria-label':       ariaLabel,
      },
    },
    onUpdate: ({ editor }) => {
      isLocalChange.current = true;
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor || initialised.current) return;
    const incoming = value || '';
    if (!incoming) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
    initialised.current = true;
  }, [value, editor]);

  useEffect(() => {
    if (!editor || !initialised.current) return;
    if (isLocalChange.current) {
      isLocalChange.current = false;
      return;
    }
    const incoming = value || '';
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  const getSelectedText = useCallback((): string => {
    if (!editor || editor.state.selection.empty) return '';
    return editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
  }, [editor]);

  const handleInsertLink = useCallback(({ href, text, openInNewTab }: { href: string; text: string; external: boolean; openInNewTab: boolean }) => {
    if (!editor) return;
    const targetAttrs = openInNewTab ? ` target="_blank" rel="noopener noreferrer"` : '';
    if (text && editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${href}"${targetAttrs}>${text}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({
        href,
        target: openInNewTab ? '_blank' : null,
      }).run();
    }
    setLinkModalOpen(false);
  }, [editor]);

  const handleInsertImage = useCallback((item: MediaItem) => {
    if (!editor || !item.urls) return;
    editor.chain().focus().setImage({ src: item.urls.fullJpg, alt: item.alt, title: item.caption }).run();
    setMediaModalOpen(false);
  }, [editor]);

  if (!editor) return null;

  const hasLink = editor.isActive('link');

  return (
    <>
      <style>{`
        .as-rte-content {
          outline: none;
          min-height: 280px;
          padding: var(--as-gap);
          color: var(--as-text);
          font-size: var(--as-text-sm);
          line-height: var(--as-leading-base);
          font-family: var(--as-font-family);
        }
        .as-rte-content > * + * { margin-top: 0.6em; }
        .as-rte-content p { margin: 0; min-height: 1em; }
        .as-rte-content h2 {
          font-size: 1.25rem; font-weight: 700; line-height: 1.35;
          color: var(--as-text); margin: 1.25em 0 0.4em;
        }
        .as-rte-content h3 {
          font-size: 1.1rem; font-weight: 600; line-height: 1.4;
          color: var(--as-text); margin: 1em 0 0.3em;
        }
        .as-rte-content ul  { list-style: disc    inside !important; padding-left: 1em; margin: 0.4em 0; }
        .as-rte-content ol  { list-style: decimal inside !important; padding-left: 1em; margin: 0.4em 0; }
        .as-rte-content li  { display: list-item !important; }
        .as-rte-content li > p { display: inline; }
        .as-rte-content blockquote {
          border-left: 3px solid var(--as-heading);
          margin: 0.4em 0; padding: 0.2em 0 0.2em 1em;
          color: var(--as-text-muted);
        }
        .as-rte-content a { color: var(--as-heading); text-decoration: underline; }
        .as-rte-content strong { font-weight: 700; }
        .as-rte-content em     { font-style: italic; }
        .as-rte-content u      { text-decoration: underline; }
        .as-rte-content p.is-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--as-text-muted);
          pointer-events: none;
          float: left;
          height: 0;
        }
        .as-rte-content img {
          max-width: 100%; height: auto;
          border-radius: var(--as-radius-md);
          display: block;
        }
      `}</style>

      <div style={{ border: '1px solid var(--as-border)', borderRadius: 'var(--as-radius-md)', backgroundColor: 'var(--as-bg-main)', overflow: 'hidden' }}>
        <div
          role="toolbar"
          aria-label={`${ariaLabel} formatting`}
          style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px',
            padding: '8px 12px', borderBottom: '1px solid var(--as-border)', backgroundColor: 'var(--as-bg-header)',
          }}
        >
          <ToolbarBtn label="B" title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarBtn label={<em>I</em>} title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarBtn label={<u>U</u>} title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolbarDivider />
          <ToolbarBtn label="H2" title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolbarBtn label="H3" title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          <ToolbarDivider />
          <ToolbarBtn label={<QuoteIcon />} title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolbarBtn label={<ListUlIcon />} title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolbarBtn label={<ListOlIcon />} title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <ToolbarDivider />
          <ToolbarBtn label={<LinkIcon />} title="Insert / edit link" active={hasLink} onClick={() => setLinkModalOpen(true)} />
          {hasLink && (
            <ToolbarBtn label="✕" title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()} />
          )}
          <ToolbarDivider />
          <ToolbarBtn label={<ImageIcon />} title="Insert image" onClick={() => setMediaModalOpen(true)} />
        </div>

        <EditorContent editor={editor} />
      </div>

      {linkModalOpen && (
        <InsertLinkModal
          selectedText={getSelectedText()}
          onInsert={handleInsertLink}
          onClose={() => setLinkModalOpen(false)}
        />
      )}

      {mediaModalOpen && (
        <MediaBrowser
          mode="insert"
          defaultFolder={mediaFolder}
          onSelect={handleInsertImage}
          onClose={() => setMediaModalOpen(false)}
        />
      )}
    </>
  );
}