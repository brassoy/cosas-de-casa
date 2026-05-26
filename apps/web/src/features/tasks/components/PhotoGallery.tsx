import { useRef } from 'react';
import type { TaskPhotoDto } from '../types';
import { getPhotoPublicUrl } from '../hooks/useTasks';

interface PhotoGalleryProps {
  photos: TaskPhotoDto[];
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
}

export function PhotoGallery({
  photos,
  onUpload,
  isUploading,
  uploadError,
}: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Limpia el input para que el mismo fichero pueda volver a seleccionarse.
      e.target.value = '';
    }
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Fotos</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          style={styles.btnUpload}
          aria-label="Subir foto"
        >
          {isUploading ? 'Subiendo…' : '+ Añadir foto'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Seleccionar imagen"
        />
      </div>

      {uploadError && (
        <p role="alert" style={styles.error}>
          {uploadError}
        </p>
      )}

      {photos.length === 0 && !isUploading && (
        <p style={styles.empty}>Aún no hay fotos en esta tarea.</p>
      )}

      {isUploading && (
        <p style={styles.uploading}>Comprimiendo y subiendo la imagen…</p>
      )}

      {photos.length > 0 && (
        <div style={styles.grid}>
          {photos.map((photo) => {
            const url = getPhotoPublicUrl(photo.storagePath);
            return (
              <a
                key={photo.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.photoLink}
                aria-label={`Ver foto ${photo.id}`}
              >
                <img
                  src={url}
                  alt={`Foto de la tarea ${photo.id}`}
                  style={styles.photo}
                  loading="lazy"
                />
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    flex: 1,
  },
  btnUpload: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-accent)',
    backgroundColor: 'transparent',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 'var(--space-3)',
  },
  photoLink: {
    display: 'block',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    aspectRatio: '1 / 1',
    border: '1px solid var(--color-border)',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  empty: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  uploading: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
