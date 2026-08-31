import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useUploadMedia } from './hooks'
import { Spinner } from '../../../components/Spinner'

export function MediaUploadDropzone({ accept = 'image/*', onUploaded }) {
  const allowsImages = accept.includes('image')
  const allowsVideos = accept.includes('video')
  const mediaLabel = allowsImages && allowsVideos ? 'ảnh hoặc video' : allowsVideos ? 'video' : 'ảnh'
  const inputRef = useRef(null)
  const upload = useUploadMedia()
  const [error, setError] = useState(null)

  async function handleFiles(files) {
    setError(null)
    for (const file of files) {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      try {
        const res = await upload.mutateAsync(fd)
        onUploaded?.(res.data)
      } catch (e) {
        setError(e?.message ?? 'Tải lên thất bại.')
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong p-8 text-center">
      <Upload size={24} className="text-muted-foreground" aria-hidden="true" />
      <button type="button" onClick={() => inputRef.current?.click()} className="text-sm font-medium text-foreground underline">
        Chọn {mediaLabel} để tải lên
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" aria-label={`Tệp ${mediaLabel}`}
             onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
      {upload.isPending && <Spinner label="Đang tải lên" />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
