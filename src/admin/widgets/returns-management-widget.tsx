import { useState, useEffect } from "react"
import { Button, Select, toast, Badge } from "@medusajs/ui"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"

const RETURN_STATUS_OPTIONS = [
  { value: "pending_survey", label: "Oczekuje na ankietę" },
  { value: "survey_completed", label: "Ankieta wypełniona" },
  { value: "qr_generated", label: "QR kod wygenerowany" },
  { value: "shipped_by_customer", label: "Wysłane przez klienta" },
  { value: "received", label: "Otrzymane" },
  { value: "processed", label: "Przetworzone" },
  { value: "refunded", label: "Zwrócone" },
  { value: "rejected", label: "Odrzucone" },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending_survey": return "bg-gray-100 text-gray-800"
    case "survey_completed": return "bg-blue-100 text-blue-800"
    case "qr_generated": return "bg-purple-100 text-purple-800"
    case "shipped_by_customer": return "bg-yellow-100 text-yellow-800"
    case "received": return "bg-orange-100 text-orange-800"
    case "processed": return "bg-green-100 text-green-800"
    case "refunded": return "bg-green-100 text-green-800"
    case "rejected": return "bg-red-100 text-red-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

const ReturnsManagementWidget = ({ data: order }: DetailWidgetProps<any>) => {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchReturns()
  }, [order.id])

  const fetchReturns = async () => {
    try {
      const response = await fetch(`/admin/returns?order_id=${order.id}`)
      if (response.ok) {
        const data = await response.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (returnId: string, newStatus: string) => {
    setUpdatingStatus(returnId)
    try {
      const response = await fetch(`/admin/returns/${returnId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      toast.success("Status zwrotu zaktualizowany")
      await fetchReturns() // Refresh data
      
    } catch (error: any) {
      toast.error("Błąd", { description: error.message })
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="font-semibold mb-2">Zwroty</div>
        <p className="text-sm text-gray-600">Ładowanie...</p>
      </div>
    )
  }

  if (returns.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="font-semibold mb-2">Zwroty</div>
        <p className="text-sm text-gray-600">Brak zgłoszonych zwrotów dla tego zamówienia.</p>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg bg-blue-50 mb-4">
      <div className="font-semibold mb-4 flex items-center gap-2">
        <span>🔄 Zarządzanie zwrotami</span>
        <Badge className="bg-blue-100 text-blue-800">{returns.length}</Badge>
      </div>
      
      {returns.map((returnItem) => (
        <div key={returnItem.id} className="mb-6 p-4 bg-white rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium mb-2">Szczegóły zwrotu</h4>
              <p className="text-sm"><strong>ID:</strong> {returnItem.id}</p>
              <p className="text-sm"><strong>Data zgłoszenia:</strong> {new Date(returnItem.created_at).toLocaleDateString('pl-PL')}</p>
              <p className="text-sm"><strong>Metoda zwrotu:</strong> {returnItem.refund_method === 'loyalty_points' ? 'Punkty lojalnościowe (+10%)' : 'Zwrot na kartę'}</p>
              <p className="text-sm"><strong>Kwota:</strong> {(returnItem.refund_amount / 100).toFixed(2)} zł</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Produkty do zwrotu</h4>
              <ul className="text-sm space-y-1">
                {returnItem.items.map((item: any, idx: number) => (
                  <li key={idx}>
                    {item.title} - {item.quantity} szt. ({(item.unit_price / 100).toFixed(2)} zł)
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {returnItem.survey && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">Ankieta zwrotu</h4>
              <p className="text-sm"><strong>Powód:</strong> {returnItem.survey.reason_code}</p>
              {returnItem.survey.satisfaction_rating && (
                <p className="text-sm"><strong>Ocena:</strong> {returnItem.survey.satisfaction_rating}/5 ⭐</p>
              )}
              {returnItem.survey.description && (
                <p className="text-sm"><strong>Opis:</strong> {returnItem.survey.description}</p>
              )}
            </div>
          )}
          
          {returnItem.furgonetka_tracking_number && (
            <div className="mb-4 p-3 bg-yellow-50 rounded">
              <h4 className="font-medium mb-2">Informacje o wysyłce</h4>
              <p className="text-sm"><strong>Numer śledzenia:</strong> {returnItem.furgonetka_tracking_number}</p>
              {returnItem.furgonetka_qr_code && (
                <p className="text-sm">
                  <strong>QR kod:</strong> 
                  <a href={returnItem.furgonetka_qr_code} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    Pobierz
                  </a>
                </p>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge className={getStatusColor(returnItem.status)}>
                {RETURN_STATUS_OPTIONS.find(opt => opt.value === returnItem.status)?.label || returnItem.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Select 
                value={returnItem.status} 
                onValueChange={(value) => handleStatusUpdate(returnItem.id, value)}
                size="base"
              >
                <Select.Trigger className="w-48">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {RETURN_STATUS_OPTIONS.map(opt => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              
              {updatingStatus === returnItem.id && (
                <span className="text-sm text-gray-500">Aktualizowanie...</span>
              )}
            </div>
          </div>
          
          {returnItem.status === 'received' && (
            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-800">
                ✅ Zwrot otrzymany. Zmiana statusu na "received" automatycznie uruchomi proces refund.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default ReturnsManagementWidget