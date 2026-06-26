import { useEffect, useReducer, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, ImagePlus } from 'lucide-react'
import { uploadToCloudinary } from '../../lib/cloudinary'
import './RichTextEditor.css'

// Toolbar button — active state reflects the current selection.
function ToolButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-control border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-transparent text-muted-foreground hover:bg-surface-alt hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Semantic rich-text editor (TipTap) used for the product description. Emits
 * clean HTML (<p>, <h2>, <strong>, <ul>, …) suitable for SEO; embedded images
 * are uploaded directly to Cloudinary and require alt text.
 *
 * Controlled: `value` is the HTML string, `onChange(html)` fires on edits.
 */
export function RichTextEditor({ value, onChange, id = 'rich-text', ariaLabel = 'Soạn thảo nội dung', onError }) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Viết mô tả sản phẩm… dùng tiêu đề, danh sách và in đậm để tối ưu SEO.' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
        class: 'tiptap-content',
      },
    },
    onUpdate: ({ editor: instance }) => onChange?.(instance.getHTML()),
  })

  // Re-render the toolbar on every selection/transaction so active states stay in sync.
  useEffect(() => {
    if (!editor) return undefined
    editor.on('transaction', forceUpdate)
    return () => editor.off('transaction', forceUpdate)
  }, [editor])

  // Pull in external value changes (e.g. AI fill) without emitting an update loop.
  useEffect(() => {
    if (!editor) return
    const next = value || ''
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const handleSetLink = () => {
    const previous = editor.getAttributes('link').href
    const url = window.prompt('Nhập URL liên kết:', previous || 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const handlePickImage = () => fileInputRef.current?.click()

  const handleImageFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const alt = window.prompt('Nhập mô tả ảnh (alt) chứa từ khóa SEO:', '')
    if (alt === null) return

    try {
      setUploading(true)
      const url = await uploadToCloudinary(file)
      editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run()
    } catch (error) {
      onError?.(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-control border border-border bg-surface focus-within:ring-2 focus-within:ring-ring">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolButton label="Tiêu đề H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Tiêu đề H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={16} aria-hidden="true" />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolButton label="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton label="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={16} aria-hidden="true" />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolButton label="Danh sách dấu chấm" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Danh sách số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} aria-hidden="true" />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolButton label="Chèn liên kết" active={editor.isActive('link')} onClick={handleSetLink}>
          <Link2 size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Chèn ảnh" disabled={uploading} onClick={handlePickImage}>
          <ImagePlus size={16} aria-hidden="true" />
        </ToolButton>
        {uploading && <span className="ml-1 text-xs text-muted-foreground">Đang tải ảnh…</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageFile}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
