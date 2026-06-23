import { useState } from 'react'
import { BackLink } from '../../components/BackLink'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '../../features/addresses/hooks'
import { useToastStore } from '../../store/toastStore'
import { AddressFormModal } from './AddressFormModal'

export function AddressesPage() {
  const { data, isLoading } = useAddresses()
  const deleteAddress = useDeleteAddress()
  const setDefaultAddress = useSetDefaultAddress()
  const addToast = useToastStore((state) => state.addToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)

  const addresses = data?.data ?? []

  const openCreateModal = () => {
    setEditingAddress(null)
    setModalOpen(true)
  }

  const openEditModal = (address) => {
    setEditingAddress(address)
    setModalOpen(true)
  }

  const handleDelete = async (address) => {
    if (!window.confirm(`Xóa địa chỉ của ${address.recipient_name}?`)) return

    try {
      await deleteAddress.mutateAsync(address.id)
      addToast({ title: 'Đã xóa địa chỉ.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xóa địa chỉ.', description: error.message, variant: 'error' })
    }
  }

  const handleSetDefault = async (address) => {
    try {
      await setDefaultAddress.mutateAsync(address.id)
      addToast({ title: 'Đã đặt làm địa chỉ mặc định.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể đặt làm mặc định.', description: error.message, variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 lg:px-10">
      <BackLink to="/account" className="mb-4">Quay lại tài khoản</BackLink>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Sổ địa chỉ</h1>
        <Button onClick={openCreateModal}>Thêm địa chỉ mới</Button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isLoading ? (
          <Spinner label="Đang tải địa chỉ..." />
        ) : addresses.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Bạn chưa có địa chỉ nào.</p>
          </Card>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    {address.recipient_name} · {address.phone}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[address.address_line1, address.address_line2, address.city, address.province, address.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                {address.is_default && <Badge tone="in-stock">Mặc định</Badge>}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <button
                  type="button"
                  className="cursor-pointer text-primary hover:text-primary-hover"
                  onClick={() => openEditModal(address)}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="cursor-pointer text-destructive hover:opacity-80"
                  onClick={() => handleDelete(address)}
                >
                  Xóa
                </button>
                {!address.is_default && (
                  <button
                    type="button"
                    className="cursor-pointer text-primary hover:text-primary-hover"
                    onClick={() => handleSetDefault(address)}
                  >
                    Đặt làm mặc định
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <AddressFormModal open={modalOpen} onOpenChange={setModalOpen} address={editingAddress} />
    </div>
  )
}
