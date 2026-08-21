import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmModal({ open, title, description, confirmLabel = 'Confirmer', isLoading = false, onClose, onConfirm }) {
  return <Modal open={open} onClose={isLoading ? () => {} : onClose} title={title} description={description} size="xl">
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose} disabled={isLoading}>Annuler</Button>
      <Button variant="danger" onClick={onConfirm} disabled={isLoading}>{isLoading ? 'Traitement...' : confirmLabel}</Button>
    </div>
  </Modal>
}
