import { useState } from "#app"

type ToastType = "error" | "success"

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

export const useToast = () => {
  const toasts = useState<ToastItem[]>("toast-items", () => [])
  const seed = useState<number>("toast-seed", () => 0)

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  const pushError = (message: string) => {
    if (!message.trim()) return
    seed.value += 1
    const id = seed.value
    toasts.value.push({ id, type: "error", message })
    setTimeout(() => removeToast(id), 3200)
  }

  const pushSuccess = (message: string) => {
    if (!message.trim()) return
    seed.value += 1
    const id = seed.value
    toasts.value.push({ id, type: "success", message })
    setTimeout(() => removeToast(id), 2200)
  }

  return {
    toasts,
    pushSuccess,
    pushError,
    removeToast
  }
}
